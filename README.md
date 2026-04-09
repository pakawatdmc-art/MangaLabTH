# 🌟 MangaLabTH — Premium Manga Platform & Coin Economy

ยินดีต้อนรับสู่ **MangaLabTH** 🚀 แพลตฟอร์มอ่านมังงะออนไลน์ยุคใหม่ที่ยกระดับประสบการณ์การอ่านไปอีกขั้น!

โปรเจกต์นี้ไม่ใช่แค่เว็บไซต์อ่านการ์ตูนธรรมดา แต่เป็น **Full-Stack Application** แบบครบวงจรที่ถูกคราฟต์ขึ้นมาด้วยสถาปัตยกรรมระดับ Enterprise และเทคโนโลยี Cloud-native ล่าสุด เพื่อรองรับผู้อ่านจำนวนมหาศาล พร้อมผสานระบบเศรษฐกิจเหรียญ (Coin Economy) ที่แม่นยำ ปลอดภัย และไร้รอยต่อ

---

## ⚡ จุดเด่นที่ทำให้เราแตกต่าง (Engineering Highlights)

- ⚡ **เร็วทะลุจอ (Real-time & Lightning Fast)**: ขับเคลื่อนด้วย Next.js 16 (App Router) และเทคนิคอัปเดตข้อมูลแบบ ISR ทำให้โหลดหน้าเว็บได้ในพริบตา (LCP < 1 วินาที) มอบประสบการณ์ที่ลื่นไหลขั้นสุด
- 🛡️ **ระบบเหรียญที่เชื่อถือได้ 100% (Atomic Transactions)**: ลาก่อนปัญหาหักเหรียญซ้ำซ้อน! เราใช้ระบบล็อกข้อมูลระดับ Database (`SELECT FOR UPDATE`) จัดการทุกธุรกรรมทางการเงินอย่างเฉียบขาด ปลอดภัยแม้มีคนกดซื้อตอนมังงะพร้อมกันเป็นหมื่นคน
- ☁️ **Cloud Pipeline อัจฉริยะ**: อัปโหลดปุ๊บ แปลงเป็น WebP ปั๊บ! จัดการไฟล์ภาพทั้งหมดผ่านสถาปัตยกรรม S3-compatible (Cloudflare R2) ที่โหลดรูปได้เร็วปรี๊ด ประหยัดแบนด์วิดท์ และรองรับการขยายตัวระดับโลก
- ⏰ **ระบบปลดเวลาอ่านฟรีอัจฉริยะ (Automated Timed Unlocks)**: มิติใหม่ของการจัดการเนื้อหา! รองรับระบบ Timezone แบบเป๊ะปัง ไม่มีคลาดเคลื่อน ระบบหน้าบ้านและหลังบ้านซิงค์กันแบบ Real-time ปลดล็อกตอนให้อ่านฟรีทันทีเมื่อตัวนับถอยหลังสิ้นสุด
- 🔍 **สุดยอดปรมาจารย์ด้าน SEO**: ผสานพลังเข้ากับ Google Indexing API แจ้งเตือนบอทของ Google ให้มาเก็บข้อมูลทันทีที่มีการอัปเดตตอนใหม่ แถมจัดเต็มด้วย JSON-LD Structured Data และ Dynamic Sitemap ที่ครอบคลุมเนื้อหาทุกหน้าอย่างสมบูรณ์แบบ

---

## 🏗️ สถาปัตยกรรมระบบ (Tech Stack & Architecture)

เราเลือกใช้เครื่องมือที่ดีที่สุดในแต่ละด้าน เพื่อสร้างสถาปัตยกรรมที่แข็งแกร่งและดูแลรักษาง่าย:

```
mangaFactory/
├── frontend/     # Next.js 16 (App Router) → Vercel
├── backend/      # FastAPI (Python) → Google Cloud Run
├── .gitignore
└── README.md
```

