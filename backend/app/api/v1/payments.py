"""Payment endpoints (Stripe)."""

from typing import Any, List

from fastapi import APIRouter, HTTPException, Request
from sqlmodel import select

from app.api.deps import CurrentUser, DBSession
from app.config import get_settings
from app.models.transaction import CoinPackage, Transaction, TransactionType
from app.models.user import User
from app.schemas.transaction import CoinPackageRead, CustomCheckoutRequest
from app.services.stripe_service import (
    create_checkout_session,
    retrieve_checkout_session,
    verify_webhook_signature,
)

router = APIRouter(prefix="/payments", tags=["Payments"])
settings = get_settings()


_BONUS_PRESETS: dict[int, int] = {50: 55, 100: 120, 150: 170}


def calculate_coins(amount_thb: int) -> int:
    """Only 50 / 100 / 150 THB have bonus coins. All other amounts are 1:1."""
    return _BONUS_PRESETS.get(amount_thb, amount_thb)


def _get_payment_reference(session_data: dict[str, Any]) -> str:
    """Use payment_intent when present; fallback to checkout session id for idempotency."""
    payment_intent_id = session_data.get("payment_intent")
    if isinstance(payment_intent_id, str) and payment_intent_id:
        return payment_intent_id

    checkout_session_id = session_data.get("id")
    if isinstance(checkout_session_id, str) and checkout_session_id:
        return f"cs_{checkout_session_id}"

    raise HTTPException(status_code=400, detail="Missing Stripe payment reference")


async def _fulfill_checkout_session(
    *,
    session: DBSession,
    session_data: dict[str, Any],
) -> dict[str, Any]:
    """Credit coins from a paid Stripe Checkout session. Idempotent."""
    metadata = session_data.get("metadata", {})
    user_id = metadata.get("user_id")
    package_id = metadata.get("package_id")
    coins_to_grant_str = metadata.get("coins_to_grant")

    if not user_id or (not package_id and not coins_to_grant_str):
        return {"status": "ignored", "reason": "missing metadata"}

    if session_data.get("payment_status") != "paid":
        return {"status": "pending", "reason": "payment_not_paid"}

    payment_ref = _get_payment_reference(session_data)

    # Idempotency: skip if already processed
    existing = (
        await session.execute(
            select(Transaction).where(Transaction.stripe_payment_intent_id == payment_ref)
        )
    ).scalar_one_or_none()

    if existing:
        return {
            "status": "ignored",
            "reason": "already processed",
            "new_balance": existing.balance_after,
        }

    # Resolve coins to grant
    if coins_to_grant_str:
        coins = int(coins_to_grant_str)
        note = f"Purchased {coins} coins (custom amount)"
    else:
        package = await session.get(CoinPackage, package_id)
        if not package:
            return {"status": "error", "reason": "package not found"}
        coins = package.coins
        note = f"Purchased {package.name}"

    # Lock user for atomic balance update
    user_stmt = select(User).where(User.id == user_id).with_for_update()
    user = (await session.execute(user_stmt)).scalar_one_or_none()

    if not user:
        return {"status": "error", "reason": "user not found"}

    new_balance = user.coin_balance + coins
    user.coin_balance = new_balance

    tx = Transaction(
        user_id=user.id,
        type=TransactionType.COIN_PURCHASE,
        amount=coins,
        balance_after=new_balance,
        stripe_payment_intent_id=payment_ref,
        note=note,
    )
    session.add(user)
    session.add(tx)
    await session.commit()

    return {"status": "success", "new_balance": new_balance, "coins": coins}


@router.get("/packages", response_model=List[CoinPackageRead])
async def list_packages(session: DBSession):
    """List available coin packages."""
    stmt = (
        select(CoinPackage)
        .where(CoinPackage.is_active == True)
        .order_by(CoinPackage.sort_order)
    )
    return (await session.execute(stmt)).scalars().all()


@router.post("/checkout/custom")
async def create_custom_checkout(
    body: CustomCheckoutRequest,
    user: CurrentUser,
):
    """Create a Stripe Checkout Session for a flexible user-chosen baht amount."""
    coins = calculate_coins(body.amount_thb)
    amount_satang = body.amount_thb * 100  # Stripe expects smallest currency unit
    try:
        url = create_checkout_session(
            user_id=user.id,
            coins_to_grant=coins,
            amount_thb=amount_satang,
            name=f"{coins} เหรียญ mangaFactory",
            success_url=f"{settings.cors_origin_list[0]}/coins?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.cors_origin_list[0]}/coins?canceled=true",
        )
        return {"url": url, "coins": coins}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
            success_url=f"{settings.cors_origin_list[0]}/coins?success=true&session_id={{CHECKOUT_SESSION_ID}}",
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

    if event["type"] in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    }:
        session_data = event["data"]["object"]
        return await _fulfill_checkout_session(session=session, session_data=session_data)

    return {"status": "ignored", "reason": "event_not_handled"}


@router.post("/confirm")
async def confirm_checkout_payment(
    checkout_session_id: str,
    user: CurrentUser,
    session: DBSession,
):
    """Confirm checkout result from frontend return URL when webhook is delayed."""
    stripe_session = retrieve_checkout_session(checkout_session_id)
    metadata = stripe_session.get("metadata", {})

    # Prevent users from confirming someone else's checkout session.
    if metadata.get("user_id") and metadata.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Checkout session does not belong to this user")

    return await _fulfill_checkout_session(session=session, session_data=stripe_session)
