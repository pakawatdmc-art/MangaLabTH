"""Chapter & Page endpoints."""

from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlmodel import select

from app.api.deps import AdminUser, DBSession, OptionalUser
from app.models.manga import Chapter, Manga, Page
from app.models.transaction import Transaction, TransactionType
from app.services.storage import delete_objects
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


# ── Admin: list all chapters ─────────────────────


@router.get("", response_model=List[ChapterRead])
async def list_all_chapters(
    session: DBSession,
    admin: AdminUser,
):
    """Admin: list all chapters across all manga."""
    stmt = select(Chapter).order_by(Chapter.created_at.desc())
    results = (await session.execute(stmt)).scalars().all()
    items = []
    for ch in results:
        data = ChapterRead.model_validate(ch)
        data.page_count = len(ch.pages) if ch.pages else 0
        items.append(data)
    return items


# ── Public ───────────────────────────────────────


@router.get("/manga/{manga_id}", response_model=List[ChapterRead])
async def list_chapters(manga_id: str, session: DBSession, user: OptionalUser):
    """List all chapters for a manga, ordered by number."""
    stmt = (
        select(Chapter)
        .where(Chapter.manga_id == manga_id)
        .order_by(Chapter.number)
    )
    results = (await session.execute(stmt)).scalars().all()

    unlocked_ids = set()
    if user and results:
        unlock_stmt = select(Transaction.chapter_id).where(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.CHAPTER_UNLOCK,
            Transaction.chapter_id.in_([c.id for c in results])
        )
        unlocked_ids = set((await session.execute(unlock_stmt)).scalars().all())

    items = []
    for ch in results:
        data = ChapterRead.model_validate(ch)
        data.page_count = len(ch.pages) if ch.pages else 0
        if ch.id in unlocked_ids:
            data.is_unlocked = True
        items.append(data)
    return items


@router.get("/{chapter_id}", response_model=ChapterDetail)
async def get_chapter(
    chapter_id: str,
    session: DBSession,
    user: OptionalUser,
):
    """Get chapter detail with pages. Pages are ordered by number."""
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    detail = ChapterDetail.model_validate(chapter)
    detail.page_count = len(chapter.pages)

    is_locked = (not chapter.is_free) and chapter.coin_price > 0
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
    await session.commit()
    await session.refresh(chapter)
    data = ChapterRead.model_validate(chapter)
    data.page_count = 0
    background_tasks.add_task(revalidate_paths, ["/"])
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
    data.page_count = len(chapter.pages) if chapter.pages else 0
    background_tasks.add_task(revalidate_paths, ["/"])
    return data


@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: str,
    session: DBSession,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Collect R2 keys from page URLs before deleting from DB
    r2_keys = []
    for page in (chapter.pages or []):
        if page.image_url:
            # Extract key from public URL: https://pub-xxx.r2.dev/<key>
            parts = page.image_url.split(".r2.dev/", 1)
            if len(parts) == 2:
                r2_keys.append(parts[1])

    await session.delete(chapter)
    await session.commit()

    # Delete from R2 after DB commit (best-effort)
    try:
        delete_objects(r2_keys)
    except Exception:
        pass

    background_tasks.add_task(revalidate_paths, ["/"])


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
    chapter = await session.get(Chapter, chapter_id)
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

    # Cleanup old files that are no longer referenced by new pages (best-effort)
    def _to_key(url: str) -> Optional[str]:
        parts = url.split(".r2.dev/", 1)
        return parts[1] if len(parts) == 2 else None

    removable_keys = []
    kept_urls = set(new_urls)
    for url in old_urls:
        if url in kept_urls:
            continue
        key = _to_key(url)
        if key:
            removable_keys.append(key)

    try:
        delete_objects(removable_keys)
    except Exception:
        pass

    background_tasks.add_task(revalidate_paths, ["/"])
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

    background_tasks.add_task(revalidate_paths, ["/"])
    return [PageRead.model_validate(pg) for pg in created]
