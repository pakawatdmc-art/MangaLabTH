# 🌟 MangaLabTH — Premium Manga Platform & Coin Economy

ยินดีต้อนรับสู่ **MangaLabTH** 🚀 แพลตฟอร์มอ่านมังงะออนไลน์ยุคใหม่ที่ยกระดับประสบการณ์การอ่านไปอีกขั้น!

โปรเจกต์นี้ไม่ใช่แค่เว็บไซต์อ่านการ์ตูนธรรมดา แต่เป็น **Full-Stack Application** แบบครบวงจรที่ถูกคราฟต์ขึ้นมาด้วยสถาปัตยกรรมระดับ Enterprise และเทคโนโลยี Cloud-native ล่าสุด เพื่อรองรับผู้อ่านจำนวนมหาศาล พร้อมผสานระบบเศรษฐกิจเหรียญ (Coin Economy) ที่แม่นยำ ปลอดภัย และไร้รอยต่อ

---

## ⚡ จุดเด่นที่ทำให้เราแตกต่าง (Engineering Highlights)

- ⚡ **เร็วทะลุจอ (Real-time & Lightning Fast)**: ขับเคลื่อนด้วย Next.js 16.2.4 (App Router + Turbopack) และเทคนิคอัปเดตข้อมูลแบบ ISR ทำให้โหลดหน้าเว็บได้ในพริบตา (LCP < 1 วินาที) มอบประสบการณ์ที่ลื่นไหลขั้นสุด
- 🛡️ **ระบบเหรียญที่เชื่อถือได้ 100% (Atomic Transactions)**: ลาก่อนปัญหาหักเหรียญซ้ำซ้อน! เราใช้ระบบล็อกข้อมูลระดับ Database (`SELECT FOR UPDATE`) จัดการทุกธุรกรรมทางการเงินอย่างเฉียบขาด ปลอดภัยแม้มีคนกดซื้อตอนมังงะพร้อมกันเป็นหมื่นคน
- ☁️ **Cloud Pipeline อัจฉริยะ**: อัปโหลดปุ๊บ แปลงเป็น WebP ปั๊บ! จัดการไฟล์ภาพทั้งหมดผ่านสถาปัตยกรรม S3-compatible (Cloudflare R2) ที่โหลดรูปได้เร็วปรี๊ด ประหยัดแบนด์วิดท์ และรองรับการขยายตัวระดับโลก
- ⏰ **ระบบปลดเวลาอ่านฟรีอัจฉริยะ (Automated Timed Unlocks)**: มิติใหม่ของการจัดการเนื้อหา! รองรับระบบ Timezone แบบเป๊ะปัง ไม่มีคลาดเคลื่อน ระบบหน้าบ้านและหลังบ้านซิงค์กันแบบ Real-time ปลดล็อกตอนให้อ่านฟรีทันทีเมื่อตัวนับถอยหลังสิ้นสุด
- 🔍 **สุดยอดปรมาจารย์ด้าน SEO**: ผสานพลังเข้ากับ Google Indexing API แจ้งเตือนบอทของ Google ให้มาเก็บข้อมูลทันทีที่มีการอัปเดตตอนใหม่ แถมจัดเต็มด้วย JSON-LD Structured Data และ Dynamic Sitemap ที่ครอบคลุมเนื้อหาทุกหน้าอย่างสมบูรณ์แบบ พร้อม URL Encoding ที่สอดคล้องกันทั้ง Sitemap, Canonical และ Indexing API
- 📊 **Google Analytics 4 ครบวงจร**: ติดตาม User Journey ตั้งแต่ค้นหา → อ่าน → ซื้อเหรียญ → ปลดล็อก พร้อม Key Events สำหรับวัด Conversion ได้ทันที

---

## 🏗️ สถาปัตยกรรมระบบ (Architecture)

```
MangaLabTH/
├── frontend/     # Next.js 16.2.4 (App Router + Turbopack) → Vercel
├── backend/      # FastAPI (Python) → Google Cloud Run
├── .gitignore
└── README.md
```

