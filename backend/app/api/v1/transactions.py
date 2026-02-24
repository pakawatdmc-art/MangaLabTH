"""Transaction / Coin Economy endpoints.

Critical: all balance mutations use SELECT ... FOR UPDATE
to guarantee atomicity under concurrent requests.
"""

from typing import List

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, col

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models.manga import Chapter
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.schemas.transaction import (
    AdminGrantRequest,
    TransactionRead,
    UnlockChapterRequest,
    UnlockChapterResponse,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


# ── Admin: list all transactions ─────────────────


@router.get("", response_model=List[TransactionRead])
async def list_all_transactions(
    session: DBSession,
    admin: AdminUser,
    limit: int = Query(200, ge=1, le=1000),
):
    """Admin: list all transactions across all users."""
    stmt = (
        select(Transaction)
        .order_by(col(Transaction.created_at).desc())
        .limit(limit)
    )
    results = (await session.execute(stmt)).scalars().all()
    return [TransactionRead.model_validate(t) for t in results]


# ── Reader: list my transactions ─────────────────


@router.get("/me", response_model=List[TransactionRead])
async def my_transactions(
    user: CurrentUser,
    session: DBSession,
    limit: int = Query(50, ge=1, le=200),
):
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(col(Transaction.created_at).desc())
        .limit(limit)
    )
    results = (await session.execute(stmt)).scalars().all()
    return [TransactionRead.model_validate(t) for t in results]


# ── Reader: unlock a chapter ─────────────────────


@router.post("/unlock", response_model=UnlockChapterResponse)
async def unlock_chapter(
    body: UnlockChapterRequest,
    user: CurrentUser,
    session: DBSession,
):
    """Atomically deduct coins and create an unlock transaction."""

    chapter = await session.get(Chapter, body.chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    if chapter.is_free or chapter.coin_price == 0:
        raise HTTPException(
            status_code=400,
            detail="This chapter is free — no unlock needed",
        )

    # Check if already unlocked
    existing = (
        await session.execute(
            select(Transaction).where(
                Transaction.user_id == user.id,
                Transaction.chapter_id == chapter.id,
                Transaction.type == TransactionType.CHAPTER_UNLOCK,
            )
        )
    ).scalar_one_or_none()

    if existing:
        return UnlockChapterResponse(
            success=True,
            new_balance=user.coin_balance,
            transaction_id=existing.id,
            message="Already unlocked",
        )

    # ── Atomic balance mutation ──────────────────
    # Lock the user row to prevent concurrent double-spend
    lock_stmt = (
        select(User)
        .where(User.id == user.id)
        .with_for_update()
    )
    locked_user = (await session.execute(lock_stmt)).scalar_one()

    if locked_user.coin_balance < chapter.coin_price:
        raise HTTPException(
            status_code=402,
            detail=("Insufficient coins. Need {}, "
                    "have {}").format(chapter.coin_price, locked_user.coin_balance),
        )

    new_balance = locked_user.coin_balance - chapter.coin_price
    locked_user.coin_balance = new_balance

    tx = Transaction(
        user_id=locked_user.id,
        type=TransactionType.CHAPTER_UNLOCK,
        amount=-chapter.coin_price,
        balance_after=new_balance,
        chapter_id=chapter.id,
        note=f"Unlocked chapter {chapter.number}",
    )
    session.add(tx)
    session.add(locked_user)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        # Race condition: another request already unlocked this chapter
        existing = (
            await session.execute(
                select(Transaction).where(
                    Transaction.user_id == user.id,
                    Transaction.chapter_id == chapter.id,
                    Transaction.type == TransactionType.CHAPTER_UNLOCK,
                )
            )
        ).scalar_one_or_none()
        if existing:
            return UnlockChapterResponse(
                success=True,
                new_balance=existing.balance_after,
                transaction_id=existing.id,
                message="Already unlocked",
            )
        raise HTTPException(
            status_code=409, detail="Concurrent unlock conflict")

    await session.refresh(tx)

    return UnlockChapterResponse(
        success=True,
        new_balance=new_balance,
        transaction_id=tx.id,
    )


# ── Admin: grant coins ──────────────────────────


@router.post("/admin/grant", response_model=TransactionRead)
async def admin_grant_coins(
    body: AdminGrantRequest,
    session: DBSession,
    admin: AdminUser,
):
    """Admin: grant coins to a user."""
    lock_stmt = (
        select(User)
        .where(User.id == body.user_id)
        .with_for_update()
    )
    locked_user = (await session.execute(lock_stmt)).scalar_one_or_none()
    if not locked_user:
        raise HTTPException(status_code=404, detail="User not found")

    new_balance = locked_user.coin_balance + body.amount
    if new_balance < 0:
        raise HTTPException(
            status_code=400,
            detail="Grant would result in negative balance",
        )
    locked_user.coin_balance = new_balance

    tx = Transaction(
        user_id=locked_user.id,
        type=TransactionType.ADMIN_GRANT,
        amount=body.amount,
        balance_after=new_balance,
        note=body.note or f"Granted by admin {admin.id}",
    )
    session.add(tx)
    session.add(locked_user)
    await session.commit()
    await session.refresh(tx)

    return TransactionRead.model_validate(tx)
