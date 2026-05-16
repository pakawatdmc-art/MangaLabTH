"""Chapter & Page endpoints."""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import select, col

from app.services.analytics import record_manga_read_task, is_bot_request
from app.services.google_notify import notify_google_updated
from app.services.notification_service import schedule_chapter_notification

from app.api.deps import AdminUser, DBSession, OptionalUser
from app.models.manga import Chapter, Manga, Page
from app.models.transaction import Transaction, TransactionType
from app.services.storage import delete_objects, r2_url_to_key, get_client_ip
from app.services.revalidate import revalidate_paths
from app.schemas.manga import (
    ChapterCreate,
    ChapterDetail,
    ChapterRead,
    ChapterUpdate,
    PageCreate,
    PageRead,
)

router = APIRouter(prefix="/chapters", tags=["Chapters"])


def _maybe_auto_unlock(ch: Chapter, now_utc: datetime) -> bool:
    """If chapter's unlocks_at has passed, mark it as free. Returns True if DB row was mutated."""
    if ch.unlocks_at and ch.unlocks_at <= now_utc and not ch.is_free:
        ch.is_free = True
        ch.coin_price = 0
        ch.unlocks_at = None
        return True
    return False


async def _fetch_page_counts(session: DBSession, chapter_ids: List[str]) -> Dict[str, int]:
    """Return {chapter_id: page_count} via a single GROUP BY query.

    Replaces `len(ch.pages)` which previously triggered selectin loading of every
    Page row — the dominant source of Supabase egress.
    """
    if not chapter_ids:
        return {}
    stmt = (
        select(Page.chapter_id, func.count(Page.id).label("page_count"))
        .where(col(Page.chapter_id).in_(chapter_ids))
        .group_by(Page.chapter_id)
    )
    rows = (await session.execute(stmt)).all()
    return {row.chapter_id: row.page_count for row in rows}


# ── Admin: list all chapters ─────────────────────


@router.get("", response_model=List[ChapterRead])
async def list_all_chapters(
    session: DBSession,
    admin: AdminUser,
):
    """Admin: list all chapters across all manga."""
    stmt = select(Chapter).order_by(col(Chapter.created_at).desc())
    results = (await session.execute(stmt)).scalars().all()
    page_counts = await _fetch_page_counts(session, [c.id for c in results])

    items = []
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    need_commit = False
    for ch in results:
        if _maybe_auto_unlock(ch, now_utc):
            session.add(ch)
            need_commit = True
        data = ChapterRead.model_validate(ch)
        data.page_count = page_counts.get(ch.id, 0)
        if ch.unlocks_at is None and data.unlocks_at:
            data.is_free = True
        items.append(data)
    if need_commit:
        await session.commit()
    return items


# ── Public ───────────────────────────────────────


@router.get("/manga/{manga_id}", response_model=List[ChapterRead])
async def list_chapters(
    manga_id: str, 
    session: DBSession, 
    user: OptionalUser,
    background_tasks: BackgroundTasks
):
    """List all chapters for a manga, ordered by number."""
    stmt = (
        select(Chapter)
        .where(Chapter.manga_id == manga_id)
        .order_by(col(Chapter.number))
    )
    results = (await session.execute(stmt)).scalars().all()

    unlocked_ids = set()
    if user and results:
        unlock_stmt = select(Transaction.chapter_id).where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.CHAPTER_UNLOCK,
            col(Transaction.chapter_id).in_([c.id for c in results])
        )
        unlocked_ids = set((await session.execute(unlock_stmt)).scalars().all())

    page_counts = await _fetch_page_counts(session, [c.id for c in results])

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    items = []
    need_commit = False
    for ch in results:
        if _maybe_auto_unlock(ch, now_utc):
            session.add(ch)
            need_commit = True
        data = ChapterRead.model_validate(ch)
        data.page_count = page_counts.get(ch.id, 0)
        if ch.id in unlocked_ids:
            data.is_unlocked = True
        if ch.unlocks_at is None and data.unlocks_at:
            data.is_free = True
            data.is_unlocked = True
        items.append(data)
    if need_commit:
        await session.commit()
        # Ping Google for the manga page so index updates (some chapters just became free)
        manga = await session.get(Manga, manga_id)
        if manga:
            background_tasks.add_task(revalidate_paths, ["/", f"/manga/{manga.slug}"])
            background_tasks.add_task(notify_google_updated, ["/", f"/manga/{manga.slug}"])
            
    return items