| ส่วนของระบบ | เทคโนโลยีที่ใช้ | ผู้ให้บริการ Hosting |
|-----------|----------------|----------------------|
| **Frontend** | Next.js 16.2.4 (App Router + Turbopack), Tailwind CSS v4, Clerk | **Vercel** |
| **Backend** | FastAPI, SQLModel, Pydantic v2, Alembic | **Google Cloud Run (Docker)** |
| **Database** | PostgreSQL (IPv4 Session Pooler) | **Supabase** |
| **Storage** | Cloudflare R2 (S3-compatible, boto3) | **Cloudflare R2** |
| **Payments** | FeelFreePay (PromptPay QR / TrueWallet) | **FeelFreePay** |
| **Auth** | Clerk (JWT RS256 + JWKS + RBAC) | **Clerk** |
| **SEO** | Google Indexing API (Service Account) | **Google Cloud** |
| **CI/CD** | Cloud Build → Artifact Registry → Cloud Run | **Google Cloud Build** |

---

## 🎯 ฟีเจอร์ชูโรง (41 Features — Production-Audited ✅)

### 📖 ฝั่งผู้อ่าน (Reader Experience)
- **UI/UX ดีไซน์พรีเมียม** — Dark Mode, Glassmorphism, Gold accents, Responsive
- **Chapter Reader ขั้นเทพ** — Progress bar, Keyboard navigation (←→), Mobile dock, Reading position memory
- **Premium Chapter Gate** — Countdown timer → auto-refresh เมื่อถึงเวลา, แสดงราคา + ยอดเหรียญคงเหลือ
- **ระบบค้นหาและตัวกรอง** — Multi-field search, Category/Status filter, Sort (ล่าสุด/ยอดวิว/อัปเดต), Pagination with state preservation
- **Coin Economy** — เติมเหรียญผ่าน PromptPay QR / TrueWallet, ปลดล็อกตอน, ดูประวัติธุรกรรม
- **Top Manga Rankings** — รายสัปดาห์/รายเดือน/ตลอดกาล (DailyMangaView aggregation)
- **Theme System** — Server-synced global themes (ธีมเทศกาล เช่น สงกรานต์, คริสต์มาส)
- **GA4 Analytics** — Custom events: `view_manga_detail`, `read_chapter_start/complete`, `unlock_chapter`, `purchase` พร้อม Key Events + Conversion tracking
- **Clerk Proxy** — Route protection ผ่าน `proxy.ts` (protect `/admin`, `/coins`, `/profile`)

### ⚙️ ฝั่งผู้ดูแลระบบ (Admin Superpowers)
- **Marketing Analytics Dashboard** — 3 chart types (Area, Donut, Dual Area), Growth comparison, Time range selector (7/30/90 วัน)
- **Master Upload Pipeline** — Drag-drop reordering (dnd-kit), Concurrent upload (5 at a time), Auto WebP conversion, R2 orphan cleanup, Auto-retry (3 attempts + exponential backoff), Per-batch token refresh, 60s upload timeout
- **Manga CRUD** — สร้าง/แก้ไข/ลบ มังงะ, Auto-slug generation (Thai + English), Cover upload with magic byte validation
- **Chapter Management** — ตั้งราคาเหรียญ, กำหนดเวลาปลดล็อกฟรี (Timed Unlock), Auto-sync is_free ↔ coin_price
- **Chapter Defaults Setting** — ตั้งค่ามาตรฐานสำหรับตอนถัดไป เช่น จำนวนวันที่จะปลดล็อกฟรี เพื่อลดข้อผิดพลาดในการลงเนื้อหา
- **User Management** — Admin/Reader roles, Grant coins (Primary Admin only), Role toggle with safety guards
- **Transaction Ledger** — Color-coded types, Dual filter (search + dropdown), Summary cards

---

## 🛠️ Production Hardening (Technical Audit — April 2026)

โปรเจกต์ผ่านการทำ **Full Code Audit 41 ฟีเจอร์** + **Integration Audit 28 API Endpoints** + **Bug Review 14 Areas** + **SEO/Analytics Deep Review** พร้อม Production:

### 🔒 Security
| มาตรการ | รายละเอียด |
|---------|-----------|
| **Anti-Scraping (Level 5)** | Cloudflare WAF ป้องกันการดูดรูปโดยตรง + R2 Custom Domain (`cdn.mangalab-th.com`) + Hotlink Protection |
| **Frontend Image Protection** | ซ่อน URL รูปภาพด้วย Blob URLs และแทรกแซง Event (คลิกขวา, ลากรูป) |
| **JWT + JWKS** | Clerk RS256, cached signing keys (1hr), issuer validation |
| **RBAC** | `AdminUser` / `CurrentUser` / `OptionalUser` dependencies |
| **Primary Admin Protection** | Cannot demote, config-based (`PRIMARY_ADMIN_EMAIL`) |
| **Rate Limiting** | SlowAPI 120/min default, 10/min checkout, 5/min confirm |
| **CORS** | Restricted origins in production (`cors_origin_list`) |
| **Webhook Security** | Secret-based verification + double-check via Status API |
| **File Upload** | Magic byte validation, 10MB cover / 15MB chapter page, path traversal prevention |
| **Docs Disabled** | `/docs` and `/redoc` hidden in production |

