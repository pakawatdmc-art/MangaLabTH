import asyncio
import httpx
import logging
import time
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List

from app.database import async_session_factory
from app.models.manga import Manga
from app.services.image import process_image_to_webp
from app.services.storage import upload_file_to_r2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def resize_all_covers():
    async with async_session_factory() as session:
        result = await session.execute(select(Manga).where(Manga.cover_url != None))
        mangas = result.scalars().all()
        logger.info(f"Found {len(mangas)} mangas with covers.")
        
        for manga in mangas:
            if not manga.cover_url:
                continue
                
            logger.info(f"Processing manga: {manga.slug}")
            
            try:
                # 1. Download image
                # Since httpx.get is blocking, use AsyncClient
                async with httpx.AsyncClient(follow_redirects=True) as client:
                    response = await client.get(manga.cover_url)
                
                if response.status_code != 200:
                    logger.error(f"Failed to download {manga.cover_url} - status {response.status_code}")
                    continue
                    
                image_bytes = response.content
                logger.info(f"  Downloaded {len(image_bytes)} bytes")
                
                # 2. Resize and convert to WebP
                processed_bytes, content_type = process_image_to_webp(image_bytes, max_width=500)
                logger.info(f"  Processed to {len(processed_bytes)} bytes")
                
                # 3. Upload to R2 (upload_file_to_r2 is synchronous because boto3 is synchronous)
                key = f"covers/resized-{int(time.time())}-{manga.slug}.webp"
                public_url = upload_file_to_r2(key, processed_bytes, content_type)
                logger.info(f"  Uploaded to {public_url}")
                
                # 4. Update Database
                manga.cover_url = public_url
                session.add(manga)
                await session.commit()
                logger.info(f"  Successfully updated cover for {manga.title}")
                
            except Exception as e:
                logger.error(f"  Error processing {manga.slug}: {e}")
                await session.rollback()

if __name__ == "__main__":
    asyncio.run(resize_all_covers())
