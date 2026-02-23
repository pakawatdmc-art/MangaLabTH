"""Manga CRUD endpoints."""

import re
from math import ceil
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import func
from sqlmodel import col, select

from app.api.deps import AdminUser, DBSession, OptionalUser
from app.models.manga import Manga, MangaCategory, MangaStatus
from app.models.transaction import Transaction, TransactionType
from app.services.storage import delete_object, delete_objects
from app.services.revalidate import revalidate_paths
from app.schemas.manga import (
    MangaCreate,
    MangaDetail,
    MangaRead,
    MangaUpdate,
    PaginatedResponse,
)

router = APIRouter(prefix="/manga", tags=["Manga"])


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
        query = query.where((Manga.category == category) |
                            (Manga.sub_category == category))
    if status_filter:
        query = query.where(Manga.status == status_filter)
    if q:
        safe_q = _escape_like(q)
        query = query.where(
            col(Manga.title).ilike(f"%{safe_q}%") | col(
                Manga.description).ilike(f"%{safe_q}%")
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
async def get_manga(manga_id: str, session: DBSession, user: OptionalUser):
    """Public manga detail with chapters list."""
    manga = await session.get(Manga, manga_id)
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

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
            Transaction.chapter_id.in_(chapter_ids)
        )
        unlocked_ids = set((await session.execute(unlock_stmt)).scalars().all())
        for ch in detail.chapters:
            if ch.id in unlocked_ids:
                ch.is_unlocked = True

    return detail


@router.get("/slug/{slug}", response_model=MangaDetail)
async def get_manga_by_slug(slug: str, session: DBSession, user: OptionalUser):
    """Public manga detail by slug."""
    stmt = select(Manga).where(Manga.slug == slug)
    result = await session.execute(stmt)
    manga = result.scalar_one_or_none()
    if not manga:
        raise HTTPException(status_code=404, detail="Manga not found")

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
            Transaction.chapter_id.in_(chapter_ids)
        )
        unlocked_ids = set((await session.execute(unlock_stmt)).scalars().all())
        for ch in detail.chapters:
            if ch.id in unlocked_ids:
                ch.is_unlocked = True

    return detail


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
        if old_cover_url and ".r2.dev/" in old_cover_url:
            old_key = old_cover_url.split(".r2.dev/", 1)[1]
            try:
                # Synchronously delete the old object from R2 (boto3 is thread-safe here)
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

    def _to_key(url: str) -> Optional[str]:
        parts = url.split(".r2.dev/", 1)
        return parts[1] if len(parts) == 2 else None

    if manga.cover_url:
        key = _to_key(manga.cover_url)
        if key:
            r2_keys.append(key)

    for chapter in (manga.chapters or []):
        for page in (chapter.pages or []):
            if page.image_url:
                key = _to_key(page.image_url)
                if key:
                    r2_keys.append(key)

    await session.delete(manga)
    await session.commit()

    # Best-effort R2 cleanup after DB commit
    if r2_keys:
        try:
            delete_objects(r2_keys)
        except Exception:
            pass

    background_tasks.add_task(revalidate_paths, ["/"])
