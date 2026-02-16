"""FastAPI dependencies for Clerk JWT authentication and RBAC."""

from typing import Annotated

import httpx
import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import get_settings
from app.database import get_session
from app.models.user import User, UserRole

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)

# ── JWKS cache ───────────────────────────────────
_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(
            settings.CLERK_JWKS_URL,
            cache_keys=True,
            lifespan=3600,
        )
    return _jwks_client


# ── Token verification ───────────────────────────


def _decode_clerk_token(token: str) -> dict:
    """Verify and decode a Clerk-issued JWT using JWKS."""
    try:
        jwks = _get_jwks_client()
        signing_key = jwks.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )


# ── Get or create user from Clerk token ──────────


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Security(bearer_scheme)
    ],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    """Validate Clerk JWT → upsert User row → return User."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    payload = _decode_clerk_token(credentials.credentials)
    clerk_id: str = payload.get("sub", "")
    if not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim",
        )

    # Lookup existing user
    stmt = select(User).where(User.clerk_id == clerk_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-provision on first login
        user = User(
            clerk_id=clerk_id,
            email=payload.get("email", ""),
            display_name=payload.get("name", ""),
            avatar_url=payload.get("image_url", ""),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return user


# ── RBAC helpers ─────────────────────────────────


async def require_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Dependency that ensures the current user has ADMIN role."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


# Convenient type aliases for route signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
DBSession = Annotated[AsyncSession, Depends(get_session)]