| ส่วนของระบบ | เทคโนโลยีที่ใช้ | ผู้ให้บริการ Hosting |
|-----------|----------------|----------------------|
| **Frontend** | Next.js 16 (App Router), Tailwind CSS v4, Clerk | **Vercel** |
| **Backend** | FastAPI, SQLModel, Pydantic v2, Alembic | **Google Cloud Run (Docker)** |
| **Database** | PostgreSQL (IPv4 Session Pooler) | **Supabase** |
| **Storage** | Cloudflare R2 (S3-compatible, boto3) | **Cloudflare R2** |
| **Payments** | FeelFreePay (PromptPay QR / TrueWallet) | **FeelFreePay** |
| **Auth** | Clerk (JWT + RBAC) | **Clerk** |

---

## 🎯 ฟีเจอร์ชูโรง (Key Features)

### 📖 ฝั่งผู้อ่าน (Reader Experience)
- **UI/UX ดีไซน์พรีเมียม**: อินเทอร์เฟซสไตล์ Dark Mode หรูหรา (Glassmorphism + Gold accents) จัดเรียงเลย์เอาต์มาอย่างดีเพื่อให้ทุกการ "ไถจอ" ทั้งบนมือถือและคอมพิวเตอร์เป็นไปอย่างสะดวกลื่นไหล
- **ระบบค้นหาและตัวกรองสุดล้ำ**: ค้นหาเรื่องที่ใช่ แนวที่ชอบ ได้ตรงใจและรวดเร็ว
- **Premium Chapter Gate**: หน้าต่างแจ้งเตือนก่อนอ่านตอนติดเหรียญ พร้อมตัวจับเวลานับถอยหลังดีไซน์สวยงามที่จะรีเฟรชเปิดเนื้อหาให้ดูฟรีอัตโนมัติเมื่อหมดเวลา 
- **ระบบสมาชิกที่สมบูรณ์แบบ**: ล็อกอินผ่านอีเมลหรือโซเชียลได้อย่างปลอดภัย เติมเหรียญ ดูประวัติการใช้จ่ายได้สบายใจไร้กังวล

### ⚙️ ฝั่งผู้ดูแลระบบ (Admin Superpowers)
- **Dashboard สถิติครบจบในหน้าเดียว**: ติดตามยอดเข้าชมและยอดขายได้แบบ Real-time
- **Master Upload Pipeline**: ประหยัดเวลาทำมาหากินไปได้เยอะ! ด้วยระบบอัปโหลดหน้าที่รองรับการทำงานแบบขนาน (Parallel Processing) ย่อขนาดและเรียงลำดับให้อัตโนมัติ
- **ระบบตั้งเวลาปล่อยตอนล่วงหน้า**: บริหารงานง่ายๆ แค่ตั้งเวลากำหนดปล่อยให้อ่านฟรี ระบบจะจัดการอัปเดตสถานะและแจ้งเตือนผู้ใช้งานให้เสร็จสรรพ
- **Auto-SEO Bot**: แอดมินมีหน้าที่แค่ลงเนื้อหา ที่เหลือระบบหลังบ้านจะวิ่งไปเคาะประตูเรียก Google ให้มา Index หน้าเว็บด้วยตัวเอง!

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

alembic upgrade head
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

---

## 🚀 คู่มือการนำขึ้นสู่ Production (Deployment Workflow)

### Backend → Google Cloud Run
ระบบถูกออกแบบมาให้ทำ Containerization ได้อย่างสมบูรณ์ แค่สั่ง Deploy เซิร์ฟเวอร์ก็จะรันอัตโนมัติ:

1. ล็อกอินเข้า Google Cloud: `gcloud auth login`
2. สร้าง Google Cloud Project และตั้งค่า Billing
3. เตรียมตัวสั่งขึ้น Cloud:
   ```bash
   cd backend
   gcloud run deploy mangalabth-backend --source .
   ```
4. เลือก Region โปรด (แนะนำ `asia-southeast1` สิงคโปร์ เพื่อความแรงในไทย)
5. เปิด Allow Unauthenticated เพื่อให้ Frontend ดึงข้อมูลได้
6. ตั้งค่า Environment Variables ในหน้า Dashboard ของ Cloud Run ให้ครบถ้วน
7. *Tip:* เราตั้งค่า `ProxyHeadersMiddleware` ไว้แล้ว พร้อมรองรับ IP จาก Load Balancer ของ Google แน่นอน!

