"""Settings endpoints — global theme management."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import AdminUser, DBSession
from app.models.setting import SystemSetting

router = APIRouter(prefix="/settings", tags=["Settings"])

VALID_THEMES = {
    "default", "newyear", "valentine", "songkran",
    "mother", "halloween", "loykrathong", "christmas",
}


class ThemeBody(BaseModel):
    theme: str


@router.get("/theme")
async def get_theme(session: DBSession):
    """Public: get the current global theme."""
    stmt = select(SystemSetting).where(SystemSetting.key == "theme")
    result = await session.execute(stmt)
    setting = result.scalar_one_or_none()
    return {"theme": setting.value if setting else "default"}


@router.post("/theme")
async def set_theme(body: ThemeBody, session: DBSession, admin: AdminUser):
    """Admin only: set the global theme."""
    if body.theme not in VALID_THEMES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid theme. Valid: {', '.join(sorted(VALID_THEMES))}",
        )

    stmt = select(SystemSetting).where(SystemSetting.key == "theme")
    result = await session.execute(stmt)
    setting = result.scalar_one_or_none()

    if setting:
        setting.value = body.theme
    else:
        setting = SystemSetting(key="theme", value=body.theme)

    session.add(setting)
    await session.commit()
    return {"theme": body.theme, "success": True}
