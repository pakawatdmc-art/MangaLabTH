<div align="center">
  <h1>📜 The Master Blueprint: คู่มือกางอาณาเขต MangaLabTH</h1>
  <p><i>"คู่มือฉบับสมบูรณ์สำหรับผู้ดูแลระบบ เพื่อนำอาณาจักร MangaLabTH ขึ้นสู่โลกออนไลน์ (Production)"</i></p>
</div>

---

ก่อนที่คุณจะเปิดประตูเมืองต้อนรับนักอ่านนับหมื่น นี่คือพิมพ์เขียวที่คุณต้องทำตามอย่างเคร่งครัด เพื่อให้มั่นใจว่าระบบจะ **ลื่นไหล ปลอดภัย และไร้ช่องโหว่**

## 🏗️ Chapter 1: เตรียมฐานทัพ (Prerequisites)

ก่อนเริ่มร่ายเวทย์ คุณต้องมีทรัพยากรเหล่านี้อยู่ในมือ:
1. **Google Cloud Platform (GCP):** บัญชีที่มีเครดิต (แนะนำให้ใช้บัญชี Free Trial $300)
2. **Vercel:** สำหรับวางหน้าร้าน (Frontend)
3. **Cloudflare:** สำหรับจัดการโดเมน (Domain) และเป็นโกดังเก็บรูปภาพ (R2)
4. **Supabase:** สำหรับเก็บข้อมูลทั้งหมดของโลกนี้ (Database)
5. **Clerk:** สำหรับจัดการบัตรผ่านเข้าเมือง (Authentication)
6. **FeelFreePay:** ศูนย์แลกเปลี่ยนเงินตรา

---

## 🏛️ Chapter 2: เสาเข็มและโกดังไร้ก้น (Database & Storage)

