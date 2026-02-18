import asyncio
import sys
from app.database import get_session
from app.models.user import User, UserRole
from sqlmodel import select

async def main():
    if len(sys.argv) < 2:
        print("Usage: python promote_admin.py <email>")
        return

    email = sys.argv[1]
    print(f"Searching for user with email: {email}...")
    
    async for session in get_session():
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            print(f"User with email {email} not found.")
            return

        print(f"Found user: {user.id} ({user.role})")
        user.role = UserRole.ADMIN
        session.add(user)
        await session.commit()
        await session.refresh(user)
        print(f"User {user.email} promoted to ADMIN successfully.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
