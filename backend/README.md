# MangaLabTH Backend

FastAPI backend สำหรับ MangaLabTH — แพลตฟอร์มอ่านมังงะออนไลน์

## Tech Stack

- **Framework:** FastAPI (async)
- **ORM:** SQLModel + SQLAlchemy (asyncpg)
- **Database:** Supabase PostgreSQL
- **Storage:** Cloudflare R2 (S3-compatible via boto3)
- **Auth:** Clerk JWT (RS256 + JWKS)
- **Payments:** FeelFreePay (PromptPay QR / TrueWallet)
- **Image Processing:** Pillow (WebP auto-conversion)
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
├── main.py              # FastAPI app, CORS, middleware
├── config.py            # Settings (Pydantic v2)
├── database.py          # Async SQLModel engine + session
├── models/              # SQLModel table definitions
│   ├── manga.py         # Manga, Chapter, Page
│   ├── user.py          # User (Clerk-linked, RBAC)
│   ├── transaction.py   # Transaction, CoinPackage
│   ├── analytics.py     # DailyMangaView
│   └── settings.py      # SystemSettings
├── schemas/             # Pydantic request/response schemas
│   ├── manga.py
│   ├── user.py
│   └── transaction.py
├── api/
│   ├── deps.py          # Auth dependencies, RBAC, user provisioning
│   └── v1/              # Route modules
│       ├── manga.py     # Manga CRUD + ranking
│       ├── chapters.py  # Chapter/Page CRUD + coin gating
│       ├── upload.py    # R2 upload (presigned + proxy)
│       ├── users.py     # User management
│       ├── transactions.py  # Coin economy (atomic)
│       ├── payments.py  # FeelFreePay integration
│       ├── analytics.py # View tracking dashboard
│       └── settings.py  # Global theme
└── services/
    ├── storage.py       # R2 operations + shared utilities
    ├── image.py         # WebP conversion
    ├── revalidate.py    # Frontend ISR cache purge
    ├── feelfreepay_service.py # FeelFreePay API wrapper
    └── analytics.py     # Background view recording
```

## Deployment (Cloud Run)

```bash
gcloud run deploy mangalabth-backend --source .
```

Set environment variables via Cloud Console or `--set-env-vars`.
See root `README.md` for full variable list.
