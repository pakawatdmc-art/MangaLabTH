"""Auto-notify Google when content is updated.

Uses Google Indexing API for real-time URL notification.
Requires a Service Account JSON (base64-encoded or raw) in
the GOOGLE_INDEXING_CREDENTIALS env var, or Application Default
Credentials when running on Google Cloud Run.

This module is designed to be called as a FastAPI background task
so it never blocks the API response.
"""

import base64
import json
import logging

import httpx
import google.auth
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account

from app.config import get_settings

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish"
SCOPES = ["https://www.googleapis.com/auth/indexing"]


def _get_google_credentials():
    """Build Google credentials from env var or Application Default Credentials."""
    settings = get_settings()

    # --- Priority 1: explicit env var ---
    raw = settings.GOOGLE_INDEXING_CREDENTIALS
    if raw:
        try:
            # Try base64 first, fall back to raw JSON
            try:
                creds_info = json.loads(
                    base64.b64decode(raw).decode("utf-8")
                )
            except Exception:
                creds_info = json.loads(raw)

            creds = service_account.Credentials.from_service_account_info(
                creds_info, scopes=SCOPES
            )
            logger.info("✅ Loaded Google credentials from GOOGLE_INDEXING_CREDENTIALS")
            return creds
        except Exception as e:
            logger.error(f"❌ Failed to parse GOOGLE_INDEXING_CREDENTIALS: {e}")
            return None

    # --- Priority 2: Application Default Credentials (Cloud Run) ---
    try:
        creds, _ = google.auth.default(scopes=SCOPES)
        logger.info("✅ Loaded Google credentials from Application Default Credentials")
        return creds
    except Exception:
        return None


async def _publish_url(url: str, action: str = "URL_UPDATED") -> bool:
    """Publish a single URL to the Google Indexing API.

    Returns True on success, False otherwise.
    """
    creds = _get_google_credentials()
    if creds is None:
        logger.warning("⏭️ No Google credentials available — skipping Indexing API")
        return False

    # Refresh the access token (sync, but very fast — just an HTTP call)
    try:
        creds.refresh(GoogleAuthRequest())
    except Exception as e:
        logger.error(f"❌ Failed to refresh Google token: {e}")
        return False

    headers = {
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json",
    }
    payload = {"url": url, "type": action}

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(
                INDEXING_API_URL, headers=headers, json=payload
            )
            if resp.status_code == 200:
                logger.info(f"⚡ Indexing API success: {url}")
                return True
            else:
                logger.warning(
                    f"⚠️ Indexing API {resp.status_code}: {resp.text[:300]}"
                )
                return False
        except Exception as e:
            logger.error(f"❌ Indexing API request error: {e}")
            return False


async def notify_google_updated(updated_paths: list[str]) -> None:
    """Notify Google about content updates.

    Called as a FastAPI background task after manga/chapter changes.

    Args:
        updated_paths: e.g. ["/manga/solo-leveling", "/"]
    """
    settings = get_settings()
    site_url = settings.SITE_URL

    if not site_url:
        logger.warning("SITE_URL not set — skipping Google notification")
        return

    for path in updated_paths:
        full_url = f"{site_url.rstrip('/')}{path}"
        logger.info(f"📢 Content updated: {full_url}")
        await _publish_url(full_url, "URL_UPDATED")
