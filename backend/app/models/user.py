"""User model — linked to Clerk for authentication."""

import enum
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel, Relationship


class UserRole(str, enum.Enum):
    READER = "reader"
    ADMIN = "admin"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(
        default_factory=lambda: uuid4().hex,
        primary_key=True,
        max_length=64,
        description="Internal UUID — NOT the Clerk ID",
    )
    clerk_id: str = Field(
        unique=True,
        index=True,
        max_length=128,
        description="Clerk external user ID (user_xxxxx)",
    )
    email: str = Field(max_length=255, index=True)
    display_name: str = Field(default="", max_length=128)
    avatar_url: str = Field(default="", max_length=512)
    role: UserRole = Field(default=UserRole.READER, max_length=16)

    # ── Coin Economy ─────────────────────────────
    coin_balance: int = Field(
        default=0,
        ge=0,
        description="Current coin balance. MUST only be mutated inside atomic transactions.",
    )

    # ── Timestamps ───────────────────────────────
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )

    # ── Relationships ────────────────────────────
    transactions: list["Transaction"] = Relationship(back_populates="user")  # type: ignore[name-defined]
