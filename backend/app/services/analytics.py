"""Analytics service for recording views safely."""

from datetime import date
import logging
from typing import Optional
from cachetools import TTLCache  # type: ignore

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import update

from app.models.manga import Manga
from app.models.analytics import DailyMangaView
from app.database import async_session_factory
from sqlmodel import col

logger = logging.getLogger(__name__)

# Cache configuration for duplicate view prevention
# Store max 20,000 IPs/Manga IDs, expire after 1 hour (3600 seconds)
_view_cache = TTLCache(maxsize=20000, ttl=3600)


async def record_manga_view_task(manga_id: str, ip_address: Optional[str] = None):
    """Background task to record a view for a manga, with deduplication."""
    if ip_address:
        cache_key = f"{manga_id}:{ip_address}"
        if cache_key in _view_cache:
            # Already counted this manga view for this IP recently
            return
        _view_cache[cache_key] = True

    today = date.today()

    async with async_session_factory() as session:
        try:
            # 1. Upsert into daily_manga_views
            stmt = pg_insert(DailyMangaView).values(
                manga_id=manga_id,
                view_date=today,
                view_count=1
            ).on_conflict_do_update(
                index_elements=["manga_id", "view_date"],
                set_={"view_count": DailyMangaView.view_count + 1}
            )
            await session.execute(stmt)

            # 2. Update total_views in mangas
            update_stmt = (
                update(Manga)
                .where(col(Manga.id) == manga_id)
                .values(total_views=Manga.total_views + 1)
            )
            await session.execute(update_stmt)

            await session.commit()
        except Exception as e:
            logger.error(f"Failed to record view for manga_id={manga_id}: {e}")
            await session.rollback()
