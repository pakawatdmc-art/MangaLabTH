"""Async database engine and session factory for Neon PostgreSQL."""

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

    # 1 THB = 1 Coin (price_thb is in Thai Baht)
    packages = [
        CoinPackage(name="50 Coins", coins=50, price_thb=50, sort_order=1),
        CoinPackage(name="100 Coins", coins=100,
                    price_thb=100, sort_order=2),
        CoinPackage(name="300 Coins", coins=300,
                    price_thb=300, sort_order=3),
        CoinPackage(name="500 Coins", coins=500,
                    price_thb=500, sort_order=4),
        CoinPackage(name="1,000 Coins", coins=1000,
                    price_thb=1000, sort_order=5),
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
