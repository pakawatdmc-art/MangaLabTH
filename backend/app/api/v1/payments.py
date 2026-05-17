"""Payment endpoints (FeelFreePay)."""

from app.services.feelfreepay_service import (
    create_qr_payment,
    create_truewallet_payment,
    check_payment_status,
    _generate_reference_no,
)
from app.schemas.transaction import CoinPackageRead
from app.models.user import User
from app.models.transaction import CoinPackage, Transaction, TransactionType, WebhookLog
from app.config import get_settings
from app.api.deps import AdminUser, CurrentUser, DBSession
import asyncio
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException, Request, Form
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
    
    # Determine payment method from the pending transaction note
    method_suffix = ""
    if existing and existing.note:
        if " qr " in existing.note:
            method_suffix = " [ QR code ]"
        elif " truewallet " in existing.note:
            method_suffix = " [ TrueWallet ]"
            
    note = f"Purchased {package.name}{method_suffix}"

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

    # Fire-and-forget: Send payment confirmation email (GC-safe)
    if user.email:
        from app.services.email_service import send_payment_confirmation_email, fire_and_forget
        fire_and_forget(
            send_payment_confirmation_email(
                to_email=user.email,
                display_name=user.display_name or "สมาชิก",
                package_name=package.name,
                coins=coins,
                price_thb=int(package.price_thb),
                new_balance=new_balance,
                reference_no=reference_no,
            )
        )

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
    
    # Use the public SITE_URL / FRONTEND_URL for the webhook callback.
    # IMPORTANT: Do NOT use request.base_url here! In Cloud Run, Next.js
    # rewrites /api/v1/* to http://localhost:8000, so request.base_url
    # resolves to "http://localhost:8000" — which FFP can never reach.
    # Instead, use the configured public URL that FFP can call over the internet.
    api_base_url = (
        settings.SITE_URL
        or settings.FRONTEND_URL
        or str(request.base_url).rstrip("/")
    ).rstrip("/")
    if "localhost" in api_base_url or "127.0.0.1" in api_base_url:
        api_base_url = api_base_url.replace("localhost", "lvh.me").replace("127.0.0.1", "lvh.me")
        
    # Webhook secret: first 16 chars of FFP_SECRET_KEY, appended to backgroundUrl
    webhook_secret = settings.FFP_SECRET_KEY[:16] if settings.FFP_SECRET_KEY else ""
    
    frontend_base_safe = frontend_base
    if "localhost" in frontend_base_safe or "127.0.0.1" in frontend_base_safe:
        frontend_base_safe = frontend_base_safe.replace("localhost", "lvh.me").replace("127.0.0.1", "lvh.me")
    
    try:
        if method == "qr":
            result = await create_qr_payment(
                amount=float(package.price_thb),
                reference_no=reference_no,
                background_url=f"{api_base_url}/api/v1/payments/webhook?secret={webhook_secret}",
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
                background_url=f"{api_base_url}/api/v1/payments/webhook?secret={webhook_secret}",
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


async def _log_webhook(
    session: DBSession,
    *,
    reference_no: Optional[str],
    raw_payload: str,
    outcome: str,
    reason: str,
    http_status: int,
    client_ip: str,
) -> None:
    """Persist a webhook attempt for audit / replay.

    Best-effort: never raises. Failures here MUST NOT break payment processing.
    Uses a fresh session so it cannot be rolled back by a parent transaction.
    """
    try:
        from app.database import async_session_factory
        async with async_session_factory() as log_session:
            log_session.add(
                WebhookLog(
                    source="feelfreepay",
                    reference_no=(reference_no or None),
                    raw_payload=(raw_payload or "")[:8000],
                    outcome=outcome[:32],
                    reason=reason[:256],
                    http_status=http_status,
                    client_ip=client_ip[:64],
                )
            )
            await log_session.commit()
    except Exception:
        logger.exception("Failed to persist WebhookLog for %s", reference_no)


def _extract_client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/webhook", include_in_schema=False)
@limiter.limit("30/minute")
async def feelfreepay_webhook(request: Request, session: DBSession):
    """Handle FeelFreePay webhooks to fulfill orders.

    Security: Verifies webhook origin via a shared secret query parameter.
    The backgroundUrl sent to FFP should include ?secret=<WEBHOOK_SECRET>.

    Reliability guarantees:
    - Every hit (valid or not) is logged to `webhook_logs` for replay/debugging.
    - Transient FFP API failures → respond 5xx so FFP retries (NOT 4xx).
    - Race condition (FFP webhook arrives before settlement is visible in
      check_status_txn) → respond 5xx so FFP retries; also reconcile cron
      will pick it up within ~10 minutes as a safety net.
    """
    client_ip = _extract_client_ip(request)
    raw_body = ""
    try:
        raw_bytes = await request.body()
        raw_body = raw_bytes.decode("utf-8", errors="replace")
    except Exception:
        raw_body = ""

    # ── Origin Verification ──────────────────────
    webhook_secret = request.query_params.get("secret", "")
    expected_secret = settings.FFP_SECRET_KEY[:16] if settings.FFP_SECRET_KEY else ""
    if not expected_secret or not hmac.compare_digest(webhook_secret, expected_secret):
        logger.warning("Webhook rejected: invalid or missing secret from %s", client_ip)
        await _log_webhook(
            session, reference_no=None, raw_payload=raw_body,
            outcome="rejected", reason="invalid_secret",
            http_status=403, client_ip=client_ip,
        )
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        payload = json.loads(raw_body) if raw_body else {}
    except Exception:
        await _log_webhook(
            session, reference_no=None, raw_payload=raw_body,
            outcome="rejected", reason="invalid_json",
            http_status=400, client_ip=client_ip,
        )
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    result_code = payload.get("resultCode")
    reference_no = payload.get("referenceNo")

    if not reference_no:
        await _log_webhook(
            session, reference_no=None, raw_payload=raw_body,
            outcome="ignored", reason="missing_referenceNo",
            http_status=200, client_ip=client_ip,
        )
        return {"status": "ignored", "reason": "missing referenceNo"}

    # We only process if it tells us it's a success
    if result_code != "00":
        await _log_webhook(
            session, reference_no=reference_no, raw_payload=raw_body,
            outcome="ignored", reason=f"resultCode={result_code}",
            http_status=200, client_ip=client_ip,
        )
        return {"status": "ignored", "reason": f"resultCode is {result_code}"}

    # Fast-path idempotency: already fulfilled? Acknowledge so FFP stops retrying.
    already = (
        await session.execute(
            select(Transaction).where(Transaction.ffp_reference_no == reference_no)
        )
    ).scalar_one_or_none()
    if already and already.balance_after > 0:
        await _log_webhook(
            session, reference_no=reference_no, raw_payload=raw_body,
            outcome="ignored", reason="already_fulfilled",
            http_status=200, client_ip=client_ip,
        )
        return {"status": "ignored", "reason": "already processed", "new_balance": already.balance_after}

    # Security: Double check with Check Status API (with retry for transient FFP failures)
    status_data = None
    last_verify_error: Optional[Exception] = None
    for attempt in range(3):
        try:
            status_data = await check_payment_status(reference_no)
            break
        except Exception as e:
            last_verify_error = e
            logger.warning("Webhook verify attempt %d/3 failed for %s: %s", attempt + 1, reference_no, e)
            if attempt < 2:
                await asyncio.sleep(1.0)

    if status_data is None:
        # IMPORTANT: 5xx so FFP retries the webhook later. (4xx would make FFP give up
        # and the payment would be lost until the reconcile cron picks it up.)
        logger.error("All webhook verify attempts failed for %s: %s", reference_no, last_verify_error)
        await _log_webhook(
            session, reference_no=reference_no, raw_payload=raw_body,
            outcome="error", reason=f"verify_unreachable: {last_verify_error}",
            http_status=502, client_ip=client_ip,
        )
        raise HTTPException(status_code=502, detail="Status verification temporarily unavailable")

    # Check Status API returns "00" for success, "S" for Settle, "G" for Granted (TrueWallet)
    SETTLED_STATUSES = {"S", "G"}
    verify_result_code = status_data.get("resultCode")
    verify_status = status_data.get("txn.status") or status_data.get("status")

    if verify_result_code != "00" or verify_status not in SETTLED_STATUSES:
        # Race condition: webhook says success but check_status hasn't caught up yet.
        # Respond 5xx so FFP retries shortly. Reconcile cron is the safety net.
        logger.warning(
            "Webhook arrived before settlement visible for %s (result: %s, status: %s) — requesting FFP retry",
            reference_no, verify_result_code, verify_status,
        )
        await _log_webhook(
            session, reference_no=reference_no, raw_payload=raw_body,
            outcome="pending_recheck",
            reason=f"verify result={verify_result_code} status={verify_status}",
            http_status=503, client_ip=client_ip,
        )
        raise HTTPException(status_code=503, detail="Payment not yet settled — please retry")

    # Valid payment! Extract metadata
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
        logger.error("Webhook cannot identify user/package for %s — manual review required", reference_no)
        await _log_webhook(
            session, reference_no=reference_no, raw_payload=raw_body,
            outcome="error", reason="cannot_identify_user_or_package",
            http_status=200, client_ip=client_ip,
        )
        return {"status": "error", "reason": "cannot identify user or package"}

    # Fulfill
    result = await _fulfill_payment(
        session=session,
        reference_no=reference_no,
        user_id=user_id,
        package_id=package_id,
        ffp_txn_id=ffp_txn_id
    )
    await _log_webhook(
        session, reference_no=reference_no, raw_payload=raw_body,
        outcome=("fulfilled" if result.get("status") == "success" else result.get("status", "ignored")),
        reason=str(result.get("reason", "")),
        http_status=200, client_ip=client_ip,
    )
    return result


@router.post("/confirm")
@limiter.limit("20/minute")
async def confirm_checkout_payment(
    request: Request,
    reference_no: str,
    user: CurrentUser,
    session: DBSession,
):
    """Confirm checkout result from frontend polling.
    
    If webhook is delayed or failed, frontend calls this to trigger a manual check_status.
    Handles both QR and TrueWallet: accepts 'G' (Granted) for TrueWallet since it means paid.
    """
    if not reference_no:
        raise HTTPException(status_code=400, detail="Missing reference_no")
    
    # Look up the pending transaction to determine payment method
    existing_tx = (
        await session.execute(
            select(Transaction).where(Transaction.ffp_reference_no == reference_no)
        )
    ).scalar_one_or_none()
    
    # Already fulfilled? Return immediately without calling FFP
    if existing_tx and existing_tx.balance_after > 0:
        return {"status": "success", "new_balance": existing_tx.balance_after, "coins": existing_tx.amount}
        
    try:
        status_data = await check_payment_status(reference_no)
    except Exception as e:
        logger.error("Manual confirm verify failed for %s: %s", reference_no, e)
        raise HTTPException(status_code=400, detail="Status verification failed")
        
    verify_result_code = status_data.get("resultCode")
    verify_status = status_data.get("txn.status") or status_data.get("status")

    # Accept both "S" (Settled) and "G" (Granted) for all payment methods.
    # "G" means the customer has already paid — the money is confirmed by FFP
    # but hasn't fully settled into the merchant account yet.
    # Previously only QR accepted "S" (rejecting "G"), which caused coins
    # not to be credited for larger amounts that take longer to settle.
    accepted_statuses = {"S", "G"}
    
    if verify_result_code != "00" or verify_status not in accepted_statuses:
        return {"status": "pending", "reason": "payment_not_settled"}
        
    user_id = status_data.get("txn.merchantDefined1")
    package_id = status_data.get("txn.merchantDefined2")
    ffp_txn_id = status_data.get("txn.ffpReferenceNo", "")
    
    # Fallback for QR Codes which lack metadata
    if not user_id or not package_id:
        if existing_tx:
            user_id = user_id or existing_tx.user_id
            package_id = package_id or existing_tx.package_id
        else:
            # Re-fetch if we haven't loaded it yet
            refetch_tx = (
                await session.execute(
                    select(Transaction).where(Transaction.ffp_reference_no == reference_no)
                )
            ).scalar_one_or_none()
            if refetch_tx:
                user_id = user_id or refetch_tx.user_id
                package_id = package_id or refetch_tx.package_id

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


# ─────────────────────────────────────────────────────────────────────────────
# Reconciliation: safety net for missed webhooks
# ─────────────────────────────────────────────────────────────────────────────


async def _reconcile_one(session: DBSession, tx: Transaction) -> dict[str, Any]:
    """Try to settle one pending transaction by polling FFP."""
    reference_no = tx.ffp_reference_no
    if not reference_no:
        return {"reference_no": tx.id, "status": "skipped", "reason": "no_reference"}

    try:
        status_data = await check_payment_status(reference_no)
    except Exception as e:
        logger.warning("Reconcile: check_status failed for %s: %s", reference_no, e)
        return {"reference_no": reference_no, "status": "error", "reason": str(e)[:128]}

    verify_result_code = status_data.get("resultCode")
    verify_status = status_data.get("txn.status") or status_data.get("status")

    if verify_result_code != "00" or verify_status not in {"S", "G"}:
        return {
            "reference_no": reference_no,
            "status": "still_pending",
            "ffp_status": verify_status,
            "ffp_resultCode": verify_result_code,
        }

    user_id = status_data.get("txn.merchantDefined1") or tx.user_id
    package_id = status_data.get("txn.merchantDefined2") or tx.package_id
    ffp_txn_id = status_data.get("txn.ffpReferenceNo", "")

    if not user_id or not package_id:
        return {"reference_no": reference_no, "status": "error", "reason": "missing_metadata"}

    result = await _fulfill_payment(
        session=session,
        reference_no=reference_no,
        user_id=user_id,
        package_id=package_id,
        ffp_txn_id=ffp_txn_id,
    )
    return {"reference_no": reference_no, **result}


@router.post("/reconcile-pending", include_in_schema=False)
async def reconcile_pending_payments(
    session: DBSession,
    x_reconcile_secret: str = Header(default=""),
    minutes_min_age: int = 3,
    hours_max_age: int = 48,
    limit: int = 50,
):
    """Sweep pending coin-purchase transactions and settle any that FFP confirms as paid.

    Designed to be called by Cloud Scheduler every ~5–10 minutes.

    Why this matters:
    - The FFP webhook can fail (network, our 5xx, FFP-side issue) and the user
      may close the browser before frontend polling finishes. Without this sweeper
      the payment is permanently lost.
    - Window: only look at txs that are >`minutes_min_age` min old (give the webhook
      a chance first) and <`hours_max_age` h old (don't waste FFP API calls on
      abandoned attempts forever).

    Auth: requires `X-Reconcile-Secret` header to match `settings.RECONCILE_SECRET`.
    """
    expected = settings.RECONCILE_SECRET or ""
    if not expected or not hmac.compare_digest(x_reconcile_secret, expected):
        raise HTTPException(status_code=403, detail="Forbidden")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    too_recent = now - timedelta(minutes=max(1, minutes_min_age))
    too_old = now - timedelta(hours=max(1, hours_max_age))

    stmt = (
        select(Transaction)
        .where(
            Transaction.type == TransactionType.COIN_PURCHASE,
            Transaction.balance_after == 0,  # never fulfilled
            Transaction.ffp_reference_no.is_not(None),  # type: ignore[union-attr]
            Transaction.created_at < too_recent,
            Transaction.created_at > too_old,
        )
        .order_by(col(Transaction.created_at).asc())
        .limit(max(1, min(limit, 200)))
    )
    pending = (await session.execute(stmt)).scalars().all()

    results: list[dict[str, Any]] = []
    fulfilled = 0
    for tx in pending:
        outcome = await _reconcile_one(session, tx)
        results.append(outcome)
        if outcome.get("status") == "success":
            fulfilled += 1
        # Be polite to FFP API
        await asyncio.sleep(0.2)

    logger.info("Reconcile sweep: %d pending, %d fulfilled", len(pending), fulfilled)
    return {
        "checked": len(pending),
        "fulfilled": fulfilled,
        "results": results,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Admin endpoints — used by support to recover individual "missing" payments
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/admin/pending", include_in_schema=False)
async def admin_list_pending(
    admin: AdminUser,
    session: DBSession,
    hours: int = 24,
    limit: int = 100,
):
    """List pending coin-purchase transactions in the last N hours for support review."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    since = now - timedelta(hours=max(1, hours))
    stmt = (
        select(Transaction)
        .where(
            Transaction.type == TransactionType.COIN_PURCHASE,
            Transaction.balance_after == 0,
            Transaction.created_at > since,
        )
        .order_by(col(Transaction.created_at).desc())
        .limit(max(1, min(limit, 500)))
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [
        {
            "reference_no": tx.ffp_reference_no,
            "user_id": tx.user_id,
            "package_id": tx.package_id,
            "note": tx.note,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        }
        for tx in rows
    ]


@router.post("/admin/manual-fulfill", include_in_schema=False)
async def admin_manual_fulfill(
    admin: AdminUser,
    session: DBSession,
    reference_no: str,
):
    """Force-fulfill a pending payment after verifying with FFP.

    Use case: customer reports payment was deducted but coins not credited.
    Admin runs this with the reference_no from the support ticket.
    """
    if not reference_no:
        raise HTTPException(status_code=400, detail="Missing reference_no")

    tx = (
        await session.execute(
            select(Transaction).where(Transaction.ffp_reference_no == reference_no)
        )
    ).scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Reference not found in our DB")

    if tx.balance_after > 0:
        return {
            "status": "already_fulfilled",
            "new_balance": tx.balance_after,
            "coins": tx.amount,
        }

    outcome = await _reconcile_one(session, tx)
    logger.info("Admin %s manually fulfilled %s: %s", admin.id, reference_no, outcome)
    return outcome


@router.get("/admin/webhook-logs", include_in_schema=False)
async def admin_list_webhook_logs(
    admin: AdminUser,
    session: DBSession,
    reference_no: Optional[str] = None,
    limit: int = 100,
):
    """Inspect raw webhook hits for debugging missing payments."""
    stmt = select(WebhookLog).order_by(col(WebhookLog.created_at).desc())
    if reference_no:
        stmt = stmt.where(WebhookLog.reference_no == reference_no)
    stmt = stmt.limit(max(1, min(limit, 500)))
    rows = (await session.execute(stmt)).scalars().all()
    return [
        {
            "id": log.id,
            "reference_no": log.reference_no,
            "outcome": log.outcome,
            "reason": log.reason,
            "http_status": log.http_status,
            "client_ip": log.client_ip,
            "raw_payload": log.raw_payload,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in rows
    ]
