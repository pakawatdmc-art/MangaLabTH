"""User endpoints."""

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


@router.get("", response_model=list[UserRead])
async def list_users(
    session: DBSession,
    admin: AdminUser,
):
    """Admin: list all users."""
    stmt = select(User).order_by(User.created_at.desc())
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
