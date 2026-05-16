"""Manga CRUD endpoints."""

import logging
import re
from datetime import timedelta, datetime, timezone
from math import ceil
from typing import Any, Optional, List
from cachetools import TTLCache  # type: ignore

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status, Request
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import col, select

from app.api.deps import AdminUser, DBSession, OptionalUser
from app.models.manga import Chapter, Manga, MangaCategory, MangaStatus
from app.models.analytics import DailyMangaView, DailyMangaRead
from app.models.transaction import Transaction, TransactionType
from app.services.storage import delete_object, delete_objects, r2_url_to_key, get_client_ip
from app.services.revalidate import revalidate_paths
from app.services.analytics import record_manga_view_task, is_bot_request
from app.services.google_notify import notify_google_updated
from app.schemas.manga import (
    MangaCreate,
    MangaDetail,
    MangaRead,
    MangaUpdate,
    PaginatedResponse,
)

router = APIRouter(prefix="/manga", tags=["Manga"])
logger = logging.getLogger(__name__)

# Global cache for rankings (1 hour TTL)
_ranking_cache = TTLCache(maxsize=10, ttl=300)  # 5 minutes


def _escape_like(value: str) -> str:
    """Escape SQL LIKE wildcard characters to prevent injection."""
    return re.sub(r"([%_\\])", r"\\\1", value)


# ── Public ───────────────────────────────────────


@router.get("", response_model=PaginatedResponse)
async def list_manga(
    session: DBSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=100),
    category: Optional[MangaCategory] = None,
    status_filter: Optional[MangaStatus] = Query(None, alias="status"),
    q: Optional[str] = None,
    sort: str = "latest",
    current_user: OptionalUser = None,
):
    """Public listing with filtering, search, and pagination."""
    query = select(Manga)

    # Filtering for visibility (Admins see everything)
    is_admin = current_user and current_user.role == "admin"
    if not is_admin:
        query = query.where(Manga.is_visible.is_(True))

    if category:
        query = query.where(
            (Manga.category == category)
            | (Manga.sub_category == category)
        )
    if status_filter:
        query = query.where(Manga.status == status_filter)
    if q:
        safe_q = _escape_like(q)
        query = query.where(
            col(Manga.title).ilike(f"%{safe_q}%")
            | col(Manga.description).ilike(f"%{safe_q}%")
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_q)).scalar_one()

    # Sort
    if sort == "views":
        query = query.order_by(col(Manga.total_views).desc())
    elif sort == "updated":
        # Sort by updated time, putting mangas with no updates at the end
        query = query.order_by(
            col(Manga.last_chapter_updated_at).desc().nulls_last())
    else:  # latest
        query = query.order_by(col(Manga.created_at).desc())

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    results = (await session.execute(query)).scalars().all()

    # Aggregate chapter_count + latest_chapter_number in a single grouped query
    # to avoid loading every Chapter row (and pages) per Manga — the previous
    # selectin behaviour was the main cause of Supabase egress overflow.
    items = []
    if results:
        manga_ids = [m.id for m in results]
        agg_stmt = (
            select(
                Chapter.manga_id,
                func.count(Chapter.id).label("chapter_count"),
                func.max(Chapter.number).label("latest_chapter_number"),
            )
            .where(col(Chapter.manga_id).in_(manga_ids))
            .group_by(Chapter.manga_id)
        )
        agg_rows = (await session.execute(agg_stmt)).all()
        agg_map = {row.manga_id: row for row in agg_rows}

        for m in results:
            data = MangaRead.model_validate(m)
            agg = agg_map.get(m.id)
            if agg:
                data.chapter_count = agg.chapter_count
                data.latest_chapter_number = agg.latest_chapter_number
            else:
                data.chapter_count = 0
                data.latest_chapter_number = None
            items.append(data)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=ceil(total / per_page) if per_page else 1,
    )


