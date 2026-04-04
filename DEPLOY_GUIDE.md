# MangaLabTH — คู่มือ Deploy Production

## สถาปัตยกรรม

```
[Next.js 16 / Vercel] ⇆ [FastAPI / Google Cloud Run] ⇆ [PostgreSQL (Supabase)]
                             ↑↓
                      [Cloudflare R2]     ← Storage
                      [FeelFreePay]       ← Payments (PromptPay QR / TrueWallet)
                      [Clerk]             ← Authentication (JWT + RBAC)
                      [Google APIs]       ← Indexing API (SEO)
```

---

## 1. Backend → Google Cloud Run (Docker)

Google Cloud Run จะนำ `Dockerfile` ไปสร้าง Image และรันโดยอัตโนมัติ

### ขั้นตอน Deploy

1. ติดตั้ง `gcloud` CLI และทำการ Login: `gcloud auth login`
2. สร้าง Google Cloud Project และตั้งค่า Billing
3. ไปที่โฟลเดอร์ `backend` และรันคำสั่ง Deploy:
   ```bash
   cd backend
   gcloud run deploy mangalabth-backend --source .
   ```
4. เลือก Region (เช่น `asia-southeast1` สิงคโปร์)
5. กดยอมรับการอนุญาตเข้าถึงแบบ Unauthenticated (สาธารณะ)
6. ใส่ Environment Variables ผ่าน Cloud Console หรือ CLI argument
7. *หมายเหตุ:* Backend ตั้งค่า `ProxyHeadersMiddleware` ไว้แล้ว ใช้งานกับ Cloud Run Load Balancer ได้

### Environment Variables (ตั้งใน Cloud Console)

| Variable | ค่าตัวอย่าง | หมายเหตุ |
|----------|------------|----------|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@xxx.supabase.com:5432/postgres` | Supabase PostgreSQL (IPv4 Session Pooler) |
| `CLERK_PUBLISHABLE_KEY` | `pk_live_xxxx` | จาก Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | `sk_live_xxxx` | จาก Clerk Dashboard → API Keys |
| `CLERK_JWKS_URL` | `https://xxxx.clerk.accounts.dev/.well-known/jwks.json` | จาก Clerk Dashboard → JWT Templates |
| `R2_ENDPOINT_URL` | `https://8ad5a2c7xxxxx.r2.cloudflarestorage.com` | **ต้องมี `https://` นำหน้าเสมอ** |
| `R2_ACCESS_KEY_ID` | `abcdef1234567890` | จาก R2 API Token |
| `R2_SECRET_ACCESS_KEY` | `secret_key_here` | จาก R2 API Token |
| `R2_BUCKET_NAME` | `mangafactory` | ชื่อ Bucket ที่สร้างใน R2 |
| `R2_PUBLIC_URL` | `https://pub-xxxxx.r2.dev` | **ต้องมี `https://` นำหน้า, ห้ามมี `/` ต่อท้าย** |
| `FFP_CUSTOMER_KEY` | `cust_xxxx` | จาก FeelFreePay Dashboard → Profile > Gen Token |
| `FFP_PUBLIC_KEY` | `pub_xxxx` | จาก FeelFreePay Dashboard |
| `FFP_SECRET_KEY` | `sec_xxxx` | จาก FeelFreePay Dashboard |
| `FFP_BASE_URL` | `https://api.feelfreepay.com` | Production URL (test: `https://api-test.feelfreepay.com`) |
| `APP_ENV` | `production` | **ต้องตั้งเป็น `production`** (ปิด /docs, /redoc) |
| `CORS_ORIGINS` | `https://mangalab-th.com,https://www.mangalab-th.com` | URL ของ Frontend (คั่นด้วย `,`) |
| `FRONTEND_URL` | `https://mangalab-th.com` | URL ของ Vercel (สำหรับ Revalidate Cache) |
| `REVALIDATION_SECRET` | `super-secret-xxx` | รหัสลับสำหรับสั่งเคลียร์ Cache |
| `SITE_URL` | `https://mangalab-th.com` | ใช้สำหรับ Auto Google Ping (**ต้องตั้ง**) |
| `GOOGLE_INDEXING_CREDENTIALS` | `<JSON string or Base64>` | Service Account JSON สำหรับ Google Indexing API |

### ตรวจสอบ Health Check

```
GET https://<cloud-run-url>/health
→ {"status": "ok"}
```

> **หมายเหตุ:** Production mode จะไม่แสดง `env` field ใน response

---

## 2. Frontend → Vercel

### ขั้นตอน Deploy

