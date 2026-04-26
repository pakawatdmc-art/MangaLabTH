<div align="center">
  <h1>🌟 MangaLabTH: The Enterprise Manga Platform</h1>
  <p><i>"เมื่อเว็บอ่านการ์ตูนธรรมดาไม่ตอบโจทย์ เราจึงสร้างอาณาจักรใหม่ที่เร็วกว่า ปลอดภัยกว่า และเหนือชั้นกว่า"</i></p>
</div>

---

## 📖 The Vision: จุดเริ่มต้นของโปรเจกต์นี้

ในยุคที่เว็บอ่านมังงะส่วนใหญ่โหลดช้า โดนขโมยรูปภาพ (Scraping) ได้ง่ายดาย และระบบตัดเหรียญที่มักจะมีปัญหาหักเงินซ้ำซ้อนเวลาคนอ่านแห่กันเข้ามาพร้อมกันหลักหมื่นคน... 

เราจึงตัดสินใจสร้าง **MangaLabTH** 🚀 
นี่ไม่ใช่แค่เว็บไซต์อ่านการ์ตูน แต่มันคือ **Full-Stack Application** ที่ถูกหล่อหลอมขึ้นมาจากสถาปัตยกรรมระดับ Enterprise ผสานกับระบบ Cloud-native สมัยใหม่ เพื่อมอบประสบการณ์การอ่านที่ลื่นไหลที่สุด พร้อมด้วยระบบเศรษฐกิจเหรียญ (Coin Economy) ที่แข็งแกร่งดั่งหินผา

---

## 🏰 The Engine: ขุมพลังเบื้องหลัง (Architecture)

เพื่อให้รองรับนักอ่านจำนวนมหาศาล ระบบจึงถูกแบ่งออกเป็นส่วนๆ อย่างชัดเจน เหมือนมีหน้าร้านที่สวยงาม และมีโรงงานหลังบ้านที่ทรงพลัง:

```mermaid
graph TD
    subgraph "✨ The Frontend (Vercel)"
        UI[Next.js 16.2.4 App Router]
        Tailwind[Tailwind CSS v4]
    end

    subgraph "🏭 The Backend (Google Cloud Run)"
        API[FastAPI Python]
        DB[(PostgreSQL via Supabase)]
    end

    subgraph "🛡️ The Fortresses (External Services)"
        Storage[Cloudflare R2 + WAF]
        Auth[Clerk Auth]
        Pay[FeelFreePay Gateway]
        SEO[Google Indexing API]
    end

    Reader((ผู้อ่าน)) -->|เข้าชมเว็บ| UI
    UI <-->|ดึงข้อมูล (ISR/REST)| API
    UI -->|โหลดรูปภาพ (CDN)| Storage
    UI -->|ล็อกอิน| Auth
    API <-->|จัดการข้อมูล| DB
    API -->|รับชำระเงิน| Pay
    API -->|ดันอันดับ Google| SEO
```

| พลังวิเศษ | เทคโนโลยีที่เลือกใช้ | หน้าที่หลัก |
|-----------|----------------|-------------|
| **ความเร็วแสง** | Next.js 16.2.4 + Turbopack | โหลดหน้าแรกในเสี้ยววินาที (LCP < 1s) |
| **สมองกล** | FastAPI + Python | ประมวลผลตรรกะทั้งหมดอย่างรวดเร็ว |
| **ตู้เซฟเหล็ก** | PostgreSQL (Supabase) | เก็บข้อมูลและล็อกธุรกรรมการเงิน |
| **โกดังไร้ก้น** | Cloudflare R2 | เก็บภาพมังงะ แปลง WebP อัตโนมัติ |
| **นายทวาร** | Clerk | ตรวจสอบตัวตนและจัดการสิทธิ์ (RBAC) |
| **นักธนาคาร** | FeelFreePay | รับจ่ายเงิน PromptPay/TrueWallet |

---

