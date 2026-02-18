"""Payment endpoints (Stripe)."""

import stripe
from typing import List

from fastapi import APIRouter, HTTPException, Request, status
from sqlmodel import select

from app.api.deps import CurrentUser, DBSession
from app.config import get_settings
from app.models.transaction import CoinPackage, Transaction, TransactionType
from app.models.user import User
from app.schemas.transaction import CoinPackageRead
from app.services.stripe_service import create_checkout_session, verify_webhook_signature

router = APIRouter(prefix="/payments", tags=["Payments"])
settings = get_settings()


@router.get("/packages", response_model=List[CoinPackageRead])
async def list_packages(session: DBSession):
    """List available coin packages."""
    stmt = (
        select(CoinPackage)
        .where(CoinPackage.is_active == True)
        .order_by(CoinPackage.sort_order)
    )
    return (await session.execute(stmt)).scalars().all()


@router.post("/checkout")
async def create_checkout(
    package_id: str,
    user: CurrentUser,
    session: DBSession,
):
    """Create a Stripe Checkout Session for a specific package."""
    package = await session.get(CoinPackage, package_id)
    if not package or not package.is_active:
        raise HTTPException(status_code=404, detail="Package not found")

    # Create session
    try:
        url = create_checkout_session(
            stripe_price_id=package.stripe_price_id,
            amount_thb=package.price_thb,
            name=package.name,
            user_id=user.id,
            package_id=package.id,
            success_url=f"{settings.cors_origin_list[0]}/coins?success=true",
            cancel_url=f"{settings.cors_origin_list[0]}/coins?canceled=true",
        )
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, session: DBSession):
    """Handle Stripe webhooks to fulfill orders."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = verify_webhook_signature(payload, sig_header)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]
        metadata = session_data.get("metadata", {})
        user_id = metadata.get("user_id")
        package_id = metadata.get("package_id")
        payment_intent_id = session_data.get("payment_intent")

        if not user_id or not package_id:
            # Invalid metadata, cannot fulfill
            return {"status": "ignored", "reason": "missing metadata"}

        # ── Fulfillment Logic ────────────────────────
        # 1. Get package and user
        # 2. Atomic update of balance
        
        # Check if transaction already exists (idempotency)
        existing = (
            await session.execute(
                select(Transaction).where(
                    Transaction.stripe_payment_intent_id == payment_intent_id
                )
            )
        ).scalar_one_or_none()

        if existing:
            return {"status": "ignored", "reason": "already processed"}

        package = await session.get(CoinPackage, package_id)
        if not package:
             # Package deleted? Fallback logic or log error
             return {"status": "error", "reason": "package not found"}

        # Lock user for update
        user_stmt = select(User).where(User.id == user_id).with_for_update()
        user = (await session.execute(user_stmt)).scalar_one_or_none()
        
        if not user:
            return {"status": "error", "reason": "user not found"}

        new_balance = user.coin_balance + package.coins
        user.coin_balance = new_balance
        
        tx = Transaction(
            user_id=user.id,
            type=TransactionType.COIN_PURCHASE,
            amount=package.coins,
            balance_after=new_balance,
            stripe_payment_intent_id=payment_intent_id,
            note=f"Purchased {package.name}",
        )
        session.add(user)
        session.add(tx)
        await session.commit()
    
    return {"status": "success"}
