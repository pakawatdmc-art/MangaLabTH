"""Payment endpoints (FeelFreePay)."""

from app.services.feelfreepay_service import (
    create_qr_payment,
    create_truewallet_payment,
    check_payment_status,
    _generate_reference_no,
)
from app.schemas.transaction import CoinPackageRead
from app.models.user import User
from app.models.transaction import CoinPackage, Transaction, TransactionType
from app.config import get_settings
from app.api.deps import CurrentUser, DBSession
import logging
from typing import Any, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, Form
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlmodel import select, col

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/payments", tags=["Payments"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


async def _fulfill_payment(
    *,
    session: DBSession,
    reference_no: str,
    user_id: str,
    package_id: str,
    ffp_txn_id: str,
) -> dict[str, Any]:
    """Credit coins from a successful FeelFreePay payment."""
    if not user_id or not package_id:
        return {"status": "ignored", "reason": "missing metadata"}

    # Idempotency: skip if already processed
    existing = (
        await session.execute(
            select(Transaction).where(
                Transaction.ffp_reference_no == reference_no)
        )
    ).scalar_one_or_none()

    if existing and existing.balance_after > 0:
        return {
            "status": "ignored",
            "reason": "already processed",
            "new_balance": existing.balance_after,
        }

    # Resolve coins to grant
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

    # If we created a pending transaction earlier, update it, otherwise create new
    if existing:
        existing.balance_after = new_balance
        existing.amount = coins
        existing.note = note
        existing.ffp_txn_id = ffp_txn_id
        session.add(existing)
    else:
        tx = Transaction(
            id=reference_no, # Ensure our pending transactions use referenceNo as ID
            user_id=user.id,
            type=TransactionType.COIN_PURCHASE,
            amount=coins,
            balance_after=new_balance,
            ffp_reference_no=reference_no,
            ffp_txn_id=ffp_txn_id,
            note=note,
        )
        session.add(tx)

    session.add(user)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        # Another worker already fulfilled this session
        existing_check = (
            await session.execute(
                select(Transaction).where(
                    Transaction.ffp_reference_no == reference_no)
            )
        ).scalar_one_or_none()
        return {
            "status": "ignored",
            "reason": "already processed (concurrent)",
            "new_balance": existing_check.balance_after if existing_check else 0,
        }

    return {"status": "success", "new_balance": new_balance, "coins": coins}


@router.get("/packages", response_model=List[CoinPackageRead])
async def list_packages(session: DBSession):
    """List available coin packages."""
    stmt = (
        select(CoinPackage)
        .where(CoinPackage.is_active.is_(True))
        .order_by(col(CoinPackage.sort_order))
    )
    return (await session.execute(stmt)).scalars().all()


@router.post("/checkout")
@limiter.limit("10/minute")
async def create_checkout(
    request: Request,
    package_id: str,
    method: str,  # 'qr' or 'truewallet'
    user: CurrentUser,
    session: DBSession,
):
    """Create a FeelFreePay payment request."""
    package = await session.get(CoinPackage, package_id)
    if not package or not package.is_active:
        raise HTTPException(status_code=404, detail="Package not found")

    if method not in ("qr", "truewallet"):
        raise HTTPException(status_code=400, detail="Invalid payment method")

    # Generate a reference number that fits FFP's TEXT(15) limit
    reference_no = _generate_reference_no()
    
    frontend_base = settings.cors_origin_list[0]
    
    # Use the request base URL for the webhook assuming the backend is publicly accessible.
    # IMPORTANT: FFP's CloudFront WAF blocks any request containing "localhost" or "127.0.0.1" 
    # to protect against SSRF. For local testing, use lvh.me (resolves to 127.0.0.1) for the webhooks.
    api_base_url = str(request.base_url).rstrip("/")
    if "localhost" in api_base_url or "127.0.0.1" in api_base_url:
        api_base_url = api_base_url.replace("localhost", "lvh.me").replace("127.0.0.1", "lvh.me")
        
    frontend_base_safe = frontend_base
    if "localhost" in frontend_base_safe or "127.0.0.1" in frontend_base_safe:
        frontend_base_safe = frontend_base_safe.replace("localhost", "lvh.me").replace("127.0.0.1", "lvh.me")
    
    try:
        if method == "qr":
            result = await create_qr_payment(
                amount=float(package.price_thb),
                reference_no=reference_no,
                background_url=f"{api_base_url}/api/v1/payments/webhook",
                user_id=user.id,
                package_id=str(package.id),
            )
            
        elif method == "truewallet":
            # For TrueWallet, we need background and response URLs
            # In a real app, you might expose the webhook on a public domain via ngrok for local dev
            # For this MVP, we assume settings.FRONTEND_URL exists and the backend is on the same domain or known url
            
            result = await create_truewallet_payment(
                amount=float(package.price_thb),
                reference_no=reference_no,
                response_url=f"{frontend_base_safe}/coins?status=processing&reference_no={reference_no}",
                background_url=f"{api_base_url}/api/v1/payments/webhook",
                user_id=user.id,
                package_id=str(package.id),
            )

        # Pre-create a pending transaction log Only if API call is successful
        # We leave balance_after = 0 to signify it's pending.
        tx = Transaction(
            id=reference_no,
            user_id=user.id,
            type=TransactionType.COIN_PURCHASE,
            amount=0,  # Mark as 0 until fulfilled
            balance_after=0, 
            ffp_reference_no=reference_no,
            package_id=str(package.id),
            note=f"Initiated {method} purchase of {package.name}"
        )
        session.add(tx)
        await session.commit()

        return result
            
    except HTTPException as e:
        # Re-raise known API exceptions so the frontend can display them directly
        raise e
    except Exception as e:
        logger.error("Checkout error: %s", e)
        raise HTTPException(
            status_code=400, detail="ไม่สามารถสร้างรายการชำระเงินได้")