### ⚡ Performance (Lighthouse: Mobile 90+ / Desktop 100)
| การปรับปรุง | รายละเอียด |
|------------|-----------|
| **ISR Caching** | `revalidate: 60` on manga lists, Backend → Frontend revalidation webhook |
| **Connection Pooling** | Shared `httpx.AsyncClient` singleton (20 connections, 10 keepalive) |
| **DB Pool** | `pool_size=5`, `max_overflow=10`, `pool_recycle=300`, `pool_pre_ping=True` |
| **Ranking Cache** | TTLCache 5 minutes for weekly/monthly/all_time rankings |
| **Clerk Profile Cache** | TTLCache 500 entries, 60s TTL |
| **View Dedup** | IP-based TTLCache (20k entries, 1hr) → prevent duplicate view counting |
| **localStorage Throttle** | ChapterReader writes position every 2s (not every scroll) |
| **Preconnect R2** | `<link rel="preconnect">` ไปยัง R2 CDN → ลด LCP ~200-400ms |
| **LCP Image Priority** | UpdateMangaCard 2 ตัวแรก `priority + eager loading` → browser fetch ทันที |
| **R2 Cache-Control** | `public, max-age=31536000, immutable` ทุก upload → browser cache 1 ปี |
| **Static Asset Caching** | `_next/static/*` + fonts: immutable cache 1 ปี ผ่าน `next.config.ts` |
| **Dynamic Import** | `TopMangaRanking` lazy-loaded ผ่าน client wrapper → ลด initial JS bundle |
| **Lazy Loading** | Below-fold images (`MangaCard`, `TopMangaRanking`) ใช้ `loading="lazy"` + `sizes` |

### 📊 Observability
| การปรับปรุง | รายละเอียด |
|------------|-----------|
| **Logger** | All modules use `logging.getLogger(__name__)`, lazy `%s` formatting |
| **Health Check** | `GET /health` → no env leak in production |
| **Container Health** | Docker `HEALTHCHECK` every 30s |

---

## 💻 คู่มือการติดตั้งสำหรับนักพัฒนา (Local Development)

### ฝั่ง Backend 🐍

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# ✏️ แก้ไขไฟล์ .env และใส่ค่า Credentials ต่างๆ (Supabase, Clerk, R2, FFP)

alembic upgrade head       # สร้าง/อัปเดต database tables
uvicorn app.main:app --reload --port 8000
```

### ฝั่ง Frontend ⚛️

```bash
cd frontend
npm install

cp .env.example .env.local
# ✏️ แก้ไขไฟล์ .env.local ใส่ Clerk keys และชี้ API ไปที่ localhost หรือ Cloud Run

npm run dev        # เริ่มรัน Next.js server (http://localhost:3000)
```

### Environment Variables

#### Backend (`.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (asyncpg) |
| `CLERK_JWKS_URL` | ✅ | Clerk JWKS endpoint |
| `CLERK_SECRET_KEY` | ✅ | Clerk Backend API key |
| `R2_ENDPOINT_URL` | ✅ | Cloudflare R2 S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | ✅ | R2 access key |
| `R2_SECRET_ACCESS_KEY` | ✅ | R2 secret key |
| `R2_PUBLIC_URL` | ✅ | R2 Custom Domain (e.g. `https://cdn.mangalab-th.com`) |
| `R2_BUCKET_NAME` | ✅ | R2 bucket name |
| `APP_ENV` | ❌ | `development` (default) or `production` |
| `CORS_ORIGINS` | ❌ | Comma-separated origins |
| `FRONTEND_URL` | ❌ | For ISR revalidation webhook |
| `REVALIDATION_SECRET` | ❌ | Shared secret for revalidation |
| `PRIMARY_ADMIN_EMAIL` | ❌ | Auto-assign admin role on first login (email of primary admin) |
| `SITE_URL` | ❌ | For Google Indexing API notifications |
| `GOOGLE_INDEXING_CREDENTIALS` | ❌ | Base64-encoded Service Account JSON |
| `FFP_CUSTOMER_KEY` | ❌ | FeelFreePay customer key |
| `FFP_PUBLIC_KEY` | ❌ | FeelFreePay public key |
| `FFP_SECRET_KEY` | ❌ | FeelFreePay secret key |
| `FFP_BASE_URL` | ❌ | FeelFreePay API URL (`https://api-test.feelfreepay.com` สำหรับ testing, `https://api.feelfreepay.com` สำหรับ production) |

