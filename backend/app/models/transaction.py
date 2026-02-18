"""Transaction models for the Coin Economy.

Design principles:
- Transactions are IMMUTABLE append-only logs.
- coin_balance on User is the cached total; the source of truth
  can always be re-derived from the transaction ledger.
- All balance mutations MUST happen inside an atomic DB transaction
  with SELECT ... FOR UPDATE on the user row to prevent race conditions.
"""

import enum
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import Field, Relationship, SQLModel


class TransactionType(str, enum.Enum):
    # Money → Coins
    COIN_PURCHASE = "coin_purchase"
    # Coins → Chapter unlock
    CHAPTER_UNLOCK = "chapter_unlock"
    # Admin grant / promo
    ADMIN_GRANT = "admin_grant"
    # Refund
    REFUND = "refund"


class Transaction(SQLModel, table=True):
    """Immutable ledger entry for every coin movement."""

    __tablename__ = "transactions"

    id: str = Field(
        default_factory=lambda: uuid4().hex,
        primary_key=True,
        max_length=64,
    )
    user_id: str = Field(foreign_key="users.id", index=True, max_length=64)
    type: TransactionType = Field(max_length=24)

    # Positive = credit, Negative = debit
    amount: int = Field(
        description="Coin delta. +N for purchases/grants, -N for unlocks.",
    )
    balance_after: int = Field(
        ge=0,
        description="User's coin balance AFTER this transaction.",
    )

    # Optional references for traceability
    chapter_id: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Chapter unlocked (for CHAPTER_UNLOCK type)",
    )
    stripe_payment_intent_id: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Stripe PI ID (for COIN_PURCHASE type)",
    )
    note: str = Field(default="", max_length=512)

    created_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
        index=True,
    )

    # ── Relationships ────────────────────────────
    user: Optional["User"] = Relationship(back_populates="transactions")  # type: ignore[name-defined]


class CoinPackage(SQLModel, table=True):
    """Predefined coin packages available for purchase via Stripe."""

    __tablename__ = "coin_packages"

    id: str = Field(
        default_factory=lambda: uuid4().hex,
        primary_key=True,
        max_length=64,
    )
    name: str = Field(max_length=128)
    coins: int = Field(gt=0, description="Number of coins granted")
    price_thb: int = Field(gt=0, description="Price in Thai Baht satang (smallest unit)")
    stripe_price_id: str = Field(
        default="",
        max_length=128,
        description="Stripe Price object ID",
    )
    is_active: bool = Field(default=True, index=True)
    sort_order: int = Field(default=0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.utcnow(),
    )
