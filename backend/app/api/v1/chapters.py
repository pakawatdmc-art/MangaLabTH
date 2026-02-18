"""Chapter & Page endpoints."""

from typing import List

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models.manga import Chapter, Manga, Page
from app.schemas.manga import (
    ChapterCreate,
    ChapterDetail,
    ChapterRead,
    ChapterUpdate,
    PageRead,
)

router = APIRouter(prefix="/chapters", tags=["Chapters"])


# ── Public ───────────────────────────────────────


@router.get("/manga/{manga_id}", response_model=List[ChapterRead])
async def list_chapters(manga_id: str, session: DBSession):
    """List all chapters for a manga, ordered by number."""
    stmt = (
        select(Chapter)
        .where(Chapter.manga_id == manga_id)
        .order_by(Chapter.number)
    )
    results = (await session.execute(stmt)).scalars().all()
    items = []
    for ch in results:
        data = ChapterRead.model_validate(ch)
        data.page_count = len(ch.pages) if ch.pages else 0
        items.append(data)
    return items


@router.get("/{chapter_id}", response_model=ChapterDetail)
async def get_chapter(chapter_id: str, session: DBSession):
    """Get chapter detail with pages. Pages are ordered by number."""
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    detail = ChapterDetail.model_validate(chapter)
    detail.page_count = len(chapter.pages)
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
    return data


@router.patch("/{chapter_id}", response_model=ChapterRead)
async def update_chapter(
    chapter_id: str,
    body: ChapterUpdate,
    session: DBSession,
    admin: AdminUser,
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
    return data


@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chapter(
    chapter_id: str,
    session: DBSession,
    admin: AdminUser,
):
    chapter = await session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    await session.delete(chapter)
    await session.commit()


# ── Pages (Admin batch create) ───────────────────


@router.post(
    "/{chapter_id}/pages",
    response_model=List[PageRead],
    status_code=status.HTTP_201_CREATED,
)
async def add_pages(
    chapter_id: str,
    pages: List[PageRead],
    session: DBSession,
    admin: AdminUser,
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

    return [PageRead.model_validate(pg) for pg in created]
