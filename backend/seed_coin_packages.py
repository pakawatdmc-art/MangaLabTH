import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

from sqlmodel import select  # noqa: E402
from app.database import async_session_factory  # noqa: E402
from app.models.transaction import CoinPackage  # noqa: E402

# 1. แก้ไขข้อมูลแพ็กเกจตรงนี้ (เอา ID จาก Stripe มาวาง)
packages_data = [
    {
        "name": "แพ็กเกจ 49 เหรียญ",
        "coins": 49,
        "price_thb": 49,
        "stripe_id": "price_1T4NiORzd0PuzM27hCITXi7Z", # เช่น price_1Qxxxx...
        "sort_order": 1
    },
    {
        "name": "แพ็กเกจ 104 เหรียญ",
        "coins": 104,
        "price_thb": 99,
        "stripe_id": "price_1T4N0KRzd0PuzM27VKFXI4zt",
        "sort_order": 2
    },
    {
        "name": "แพ็กเกจ 157 เหรียญ",
        "coins": 157,
        "price_thb": 149,
        "stripe_id": "price_1T4N0tRzd0PuzM27Lcdu14DW",
        "sort_order": 3
    },
    {
        "name": "แพ็กเกจ 214 เหรียญ",
        "coins": 214,
        "price_thb": 199,
        "stripe_id": "price_1T4N1aRzd0PuzM27e3GD3aqB",
        "sort_order": 4
    },
    {
        "name": "แพ็กเกจ 262 เหรียญ",
        "coins": 262,
        "price_thb": 249,
        "stripe_id": "price_1T4N23Rzd0PuzM27MThpRByX",
        "sort_order": 5
    },
    {
        "name": "แพ็กเกจ 549 เหรียญ",
        "coins": 549,
        "price_thb": 499,
        "stripe_id": "price_1T4N2VRzd0PuzM27s4ZpYOkK",
        "sort_order": 6
    },
]

async def seed():
    async with async_session_factory() as session:
        # Clear existing
        result = await session.execute(select(CoinPackage))
        existing = result.scalars().all()
        for p in existing:
            await session.delete(p)
        await session.commit()
        
        # Insert new
        for pd in packages_data:
            pkg = CoinPackage(
                name=pd["name"],
                coins=pd["coins"],
                price_thb=pd["price_thb"], # save satang
                stripe_price_id=pd["stripe_id"],
                sort_order=pd["sort_order"],
                is_active=True
            )
            session.add(pkg)
        await session.commit()
        print("Seeded coin packages successfully")

if __name__ == "__main__":
    asyncio.run(seed())
