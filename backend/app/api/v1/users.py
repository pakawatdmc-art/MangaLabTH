"""User endpoints."""

import asyncio
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from sqlmodel import select, col

from app.api.deps import AdminUser, CurrentUser, DBSession, get_clerk_profile
from app.api.deps import _normalize_email, _is_primary_admin_email
from app.config import get_settings
from app.models.user import User, UserRole
from app.schemas.user import UserAdminUpdate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])
settings = get_settings()


def _to_user_read(user: User, profile: Optional[Dict[str, str]] = None) -> UserRead:
    profile = profile or {}
    effective_email = profile.get("email") or user.email

    data = UserRead.model_validate(user)
    data.username = profile.get("username") or None
    data.email = effective_email
    data.is_primary_admin = user.is_primary_admin
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


from fastapi import Query
from sqlalchemy import func as sa_func
from app.schemas.user import PaginatedUsers

# ── Admin ────────────────────────────────────────
@router.get("", response_model=PaginatedUsers)
async def list_users(
    session: DBSession,
    admin: AdminUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
):
    """Admin: list users with server-side pagination and search."""
    
    count_stmt = select(sa_func.count()).select_from(User)
    stmt = select(User)

    if role:
        count_stmt = count_stmt.where(User.role == role)
        stmt = stmt.where(User.role == role)

    if q:
        search_pattern = f"%{q}%"
        q_filter = (
            col(User.email).ilike(search_pattern) |
            col(User.username).ilike(search_pattern) |
            col(User.display_name).ilike(search_pattern) |
            col(User.clerk_id).ilike(search_pattern)
        )
        count_stmt = count_stmt.where(q_filter)
        stmt = stmt.where(q_filter)

    # Total count
    total = (await session.execute(count_stmt)).scalar_one()

    # Paginated query
    offset = (page - 1) * per_page
    stmt = (
        stmt
        .order_by(User.role, col(User.created_at).desc())
        .offset(offset)
        .limit(per_page)
    )
    results = (await session.execute(stmt)).scalars().all()

    total_pages = max(1, -(-total // per_page))

    # ไม่เรียก Clerk API แล้ว ใช้ข้อมูลจาก Database โดยตรง
    items = [_to_user_read(u) for u in results]

    return PaginatedUsers(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


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
        and user.is_primary_admin
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


@router.delete("/{user_id}", status_code=204)
async def admin_delete_user(
    user_id: str,
    session: DBSession,
    admin: AdminUser,
):
    """Admin: delete a user from DB and Clerk.

    - Any admin can delete users.
    - Cannot delete yourself or other primary admins.
    - Deletes related transactions first, then the user record.
    - Also removes the user from Clerk via their API.
    """

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")

    if user.is_primary_admin:
        raise HTTPException(
            status_code=403,
            detail="ไม่สามารถลบบัญชี Admin Master ได้",
        )

    if user.id == admin.id:
        raise HTTPException(
            status_code=403,
            detail="ไม่สามารถลบบัญชีตัวเองได้",
        )

    clerk_id = user.clerk_id

    # Delete related transactions first (FK constraint)
    from sqlalchemy import delete as sa_delete
    from app.models.transaction import Transaction
    await session.execute(
        sa_delete(Transaction).where(Transaction.user_id == user_id)
    )

    # Delete the user from DB
    await session.delete(user)
    await session.commit()

    # Delete from Clerk (fire-and-forget, don't block if it fails)
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"https://api.clerk.com/v1/users/{clerk_id}",
                headers={
                    "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            if resp.status_code not in (200, 204, 404):
                import logging
                logging.getLogger(__name__).warning(
                    "Clerk delete failed for %s: %s %s",
                    clerk_id, resp.status_code, resp.text,
                )
    except Exception:
        import logging
        logging.getLogger(__name__).exception(
            "Failed to delete user %s from Clerk", clerk_id,
        )

    return None


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