@router.post("/webhook", include_in_schema=False)
@limiter.limit("30/minute")
async def feelfreepay_webhook(request: Request, session: DBSession):
    """Handle FeelFreePay webhooks to fulfill orders.
    
    Note: FeelFreePay TrueWallet posts JSON, QR may or may not use same structure.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    result_code = payload.get("resultCode")
    reference_no = payload.get("referenceNo")
    
    if not reference_no:
        return {"status": "ignored", "reason": "missing referenceNo"}

    # We only process if it tells us it's a success
    if result_code != "00":
        return {"status": "ignored", "reason": f"resultCode is {result_code}"}

    # Security: Double check with Check Status API
    try:
        status_data = await check_payment_status(reference_no)
    except Exception as e:
        logger.error("Webhook verify failed for %s: %s", reference_no, e)
        raise HTTPException(status_code=400, detail="Status verification failed")
        
    # Check Status API returns "00" for success and "S" for Settle
    verify_result_code = status_data.get("resultCode")
    verify_status = status_data.get("txn.status") or status_data.get("status")
    
    if verify_result_code != "00" or verify_status != "S":
        logger.warning(
            "Spoofed or incomplete webhook detected for %s (result: %s, status: %s)", 
            reference_no, verify_result_code, verify_status
        )
        return {"status": "ignored", "reason": "verification_failed"}
        
    # Valid payment! Extract metadata
    # We can use either the original payload or the verified status_data depending on FFP's exact response shape
    # Try verified data first, fallback to payload (Works for TrueWallet)
    user_id = status_data.get("txn.merchantDefined1") or payload.get("merchantDefined1")
    package_id = status_data.get("txn.merchantDefined2") or payload.get("merchantDefined2")
    ffp_txn_id = status_data.get("txn.ffpReferenceNo") or payload.get("ffpReferenceNo", "")
    
    # If missing (always the case for QR Codes), recover from our local database
    if not user_id or not package_id:
        existing_tx = (
            await session.execute(
                select(Transaction).where(Transaction.ffp_reference_no == reference_no)
            )
        ).scalar_one_or_none()
        
        if existing_tx:
            user_id = user_id or existing_tx.user_id
            package_id = package_id or existing_tx.package_id
            
    if not user_id or not package_id:
         return {"status": "error", "reason": "cannot identify user or package"}

    # Fulfill
    return await _fulfill_payment(
        session=session,
        reference_no=reference_no,
        user_id=user_id,
        package_id=package_id,
        ffp_txn_id=ffp_txn_id
    )


@router.post("/confirm")
@limiter.limit("5/minute")
async def confirm_checkout_payment(
    request: Request,
    reference_no: str,
    user: CurrentUser,
    session: DBSession,
):
    """Confirm checkout result from frontend polling.
    
    If webhook is delayed, frontend calls this to trigger a manual check_status.
    """
    if not reference_no:
        raise HTTPException(status_code=400, detail="Missing reference_no")
        
    try:
        status_data = await check_payment_status(reference_no)
    except Exception as e:
        logger.error("Manual confirm verify failed for %s: %s", reference_no, e)
        raise HTTPException(status_code=400, detail="Status verification failed")
        
    verify_result_code = status_data.get("resultCode")
    verify_status = status_data.get("txn.status") or status_data.get("status")

    if verify_result_code != "00" or verify_status != "S":
        return {"status": "pending", "reason": "payment_not_settled"}
        
    user_id = status_data.get("txn.merchantDefined1")
    package_id = status_data.get("txn.merchantDefined2")
    ffp_txn_id = status_data.get("txn.ffpReferenceNo", "")
    
    # Fallback for QR Codes which lack metadata
    if not user_id or not package_id:
        existing_tx = (
            await session.execute(
                select(Transaction).where(Transaction.ffp_reference_no == reference_no)
            )
        ).scalar_one_or_none()
        if existing_tx:
            user_id = user_id or existing_tx.user_id
            package_id = package_id or existing_tx.package_id

    if user_id != user.id:
        raise HTTPException(
            status_code=403, detail="Transaction belongs to another user")

    if not package_id:
        raise HTTPException(status_code=400, detail="Missing package information")

    return await _fulfill_payment(
        session=session,
        reference_no=reference_no,
        user_id=user.id,
        package_id=package_id,
        ffp_txn_id=ffp_txn_id
    )
