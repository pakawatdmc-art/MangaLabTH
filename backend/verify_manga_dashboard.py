"""Cross-check Manga Analytics Dashboard numbers against raw SQL"""
import asyncio
from datetime import date, datetime, timedelta, timezone

async def main():
    from app.database import async_session_factory
    from sqlmodel import select
    from sqlalchemy import func
    from app.models.manga import Manga, Chapter, MangaStatus
    from app.models.transaction import Transaction, TransactionType

    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()
    days = 7
    start_date = today - timedelta(days=days - 1)
    prev_start_date = start_date - timedelta(days=days)

    thai_start_dt = datetime.combine(start_date, datetime.min.time())
    utc_start_dt = (thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)

    prev_thai_start_dt = datetime.combine(prev_start_date, datetime.min.time())
    prev_utc_start_dt = (prev_thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)

    print(f"=== Manga Dashboard Verification (7 days) ===")
    print(f"Thai NOW: {thai_now}")
    print(f"Current period: {start_date} ~ {today}")
    print(f"Previous period: {prev_start_date} ~ {start_date - timedelta(days=1)}")
    print()

    async with async_session_factory() as session:
        # ── 1. TOTAL MANGAS ──
        total_mangas = (await session.execute(select(func.count()).select_from(Manga))).scalar_one()
        new_current = (await session.execute(
            select(func.count()).select_from(Manga).where(Manga.created_at >= utc_start_dt)
        )).scalar_one()
        new_prev = (await session.execute(
            select(func.count()).select_from(Manga)
            .where(Manga.created_at >= prev_utc_start_dt)
            .where(Manga.created_at < utc_start_dt)
        )).scalar_one()
        prev_total = total_mangas - new_current
        growth_total = ((total_mangas - prev_total) / prev_total * 100) if prev_total > 0 else 100
        growth_new = ((new_current - new_prev) / new_prev * 100) if new_prev > 0 else (100 if new_current > 0 else 0)
        print(f"📚 Total Mangas:        {total_mangas}")
        print(f"   Before this period:  {prev_total}")
        print(f"   Growth:              {growth_total:.1f}%")
        print()
        print(f"🆕 New Mangas (current): {new_current}")
        print(f"   New Mangas (prev):    {new_prev}")
        print(f"   Growth:               {growth_new:.1f}%")
        print()

        # ── 2. ONGOING COUNT ──
        ongoing = (await session.execute(
            select(func.count()).select_from(Manga).where(Manga.status == MangaStatus.ONGOING)
        )).scalar_one()
        print(f"🟢 Ongoing Count: {ongoing}")
        print()

        # ── 3. READ-THROUGH RATE ──
        reads_views = (await session.execute(
            select(func.sum(Manga.total_reads), func.sum(Manga.total_views))
        )).first()
        total_reads = reads_views[0] if reads_views and reads_views[0] else 0
        total_views = reads_views[1] if reads_views and reads_views[1] else 0
        rtr = (total_reads / total_views * 100) if total_views > 0 else 0
        print(f"👁 Total Views:         {total_views}")
        print(f"   Total Reads:         {total_reads}")
        print(f"   Read-Through Rate:   {rtr:.1f}%")
        print()

        # ── 4. STATUS DISTRIBUTION ──
        status_counts = (await session.execute(
            select(Manga.status, func.count(Manga.id)).group_by(Manga.status)
        )).all()
        print(f"📊 Status Distribution:")
        for s, c in status_counts:
            pct = c / total_mangas * 100
            print(f"   {s.value}: {c} ({pct:.1f}%)")
        print()

        # ── 5. REVENUE BY CATEGORY ──
        cat_rev = (await session.execute(
            select(Manga.category, func.sum(func.abs(Transaction.amount)).label("rev"))
            .join(Chapter, Chapter.manga_id == Manga.id)
            .join(Transaction, Transaction.chapter_id == Chapter.id)
            .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
            .where(Transaction.created_at >= utc_start_dt)
            .group_by(Manga.category)
            .order_by(func.sum(func.abs(Transaction.amount)).desc())
        )).all()
        print(f"💰 Revenue by Category (last {days} days):")
        for r in cat_rev:
            print(f"   {r.category.value.upper()}: {int(r.rev)} เหรียญ")
        print()

        # ── 6. TOP FRANCHISES ──
        top = (await session.execute(
            select(
                Manga.title, Manga.total_views, Manga.total_reads,
                func.sum(func.abs(Transaction.amount)).label("rev")
            )
            .join(Chapter, Chapter.manga_id == Manga.id)
            .join(Transaction, Transaction.chapter_id == Chapter.id)
            .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
            .where(Transaction.created_at >= utc_start_dt)
            .group_by(Manga.id)
            .order_by(func.sum(func.abs(Transaction.amount)).desc())
            .limit(5)
        )).all()
        print(f"🏆 Top 5 Franchises:")
        for i, r in enumerate(top, 1):
            print(f"   #{i} {r.title}: {int(r.rev)} coins, {r.total_views} views, {r.total_reads} reads")

asyncio.run(main())
