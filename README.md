<div align="center">
  <h1>📖 MangaLabTH: Enterprise Manga Platform</h1>
  <p>🚀 แพลตฟอร์มเว็บแอปพลิเคชันอ่านการ์ตูนออนไลน์ระดับ Enterprise</p>
</div>

---

## 🌟 ข้อมูลทั่วไปของโปรเจกต์ (Project Overview)

**MangaLabTH** เป็นแพลตฟอร์ม Full-Stack Application สำหรับการอ่านมังงะออนไลน์ ที่ได้รับการออกแบบและพัฒนาด้วยสถาปัตยกรรมระดับ Enterprise มุ่งเน้นประสิทธิภาพการทำงานที่รวดเร็ว ⚡️ (High Performance) ความมั่นคงปลอดภัยของข้อมูล 🔒 (Security & Anti-Scraping) และระบบเศรษฐกิจแบบเหรียญ 🪙 (Coin Economy) ที่มีความเสถียรสูงสุด เพื่อรองรับผู้ใช้งานจำนวนมหาศาลพร้อมกัน

---

## 🏗️ สถาปัตยกรรมระบบ (System Architecture)

ระบบถูกแบ่งออกเป็น 3 ส่วนหลัก เพื่อประสิทธิภาพในการขยายขีดความสามารถ (Scalability):

1. **🖥️ Frontend (Vercel):**
   - พัฒนาด้วย Next.js 16.2.4 (App Router) และ Tailwind CSS v4
   - รองรับ Server-Side Rendering (SSR) และ Incremental Static Regeneration (ISR) เพื่อให้สามารถโหลดหน้าเว็บ (LCP < 1s) ได้อย่างรวดเร็ว 🏎️
2. **⚙️ Backend (Google Cloud Run):**
   - พัฒนาด้วย FastAPI (Python)
   - ฐานข้อมูล PostgreSQL บริหารจัดการโดย Supabase 🐘
   - ประมวลผลตรรกะระบบ การจัดการผู้ใช้ และระบบธุรกรรมการเงินอย่างมีประสิทธิภาพ
3. **🔌 External Services (Third-Party Integrations):**
   - 🛡️ **Cloudflare R2 & WAF:** จัดเก็บรูปภาพมังงะและป้องกันการเข้าถึงจากโดเมนภายนอก (Anti-Scraping)
   - 🔑 **Clerk:** ระบบตรวจสอบและยืนยันตัวตน (Authentication) พร้อมการจัดการสิทธิ์ (RBAC)
   - 💳 **FeelFreePay:** บริการ Payment Gateway สำหรับระบบเติมเหรียญ (PromptPay, TrueMoney)
   - 📧 **Brevo Email Service:** ระบบส่งอีเมลแจ้งเตือนอัตโนมัติ
   - 🔍 **Google Indexing API:** ระบบการทำ SEO และ Indexing อัตโนมัติ

---

## ✨ คุณสมบัติเด่นของระบบ (Key Features)

### 1. 🛡️ ระบบรักษาความปลอดภัยรูปภาพ (Anti-Scraping)
- **Cloudflare WAF Custom Rules:** บล็อกการเข้าถึงไฟล์รูปภาพหากไม่มี HTTP Referer ที่ถูกต้อง
- **ProtectedImage Component:** สร้าง Blob URL ชั่วคราวผ่านการ Fetch เพื่อซ่อน URL จริงของไฟล์รูปภาพจาก DOM ป้องกันการขโมยรูปภาพ (Scraping) 🕵️‍♂️

### 2. 💰 ระบบธุรกรรมการเงิน (Atomic Transactions)
- ใช้กลไก `SELECT FOR UPDATE` ระดับ Database เพื่อจัดการคิวการปลดล็อกตอนมังงะ
- ป้องกันปัญหาการหักเหรียญซ้ำซ้อนหรือยอดเหรียญติดลบ (Race Conditions) ในกรณีที่มีผู้ใช้งานทำการปลดล็อกจำนวนมากพร้อมกัน 🚦

### 3. ⏳ ระบบจัดการเนื้อหาอัตโนมัติ (Automated Timed Unlocks)
- ระบบตั้งเวลาให้ตอนที่เสียเหรียญกลายเป็น "ตอนฟรี" โดยอัตโนมัติ 🔓
- รองรับการซิงโครไนซ์เวลามาตรฐานโลกอย่างไร้รอยต่อ 🌍

### 4. 📬 ระบบแจ้งเตือนทางอีเมล (Automated Chapter Notifications)
- เชื่อมต่อ API ของ Brevo เพื่อส่งอีเมลแจ้งเตือนเมื่อมีตอนใหม่ 📨
- มีระบบ Debounce (หน่วงเวลา 10 นาที) เพื่อรวบรวมตอนที่อัปเดตใหม่หลายตอนเข้าด้วยกันก่อนส่งอีเมล
- สามารถคัดกรองผู้อ่าน Top 50 ที่มีการใช้เหรียญสูงสุดต่อเรื่อง เพื่อส่งอีเมลแจ้งเตือนแบบเฉพาะเจาะจง (Targeted Notification) 🎯

### 5. 📊 ระบบวิเคราะห์และรายงานผล (Marketing Analytics)
- Dashboard สถิติสำหรับผู้ดูแลระบบ แสดงผลผ่านกราฟ (Area, Donut, Dual Area) ครอบคลุม 5 โมดูลสำคัญ 📈
- การทำ SEO เต็มรูปแบบด้วย Google Indexing API และโครงสร้าง JSON-LD 🌐

---

## 🛠️ คู่มือการติดตั้งสำหรับนักพัฒนา (Local Development Setup)

### 1. ⚙️ การตั้งค่า Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# คัดลอกและกำหนดค่า Environment Variables
cp .env.example .env

# สร้างโครงสร้างฐานข้อมูล
alembic upgrade head

# รันเซิร์ฟเวอร์ Backend
uvicorn app.main:app --reload --port 8000
```

### 2. 🎨 การตั้งค่า Frontend
```bash
cd frontend
npm install

# คัดลอกและกำหนดค่า Environment Variables
cp .env.example .env.local

# รันเซิร์ฟเวอร์ Frontend (http://localhost:3000)
npm run dev
```

> 📌 **หมายเหตุ:** สำหรับการนำระบบขึ้นใช้งานจริง (Production) โปรดอ้างอิงคู่มือ [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) 🚀

---

<p align="center">
  <i>📜 License: MIT</i>
</p>
