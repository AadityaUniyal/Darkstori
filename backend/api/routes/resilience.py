"""Zero-Waste Perishables Resilience Engine API Routes.

Handles inventory fresh-produce decay simulation, markdown scheduling,
quality verification via photo analysis, and QR scan workflows.
"""

import math
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import require_roles, verify_token
from backend.database.connection import get_db
from backend.database.models.models import ProductBatch, DarkStore

router = APIRouter()


def calculate_sigmoid_discount(freshness_score: float, steepness: float = 7.5, midpoint: float = 0.52) -> float:
    """Calculates continuous Sigmoid perishable salvage markdown rate."""
    if freshness_score >= 0.90:
        return 0.0
    # Sigmoid discount curve
    raw_discount = 1.0 / (1.0 + math.exp(steepness * (freshness_score - midpoint)))
    # Cap discount between 0.0 and 0.85 (max 85% markdown)
    return round(min(0.85, max(0.0, raw_discount)), 2)


# ── Schemas ─────────────────────────────────────────────────────────────────

class BatchCreate(BaseModel):
    product_name: str
    category: str
    store_id: int
    quantity: int = Field(default=10, ge=1)
    base_price: float = Field(gt=0)
    shelf_life_hours: float = Field(default=48.0, gt=0)
    decay_rate_per_hour: float = Field(default=0.02, ge=0)


class BatchResponse(BaseModel):
    id: int
    product_name: str
    category: str
    store_id: Optional[int] = None
    quantity: int
    base_price: float
    current_price: float
    discount_rate: float
    freshness_score: float
    arrival_time: datetime
    expiry_time: datetime
    decay_rate_per_hour: float
    qr_code_hash: Optional[str] = None
    last_verified_photo: Optional[str] = None
    bruising_percent: float
    color_state: str

    model_config = {"from_attributes": True}


class DecayRequest(BaseModel):
    hours: float
    city: Optional[str] = None
    temp_failure: bool = False


class ScanRequest(BaseModel):
    qr_code_hash: str
    store_id: Optional[int] = None


class VerifyPhotoRequest(BaseModel):
    batch_id: int
    photo_url: str
    bruising_percent: float = Field(ge=0, le=100)
    color_state: str
    freshness_score: float = Field(ge=0, le=1)


class OcrRequest(BaseModel):
    image_url: str


def _scope_batch_query(query, payload: dict):
    organization_id = payload.get("org_id") or payload.get("organization_id")
    if str(organization_id or "").isdigit() and int(organization_id) > 0:
        return query.join(DarkStore, ProductBatch.store_id == DarkStore.id).where(
            DarkStore.organization_id == int(organization_id)
        )
    return query.join(DarkStore, ProductBatch.store_id == DarkStore.id).where(
        DarkStore.organization_id.is_(None)
    )


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/batches", response_model=List[BatchResponse])
async def get_batches(
    city: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "store-gm", "store_gm")),
):
    """Retrieve active perishable produce batches."""
    query = _scope_batch_query(select(ProductBatch), payload)

    # Filter by city (requires joining DarkStore)
    if city:
        query = query.where(DarkStore.city == city)

    if category:
        query = query.where(ProductBatch.category == category)

    result = await db.execute(query)
    batches = result.scalars().all()
    return list(batches)


@router.post("/batches", response_model=BatchResponse)
async def create_batch(
    req: BatchCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "store-gm", "store_gm")),
):
    """Add a new inventory batch to track for perishable dynamic markdown."""
    import time
    now = datetime.now()
    expiry = now + timedelta(hours=req.shelf_life_hours)
    qr_hash = f"qr_{req.product_name[:3].lower()}_{int(time.time())}"

    store_query = select(DarkStore).where(DarkStore.id == req.store_id)
    organization_id = payload.get("org_id") or payload.get("organization_id")
    if str(organization_id or "").isdigit() and int(organization_id) > 0:
        store_query = store_query.where(DarkStore.organization_id == int(organization_id))
    else:
        store_query = store_query.where(DarkStore.organization_id.is_(None))
    store = (await db.execute(store_query)).scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    new_batch = ProductBatch(
        product_name=req.product_name,
        category=req.category,
        store_id=req.store_id,
        quantity=req.quantity,
        base_price=req.base_price,
        current_price=req.base_price,
        discount_rate=0.0,
        freshness_score=1.0,
        arrival_time=now,
        expiry_time=expiry,
        decay_rate_per_hour=req.decay_rate_per_hour,
        qr_code_hash=qr_hash,
        bruising_percent=0.0,
        color_state="Fresh/Optimal",
    )
    db.add(new_batch)
    await db.commit()
    await db.refresh(new_batch)
    return new_batch


