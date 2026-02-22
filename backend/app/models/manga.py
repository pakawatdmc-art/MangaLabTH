"""Manga, Chapter, and Page models."""

import enum
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


# ── Enums ────────────────────────────────────────


class MangaCategory(str, enum.Enum):
    ACTION = "action"
    ROMANCE = "romance"
    COMEDY = "comedy"
    DRAMA = "drama"
    FANTASY = "fantasy"
    HORROR = "horror"
    SLICE_OF_LIFE = "slice_of_life"
    ISEKAI = "isekai"
    SCHOOL = "school"
    SCI_FI = "sci_fi"
    OTHER = "other"


class MangaStatus(str, enum.Enum):
    ONGOING = "ongoing"
    COMPLETED = "completed"
    HIATUS = "hiatus"
    DROPPED = "dropped"


# ── Manga ────────────────────────────────────────


class Manga(SQLModel, table=True):
    __tablename__ = "mangas"

    id: str = Field(
        default_factory=lambda: uuid4().hex,
        primary_key=True,
        max_length=64,
    )
    title: str = Field(max_length=255, index=True)
    slug: str = Field(max_length=280, unique=True, index=True)
    description: str = Field(default="")
    author: str = Field(default="", max_length=255)
    artist: str = Field(default="", max_length=255)
    category: MangaCategory = Field(default=MangaCategory.OTHER, max_length=24)
    status: MangaStatus = Field(default=MangaStatus.ONGOING, max_length=16)
    cover_url: str = Field(
        default="",
        max_length=512,
        description="Public URL on Cloudflare R2",
    )
    is_featured: bool = Field(default=False, index=True)
    is_visible: bool = Field(default=True, index=True)
    total_views: int = Field(default=0, ge=0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc).replace(tzinfo=None)},
    )

    # ── Relationships ────────────────────────────
    chapters: List["Chapter"] = Relationship(
        back_populates="manga",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )


# ── Chapter ──────────────────────────────────────


class Chapter(SQLModel, table=True):
    __tablename__ = "chapters"

    id: str = Field(
        default_factory=lambda: uuid4().hex,
        primary_key=True,
        max_length=64,
    )
    manga_id: str = Field(foreign_key="mangas.id", index=True, max_length=64)
    number: float = Field(index=True, description="Chapter number (supports .5 specials)")
    title: str = Field(default="", max_length=255)
    coin_price: int = Field(
        default=0,
        ge=0,
        description="Coins required to unlock. 0 = free chapter.",
    )
    is_free: bool = Field(default=True, index=True)
    total_views: int = Field(default=0, ge=0)

    published_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    # ── Relationships ────────────────────────────
    manga: Optional[Manga] = Relationship(back_populates="chapters")
    pages: List["Page"] = Relationship(
        back_populates="chapter",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "selectin"},
    )

    __table_args__ = (
        UniqueConstraint("manga_id", "number", name="uq_chapter_manga_number"),
    )


# ── Page ─────────────────────────────────────────


class Page(SQLModel, table=True):
    __tablename__ = "pages"

    id: str = Field(
        default_factory=lambda: uuid4().hex,
        primary_key=True,
        max_length=64,
    )
    chapter_id: str = Field(foreign_key="chapters.id", index=True, max_length=64)
    number: int = Field(ge=1, description="Page order within chapter")
    image_url: str = Field(
        max_length=512,
        description="Public URL on Cloudflare R2",
    )
    width: int = Field(default=0, ge=0)
    height: int = Field(default=0, ge=0)

    # ── Relationships ────────────────────────────
    chapter: Optional[Chapter] = Relationship(back_populates="pages")
