<div align="center">
  <h1>คู่มือการนำระบบขึ้นใช้งานจริง (Deployment Guide)</h1>
  <p>คู่มือฉบับสมบูรณ์สำหรับผู้ดูแลระบบ เพื่อนำ MangaLabTH ขึ้นสู่ Production Environment</p>
</div>

---

เอกสารฉบับนี้อธิบายขั้นตอนการนำระบบ MangaLabTH ขึ้นใช้งานจริงบน Production Environment เพื่อให้มั่นใจว่าระบบจะสามารถทำงานได้อย่างมีประสิทธิภาพ ปลอดภัย และรองรับผู้ใช้งานจำนวนมากได้

## 1. การเตรียมความพร้อม (Prerequisites)

ก่อนเริ่มต้นการนำระบบขึ้นใช้งานจริง กรุณาเตรียมบัญชีและทรัพยากรดังต่อไปนี้:
1. **Google Cloud Platform (GCP):** สำหรับ Deploy Backend (แนะนำให้ใช้บัญชี Free Trial $300 หรือเครดิตฟรี)
2. **Vercel:** สำหรับ Deploy Frontend
3. **Cloudflare:** สำหรับการจัดการ Domain, WAF และ R2 Object Storage
4. **Supabase:** สำหรับการจัดการฐานข้อมูล PostgreSQL
5. **Clerk:** สำหรับระบบ Authentication
6. **FeelFreePay:** สำหรับระบบ Payment Gateway
7. **Brevo:** สำหรับระบบส่งอีเมลแจ้งเตือน (Email Service)

---

## 2. การตั้งค่าฐานข้อมูลและพื้นที่จัดเก็บ (Database & Storage)

