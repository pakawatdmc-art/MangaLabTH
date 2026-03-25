import asyncio
from datetime import date, datetime, timedelta
from sqlalchemy import select, func, case
from app.database import engine
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.manga import Manga, Chapter
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.models.analytics import DailyMangaView

async def main():
    async with AsyncSession(engine) as session:
        today = date.today()
        start_date = today - timedelta(days=30 - 1)
        start_dt = datetime.combine(start_date, datetime.min.time())

        print("1. Users & Views")
        try:
            user_count = (await session.execute(select(func.count()).select_from(User))).scalar_one()
            total_views = (await session.execute(select(func.coalesce(func.sum(Manga.total_views), 0)))).scalar_one()
            print("OK")
        except Exception as e:
            print("Failed", str(e))

        print("2. 30-day Tx")
        try:
            tx_30d_stmt = select(
                func.coalesce(func.sum(case((Transaction.type == TransactionType.COIN_PURCHASE, Transaction.amount), else_=0)), 0).label("coins_earned"),
                func.coalesce(func.sum(case((Transaction.type == TransactionType.CHAPTER_UNLOCK, Transaction.amount), else_=0)), 0).label("coins_spent"),
            ).where(Transaction.created_at >= start_dt)
            tx_30d = (await session.execute(tx_30d_stmt)).first()
            print("OK")
        except Exception as e:
            print("Failed", str(e))

        print("3. Views Chart")
        try:
            view_stmt = (
                select(
                    DailyMangaView.view_date,
                    func.sum(DailyMangaView.view_count).label("total_views")
                )
                .where(DailyMangaView.view_date >= start_date)
                .group_by(DailyMangaView.view_date)
            )
            await session.execute(view_stmt)
            print("OK")
        except Exception as e:
            print("Failed", str(e))

        print("4. Tx Chart")
        try:
            tx_stmt = (
                select(
                    func.date(Transaction.created_at).label("tx_date"),
                    func.coalesce(func.sum(case((Transaction.type == TransactionType.COIN_PURCHASE, Transaction.amount), else_=0)), 0).label("coins_purchased"),
                    func.coalesce(func.sum(case((Transaction.type == TransactionType.CHAPTER_UNLOCK, Transaction.amount), else_=0)), 0).label("coins_spent"),
                )
                .where(Transaction.created_at >= start_dt)
                .group_by(func.date(Transaction.created_at))
            )
            await session.execute(tx_stmt)
            print("OK")
        except Exception as e:
            print("Failed", str(e))

        print("5. Top Grossing")
        try:
            top_grossing_stmt = (
                select(
                    Manga.id,
                    Manga.title,
                    Manga.slug,
                    Manga.cover_image,
                    func.sum(func.abs(Transaction.amount)).label("coins_earned")
                )
                .join(Chapter, Transaction.chapter_id == Chapter.id)
                .join(Manga, Chapter.manga_id == Manga.id)
                .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
                .where(Transaction.amount < 0)
                .group_by(Manga.id)
                .order_by(func.sum(func.abs(Transaction.amount)).desc())
                .limit(5)
            )
            await session.execute(top_grossing_stmt)
            print("OK")
        except Exception as e:
            print("Failed", str(e))

        print("6. Top Viewed")
        try:
            top_viewed_stmt = (
                select(Manga.id, Manga.title, Manga.slug, Manga.cover_image, Manga.total_views)
                .order_by(Manga.total_views.desc())
                .limit(5)
            )
            await session.execute(top_viewed_stmt)
            print("OK")
        except Exception as e:
            print("Failed", str(e))

        print("Done")

asyncio.run(main())
