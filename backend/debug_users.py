import asyncio
from app.database import get_session
from app.models.user import User
from sqlmodel import select

async def main():
    async for session in get_session():
        stmt = select(User)
        result = await session.execute(stmt)
        users = result.scalars().all()
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"- ID: {user.id}, Email: {user.email}, Role: {user.role}, ClerkID: {user.clerk_id}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
