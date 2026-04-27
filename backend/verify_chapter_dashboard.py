"""Cross-check Chapter Analytics Dashboard numbers against raw SQL"""
import asyncio
from datetime import date, datetime, timedelta, timezone

async def main():
    from app.database import async_session_factory
    from sqlmodel import select
    from sqlalchemy import func
    from app.models.manga import Manga, Chapter
    from app.models.transaction import Transaction, TransactionType

    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()
    start_date = today - timedelta(days=29)  # 30 days
    prev_start_date = start_date - timedelta(days=30)

    thai_start_dt = datetime.combine(start_date, datetime.min.time())
    utc_start_dt = (thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)
    
    prev_thai_start_dt = datetime.combine(prev_start_date, datetime.min.time())
    prev_utc_start_dt = (prev_thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)

    print(f"=== Chapter Dashboard Verification (30 days) ===")
    print(f"Thai NOW: {thai_now}")
    print(f"Current period: {start_date} ~ {today}")
    print(f"Previous period: {prev_start_date} ~ {start_date - timedelta(days=1)}")
    print()

    async with async_session_factory() as session:
        # ── 1. TOTAL CHAPTERS ──
        total_chapters = (await session.execute(select(func.count()).select_from(Chapter))).scalar_one()
        prev_total = total_chapters - (await session.execute(
            select(func.count()).select_from(Chapter).where(Chapter.published_at >= utc_start_dt)
        )).scalar_one()
        growth = ((total_chapters - prev_total) / prev_total * 100) if prev_total > 0 else 100
        print(f"📚 Total Chapters:     {total_chapters}")
        print(f"   Before this period: {prev_total}")
        print(f"   Growth:             {growth:.1f}%")
        print()

        # ── 2. NEW CHAPTERS ──
        new_current = (await session.execute(
            select(func.count()).select_from(Chapter).where(Chapter.published_at >= utc_start_dt)
        )).scalar_one()
        new_prev = (await session.execute(
            select(func.count()).select_from(Chapter)
            .where(Chapter.published_at >= prev_utc_start_dt)
            .where(Chapter.published_at < utc_start_dt)
        )).scalar_one()
        growth_new = ((new_current - new_prev) / new_prev * 100) if new_prev > 0 else 100
        print(f"🆕 New Chapters (current): {new_current}")
        print(f"   New Chapters (prev):    {new_prev}")
        print(f"   Growth:                 {growth_new:.1f}%")
        print()

        # ── 3. UNLOCKS & COINS BURNED ──
        unlocks_current = (await session.execute(
            select(func.count(Transaction.id), func.sum(func.abs(Transaction.amount)))
            .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
            .where(Transaction.created_at >= utc_start_dt)
        )).first()
        total_unlocks = unlocks_current[0] if unlocks_current else 0
        coins_burned = int(unlocks_current[1]) if unlocks_current and unlocks_current[1] else 0

        unlocks_prev = (await session.execute(
            select(func.count(Transaction.id), func.sum(func.abs(Transaction.amount)))
            .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
            .where(Transaction.created_at >= prev_utc_start_dt)
            .where(Transaction.created_at < utc_start_dt)
        )).first()
        prev_unlocks = unlocks_prev[0] if unlocks_prev else 0
        prev_burned = int(unlocks_prev[1]) if unlocks_prev and unlocks_prev[1] else 0

        growth_unlocks = ((total_unlocks - prev_unlocks) / prev_unlocks * 100) if prev_unlocks > 0 else 100
        growth_burned = ((coins_burned - prev_burned) / prev_burned * 100) if prev_burned > 0 else 100
        print(f"🔓 Total Unlocks (current): {total_unlocks}")
        print(f"   Total Unlocks (prev):    {prev_unlocks}")
        print(f"   Growth:                  {growth_unlocks:.1f}%")
        print()
        print(f"🔥 Coins Burned (current): {coins_burned}")
        print(f"   Coins Burned (prev):    {prev_burned}")
        print(f"   Growth:                 {growth_burned:.1f}%")
        print()

        # ── 4. FREE vs PAID ──
        free = (await session.execute(
            select(func.count()).select_from(Chapter).where(Chapter.coin_price == 0)
        )).scalar_one()
        paid = (await session.execute(
            select(func.count()).select_from(Chapter).where(Chapter.coin_price > 0)
        )).scalar_one()
        print(f"📊 Content Mix:")
        print(f"   Free chapters:  {free} ({free/total_chapters*100:.1f}%)")
        print(f"   Paid chapters:  {paid} ({paid/total_chapters*100:.1f}%)")
        print(f"   SUM:            {free + paid}")
        print()

        # ── 5. TOP EARNING CHAPTERS ──
        top_stmt = (
            select(
                Manga.title,
                Chapter.number,
                func.count(Transaction.id).label("unlocks"),
                func.sum(func.abs(Transaction.amount)).label("coins")
            )
            .join(Transaction, Transaction.chapter_id == Chapter.id)
            .join(Manga, Manga.id == Chapter.manga_id)
            .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
            .where(Transaction.created_at >= utc_start_dt)
            .group_by(Chapter.id, Manga.id)
            .order_by(func.sum(func.abs(Transaction.amount)).desc())
            .limit(5)
        )
        top_results = (await session.execute(top_stmt)).all()
        print(f"🏆 Top 5 Earning Chapters:")
        for i, r in enumerate(top_results, 1):
            print(f"   #{i} {r.title} Ch.{r.number}: {r.unlocks} unlocks, {int(r.coins)} coins")

        # ── 6. DAILY UNLOCK TREND (last 7 days) ──
        print()
        print(f"📅 Daily unlock trend (last 7 days):")
        unlock_list = (await session.execute(
            select(Transaction.created_at, Transaction.amount)
            .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
            .where(Transaction.created_at >= (datetime.combine(today - timedelta(days=6), datetime.min.time()) - timedelta(hours=7)).replace(tzinfo=None))
        )).all()
        daily = {}
        for row in unlock_list:
            d = (row.created_at + timedelta(hours=7)).date()
            if d not in daily:
                daily[d] = {"unlocks": 0, "coins": 0}
            daily[d]["unlocks"] += 1
            daily[d]["coins"] += abs(row.amount)
        for d in range(6, -1, -1):
            check_date = today - timedelta(days=d)
            info = daily.get(check_date, {"unlocks": 0, "coins": 0})
            print(f"   {check_date}: {info['unlocks']} unlocks, {info['coins']} coins burned")

asyncio.run(main())
