"""Pydantic v2 schemas for User endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.user import UserRole


class UserRead(BaseModel):
    id: str
    clerk_id: str
    username: Optional[str] = None
    email: str
    display_name: str
    avatar_url: str
    role: UserRole
    is_primary_admin: bool = False
    coin_balance: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=128)
    avatar_url: Optional[str] = Field(None, max_length=512)


class UserAdminUpdate(BaseModel):
    """Admin-only fields. coin_balance is excluded — use /transactions/admin/grant instead."""
    role: Optional[UserRole] = None