@router.get("/sitemap-data")
async def get_sitemap_data(session: DBSession):
    """Slim payload for sitemap generation: only fields needed by /sitemap.xml.

    Returns: list of {slug, last_chapter_updated_at, created_at, chapters: [{number, published_at}]}.
    No pages, no covers, no descriptions \u2014 keeps payload tiny so the sitemap can be
    revalidated infrequently without burning Supabase egress.
    """
    # 1) All visible mangas
    manga_stmt = (
        select(Manga.id, Manga.slug, Manga.last_chapter_updated_at, Manga.created_at)
        .where(Manga.is_visible.is_(True))
        .order_by(col(Manga.created_at).desc())
    )
    manga_rows = (await session.execute(manga_stmt)).all()

    if not manga_rows:
        return []

    manga_ids = [row.id for row in manga_rows]

    # 2) All chapters for those mangas (only fields needed for URL + lastmod)
    ch_stmt = (
        select(Chapter.manga_id, Chapter.number, Chapter.published_at)
        .where(col(Chapter.manga_id).in_(manga_ids))
        .order_by(col(Chapter.manga_id), col(Chapter.number))
    )
    ch_rows = (await session.execute(ch_stmt)).all()

    chapters_by_manga: dict = {}
    for row in ch_rows:
        chapters_by_manga.setdefault(row.manga_id, []).append({
            "number": row.number,
            "published_at": row.published_at,
        })

    return [
        {
            "slug": row.slug,
            "last_chapter_updated_at": row.last_chapter_updated_at,
            "created_at": row.created_at,
            "chapters": chapters_by_manga.get(row.id, []),
        }
        for row in manga_rows
    ]


@router.get("/ranking/{period}", response_model=List[MangaRead])
async def get_manga_ranking(
    period: str,
    session: DBSession,
    limit: int = 10,
    current_user: OptionalUser = None,
):
    """Public manga ranking: weekly, monthly, all_time."""
    valid_periods = {"weekly", "monthly", "all_time"}
    if period not in valid_periods:
        raise HTTPException(status_code=400, detail="Invalid period")

    is_admin = current_user and current_user.role == "admin"
    role_suffix = "admin" if is_admin else "public"

    # Serve from cache if available to prevent heavy DB load
    cache_key = f"{period}_{limit}_{role_suffix}"
    if cache_key in _ranking_cache:
        return _ranking_cache[cache_key]

    if period == "all_time":
        query = select(Manga)
        if not is_admin:
            query = query.where(Manga.is_visible.is_(True))
        query = query.order_by(col(Manga.total_reads).desc()).limit(limit)
        results = (await session.execute(query)).scalars().all()
        data = _attach_chapter_aggregates(await _fetch_chapter_aggregates(session, [m.id for m in results]), results)
        if data:
            _ranking_cache[cache_key] = data
        return data

    # Use Thai time (UTC+7) to match DailyMangaView recording timezone
    thai_today = (datetime.now(timezone.utc) + timedelta(hours=7)).date()
    if period == "weekly":
        start_date = thai_today - timedelta(days=7)
    else:  # monthly
        start_date = thai_today - timedelta(days=30)

    # 1. Sum up read_count from DailyMangaRead (actual chapter reads)
    stmt: Any = (
        select(
            DailyMangaRead.manga_id,
            func.sum(DailyMangaRead.read_count).label("period_reads")
        )
        .where(DailyMangaRead.read_date >= start_date)
        .group_by(DailyMangaRead.manga_id)
        .order_by(func.sum(DailyMangaRead.read_count).desc())
        .limit(limit)
    )
    top_entries = (await session.execute(stmt)).all()

    if not top_entries:
        return []

    manga_ids = [row.manga_id for row in top_entries]

    # 2. Fetch Manga details
    manga_stmt = select(Manga).where(col(Manga.id).in_(manga_ids))
    if not is_admin:
        manga_stmt = manga_stmt.where(Manga.is_visible.is_(True))

    mangas = (await session.execute(manga_stmt)).scalars().all()

    # 3. Sort Manga to match the original ranked manga_ids order
    manga_dict = {m.id: m for m in mangas}
    sorted_mangas = [manga_dict[mid] for mid in manga_ids if mid in manga_dict]

    data = _attach_chapter_aggregates(
        await _fetch_chapter_aggregates(session, [m.id for m in sorted_mangas]),
        sorted_mangas,
    )
    if data:
        _ranking_cache[cache_key] = data
    return data


