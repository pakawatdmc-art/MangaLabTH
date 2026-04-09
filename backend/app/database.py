"""Async database engine and session factory for Supabase PostgreSQL."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.SQL_ECHO,
    future=True,
    pool_pre_ping=True,
    # Neon serverless: keep pool small, recycle aggressively
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,
)

async_session_factory = sessionmaker(  # type: ignore
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def seed_coin_packages(session: AsyncSession):
    """Seed initial coin packages if table is empty."""
    from sqlmodel import select
    from app.models.transaction import CoinPackage

    result = await session.execute(select(CoinPackage))
    if result.first():
        return

    # Must match scripts/seed_coin_packages.py for consistency
    packages = [
        CoinPackage(name="แพ็กเกจ 49 เหรียญ", coins=49, price_thb=49, sort_order=1),
        CoinPackage(name="แพ็กเกจ 104 เหรียญ", coins=104, price_thb=99, sort_order=2),
        CoinPackage(name="แพ็กเกจ 157 เหรียญ", coins=157, price_thb=149, sort_order=3),
        CoinPackage(name="แพ็กเกจ 214 เหรียญ", coins=214, price_thb=199, sort_order=4),
        CoinPackage(name="แพ็กเกจ 262 เหรียญ", coins=262, price_thb=249, sort_order=5),
        CoinPackage(name="แพ็กเกจ 549 เหรียญ", coins=549, price_thb=499, sort_order=6),
    ]
    for p in packages:
        session.add(p)
    await session.commit()


async def init_db() -> None:
    """Create all tables. Use Alembic for production migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # Seed data
    async with async_session_factory() as session:
        await seed_coin_packages(session)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
