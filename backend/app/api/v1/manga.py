"""Manga CRUD endpoints."""

from math import ceil
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func
from sqlmodel import col, select

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models.manga import Chapter, Manga, MangaCategory, MangaStatus
from app.schemas.manga import (
    MangaCreate,
    MangaDetail,
    MangaRead,
    MangaUpdate,
    PaginatedResponse,
)

router = APIRouter(prefix="/manga", tags=["Manga"])


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
):
    """Public listing with filtering, search, and pagination."""
    query = select(Manga)

    if category:
        query = query.where(Manga.category == category)
    if status_filter:
        query = query.where(Manga.status == status_filter)
    if q:
        query = query.where(
            col(Manga.title).ilike(f"%{q}%") | col(Manga.description).ilike(f"%{q}%")
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_q)).scalar_one()

    # Sort
    if sort == "views":
        query = query.order_by(Manga.total_views.desc())
    else:  # latest
        query = query.order_by(Manga.created_at.desc())

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


@router.get("/{manga_id}", response_model=MangaDetail)
async def get_manga(manga_id: str, session: DBSession):
    """Public manga detail with chapters list."""
    manga = await session.get(Manga, manga_id)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    detail = MangaDetail.model_validate(manga)
    detail.chapter_count = len(manga.chapters)
    detail.chapters.sort(key=lambda c: c.number)
    return detail


@router.get("/slug/{slug}", response_model=MangaDetail)
async def get_manga_by_slug(slug: str, session: DBSession):
    """Public manga detail by slug."""
    stmt = select(Manga).where(Manga.slug == slug)
    result = await session.execute(stmt)
    manga = result.scalar_one_or_none()
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    detail = MangaDetail.model_validate(manga)
    detail.chapter_count = len(manga.chapters)
    detail.chapters.sort(key=lambda c: c.number)
    return detail


# ── Admin ────────────────────────────────────────


@router.post("", response_model=MangaRead, status_code=status.HTTP_201_CREATED)
async def create_manga(
    body: MangaCreate,
    session: DBSession,
    admin: AdminUser,
):
    manga = Manga(**body.model_dump())
    session.add(manga)
    await session.commit()
    await session.refresh(manga)
    return MangaRead.model_validate(manga)


@router.patch("/{manga_id}", response_model=MangaRead)
async def update_manga(
    manga_id: str,
    body: MangaUpdate,
    session: DBSession,
    admin: AdminUser,
):
    manga = await session.get(Manga, manga_id)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(manga, key, value)

    session.add(manga)
    await session.commit()
    await session.refresh(manga)
    return MangaRead.model_validate(manga)


@router.delete("/{manga_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manga(
    manga_id: str,
    session: DBSession,
    admin: AdminUser,
):
    manga = await session.get(Manga, manga_id)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

    await session.delete(manga)
    await session.commit()