### 1. เสาเข็มแห่งความจำ (Supabase PostgreSQL)
1. เข้าไปที่ [Supabase](https://supabase.com/) และสร้าง Project ใหม่
2. ไปที่ `Settings -> Database -> Connection string`
3. เลือก **Session Pooler (IPv4)** แล้วคัดลอก URL มา
4. ⚠️ **เคล็ดลับ:** อย่าลืมเปลี่ยนคำนำหน้าจาก `postgresql://` เป็น `postgresql+asyncpg://` เพื่อให้ Backend ของเรา (FastAPI) คุยด้วยภาษาที่เร็วที่สุด

### 2. โกดังไร้ก้น (Cloudflare R2)
1. ไปที่ Cloudflare Dashboard เลือก **R2 Object Storage**
2. สร้าง Bucket ชื่อว่า `factory-manga-storage`
3. ตั้งค่า **Custom Domain** ให้เป็น `cdn.mangalab-th.com` (สำคัญมาก! เพื่อป้องกันการโดนแบนจาก WAF ในอนาคต)
4. สร้าง **R2 API Token** และจดค่า `Access Key ID` กับ `Secret Access Key` ไว้
5. **กฎเหล็กของ `R2_PUBLIC_URL`:**
   - ✅ ต้องมี `https://` นำหน้า (เช่น `https://cdn.mangalab-th.com`)
   - ❌ **ห้าม** มี `/` ต่อท้ายเด็ดขาด! (เช่น `https://cdn.mangalab-th.com/` = พัง)

---

## 💰 Chapter 3: พลังเวทย์และระบบเงินตรา (Auth & Economy)

### 1. บัตรผ่านเข้าเมือง (Clerk)
เราใช้ Clerk ในการดูแลรักษาระบบสมาชิก
1. สร้างโปรเจกต์ใน Clerk
2. คัดลอก `Publishable Key` และ `Secret Key` เตรียมไว้
3. อย่าลืมไปเอา `JWKS URL` จากตั้งค่า JWT Templates เพื่อให้ Backend นำไปตรวจสอบบัตรผ่าน (Token) ได้อย่างแม่นยำ

### 2. ศูนย์แลกเปลี่ยน (FeelFreePay)
ระบบเศรษฐกิจของเราขับเคลื่อนด้วยเหรียญ การรับเงินต้องเสถียร 100%:
1. ไปที่ FeelFreePay Profile กด **Gen Token** เพื่อเอา `Customer Key`
2. คัดลอก `Public Key` และ `Secret Key` จาก Dashboard
3. **เวทย์มนต์ Webhook:** คุณไม่จำเป็นต้องไปตั้งค่า Webhook ในหน้าเว็บ FeelFreePay! ระบบ Backend ของเราฉลาดพอที่จะสร้าง URL Webhook ส่งไปพร้อมกับคำสั่งซื้อโดยอัตโนมัติ

---

## 🚀 Chapter 4: ปล่อยของ (Deployment)

เมื่อของวิเศษครบแล้ว ถึงเวลาเปิดสวิตช์!

### Phase 1: โรงงานหลังบ้าน (Google Cloud Run)
เราจะนำ Backend ขึ้นไปไว้บน Google Cloud Run เพื่อให้ขยายร่างออโต้เมื่อมีคนเข้ามาเยอะๆ
1. เปิด Terminal ในเครื่อง เข้าไปที่โฟลเดอร์ `backend`
2. พิมพ์คำสั่งศักดิ์สิทธิ์:
   ```bash
   gcloud run deploy mangalabth-backend --source . --region asia-southeast1 --allow-unauthenticated
   ```
3. กำหนดค่าตัวแปร (Environment Variables) ผ่านหน้า Cloud Console (ดูรายการตัวแปรได้ที่ไฟล์ `.env.example`)
4. ⚠️ **สำคัญ:** ต้องรันคำสั่ง `alembic upgrade head` (บนเครื่องคุณเองหรือเครื่องที่ต่อกับ Database) ก่อนเพื่อให้ตารางข้อมูลถูกสร้างเรียบร้อย
5. ตั้งค่าตัวแปร `APP_ENV=production` เพื่อซ่อนหน้าต่าง API Docs ไม่ให้คนภายนอกเห็น

### Phase 2: หน้าร้าน (Vercel)
1. นำ Source Code ของเราไปเชื่อมกับ [Vercel](https://vercel.com/)
2. ตั้ง **Root Directory** ไปที่โฟลเดอร์ `frontend`
3. Vercel จะรู้ใจเราโดยอัตโนมัติ (Build command: `next build`)
4. ใส่ตัวแปร (Environment Variables) ให้ครบถ้วน
5. กดปุ่ม **Deploy** แล้วรอรับความสำเร็จ!

---

## 🛡️ Chapter 5: กางอาณาเขต (WAF & Security)

เพื่อป้องกัน **"ปลิง"** หรือบอทที่พยายามจะมาดูดรูปภาพของเราไปใช้ฟรีๆ เราต้องกางอาณาเขตบน **Cloudflare WAF**

1. ไปที่ Cloudflare Dashboard เลือกโดเมน `mangalab-th.com`
2. เมนูซ้ายมือ เลือก **Security -> WAF -> Custom rules**
3. สร้าง Rule ใหม่ เลือก **Use expression builder**
4. ⚠️ **ใส่คาถากางอาณาเขตนี้ลงไปในช่อง (ก๊อปปี้ไปวางบรรทัดเดียว):**
   ```
   (http.host eq "cdn.mangalab-th.com" and not http.referer contains "mangalab-th.com" and not http.referer contains "localhost" and not starts_with(http.request.uri.path, "/covers/"))
   ```
5. Choose action ให้ตั้งเป็น **Block**
6. กด **Save**

*ผลลัพธ์: บอทที่พยายามดึงรูปตอน (pages) ไปโชว์เว็บอื่นจะขึ้น Error 403 ทันที แต่รูปภาพปก (covers) จะยังโชว์ได้ปกติเพื่อประโยชน์ทาง SEO!*

---

## ✅ Final Checklist (ก่อนประกาศเปิดเมือง)

- [ ] เช็ค `/health` ของ Backend ตอบกลับว่า `"ok"`
- [ ] รูปภาพจาก R2 (Custom Domain) โชว์บนหน้าเว็บปกติ
- [ ] สมัครสมาชิก / ล็อกอิน ผ่าน Clerk ได้
- [ ] บัญชี Admin มีสิทธิ์จัดการหลังบ้าน (เช็ค `PRIMARY_ADMIN_EMAIL`)
- [ ] ทดลองเติมเหรียญ (แสกน QR) และเหรียญเข้ากระเป๋าจริง
- [ ] กดปลดล็อกตอนมังงะได้ และเงินหักถูกต้อง
- [ ] ตั้งค่า Google Indexing API (Service Account) เรียบร้อย เพื่อให้ Google วิ่งมาเก็บข้อมูลเว็บไวๆ

**ถ้าคุณติ๊กถูกครบทุกข้อ... ยินดีด้วยครับ! อาณาจักร MangaLabTH ของคุณพร้อมให้บริการแล้ว 🚀**