#### Frontend (`.env.local`)
| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL (e.g. `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret (for server-side) |
| `NEXT_PUBLIC_SITE_URL` | ❌ | Canonical site URL for SEO |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | ✅ | R2 public URL (ใช้ใน `next.config.ts` สำหรับ Image hostname) |
| `REVALIDATION_SECRET` | ❌ | Must match backend's secret |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ❌ | Google Analytics 4 Measurement ID (e.g. `G-XXXXXXXXXX`) |

---

## 🚀 คู่มือการนำขึ้นสู่ Production (Deployment)

### Backend → Google Cloud Run

```bash
cd backend
gcloud run deploy mangalabth-backend --source . --region asia-southeast1 --allow-unauthenticated
```

หรือใช้ CI/CD ผ่าน Cloud Build (`cloudbuild.yaml`) → Build Docker → Push to Artifact Registry → Deploy to Cloud Run

> **สำคัญ:** ต้อง run `alembic upgrade head` ก่อน deploy ครั้งแรก เพื่อสร้าง DB tables

### Frontend → Vercel

1. เชื่อมต่อ GitHub Repository เข้ากับ [Vercel](https://vercel.com/)
2. ตั้ง **Root Directory** เป็น `frontend`
3. ตั้งค่า Environment Variables (`NEXT_PUBLIC_API_URL`, Clerk keys, etc.)
4. Deploy!

### Production Deployment Checklist

- [ ] `alembic upgrade head` — สร้าง/อัปเดต DB tables
- [ ] ตั้ง `APP_ENV=production` — ปิด docs, restrict CORS
- [ ] ตั้ง `CORS_ORIGINS` — เฉพาะ domain จริง
- [ ] ตั้ง `REVALIDATION_SECRET` — ค่าเดียวกันทั้ง frontend + backend
- [ ] ตั้ง `SITE_URL` — สำหรับ Google Indexing API
- [ ] ตรวจ `R2_PUBLIC_URL` — must start with `https://`
- [ ] Run `python scripts/seed_coin_packages.py` — ถ้าใช้ production DB ใหม่

---

## 🔍 กลยุทธ์เจาะตลาดด้วย SEO ขั้นสุด

| เครื่องมือ SEO | รายละเอียด |
|---------------|-----------|
| **Google Indexing API** | แจ้ง Google ทันทีที่มีตอนใหม่ (Background task, ไม่ block response, URL encoded) |
| **Dynamic Sitemap** | ISR 60s, Paginated fetch, Batch chapter URLs, Full URL encoding, Graceful fallback |
| **robots.txt** | Disallow `/admin/`, `/api/`, `/account/`, `/sign-in/`, `/sign-up/` |
| **JSON-LD** | ComicSeries, BreadcrumbList, WebPage structured data |
| **OG/Twitter Cards** | Dynamic per-page metadata with cover images |
| **Thai-friendly Slugs** | Unicode support (`\u0E00-\u0E7F`), Google displays Thai in SERPs |
| **Canonical URLs** | Fully encoded, synced with Sitemap + Indexing API (prevent duplicate content) |
| **Search Page Robots** | `noindex` when query parameter present (thin content prevention) |
| **GA4 Key Events** | `unlock_chapter` + `view_coin_packages` marked as conversions |
| **URL Consistency** | Sitemap ↔ Canonical ↔ Google Indexing API ใช้ encoded URL format เดียวกัน |

---

## 📜 Utility Scripts

```bash
# Google Indexing — ส่ง sitemap URLs ทั้งหมดไปยัง Google
cd backend && python scripts/run_google_index.py

# Seed coin packages — สร้างแพ็กเกจเหรียญเริ่มต้น
cd backend && python scripts/seed_coin_packages.py

# Reset economy — รีเซ็ตยอดเหรียญ (⚠️ dev only, blocked on production)
cd backend && python scripts/reset_economy.py
```

> **Archived scripts** (one-time migrations, อยู่ใน `scripts/archive/`):
> `migrate_slugs.py`, `update_transaction_notes.py`

---

<p align="center">
  <b>MangaLabTH</b> สร้างขึ้นด้วย ❤️ สำหรับคนรักการอ่านมังงะตัวจริง <br>
  <i>(License: MIT)</i>
</p>
