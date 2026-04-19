"""Fix user roles: reset all users to reader except the primary admin.

USAGE:
    cd backend
    python scripts/fix_user_roles.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from sqlmodel import select
from app.database import async_session_factory
from app.models.user import User, UserRole
from app.config import get_settings

settings = get_settings()


async def fix_roles():
    primary_email = settings.PRIMARY_ADMIN_EMAIL.strip().lower()
    print(f"Primary admin email: {primary_email}")

    async with async_session_factory() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()

        fixed_count = 0
        for user in users:
            user_email = (user.email or "").strip().lower()
            should_be_primary = user_email == primary_email and bool(primary_email)

            needs_fix = False

            if should_be_primary:
                # This user IS the primary admin
                if user.role != UserRole.ADMIN or not user.is_primary_admin:
                    user.role = UserRole.ADMIN
                    user.is_primary_admin = True
                    needs_fix = True
                    print(f"  ✅ {user_email} → Admin Master (primary admin)")
                else:
                    print(f"  ✅ {user_email} → Already correct (Admin Master)")
            else:
                # This user should NOT be primary admin
                if user.is_primary_admin or user.role == UserRole.ADMIN:
                    user.role = UserRole.READER
                    user.is_primary_admin = False
                    needs_fix = True
                    print(f"  🔄 {user_email or user.clerk_id} → Reader (was Admin{'Master' if user.is_primary_admin else ''})")
                else:
                    print(f"  ✅ {user_email or user.clerk_id} → Already correct (Reader)")

            if needs_fix:
                session.add(user)
                fixed_count += 1

        if fixed_count > 0:
            await session.commit()
            print(f"\n✅ Fixed {fixed_count} users.")
        else:
            print("\n✅ All users already have correct roles.")


if __name__ == "__main__":
    asyncio.run(fix_roles())
