"""Analytics service for recording views and reads safely."""

from datetime import date, datetime, timedelta, timezone
import logging
from typing import Optional
from cachetools import TTLCache  # type: ignore

def is_bot_request(user_agent: Optional[str]) -> bool:
    """Check if the request comes from a known bot/crawler to prevent fake analytics."""
    if not user_agent:
        return False
    ua = user_agent.lower()
    bots = [
        "bot", "crawler", "spider", "headless", "facebookexternalhit", 
        "slurp", "inspect", "yandex", "bing", "preview", "lighthouse", "vercel"
    ]
    return any(bot in ua for bot in bots)

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import update

from app.models.manga import Manga
from app.models.analytics import DailyMangaView, DailyMangaRead
from app.database import async_session_factory
from sqlmodel import col

logger = logging.getLogger(__name__)

# Cache configuration for duplicate view prevention
# Store max 20,000 IPs/Manga IDs, expire after 1 hour (3600 seconds)
_view_cache = TTLCache(maxsize=20000, ttl=3600)
_read_cache = TTLCache(maxsize=20000, ttl=3600)


async def record_manga_view_task(manga_id: str, ip_address: Optional[str] = None):
    """Background task to record a VIEW (detail page visit) for a manga, with deduplication."""
    if ip_address:
        cache_key = f"view:{manga_id}:{ip_address}"
        if cache_key in _view_cache:
            return
        _view_cache[cache_key] = True

    # ใช้วันที่ไทย (UTC+7) เสมอ ไม่ว่า server จะอยู่ timezone ไหน
    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()

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
            logger.error("Failed to record view for manga_id=%s: %s", manga_id, e)
            await session.rollback()


async def record_manga_read_task(manga_id: str, ip_address: Optional[str] = None):
    """Background task to record a READ (actual chapter read) for a manga, with deduplication.

    This is more accurate than views — only counted when a user actually opens a chapter.
    Used for ranking to reflect real reader engagement.
    """
    if ip_address:
        cache_key = f"read:{manga_id}:{ip_address}"
        if cache_key in _read_cache:
            return
        _read_cache[cache_key] = True

    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()

    async with async_session_factory() as session:
        try:
            # 1. Upsert into daily_manga_reads
            stmt = pg_insert(DailyMangaRead).values(
                manga_id=manga_id,
                read_date=today,
                read_count=1
            ).on_conflict_do_update(
                index_elements=["manga_id", "read_date"],
                set_={"read_count": DailyMangaRead.read_count + 1}
            )
            await session.execute(stmt)

            # 2. Update total_reads in mangas
            update_stmt = (
                update(Manga)
                .where(col(Manga.id) == manga_id)
                .values(total_reads=Manga.total_reads + 1)
            )
            await session.execute(update_stmt)

            await session.commit()
        except Exception as e:
            logger.error("Failed to record read for manga_id=%s: %s", manga_id, e)
            await session.rollback()
