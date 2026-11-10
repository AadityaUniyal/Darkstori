"""Authenticated ingestion endpoints for operator-owned operational events."""

from datetime import datetime, timezone
import hashlib
import hmac
import ipaddress
import json
import logging
import socket
import time
from typing import Any, List, Literal, Optional
from urllib.parse import urlparse
import httpx

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import require_roles
from backend.database.connection import get_db
from backend.database.models.models import AuditLog, DarkStore, OrderEvent, ProductBatch, StockLedger, User

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_safe_webhook_url(url: str) -> bool:
    """Validate that a webhook target URL is safe and not pointing to internal/private networks (SSRF prevention)."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False

        lower_host = hostname.lower().strip(".")
        # Block localhost and internal names
        if (
            lower_host in ("localhost", "127.0.0.1", "0.0.0.0", "::1", "metadata.google.internal")
            or lower_host.endswith(".local")
            or lower_host.endswith(".internal")
            or lower_host.endswith(".localhost")
            or lower_host.endswith(".lan")
        ):
            return False

        # If it's an IP literal
        try:
            ip = ipaddress.ip_address(lower_host)
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or ip.is_unspecified
            ):
                return False
            return True
        except ValueError:
            # Domain name: verify resolved IP addresses if resolvable
            try:
                addr_info = socket.getaddrinfo(lower_host, None)
                for family, _, _, _, sockaddr in addr_info:
                    ip_str = sockaddr[0]
                    resolved_ip = ipaddress.ip_address(ip_str)
                    if (
                        resolved_ip.is_private
                        or resolved_ip.is_loopback
                        or resolved_ip.is_link_local
                        or resolved_ip.is_reserved
                        or resolved_ip.is_multicast
                        or resolved_ip.is_unspecified
                    ):
                        return False
            except socket.gaierror:
                pass

        return True
    except Exception:
        return False


class OrderEventIn(BaseModel):
    """One OMS/dispatch event. ``source_event_id`` makes retries safe."""

    source: str = Field(min_length=2, max_length=80)
    source_event_id: str = Field(min_length=1, max_length=160)
    store_id: int = Field(gt=0)
    event_type: Literal["created", "packed", "dispatched", "delivered", "cancelled"]
    occurred_at: datetime
    order_value: float | None = Field(default=None, ge=0)
    delivery_mins: float | None = Field(default=None, ge=0)
    delivery_latitude: float | None = Field(default=None, ge=-90, le=90)
    delivery_longitude: float | None = Field(default=None, ge=-180, le=180)
    pincode: str | None = Field(default=None, max_length=10)
    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("source", "source_event_id")
    @classmethod
    def normalize_identifiers(cls, value: str) -> str:
        return value.strip()


class BatchSyncIn(BaseModel):
    """One WMS/POS product batch record for expiry, stock level, and freshness tracking."""

    source: str = Field(min_length=2, max_length=80, description="Upstream WMS/POS identifier")
    batch_code: str = Field(min_length=1, max_length=100, description="Unique batch SKU or barcode")
    store_id: int = Field(gt=0)
    product_name: str = Field(min_length=1, max_length=200)
    category: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=0)
    base_price: float = Field(gt=0)
    current_price: float | None = Field(default=None, gt=0)
    expiry_time: datetime
    freshness_score: float | None = Field(default=1.0, ge=0.0, le=1.0)
    decay_rate_per_hour: float | None = Field(default=0.02, ge=0.0)

    @field_validator("source", "batch_code", "product_name", "category")
    @classmethod
    def normalize_strings(cls, value: str) -> str:
        return value.strip()


async def _user_id_if_present(db: AsyncSession, payload: dict) -> int | None:
    raw_user_id = payload.get("user_id")
    if not str(raw_user_id or "").isdigit():
        return None
    user_id = int(raw_user_id)
    exists = await db.scalar(select(User.id).where(User.id == user_id))
    return user_id if exists else None


@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def ingest_order_event(
    event: OrderEventIn,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "regional_head", "store-gm", "store_gm", "gm")),
):
    """Persist a source-attributed order event without accepting benchmark data."""
    raw_org = payload.get("org_id") or payload.get("organization_id")
    if not str(raw_org or "").isdigit() or int(raw_org) <= 0:
        raise HTTPException(status_code=403, detail="An organization-scoped account is required")
    organization_id = int(raw_org)

    store = await db.scalar(
        select(DarkStore).where(DarkStore.id == event.store_id, DarkStore.organization_id == organization_id)
    )
    if not store:
        raise HTTPException(status_code=404, detail="Store not found in this workspace")

    existing = await db.scalar(
        select(OrderEvent).where(
            OrderEvent.organization_id == organization_id,
            OrderEvent.source == event.source,
            OrderEvent.source_event_id == event.source_event_id,
        )
    )
    if existing:
        return {"id": existing.id, "status": "duplicate", "received_at": existing.received_at}

    record = OrderEvent(organization_id=organization_id, **event.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"id": record.id, "status": "accepted", "received_at": record.received_at}


@router.post("/inventory/batches", status_code=status.HTTP_200_OK)
async def sync_inventory_batch(
    item: BatchSyncIn,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "regional_head", "store-gm", "store_gm", "gm")),
):
    """Synchronize a single inventory batch from an authoritative WMS or POS system."""
    raw_org = payload.get("org_id") or payload.get("organization_id")
    if not str(raw_org or "").isdigit() or int(raw_org) <= 0:
        raise HTTPException(status_code=403, detail="An organization-scoped account is required")
    organization_id = int(raw_org)

    store = await db.scalar(
        select(DarkStore).where(DarkStore.id == item.store_id, DarkStore.organization_id == organization_id)
    )
    if not store:
        raise HTTPException(status_code=404, detail="Store not found in this workspace")

    user_id = await _user_id_if_present(db, payload)
    now = datetime.utcnow()

    existing_batch = await db.scalar(
        select(ProductBatch).where(
            ProductBatch.store_id == item.store_id,
            ProductBatch.qr_code_hash == item.batch_code,
        )
    )

    resolved_price = item.current_price if item.current_price is not None else item.base_price

    if existing_batch:
        qty_delta = item.quantity - (existing_batch.quantity or 0)
        previous_qty = existing_batch.quantity
        existing_batch.quantity = item.quantity
        existing_batch.current_price = resolved_price
        existing_batch.expiry_time = item.expiry_time
        if item.freshness_score is not None:
            existing_batch.freshness_score = item.freshness_score
        if item.decay_rate_per_hour is not None:
            existing_batch.decay_rate_per_hour = item.decay_rate_per_hour

        if qty_delta != 0:
            ledger_entry = StockLedger(
                organization_id=organization_id,
                store_id=store.id,
                sku_name=item.product_name,
                quantity_changed=qty_delta,
                reason="WMS_SYNC_ADJUSTMENT",
            )
            db.add(ledger_entry)

        audit = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            action="WMS_BATCH_UPDATE",
            target_table="product_batches",
            target_id=existing_batch.id,
            previous_state={"quantity": previous_qty, "price": existing_batch.current_price},
            new_state={"quantity": item.quantity, "price": resolved_price, "source": item.source},
        )
        db.add(audit)
        await db.commit()
        await db.refresh(existing_batch)

        hours_left = max(0.0, round((existing_batch.expiry_time - now).total_seconds() / 3600.0, 1))
        return {
            "id": existing_batch.id,
            "batch_code": item.batch_code,
            "status": "updated",
            "quantity": existing_batch.quantity,
            "current_price": existing_batch.current_price,
            "hours_to_expiry": hours_left,
            "freshness_score": existing_batch.freshness_score,
            "synced_at": now.isoformat(),
        }

    new_batch = ProductBatch(
        product_name=item.product_name,
        category=item.category,
        store_id=item.store_id,
        quantity=item.quantity,
        base_price=item.base_price,
        current_price=resolved_price,
        discount_rate=0.0,
        freshness_score=item.freshness_score if item.freshness_score is not None else 1.0,
        arrival_time=now,
        expiry_time=item.expiry_time,
        decay_rate_per_hour=item.decay_rate_per_hour or 0.02,
        qr_code_hash=item.batch_code,
    )
    db.add(new_batch)
    await db.flush()

    ledger_entry = StockLedger(
        organization_id=organization_id,
        store_id=store.id,
        sku_name=item.product_name,
        quantity_changed=item.quantity,
        reason="WMS_INITIAL_RESTOCK",
    )
    db.add(ledger_entry)

    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="WMS_BATCH_CREATE",
        target_table="product_batches",
        target_id=new_batch.id,
        previous_state=None,
        new_state={"quantity": item.quantity, "price": resolved_price, "source": item.source},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_batch)

    hours_left = max(0.0, round((new_batch.expiry_time - now).total_seconds() / 3600.0, 1))
    return {
        "id": new_batch.id,
        "batch_code": item.batch_code,
        "status": "created",
        "quantity": new_batch.quantity,
        "current_price": new_batch.current_price,
        "hours_to_expiry": hours_left,
        "freshness_score": new_batch.freshness_score,
        "synced_at": now.isoformat(),
    }


@router.post("/inventory/batches/bulk", status_code=status.HTTP_200_OK)
async def sync_inventory_batches_bulk(
    batches: List[BatchSyncIn],
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "regional_head", "store-gm", "store_gm", "gm")),
):
    """Bulk ingestion of inventory batches from warehouse management systems."""
    results = []
    for item in batches:
        res = await sync_inventory_batch(item=item, db=db, payload=payload)
        results.append(res)
    return {"total": len(results), "synced": results}


class WebhookTestIn(BaseModel):
    webhook_url: str = Field(min_length=8, description="Target storefront webhook URL")
    hmac_secret: Optional[str] = Field(default=None, description="Secret key for signing HMAC-SHA256 headers")
    event_type: str = Field(default="inventory.price_update")
    payload: dict[str, Any] = Field(default_factory=dict)


@router.post("/storefront/webhook/test", status_code=status.HTTP_200_OK)
async def test_storefront_webhook(
    item: WebhookTestIn,
    payload: dict = Depends(require_roles("admin", "regional_head", "store-gm", "store_gm", "gm")),
):
    """Deliver a test webhook payload to consumer storefront (Shopify, WooCommerce, Blinkit, custom app)."""
    now = datetime.now(timezone.utc)
    test_body = {
        "event": item.event_type,
        "timestamp": now.isoformat(),
        "storefront_environment": "production",
        "data": item.payload or {
            "sku": "SKU-AMUL-500ML",
            "name": "Amul Taaza Toned Milk 500ml",
            "base_price": 27.0,
            "current_price": 27.0,
            "discount_pct": 0,
            "freshness_score": 1.0,
            "inventory_available": 142,
            "out_of_stock": False,
        },
    }

    raw_json = json.dumps(test_body, sort_keys=True)
    secret = (item.hmac_secret or "darkstor_webhook_secret_key").encode("utf-8")
    signature = hmac.new(secret, raw_json.encode("utf-8"), hashlib.sha256).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "X-Darkstor-Event": item.event_type,
        "X-Darkstor-Signature": f"sha256={signature}",
        "X-Darkstor-Timestamp": now.isoformat(),
    }

    start_time = time.perf_counter()
    status_str = "simulated"
    code = 200
    detail = "Webhook payload signed and verified. Destination test simulated successfully."

    # If it's an external HTTP/HTTPS URL, validate against SSRF and attempt ping
    if item.webhook_url.startswith("http://") or item.webhook_url.startswith("https://"):
        if not _is_safe_webhook_url(item.webhook_url):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook target URL. Target must be a publicly accessible HTTP/HTTPS destination.",
            )
        try:
            async with httpx.AsyncClient(timeout=4.0, follow_redirects=False) as client:
                res = await client.post(item.webhook_url, content=raw_json, headers=headers)
                code = res.status_code
                status_str = "delivered" if res.is_success else "http_error"
                detail = f"Received HTTP {code} from storefront endpoint."
        except httpx.TimeoutException:
            status_str = "timeout"
            code = 504
            detail = "Webhook delivery timed out after 4 seconds."
            logger.warning("Webhook delivery timed out for %s", item.webhook_url)
        except httpx.HTTPError:
            status_str = "unreachable"
            code = 502
            detail = "Unable to connect to storefront webhook endpoint."
            logger.warning("Webhook HTTP connection error for %s", item.webhook_url)
        except Exception:
            status_str = "unreachable"
            code = 500
            detail = "Webhook test delivery failed due to a network connection error."
            logger.exception("Unexpected error during webhook delivery to %s", item.webhook_url)

    latency_ms = round((time.perf_counter() - start_time) * 1000.0, 1)

    return {
        "status": status_str,
        "status_code": code,
        "target_url": item.webhook_url,
        "event_type": item.event_type,
        "hmac_signature": f"sha256={signature}",
        "latency_ms": latency_ms,
        "timestamp": now.isoformat(),
        "detail": detail,
        "sample_payload": test_body,
    }
