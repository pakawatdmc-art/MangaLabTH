
import asyncio
import sys
import os

# Ensure we can import 'app'
sys.path.append(os.getcwd())

from sqlmodel import select
from app.database import async_session_factory
from app.models.user import User

async def main():
    print("Connecting to database...")
    try:
        async with async_session_factory() as session:
            stmt = select(User)
            result = await session.execute(stmt)
            users = result.scalars().all()
            print(f"Users found: {len(users)}")
            for user in users:
                print(f"- {user.email} ({user.role.value}) [ID: {user.id}, Clerk: {user.clerk_id}]")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
