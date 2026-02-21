"""v1 API router — aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.v1 import chapters, manga, payments, settings, transactions, upload, users

router = APIRouter(prefix="/v1")

router.include_router(manga.router)
router.include_router(chapters.router)
router.include_router(payments.router)
router.include_router(settings.router)
router.include_router(transactions.router)
router.include_router(upload.router)
router.include_router(users.router)
