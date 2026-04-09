# MangaLabTH - แพลตฟอร์มมังงะระดับพรีเมียมและระบบเศรษฐกิจเหรียญ (Coin Economy)

**MangaLabTH** คือแพลตฟอร์มเนื้อหาดิจิทัลแบบ Full-Stack ประสิทธิภาพสูงที่ออกแบบตามมาตรฐานเว็บสมัยใหม่ โปรเจกต์นี้แสดงถึงการตัดสินใจทางวิศวกรรมซอฟต์แวร์ระดับ Enterprise รวมถึงระบบอัตโนมัติแบบ Real-time, การจัดการธุรกรรมแบบ Atomic และสถาปัตยกรรมแบบ Cloud-native

---

## 🚀 จุดเด่นทางวิศวกรรมซอฟต์แวร์ (Engineering Highlights)

- **การค้นหาและแสดงผลแบบ Real-time**: ปรับแต่งการดึงข้อมูล Metadata ด้วย Next.js 16 Server Components และ ISR (Incremental Static Regeneration) ทำให้ได้ค่า LCP (Largest Contentful Paint) ต่ำกว่า 1 วินาที
- **ธุรกรรมการเงินที่แม่นยำ (Atomic Transactions)**: ระบบเหรียญ (Coin Economy) ที่ใช้ PostgreSQL `SELECT FOR UPDATE` เพื่อล็อคข้อมูลขณะทำธุรกรรม รับประกันความถูกต้องของข้อมูล (Data Integrity) และป้องกันปัญหาการจ่ายเงินซ้ำซ้อน (Double-spending) ในสภาวะที่มีการใช้งานพร้อมกันจำนวนมาก
- **ระบบจัดการทรัพยากรบน Cloud อัตโนมัติ**: Pipeline จัดการรูปภาพที่แปลงไฟล์เป็น WebP ทันทีที่อัปโหลด และให้บริการผ่าน Cloudflare R2 (S3-compatible) เพื่อความรวดเร็วในการโหลดและการขยายตัว (Scalability) ระดับสากล
- **การบูรณาการ SEO ขั้นสูง**: เชื่อมต่อ Google Indexing API (ผ่าน Service Accounts) เพื่อแจ้งเตือน Google Bot ให้เข้ามาเก็บข้อมูลทันทีที่มีการอัปเดต พร้อมระบบ JSON-LD Structured Data ที่สมบูรณ์ + Sitemap ครอบคลุมทุกตอนมังงะ
- **ระบบปลดล็อคเนื้อหาตามเวลาอัตโนมัติ**: ระบบวางแผนการเผยแพร่เนื้อหาที่ซิงค์เวลามาตรฐาน UTC อย่างซับซ้อน (Timed Chapter Unlocks) พร้อมระบบ Hydration หน้าบ้านแบบ Real-time และ persist ลง DB อัตโนมัติเมื่อถึงเวลา
- **Timezone Standardization (Asia/Bangkok)**: ระบบแสดงวันที่/เวลาทั้งหมดเป็นเวลาไทย (UTC+7) โดยใช้ `parseUTCDate()` utility กลาง + `thaiDatetimeToUTC()` สำหรับ Admin form → ไม่ขึ้นกับ browser timezone