### 2.1 ฐานข้อมูล (Supabase PostgreSQL)
1. เข้าสู่ระบบ [Supabase](https://supabase.com/) และสร้าง Project ใหม่
2. ไปที่เมนู `Settings -> Database -> Connection string`
3. เลือก **Session Pooler (IPv4)** และคัดลอก URL
4. **ข้อควรระวัง:** เปลี่ยนคำนำหน้าจาก `postgresql://` เป็น `postgresql+asyncpg://` เพื่อให้แอปพลิเคชัน FastAPI สามารถเชื่อมต่อแบบ Asynchronous ได้อย่างถูกต้อง

### 2.2 พื้นที่จัดเก็บไฟล์ (Cloudflare R2)
1. เข้าสู่ระบบ Cloudflare Dashboard และเลือก **R2 Object Storage**
2. สร้าง Bucket ชื่อ `factory-manga-storage`
3. ตั้งค่า **Custom Domain** เป็น `cdn.mangalab-th.com` เพื่อป้องกันการถูกบล็อกโดย WAF ในอนาคต
4. สร้าง **R2 API Token** และบันทึก `Access Key ID` รวมทั้ง `Secret Access Key`
5. **ข้อกำหนดสำหรับ `R2_PUBLIC_URL`:**
   - ต้องระบุโปรโตคอล `https://` (เช่น `https://cdn.mangalab-th.com`)
   - **ห้าม** ใส่เครื่องหมาย `/` ต่อท้าย (เช่น `https://cdn.mangalab-th.com/` จะทำให้ระบบทำงานผิดพลาด)

---

## 3. การตั้งค่าบริการภายนอก (Third-Party Services)

### 3.1 ระบบ Authentication (Clerk)
1. สร้างโปรเจกต์ใหม่ในระบบ Clerk
2. คัดลอก `Publishable Key` และ `Secret Key`
3. ไปที่เมนูตั้งค่า JWT Templates เพื่อนำ `JWKS URL` มากำหนดใน Backend สำหรับตรวจสอบ Token ของผู้ใช้งาน

### 3.2 ระบบ Payment Gateway (FeelFreePay)
1. เข้าสู่หน้า Profile ของ FeelFreePay และกด **Gen Token** เพื่อรับ `Customer Key`
2. คัดลอก `Public Key` และ `Secret Key` จาก Dashboard
3. *หมายเหตุ: ไม่จำเป็นต้องตั้งค่า Webhook ในหน้าเว็บ FeelFreePay เนื่องจาก Backend จะทำการส่ง Webhook URL ไปพร้อมกับคำสั่งซื้อโดยอัตโนมัติ*

### 3.3 ระบบส่งอีเมลแจ้งเตือน (Brevo)
1. เข้าสู่ระบบ Brevo และไปที่เมนู **SMTP & API**
2. สร้าง API Key ใหม่ และคัดลอกเก็บไว้
3. ไปที่เมนู **Senders & IPs** เพื่อเพิ่มและยืนยันอีเมลผู้ส่ง (เช่น `support@mangalab-th.com`)

---

## 4. ขั้นตอนการนำระบบขึ้นใช้งานจริง (Deployment)

### 4.1 Backend (Google Cloud Run)
1. เปิด Terminal และเข้าไปที่ไดเรกทอรี `backend`
2. รันคำสั่งต่อไปนี้เพื่อ Deploy ระบบขึ้น Google Cloud Run:
   ```bash
   gcloud run deploy mangalabth-backend --source . --region asia-southeast1 --allow-unauthenticated
   ```
3. กำหนดค่าตัวแปร (Environment Variables) ผ่านหน้า Cloud Console (อ้างอิงจากไฟล์ `.env.example`)
   - อย่าลืมเพิ่มตัวแปรสำหรับ Brevo: `BREVO_API_KEY` และ `EMAIL_FROM`
4. รันคำสั่ง `alembic upgrade head` เพื่อสร้างหรืออัปเดตโครงสร้างตารางฐานข้อมูล
5. กำหนดตัวแปร `APP_ENV=production` เพื่อปิดการแสดงผล API Documentation สู่สาธารณะ

### 4.2 Frontend (Vercel)
1. เชื่อมต่อ Repository ของโปรเจกต์เข้ากับระบบ [Vercel](https://vercel.com/)
2. กำหนด **Root Directory** ไปที่ไดเรกทอรี `frontend`
3. Vercel จะตั้งค่า Build command (`next build`) โดยอัตโนมัติ
4. กำหนดตัวแปร (Environment Variables) ให้ครบถ้วน
5. ดำเนินการ **Deploy**

---

## 5. การตั้งค่าความปลอดภัย (Security & WAF)

ตั้งค่า Cloudflare WAF เพื่อป้องกันการดึงรูปภาพไปใช้งานบนโดเมนอื่น (Anti-Scraping):

1. เข้าสู่ระบบ Cloudflare Dashboard และเลือกโดเมน `mangalab-th.com`
2. ไปที่เมนู **Security -> WAF -> Custom rules**
3. สร้าง Rule ใหม่ และเลือก **Use expression builder**
4. กำหนด Expression ดังนี้:
   ```
   (http.host eq "cdn.mangalab-th.com" and not http.referer contains "mangalab-th.com" and not http.referer contains "localhost" and not starts_with(http.request.uri.path, "/covers/"))
   ```
5. กำหนด Action เป็น **Block** และบันทึกการตั้งค่า
*ผลลัพธ์: การร้องขอรูปภาพเนื้อหามังงะจากโดเมนอื่นจะถูกปฏิเสธ (403 Forbidden) แต่รูปภาพหน้าปกจะยังคงเข้าถึงได้เพื่อประโยชน์ด้าน SEO*

---

## 6. รายการตรวจสอบก่อนเปิดใช้งาน (Pre-Launch Checklist)

- [ ] ตรวจสอบ Endpoint `/health` ของ Backend คืนค่ากลับมาเป็น `"ok"`
- [ ] รูปภาพจาก R2 (Custom Domain) สามารถแสดงผลบนหน้าเว็บได้ตามปกติ
- [ ] ระบบสมัครสมาชิกและเข้าสู่ระบบผ่าน Clerk ทำงานได้อย่างถูกต้อง
- [ ] บัญชี Admin สามารถเข้าถึงระบบจัดการหลังบ้านได้ (`PRIMARY_ADMIN_EMAIL`)
- [ ] ทดสอบระบบเติมเหรียญ และยอดเหรียญอัปเดตในระบบอย่างถูกต้อง
- [ ] การปลดล็อกตอนมังงะทำงานได้ และหักเหรียญได้อย่างถูกต้อง
- [ ] ตั้งค่า Google Indexing API (Service Account) เรียบร้อยแล้ว
- [ ] ทดสอบระบบการส่งอีเมลแจ้งเตือนเมื่อมีการอัปเดตตอนมังงะใหม่ (เช็คการทำงานของระบบ Debounce 10 นาที)
