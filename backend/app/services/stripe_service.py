"""Stripe payment service for the Coin Economy.

Handles checkout session creation and webhook processing
for coin purchases.
"""

import stripe
from fastapi import HTTPException

from app.config import get_settings

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    *,
    user_id: str,
    package_id: str = "",
    coins_to_grant: int = 0,
    success_url: str,
    cancel_url: str,
    stripe_price_id: str = "",
    amount_thb: int = 0,
    name: str = "Coins",
) -> str:
    """Create a Stripe Checkout Session and return the URL."""
    try:
        line_item: dict = {}
        if stripe_price_id:
            line_item = {"price": stripe_price_id, "quantity": 1}
        elif amount_thb > 0:
            line_item = {
                "price_data": {
                    "currency": "thb",
                    "product_data": {"name": name},
                    "unit_amount": amount_thb,
                },
                "quantity": 1,
            }
        else:
            raise ValueError("Either stripe_price_id or amount_thb is required")

        metadata: dict = {"user_id": user_id}
        if package_id:
            metadata["package_id"] = package_id
        if coins_to_grant > 0:
            metadata["coins_to_grant"] = str(coins_to_grant)

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[line_item],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
        return session.url
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")


def retrieve_checkout_session(session_id: str) -> dict:
    """Retrieve a Stripe Checkout Session by ID."""
    try:
        return stripe.checkout.Session.retrieve(session_id)
    except stripe.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe error: {e}")


def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """Verify and parse a Stripe webhook event."""
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET,
        )
        return event
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