---

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
| Database | Supabase PostgreSQL (IPv4 Session Pooler) | **Supabase** |
| Storage | Cloudflare R2 (S3-compatible, boto3) | **Cloudflare R2** |
| Payments | FeelFreePay (PromptPay QR / TrueWallet) | FeelFreePay |
| Auth | Clerk (JWT + RBAC) | Clerk |

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — fill in Supabase, Clerk, R2, FFP credentials

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
6. ใส่ Environment Variables (เช่น `DATABASE_URL`, `CLERK_SECRET_KEY`, `R2_...`, `FFP_...`) ผ่าน Cloud Console หรือ CLI argument
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
- **Home** — หน้าแรก — Hero, manga grid, ค้นหา, กรองข้อมูล, แบ่งหน้า (Premium Floating UI และรองรับการไถจอแนวนอนในมือถือ)
- **Search** — ระบบค้นหา — กรองข้อมูลขั้นสูง (หมวดหมู่, สถานะ, การเรียงลำดับ)
- **Manga Detail** — รายละเอียดมังงะ — ปก, ข้อมูล, รายชื่อตอนพร้อมระบบราคาเหรียญ และ UI นับถอยหลังอ่านฟรีแบบ Real-time ที่รองรับมือถือ
- **Chapter Reader** — หน้าอ่านมังงะ — ไถจอแนวตั้ง, ระบบโหลดภาพแบบ Lazy Load, แถบสถานะการอ่าน, รองรับคีย์บอร์ด และระบบกั้นเนื้อหา (Premium Gate) พร้อมนับถอยหลังรีเฟรชอัตโนมัติ
- **SEO & Metadata** — กลยุทธ์ SEO ครบวงจร — หน้าเฉพาะตามหมวดหมู่, Sitemap XML แบบ Dynamic, JSON-LD Schemas, ระบบ Canonical links, ป้ายแบนเนอร์ Open Graph อัตโนมัติ และระบบ Indexing สำหรับตอนติดเหรียญเพื่อดักจับ Traffic
- **Coins** — ระบบเหรียญ — แพ็กเกจการซื้อ, ประวัติการทำรายการ
- **Auth** — ระบบยืนยันตัวตน — Clerk sign-in/sign-up พร้อมระบบแบ่งสิทธิ์ (RBAC)

### Admin (แอดมิน)
- **Dashboard** — แผงควบคุม — ภาพรวมสถิติ
- **Manga CRUD** — จัดการมังงะ — สร้าง, แก้ไข, ลบข้อมูลมังงะ
- **Chapter CRUD** — จัดการตอน — จัดการเนื้อหา, ราคา และระบบตั้งเวลาปลดล็อคอ่านฟรีอัตโนมัติ (UI พรีเมียม: Glassmorphism + สีทอง + ปฏิทินที่ปรับแต่งพิเศษ)
- **Upload Pipeline** — ระบบอัปโหลดขั้นสูง — รองรับการอัปโหลดแบบขนาน (Parallel Processing) และการแปลงไฟล์เป็น WebP บนเซิร์ฟเวอร์ก่อนส่งขึ้น R2
- **User Governance** — การจัดการผู้ใช้ — ระบบแบ่งสิทธิ์ (RBAC) ที่แข็งแกร่ง พร้อมลำดับขั้นการอนุมัติสำหรับ Master Admin
- **Real-time Data Observation** — การตรวจสอบข้อมูลแบบ Real-time — วิเคราะห์ยอดขายและยอดการเข้าชมผ่านข้อมูลอนุกรมเวลา (Time-series data)
- **RPA Indexing Automation** — ระบบแจ้งเตือนบอทอัตโนมัติ — ใช้ Background Worker ในการอัปเดต Google Search Console ทันทีผ่าน Service Account JWTs.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint |
| `R2_ENDPOINT_URL` | `https://<account_id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | R2 public bucket URL (e.g. `https://pub-xxx.r2.dev`) |
| `FFP_CUSTOMER_KEY` | FeelFreePay Customer Key |
| `FFP_PUBLIC_KEY` | FeelFreePay Public Key |
| `FFP_SECRET_KEY` | FeelFreePay Secret Key |
| `FFP_BASE_URL` | FeelFreePay API Base URL |
| `APP_ENV` | `development` or `production` |
| `CORS_ORIGINS` | Comma-separated allowed origins (URL ของ Vercel) |
| `FRONTEND_URL` | URL ของ Vercel (สำหรับการสั่ง Revalidate Cache) |
| `REVALIDATION_SECRET` | รหัสผ่านลับสำหรับสั่งเคลียร์ Cache |
| `SITE_URL` | URL ของเว็บไซต์จริง เช่น `https://mangalab-th.com` (ใช้สำหรับ Auto Google Ping — **ต้องตั้งค่าบน Cloud Run**) |
| `GOOGLE_INDEXING_CREDENTIALS` | ข้อมูลจากไฟล์ Service Account (.json) เพื่อใช้ระบบลัดคิว Google Indexing API |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route (`/sign-up`) |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | R2 public bucket URL |
| `NEXT_PUBLIC_SITE_URL` | Base URL ของเว็บไซต์จริง (เช่น `https://mangalabth.com` ใช้ใน robots.ts / SEO) |
| `REVALIDATION_SECRET` | รหัสผ่านลับสำหรับยืนยันรับคำสั่ง เคลียร์ Cache |

