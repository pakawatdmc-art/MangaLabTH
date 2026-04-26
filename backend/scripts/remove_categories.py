"""
One-time script: Remove 'slice_of_life' and 'isekai' from PostgreSQL mangacategory enum.
Safe to run only when NO manga rows use these categories.
"""
import psycopg2
import os, sys

# Build sync connection string from the async one in .env
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

raw = os.getenv("DATABASE_URL", "")
sync_url = raw.replace("postgresql+asyncpg://", "postgresql://")

conn = psycopg2.connect(sync_url)
conn.autocommit = True
cur = conn.cursor()

# 1. Safety check — make sure no manga uses these categories
cur.execute("SELECT count(*) FROM mangas WHERE category IN ('SLICE_OF_LIFE', 'ISEKAI') OR sub_category IN ('SLICE_OF_LIFE', 'ISEKAI')")
count = cur.fetchone()[0]
if count > 0:
    print(f"❌ ยังมีมังงะ {count} เรื่องที่ใช้หมวดหมู่นี้อยู่ กรุณาเปลี่ยนหมวดก่อน")
    cur.close()
    conn.close()
    sys.exit(1)

# 2. Rename old enum
cur.execute("ALTER TYPE mangacategory RENAME TO mangacategory_old")

# 3. Create new enum without slice_of_life and isekai
cur.execute("""
    CREATE TYPE mangacategory AS ENUM (
        'ACTION', 'ROMANCE', 'COMEDY', 'DRAMA', 'FANTASY',
        'HORROR', 'SCHOOL', 'SCI_FI', 'OTHER'
    )
""")

# 4. Alter columns to use the new enum
cur.execute("ALTER TABLE mangas ALTER COLUMN category TYPE mangacategory USING category::text::mangacategory")
cur.execute("ALTER TABLE mangas ALTER COLUMN sub_category TYPE mangacategory USING sub_category::text::mangacategory")

# 5. Drop old enum
cur.execute("DROP TYPE mangacategory_old")

print("✅ ลบหมวดหมู่ 'slice_of_life' และ 'isekai' ออกจากฐานข้อมูลเรียบร้อยแล้ว!")

cur.close()
conn.close()
