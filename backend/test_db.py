import asyncio
from app.db.session import async_session_maker
from sqlmodel import select
from app.models.manga import Manga
from app.schemas.manga import MangaRead

async def test():
    async with async_session_maker() as session:
        query = select(Manga).limit(10)
        results = (await session.execute(query)).scalars().all()
        for m in results:
            try:
                data = MangaRead.model_validate(m)
                print(f"Validated {m.id}")
            except Exception as e:
                print(f"Error validating {m.id}: {e}")

asyncio.run(test())
