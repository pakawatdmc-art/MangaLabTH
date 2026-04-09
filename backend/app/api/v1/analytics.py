"""Analytics endpoints."""

from datetime import date, datetime, timedelta


from typing import Any
from fastapi import APIRouter, Query
from sqlmodel import select, col
from sqlalchemy import func

from app.api.deps import AdminUser, DBSession
from app.models.analytics import DailyMangaView

router = APIRouter(prefix="/admin-stats", tags=["Admin Statistics"])


@router.get("/overview")
async def get_marketing_dashboard(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    """Admin: Get comprehensive marketing dashboard analytics."""
    from app.models.manga import Manga, Chapter
    from app.models.transaction import Transaction, TransactionType
    from app.models.user import User
    from sqlalchemy import case
    from datetime import timezone

    # 1. Calculate Time Ranges accurately in Thai Time (UTC+7)
    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()
    start_date = today - timedelta(days=days - 1)
    
    # Previous period for Growth Metrics
    prev_start_date = start_date - timedelta(days=days)
    
    # Start of start_date & prev_start_date in Thai time, converted back to UTC for DB querying
    thai_start_dt = datetime.combine(start_date, datetime.min.time())
    utc_start_dt = (thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)
    
    prev_thai_start_dt = datetime.combine(prev_start_date, datetime.min.time())
    prev_utc_start_dt = (prev_thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)

    # 2. System Totals & Segmentation (Users & Views)
    user_count = (await session.execute(select(func.count()).select_from(User))).scalar_one()
    # Users created before this period (for growth calculation)
    prev_user_count = (await session.execute(select(func.count()).select_from(User).where(User.created_at < utc_start_dt))).scalar_one()
    
    paid_users_stmt = select(func.count(func.distinct(Transaction.user_id))).where(Transaction.type == TransactionType.COIN_PURCHASE)
    paid_users_count = (await session.execute(paid_users_stmt)).scalar_one() or 0
    free_users_count = max(0, user_count - paid_users_count)

    # Note: total_views is all-time. We will use view queries for period-specific views.
    total_views_all_time = (await session.execute(select(func.coalesce(func.sum(Manga.total_views), 0)))).scalar_one()

    # 3. Time-bound Transactions for Chart & Summaries (Current + Previous Period)
    tx_stmt: Any = (
        select(Transaction.created_at, Transaction.type, Transaction.amount)
        .where(Transaction.created_at >= prev_utc_start_dt)
    )
    tx_results = (await session.execute(tx_stmt)).all()
    
    tx_dict = {}
    coins_earned_30d = 0
    coins_spent_30d = 0
    prev_coins_earned = 0
    prev_coins_spent = 0

    for row in tx_results:
        # row.created_at is UTC. Convert to Thai Time (UTC+7)
        local_dt = row.created_at + timedelta(hours=7)
        d = local_dt.date()
        
        # Current Period
        if start_date <= d <= today:
            if d not in tx_dict:
                tx_dict[d] = {"coins_purchased": 0, "coins_spent": 0}
                
            if row.type == TransactionType.COIN_PURCHASE:
                amount = int(row.amount)
                tx_dict[d]["coins_purchased"] += amount
                coins_earned_30d += amount
            elif row.type == TransactionType.CHAPTER_UNLOCK:
                amount = abs(int(row.amount))
                tx_dict[d]["coins_spent"] += amount
                coins_spent_30d += amount
                
        # Previous Period
        elif prev_start_date <= d < start_date:
            if row.type == TransactionType.COIN_PURCHASE:
                prev_coins_earned += int(row.amount)
            elif row.type == TransactionType.CHAPTER_UNLOCK:
                prev_coins_spent += abs(int(row.amount))

    # 4. View Chart Data & Summaries
    view_stmt: Any = (
        select(
            col(DailyMangaView.view_date),
            func.sum(DailyMangaView.view_count).label("total_views")
        )
        .where(DailyMangaView.view_date >= prev_start_date)
        .group_by(col(DailyMangaView.view_date))
    )
    view_results = (await session.execute(view_stmt)).all()
    
    views_dict = {}
    current_period_views = 0
    prev_period_views = 0
    
    for row in view_results:
        d = row.view_date
        v = row.total_views
        if start_date <= d <= today:
            views_dict[d] = v
            current_period_views += v
        elif prev_start_date <= d < start_date:
            prev_period_views += v

    # Construct complete chart data series filling missing dates with zero
    chart_data = []
    current_date = start_date
    while current_date <= today:
        tx_stats = tx_dict.get(current_date, {"coins_purchased": 0, "coins_spent": 0})
        chart_data.append({
            "date": current_date.isoformat(),
            "views": views_dict.get(current_date, 0),
            "coins_purchased": tx_stats["coins_purchased"],
            "coins_spent": tx_stats["coins_spent"],
        })
        current_date += timedelta(days=1)

    # 5. Top Grossing Manga (Filtered by current time range)
    top_grossing_stmt: Any = (
        select(
            Manga.id,
            Manga.title,
            Manga.slug,
            Manga.cover_url,
            func.sum(func.abs(Transaction.amount)).label("coins_earned")
        )
        .join(Chapter, Transaction.chapter_id == Chapter.id)
        .join(Manga, Chapter.manga_id == Manga.id)
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.amount < 0) # Safety check
        .where(Transaction.created_at >= utc_start_dt)
        .group_by(Manga.id)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .limit(5)
    )
    top_grossing_results = (await session.execute(top_grossing_stmt)).all()
    top_grossing_mangas = [
        {
            "id": r.id,
            "title": r.title,
            "slug": r.slug,
            "cover_image": r.cover_url,
            "coins_earned": r.coins_earned
        }
        for r in top_grossing_results
    ]

    # 6. Top Viewed Manga
    top_viewed_stmt: Any = (
        select(Manga.id, Manga.title, Manga.slug, Manga.cover_url, Manga.total_views)
        .order_by(Manga.total_views.desc())
        .limit(5)
    )
    top_viewed_results = (await session.execute(top_viewed_stmt)).all()
    top_viewed_mangas = [
        {
            "id": m.id,
            "title": m.title,
            "slug": m.slug,
            "cover_image": m.cover_url,
            "total_views": m.total_views
        }
        for m in top_viewed_results
    ]

    return {
        "summary": {
            "total_views": current_period_views, # period specific views instead of all-time
            "total_users": user_count,
            "coins_earned_30d": coins_earned_30d,
            "coins_spent_30d": coins_spent_30d,
        },
        "previous_summary": {
            "total_views": prev_period_views,
            "total_users": prev_user_count,
            "coins_earned_30d": prev_coins_earned,
            "coins_spent_30d": prev_coins_spent,
        },
        "user_segments": {
            "paid_users": paid_users_count,
            "free_users": free_users_count,
        },
        "chart_data": chart_data,
        "top_grossing_mangas": top_grossing_mangas,
        "top_viewed_mangas": top_viewed_mangas,
    }