## API Reference

<details>
<summary>คลิกเพื่อเปิดดู — <b>34 Endpoints</b></summary>

### Manga

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/manga` | Optional | List manga (paginated, filtered by category/status/search) |
| `GET` | `/v1/manga/ranking/{period}` | Optional | Manga ranking (weekly/monthly/all_time) |
| `GET` | `/v1/manga/slug/{slug}` | Optional | Manga detail by slug (records view) |
| `GET` | `/v1/manga/{id}` | Optional | Manga detail by ID (records view) |
| `POST` | `/v1/manga` | Admin | Create manga |
| `PATCH` | `/v1/manga/{id}` | Admin | Update manga (auto-deletes old cover from R2) |
| `DELETE` | `/v1/manga/{id}` | Admin | Delete manga + all chapters/pages from R2 |

### Chapters & Pages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/chapters` | Admin | List all chapters across all manga |
| `GET` | `/v1/chapters/manga/{id}` | Optional | List chapters for a specific manga |
| `GET` | `/v1/chapters/{id}` | Optional | Chapter detail with pages (coin-gated) |
| `POST` | `/v1/chapters/manga/{id}` | Admin | Create chapter |
| `PATCH` | `/v1/chapters/{id}` | Admin | Update chapter |
| `DELETE` | `/v1/chapters/{id}` | Admin | Delete chapter + pages from R2 |
| `PUT` | `/v1/chapters/{id}/pages` | Admin | Replace all pages (reorder/re-upload) |
| `POST` | `/v1/chapters/{id}/pages` | Admin | Add pages to chapter |

### Upload (R2)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/v1/upload/presigned` | Admin | Generate presigned R2 PUT URLs |
| `POST` | `/v1/upload/cover` | Admin | Upload cover (proxy + WebP auto-convert) |
| `POST` | `/v1/upload/chapter_page` | Admin | Upload chapter page (proxy + WebP) |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/users/me` | User | Current user profile |
| `PATCH` | `/v1/users/me` | User | Update own profile |
| `GET` | `/v1/users` | Admin | List all users |
| `PATCH` | `/v1/users/{id}` | Admin | Update user role/balance |
| `GET` | `/v1/users/stats` | Admin | Dashboard stats |

### Transactions (Coin Economy)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/transactions/me` | User | My transaction history |
| `GET` | `/v1/transactions` | Admin | All transactions |
| `POST` | `/v1/transactions/unlock` | User | Unlock chapter (atomic coin deduction) |
| `POST` | `/v1/transactions/admin/grant` | Admin | Grant coins to user |

### Payments (FeelFreePay)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/payments/packages` | Public | List available coin packages |
| `POST` | `/v1/payments/checkout` | User | Create Payment session (QR / TrueWallet) |
| `POST` | `/v1/payments/webhook` | System | Webhook handler |
| `POST` | `/v1/payments/confirm` | User | Confirm checkout |

### Settings & Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v1/analytics/views` | Admin | View analytics chart data + summary |
| `GET` | `/v1/settings/theme` | Public | Get current global theme |
| `POST` | `/v1/settings/theme` | Admin | Set global theme |

</details>

## SEO & Google Indexing

### สิ่งที่ทำไปแล้ว ✅

