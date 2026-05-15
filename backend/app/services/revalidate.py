import httpx
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)


async def revalidate_paths(paths: list[str]) -> None:
    settings = get_settings()
    # Prefer internal URL (localhost) for same-container calls
    frontend_url = settings.INTERNAL_FRONTEND_URL or settings.FRONTEND_URL
    if not frontend_url or not settings.REVALIDATION_SECRET:
        logger.warning(
            "FRONTEND_URL or REVALIDATION_SECRET not set, skipping revalidation")
        return

    url = f"{frontend_url.rstrip('/')}/api/revalidate"
    headers = {
        "Authorization": f"Bearer {settings.REVALIDATION_SECRET}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        for path in paths:
            try:
                response = await client.post(url, headers=headers, json={"path": path})
                if response.status_code != 200:
                    logger.error(
                        "Failed to revalidate %s: %s", path, response.text)
                else:
                    logger.info("Successfully revalidated %s", path)
            except Exception as e:
                logger.error("Error revalidating %s: %s", path, str(e))
