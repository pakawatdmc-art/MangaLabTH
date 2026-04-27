"""Cross-check User Analytics Dashboard numbers against raw SQL"""
import asyncio
from datetime import date, datetime, timedelta, timezone

async def main():
    from app.database import async_session_factory
    from sqlmodel import select, col
    from sqlalchemy import func
    from app.models.user import User
    from app.models.transaction import Transaction, TransactionType

    thai_now = datetime.now(timezone.utc) + timedelta(hours=7)
    today = thai_now.date()
    start_date = today - timedelta(days=29)  # 30 days
    prev_start_date = start_date - timedelta(days=30)

    thai_start_dt = datetime.combine(start_date, datetime.min.time())
    utc_start_dt = (thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)
    
    prev_thai_start_dt = datetime.combine(prev_start_date, datetime.min.time())
    prev_utc_start_dt = (prev_thai_start_dt - timedelta(hours=7)).replace(tzinfo=None)

    print(f"=== User Dashboard Verification (30 days) ===")
    print(f"Thai NOW: {thai_now}")
    print(f"Today: {today}")
    print(f"Current period: {start_date} ~ {today}")
    print(f"Previous period: {prev_start_date} ~ {start_date - timedelta(days=1)}")
    print()

    async with async_session_factory() as session:
        # ── 1. TOTAL USERS ──
        total_users = (await session.execute(select(func.count()).select_from(User))).scalar_one()
        prev_total = (await session.execute(
            select(func.count()).select_from(User).where(User.created_at < utc_start_dt)
        )).scalar_one()
        growth_total = ((total_users - prev_total) / prev_total * 100) if prev_total > 0 else 100
        print(f"👥 Total Users:       {total_users}")
        print(f"   Before this period: {prev_total}")
        print(f"   Growth:            {growth_total:.1f}%")
        print()

        # ── 2. NEW USERS (current period) ──
        new_users = (await session.execute(
            select(func.count()).select_from(User).where(User.created_at >= utc_start_dt)
        )).scalar_one()
        prev_new = (await session.execute(
            select(func.count()).select_from(User)
            .where(User.created_at >= prev_utc_start_dt)
            .where(User.created_at < utc_start_dt)
        )).scalar_one()
        growth_new = ((new_users - prev_new) / prev_new * 100) if prev_new > 0 else 100
        print(f"🆕 New Users (current):  {new_users}")
        print(f"   New Users (prev):     {prev_new}")
        print(f"   Growth:               {growth_new:.1f}%")
        print()

        # ── 3. PAID vs FREE ──
        paid_users = (await session.execute(
            select(func.count(func.distinct(Transaction.user_id)))
            .where(Transaction.type == TransactionType.COIN_PURCHASE)
        )).scalar_one() or 0
        free_users = max(0, total_users - paid_users)
        paid_ratio = (paid_users / total_users * 100) if total_users > 0 else 0
        print(f"💰 Paid Users:        {paid_users}")
        print(f"   Free Users:        {free_users}")
        print(f"   Paid Ratio:        {paid_ratio:.1f}%")
        print()

        # ── 4. ACTIVE SPENDERS ──
        active_current = (await session.execute(
            select(func.count(func.distinct(Transaction.user_id)))
            .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
            .where(Transaction.created_at >= utc_start_dt)
        )).scalar_one() or 0
        active_prev = (await session.execute(
            select(func.count(func.distinct(Transaction.user_id)))
            .where(Transaction.type == TransactionType.CHAPTER_UNLOCK)
            .where(Transaction.created_at >= prev_utc_start_dt)
            .where(Transaction.created_at < utc_start_dt)
        )).scalar_one() or 0
        growth_active = ((active_current - active_prev) / active_prev * 100) if active_prev > 0 else 100
        print(f"🛒 Active Spenders (current): {active_current}")
        print(f"   Active Spenders (prev):    {active_prev}")
        print(f"   Growth:                    {growth_active:.1f}%")
        print()

        # ── 5. WEALTH DISTRIBUTION ──
        all_balances = (await session.execute(select(User.coin_balance))).all()
        tier_0, tier_1, tier_2, tier_3 = 0, 0, 0, 0
        for row in all_balances:
            bal = row.coin_balance
            if bal == 0: tier_0 += 1
            elif bal <= 50: tier_1 += 1
            elif bal <= 500: tier_2 += 1
            else: tier_3 += 1
        print(f"📊 Wealth Distribution:")
        print(f"   ไม่มีเหรียญ (0):     {tier_0} ({tier_0/total_users*100:.1f}%)")
        print(f"   น้อย (1-50):          {tier_1} ({tier_1/total_users*100:.1f}%)")
        print(f"   ปานกลาง (51-500):     {tier_2} ({tier_2/total_users*100:.1f}%)")
        print(f"   เศรษฐี (500+):        {tier_3} ({tier_3/total_users*100:.1f}%)")
        print(f"   SUM:                  {tier_0+tier_1+tier_2+tier_3}")
        print()

        # ── 6. TOP COIN HOLDERS ──
        top_stmt = (
            select(User.display_name, User.username, User.email, User.coin_balance)
            .order_by(User.coin_balance.desc())
            .limit(5)
        )
        top_results = (await session.execute(top_stmt)).all()
        print(f"🏆 Top 5 Coin Holders:")
        for i, u in enumerate(top_results, 1):
            name = u.display_name or u.username or u.email[:10]+"..."
            print(f"   #{i} {name}: {u.coin_balance} coins")

        # ── 7. REGISTRATION TREND (last 7 days) ──
        print()
        print(f"📅 Registration per day (last 7 days):")
        for d in range(6, -1, -1):
            check_date = today - timedelta(days=d)
            utc_day_start = datetime.combine(check_date, datetime.min.time()) - timedelta(hours=7)
            utc_day_end = utc_day_start + timedelta(days=1)
            cnt = (await session.execute(
                select(func.count()).select_from(User)
                .where(User.created_at >= utc_day_start.replace(tzinfo=None))
                .where(User.created_at < utc_day_end.replace(tzinfo=None))
            )).scalar_one()
            print(f"   {check_date}: {cnt} new users")

asyncio.run(main())
