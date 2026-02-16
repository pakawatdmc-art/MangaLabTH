# mangaFactory

แพลตฟอร์มอ่านมังงะออนไลน์ระดับพรีเมียม พร้อมระบบ Coin Economy

## โครงสร้างโปรเจกต์

```
mangaFactory/
├── frontend/     # Next.js 16 + Tailwind CSS + Clerk Auth
├── backend/      # FastAPI + SQLModel + Neon PostgreSQL
├── .gitignore
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, Clerk, Lucide React |
| Backend | FastAPI, SQLModel, Pydantic v2, Alembic |
| Database | Neon PostgreSQL (Serverless) |
| Storage | Cloudflare R2 (S3-compatible) |
| Payments | Stripe |
| Auth | Clerk (JWT + RBAC) |

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your Neon, Clerk, R2, Stripe credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install

# Copy and configure environment
cp .env.example .env.local
# Edit .env.local with your Clerk keys

# Start dev server
npm run dev
```

Open http://localhost:3000

## Features

### Reader (หน้าผู้อ่าน)
- 🏠 Home — Hero, manga grid, search, filters, pagination
- 🔍 Search — Advanced filters (category, status, sort)
- 📖 Manga Detail — Cover, info, chapter list
- 📚 Chapter Reader — Vertical scroll, lazy load, progress bar, keyboard nav
- 🪙 Coins — Purchase packages, transaction history
- 🔐 Auth — Clerk sign-in/sign-up

### Admin (แอดมิน)
- 📊 Dashboard — Stats overview
- 📕 Manga CRUD — Create, edit, delete manga
- 📄 Chapter CRUD — Manage chapters and pricing
- ☁️ Upload — Batch image upload to R2
- 👥 Users — User management, coin grants
- 💰 Transactions — Revenue monitoring

## Environment Variables

### Backend (`backend/.env`)
- `DATABASE_URL` — Neon PostgreSQL connection string
- `CLERK_*` — Clerk authentication keys
- `R2_*` — Cloudflare R2 credentials
- `STRIPE_*` — Stripe payment keys

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_API_URL` — Backend API URL
- `NEXT_PUBLIC_R2_PUBLIC_URL` — R2 public bucket URL

## License

MIT
