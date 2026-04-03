"""Auto-notify Google when content is updated.

Uses two mechanisms:
1. Ping Sitemap — sends a GET request to Google's ping endpoint
   to inform it that the sitemap has been updated.
2. (Future) Google Indexing API — for direct URL notification.

This module is designed to be called as a FastAPI background task
so it never blocks the API response.
"""

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


async def ping_google_sitemap(sitemap_url: Optional[str] = None) -> None:
    """Ping Google to re-crawl the sitemap.

    Google's public endpoint:
        GET https://www.google.com/ping?sitemap=<url>

    This is a lightweight, credential-free way to notify Google
    that new content has been published.
    """
    settings = get_settings()
    site_url = settings.SITE_URL

    if not site_url:
        logger.warning("SITE_URL not set — skipping Google sitemap ping")
        return

    if sitemap_url is None:
        sitemap_url = f"{site_url.rstrip('/')}/sitemap.xml"

    google_ping_url = f"https://www.google.com/ping?sitemap={sitemap_url}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(google_ping_url)
            if response.status_code == 200:
                logger.info(
                    f"✅ Google sitemap ping successful: {sitemap_url}"
                )
            else:
                logger.warning(
                    f"⚠️ Google sitemap ping returned {response.status_code}: "
                    f"{response.text[:200]}"
                )
        except Exception as e:
            logger.error(f"❌ Google sitemap ping failed: {e}")


async def notify_google_updated(
    updated_paths: list[str],
) -> None:
    """Notify Google about content updates.

    Called as a background task after chapter/manga creation or update.

    Args:
        updated_paths: List of paths that were updated,
            e.g. ["/manga/solo-leveling", "/"]
    """
    settings = get_settings()
    site_url = settings.SITE_URL

    if not site_url:
        logger.warning("SITE_URL not set — skipping Google notification")
        return

    # Always ping the sitemap when content changes
    await ping_google_sitemap()

    # Log the updated URLs for monitoring
    for path in updated_paths:
        full_url = f"{site_url.rstrip('/')}{path}"
        logger.info(f"📢 Content updated: {full_url}")
