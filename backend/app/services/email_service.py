"""Email service using Brevo (Sendinblue) API.

Sends transactional emails (welcome, payment confirmation) as fire-and-forget
background tasks. Failures are logged but never block the main request flow.

Usage:
    import asyncio
    from app.services.email_service import send_welcome_email
    asyncio.create_task(send_welcome_email("user@example.com", "ชื่อผู้ใช้"))
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
settings = get_settings()


def _is_configured() -> bool:
    """Check if Brevo API key is set."""
    return bool(settings.BREVO_API_KEY)


def _parse_email_from(email_from: str) -> dict:
    """Parse 'Name <email@domain.com>' into Brevo sender object."""
    if "<" in email_from and ">" in email_from:
        name = email_from.split("<")[0].strip()
        email = email_from.split("<")[1].split(">")[0].strip()
        return {"name": name, "email": email}
    return {"name": "MangaLabTH", "email": email_from.strip()}


async def _send_brevo_email(payload: dict) -> None:
    """Send email via Brevo v3 API."""
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
            logger.info("Email sent successfully (Message ID: %s)", result.get("messageId", "?"))
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
        site_url = settings.FRONTEND_URL or settings.SITE_URL or "https://mangalab-th.com"
        html = welcome_email_html(display_name=display_name, site_url=site_url)

        payload = {
            "sender": _parse_email_from(settings.EMAIL_FROM),
            "to": [{"email": to_email}],
            "subject": "🎉 ยินดีต้อนรับสู่ MangaLabTH!",
            "htmlContent": html,
        }

        await _send_brevo_email(payload)
    except Exception:
        # Error is already logged in _send_brevo_email
        pass


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
        site_url = settings.FRONTEND_URL or settings.SITE_URL or "https://mangalab-th.com"
        html = payment_confirmation_email_html(
            display_name=display_name,
            package_name=package_name,
            coins=coins,
            price_thb=price_thb,
            new_balance=new_balance,
            reference_no=reference_no,
            site_url=site_url,
        )

        payload = {
            "sender": _parse_email_from(settings.EMAIL_FROM),
            "to": [{"email": to_email}],
            "subject": f"✅ เติมเหรียญสำเร็จ — {coins:,} เหรียญ",
            "htmlContent": html,
        }

        await _send_brevo_email(payload)
    except Exception:
        # Error is already logged in _send_brevo_email
        pass


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
        site_url = settings.FRONTEND_URL or settings.SITE_URL or "https://mangalab-th.com"
        html = new_chapter_notification_email_html(
            display_name=display_name,
            manga_title=manga_title,
            manga_slug=manga_slug,
            cover_url=cover_url,
            chapters=chapters,
            site_url=site_url,
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
    except Exception:
        # Error is already logged in _send_brevo_email
        pass
