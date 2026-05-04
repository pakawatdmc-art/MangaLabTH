"""Transaction / Coin Economy endpoints.

Critical: all balance mutations use SELECT ... FOR UPDATE
to guarantee atomicity under concurrent requests.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func as sa_func
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, col

from app.api.deps import AdminUser, CurrentUser, DBSession
from app.models.manga import Chapter, Manga
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.schemas.transaction import (
    AdminGrantRequest,
    TransactionRead,
    UnlockChapterRequest,
    UnlockChapterResponse,
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


# ── Response schemas for paginated listing ────────


from app.schemas.transaction import AdminTransactionRead

class PaginatedTransactions(BaseModel):
    items: List[AdminTransactionRead]
    total: int
    page: int
    per_page: int
    total_pages: int

class TransactionSummary(BaseModel):
    total_in: int
    total_out: int
    net_balance: int
    total_count: int

# ── Admin: transaction summary (lightweight) ─────


@router.get("/summary", response_model=TransactionSummary)
async def get_transaction_summary(
    session: DBSession,
    admin: AdminUser,
    type_filter: Optional[str] = Query(None, alias="type"),
    q: Optional[str] = Query(None),
):
    """Admin: get aggregate summary of all transactions (fast DB query)."""
    base_filter = ~(
        (Transaction.type == TransactionType.COIN_PURCHASE) & (Transaction.amount == 0)
    )
    if type_filter:
        base_filter = base_filter & (Transaction.type == type_filter)
    if q:
        base_filter = base_filter & (col(Transaction.note).ilike(f"%{q}%"))

    # Sum of positive amounts (credits)
    in_stmt = (
        select(sa_func.coalesce(sa_func.sum(Transaction.amount), 0))
        .where(base_filter & (Transaction.amount > 0))
    )
    total_in = (await session.execute(in_stmt)).scalar_one()

    # Sum of absolute negative amounts (debits)
    out_stmt = (
        select(sa_func.coalesce(sa_func.sum(sa_func.abs(Transaction.amount)), 0))
        .where(base_filter & (Transaction.amount < 0))
    )
    total_out = (await session.execute(out_stmt)).scalar_one()

    # Total count
    count_stmt = select(sa_func.count()).select_from(Transaction).where(base_filter)
    total_count = (await session.execute(count_stmt)).scalar_one()

    return TransactionSummary(
        total_in=total_in,
        total_out=total_out,
        net_balance=total_in - total_out,
        total_count=total_count,
    )


# ── Admin: list all transactions (paginated) ─────


@router.get("", response_model=PaginatedTransactions)
async def list_all_transactions(
    session: DBSession,
    admin: AdminUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type_filter: Optional[str] = Query(None, alias="type"),
    q: Optional[str] = Query(None),
):
    """Admin: list all transactions with server-side pagination, filtering, and search."""
    base_filter = ~(
        (Transaction.type == TransactionType.COIN_PURCHASE) & (Transaction.amount == 0)
    )
    if type_filter:
        base_filter = base_filter & (Transaction.type == type_filter)
    if q:
        base_filter = base_filter & (col(Transaction.note).ilike(f"%{q}%"))

    # Total count for pagination metadata
    count_stmt = select(sa_func.count()).select_from(Transaction).where(base_filter)
    total = (await session.execute(count_stmt)).scalar_one()

    # Paginated query with User Join
    offset = (page - 1) * per_page
    stmt = (
        select(Transaction, User)
        .join(User, Transaction.user_id == User.id)
        .where(base_filter)
        .order_by(col(Transaction.created_at).desc())
        .offset(offset)
        .limit(per_page)
    )
    results = (await session.execute(stmt)).all()

    total_pages = max(1, -(-total // per_page))  # ceil division

    items = []
    for tx, u in results:
        data = AdminTransactionRead.model_validate(tx)
        data.user_email = u.email
        data.user_clerk_id = u.clerk_id
        data.user_username = u.username or u.display_name
        items.append(data)

    return PaginatedTransactions(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


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
        
    manga = await session.get(Manga, chapter.manga_id)
    manga_title = manga.title if manga else "Unknown"

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
        note=f"Unlocked {manga_title} chapter {chapter.number}",
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
