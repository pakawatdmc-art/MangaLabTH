<div align="center">
  <h1>🚀 คู่มือการนำระบบขึ้นใช้งานจริง (Deployment Guide)</h1>
  <p>คู่มือฉบับสมบูรณ์สำหรับผู้ดูแลระบบ เพื่อนำ MangaLabTH ขึ้นสู่ Production Environment</p>
</div>

---

เอกสารฉบับนี้อธิบายขั้นตอนการนำระบบ **MangaLabTH** ขึ้นใช้งานจริงบน Production Environment แบบ **Full-Stack (Next.js + FastAPI)** ใน Docker Container เดียวบน Google Cloud Run 🐳

## 🏗️ สถาปัตยกรรม

```
┌─────────────────────────────────────────────┐
│          Google Cloud Run Container         │
│                                             │
│  ┌─────────────┐     ┌─────────────────┐    │
│  │  Next.js     │────▶│  FastAPI         │   │
│  │  (port 3000) │     │  (port 8000)     │   │
│  │  standalone  │◀────│  uvicorn         │   │
│  └──────┬───────┘     └─────────────────┘   │
│         │                                    │
│    Supervisord (PID 1)                       │
│    manages both processes                    │
└─────────┬───────────────────────────────────┘
          │
     Cloud Run port 3000 (public)
```

---

## 1. 📋 การเตรียมความพร้อม (Prerequisites)

ก่อนเริ่มต้นการนำระบบขึ้นใช้งานจริง กรุณาเตรียมบัญชีและทรัพยากรดังต่อไปนี้:
1. ☁️ **Google Cloud Platform (GCP):** สำหรับ Deploy Full-Stack Container
2. 🌩️ **Cloudflare:** สำหรับการจัดการ Domain, WAF และ R2 Object Storage
3. 🐘 **Supabase:** สำหรับการจัดการฐานข้อมูล PostgreSQL
4. 🔑 **Clerk:** สำหรับระบบ Authentication
5. 💳 **FeelFreePay:** สำหรับระบบ Payment Gateway
6. 📧 **Brevo:** สำหรับระบบส่งอีเมลแจ้งเตือน (Email Service)

---

## 2. 🗄️ การตั้งค่าฐานข้อมูลและพื้นที่จัดเก็บ (Database & Storage)