## ⚡ The Magic: ฟีเจอร์ระดับพลังพิเศษ

### 🛡️ โล่ป้องกันการดูดวิญญาณ (Anti-Scraping Level 5)
หมดยุคที่บอทจะมาขโมยรูปไปลงเว็บอื่น! เราสร้างเกราะป้องกันหลายชั้น:
- **Cloudflare WAF Custom Rules**: บล็อกการเข้าถึงรูปภาพจากเว็บอื่นโดยสมบูรณ์ หากไม่มี `Referer` ที่ถูกต้อง
- **Frontend Image Protection**: ซ่อน URL รูปภาพ, ห้ามคลิกขวา, ห้ามลากรูป (Drag & Drop)

### ⚖️ สัจจะแห่งการเงิน (Atomic Transactions)
ด้วยระบบ `SELECT FOR UPDATE` ระดับ Database ทุกการซื้อเหรียญและการปลดล็อกตอนจะถูกล็อกเป็นคิว (Queue) อย่างแม่นยำ แม้คนหมื่นคนจะกดปลดล็อกการ์ตูนตอนเดียวกันในเสี้ยววินาที ระบบก็จะไม่หักเงินซ้ำซ้อนหรือติดลบเด็ดขาด

### ⏱️ ประตูมิติเวลา (Automated Timed Unlocks)
ผู้ดูแลระบบสามารถตั้งเวลาล่วงหน้าให้ "ตอนที่เสียเงิน" กลายเป็น "ตอนฟรี" ได้โดยอัตโนมัติ ระบบหลังบ้านและหน้าบ้านจะซิงค์เวลามาตรฐานโลกอย่างไร้รอยต่อ ทันทีที่เวลานับถอยหลังจบลง ประตูจะเปิดออกให้นักอ่านเข้าชมได้ทันที

### 🔍 ปรมาจารย์แห่งการค้นหา (SEO Mastery)
MangaLabTH สื่อสารกับ Google โดยตรง! ด้วย **Google Indexing API** ทันทีที่คุณอัปโหลดตอนใหม่ ระบบจะ "สะกิด" ให้ Google Bot รีบมาเก็บข้อมูลทันที พร้อมโครงสร้าง JSON-LD สไตล์ ComicSeries ที่ถูกต้องตามหลัก SEO ขั้นสูงสุด

### 📈 ตาทิพย์แห่งการตลาด (Marketing Analytics)
Dashboard สำหรับผู้ดูแลระบบที่เผยให้เห็นทุกการเติบโตผ่านกราฟสุดล้ำ (Area, Donut, Dual Area) พร้อมเชื่อมต่อ **Google Analytics 4** เพื่อดู Conversion (เติมเงิน, ปลดล็อกตอน) ได้แบบเรียลไทม์

---

## 💻 คู่มือสำหรับผู้สืบทอด (Local Development)

หากคุณคือผู้ถูกเลือกให้มาพัฒนาอาณาจักรนี้ต่อ นี่คือคาถาอัญเชิญระบบ:

### 🐍 ปลุกวิญญาณ Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# คัดลอกคาถาลับและปรับแก้ให้ตรงกับของคุณ
cp .env.example .env

# สร้างตารางข้อมูล
alembic upgrade head
# เริ่มเดินเครื่อง
uvicorn app.main:app --reload --port 8000
```

### ⚛️ สร้างโลก Frontend (Next.js)
```bash
cd frontend
npm install

# คัดลอกคาถาลับ
cp .env.example .env.local

# รันระบบหน้าบ้าน (http://localhost:3000)
npm run dev
```

> **พร้อมที่จะนำขึ้นระบบจริงแล้วหรือยัง?** <br>
> อ่านคัมภีร์ [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) เพื่อศึกษาวิธีกางอาณาเขตบน Production!

---

<p align="center">
  สร้างสรรค์ด้วย ❤️ สำหรับคนรักการอ่านมังงะตัวจริง<br>
  <i>(License: MIT)</i>
</p>
