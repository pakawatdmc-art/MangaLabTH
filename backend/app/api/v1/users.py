"""User endpoints."""

import asyncio
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from sqlmodel import select, col

from app.api.deps import AdminUser, CurrentUser, DBSession, get_clerk_profile
from app.config import get_settings
from app.models.user import User, UserRole
from app.schemas.user import UserAdminUpdate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])
settings = get_settings()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_primary_admin_email(email: str) -> bool:
    primary = _normalize_email(settings.PRIMARY_ADMIN_EMAIL)
    return bool(primary) and _normalize_email(email) == primary


def _to_user_read(user: User, profile: Optional[Dict[str, str]] = None) -> UserRead:
    profile = profile or {}
    effective_email = profile.get("email") or user.email

    data = UserRead.model_validate(user)
    data.username = profile.get("username") or None
    data.email = effective_email
    data.is_primary_admin = _is_primary_admin_email(effective_email)
    return data


@router.get("/me", response_model=UserRead)
async def get_me(user: CurrentUser):
    """Return the authenticated user's profile."""
    profile = await get_clerk_profile(user.clerk_id)
    return _to_user_read(user, profile)


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
    return _to_user_read(user)


# ── Admin ────────────────────────────────────────


@router.get("", response_model=List[UserRead])
async def list_users(
    session: DBSession,
    admin: AdminUser,
):
    """Admin: list all users."""
    stmt = select(User).order_by(User.role, col(User.created_at).desc())
    results = (await session.execute(stmt)).scalars().all()
    profiles = await asyncio.gather(
        *[get_clerk_profile(u.clerk_id) for u in results]
    )

    items: List[UserRead] = []
    for u, profile in zip(results, profiles):
        items.append(_to_user_read(u, profile))
    return items


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

    updates = body.model_dump(exclude_unset=True)
    profile = await get_clerk_profile(user.clerk_id)
    effective_email = profile.get("email") or user.email

    if (
        "role" in updates
        and updates["role"] != UserRole.ADMIN
        and _is_primary_admin_email(effective_email)
    ):
        raise HTTPException(
            status_code=403,
            detail="Primary admin account cannot be demoted",
        )

    for key, value in updates.items():
        setattr(user, key, value)

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return _to_user_read(user, profile)


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

    total_coins: int = (await session.execute(
        select(sa_func.coalesce(sa_func.sum(User.coin_balance), 0))
    )).scalar_one()

    total_views: int = (await session.execute(
        select(sa_func.coalesce(sa_func.sum(Manga.total_views), 0))
    )).scalar_one()

    return {
        "total_manga": manga_count,
        "total_chapters": chapter_count,
        "total_users": user_count,
        "total_coins_in_circulation": total_coins,
        "total_views": total_views,
    }
