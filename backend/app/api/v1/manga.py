"""Manga CRUD endpoints."""

import re
from datetime import date, timedelta
from math import ceil
from typing import Any, Optional, List
from cachetools import TTLCache  # type: ignore

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status, Request
from sqlalchemy import func
from sqlmodel import col, select

from app.api.deps import AdminUser, DBSession, OptionalUser
from app.models.manga import Manga, MangaCategory, MangaStatus
from app.models.analytics import DailyMangaView
from app.models.transaction import Transaction, TransactionType
from app.services.storage import delete_object, delete_objects, r2_url_to_key, get_client_ip
from app.services.revalidate import revalidate_paths
from app.services.analytics import record_manga_view_task
from app.schemas.manga import (
    MangaCreate,
    MangaDetail,
    MangaRead,
    MangaUpdate,
    PaginatedResponse,
)

router = APIRouter(prefix="/manga", tags=["Manga"])

# Global cache for rankings (1 hour TTL)
_ranking_cache = TTLCache(maxsize=10, ttl=3600)


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

    items = []
    for m in results:
        data = MangaRead.model_validate(m)
        data.chapter_count = len(m.chapters) if m.chapters else 0
        items.append(data)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=ceil(total / per_page) if per_page else 1,
    )


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
        query = query.order_by(col(Manga.total_views).desc()).limit(limit)
        results = (await session.execute(query)).scalars().all()
        data = [MangaRead.model_validate(m) for m in results]

        if data:
            _ranking_cache[cache_key] = data
        return data

    today = date.today()
    if period == "weekly":
        start_date = today - timedelta(days=7)
    else:  # monthly
        start_date = today - timedelta(days=30)

    # 1. Sum up view_count from DailyMangaView
    stmt: Any = (
        select(
            DailyMangaView.manga_id,
            func.sum(DailyMangaView.view_count).label("period_views")
        )
        .where(DailyMangaView.view_date >= start_date)
        .group_by(DailyMangaView.manga_id)
        .order_by(func.sum(DailyMangaView.view_count).desc())
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

    data = [MangaRead.model_validate(m) for m in sorted_mangas]
    if data:
        _ranking_cache[cache_key] = data
    return data


async def _build_manga_detail(
    manga: Manga,
    user: OptionalUser,
    request: Request,
    session: DBSession,
    background_tasks: BackgroundTasks,
) -> MangaDetail:
    """Shared helper: build MangaDetail with unlock status + record view."""
    # Visibility Check
    is_admin = user and user.role == "admin"
    if not manga.is_visible and not is_admin:
        raise HTTPException(status_code=404, detail="Manga not found")

    detail = MangaDetail.model_validate(manga)
    detail.chapter_count = len(manga.chapters)
    detail.chapters.sort(key=lambda c: c.number)

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

    background_tasks.add_task(record_manga_view_task, manga.id, get_client_ip(request))
    return detail


@router.get("/slug/{slug}", response_model=MangaDetail)
async def get_manga_by_slug(slug: str, request: Request, session: DBSession, user: OptionalUser, background_tasks: BackgroundTasks):
    """Public manga detail by slug."""
    stmt = select(Manga).where(Manga.slug == slug)
    result = await session.execute(stmt)
    manga = result.scalar_one_or_none()
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    return await _build_manga_detail(manga, user, request, session, background_tasks)


@router.get("/{manga_id}", response_model=MangaDetail)
async def get_manga(manga_id: str, request: Request, session: DBSession, user: OptionalUser, background_tasks: BackgroundTasks):
    """Public manga detail with chapters list."""
    manga = await session.get(Manga, manga_id)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    return await _build_manga_detail(manga, user, request, session, background_tasks)


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

    # Check if cover_url is being updated to a new URL
    if "cover_url" in update_data and update_data["cover_url"] != manga.cover_url:
        old_cover_url = manga.cover_url
        old_key = r2_url_to_key(old_cover_url) if old_cover_url else None
        if old_key:
            try:
                delete_object(old_key)
            except Exception as e:
                print(f"Failed to delete old cover {old_key} from R2: {e}")

    for key, value in update_data.items():
        setattr(manga, key, value)

    session.add(manga)
    await session.commit()
    await session.refresh(manga)
    background_tasks.add_task(revalidate_paths, ["/"])
    return MangaRead.model_validate(manga)


@router.delete("/{manga_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manga(
    manga_id: str,
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    manga = await session.get(Manga, manga_id)
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

    await session.delete(manga)
    await session.commit()

    # Best-effort R2 cleanup after DB commit
    if r2_keys:
        try:
            delete_objects(r2_keys)
        except Exception:
            pass

    background_tasks.add_task(revalidate_paths, ["/"])
