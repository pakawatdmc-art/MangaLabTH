
import asyncio
import sys
import os

sys.path.append(os.getcwd())

from sqlmodel import select
from app.database import async_session_factory
from app.models.user import User, UserRole

async def main():
    clerk_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    async with async_session_factory() as session:
        if clerk_id:
            # Promote specific user
            stmt = select(User).where(User.clerk_id == clerk_id)
            result = await session.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                user.role = UserRole.ADMIN
                session.add(user)
                await session.commit()
                print(f"PROMOTED: {user.email or user.clerk_id} -> admin")
            else:
                print(f"User with clerk_id '{clerk_id}' not found")
        else:
            # List all users
            stmt = select(User)
            result = await session.execute(stmt)
            users = result.scalars().all()
            print(f"Users found: {len(users)}")
            for u in users:
                print(f"  [{u.role.value:6s}] {u.email or '(no email)'} | Clerk: {u.clerk_id}")

if __name__ == "__main__":
    asyncio.run(main())
