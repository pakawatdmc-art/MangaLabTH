import asyncio
import os
import sys

# Add backend directory to sys.path to allow importing app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import select
from app.database import async_session_factory
from app.models.transaction import Transaction, TransactionType
from app.models.manga import Chapter, Manga

async def main():
    async with async_session_factory() as session:
        stmt = select(Transaction).where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        result = await session.execute(stmt)
        transactions = result.scalars().all()
        
        updated_count = 0
        for tx in transactions:
            if tx.chapter_id:
                chapter = await session.get(Chapter, tx.chapter_id)
                if chapter:
                    manga = await session.get(Manga, chapter.manga_id)
                    manga_title = manga.title if manga else "Unknown"
                    new_note = f"Unlocked {manga_title} chapter {chapter.number}"
                    if tx.note != new_note:
                        tx.note = new_note
                        session.add(tx)
                        updated_count += 1
        
        await session.commit()
        print(f"Updated {updated_count} transaction notes.")

if __name__ == "__main__":
    asyncio.run(main())
