"""FeelFreePay payment service for the Coin Economy.

Handles API integrations for QR Code, TrueWallet, and webhook verifications.

Architecture notes:
- QR Code: Server-side POST with Content-Type: application/x-www-form-urlencoded
  (CloudFront allows this; browser form POST gets 403 due to multipart/form-data)
- TrueWallet: Browser-side form POST (user's browser submits directly to FFP)
- Check Status: Server-side JSON POST with Basic Auth
"""

import base64
import hashlib
import hmac
import logging
import time
from typing import Any, Dict

import httpx
from fastapi import HTTPException

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _generate_reference_no() -> str:
    """Generate a unique referenceNo that fits FFP's TEXT(15) limit.
    
    Uses UUID4 hex (collision-resistant) truncated to 15 characters.
    This is far safer than timestamp-based generation which can collide
    when multiple users pay simultaneously.
    """
    from uuid import uuid4
    return uuid4().hex[:15].upper()  # 15 chars, hex, uppercase


def _generate_checksum(amount: str, reference_no: str, response_url: str, background_url: str) -> str:
    """Generate HMAC SHA-256 checksum for TrueWallet requests.
    
    Per FFP docs: checksum = HMAC-SHA256(amount + referenceNo + responseUrl + backgroundUrl, secretKey)
    """
    data = f"{amount}{reference_no}{response_url}{background_url}"
    secret = settings.FFP_SECRET_KEY.encode('utf-8')
    message = data.encode('utf-8')
    
    signature = hmac.new(secret, message, hashlib.sha256).hexdigest()
    return signature


async def create_qr_payment(
    *,
    amount: float,
    reference_no: str,
    background_url: str,
    user_id: str,
    package_id: str,
) -> Dict[str, Any]:
    """Create a FeelFreePay QR Code payment request.
    
    Server-side POST because CloudFront requires application/x-www-form-urlencoded.
    Returns the QR code image as a base64 data URI.
    """
    url = f"{settings.FFP_BASE_URL}/ffp/gateway/qrcode"
    
    payload = {
        "token": settings.FFP_CUSTOMER_KEY,
        "amount": f"{amount:.2f}",
        "referenceNo": reference_no,
        "backgroundUrl": background_url,
        "detail": "MangaLabTH Coin Purchase",
        "merchantDefined1": user_id,
        "merchantDefined2": package_id,
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, data=payload, headers=headers)
            
            content_type = response.headers.get("Content-Type", "")
            
            # Success: FFP returns image/png for QR code
            if "image" in content_type.lower():
                b64_img = base64.b64encode(response.content).decode("utf-8")
                return {
                    "qr_data": f"data:{content_type};base64,{b64_img}",
                    "type": "qr",
                    "reference_no": reference_no,
                }
            
            # Error responses (may be 200 with text body or 400+)
            resp_text = response.text.strip()
            logger.error("FFP QR non-image response (HTTP %s): %s", response.status_code, resp_text)
            
            if "invalid token" in resp_text.lower():
                raise HTTPException(status_code=400, detail="FFP Token ไม่ถูกต้อง กรุณาตรวจสอบ FFP_CUSTOMER_KEY ใน .env (ดูจาก Profile > Gen Token ที่ feelfreepay.com)")
            elif "incomplete" in resp_text.lower():
                raise HTTPException(status_code=400, detail=f"ข้อมูลไม่ครบถ้วน: {resp_text}")
            elif "duplicate" in resp_text.lower():
                raise HTTPException(status_code=400, detail="referenceNo ซ้ำ กรุณาลองใหม่อีกครั้ง")
            elif "disallow" in resp_text.lower():
                raise HTTPException(status_code=400, detail="บัญชีไม่ได้รับอนุญาตให้ใช้ bill payment")
            else:
                raise HTTPException(status_code=502, detail="เกิดข้อผิดพลาดจากระบบชำระเงิน กรุณาลองใหม่อีกครั้ง")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error("FeelFreePay QR API error: %s", e)
        raise HTTPException(status_code=502, detail="เกิดข้อผิดพลาดจากระบบชำระเงิน กรุณาลองใหม่อีกครั้ง")


async def create_truewallet_payment(
    *,
    amount: float,
    reference_no: str,
    response_url: str,
    background_url: str,
    user_id: str,
    package_id: str,
) -> Dict[str, Any]:
    """Create a FeelFreePay TrueWallet payment request.
    
    Per FFP TrueWallet PDF: The user's BROWSER must POST the form data directly.
    We compute the checksum server-side and return the form parameters.
    """
    url = f"{settings.FFP_BASE_URL}/v1/trueWallet"
    amount_str = f"{amount:.2f}"
    
    checksum = _generate_checksum(
        amount=amount_str,
        reference_no=reference_no,
        response_url=response_url,
        background_url=background_url
    )

    payload = {
        "publicKey": settings.FFP_PUBLIC_KEY,
        "amount": amount_str,
        "referenceNo": reference_no,
        "responseUrl": response_url,
        "backgroundUrl": background_url,
        "checksum": checksum,
        "detail": "MangaLabTH Coin Purchase",
        "merchantDefined1": user_id,
        "merchantDefined2": package_id,
    }

    return {
        "type": "truewallet_form",
        "action_url": url,
        "parameters": payload,
        "reference_no": reference_no,
    }


async def check_payment_status(reference_no: str) -> Dict[str, Any]:
    """Check the status of a transaction with FeelFreePay.
    
    Per FFP Query PDF:
    - URL: /v1/check_status_txn
    - Auth: Basic Base64(secret_key + ":")
    - Content-Type: application/json
    """
    url = f"{settings.FFP_BASE_URL}/v1/check_status_txn"
    
    auth_string = f"{settings.FFP_SECRET_KEY}:"
    auth_base64 = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Basic {auth_base64}",
    }
    
    payload = {
        "referenceNo": reference_no
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # FFP can return txn as object or array
            txn = data.get("txn", {})
            if isinstance(txn, list) and len(txn) > 0:
                settled = [t for t in txn if t.get("status") == "S"]
                txn = settled[0] if settled else txn[-1]
            
            result = {"resultCode": data.get("resultCode", "")}
            if isinstance(txn, dict):
                for key, value in txn.items():
                    result[f"txn.{key}"] = value
            
            return result
            
    except httpx.HTTPError as e:
        logger.error("FeelFreePay Check Status API error: %s", e)
        raise HTTPException(status_code=502, detail="Failed to verify payment status")
