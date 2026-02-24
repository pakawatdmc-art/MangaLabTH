"""Analytics endpoints."""

from datetime import date, timedelta


from typing import Any
from fastapi import APIRouter
from sqlmodel import select, col
from sqlalchemy import func

from app.api.deps import AdminUser, DBSession
from app.models.analytics import DailyMangaView

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/views")
async def get_views_analytics(
    session: DBSession,
    admin: AdminUser,
    days: int = 30
):
    """Admin: Get view analytics data for the dashboard chart and summary."""
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # Fetch daily aggregated views for the chart
    # Group by view_date
    stmt: Any = (
        select(
            col(DailyMangaView.view_date),
            func.sum(DailyMangaView.view_count).label("total_views")
        )
        .where(DailyMangaView.view_date >= start_date)
        .group_by(col(DailyMangaView.view_date))
        .order_by(col(DailyMangaView.view_date).asc())
    )
    results = (await session.execute(stmt)).all()

    # Fill in missing dates with 0 views so the chart is continuous
    chart_data = []
    current_date = start_date
    results_dict = {row.view_date: row.total_views for row in results}

    while current_date <= today:
        chart_data.append({
            "date": current_date.isoformat(),
            "views": results_dict.get(current_date, 0)
        })
        current_date += timedelta(days=1)

    # Summary metrics (Today, This Week, This Month, This Year)
    # Today
    today_views = results_dict.get(today, 0)

    # This Week (last 7 days including today)
    week_start = today - timedelta(days=6)
    this_week_views = sum(
        v for d, v in results_dict.items() if d >= week_start)

    # This Month (last 30 days)
    month_start = today - timedelta(days=29)
    this_month_views = sum(
        v for d, v in results_dict.items() if d >= month_start)

    # This Year (last 365 days)
    year_start = today - timedelta(days=365)
    year_stmt: Any = select(
        func.coalesce(func.sum(DailyMangaView.view_count), 0)
    ).where(DailyMangaView.view_date >= year_start)
    this_year_views = (await session.execute(year_stmt)).scalar_one()

    return {
        "summary": {
            "today": today_views,
            "this_week": this_week_views,
            "this_month": this_month_views,
            "this_year": this_year_views,
            "all_time": this_year_views,  # simplified if total views required
        },
        "chart_data": chart_data
    }
