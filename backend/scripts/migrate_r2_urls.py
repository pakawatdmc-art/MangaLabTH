import asyncio
import logging
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import async_session_factory
from app.models.manga import Manga, Page

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLD_DOMAIN = "pub-b5b4e53af6574d55aa946f394ac86c8a.r2.dev"
NEW_DOMAIN = "cdn.mangalab-th.com"

async def migrate_urls():
    updated_mangas = 0
    updated_pages = 0

    async with async_session_factory() as session:
        # 1. Update Manga cover_url
        logger.info("Updating Manga cover_url...")
        result = await session.execute(select(Manga).where(Manga.cover_url.like(f"%{OLD_DOMAIN}%")))
        mangas = result.scalars().all()
        for manga in mangas:
            if manga.cover_url and OLD_DOMAIN in manga.cover_url:
                manga.cover_url = manga.cover_url.replace(OLD_DOMAIN, NEW_DOMAIN)
                session.add(manga)
                updated_mangas += 1

        # 2. Update Page image_url
        logger.info("Updating Page image_url...")
        result = await session.execute(select(Page).where(Page.image_url.like(f"%{OLD_DOMAIN}%")))
        pages = result.scalars().all()
        for page in pages:
            if page.image_url and OLD_DOMAIN in page.image_url:
                page.image_url = page.image_url.replace(OLD_DOMAIN, NEW_DOMAIN)
                session.add(page)
                updated_pages += 1

        logger.info("Committing changes to database...")
        await session.commit()
        
    logger.info(f"✅ Migration Complete!")
    logger.info(f"Updated {updated_mangas} manga covers.")
    logger.info(f"Updated {updated_pages} chapter pages.")

if __name__ == "__main__":
    asyncio.run(migrate_urls())