| ฟีเจอร์ | ไฟล์ที่เกี่ยวข้อง | รายละเอียด |
|---------|-------------------|------------|
| **Auto Google Ping** | `backend/app/services/google_notify.py` | เมื่อเพิ่มมังงะ / ตอนใหม่ / แก้ไขหน้า → ระบบจะ Ping Google Sitemap อัตโนมัติผ่าน Background Task (ไม่บล็อก API) |
| **Dynamic Sitemap** | `frontend/src/app/sitemap.ts` | สร้าง XML แบบ Dynamic (force-dynamic + ISR 60s) ดึงมังงะ + **ตอนมังงะทุกตอน** จาก API ครบถ้วน (parallel batch) + หมวดหมู่ + static pages + `/coins` |
| **Robots.txt** | `frontend/src/app/robots.ts` | Disallow: `/admin/`, `/api/`, `/_next/`, `/account/`, `/profile/`, `/sign-in/`, `/sign-up/` |
| **JSON-LD Organization + WebSite** | `frontend/src/app/layout.tsx` | SearchAction (กล่องค้นหาใน Google), Organization schema |
| **JSON-LD ComicSeries** | `frontend/src/app/(reader)/manga/[slug]/page.tsx` | Schema สำหรับ rich snippets เมื่อค้นหาชื่อการ์ตูน (รวม `genre` + `datePublished` + `dateModified`) |
| **JSON-LD BreadcrumbList** | manga detail, chapter reader, category pages | โครงสร้างนำทางใน Google Search Results |
| **Canonical URLs** | chapter reader + manga detail + category pages | ป้องกัน Duplicate Content จาก URL encoding ภาษาไทย |
| **OG + Twitter Card (Manga)** | `frontend/src/app/(reader)/manga/[slug]/page.tsx` | ภาพ Preview ปกมังงะเวลาแชร์ลิงก์หน้า manga detail |
| **OG + Twitter Card (Chapter)** | `frontend/src/app/(reader)/[slug]/[chapterSlug]/page.tsx` | ภาพ Preview ปกมังงะเวลาแชร์ลิงก์ตอนมังงะ |
| **OG Image** | `frontend/public/og-default.png` | ภาพ Preview fallback เวลาแชร์ลิงก์ใน Social Media |
| **Category Pages** | `frontend/src/app/(reader)/category/[slug]/page.tsx` | หน้าเฉพาะสำหรับแต่ละหมวดหมู่ พร้อม SEO metadata + SSG |
| **Footer SEO Links** | `frontend/src/components/Footer.tsx` | Server Component + Internal links ไปหา**ทุกหมวดหมู่ (11 หมวด)** (Mobile 2-Column Responsive Layout) |
| **Search noindex** | `frontend/src/app/(reader)/search/page.tsx` | หน้าค้นหาที่มี query string จะ `noindex` ป้องกัน Google เก็บซ้ำ |
| **Premium Chapter Indexing**| `frontend/src/app/(reader)/[slug]/[chapterSlug]/page.tsx` | เปิดให้ Google ค้นเจอหน้าตอนที่ต้องเสียเงินซื้อ เพื่อดึงดูดคนอ่านให้เข้ามาเปย์ล่วงหน้า (กระตุ้น Traffic) |
| **Google Indexing API (VIP)** | `backend/app/services/google_notify.py` | ยิง POST ผ่าน Service Account แทรกคิวเข้าไปที่ Google โดยตรงเมื่อมีการแก้ไขมังงะ/ตอนใหม่ |
| **Real-time Free Unlock Ping**| `backend/app/api/v1/chapters.py` | ทันทีที่การนับถอยหลังของตอนสิ้นสุดลง ระบบหน้าบ้านจะ Ping ไปบอก Backend ให้ยิงแจ้ง Google อัตโนมัติ (Background Task) ว่าตอนนี้ฟรีแล้ว! |

### Auto Google Notification Flow

```
Admin อัปโหลดตอนใหม่
  → Backend API ตอบ 201 Created ทันที
  → Background Task: revalidate_paths (เคลียร์ Cache Vercel)
  → Background Task: notify_google_updated
      → ⚡ publish_to_indexing_api (ยิงคำสั่ง URL_UPDATED ขอ Google อัปเดตทันที)

ตอนมังงะหมดเวลา Timed Unlock
  → Frontend countdown ถึง 0 → router.refresh()
  → Backend GET /chapters/{id} → persist is_free=true ลง DB
  → Background Task: revalidate_paths + notify_google_updated
      → ⚡ Google ได้รับแจ้งว่าตอนนี้ฟรีแล้ว
```

### Deployment Checklist (สำคัญ — ต้องทำ)

