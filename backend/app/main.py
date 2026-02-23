"""MangaLabTH — FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.config import get_settings
from app.database import init_db
from app.api.v1 import router as v1_router

settings = get_settings()

# ── Rate Limiter ─────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks (create tables + seed data in dev)."""
    if not settings.is_production:
        await init_db()
    yield


app = FastAPI(
    title="MangaLabTH API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)

# ── Rate Limiter state ───────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Proxy Headers (for Cloud Run rate limiting) ────
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# ── CORS (V8: restricted methods/headers) ────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type",
                   "Accept", "X-Requested-With"],
)

app.include_router(v1_router, prefix="/api")


@app.get("/health")
async def health():
    # V7: Don't leak environment name in production
    if settings.is_production:
        return {"status": "ok"}
    return {"status": "ok", "env": settings.APP_ENV}
