# mangaFactory Backend

High-performance manga platform API built with **FastAPI**, **SQLModel**, and **Neon PostgreSQL**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI 0.115 |
| ORM | SQLModel 0.0.22 + SQLAlchemy 2.0 (async) |
| Database | Neon PostgreSQL (serverless) via `asyncpg` |
| Auth | Clerk JWT (RS256 via JWKS) |
| Storage | Cloudflare R2 (S3-compatible) |
| Payments | Stripe Checkout |
| Migrations | Alembic (async) |

## Directory Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py             # Pydantic Settings (.env)
│   ├── database.py           # Async engine + session factory
│   ├── models/               # SQLModel ORM models
│   │   ├── user.py           # User (linked to Clerk)
│   │   ├── manga.py          # Manga → Chapter → Page
│   │   └── transaction.py    # Coin Economy ledger
│   ├── schemas/              # Pydantic v2 request/response
│   ├── api/
│   │   ├── deps.py           # Auth (Clerk JWT) + RBAC
│   │   └── v1/               # Versioned API routes
│   └── services/             # R2, Stripe integrations
├── alembic/                  # DB migrations
├── requirements.txt
└── .env.example
```

## Quick Start

```bash
# 1. Create virtual environment
cd backend
python -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your Neon DB URL, Clerk keys, R2 credentials, etc.

# 4. Run initial migration
alembic revision --autogenerate -m "initial"
alembic upgrade head

# 5. Start dev server
uvicorn app.main:app --reload --port 8080
```

API docs available at: `http://localhost:8080/docs`

## Database Schema

### Coin Economy Design

- **Transactions** are **immutable** append-only ledger entries
- `User.coin_balance` is the cached total (source of truth = transaction ledger)
- All balance mutations use `SELECT ... FOR UPDATE` to prevent race conditions
- Chapter unlock checks for existing unlock before deducting coins

### Tables

- `users` — Clerk-linked accounts with coin balance + RBAC role
- `mangas` — Manga metadata with slug, category, status
- `chapters` — Ordered by number (supports .5 specials), coin pricing
- `pages` — Ordered images with R2 URLs + dimensions
- `transactions` — Immutable coin movement log
- `coin_packages` — Predefined Stripe purchase options

## API Endpoints

### Public
- `GET /api/v1/manga` — List manga (filter, search, paginate)
- `GET /api/v1/manga/{id}` — Manga detail with chapters
- `GET /api/v1/manga/slug/{slug}` — Manga by slug
- `GET /api/v1/chapters/{id}` — Chapter detail with pages

### Authenticated (Reader)
- `GET /api/v1/users/me` — My profile
- `PATCH /api/v1/users/me` — Update profile
- `POST /api/v1/transactions/unlock` — Unlock chapter with coins
- `GET /api/v1/transactions/me` — My transaction history

### Admin Only
- `POST /api/v1/manga` — Create manga
- `PATCH /api/v1/manga/{id}` — Update manga
- `DELETE /api/v1/manga/{id}` — Delete manga
- `POST /api/v1/chapters/manga/{id}` — Create chapter
- `POST /api/v1/chapters/{id}/pages` — Batch add pages
- `POST /api/v1/transactions/admin/grant` — Grant coins
- `GET /api/v1/users` — List all users
