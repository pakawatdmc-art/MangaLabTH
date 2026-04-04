"""Application settings loaded from environment variables."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"
    FRONTEND_URL: str = "http://localhost:3000"
    REVALIDATION_SECRET: str = "super-secret-mangalabth"
    SQL_ECHO: bool = False

    # ── Database (Neon PostgreSQL) ───────────────
    DATABASE_URL: str

    # ── Clerk Auth ───────────────────────────────
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_SECRET_KEY: str = ""
    CLERK_JWKS_URL: str = ""
    PRIMARY_ADMIN_EMAIL: str = "pakawat.dmc@gmail.com"

    # ── Cloudflare R2 ────────────────────────────
    R2_ENDPOINT_URL: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "mangafactory"
    R2_PUBLIC_URL: str = ""

    # ── SEO / Google Notification ─────────────────
    SITE_URL: str = ""  # e.g. https://mangalab-th.com
    GOOGLE_INDEXING_CREDENTIALS: str = "" # Base64 encoded Service Account JSON or path

    # ── FeelFreePay ────────────────────────────────
    FFP_CUSTOMER_KEY: str = ""
    FFP_PUBLIC_KEY: str = ""
    FFP_SECRET_KEY: str = ""
    FFP_BASE_URL: str = "https://api-test.feelfreepay.com"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origin_list(self) -> List[str]:
        origins = [o.strip()
                   for o in self.CORS_ORIGINS.split(",") if o.strip()]
        for origin in origins:
            if not origin.startswith(("http://", "https://")):
                raise ValueError(
                    f"Invalid CORS origin '{origin}' — must start with http:// or https://"
                )
        return origins

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    def validate_r2_config(self) -> None:
        """Fail fast if R2 storage is not configured correctly."""
        if not self.R2_PUBLIC_URL or not self.R2_PUBLIC_URL.startswith("https://"):
            raise RuntimeError(
                "R2_PUBLIC_URL is missing or invalid — "
                "must be a full URL like https://pub-xxx.r2.dev"
            )
        if not self.R2_ENDPOINT_URL:
            raise RuntimeError(
                "R2_ENDPOINT_URL is missing — "
                "must be https://<account_id>.r2.cloudflarestorage.com"
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore
