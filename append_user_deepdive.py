with open("backend/app/api/v1/analytics.py", "a") as f:
    f.write("""
@router.get("/users-deepdive")
async def get_users_deepdive_analytics(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    \"\"\"Admin: Get deep dive user analytics for marketing dashboard.\"\"\"
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
        .limit(10)
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
""")
