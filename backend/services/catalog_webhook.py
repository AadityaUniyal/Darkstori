"""Outbound catalog and OMS price update webhook dispatcher.

Dispatches authenticated, signed price-change events to the retailer's
e-commerce platform, WMS, or OMS when an operator approves a decision.
"""

import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import httpx

from backend.core.config import settings

logger = logging.getLogger("darkstore_api")


def sign_payload(payload_bytes: bytes, secret: str) -> str:
    """Generate HMAC-SHA256 signature for outbound webhooks."""
    return hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()


async def dispatch_catalog_price_update(
    organization_id: int,
    store_id: int,
    store_code: Optional[str],
    batch_id: int,
    batch_code: Optional[str],
    product_name: str,
    old_price: float,
    new_price: float,
    discount_pct: float,
    webhook_url: Optional[str] = None,
    timeout_seconds: float = 5.0,
) -> Dict[str, Any]:
    """Emit an outbound webhook to notify the operator's catalog/OMS of an approved markdown.

    If no webhook_url is configured, records a queued event in local-audit mode.
    """
    now = datetime.now(timezone.utc)
    event_payload = {
        "event_id": f"evt-price-{batch_id}-{int(now.timestamp())}",
        "event_type": "CATALOG_PRICE_MARKDOWN_APPLIED",
        "organization_id": organization_id,
        "store_id": store_id,
        "store_code": store_code or f"STORE-{store_id}",
        "batch_id": batch_id,
        "batch_code": batch_code or f"BATCH-{batch_id}",
        "product_name": product_name,
        "pricing": {
            "previous_price": round(old_price, 2),
            "new_price": round(new_price, 2),
            "discount_pct": round(discount_pct, 1),
            "currency": "INR",
        },
        "timestamp": now.isoformat(),
        "source": "Darkstori Autonomous Decision Engine",
    }

    url = webhook_url or getattr(settings, "CATALOG_WEBHOOK_URL", None)

    if not url:
        logger.info(
            f"Catalog price update queued locally for batch {batch_id} ({product_name}: INR {old_price} -> INR {new_price}). "
            "No outbound webhook URL configured."
        )
        return {
            "status": "queued_local",
            "event_id": event_payload["event_id"],
            "dispatched": False,
            "url": None,
            "timestamp": now.isoformat(),
        }

    raw_body = json.dumps(event_payload).encode("utf-8")
    secret = getattr(settings, "WEBHOOK_SIGNING_SECRET", settings.JWT_SECRET_KEY)
    signature = sign_payload(raw_body, secret)

    headers = {
        "Content-Type": "application/json",
        "X-Darkstori-Timestamp": now.isoformat(),
        "X-Darkstori-Signature": signature,
        "User-Agent": "Darkstori-Webhook-Dispatcher/3.0",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post(url, content=raw_body, headers=headers)
            is_success = 200 <= resp.status_code < 300
            logger.info(
                f"Dispatched price update to {url} (HTTP {resp.status_code}) for batch {batch_id}"
            )
            return {
                "status": "delivered" if is_success else "rejected",
                "http_status": resp.status_code,
                "event_id": event_payload["event_id"],
                "dispatched": is_success,
                "url": url,
                "timestamp": now.isoformat(),
            }
    except Exception as exc:
        logger.warning(f"Failed to deliver catalog price webhook to {url}: {exc}")
        return {
            "status": "failed_connection",
            "error": str(exc),
            "event_id": event_payload["event_id"],
            "dispatched": False,
            "url": url,
            "timestamp": now.isoformat(),
        }
