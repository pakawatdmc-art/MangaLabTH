"""Notification service — debounced new-chapter email alerts.

When a new chapter is created, call `schedule_chapter_notification()`.
The service buffers chapters per manga_id and waits 10 minutes after the
last chapter is added before sending a single batch email to the top 50
readers (ranked by number of chapter unlocks in that manga).

This uses pure asyncio — no Celery/Redis required.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import func, text
from sqlmodel import select

from app.config import get_settings
from app.services.email_service import send_new_chapter_notification

logger = logging.getLogger(__name__)
settings = get_settings()

# Debounce window in seconds (10 minutes)
DEBOUNCE_SECONDS = 600

# Maximum number of recipients per manga notification
MAX_RECIPIENTS = 50


@dataclass
class PendingNotification:
    """Buffer for chapters waiting to be sent."""
    manga_id: str
    manga_title: str
    manga_slug: str
    cover_url: str
    chapters: list[dict] = field(default_factory=list)
    timer_task: Optional[asyncio.Task] = field(default=None, repr=False)


# In-memory buffer: manga_id → PendingNotification
_pending: dict[str, PendingNotification] = {}


async def schedule_chapter_notification(
    manga_id: str,
    manga_title: str,
    manga_slug: str,
    cover_url: str,
    chapter_number: float,
    chapter_title: str,
    is_free: bool,
    coin_price: int,
) -> None:
    """Schedule a debounced notification for a new chapter.

    If multiple chapters are added within the debounce window,
    they will be batched into a single email.
    """
    chapter_info = {
        "number": chapter_number,
        "title": chapter_title,
        "is_free": is_free,
        "coin_price": coin_price,
    }

    if manga_id in _pending:
        # Append chapter and reset timer
        _pending[manga_id].chapters.append(chapter_info)
        if _pending[manga_id].timer_task:
            _pending[manga_id].timer_task.cancel()
        logger.info(
            "Buffered chapter %.1f for %s (total buffered: %d)",
            chapter_number, manga_title, len(_pending[manga_id].chapters),
        )
    else:
        _pending[manga_id] = PendingNotification(
            manga_id=manga_id,
            manga_title=manga_title,
            manga_slug=manga_slug,
            cover_url=cover_url,
            chapters=[chapter_info],
        )
        logger.info(
            "New notification buffer for %s — chapter %.1f",
            manga_title, chapter_number,
        )

    # Start a new debounce timer
    _pending[manga_id].timer_task = asyncio.create_task(
        _debounce_then_send(manga_id)
    )


async def _debounce_then_send(manga_id: str) -> None:
    """Wait for the debounce window, then trigger the batch send."""
    try:
        await asyncio.sleep(DEBOUNCE_SECONDS)
        await _send_batch_notifications(manga_id)
    except asyncio.CancelledError:
        # Timer was reset because a new chapter was added — expected behavior
        pass
    except Exception:
        logger.exception("Error in debounce send for manga_id=%s", manga_id)
        # Clean up buffer on error
        _pending.pop(manga_id, None)


async def _send_batch_notifications(manga_id: str) -> None:
    """Query top 50 readers and send them the batch notification email."""
    pending = _pending.pop(manga_id, None)
    if not pending or not pending.chapters:
        return

    chapter_count = len(pending.chapters)
    logger.info(
        "Debounce expired for %s — sending %d chapter(s) notification",
        pending.manga_title, chapter_count,
    )

    # --- Query top 50 readers by unlock count ---
    try:
        from app.database import async_session_factory

        async with async_session_factory() as session:
            # Find users who unlocked chapters in this manga,
            # ranked by number of unlocks (most invested readers first).
            # Using raw SQL for the complex join + aggregate query.
            query = text("""
                SELECT u.email, u.display_name, COUNT(t.id) as unlock_count
                FROM transactions t
                JOIN chapters c ON t.chapter_id = c.id
                JOIN users u ON t.user_id = u.id
                WHERE t.type = 'chapter_unlock'
                  AND c.manga_id = :manga_id
                  AND u.email IS NOT NULL
                  AND u.email != ''
                GROUP BY u.id, u.email, u.display_name
                ORDER BY unlock_count DESC
                LIMIT :limit
            """)
            result = await session.execute(
                query, {"manga_id": manga_id, "limit": MAX_RECIPIENTS}
            )
            recipients = result.fetchall()

        if not recipients:
            logger.info("No eligible recipients found for %s", pending.manga_title)
            return

        logger.info(
            "Sending chapter notification to %d recipients for %s",
            len(recipients), pending.manga_title,
        )

        # Send emails (with small delay between each to be polite to Brevo)
        sent = 0
        for row in recipients:
            email, display_name, unlock_count = row
            try:
                await send_new_chapter_notification(
                    to_email=email,
                    display_name=display_name or "ผู้อ่าน",
                    manga_title=pending.manga_title,
                    manga_slug=pending.manga_slug,
                    cover_url=pending.cover_url,
                    chapters=pending.chapters,
                )
                sent += 1
                # Small delay to avoid hitting Brevo rate limits
                await asyncio.sleep(0.5)
            except Exception:
                logger.exception(
                    "Failed to send chapter notification to %s", email
                )

        logger.info(
            "Chapter notification complete: %d/%d emails sent for %s",
            sent, len(recipients), pending.manga_title,
        )

    except Exception:
        logger.exception(
            "Failed to query recipients for manga_id=%s", manga_id
        )
