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
async def get_traffic_dashboard(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    """Admin: Get comprehensive traffic & engagement dashboard analytics."""
    from app.models.manga import Manga
    from app.models.analytics import DailyMangaView, DailyMangaRead
    from app.models.user import User
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

    # 2. System Totals (Users)
    user_count = (await session.execute(select(func.count()).select_from(User))).scalar_one()
    # Users created before this period
    prev_user_count = (await session.execute(select(func.count()).select_from(User).where(User.created_at < utc_start_dt))).scalar_one()

    # New users in current and previous periods
    new_users_current = (await session.execute(
        select(func.count()).select_from(User)
        .where(User.created_at >= utc_start_dt)
    )).scalar_one()
    
    new_users_prev = (await session.execute(
        select(func.count()).select_from(User)
        .where(User.created_at >= prev_utc_start_dt)
        .where(User.created_at < utc_start_dt)
    )).scalar_one()

    # 3. View & Read Chart Data & Summaries
    # Views
    view_stmt = (
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

    # Reads
    read_stmt = (
        select(
            col(DailyMangaRead.read_date),
            func.sum(DailyMangaRead.read_count).label("total_reads")
        )
        .where(DailyMangaRead.read_date >= prev_start_date)
        .group_by(col(DailyMangaRead.read_date))
    )
    read_results = (await session.execute(read_stmt)).all()

    reads_dict = {}
    current_period_reads = 0
    prev_period_reads = 0
    for row in read_results:
        d = row.read_date
        r = row.total_reads
        if start_date <= d <= today:
            reads_dict[d] = r
            current_period_reads += r
        elif prev_start_date <= d < start_date:
            prev_period_reads += r

    # Construct complete chart data series filling missing dates with zero
    chart_data = []
    current_date = start_date
    while current_date <= today:
        chart_data.append({
            "date": current_date.isoformat(),
            "views": views_dict.get(current_date, 0),
            "reads": reads_dict.get(current_date, 0),
        })
        current_date += timedelta(days=1)

    # 4. Views by Category (Current Period)
    category_stmt = (
        select(
            Manga.category,
            func.sum(DailyMangaView.view_count).label("total_views")
        )
        .join(DailyMangaView, DailyMangaView.manga_id == Manga.id)
        .where(DailyMangaView.view_date >= start_date)
        .where(DailyMangaView.view_date <= today)
        .group_by(Manga.category)
        .order_by(func.sum(DailyMangaView.view_count).desc())
    )
    category_results = (await session.execute(category_stmt)).all()
    views_by_category = [
        {"category": r.category.value if r.category else "Unknown", "views": int(r.total_views)}
        for r in category_results
    ]

    # 5. Top Traffic Drivers (Top Viewed Manga - Current Period)
    top_viewed_stmt = (
        select(
            Manga.id, 
            Manga.title, 
            Manga.slug, 
            Manga.cover_url,
            func.sum(DailyMangaView.view_count).label("period_views")
        )
        .join(DailyMangaView, DailyMangaView.manga_id == Manga.id)
        .where(DailyMangaView.view_date >= start_date)
        .where(DailyMangaView.view_date <= today)
        .group_by(Manga.id)
        .order_by(func.sum(DailyMangaView.view_count).desc())
        .limit(50)
    )
    top_viewed_results = (await session.execute(top_viewed_stmt)).all()
    
    # Get period reads for these top 10 mangas to calculate engagement rate per manga
    top_manga_ids = [r.id for r in top_viewed_results]
    reads_by_manga = {}
    if top_manga_ids:
        manga_reads_stmt = (
            select(DailyMangaRead.manga_id, func.sum(DailyMangaRead.read_count).label("period_reads"))
            .where(DailyMangaRead.manga_id.in_(top_manga_ids))
            .where(DailyMangaRead.read_date >= start_date)
            .where(DailyMangaRead.read_date <= today)
            .group_by(DailyMangaRead.manga_id)
        )
        manga_reads_results = (await session.execute(manga_reads_stmt)).all()
        reads_by_manga = {r.manga_id: int(r.period_reads) for r in manga_reads_results}

    top_traffic_mangas = [
        {
            "id": m.id,
            "title": m.title,
            "slug": m.slug,
            "cover_image": m.cover_url,
            "views": int(m.period_views),
            "reads": reads_by_manga.get(m.id, 0)
        }
        for m in top_viewed_results
    ]

    return {
        "summary": {
            "total_views": current_period_views,
            "total_reads": current_period_reads,
            "new_users": new_users_current,
            "total_users": user_count,
        },
        "previous_summary": {
            "total_views": prev_period_views,
            "total_reads": prev_period_reads,
            "new_users": new_users_prev,
            "total_users": prev_user_count,
        },
        "views_by_category": views_by_category,
        "chart_data": chart_data,
        "top_traffic_mangas": top_traffic_mangas,
    }


@router.get("/coin-deepdive")
async def get_coin_deepdive_analytics(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    """Admin: Get deep dive marketing analytics for coin economy."""
    from app.models.manga import Manga, Chapter
    from app.models.transaction import Transaction, TransactionType
    from app.models.user import User
    from datetime import timezone

    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()
    start_date = today - timedelta(days=days - 1)
    prev_start_date = start_date - timedelta(days=days)
    
    thai_start_dt = datetime.combine(start_date, datetime.min.time())
    utc_start_dt = (thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)
    
    prev_thai_start_dt = datetime.combine(prev_start_date, datetime.min.time())
    prev_utc_start_dt = (prev_thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)

    # 1. ARPPU and Conversion
    from app.models.transaction import CoinPackage
    
    user_count = (await session.execute(select(func.count()).select_from(User))).scalar_one()
    
    paid_users_stmt = select(func.count(func.distinct(Transaction.user_id))).where(
        Transaction.type == TransactionType.COIN_PURCHASE,
        Transaction.amount > 0,  # Only fulfilled purchases
    )
    paid_users_count = (await session.execute(paid_users_stmt)).scalar_one() or 0

    # ARPPU in COINS: average coins received per paid user (includes bonuses)
    total_coins_earned_stmt = select(func.sum(Transaction.amount)).where(
        Transaction.type == TransactionType.COIN_PURCHASE,
        Transaction.amount > 0,  # Only fulfilled
    )
    total_coins_earned = (await session.execute(total_coins_earned_stmt)).scalar_one() or 0

    arppu = (total_coins_earned / paid_users_count) if paid_users_count > 0 else 0
    conversion_rate = (paid_users_count / user_count * 100) if user_count > 0 else 0

    # 2. Package Popularity (grouped by actual package name + price)
    package_stmt = (
        select(
            CoinPackage.name.label("package_name"),
            CoinPackage.price_thb,
            CoinPackage.coins,
            func.count(Transaction.id).label("count")
        )
        .join(CoinPackage, Transaction.package_id == CoinPackage.id)
        .where(Transaction.type == TransactionType.COIN_PURCHASE)
        .where(Transaction.amount > 0)  # Only fulfilled
        .where(Transaction.created_at >= utc_start_dt)
        .group_by(CoinPackage.id, CoinPackage.name, CoinPackage.price_thb, CoinPackage.coins)
        .order_by(CoinPackage.price_thb.asc())
    )
    package_results = (await session.execute(package_stmt)).all()
    package_popularity = [
        {"name": r.package_name, "price_thb": int(r.price_thb), "coins": int(r.coins), "count": r.count}
        for r in package_results
    ]

    # 3. Top Grossing Chapters
    top_chapters_stmt = (
        select(
            Chapter.id,
            Chapter.number.label("chapter_number"),
            Manga.title.label("manga_title"),
            Manga.slug.label("manga_slug"),
            func.sum(func.abs(Transaction.amount)).label("coins_earned")
        )
        .join(Chapter, Transaction.chapter_id == Chapter.id)
        .join(Manga, Chapter.manga_id == Manga.id)
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.amount < 0)
        .where(Transaction.created_at >= utc_start_dt)
        .group_by(Chapter.id, Manga.title, Manga.slug)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .limit(50)
    )
    top_chapters_results = (await session.execute(top_chapters_stmt)).all()
    top_grossing_chapters = [
        {
            "chapter_id": r.id,
            "chapter_number": r.chapter_number,
            "manga_title": r.manga_title,
            "manga_slug": r.manga_slug,
            "coins_earned": r.coins_earned
        }
        for r in top_chapters_results
    ]

    # 4. Top Spenders (Whales)
    top_spenders_stmt = (
        select(
            User.id,
            User.display_name,
            User.username,
            User.email,
            func.sum(Transaction.amount).label("total_spent")
        )
        .join(User, Transaction.user_id == User.id)
        .where(Transaction.type == TransactionType.COIN_PURCHASE)
        .where(Transaction.amount > 0)
        .where(Transaction.created_at >= utc_start_dt)
        .group_by(User.id, User.display_name, User.username, User.email)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(50)
    )
    top_spenders_results = (await session.execute(top_spenders_stmt)).all()
    
    def mask_email(email: str) -> str:
        if not email or "@" not in email:
            return "Hidden User"
        name, domain = email.split("@", 1)
        if len(name) <= 2:
            return f"**@{domain}"
        return f"{name[:2]}***@{domain}"

    top_spenders = [
        {
            "user_id": r.id,
            "display_name": r.display_name or r.username or mask_email(r.email),
            "total_spent": r.total_spent
        }
        for r in top_spenders_results
    ]

    # 5. Coin Trend (Daily Purchased vs Burned)
    all_transactions = (await session.execute(
        select(Transaction.created_at, Transaction.amount, Transaction.type)
        .where(Transaction.type.in_([TransactionType.COIN_PURCHASE, TransactionType.CHAPTER_UNLOCK]))
        .where(Transaction.created_at >= utc_start_dt)
    )).all()

    trend_dict: dict = {}
    total_earned_period = 0
    total_burned_period = 0
    for row in all_transactions:
        local_dt = row.created_at + timedelta(hours=7)
        d = local_dt.date()
        if start_date <= d <= today:
            if d not in trend_dict:
                trend_dict[d] = {"purchased": 0, "burned": 0}
            if row.type == TransactionType.COIN_PURCHASE and row.amount > 0:
                trend_dict[d]["purchased"] += row.amount
                total_earned_period += row.amount
            elif row.type == TransactionType.CHAPTER_UNLOCK and row.amount < 0:
                trend_dict[d]["burned"] += abs(row.amount)
                total_burned_period += abs(row.amount)

    coin_trend = []
    current_date = start_date
    while current_date <= today:
        coin_trend.append({
            "date": current_date.isoformat(),
            "coins_purchased": trend_dict.get(current_date, {}).get("purchased", 0),
            "coins_burned": trend_dict.get(current_date, {}).get("burned", 0),
        })
        current_date += timedelta(days=1)

    # Previous period totals for growth badges
    prev_transactions = (await session.execute(
        select(Transaction.amount, Transaction.type)
        .where(Transaction.type.in_([TransactionType.COIN_PURCHASE, TransactionType.CHAPTER_UNLOCK]))
        .where(Transaction.created_at >= prev_utc_start_dt)
        .where(Transaction.created_at < utc_start_dt)
    )).all()

    prev_earned = sum(r.amount for r in prev_transactions if r.type == TransactionType.COIN_PURCHASE and r.amount > 0)
    prev_burned = sum(abs(r.amount) for r in prev_transactions if r.type == TransactionType.CHAPTER_UNLOCK and r.amount < 0)

    return {
        "arppu": arppu,
        "conversion_rate": conversion_rate,
        "total_earned": total_earned_period,
        "total_burned": total_burned_period,
        "prev_earned": prev_earned,
        "prev_burned": prev_burned,
        "coin_trend": coin_trend,
        "package_popularity": package_popularity,
        "top_grossing_chapters": top_grossing_chapters,
        "top_spenders": top_spenders
    }

@router.get("/users-deepdive")
async def get_users_deepdive_analytics(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    """Admin: Get deep dive user analytics for marketing dashboard."""
    from app.models.user import User
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

    # 1. Total and New Users
    total_users = (await session.execute(select(func.count()).select_from(User))).scalar_one()
    
    new_users_current = (await session.execute(
        select(func.count()).select_from(User)
        .where(User.created_at >= utc_start_dt)
    )).scalar_one()
    
    new_users_prev = (await session.execute(
        select(func.count()).select_from(User)
        .where(User.created_at >= prev_utc_start_dt)
        .where(User.created_at < utc_start_dt)
    )).scalar_one()

    # 2. Paid vs Free Ratio
    paid_users_count = (await session.execute(
        select(func.count(func.distinct(Transaction.user_id)))
        .where(Transaction.type == TransactionType.COIN_PURCHASE)
    )).scalar_one() or 0
    free_users_count = max(0, total_users - paid_users_count)

    # 3. Active Spenders (Users who spent coins in the period)
    active_spenders_current = (await session.execute(
        select(func.count(func.distinct(Transaction.user_id)))
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.created_at >= utc_start_dt)
    )).scalar_one() or 0
    
    active_spenders_prev = (await session.execute(
        select(func.count(func.distinct(Transaction.user_id)))
        .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
        .where(Transaction.created_at >= prev_utc_start_dt)
        .where(Transaction.created_at < utc_start_dt)
    )).scalar_one() or 0

    # 4. Registration Trend (Daily New Users)
    new_users_list = (await session.execute(
        select(User.created_at)
        .where(User.created_at >= prev_utc_start_dt)
    )).all()
    
    reg_dict = {}
    prev_reg_dict = {}
    for row in new_users_list:
        local_dt = row.created_at + timedelta(hours=7)
        d = local_dt.date()
        if start_date <= d <= today:
            reg_dict[d] = reg_dict.get(d, 0) + 1
        elif prev_start_date <= d < start_date:
            prev_reg_dict[d] = prev_reg_dict.get(d, 0) + 1
            
    registration_trend = []
    current_date = start_date
    while current_date <= today:
        registration_trend.append({
            "date": current_date.isoformat(),
            "new_users": reg_dict.get(current_date, 0),
        })
        current_date += timedelta(days=1)

    # 5. Wealth Distribution (Coin Balance Tiers)
    # Using python to categorize since there's no easy case statement that is cross-db safe without verbosity
    all_balances = (await session.execute(select(User.coin_balance))).all()
    tier_0 = 0 # 0 coins
    tier_1 = 0 # 1-50 coins
    tier_2 = 0 # 51-500 coins
    tier_3 = 0 # 500+ coins (Whales)
    
    for row in all_balances:
        bal = row.coin_balance
        if bal == 0:
            tier_0 += 1
        elif bal <= 50:
            tier_1 += 1
        elif bal <= 500:
            tier_2 += 1
        else:
            tier_3 += 1
            
    wealth_distribution = [
        {"tier": "ไม่มีเหรียญ (0)", "count": tier_0},
        {"tier": "น้อย (1-50)", "count": tier_1},
        {"tier": "ปานกลาง (51-500)", "count": tier_2},
        {"tier": "เศรษฐี (500+)", "count": tier_3},
    ]

    # 6. Top Coin Holders (Leaderboard)
    top_holders_stmt = (
        select(User.id, User.display_name, User.username, User.email, User.coin_balance, User.created_at)
        .order_by(User.coin_balance.desc())
        .limit(50)
    )
    top_holders_results = (await session.execute(top_holders_stmt)).all()
    
    def mask_email(email: str) -> str:
        if not email or "@" not in email:
            return "Hidden User"
        name, domain = email.split("@", 1)
        if len(name) <= 2:
            return f"**@{domain}"
        return f"{name[:2]}***@{domain}"

    top_coin_holders = [
        {
            "id": u.id,
            "display_name": u.display_name or u.username or mask_email(u.email),
            "coin_balance": u.coin_balance,
            "created_at": (u.created_at + timedelta(hours=7)).isoformat()
        }
        for u in top_holders_results
    ]

    return {
        "summary": {
            "total_users": total_users,
            "new_users": new_users_current,
            "active_spenders": active_spenders_current,
        },
        "previous_summary": {
            "total_users": total_users - new_users_current, # Approximated
            "new_users": new_users_prev,
            "active_spenders": active_spenders_prev,
        },
        "segments": {
            "paid_users": paid_users_count,
            "free_users": free_users_count,
        },
        "registration_trend": registration_trend,
        "wealth_distribution": wealth_distribution,
        "top_coin_holders": top_coin_holders,
    }

@router.get("/chapters-deepdive")
async def get_chapters_deepdive_analytics(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    """Admin: Get deep dive chapters analytics for content monetization dashboard."""
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
        .limit(50)
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

@router.get("/mangas-deepdive")
async def get_mangas_deepdive_analytics(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    """Admin: Get deep dive mangas analytics for content portfolio management."""
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
        .limit(50)
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
