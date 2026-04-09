"""Seed or update coin packages in the database.

Usage:
    cd backend
    python scripts/seed_coin_packages.py
"""

import asyncio
import sys
import os

# Ensure `app.*` imports work when running from `backend/`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from sqlmodel import select  # noqa: E402
from app.database import async_session_factory  # noqa: E402
from app.models.transaction import CoinPackage  # noqa: E402

# ข้อมูลแพ็กเกจเหรียญสำหรับ FeelFreePay
packages_data = [
    {
        "name": "แพ็กเกจ 49 เหรียญ",
        "coins": 49,
        "price_thb": 49,
        "sort_order": 1
    },
    {
        "name": "แพ็กเกจ 104 เหรียญ",
        "coins": 104,
        "price_thb": 99,
        "sort_order": 2
    },
    {
        "name": "แพ็กเกจ 157 เหรียญ",
        "coins": 157,
        "price_thb": 149,
        "sort_order": 3
    },
    {
        "name": "แพ็กเกจ 214 เหรียญ",
        "coins": 214,
        "price_thb": 199,
        "sort_order": 4
    },
    {
        "name": "แพ็กเกจ 262 เหรียญ",
        "coins": 262,
        "price_thb": 249,
        "sort_order": 5
    },
    {
        "name": "แพ็กเกจ 549 เหรียญ",
        "coins": 549,
        "price_thb": 499,
        "sort_order": 6
    },
]

async def seed():
    async with async_session_factory() as session:
        # Fetch existing packages
        result = await session.execute(select(CoinPackage))
        existing = {p.name: p for p in result.scalars().all()}

        created = 0
        updated = 0

        for pd in packages_data:
            if pd["name"] in existing:
                # Update existing package (preserves ID → no FK issues)
                pkg = existing[pd["name"]]
                pkg.coins = pd["coins"]
                pkg.price_thb = pd["price_thb"]
                pkg.sort_order = pd["sort_order"]
                pkg.is_active = True
                session.add(pkg)
                updated += 1
            else:
                # Create new package
                pkg = CoinPackage(
                    name=pd["name"],
                    coins=pd["coins"],
                    price_thb=pd["price_thb"],
                    sort_order=pd["sort_order"],
                    is_active=True
                )
                session.add(pkg)
                created += 1

        # Deactivate packages not in the seed data (instead of deleting)
        seed_names = {pd["name"] for pd in packages_data}
        for name, pkg in existing.items():
            if name not in seed_names:
                pkg.is_active = False
                session.add(pkg)

        await session.commit()
        print(f"✅ Seed complete: {created} created, {updated} updated")

if __name__ == "__main__":
    asyncio.run(seed())
