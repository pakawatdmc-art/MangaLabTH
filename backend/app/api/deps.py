"""FastAPI dependencies for Clerk JWT authentication and RBAC."""

from typing import Annotated, Optional

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
_jwks_client: Optional[jwt.PyJWKClient] = None


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
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def _first_non_empty(*values: object) -> str:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_primary_admin_email(email: str) -> bool:
    primary = _normalize_email(settings.PRIMARY_ADMIN_EMAIL)
    return bool(primary) and _normalize_email(email) == primary


async def get_clerk_profile(clerk_id: str) -> dict[str, str]:
    """Fetch Clerk profile (username + primary email) via Backend API."""
    if not clerk_id or not settings.CLERK_SECRET_KEY:
        return {"username": "", "email": ""}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.get(
                f"https://api.clerk.com/v1/users/{clerk_id}",
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )
            if not res.is_success:
                return {"username": "", "email": ""}

            data = res.json()
            username = _first_non_empty(
                data.get("username"),
            )

            email = ""
            primary_email_id = data.get("primary_email_address_id")
            email_addresses = data.get("email_addresses")
            if isinstance(email_addresses, list):
                for item in email_addresses:
                    if not isinstance(item, dict):
                        continue
                    if primary_email_id and item.get("id") == primary_email_id:
                        email = _first_non_empty(item.get("email_address"))
                        break
                if not email:
                    first = email_addresses[0] if email_addresses else {}
                    if isinstance(first, dict):
                        email = _first_non_empty(first.get("email_address"))

            if not email and isinstance(data.get("primary_email_address"), dict):
                email = _first_non_empty(data["primary_email_address"].get("email_address"))

            return {"username": username, "email": email}
    except Exception:
        return {"username": "", "email": ""}


async def get_clerk_username(clerk_id: str) -> str:
    profile = await get_clerk_profile(clerk_id)
    return profile.get("username", "")


# ── Get or create user from Clerk token ──────────


async def get_current_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Security(bearer_scheme)
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

    email = _first_non_empty(
        payload.get("email"),
        payload.get("email_address"),
        payload.get("primary_email_address"),
    )
    username = _first_non_empty(
        payload.get("username"),
        payload.get("preferred_username"),
    )
    full_name = _first_non_empty(
        payload.get("name"),
        " ".join(
            p
            for p in [
                _first_non_empty(payload.get("given_name")),
                _first_non_empty(payload.get("family_name")),
            ]
            if p
        ),
    )
    display_name = _first_non_empty(
        full_name,
        username,
        email.split("@")[0] if "@" in email else "",
    )
    avatar_url = _first_non_empty(
        payload.get("image_url"),
        payload.get("picture"),
        payload.get("avatar_url"),
    )

    if user is None:
        # Auto-provision on first login
        user = User(
            clerk_id=clerk_id,
            email=email,
            username=username,
            display_name=display_name,
            avatar_url=avatar_url,
            role=UserRole.ADMIN if _is_primary_admin_email(email) else UserRole.READER,
            is_primary_admin=_is_primary_admin_email(email),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    else:
        # Backfill/update profile fields when token has fresher claims
        changed = False
        if email and user.email != email:
            user.email = email
            changed = True

        if display_name and (not user.display_name or user.display_name == user.clerk_id):
            user.display_name = display_name
            changed = True

        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
            changed = True

        if username and not user.username:
            user.username = username
            changed = True

        effective_email = email or user.email
        if _is_primary_admin_email(effective_email) and user.role != UserRole.ADMIN:
            user.role = UserRole.ADMIN
            changed = True

        if _is_primary_admin_email(effective_email) and not user.is_primary_admin:
            user.is_primary_admin = True
            changed = True

        if changed:
            session.add(user)
            await session.commit()
            await session.refresh(user)

    return user


async def get_optional_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Security(bearer_scheme)
    ],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Optional[User]:
    """Return current user when Authorization is present, else None."""
    if credentials is None:
        return None
    return await get_current_user(credentials, session)


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
OptionalUser = Annotated[Optional[User], Depends(get_optional_user)]
AdminUser = Annotated[User, Depends(require_admin)]
DBSession = Annotated[AsyncSession, Depends(get_session)]
