import asyncio
import re
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import select
from app.database import async_session_factory
from app.models.manga import Manga

def generate_thai_slug(title: str) -> str:
    s = title.lower()
    s = re.sub(r'[^a-z0-9\u0E00-\u0E7F\s\-]', '', s)
    s = re.sub(r'\s+', '-', s)
    s = re.sub(r'\-+', '-', s)
    return s.strip('-')

async def main():
    async with async_session_factory() as session:
        result = await session.execute(select(Manga))
        mangas = result.scalars().all()
        
        updated_count = 0
        existing_slugs = set([m.slug for m in mangas])
        
        for manga in mangas:
            target_slug = generate_thai_slug(manga.title)
            
            if manga.slug != target_slug:
                # Basic collision handling
                original_target = target_slug
                counter = 1
                while target_slug in existing_slugs and target_slug != manga.slug:
                    target_slug = f"{original_target}-{counter}"
                    counter += 1
                
                print(f"Updating '{manga.title}'")
                print(f"    Old Slug: {manga.slug}")
                print(f"    New Slug: {target_slug}")
                
                existing_slugs.add(target_slug)
                manga.slug = target_slug
                session.add(manga)
                updated_count += 1
                
        if updated_count > 0:
            try:
                await session.commit()
                print(f"\nSuccessfully updated {updated_count} mangas!")
            except Exception as e:
                await session.rollback()
                print(f"\nDatabase Error: {e}")
        else:
            print("\nAll mangas already have the correct up-to-date slug format.")

if __name__ == "__main__":
    asyncio.run(main())
