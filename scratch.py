import re

with open("backend/app/api/v1/analytics.py", "r") as f:
    content = f.read()

# The function to replace is get_marketing_dashboard which goes from line 17 to line 202
# Let's use regex to find the function and replace it.

pattern = re.compile(r'@router\.get\("/overview"\).*?def get_marketing_dashboard.*?return \{.*?"top_viewed_mangas": top_viewed_mangas,\n    \}', re.DOTALL)

new_func = """@router.get("/overview")
async def get_traffic_dashboard(
    session: DBSession,
    admin: AdminUser,
    days: int = Query(30, ge=1, le=365)
):
    \"\"\"Admin: Get comprehensive traffic & engagement dashboard analytics.\"\"\"
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
        .limit(10)
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
    }"""

if not pattern.search(content):
    print("Pattern not found!")
else:
    new_content = pattern.sub(new_func, content)
    with open("backend/app/api/v1/analytics.py", "w") as f:
        f.write(new_content)
    print("Replaced successfully!")
