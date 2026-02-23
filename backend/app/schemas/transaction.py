"""Pydantic v2 schemas for Transaction / Coin Economy endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.transaction import TransactionType


class TransactionRead(BaseModel):
    id: str
    user_id: str
    type: TransactionType
    amount: int
    balance_after: int
    chapter_id: Optional[str]
    stripe_payment_intent_id: Optional[str]
    note: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CoinPackageRead(BaseModel):
    id: str
    name: str
    coins: int
    price_thb: int
    stripe_price_id: str
    is_active: bool
    sort_order: int

    model_config = {"from_attributes": True}


class UnlockChapterRequest(BaseModel):
    chapter_id: str


class UnlockChapterResponse(BaseModel):
    success: bool
    new_balance: int
    transaction_id: str
    message: str = ""


class PurchaseCoinsRequest(BaseModel):
    package_id: str


class CustomCheckoutRequest(BaseModel):
    amount_thb: int = Field(
        ge=20, le=10000, description="Amount in Thai Baht to top up (20–10,000)")


class AdminGrantRequest(BaseModel):
    user_id: str
    amount: int = Field(gt=0)
    note: str = ""
