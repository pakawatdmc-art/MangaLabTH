"""Cross-check dashboard numbers against raw SQL"""
import asyncio
from datetime import date, datetime, timedelta, timezone

async def main():
    from app.database import async_session_factory
    from sqlmodel import select, col
    from sqlalchemy import func
    from app.models.analytics import DailyMangaView, DailyMangaRead
    from app.models.user import User
    from app.models.manga import Manga

    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()
    start_date = today - timedelta(days=29)  # 30 days
    prev_start_date = start_date - timedelta(days=30)

    thai_start_dt = datetime.combine(start_date, datetime.min.time())
    utc_start_dt = (thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)
    
    prev_thai_start_dt = datetime.combine(prev_start_date, datetime.min.time())
    prev_utc_start_dt = (prev_thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)

    print(f"=== Dashboard Verification (30 days) ===")
    print(f"Thai NOW: {thai_now}")
    print(f"Today: {today}")
    print(f"Current period: {start_date} ~ {today}")
    print(f"Previous period: {prev_start_date} ~ {start_date - timedelta(days=1)}")
    print(f"UTC start for user queries: {utc_start_dt}")
    print()

    async with async_session_factory() as session:
        # ── 1. VIEWS (current period) ──
        views_stmt = (
            select(func.sum(DailyMangaView.view_count))
            .where(DailyMangaView.view_date >= start_date)
            .where(DailyMangaView.view_date <= today)
        )
        total_views = (await session.execute(views_stmt)).scalar_one() or 0
        
        # Views (previous period)
        prev_views_stmt = (
            select(func.sum(DailyMangaView.view_count))
            .where(DailyMangaView.view_date >= prev_start_date)
            .where(DailyMangaView.view_date < start_date)
        )
        prev_views = (await session.execute(prev_views_stmt)).scalar_one() or 0
        
        growth_views = ((total_views - prev_views) / prev_views * 100) if prev_views > 0 else (100 if total_views > 0 else 0)
        print(f"📊 Total Views (current):  {total_views}")
        print(f"   Total Views (prev):     {prev_views}")
        print(f"   Growth:                 {growth_views:.1f}%")
        print()

        # ── 2. READS (current period) ──
        reads_stmt = (
            select(func.sum(DailyMangaRead.read_count))
            .where(DailyMangaRead.read_date >= start_date)
            .where(DailyMangaRead.read_date <= today)
        )
        total_reads = (await session.execute(reads_stmt)).scalar_one() or 0
        
        # Reads (previous period)
        prev_reads_stmt = (
            select(func.sum(DailyMangaRead.read_count))
            .where(DailyMangaRead.read_date >= prev_start_date)
            .where(DailyMangaRead.read_date < start_date)
        )
        prev_reads = (await session.execute(prev_reads_stmt)).scalar_one() or 0
        
        growth_reads = ((total_reads - prev_reads) / prev_reads * 100) if prev_reads > 0 else (100 if total_reads > 0 else 0)
        print(f"📖 Total Reads (current):  {total_reads}")
        print(f"   Total Reads (prev):     {prev_reads}")
        print(f"   Growth:                 {growth_reads:.1f}%")
        print()

        # ── 3. ENGAGEMENT RATE ──
        eng_rate = (total_reads / total_views * 100) if total_views > 0 else 0
        prev_eng_rate = (prev_reads / prev_views * 100) if prev_views > 0 else 0
        eng_growth = ((eng_rate - prev_eng_rate) / prev_eng_rate * 100) if prev_eng_rate > 0 else 0
        print(f"🎯 Engagement Rate (current): {eng_rate:.1f}%")
        print(f"   Engagement Rate (prev):    {prev_eng_rate:.1f}%")
        print(f"   Growth:                    {eng_growth:.1f}%")
        print()

        # ── 4. NEW USERS ──
        new_users = (await session.execute(
            select(func.count()).select_from(User).where(User.created_at >= utc_start_dt)
        )).scalar_one()
        
        prev_new_users = (await session.execute(
            select(func.count()).select_from(User)
            .where(User.created_at >= prev_utc_start_dt)
            .where(User.created_at < utc_start_dt)
        )).scalar_one()
        
        growth_users = ((new_users - prev_new_users) / prev_new_users * 100) if prev_new_users > 0 else (100 if new_users > 0 else 0)
        print(f"👥 New Users (current):    {new_users}")
        print(f"   New Users (prev):       {prev_new_users}")
        print(f"   Growth:                 {growth_users:.1f}%")
        print()

        # ── 5. VIEWS BY CATEGORY ──
        cat_stmt = (
            select(Manga.category, func.sum(DailyMangaView.view_count).label("total_views"))
            .join(DailyMangaView, DailyMangaView.manga_id == Manga.id)
            .where(DailyMangaView.view_date >= start_date)
            .where(DailyMangaView.view_date <= today)
            .group_by(Manga.category)
            .order_by(func.sum(DailyMangaView.view_count).desc())
        )
        cat_results = (await session.execute(cat_stmt)).all()
        print(f"📂 Views by Category:")
        cat_total = sum(r.total_views for r in cat_results)
        for r in cat_results:
            pct = (r.total_views / cat_total * 100) if cat_total > 0 else 0
            print(f"   {r.category.value if r.category else 'Unknown'}: {r.total_views} ({pct:.1f}%)")
        print(f"   TOTAL from categories: {cat_total}")
        print()
        
        # ── 6. TOP TRAFFIC MANGAS ──
        top_stmt = (
            select(Manga.title, func.sum(DailyMangaView.view_count).label("views"))
            .join(DailyMangaView, DailyMangaView.manga_id == Manga.id)
            .where(DailyMangaView.view_date >= start_date)
            .where(DailyMangaView.view_date <= today)
            .group_by(Manga.id)
            .order_by(func.sum(DailyMangaView.view_count).desc())
            .limit(5)
        )
        top_results = (await session.execute(top_stmt)).all()
        print(f"🏆 Top 5 Traffic Drivers:")
        for i, r in enumerate(top_results, 1):
            print(f"   #{i} {r.title}: {r.views} views")
        
        # ── 7. Sample raw daily data (last 7 days) ──
        print()
        print(f"📅 Raw daily data (last 7 days):")
        for d in range(6, -1, -1):
            check_date = today - timedelta(days=d)
            v = (await session.execute(
                select(func.sum(DailyMangaView.view_count))
                .where(DailyMangaView.view_date == check_date)
            )).scalar_one() or 0
            rd = (await session.execute(
                select(func.sum(DailyMangaRead.read_count))
                .where(DailyMangaRead.read_date == check_date)
            )).scalar_one() or 0
            print(f"   {check_date}: views={v}, reads={rd}")

asyncio.run(main())
