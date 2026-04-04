"""Pydantic v2 schemas for Manga, Chapter, and Page endpoints."""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field

from app.models.manga import MangaCategory, MangaStatus


# ── Page ─────────────────────────────────────────


class PageCreate(BaseModel):
    number: int
    image_url: str
    width: int = 0
    height: int = 0


class PageRead(BaseModel):
    id: str
    number: int
    image_url: str
    width: int
    height: int

    model_config = {"from_attributes": True}


# ── Chapter ──────────────────────────────────────


class ChapterRead(BaseModel):
    id: str
    manga_id: str
    number: float
    title: str
    coin_price: int
    is_free: bool
    total_views: int
    published_at: datetime
    page_count: Optional[int] = None
    is_unlocked: bool = False

    model_config = {"from_attributes": True}


class ChapterDetail(ChapterRead):
    can_read: bool = True
    requires_login: bool = False
    pages: List[PageRead] = []


class ChapterCreate(BaseModel):
    number: float
    title: str = ""
    coin_price: int = Field(0, ge=0)
    is_free: bool = True

    def model_post_init(self, __context: Any) -> None:
        """Auto-sync is_free ↔ coin_price to prevent conflicting state."""
        if self.is_free:
            object.__setattr__(self, "coin_price", 0)
        elif self.coin_price == 0:
            object.__setattr__(self, "is_free", True)


class ChapterUpdate(BaseModel):
    number: Optional[float] = None
    title: Optional[str] = None
    coin_price: Optional[int] = Field(None, ge=0)
    is_free: Optional[bool] = None

    def model_post_init(self, __context: Any) -> None:
        """Auto-sync is_free ↔ coin_price when both are provided."""
        if self.is_free is True and self.coin_price is None:
            object.__setattr__(self, "coin_price", 0)
        elif self.is_free is True and self.coin_price is not None and self.coin_price > 0:
            object.__setattr__(self, "coin_price", 0)
        elif self.coin_price is not None and self.coin_price > 0 and self.is_free is None:
            object.__setattr__(self, "is_free", False)
        elif self.coin_price == 0 and self.is_free is None:
            object.__setattr__(self, "is_free", True)


# ── Manga ────────────────────────────────────────


class MangaRead(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    author: str
    artist: str
    category: MangaCategory
    sub_category: MangaCategory
    status: MangaStatus
    cover_url: str
    is_featured: bool
    is_visible: bool
    total_views: int
    chapter_count: Optional[int] = None
    last_chapter_updated_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MangaDetail(MangaRead):
    chapters: List[ChapterRead] = []


class MangaCreate(BaseModel):
    title: str = Field(max_length=255)
    slug: str = Field(max_length=280)
    description: str = ""
    author: str = Field("", max_length=255)
    artist: str = Field("", max_length=255)
    category: MangaCategory = MangaCategory.OTHER
    sub_category: MangaCategory = MangaCategory.OTHER
    status: MangaStatus = MangaStatus.ONGOING
    cover_url: str = Field("", max_length=512)
    is_featured: bool = False
    is_visible: bool = True


class MangaUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=280)
    description: Optional[str] = None
    author: Optional[str] = Field(None, max_length=255)
    artist: Optional[str] = Field(None, max_length=255)
    category: Optional[MangaCategory] = None
    sub_category: Optional[MangaCategory] = None
    status: Optional[MangaStatus] = None
    cover_url: Optional[str] = Field(None, max_length=512)
    is_featured: Optional[bool] = None
    is_visible: Optional[bool] = None


# ── List / Pagination ────────────────────────────


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    per_page: int
    pages: int