async def _fetch_chapter_aggregates(session: DBSession, manga_ids: list) -> dict:
    """Return {manga_id: Row(chapter_count, latest_chapter_number)} for the given mangas."""
    if not manga_ids:
        return {}
    stmt = (
        select(
            Chapter.manga_id,
            func.count(Chapter.id).label("chapter_count"),
            func.max(Chapter.number).label("latest_chapter_number"),
        )
        .where(col(Chapter.manga_id).in_(manga_ids))
        .group_by(Chapter.manga_id)
    )
    rows = (await session.execute(stmt)).all()
    return {row.manga_id: row for row in rows}


def _attach_chapter_aggregates(agg_map: dict, mangas) -> list:
    """Build MangaRead list with chapter_count/latest_chapter_number from aggregate map."""
    out = []
    for m in mangas:
        d = MangaRead.model_validate(m)
        agg = agg_map.get(m.id)
        if agg:
            d.chapter_count = agg.chapter_count
            d.latest_chapter_number = agg.latest_chapter_number
        else:
            d.chapter_count = 0
            d.latest_chapter_number = None
        out.append(d)
    return out


async def _load_manga_with_chapters(session: DBSession, manga_id: str) -> Optional[Manga]:
    """Load a manga eagerly with its chapters (NO pages) using explicit selectinload."""
    stmt = (
        select(Manga)
        .where(Manga.id == manga_id)
        .options(selectinload(Manga.chapters))  # type: ignore[arg-type]
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def _load_manga_by_slug_with_chapters(session: DBSession, slug: str) -> Optional[Manga]:
    stmt = (
        select(Manga)
        .where(Manga.slug == slug)
        .options(selectinload(Manga.chapters))  # type: ignore[arg-type]
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def _build_manga_detail(
    manga: Manga,
    user: OptionalUser,
    request: Request,
    session: DBSession,
    background_tasks: BackgroundTasks,
    *,
    track: bool = True,
) -> MangaDetail:
    """Shared helper: build MangaDetail with unlock status + optionally record view.

    PRECONDITION: `manga.chapters` must already be loaded (use _load_manga_with_chapters).
    Pages are intentionally NOT loaded — the detail endpoint never returns page data.
    """
    # Visibility Check
    is_admin = user and user.role == "admin"
    if not manga.is_visible and not is_admin:
        raise HTTPException(status_code=404, detail="Manga not found")

    detail = MangaDetail.model_validate(manga)
    detail.chapter_count = len(manga.chapters) if manga.chapters else 0
    detail.chapters.sort(key=lambda c: c.number)

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    need_commit = False
    for ch in detail.chapters:
        if ch.unlocks_at and ch.unlocks_at <= now_utc:
            ch.is_free = True
            ch.is_unlocked = True

    # Persist auto-unlock for chapters that have passed their unlock time
    if manga.chapters:
        for db_ch in manga.chapters:
            if not db_ch.is_free and db_ch.unlocks_at and db_ch.unlocks_at <= now_utc:
                db_ch.is_free = True
                db_ch.coin_price = 0
                db_ch.unlocks_at = None
                session.add(db_ch)
                need_commit = True

    if need_commit:
        await session.commit()
        background_tasks.add_task(revalidate_paths, ["/", f"/manga/{manga.slug}"])
        background_tasks.add_task(notify_google_updated, ["/", f"/manga/{manga.slug}"])

    if user and detail.chapters:
        chapter_ids = [c.id for c in detail.chapters]
        unlock_stmt = select(Transaction.chapter_id).where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.CHAPTER_UNLOCK,
            col(Transaction.chapter_id).in_(chapter_ids)
        )
        unlocked_ids = set((await session.execute(unlock_stmt)).scalars().all())
        for ch in detail.chapters:
            if ch.id in unlocked_ids:
                ch.is_unlocked = True

    if track and not is_bot_request(request.headers.get("user-agent")):
        background_tasks.add_task(record_manga_view_task, manga.id, get_client_ip(request))
    return detail


@router.get("/slug/{slug}", response_model=MangaDetail)
async def get_manga_by_slug(
    slug: str,
    request: Request,
    session: DBSession,
    user: OptionalUser,
    background_tasks: BackgroundTasks,
    no_track: bool = Query(False, description="Skip view recording (used by chapter reader)"),
):
    """Public manga detail by slug."""
    manga = await _load_manga_by_slug_with_chapters(session, slug)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    return await _build_manga_detail(manga, user, request, session, background_tasks, track=not no_track)


@router.get("/{manga_id}", response_model=MangaDetail)
async def get_manga(
    manga_id: str,
    request: Request,
    session: DBSession,
    user: OptionalUser,
    background_tasks: BackgroundTasks,
    no_track: bool = Query(False, description="Skip view recording (used by chapter reader)"),
):
    """Public manga detail with chapters list."""
    manga = await _load_manga_with_chapters(session, manga_id)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    return await _build_manga_detail(manga, user, request, session, background_tasks, track=not no_track)


# ── Admin ────────────────────────────────────────


@router.post("", response_model=MangaRead, status_code=status.HTTP_201_CREATED)
async def create_manga(
    body: MangaCreate,
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    manga = Manga(**body.model_dump())
    session.add(manga)
    await session.commit()
    await session.refresh(manga)
    background_tasks.add_task(revalidate_paths, ["/"])
    background_tasks.add_task(
        notify_google_updated, [f"/manga/{manga.slug}", "/"]
    )
    return MangaRead.model_validate(manga)


@router.patch("/{manga_id}", response_model=MangaRead)
async def update_manga(
    manga_id: str,
    body: MangaUpdate,
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    manga = await session.get(Manga, manga_id)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    update_data = body.model_dump(exclude_unset=True)

    # Track old cover for R2 cleanup AFTER successful commit
    old_cover_key = None
    if "cover_url" in update_data and update_data["cover_url"] != manga.cover_url:
        old_cover_url = manga.cover_url
        old_cover_key = r2_url_to_key(old_cover_url) if old_cover_url else None

    for key, value in update_data.items():
        setattr(manga, key, value)

    session.add(manga)
    await session.commit()
    await session.refresh(manga)

    # Best-effort R2 cleanup after successful commit
    if old_cover_key:
        try:
            delete_object(old_cover_key)
        except Exception as e:
            logger.warning("Failed to delete old cover %s from R2: %s", old_cover_key, e)

    background_tasks.add_task(revalidate_paths, ["/"])
    background_tasks.add_task(
        notify_google_updated, [f"/manga/{manga.slug}"]
    )
    return MangaRead.model_validate(manga)


@router.delete("/{manga_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manga(
    manga_id: str,
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    # Eager-load chapters → pages because we need every page URL for R2 cleanup
    # and the cascade delete to fire correctly. This is the only place where we
    # intentionally pull the full nested graph.
    stmt = (
        select(Manga)
        .where(Manga.id == manga_id)
        .options(selectinload(Manga.chapters).selectinload(Chapter.pages))  # type: ignore[arg-type]
    )
    manga = (await session.execute(stmt)).scalar_one_or_none()
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    # Collect R2 keys for cleanup (cover + all chapter pages)
    r2_keys = []

    if manga.cover_url:
        key = r2_url_to_key(manga.cover_url)
        if key:
            r2_keys.append(key)

    for chapter in (manga.chapters or []):
        for page in (chapter.pages or []):
            if page.image_url:
                key = r2_url_to_key(page.image_url)
                if key:
                    r2_keys.append(key)

    # Delete analytics views first to satisfy FK constraint
    views_stmt = select(DailyMangaView).where(DailyMangaView.manga_id == manga_id)
    views_result = await session.execute(views_stmt)
    for view in views_result.scalars().all():
        await session.delete(view)

    # Nullify chapter_id on transactions to prevent FK violation
    # (preserves the transaction ledger for accounting purposes)
    chapter_ids = [ch.id for ch in (manga.chapters or [])]
    if chapter_ids:
        from app.models.transaction import Transaction
        tx_stmt = select(Transaction).where(col(Transaction.chapter_id).in_(chapter_ids))
        tx_results = (await session.execute(tx_stmt)).scalars().all()
        for tx in tx_results:
            tx.chapter_id = None
            session.add(tx)

    await session.delete(manga)
    await session.commit()

    # Best-effort R2 cleanup after DB commit
    if r2_keys:
        try:
            delete_objects(r2_keys)
        except Exception:
            pass

    background_tasks.add_task(revalidate_paths, ["/"])