- [ ] **ตั้งค่า `SITE_URL` บน Google Cloud Run** — ค่าต้องเป็น `https://mangalab-th.com` (ถ้าไม่ตั้ง ระบบ Auto Ping จะข้ามการทำงาน)
- [ ] **ยืนยันเว็บบน Google Search Console** — ไปที่ [search.google.com/search-console](https://search.google.com/search-console) → เพิ่ม Property `https://mangalab-th.com` → ยืนยันตัวตน
- [ ] **ส่ง Sitemap** — ใน Search Console → เมนู Sitemaps → กรอก `sitemap.xml` → กด Submit
- [ ] **ตรวจสอบว่า Sitemap แสดงมังงะ + ตอนมังงะครบ** — เปิด `https://mangalab-th.com/sitemap.xml` ต้องเห็นรายการมังงะทุกเรื่อง + ทุกตอน
- [ ] **ตั้งค่า Google Indexing API** — ใส่ค่า `GOOGLE_INDEXING_CREDENTIALS` (JSON string) ลงใน Environment Variable ของ Cloud Run และต้องเอา Email ของ Service Account ไปแอดเป็น "Owner" ใน Search Console ด้วย

### TODO ในอนาคต 📋

- [x] ~~**Sitemap Pagination** — เมื่อมังงะเกิน 100 เรื่อง ต้องเพิ่ม logic ดึงหลายหน้าใน sitemap~~ ✅ **เสร็จแล้ว** (paginated fetch + chapter-level URLs)
- [ ] **Sitemap Index** — เมื่อ URLs รวมเกิน 50,000 (มังงะ × ตอน) ต้องแบ่งเป็น sitemap index + sitemap ย่อย
- [ ] **Blog/Article Section** — สร้างหน้าบทความ "แนะนำมังงะ" เพื่อดักจับ keyword ยาวๆ (Long-tail SEO)
- [ ] **Review/Rating Schema** — เพิ่ม AggregateRating ใน JSON-LD เพื่อแสดงดาวคะแนนบน Google
- [ ] **Structured Data Testing** — ทดสอบเว็บผ่าน [Google Rich Results Test](https://search.google.com/test/rich-results) เป็นประจำ

## Security Features

- **Authentication:** Clerk JWT (RS256 + JWKS rotation)
- **RBAC:** Reader / Admin roles with `require_admin` dependency
- **Rate Limiting:** slowapi on upload and payment endpoints (Confirm endpoint protected)
- **Upload Security:**
  - V5: Path traversal prevention (regex + null byte + `..` check)
  - V10: Magic byte validation (verifies actual file header, not just Content-Type)
  - WebP auto-conversion via Pillow
- **Payments:** 
  - Atomic coin mutations with `SELECT ... FOR UPDATE` (prevents double-spend)
  - **Double-Unlock Protection:** Partial Unique Index on `(user_id, chapter_id)` in Transactions
  - **Admin Safety:** coin_balance protected - must use Admin Grant endpoint (Audit Logged)
- **FeelFreePay:** Secure webhook verification and payment processing integration
- **Performance:**
  - **Clerk Caching:** TTLCache on backend for user profiles (reduces external API calls)
  - **Database Resilience:** Systemic scrubbing of timezone logic mapping across Pydantic schemas -> PostgreSQL naive format (`replace(tzinfo=None)`) ensuring 100% stable UTC operations.
- **Timezone Architecture:**
  - **Backend:** เก็บ datetime เป็น UTC naive (standard) — Pydantic schemas strip tzinfo ก่อน save
  - **Frontend → Display:** `parseUTCDate()` utility แปลง UTC naive → Date object + แสดงผลด้วย `timeZone: 'Asia/Bangkok'` เสมอ
  - **Frontend → Admin Input:** `thaiDatetimeToUTC()` utility แปลง datetime-local (เวลาไทย) → UTC ISO string โดยไม่พึ่ง browser timezone
  - **ไฟล์ที่เกี่ยวข้อง:** `frontend/src/lib/utils.ts` — ทุกไฟล์ใช้ utility กลาง ไม่มี `+ "Z"` กระจายอยู่
- **Frontend API Logic:** Exponential backoff retry for transient network errors.
- **IP Detection:** X-Forwarded-For aware (for accurate analytics behind Cloud Run LB).

## Database Schema

```
mangas ──< chapters ──< pages
users ──< transactions >── chapters
mangas ──< daily_manga_views
coin_packages
system_settings
```

| Table | Description |
|-------|-------------|
| `mangas` | Manga metadata (title, slug, category, cover, views) |
| `chapters` | Chapter data (number, coin_price, is_free, **unlocks_at**) |
| `pages` | Page images (R2 URLs, dimensions, order) |
| `users` | User profiles linked to Clerk (roles, coin balance) |
| `transactions` | Immutable ledger for all coin movements |
| `coin_packages` | Predefined FeelFreePay purchase packages |
| `daily_manga_views` | Per-manga per-day view aggregation |
| `system_settings` | Key-value store (global theme) |

## License

MIT
