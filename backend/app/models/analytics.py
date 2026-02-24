"""Analytics models."""

from datetime import date, datetime, timezone
from uuid import uuid4
from sqlalchemy import UniqueConstraint

from sqlmodel import Field, SQLModel


class DailyMangaView(SQLModel, table=True):
    __tablename__ = "daily_manga_views"

    id: str = Field(
        default_factory=lambda: uuid4().hex,
        primary_key=True,
        max_length=64,
    )
    manga_id: str = Field(foreign_key="mangas.id", index=True, max_length=64)
    # The date when the views occurred (without time)
    view_date: date = Field(index=True)
    view_count: int = Field(default=0, ge=0)

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(
            timezone.utc).replace(tzinfo=None),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(
            timezone.utc).replace(tzinfo=None),
        sa_column_kwargs={"onupdate": lambda: datetime.now(
            timezone.utc).replace(tzinfo=None)},
    )

    __table_args__ = (
        UniqueConstraint("manga_id", "view_date",
                         name="uq_daily_view_manga_date"),
    )
