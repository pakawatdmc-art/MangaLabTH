"""Script to reset the economy (clear transactions and zero out balances)."""

import asyncio
import logging

from sqlmodel import delete, update

from app.database import async_session_factory
from app.models.transaction import Transaction
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def reset_economy():
    """Clear all transactions and reset all user coin balances to 0."""
    logger.info("Starting economy reset...")

    async with async_session_factory() as session:
        try:
            # 1. Delete all transactions
            logger.info("Deleting all transactions...")
            stmt_delete_tx = delete(Transaction)
            result_tx = await session.execute(stmt_delete_tx)

            # 2. Reset user balances
            logger.info("Resetting user coin balances to 0...")
            stmt_update_users = update(User).values(coin_balance=0)
            result_users = await session.execute(stmt_update_users)

            # Commit the transaction
            await session.commit()

            deleted_tx_count = result_tx.rowcount
            updated_user_count = result_users.rowcount

            logger.info(
                f"Successfully deleted {deleted_tx_count} transactions.")
            logger.info(
                f"Successfully reset coin balance for {updated_user_count} users.")
            logger.info("Economy reset complete.")

        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to reset economy: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(reset_economy())