1. สร้างโปรเจคใหม่ใน [Vercel](https://vercel.com/)
2. นำเข้า Repository นี้จาก GitHub
3. ไปที่ตั้งค่า **Root Directory** เลือกโฟลเดอร์ `frontend`
4. Vercel จะตรวจสอบและรู้ว่าเป็น Next.js โดยอัตโนมัติ (Build command: `next build`)
5. กำหนด Environment Variables
6. กดปุ่ม `Deploy`

### Environment Variables (ตั้งใน Vercel)

| Variable | ค่าตัวอย่าง | หมายเหตุ |
|----------|------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_xxxx` | ค่าเดียวกับ Backend |
| `CLERK_SECRET_KEY` | `sk_live_xxxx` | ค่าเดียวกับ Backend |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Path หน้า Login |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Path หน้าสมัคร |
| `NEXT_PUBLIC_API_URL` | `https://<cloud-run-url>/api/v1` | URL ของ Backend (**ต้องลงท้ายด้วย `/api/v1`**) |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://pub-xxxxx.r2.dev` | ค่าเดียวกับ Backend |
| `NEXT_PUBLIC_SITE_URL` | `https://mangalab-th.com` | Base URL (สำหรับ SEO / robots.ts) |
| `REVALIDATION_SECRET` | `super-secret-xxx` | ค่าเดียวกับ Backend (สำหรับรับ Webhook เคลียร์ Cache) |

> **สำคัญ:** ตัวแปร `NEXT_PUBLIC_*` จะถูก inline ตอน Build — ต้องตั้งก่อน build ไม่ใช่ Runtime

---

## 3. Cloudflare R2 — ตั้งค่า Bucket

1. ไปที่ Cloudflare Dashboard → **R2 Object Storage**
2. สร้าง Bucket ชื่อ `mangafactory`
3. เปิด **Public Access** → จด URL เช่น `https://pub-xxxxx.r2.dev`
4. สร้าง **R2 API Token** → จด Access Key ID + Secret Access Key
5. จด **Account ID** จาก URL bar → สร้าง Endpoint URL: `https://<account_id>.r2.cloudflarestorage.com`

### ข้อสำคัญเกี่ยวกับ R2_PUBLIC_URL

- **ต้องขึ้นต้นด้วย `https://`** เสมอ
- **ห้ามมี `/` ต่อท้าย** (trailing slash)
- ✅ ถูก: `https://pub-abc123.r2.dev`
- ❌ ผิด: `pub-abc123.r2.dev` (ไม่มี scheme)
- ❌ ผิด: `https://pub-abc123.r2.dev/` (มี trailing slash)
- ถ้าค่าผิด Backend จะ **Raise Error ทันที** (fail-fast)

---

## 4. Supabase PostgreSQL

### Database Setup
1. สร้าง Project ใน [Supabase](https://supabase.com/)
2. ไปที่ Settings → Database → Connection string
3. เลือก **Session Pooler (IPv4)** → คัดลอก URL
4. แทนที่ `postgresql://` ด้วย `postgresql+asyncpg://` สำหรับใช้ใน `DATABASE_URL`

### Run Migrations (ครั้งแรก)
```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

### Seed Coin Packages
```bash
python seed_coin_packages.py
```

---

## 5. FeelFreePay — ตั้งค่า Payment Gateway

1. สมัครบัญชีที่ [FeelFreePay](https://feelfreepay.com/)
2. ไปที่ Profile → **Gen Token** → คัดลอก Customer Key
3. จดค่า Public Key, Secret Key จาก Dashboard
4. ตั้ง Webhook URL: `https://<cloud-run-url>/api/v1/payments/webhook`
5. สำหรับ Testing: ใช้ `FFP_BASE_URL=https://api-test.feelfreepay.com`
6. สำหรับ Production: ใช้ `FFP_BASE_URL=https://api.feelfreepay.com`

> **หมายเหตุ Local Dev:** FFP CloudFront WAF จับ URL ที่มี "localhost" — ใช้ `lvh.me` แทน (resolves to 127.0.0.1)

---

## 6. Google Indexing API (SEO)

1. สร้าง Service Account ใน Google Cloud Console
2. Enable **Indexing API** สำหรับ project
3. Export JSON key → แปลงเป็น Base64 หรือใช้ raw JSON
4. ใส่ใน env var `GOOGLE_INDEXING_CREDENTIALS`
5. เพิ่ม Email ของ Service Account เป็น **Owner** ใน Google Search Console

---

## 7. Checklist ก่อน Go Live

- [ ] Backend health check ผ่าน (`/health` return `"ok"`)
- [ ] Frontend เปิดได้ที่ Vercel URL
- [ ] รูปจาก R2 แสดงผลถูกต้อง
- [ ] Clerk sign-in / sign-up ทำงาน
- [ ] CORS ไม่มี error ใน browser console
- [ ] Admin pages เข้าถึงได้ (ต้อง login + role admin)
- [ ] FeelFreePay QR payment ทดสอบผ่าน
- [ ] FeelFreePay webhook ตอบ success
- [ ] ตั้งค่า `SITE_URL` บน Cloud Run (สำหรับ Auto Google Ping)
- [ ] ยืนยันเว็บบน Google Search Console
- [ ] ส่ง `sitemap.xml` บน Google Search Console
- [ ] ตั้งค่า `GOOGLE_INDEXING_CREDENTIALS` + เพิ่ม Service Account เป็น Owner
- [ ] Seed coin packages ผ่าน `seed_coin_packages.py`
