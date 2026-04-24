import asyncio
import logging
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import async_session_factory
from app.models.manga import Manga
from app.services.storage import _get_r2_client, delete_objects, settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def clean_old_covers():
    # 1. Get all active cover URLs from database to be absolutely safe
    active_cover_keys = set()
    async with async_session_factory() as session:
        result = await session.execute(select(Manga).where(Manga.cover_url != None))
        mangas = result.scalars().all()
        for manga in mangas:
            if manga.cover_url:
                # Extract key from URL
                public_base = settings.R2_PUBLIC_URL.rstrip("/") + "/"
                if manga.cover_url.startswith(public_base):
                    key = manga.cover_url[len(public_base):]
                    active_cover_keys.add(key)
                else:
                    parts = manga.cover_url.split(".r2.dev/", 1)
                    if len(parts) == 2:
                        active_cover_keys.add(parts[1])

    logger.info(f"Found {len(active_cover_keys)} active covers in database.")

    # 2. List all objects in R2 under 'covers/' prefix
    client = _get_r2_client()
    paginator = client.get_paginator('list_objects_v2')
    pages = paginator.paginate(Bucket=settings.R2_BUCKET_NAME, Prefix="covers/")

    all_keys = []
    for page in pages:
        if 'Contents' in page:
            for obj in page['Contents']:
                all_keys.append(obj['Key'])

    logger.info(f"Found {len(all_keys)} total objects in 'covers/' prefix.")

    # 3. Identify old keys (not starting with covers/resized- AND not in active DB keys)
    keys_to_delete = []
    for key in all_keys:
        filename = key.split("/")[-1]
        
        # If it's the folder itself, skip
        if key == "covers/":
            continue
            
        # If it doesn't start with resized- AND it's not currently being used in DB
        if not filename.startswith("resized-") and key not in active_cover_keys:
            keys_to_delete.append(key)

    logger.info(f"Identified {len(keys_to_delete)} old/unused cover images to delete.")

    # 4. Delete the objects
    if keys_to_delete:
        for k in keys_to_delete:
            logger.info(f"  Deleting: {k}")
        
        delete_objects(keys_to_delete)
        logger.info(f"Successfully deleted {len(keys_to_delete)} old covers.")
    else:
        logger.info("No old covers to delete.")

if __name__ == "__main__":
    asyncio.run(clean_old_covers())
