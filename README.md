# MangaLabTH

แพลตฟอร์มอ่านมังงะออนไลน์ระดับพรีเมียม พร้อมระบบ Coin Economy

## สถาปัตยกรรม (Architecture)

```
mangaFactory/
├── frontend/     # Next.js 16 (App Router) → Vercel
├── backend/      # FastAPI (Python) → Google Cloud Run
├── .gitignore
└── README.md
```

| Layer | Technology | Hosting |
|-------|------------|---------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, Clerk | **Vercel** |
| Backend | FastAPI, SQLModel, Pydantic v2, Alembic | **Google Cloud Run (Docker)** |
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
```

## Production Deployment

### Backend → Google Cloud Run

Google Cloud Run จะนำ `Dockerfile` ไปสร้าง Image และรันโดยอัตโนมัติ 

1. ติดตั้ง `gcloud` CLI และทำการ Login: `gcloud auth login`
2. สร้าง Google Cloud Project และตั้งค่า Billing
3. ไปที่โฟลเดอร์ `backend` และรันคำสั่ง Deploy:
   ```bash
   cd backend
   gcloud run deploy mangalabth-backend --source .
   ```
4. เลือก Region (เช่น `asia-southeast1` สิงคโปร์)
5. กดยอมรับการอนุญาตเข้าถึงแบบ Unauthenticated (สาธารณะ)
6. ใส่ Environment Variables (เช่น `DATABASE_URL`, `CLERK_SECRET_KEY`, `R2_...`, `STRIPE_...`) ผ่าน Cloud Console หรือ CLI argument
7. *หมายเหตุ:* ตัว Backend ถูกตั้งค่า `ProxyHeadersMiddleware` ไว้แล้ว ทำให้ใช้งานกับระบบตรวจจับ IP ของเน็ตเวิร์ค Google (Load Balancer) ได้อย่างไม่มีปัญหา

### Frontend → Vercel

1. สร้างโปรเจคใหม่ใน [Vercel](https://vercel.com/)
2. นำเข้า Repository นี้จาก GitHub
3. ไปที่ตั้งค่า **Root Directory** เลือกโฟลเดอร์ `frontend`
4. Vercel จะตรวจสอบและรู้ว่าเป็นโปรเจ็กต์ Next.js โดยอัตโนมัติ (Build command: `next build`)
5. กำหนด Environment Variables ใน Vercel:
   * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   * `CLERK_SECRET_KEY`
   * `NEXT_PUBLIC_API_URL` (URL ของ Google Cloud Run ที่เพิ่งสร้าง)
   * `REVALIDATION_SECRET` (สำหรับรับ Webhook จาก Backend เพื่อเคลียร์ Cache)
6. กดปุ่ม `Deploy`

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
- **Upload** — Batch image upload to R2 (presigned URLs) พร้อมระบบ Parallel Upload
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
| `CORS_ORIGINS` | Comma-separated allowed origins (URL ของ Vercel) |
| `FRONTEND_URL` | URL ของ Vercel (สำหรับการสั่ง Revalidate Cache) |
| `REVALIDATION_SECRET` | รหัสผ่านลับสำหรับสั่งเคลียร์ Cache |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route (`/sign-up`) |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | R2 public bucket URL |
| `REVALIDATION_SECRET` | รหัสผ่านลับสำหรับยืนยันรับคำสั่ง เคลียร์ Cache |

## License

MIT