@router.get("/{chapter_id}", response_model=ChapterDetail)
async def get_chapter(
    chapter_id: str,
    request: Request,
    session: DBSession,
    user: OptionalUser,
    background_tasks: BackgroundTasks,
):
    """Get chapter detail with pages. Pages are ordered by number."""
    # The ONLY public endpoint that legitimately needs the Page rows.
    stmt = (
        select(Chapter)
        .where(Chapter.id == chapter_id)
        .options(selectinload(Chapter.pages))  # type: ignore[arg-type]
    )
    chapter = (await session.execute(stmt)).scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    detail = ChapterDetail.model_validate(chapter)
    detail.page_count = len(chapter.pages)

    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    if _maybe_auto_unlock(chapter, now_utc):
        session.add(chapter)
        await session.commit()
        # Re-refresh only `pages` (and other fields stay in sync via expire_on_commit=False)
        await session.refresh(chapter, attribute_names=["pages"])
        detail.is_free = True

        # Ping Google & Next.js cache to immediately index the newly freed chapter
        manga = await session.get(Manga, chapter.manga_id)
        if manga:
            chapter_url = f"/{manga.slug}/ตอนที่-{chapter.number}"
            paths = ["/", f"/manga/{manga.slug}", chapter_url]
            background_tasks.add_task(revalidate_paths, paths)
            background_tasks.add_task(notify_google_updated, paths)

    is_locked = (not detail.is_free) and detail.coin_price > 0
    if is_locked and user is not None and getattr(user, "role", "") == "admin":
        is_locked = False

    if is_locked:
        if user is None:
            detail.can_read = False
            detail.requires_login = True
            detail.pages = []
            return detail

        unlock_stmt = select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.chapter_id == chapter.id,
            Transaction.type == TransactionType.CHAPTER_UNLOCK,
        )
        unlocked = (await session.execute(unlock_stmt)).scalar_one_or_none()
        if unlocked is None:
            detail.can_read = False
            detail.requires_login = False
            detail.pages = []
            return detail

    detail.pages.sort(key=lambda p: p.number)

    if not is_bot_request(request.headers.get("user-agent")):
        background_tasks.add_task(record_manga_read_task,
                                  chapter.manga_id, get_client_ip(request))

    return detail


# ── Admin ────────────────────────────────────────


