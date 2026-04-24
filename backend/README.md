# MangaLabTH Backend

FastAPI backend สำหรับ MangaLabTH — แพลตฟอร์มอ่านมังงะออนไลน์

## Tech Stack

- **Framework:** FastAPI (async)
- **ORM:** SQLModel + SQLAlchemy (asyncpg)
- **Database:** Supabase PostgreSQL
- **Storage:** Cloudflare R2 (S3-compatible via boto3)
- **Auth:** Clerk JWT (RS256 + JWKS)
- **Payments:** FeelFreePay (PromptPay QR / TrueWallet)
- **Email:** Resend (Welcome + Payment Confirmation, fire-and-forget)
- **Image Processing:** Pillow (WebP auto-conversion)
- **SEO:** Google Indexing API (auto-notify on content changes)
- **Deployment:** Google Cloud Run (Docker)

## Quick Start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in all variables (see root README for details)

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
app/
├── main.py              # FastAPI app, CORS, rate limiter, middleware
├── config.py            # Settings (Pydantic v2, env validation)
├── database.py          # Async SQLModel engine + session + seed data
├── models/              # SQLModel table definitions
│   ├── manga.py         # Manga, Chapter, Page
│   ├── user.py          # User (Clerk-linked, RBAC, coin_balance)
│   ├── transaction.py   # Transaction, CoinPackage
│   ├── analytics.py     # DailyMangaView
│   └── setting.py       # SystemSetting (key-value)
├── schemas/             # Pydantic request/response schemas
│   ├── manga.py
│   ├── user.py
│   └── transaction.py
├── api/
│   ├── deps.py          # Auth: JWT decode, RBAC, Clerk profile cache
│   └── v1/              # Route modules
│       ├── manga.py     # Manga CRUD + ranking + view recording
│       ├── chapters.py  # Chapter/Page CRUD + coin gating + auto-unlock
│       ├── upload.py    # R2 upload (cover + chapter page, WebP conversion)
│       ├── users.py     # User CRUD + admin stats + delete (DB + Clerk sync)
│       ├── transactions.py  # Coin economy (atomic SELECT FOR UPDATE)
│       ├── payments.py  # FeelFreePay (checkout + webhook + confirm)
│       ├── analytics.py # Marketing dashboard (charts, top mangas)
│       └── settings.py  # Global theme (festival themes)
└── services/
    ├── storage.py           # R2 upload/delete/presigned + IP helper
    ├── image.py             # WebP conversion (Pillow, method=4)
    ├── http_client.py       # Shared httpx.AsyncClient singleton
    ├── google_notify.py     # Google Indexing API (auto-notify)
    ├── revalidate.py        # Frontend ISR cache purge
    ├── feelfreepay_service.py  # FeelFreePay API (QR, TrueWallet, status)
    ├── email_service.py         # Resend SDK wrapper (async, fire-and-forget)
    ├── email_templates.py       # HTML email templates (Welcome, Payment)
    └── analytics.py             # Background view recording (IP dedup)
```

## Utility Scripts

```bash
# Seed coin packages
python scripts/seed_coin_packages.py

# Google Indexing — submit all sitemap URLs
python scripts/run_google_index.py

# Reset economy — reset all coin balances (⚠️ dev only, blocked on production)
python scripts/reset_economy.py
```

> **Archived** (one-time migrations, in `scripts/archive/`):
> `migrate_slugs.py`, `update_transaction_notes.py`

## Deployment (Cloud Run)

```bash
gcloud run deploy mangalabth-backend --source .
```

Set environment variables via Cloud Console or `--set-env-vars`.
See root `README.md` for full variable list.