### 2.1 🐘 ฐานข้อมูล (Supabase PostgreSQL)
1. เข้าสู่ระบบ [Supabase](https://supabase.com/) และสร้าง Project ใหม่
2. ไปที่เมนู `Settings -> Database -> Connection string`
3. เลือก **Session Pooler (IPv4)** และคัดลอก URL
4. ⚠️ **ข้อควรระวัง:** เปลี่ยนคำนำหน้าจาก `postgresql://` เป็น `postgresql+asyncpg://` เพื่อให้แอปพลิเคชัน FastAPI สามารถเชื่อมต่อแบบ Asynchronous ได้อย่างถูกต้อง

### 2.2 📦 พื้นที่จัดเก็บไฟล์ (Cloudflare R2)
1. เข้าสู่ระบบ Cloudflare Dashboard และเลือก **R2 Object Storage**
2. สร้าง Bucket ชื่อ `factory-manga-storage`
3. ตั้งค่า **Custom Domain** เป็น `cdn.mangalab-th.com` เพื่อป้องกันการถูกบล็อกโดย WAF ในอนาคต
4. สร้าง **R2 API Token** และบันทึก `Access Key ID` รวมทั้ง `Secret Access Key`
5. ⚠️ **ข้อกำหนดสำหรับ `R2_PUBLIC_URL`:**
   - ต้องระบุโปรโตคอล `https://` (เช่น `https://cdn.mangalab-th.com`)
   - **ห้าม** ใส่เครื่องหมาย `/` ต่อท้าย (เช่น `https://cdn.mangalab-th.com/` จะทำให้ระบบทำงานผิดพลาด)

---

## 3. 🔌 การตั้งค่าบริการภายนอก (Third-Party Services)

### 3.1 🔐 ระบบ Authentication (Clerk)
1. สร้างโปรเจกต์ใหม่ในระบบ Clerk
2. คัดลอก `Publishable Key` และ `Secret Key`
3. ไปที่เมนูตั้งค่า JWT Templates เพื่อนำ `JWKS URL` มากำหนดใน Backend สำหรับตรวจสอบ Token ของผู้ใช้งาน

### 3.2 💰 ระบบ Payment Gateway (FeelFreePay)
1. เข้าสู่หน้า Profile ของ FeelFreePay และกด **Gen Token** เพื่อรับ `Customer Key`
2. คัดลอก `Public Key` และ `Secret Key` จาก Dashboard
3. *📌 หมายเหตุ: ไม่จำเป็นต้องตั้งค่า Webhook ในหน้าเว็บ FeelFreePay เนื่องจาก Backend จะทำการส่ง Webhook URL ไปพร้อมกับคำสั่งซื้อโดยอัตโนมัติ*

### 3.3 📬 ระบบส่งอีเมลแจ้งเตือน (Brevo)
1. เข้าสู่ระบบ Brevo และไปที่เมนู **SMTP & API**
2. สร้าง API Key ใหม่ และคัดลอกเก็บไว้
3. ไปที่เมนู **Senders & IPs** เพื่อเพิ่มและยืนยันอีเมลผู้ส่ง (เช่น `support@mangalab-th.com`)

---

## 4. 🚀 ขั้นตอนการนำระบบขึ้นใช้งานจริง (Deployment)

### 4.1 ⚙️ Full-Stack (Google Cloud Run)

ระบบ MangaLabTH ถูกรวมเป็น Docker Container เดียว โดย **Supervisord** จะจัดการ 2 processes:
- **Next.js** (port 3000) — Frontend + SSR
- **FastAPI** (port 8000) — Backend API (internal only)

#### ขั้นตอนที่ 1: ตั้งค่า Cloud Build Substitutions

กำหนด Build-time variables ใน Cloud Build Trigger:
```
_CLERK_PK=pk_live_xxxx
_R2_PUBLIC_URL=https://cdn.mangalab-th.com
_SITE_URL=https://mangalab-th.com
_GA_ID=G-xxxx
```

#### ขั้นตอนที่ 2: Deploy ด้วย Cloud Build

```bash
# ตัวเลือก A: Deploy ผ่าน Cloud Build trigger (แนะนำ)
# เชื่อม GitHub repo → ตั้ง trigger → push to main = auto deploy

# ตัวเลือก B: Deploy ด้วยมือ
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_CLERK_PK="pk_live_xxxx",_GA_ID="G-xxxx"
```

#### ขั้นตอนที่ 3: ตั้งค่า Environment Variables บน Cloud Run

ไปที่ Cloud Console → Cloud Run → mangalabth → Edit & Deploy New Revision → Variables:

```env
# Database
DATABASE_URL=postgresql+asyncpg://...

# Clerk
CLERK_PUBLISHABLE_KEY=pk_live_xxxx
CLERK_SECRET_KEY=sk_live_xxxx
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
PRIMARY_ADMIN_EMAIL=your_admin_email@example.com

# Cloudflare R2
R2_ENDPOINT_URL=https://xxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxxx
R2_SECRET_ACCESS_KEY=xxxx
R2_BUCKET_NAME=factory-manga-storage
R2_PUBLIC_URL=https://cdn.mangalab-th.com

# FeelFreePay
FFP_CUSTOMER_KEY=xxxx
FFP_PUBLIC_KEY=xxxx
FFP_SECRET_KEY=xxxx
FFP_BASE_URL=https://api.feelfreepay.com

# Brevo Email
BREVO_API_KEY=xkeysib-xxxx
EMAIL_FROM=MangaLabTH <support@mangalab-th.com>

# App
APP_ENV=production
SITE_URL=https://mangalab-th.com
FRONTEND_URL=https://mangalab-th.com
INTERNAL_FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=https://mangalab-th.com
REVALIDATION_SECRET=mangalabth-prod-secret-2026

# Frontend Runtime
NEXT_PUBLIC_SITE_URL=https://mangalab-th.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.mangalab-th.com
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
INTERNAL_API_URL=http://localhost:8000/api/v1
```

#### ขั้นตอนที่ 4: ตั้ง Custom Domain บน Cloud Run

1. ไปที่ Cloud Run → mangalabth → **Integrations** → **Custom Domains**
2. เพิ่มโดเมน `mangalab-th.com`
3. ทำตามขั้นตอน DNS verification
4. อัปเดต DNS record บน Cloudflare:
   - เปลี่ยน `A` หรือ `CNAME` record ของ `mangalab-th.com` ไปชี้ที่ Cloud Run
   - ⚠️ **ปิด Cloudflare Proxy (orange cloud → gray cloud)** หากใช้ Cloud Run managed SSL

#### ขั้นตอนที่ 5: รัน Database Migration

```bash
# เข้า container หรือรันจาก local ที่ต่อกับ Supabase ได้
cd backend
alembic upgrade head
```

---

## 5. 🛡️ การตั้งค่าความปลอดภัย (Security & WAF)

ตั้งค่า Cloudflare WAF เพื่อป้องกันการดึงรูปภาพไปใช้งานบนโดเมนอื่น (Anti-Scraping):

1. เข้าสู่ระบบ Cloudflare Dashboard และเลือกโดเมน `mangalab-th.com`
2. ไปที่เมนู **Security -> WAF -> Custom rules**
3. สร้าง Rule ใหม่ และเลือก **Use expression builder**
4. กำหนด Expression ดังนี้:
   ```
   (http.host eq "cdn.mangalab-th.com" and not http.referer contains "mangalab-th.com" and not http.referer contains "localhost" and not starts_with(http.request.uri.path, "/covers/"))
   ```
5. กำหนด Action เป็น **Block** และบันทึกการตั้งค่า
*📌 ผลลัพธ์: การร้องขอรูปภาพเนื้อหามังงะจากโดเมนอื่นจะถูกปฏิเสธ (403 Forbidden) แต่รูปภาพหน้าปกจะยังคงเข้าถึงได้เพื่อประโยชน์ด้าน SEO*

---

## 6. ✅ รายการตรวจสอบก่อนเปิดใช้งาน (Pre-Launch Checklist)

- [ ] ตรวจสอบ `https://mangalab-th.com/` แสดงหน้าแรกถูกต้อง 🟢
- [ ] ตรวจสอบ `https://mangalab-th.com/api/v1/manga` คืนข้อมูลมังงะ 📡
- [ ] รูปภาพจาก R2 (Custom Domain) สามารถแสดงผลบนหน้าเว็บได้ตามปกติ 🖼️
- [ ] ระบบสมัครสมาชิกและเข้าสู่ระบบผ่าน Clerk ทำงานได้อย่างถูกต้อง 👤
- [ ] บัญชี Admin สามารถเข้าถึงระบบจัดการหลังบ้านได้ (`PRIMARY_ADMIN_EMAIL`) 👨‍💻
- [ ] ทดสอบระบบเติมเหรียญ และยอดเหรียญอัปเดตในระบบอย่างถูกต้อง 🪙
- [ ] การปลดล็อกตอนมังงะทำงานได้ และหักเหรียญได้อย่างถูกต้อง 🔓
- [ ] ตั้งค่า Google Indexing API (Service Account) เรียบร้อยแล้ว 🔍
- [ ] ทดสอบระบบการส่งอีเมลแจ้งเตือนเมื่อมีการอัปเดตตอนมังงะใหม่ 📧
- [ ] Sitemap (`/sitemap.xml`) generate ได้ถูกต้อง 🗺️
- [ ] ลบ Vercel project เดิม (หลังยืนยันว่าทุกอย่างทำงานปกติ) 🗑️