@router.post(
    "/manga/{manga_id}",
    response_model=ChapterRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_chapter(
    manga_id: str,
    body: ChapterCreate,
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    manga = await session.get(Manga, manga_id)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    chapter = Chapter(manga_id=manga_id, **body.model_dump())
    session.add(chapter)

    # Bump manga updated time
    manga.last_chapter_updated_at = datetime.now(
        timezone.utc).replace(tzinfo=None)
    session.add(manga)

    await session.commit()
    await session.refresh(chapter)
    # New chapter has no pages yet — skip COUNT.
    data = ChapterRead.model_validate(chapter)
    data.page_count = 0
    chapter_url = f"/{manga.slug}/ตอนที่-{chapter.number}"
    background_tasks.add_task(revalidate_paths, ["/", f"/manga/{manga.slug}", chapter_url])
    background_tasks.add_task(
        notify_google_updated, [f"/manga/{manga.slug}", "/", chapter_url]
    )
    # Schedule debounced email notification to readers (GC-safe)
    from app.services.email_service import fire_and_forget
    fire_and_forget(schedule_chapter_notification(
        manga_id=manga_id,
        manga_title=manga.title,
        manga_slug=manga.slug,
        cover_url=manga.cover_url or "",
        chapter_number=chapter.number,
        chapter_title=chapter.title or "",
        is_free=chapter.is_free,
        coin_price=chapter.coin_price,
    ))
    return data


@router.patch("/{chapter_id}", response_model=ChapterRead)
async def update_chapter(
    chapter_id: str,
    body: ChapterUpdate,
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(chapter, key, value)

    session.add(chapter)
    await session.commit()
    await session.refresh(chapter)
    data = ChapterRead.model_validate(chapter)
    # Use COUNT subquery instead of touching chapter.pages (lazy="raise").
    page_counts = await _fetch_page_counts(session, [chapter.id])
    data.page_count = page_counts.get(chapter.id, 0)
    manga = await session.get(Manga, chapter.manga_id)
    
    paths_to_revalidate = ["/"]
    if manga:
        chapter_url = f"/{manga.slug}/ตอนที่-{chapter.number}"
        paths_to_revalidate.extend([f"/manga/{manga.slug}", chapter_url])
        background_tasks.add_task(notify_google_updated, paths_to_revalidate)
        
    background_tasks.add_task(revalidate_paths, paths_to_revalidate)
    return data


@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: str,
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    # Eager-load pages — needed for both R2 cleanup and cascade delete.
    stmt = (
        select(Chapter)
        .where(Chapter.id == chapter_id)
        .options(selectinload(Chapter.pages))  # type: ignore[arg-type]
    )
    chapter = (await session.execute(stmt)).scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # ดึง manga ก่อนลบเพื่อเก็บ slug สำหรับ revalidation
    manga = await session.get(Manga, chapter.manga_id)

    # Collect R2 keys from page URLs before deleting from DB
    r2_keys = []
    for page in (chapter.pages or []):
        if page.image_url:
            key = r2_url_to_key(page.image_url)
            if key:
                r2_keys.append(key)

    await session.delete(chapter)
    await session.commit()

    # Delete from R2 in background (best-effort, non-blocking)
    if r2_keys:
        background_tasks.add_task(delete_objects, r2_keys)

    paths = ["/"]
    if manga:
        paths.append(f"/manga/{manga.slug}")
    background_tasks.add_task(revalidate_paths, paths)
    if manga:
        background_tasks.add_task(notify_google_updated, paths)


# ── Pages (Admin batch create) ───────────────────


@router.put(
    "/{chapter_id}/pages",
    response_model=List[PageRead],
)
async def replace_pages(
    chapter_id: str,
    pages: List[PageCreate],
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    """Replace all pages in a chapter (used for reordering/re-upload)."""
    # Need pages eagerly for both old-URL diffing and explicit deletes below.
    stmt = (
        select(Chapter)
        .where(Chapter.id == chapter_id)
        .options(selectinload(Chapter.pages))  # type: ignore[arg-type]
    )
    chapter = (await session.execute(stmt)).scalar_one_or_none()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    old_urls = [p.image_url for p in (chapter.pages or []) if p.image_url]
    new_urls = [p.image_url for p in pages if p.image_url]

    # Delete all existing rows first
    for old_page in (chapter.pages or []):
        await session.delete(old_page)

    created: List[Page] = []
    for p in pages:
        page = Page(
            chapter_id=chapter_id,
            number=p.number,
            image_url=p.image_url,
            width=p.width,
            height=p.height,
        )
        session.add(page)
        created.append(page)

    await session.commit()
    for pg in created:
        await session.refresh(pg)

    # Cleanup old files that are no longer referenced by new pages (best-effort, non-blocking)
    removable_keys = []
    kept_urls = set(new_urls)
    for url in old_urls:
        if url in kept_urls:
            continue
        key = r2_url_to_key(url)
        if key:
            removable_keys.append(key)

    if removable_keys:
        background_tasks.add_task(delete_objects, removable_keys)

    manga = await session.get(Manga, chapter.manga_id)
    background_tasks.add_task(revalidate_paths, ["/"] + ([f"/manga/{manga.slug}"] if manga else []))
    if manga:
        background_tasks.add_task(
            notify_google_updated, [f"/manga/{manga.slug}"]
        )
    return [PageRead.model_validate(pg) for pg in created]


@router.post(
    "/{chapter_id}/pages",
    response_model=List[PageRead],
    status_code=status.HTTP_201_CREATED,
)
async def add_pages(
    chapter_id: str,
    pages: List[PageCreate],
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    """Batch-add pages to a chapter (after R2 upload from frontend)."""
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    created = []
    for p in pages:
        page = Page(
            chapter_id=chapter_id,
            number=p.number,
            image_url=p.image_url,
            width=p.width,
            height=p.height,
        )
        session.add(page)
        created.append(page)

    await session.commit()
    for pg in created:
        await session.refresh(pg)

    manga = await session.get(Manga, chapter.manga_id)
    background_tasks.add_task(revalidate_paths, ["/"] + ([f"/manga/{manga.slug}"] if manga else []))
    if manga:
        background_tasks.add_task(
            notify_google_updated, [f"/manga/{manga.slug}"]
        )
    return [PageRead.model_validate(pg) for pg in created]