@router.delete("/batches/{batch_id}")
async def delete_batch(
    batch_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Delete a perishable batch (e.g. after full sale or clearance)."""
    result = await db.execute(_scope_batch_query(select(ProductBatch), payload).where(ProductBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Product batch not found")
    await db.delete(batch)
    await db.commit()
    return {"message": "Batch removed successfully"}


@router.post("/batches/decay", response_model=List[BatchResponse])
async def simulate_decay(
    req: DecayRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Simulate decay over time, updating freshness and markdown pricing dynamically."""
    query = _scope_batch_query(select(ProductBatch), payload)
    if req.city:
        query = query.where(DarkStore.city == req.city)

    result = await db.execute(query)
    batches = result.scalars().all()

    decay_multiplier = 2.5 if req.temp_failure else 1.0

    updated_batches = []
    for b in batches:
        hours_to_decay = req.hours
        total_decay = b.decay_rate_per_hour * hours_to_decay * decay_multiplier
        b.freshness_score = max(0.0, b.freshness_score - total_decay)

        # Dynamic pricing rule based on continuous Sigmoid freshness decay
        b.discount_rate = calculate_sigmoid_discount(b.freshness_score)
        b.current_price = round(b.base_price * (1.0 - b.discount_rate), 2)
        if req.temp_failure:
            b.color_state = "Accelerated Decay / Temperature Breach"
        updated_batches.append(b)

    if updated_batches:
        await db.commit()
        for b in updated_batches:
            await db.refresh(b)
        return updated_batches

    return []


@router.post("/batches/scan-qr", response_model=BatchResponse)
async def scan_qr_crate(
    req: ScanRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Scan QR code on a crate to get current batch status."""
    query = _scope_batch_query(select(ProductBatch), payload).where(ProductBatch.qr_code_hash == req.qr_code_hash)
    if req.store_id:
        query = query.where(ProductBatch.store_id == req.store_id)

    result = await db.execute(query)
    batch = result.scalar_one_or_none()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch with this QR code not found")

    return batch


@router.post("/batches/verify-photo", response_model=BatchResponse)
async def verify_photo(
    req: VerifyPhotoRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Persist quality measurements supplied by a configured external vision client."""
    query = _scope_batch_query(select(ProductBatch), payload).where(ProductBatch.id == req.batch_id)
    result = await db.execute(query)
    batch = result.scalar_one_or_none()

    if not batch:
        raise HTTPException(status_code=404, detail="Product batch not found")

    batch.last_verified_photo = req.photo_url
    batch.bruising_percent = req.bruising_percent
    batch.color_state = req.color_state
    batch.freshness_score = req.freshness_score

    # Continuous Dynamic Sigmoid markdown pricing update
    batch.discount_rate = calculate_sigmoid_discount(batch.freshness_score)
    batch.current_price = round(batch.base_price * (1.0 - batch.discount_rate), 2)

    await db.commit()
    await db.refresh(batch)

    logger.info(f"Produce quality verified: Batch #{batch.id} - Freshness {batch.freshness_score * 100:.1f}%")
    return batch


@router.post("/batches/ocr-expiry")
async def ocr_expiry(
    req: OcrRequest,
    payload: dict = Depends(verify_token),
):
    """OCR is unavailable until an OCR provider is configured."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Expiry OCR is not configured. Enter the package expiry date manually.",
    )
