"""Email service using Brevo (Sendinblue) API.

Sends transactional emails (welcome, payment confirmation) as fire-and-forget
background tasks. Failures are logged but never block the main request flow.

Usage:
    from app.services.email_service import send_welcome_email, fire_and_forget
    fire_and_forget(send_welcome_email("user@example.com", "ชื่อผู้ใช้"))
"""

import asyncio
import logging
import httpx
from typing import Optional

from app.config import get_settings
from app.services.email_templates import (
    welcome_email_html,
    payment_confirmation_email_html,
    new_chapter_notification_email_html,
)

logger = logging.getLogger(__name__)

# ── Background task management ───────────────────
# Keep references to fire-and-forget tasks so the GC doesn't destroy them
_background_tasks: set[asyncio.Task] = set()


def fire_and_forget(coro) -> None:
    """Schedule a coroutine as a background task, safe from GC.

    The task reference is stored in a module-level set and automatically
    removed when the task completes (success or failure).
    """
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


def _is_configured() -> bool:
    """Check if Brevo API key is set."""
    return bool(get_settings().BREVO_API_KEY)


def _parse_email_from(email_from: str) -> dict:
    """Parse 'Name <email@domain.com>' into Brevo sender object."""
    if "<" in email_from and ">" in email_from:
        name = email_from.split("<")[0].strip()
        email = email_from.split("<")[1].split(">")[0].strip()
        return {"name": name, "email": email}
    return {"name": "MangaLabTH", "email": email_from.strip()}


def _get_site_url() -> str:
    """Get the site URL from settings."""
    s = get_settings()
    return s.FRONTEND_URL or s.SITE_URL or "https://mangalab-th.com"


async def _send_brevo_email(payload: dict) -> None:
    """Send email via Brevo v3 API."""
    settings = get_settings()
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": settings.BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
            logger.info(
                "Email sent successfully to %s (Message ID: %s)",
                payload.get("to", [{}])[0].get("email", "?"),
                result.get("messageId", "?"),
            )
    except httpx.HTTPStatusError as e:
        logger.error(
            "Brevo API error %d for %s: %s",
            e.response.status_code,
            payload.get("to", [{}])[0].get("email", "?"),
            e.response.text,
        )
        raise
    except Exception as e:
        logger.exception("Failed to send email via Brevo: %s", str(e))
        raise


async def send_welcome_email(to_email: str, display_name: str) -> None:
    """Send welcome email to a newly registered user.

    Fire-and-forget — exceptions are caught and logged, never raised.
    Uses async httpx.
    """
    if not _is_configured():
        logger.debug("Brevo not configured, skipping welcome email for %s", to_email)
        return

    try:
        settings = get_settings()
        html = welcome_email_html(display_name=display_name, site_url=_get_site_url())

        payload = {
            "sender": _parse_email_from(settings.EMAIL_FROM),
            "to": [{"email": to_email}],
            "subject": "🎉 ยินดีต้อนรับสู่ MangaLabTH!",
            "htmlContent": html,
        }

        await _send_brevo_email(payload)
        logger.info("Welcome email sent to %s", to_email)
    except Exception:
        logger.exception("Failed to send welcome email to %s", to_email)


async def send_payment_confirmation_email(
    *,
    to_email: str,
    display_name: str,
    package_name: str,
    coins: int,
    price_thb: int,
    new_balance: int,
    reference_no: str,
) -> None:
    """Send payment confirmation email after successful coin purchase.

    Fire-and-forget — exceptions are caught and logged, never raised.
    Uses async httpx.
    """
    if not _is_configured():
        logger.debug("Brevo not configured, skipping payment email for %s", to_email)
        return

    try:
        settings = get_settings()
        html = payment_confirmation_email_html(
            display_name=display_name,
            package_name=package_name,
            coins=coins,
            price_thb=price_thb,
            new_balance=new_balance,
            reference_no=reference_no,
            site_url=_get_site_url(),
        )

        payload = {
            "sender": _parse_email_from(settings.EMAIL_FROM),
            "to": [{"email": to_email}],
            "subject": f"✅ เติมเหรียญสำเร็จ — {coins:,} เหรียญ",
            "htmlContent": html,
        }

        await _send_brevo_email(payload)
        logger.info("Payment confirmation email sent to %s", to_email)
    except Exception:
        logger.exception("Failed to send payment confirmation email to %s", to_email)


async def send_new_chapter_notification(
    *,
    to_email: str,
    display_name: str,
    manga_title: str,
    manga_slug: str,
    cover_url: str,
    chapters: list[dict],
) -> None:
    """Send new chapter notification email to a reader.

    Fire-and-forget — exceptions are caught and logged, never raised.
    """
    if not _is_configured():
        logger.debug("Brevo not configured, skipping chapter notification for %s", to_email)
        return

    try:
        settings = get_settings()
        html = new_chapter_notification_email_html(
            display_name=display_name,
            manga_title=manga_title,
            manga_slug=manga_slug,
            cover_url=cover_url,
            chapters=chapters,
            site_url=_get_site_url(),
        )

        chapter_count = len(chapters)
        if chapter_count == 1:
            num = chapters[0]["number"]
            num_str = f"{num:.0f}" if num == int(num) else f"{num}"
            subject = f"📢 {manga_title} — ตอนที่ {num_str} มาแล้ว!"
        else:
            subject = f"📢 {manga_title} — อัปเดต {chapter_count} ตอนใหม่!"

        payload = {
            "sender": _parse_email_from(settings.EMAIL_FROM),
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html,
        }

        await _send_brevo_email(payload)
        logger.info("Chapter notification email sent to %s for %s", to_email, manga_title)
    except Exception:
        logger.exception("Failed to send chapter notification email to %s", to_email)
