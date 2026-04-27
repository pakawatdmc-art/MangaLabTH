with open("backend/app/api/v1/analytics.py", "a") as f:
    f.write("""
@router.get("/mangas-deepdive")
async def get_mangas_deepdive_analytics(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    \"\"\"Admin: Get deep dive mangas analytics for content portfolio management.\"\"\"
    from app.models.manga import Manga, Chapter, MangaStatus
    from app.models.transaction import Transaction, TransactionType
    from sqlalchemy import func
    from datetime import datetime, timedelta, timezone

    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()
    start_date = today - timedelta(days=days - 1)
    prev_start_date = start_date - timedelta(days=days)
    
    thai_start_dt = datetime.combine(start_date, datetime.min.time())
    utc_start_dt = (thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)
    
    prev_thai_start_dt = datetime.combine(prev_start_date, datetime.min.time())
    prev_utc_start_dt = (prev_thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)

    # 1. KPI Summaries
    total_mangas = (await session.execute(select(func.count()).select_from(Manga))).scalar_one()
    
    new_mangas_current = (await session.execute(
        select(func.count()).select_from(Manga)
        .where(Manga.created_at >= utc_start_dt)
    )).scalar_one()
    
    new_mangas_prev = (await session.execute(
        select(func.count()).select_from(Manga)
        .where(Manga.created_at >= prev_utc_start_dt)
        .where(Manga.created_at < utc_start_dt)
    )).scalar_one()

    ongoing_count = (await session.execute(
        select(func.count()).select_from(Manga).where(Manga.status == MangaStatus.ONGOING)
    )).scalar_one()

    # Read-through rate
    reads_views = (await session.execute(
        select(func.sum(Manga.total_reads), func.sum(Manga.total_views))
    )).first()
    
    total_reads = reads_views[0] if reads_views and reads_views[0] else 0
    total_views = reads_views[1] if reads_views and reads_views[1] else 0
    read_through_rate = (total_reads / total_views * 100) if total_views > 0 else 0

    # 2. Status Distribution
    status_counts = (await session.execute(
        select(Manga.status, func.count(Manga.id))
        .group_by(Manga.status)
    )).all()
    
    status_dict = {
        "ongoing": 0,
        "completed": 0,
        "hiatus": 0,
        "dropped": 0
    }
    for s, c in status_counts:
        status_dict[s.value] = c

    # 3. Revenue by Category
    category_revenue_stmt = (
        select(
            Manga.category,
            func.sum(func.abs(Transaction.amount)).label("revenue")
        )
        .join(Chapter, Chapter.manga_id == Manga.id)
        .join(Transaction, Transaction.chapter_id == Chapter.id)
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.created_at >= utc_start_dt)
        .group_by(Manga.category)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
    )
    category_revenue_results = (await session.execute(category_revenue_stmt)).all()
    
    revenue_by_category = [
        {"category": r.category.value, "revenue": int(r.revenue)}
        for r in category_revenue_results
    ]

    # 4. Top Franchises
    top_franchises_stmt = (
        select(
            Manga.id,
            Manga.title,
            Manga.total_views,
            Manga.total_reads,
            func.sum(func.abs(Transaction.amount)).label("revenue")
        )
        .join(Chapter, Chapter.manga_id == Manga.id)
        .join(Transaction, Transaction.chapter_id == Chapter.id)
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.created_at >= utc_start_dt)
        .group_by(Manga.id)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .limit(10)
    )
    top_franchises_results = (await session.execute(top_franchises_stmt)).all()
    
    top_franchises = [
        {
            "id": r.id,
            "title": r.title,
            "views": int(r.total_views),
            "reads": int(r.total_reads),
            "revenue": int(r.revenue)
        }
        for r in top_franchises_results
    ]

    return {
        "summary": {
            "total_mangas": total_mangas,
            "new_mangas": new_mangas_current,
            "ongoing_mangas": ongoing_count,
            "read_through_rate": read_through_rate,
        },
        "previous_summary": {
            "total_mangas": total_mangas - new_mangas_current,
            "new_mangas": new_mangas_prev,
            "ongoing_mangas": ongoing_count, # Approx
            "read_through_rate": read_through_rate, # Approx
        },
        "status_distribution": status_dict,
        "revenue_by_category": revenue_by_category,
        "top_franchises": top_franchises,
    }
""")
