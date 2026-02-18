# mangaFactory — คู่มือ Deploy Production

## สถาปัตยกรรม

```
[Cloudflare Workers] ← Frontend (Next.js 16 via @opennextjs/cloudflare)
        ↓ API calls
[Render / Railway]   ← Backend  (FastAPI Docker, port 8000)
        ↓
[Neon PostgreSQL]    ← Database (Serverless)
[Cloudflare R2]      ← Image Storage (S3-compatible)
[Stripe]             ← Payments
[Clerk]              ← Authentication
```

---

## 1. Backend → Render (Docker)

### สร้าง Web Service บน Render

1. ไปที่ https://dashboard.render.com → **New → Web Service**
2. เชื่อม GitHub repo: `pakawatdmc-art/web.factorymanga`
3. ตั้งค่า:
   - **Name:** `mangafactory-api`
   - **Root Directory:** `backend`
   - **Environment:** `Docker`
   - **Dockerfile Path:** `Dockerfile`
   - **Instance Type:** Starter ($7/mo) หรือ Free (spin-down หลัง idle)

### Environment Variables (ตั้งใน Render Dashboard)

| Variable | ค่าตัวอย่าง | หมายเหตุ |
|----------|------------|----------|
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@ep-xxx.neon.tech/mangafactory?sslmode=require` | คัดลอกจาก Neon Dashboard |
| `CLERK_PUBLISHABLE_KEY` | `pk_live_xxxx` | จาก Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | `sk_live_xxxx` | จาก Clerk Dashboard → API Keys |
| `CLERK_JWKS_URL` | `https://xxxx.clerk.accounts.dev/.well-known/jwks.json` | จาก Clerk Dashboard → JWT Templates |
| `R2_ENDPOINT_URL` | `https://8ad5a2c7xxxxx.r2.cloudflarestorage.com` | **ต้องมี `https://` นำหน้าเสมอ** — คัดลอกจาก Cloudflare R2 → Manage R2 API Tokens |
| `R2_ACCESS_KEY_ID` | `abcdef1234567890` | จาก R2 API Token |
| `R2_SECRET_ACCESS_KEY` | `secret_key_here` | จาก R2 API Token |
| `R2_BUCKET_NAME` | `mangafactory` | ชื่อ Bucket ที่สร้างใน R2 |
| `R2_PUBLIC_URL` | `https://pub-xxxxx.r2.dev` | **ต้องมี `https://` นำหน้าเสมอ** — เปิด Public Access ใน R2 Bucket Settings → Copy URL (ไม่มี trailing slash) |
| `STRIPE_SECRET_KEY` | `sk_live_xxxx` | จาก Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxx` | จาก Stripe → Webhooks → Signing Secret |
| `APP_ENV` | `production` | **ต้องตั้งเป็น `production`** |
| `CORS_ORIGINS` | `https://mangafactory.xxxx.workers.dev` | URL ของ Frontend ที่ deploy แล้ว (หลายค่าคั่นด้วย `,`) |

### ตรวจสอบ Health Check

```
GET https://mangafactory-api.onrender.com/health
→ {"status": "ok", "env": "production"}
```

---

## 2. Frontend → Cloudflare Workers

### วิธี Deploy จาก Local

```bash
cd frontend
npm install
npm run deploy
```

### วิธี Deploy ผ่าน Cloudflare Dashboard (CI/CD)

1. ไปที่ https://dash.cloudflare.com → **Workers & Pages → Create**
2. เชื่อม GitHub repo
3. ตั้งค่า:
   - **Framework preset:** None
   - **Build command:** `npm run build && npx opennextjs-cloudflare build`
   - **Build output directory:** `.open-next`
   - **Root directory:** `frontend`

### Environment Variables (ตั้งใน Workers → Settings → Variables)

| Variable | ค่าตัวอย่าง | หมายเหตุ |
|----------|------------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_xxxx` | ค่าเดียวกับ Backend |
| `CLERK_SECRET_KEY` | `sk_live_xxxx` | ค่าเดียวกับ Backend |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Path สำหรับหน้า Login |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Path สำหรับหน้าสมัคร |
| `NEXT_PUBLIC_API_URL` | `https://mangafactory-api.onrender.com/api/v1` | URL ของ Backend ที่ Deploy แล้ว (**ต้องลงท้ายด้วย `/api/v1`**) |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://pub-xxxxx.r2.dev` | ค่าเดียวกับ Backend |

> **สำคัญ:** ตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` จะถูก inline ตอน Build ดังนั้นต้องตั้งค่าใน **Build Variables and Secrets** ไม่ใช่ Runtime Variables

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
- ถ้าค่าผิด Backend จะ **Raise Error ทันที** (fail-fast) ไม่ปล่อยให้ link รูปเสีย

---

## 4. Neon PostgreSQL

Database ไม่ต้องย้าย — ใช้ `DATABASE_URL` เดิมจาก Neon Dashboard

### Run Migrations (ครั้งแรก)

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

---

## 5. Checklist ก่อน Go Live

- [ ] Backend health check ผ่าน (`/health` return `"ok"`)
- [ ] Frontend เปิดได้ที่ `*.workers.dev`
- [ ] รูปจาก R2 แสดงผลถูกต้อง
- [ ] Clerk sign-in / sign-up ทำงาน
- [ ] CORS ไม่มี error ใน browser console
- [ ] Admin pages เข้าถึงได้ (ต้อง login + role admin)
- [ ] Stripe webhook endpoint ตั้งค่าชี้ไป Backend URL ใหม่
