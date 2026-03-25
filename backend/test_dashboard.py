import asyncio
from app.api.v1.analytics import get_marketing_dashboard
from app.database import engine
from sqlalchemy.ext.asyncio import AsyncSession
import traceback

async def main():
    async with AsyncSession(engine) as session:
        try:
            # We pass a fake admin user, it's not used in the function body anyway
            result = await get_marketing_dashboard(session, admin=None, days=30)
            print("SUCCESS")
            # print(result)
        except Exception as e:
            print("ERROR HAPPENED:")
            traceback.print_exc()

asyncio.run(main())
