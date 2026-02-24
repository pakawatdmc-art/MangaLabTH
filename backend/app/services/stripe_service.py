"""Stripe payment service for the Coin Economy.

Handles checkout session creation and webhook processing
for coin purchases.
"""

from app.config import get_settings
import logging

import stripe
from fastapi import HTTPException

logger = logging.getLogger(__name__)


settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY


def create_checkout_session(
    *,
    user_id: str,
    package_id: str,
    success_url: str,
    cancel_url: str,
    stripe_price_id: str,
) -> str:
    """Create a Stripe Checkout Session using a fixed Price ID."""
    try:
        if not stripe_price_id:
            raise ValueError("stripe_price_id is required")

        line_item: dict = {"price": stripe_price_id, "quantity": 1}

        metadata: dict = {
            "user_id": user_id,
            "package_id": package_id,
        }

        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[line_item],  # type: ignore
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
        return session.url or ""
    except stripe.StripeError as e:
        logger.error("Stripe checkout error: %s", e)
        raise HTTPException(status_code=502, detail="Payment service error")


def retrieve_checkout_session(session_id: str) -> dict:
    """Retrieve a Stripe Checkout Session by ID."""
    try:
        return stripe.checkout.Session.retrieve(session_id)
    except stripe.StripeError as e:
        logger.error("Stripe retrieve error: %s", e)
        raise HTTPException(status_code=502, detail="Payment service error")


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
        raise HTTPException(
            status_code=400, detail="Invalid webhook signature")
