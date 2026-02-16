"""Pydantic v2 schemas for Manga, Chapter, and Page endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.manga import MangaCategory, MangaStatus


# ── Page ─────────────────────────────────────────


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

    model_config = {"from_attributes": True}


class ChapterDetail(ChapterRead):
    pages: list[PageRead] = []


class ChapterCreate(BaseModel):
    number: float
    title: str = ""
    coin_price: int = Field(0, ge=0)
    is_free: bool = True


class ChapterUpdate(BaseModel):
    number: Optional[float] = None
    title: Optional[str] = None
    coin_price: Optional[int] = Field(None, ge=0)
    is_free: Optional[bool] = None


# ── Manga ────────────────────────────────────────


class MangaRead(BaseModel):
    id: str
    title: str
    slug: str
    description: str
    author: str
    artist: str
    category: MangaCategory
    status: MangaStatus
    cover_url: str
    is_featured: bool
    total_views: int
    chapter_count: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MangaDetail(MangaRead):
    chapters: list[ChapterRead] = []


class MangaCreate(BaseModel):
    title: str = Field(max_length=255)
    slug: str = Field(max_length=280)
    description: str = ""
    author: str = Field("", max_length=255)
    artist: str = Field("", max_length=255)
    category: MangaCategory = MangaCategory.OTHER
    status: MangaStatus = MangaStatus.ONGOING
    cover_url: str = Field("", max_length=512)
    is_featured: bool = False


class MangaUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=280)
    description: Optional[str] = None
    author: Optional[str] = Field(None, max_length=255)
    artist: Optional[str] = Field(None, max_length=255)
    category: Optional[MangaCategory] = None
    status: Optional[MangaStatus] = None
    cover_url: Optional[str] = Field(None, max_length=512)
    is_featured: Optional[bool] = None


# ── List / Pagination ────────────────────────────


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int
