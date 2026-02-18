"""User endpoints."""

from typing import List

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models.user import User
from app.schemas.user import UserAdminUpdate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead)
async def get_me(user: CurrentUser):
    """Return the authenticated user's profile."""
    return UserRead.model_validate(user)


@router.patch("/me", response_model=UserRead)
async def update_me(
    body: UserUpdate,
    user: CurrentUser,
    session: DBSession,
):
    """Update the authenticated user's profile."""
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(user, key, value)

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserRead.model_validate(user)


# ── Admin ────────────────────────────────────────


@router.get("", response_model=List[UserRead])
async def list_users(
    session: DBSession,
    admin: AdminUser,
):
    """Admin: list all users."""
    stmt = select(User).order_by(User.role, User.created_at.desc())
    results = (await session.execute(stmt)).scalars().all()
    return [UserRead.model_validate(u) for u in results]


@router.patch("/{user_id}", response_model=UserRead)
async def admin_update_user(
    user_id: str,
    body: UserAdminUpdate,
    session: DBSession,
    admin: AdminUser,
):
    """Admin: update user role or coin balance."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(user, key, value)

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserRead.model_validate(user)


@router.get("/stats")
async def admin_stats(
    session: DBSession,
    admin: AdminUser,
):
    """Admin: get dashboard statistics."""
    from sqlalchemy import func as sa_func
    from app.models.manga import Manga, Chapter

    manga_count = (await session.execute(
        select(sa_func.count()).select_from(Manga)
    )).scalar_one()

    chapter_count = (await session.execute(
        select(sa_func.count()).select_from(Chapter)
    )).scalar_one()

    user_count = (await session.execute(
        select(sa_func.count()).select_from(User)
    )).scalar_one()

    total_coins = (await session.execute(
        select(sa_func.coalesce(sa_func.sum(User.coin_balance), 0))
    )).scalar_one()

    total_views = (await session.execute(
        select(sa_func.coalesce(sa_func.sum(Manga.total_views), 0))
    )).scalar_one()

    return {
        "manga_count": manga_count,
        "chapter_count": chapter_count,
        "user_count": user_count,
        "total_coins": total_coins,
        "total_views": total_views,
    }
