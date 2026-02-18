"""API v1 router — aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.v1 import manga, chapters, users, transactions, payments, upload

router = APIRouter(prefix="/v1")

router.include_router(manga.router)
router.include_router(chapters.router)
router.include_router(users.router)
router.include_router(transactions.router)
router.include_router(payments.router)
router.include_router(upload.router)
