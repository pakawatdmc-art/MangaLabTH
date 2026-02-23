import httpx
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)


async def revalidate_paths(paths: list[str]) -> None:
    settings = get_settings()
    if not settings.FRONTEND_URL or not settings.REVALIDATION_SECRET:
        logger.warning(
            "FRONTEND_URL or REVALIDATION_SECRET not set, skipping revalidation")
        return

    url = f"{settings.FRONTEND_URL.rstrip('/')}/api/revalidate"
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
                        f"Failed to revalidate {path}: {response.text}")
                else:
                    logger.info(f"Successfully revalidated {path}")
            except Exception as e:
                logger.error(f"Error revalidating {path}: {str(e)}")
