# mangaFactory

แพลตฟอร์มอ่านมังงะออนไลน์ระดับพรีเมียม พร้อมระบบ Coin Economy

## สถาปัตยกรรม (Architecture)

```
mangaFactory/
├── frontend/     # Next.js 16 → Cloudflare Workers (via @opennextjs/cloudflare)
├── backend/      # FastAPI → Render / Railway (Docker)
├── .gitignore
└── README.md
```

| Layer | Technology | Hosting |
|-------|------------|---------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, Clerk | **Cloudflare Workers** |
| Backend | FastAPI, SQLModel, Pydantic v2, Alembic | **Render / Railway (Docker)** |
| Database | Neon PostgreSQL (Serverless) | **Neon** |
| Storage | Cloudflare R2 (S3-compatible, boto3) | **Cloudflare R2** |
| Payments | Stripe | Stripe |
| Auth | Clerk (JWT + RBAC) | Clerk |

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — fill in Neon, Clerk, R2, Stripe credentials

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

cp .env.example .env.local
# Edit .env.local — fill in Clerk keys + NEXT_PUBLIC_API_URL

npm run dev        # Next.js dev server (http://localhost:3000)
npm run preview    # Build + preview via Cloudflare Workers runtime
```

## Production Deployment

### Backend → Render / Railway

1. Create a new **Web Service** and connect to this repo
2. Set **Root Directory** to `backend/`
3. Set **Dockerfile Path** to `Dockerfile`
4. Add environment variables from `backend/.env.example`
5. Deploy — the container exposes port `8000`

### Frontend → Cloudflare Workers

```bash
cd frontend
npm run deploy     # Builds with OpenNext + deploys to Cloudflare
```

Or connect via **Cloudflare Workers Builds** (CI/CD):
- **Build command:** `npm run build`
- **Deploy command:** `opennextjs-cloudflare build && opennextjs-cloudflare deploy`
- Add env vars in **Build Variables and Secrets** (Clerk keys, API URL)

## Features

### Reader (หน้าผู้อ่าน)
- **Home** — Hero, manga grid, search, filters, pagination
- **Search** — Advanced filters (category, status, sort)
- **Manga Detail** — Cover, info, chapter list with coin pricing
- **Chapter Reader** — Vertical scroll, lazy load, progress bar, keyboard nav
- **Coins** — Purchase packages, transaction history
- **Auth** — Clerk sign-in/sign-up with RBAC

### Admin (แอดมิน)
- **Dashboard** — Stats overview
- **Manga CRUD** — Create, edit, delete manga
- **Chapter CRUD** — Manage chapters and pricing
- **Upload** — Batch image upload to R2 (presigned URLs)
- **Users** — User management, coin grants
- **Transactions** — Revenue monitoring

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint |
| `R2_ENDPOINT_URL` | `https://<account_id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public bucket URL (e.g. `https://pub-xxx.r2.dev`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `APP_ENV` | `development` or `production` |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route (`/sign-up`) |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | R2 public bucket URL |

## License

MIT
