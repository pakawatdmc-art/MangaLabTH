"""Auto-notify Google when content is updated.

Uses two mechanisms:
1. Ping Sitemap — sends a GET request to Google's ping endpoint.
2. Google Indexing API — for VIP, real-time URL notification 
   (Requires Service Account or base64 JSON in env).

This module is designed to be called as a FastAPI background task
so it never blocks the API response.
"""

import base64
import json
import logging
from typing import Optional

import httpx
import google.auth
from google.auth.transport.urllib3 import Request
from google.oauth2 import service_account

from app.config import get_settings

logger = logging.getLogger(__name__)

INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish"
SCOPES = ["https://www.googleapis.com/auth/indexing"]


def get_google_credentials():
    """Retrieve Google Auth Credentials via Env Var or Application Default Credentials."""
    settings = get_settings()
    
    # 1. Try from environment variable (Base64 JSON string)
    if settings.GOOGLE_INDEXING_CREDENTIALS:
        try:
            raw_creds = settings.GOOGLE_INDEXING_CREDENTIALS
            # Attempt to decode base64
            try:
                decoded = base64.b64decode(raw_creds).decode("utf-8")
                creds_info = json.loads(decoded)
            except Exception:
                # Fallback to plain JSON string
                creds_info = json.loads(raw_creds)
                
            return service_account.Credentials.from_service_account_info(
                creds_info, scopes=SCOPES
            )
        except Exception as e:
            logger.error(f"Failed to load GOOGLE_INDEXING_CREDENTIALS: {e}")
            return None

    # 2. Try Application Default Credentials (e.g. Cloud Run bound service account)
    try:
        credentials, _ = google.auth.default(scopes=SCOPES)
        return credentials
    except Exception as e:
        logger.debug(f"No Application Default Credentials found: {e}")
        return None


async def publish_to_indexing_api(url: str, request_type: str = "URL_UPDATED") -> None:
    """Send a direct ping to Google Indexing API."""
    credentials = get_google_credentials()
    if not credentials:
        # This is not an error, the user might intentionally not have set this up yet
        return

    # Refresh token if expired
    if not credentials.valid:
        try:
            credentials.refresh(Request())
        except Exception as e:
            logger.error(f"Failed to refresh Google token: {e}")
            return

    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "url": url,
        "type": request_type
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(INDEXING_API_URL, headers=headers, json=payload)
            if response.status_code == 200:
                logger.info(f"⚡ Indexing API VIP success: {url}")
            else:
                logger.warning(
                    f"⚠️ Indexing API failed ({response.status_code}): {response.text[:200]}"
                )
        except Exception as e:
            logger.error(f"❌ Indexing API request failed: {e}")


async def ping_google_sitemap(sitemap_url: Optional[str] = None) -> None:
    """Ping Google to re-crawl the sitemap."""
    settings = get_settings()
    site_url = settings.SITE_URL

    if not site_url:
        return

    if sitemap_url is None:
        sitemap_url = f"{site_url.rstrip('/')}/sitemap.xml"

    google_ping_url = f"https://www.google.com/ping?sitemap={sitemap_url}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(google_ping_url)
            if response.status_code == 200:
                logger.info(f"✅ Google sitemap ping successful: {sitemap_url}")
            else:
                logger.warning(
                    f"⚠️ Google sitemap ping returned {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            logger.error(f"❌ Google sitemap ping failed: {e}")


async def notify_google_updated(updated_paths: list[str]) -> None:
    """Notify Google about content updates.

    Called as a background task.
    """
    settings = get_settings()
    site_url = settings.SITE_URL

    if not site_url:
        logger.warning("SITE_URL not set — skipping Google notification")
        return

    # 1. Ping the entire sitemap just in case
    await ping_google_sitemap()

    # 2. Fire direct VIP request for each specific changed path
    for path in updated_paths:
        full_url = f"{site_url.rstrip('/')}{path}"
        logger.info(f"📢 Content updated: {full_url}")
        
        # Fire VIP Indexing API request
        await publish_to_indexing_api(full_url, "URL_UPDATED")