### Frontend → Vercel
Vercel เกิดมาเพื่อ Next.js งานนี้ง่ายเหมือนปอกกล้วย:

1. เชื่อมต่อ GitHub Repository นี้เข้ากับ [Vercel](https://vercel.com/)
2. ปรับ **Root Directory** เป็นโฟลเดอร์ `frontend`
3. ตั้งค่า Variables รหัสลับต่างๆ รวมถึง `NEXT_PUBLIC_API_URL` ที่ชี้ไปยัง Cloud Run
4. กด  `Deploy` แล้วรอชื่นชมผลงานได้เลย!

---

## 🛡️ มาตรการรักษาความปลอดภัย (Security First)

เราให้ความสำคัญกับข้อมูลและเงินของลูกค้าเป็นอันดับ 1:

- **การยืนยันตัวตนระดับโลก**: ใช้ Clerk จัดการ JWT ทันสมัยพร้อมระบบดึงคีย์อัตโนมัติ (JWKS rotation)
- **ปกป้องกระเป๋าเงิน (Double-Spend Protection)**: วางฐานข้อมูลเหนียวแน่นด้วยระบบ Unique Index สำหรับธุรกรรม และระบบล็อกเพื่อควบคุมการเติมเหรียญ
- **ความปลอดภัยในการอัปโหลดไฟล์**: เช็คยันอณูไฟล์ (Magic byte validation) ป้องกันช่องโหว่ Path traversal และจำกัดเฉพาะไฟล์รูปจริงเท่านั้น
- **จัดการกับปัญหาตีบตัน (Rate Limiting & Backoff)**: มีเกราะป้องกันสแปมที่หน้าล็อกอินและชำระเงิน พร้อมระบบลองเชื่อมต่อใหม่ (Retry mechanism) เมื่ออินเทอร์เน็ตมีปัญหา

---

## 🔍 กลยุทธ์เจาะตลาดด้วย SEO ขั้นสุด

เราไม่ได้ทำแค่เว็บให้ใช้งานได้ แต่ทำเว็บให้คน **ค้นหาเจอ**:

| เครื่องมือ SEO ของเรา | มันคืออะไรและช่วยอะไรได้บ้าง? |
|--------------------|----------------------------|
| **Auto Google Ping API** | ไม่ง้อการอัปเดตแบบรอวันรอคืน! ทันทีที่มีตอนใหม่ ระบบหลังบ้านจะกระซิบผ่าน Indexing API ให้บอท Google วิ่งมาเก็บข้อมูลตรงๆ |
| **Sitemap แสนรู้** | แผนที่เว็บแบบ Dynamic ที่ดึงข้อมูลทุกซอกทุกซอย รวมถึง "ตอนย่อยทุกตอน" (Parallel batch logic) ออกมาให้กูเกิลเห็นแบบเต็มขบวน |
| **Rich Snippets อลังการ** | การใส่ JSON-LD โครงสร้างข้อมูล (เช่น ComicSeries พร้อมเรทติ้งและ Genre) เพื่อให้ผลค้นหาดูน่าดึงดูดเตะตาผู้อ่านมากกว่าเว็บคู่แข่ง |
| **แชร์สนุกผ่าน Social (OG Cards)** | จะแชร์เรื่องไหน หรือแง้มตอนใด ภาพหน้าปกสุดสวยพร้อมแคปชั่นจะถูกหยิบไปโชว์ให้เพื่อนๆ เห็นบน Facebook/Twitter อัตโนมัติ |
| **Friendly URL & Canonical** | ระบบจัดแจงลิงก์ภาษาไทยให้สวยงาม และกันปัญหาเนื้อหาซ้ำซ้อนอย่างหมดจด |

*(อ่านแผนผัง Endpoint API จำนวน 30+ รายการแบบละเอียด รบกวนตรวจสอบในโค้ดฝั่ง Backend)*

---

<p align="center">
  <b>MangaLabTH</b> สร้างขึ้นด้วย ❤️ สำหรับคนรักการอ่านมังงะตัวจริง <br>
  <i>(License: MIT)</i>
</p>
