"""mangaFactory — FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.api.v1 import router as v1_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks (create tables + seed data in dev)."""
    if not settings.is_production:
        await init_db()
    yield


app = FastAPI(
    title="mangaFactory API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.APP_ENV}
