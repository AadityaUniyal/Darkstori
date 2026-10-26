"""Authenticated ingestion endpoints for operator-owned operational events."""

from datetime import datetime
from typing import Any, List, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import require_roles
from backend.database.connection import get_db
from backend.database.models.models import AuditLog, DarkStore, OrderEvent, ProductBatch, StockLedger, User

router = APIRouter()


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
