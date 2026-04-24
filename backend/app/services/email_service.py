"""Email service using Resend SDK.

Sends transactional emails (welcome, payment confirmation) as fire-and-forget
background tasks. Failures are logged but never block the main request flow.

Usage:
    import asyncio
    from app.services.email_service import send_welcome_email
    asyncio.create_task(send_welcome_email("user@example.com", "ชื่อผู้ใช้"))
"""

import asyncio
import logging
from typing import Optional

import resend

from app.config import get_settings
from app.services.email_templates import (
    welcome_email_html,
    payment_confirmation_email_html,
)

logger = logging.getLogger(__name__)
settings = get_settings()


def _is_configured() -> bool:
    """Check if Resend API key is set."""
    return bool(settings.RESEND_API_KEY)


def _init_resend() -> None:
    """Initialize Resend API key (idempotent)."""
    if _is_configured():
        resend.api_key = settings.RESEND_API_KEY


async def send_welcome_email(to_email: str, display_name: str) -> None:
    """Send welcome email to a newly registered user.

    Fire-and-forget — exceptions are caught and logged, never raised.
    Uses asyncio.to_thread() because Resend SDK is synchronous.
    """
    if not _is_configured():
        logger.debug("Resend not configured, skipping welcome email for %s", to_email)
        return

    try:
        _init_resend()
        site_url = settings.FRONTEND_URL or settings.SITE_URL or "https://mangalab-th.com"
        html = welcome_email_html(display_name=display_name, site_url=site_url)

        params: resend.Emails.SendParams = {
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": "🎉 ยินดีต้อนรับสู่ MangaLabTH!",
            "html": html,
        }

        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info("Welcome email sent to %s (id: %s)", to_email, result.get("id", "?"))
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
    Uses asyncio.to_thread() because Resend SDK is synchronous.
    """
    if not _is_configured():
        logger.debug("Resend not configured, skipping payment email for %s", to_email)
        return

    try:
        _init_resend()
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

        params: resend.Emails.SendParams = {
            "from": settings.EMAIL_FROM,
            "to": [to_email],
            "subject": f"✅ เติมเหรียญสำเร็จ — {coins:,} เหรียญ",
            "html": html,
        }

        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(
            "Payment confirmation email sent to %s (ref: %s, id: %s)",
            to_email,
            reference_no,
            result.get("id", "?"),
        )
    except Exception:
        logger.exception(
            "Failed to send payment confirmation email to %s (ref: %s)",
            to_email,
            reference_no,
        )
