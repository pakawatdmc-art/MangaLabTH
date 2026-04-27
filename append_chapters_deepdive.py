with open("backend/app/api/v1/analytics.py", "a") as f:
    f.write("""
@router.get("/chapters-deepdive")
async def get_chapters_deepdive_analytics(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    \"\"\"Admin: Get deep dive chapters analytics for content monetization dashboard.\"\"\"
    from app.models.manga import Manga, Chapter
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

    # 1. Total and Published Chapters
    total_chapters = (await session.execute(select(func.count()).select_from(Chapter))).scalar_one()
    
    new_chapters_current = (await session.execute(
        select(func.count()).select_from(Chapter)
        .where(Chapter.published_at >= utc_start_dt)
    )).scalar_one()
    
    new_chapters_prev = (await session.execute(
        select(func.count()).select_from(Chapter)
        .where(Chapter.published_at >= prev_utc_start_dt)
        .where(Chapter.published_at < utc_start_dt)
    )).scalar_one()

    # 2. Total Unlocks and Coins Burned
    unlocks_current = (await session.execute(
        select(
            func.count(Transaction.id),
            func.sum(func.abs(Transaction.amount))
        )
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.created_at >= utc_start_dt)
    )).first()
    
    total_unlocks = unlocks_current[0] if unlocks_current else 0
    coins_burned = int(unlocks_current[1]) if unlocks_current and unlocks_current[1] else 0
    
    unlocks_prev = (await session.execute(
        select(
            func.count(Transaction.id),
            func.sum(func.abs(Transaction.amount))
        )
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.created_at >= prev_utc_start_dt)
        .where(Transaction.created_at < utc_start_dt)
    )).first()
    
    prev_total_unlocks = unlocks_prev[0] if unlocks_prev else 0
    prev_coins_burned = int(unlocks_prev[1]) if unlocks_prev and unlocks_prev[1] else 0

    # 3. Free vs Paid Chapters
    paid_chapters = (await session.execute(
        select(func.count()).select_from(Chapter).where(Chapter.coin_price > 0)
    )).scalar_one()
    free_chapters = (await session.execute(
        select(func.count()).select_from(Chapter).where(Chapter.coin_price == 0)
    )).scalar_one()

    # 4. Unlock Trend (Daily Coins Burned and Unlocks)
    unlocks_list = (await session.execute(
        select(Transaction.created_at, Transaction.amount)
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.created_at >= prev_utc_start_dt)
    )).all()
    
    trend_dict = {}
    for row in unlocks_list:
        local_dt = row.created_at + timedelta(hours=7)
        d = local_dt.date()
        if start_date <= d <= today:
            if d not in trend_dict:
                trend_dict[d] = {"unlocks": 0, "coins": 0}
            trend_dict[d]["unlocks"] += 1
            trend_dict[d]["coins"] += abs(row.amount)
            
    unlock_trend = []
    current_date = start_date
    while current_date <= today:
        unlock_trend.append({
            "date": current_date.isoformat(),
            "unlocks": trend_dict.get(current_date, {}).get("unlocks", 0),
            "coins_burned": trend_dict.get(current_date, {}).get("coins", 0),
        })
        current_date += timedelta(days=1)

    # 5. Top Grossing Chapters
    top_grossing_stmt = (
        select(
            Chapter.manga_id,
            Manga.title.label("manga_title"),
            Chapter.number.label("chapter_number"),
            func.count(Transaction.id).label("unlocks"),
            func.sum(func.abs(Transaction.amount)).label("coins_earned")
        )
        .join(Transaction, Transaction.chapter_id == Chapter.id)
        .join(Manga, Manga.id == Chapter.manga_id)
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.created_at >= utc_start_dt)
        .group_by(Chapter.id, Manga.id)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .limit(10)
    )
    top_grossing_results = (await session.execute(top_grossing_stmt)).all()
    
    top_chapters = [
        {
            "manga_title": r.manga_title,
            "chapter_number": float(r.chapter_number),
            "unlocks": int(r.unlocks),
            "coins_earned": int(r.coins_earned)
        }
        for r in top_grossing_results
    ]

    return {
        "summary": {
            "total_chapters": total_chapters,
            "new_chapters": new_chapters_current,
            "total_unlocks": total_unlocks,
            "coins_burned": coins_burned,
        },
        "previous_summary": {
            "total_chapters": total_chapters - new_chapters_current, # Approximated
            "new_chapters": new_chapters_prev,
            "total_unlocks": prev_total_unlocks,
            "coins_burned": prev_coins_burned,
        },
        "segments": {
            "paid_chapters": paid_chapters,
            "free_chapters": free_chapters,
        },
        "unlock_trend": unlock_trend,
        "top_chapters": top_chapters,
    }
""")
