"""Recommendations API Routes.

Provides inventory, pricing, and layout recommendations for a given
neighborhood based on order history, demographics, and competition data.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import (
    InventoryRecommendation,
    Neighborhood,
    OrderSynthetic,
    PricingStrategy,
    StoreLayout,
)

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────────

class InventoryRec(BaseModel):
    category: str
    investment_amount: float
    space_allocation_pct: float
    top_skus: Optional[list] = None
    confidence_level: float

    model_config = {"from_attributes": True}


class PricingRec(BaseModel):
    segment: str
    avg_order_value_target: float
    price_range_low: float
    price_range_high: float
    discount_strategy: str
    peak_hour_pricing: Optional[dict] = None

    model_config = {"from_attributes": True}


class LayoutRec(BaseModel):
    store_size_sqft: int
    layout_zones: Optional[dict] = None
    based_on_orders: int

    model_config = {"from_attributes": True}


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/inventory", response_model=List[InventoryRec])
async def get_inventory_recommendations(
    neighborhood_id: int = Query(...),
    budget: float = Query(1600000.0),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Return inventory recommendations for a neighborhood."""
    # Try pre-computed first
    result = await db.execute(
        select(InventoryRecommendation)
        .where(InventoryRecommendation.neighborhood_id == neighborhood_id)
        .order_by(InventoryRecommendation.space_allocation_pct.desc())
    )
    recs = result.scalars().all()
    if recs:
        return [
            InventoryRec(
                category=r.category,
                investment_amount=r.investment_amount or (r.space_allocation_pct * budget / 100),
                space_allocation_pct=r.space_allocation_pct,
                top_skus=r.top_skus,
                confidence_level=r.confidence_level or 0.85
            )
            for r in recs
        ]

    # Fallback: aggregate order history by category
    cat_query = (
        select(
            OrderSynthetic.category,
            func.count(OrderSynthetic.id).label("order_count"),
            func.sum(OrderSynthetic.order_value).label("total_revenue"),
        )
        .where(OrderSynthetic.neighborhood_id == neighborhood_id)
        .group_by(OrderSynthetic.category)
        .order_by(func.count(OrderSynthetic.id).desc())
        .limit(10)
    )
    rows = (await db.execute(cat_query)).all()

    if not rows:
        # Sensible defaults for Indian quick-commerce
        defaults = [
            ("Fruits & Vegetables", 25.0),
            ("Dairy & Bread", 20.0),
            ("Snacks & Beverages", 18.0),
            ("Personal Care", 12.0),
            ("Household", 10.0),
            ("Baby & Kids", 8.0),
            ("Instant Food", 7.0),
        ]
        return [
            InventoryRec(
                category=cat,
                investment_amount=(pct / 100) * budget,
                space_allocation_pct=pct,
                top_skus=None,
                confidence_level=0.75,
            )
            for cat, pct in defaults
        ]

    total_orders = sum(r[1] for r in rows) or 1
    return [
        InventoryRec(
            category=r[0] or "Other",
            investment_amount=round((r[1] / total_orders) * budget, 2),
            space_allocation_pct=round(r[1] / total_orders * 100, 1),
            top_skus=None,
            confidence_level=min(0.95, 0.5 + r[1] / total_orders),
        )
        for r in rows
    ]


@router.get("/pricing", response_model=List[PricingRec])
async def get_pricing_recommendations(
    neighborhood_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Return pricing strategy recommendations."""
    result = await db.execute(
        select(PricingStrategy)
        .where(PricingStrategy.neighborhood_id == neighborhood_id)
    )
    recs = result.scalars().all()
    if recs:
        return recs

    # Generate from neighborhood demographics
    nbhd_result = await db.execute(
        select(Neighborhood).where(
            Neighborhood.neighborhood_id == neighborhood_id
        )
    )
    nbhd = nbhd_result.scalar_one_or_none()
    income = (nbhd.avg_household_income if nbhd else 600_000) or 600_000

    if income > 1_000_000:
        segments = [
            ("Premium", 550.0, 200.0, 1200.0, "Minimal — focus on convenience"),
            ("Regular", 350.0, 100.0, 600.0, "10-15% on bundles"),
        ]
    elif income > 600_000:
        segments = [
            ("Value", 280.0, 80.0, 500.0, "15-20% first-order + combo packs"),
            ("Budget", 180.0, 40.0, 300.0, "Heavy discounts on staples"),
        ]
    else:
        segments = [
            ("Budget", 150.0, 30.0, 250.0, "Deep discounts, loss-leader staples"),
            ("Essentials", 100.0, 20.0, 180.0, "Everyday-low-price strategy"),
        ]

    return [
        PricingRec(
            segment=seg,
            avg_order_value_target=aov,
            price_range_low=lo,
            price_range_high=hi,
            discount_strategy=strat,
            peak_hour_pricing={"18-21": "+5%", "11-14": "-3%"},
        )
        for seg, aov, lo, hi, strat in segments
    ]


@router.get("/layout", response_model=List[LayoutRec])
async def get_layout_recommendations(
    neighborhood_id: int = Query(...),
    store_size: int = Query(1500),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Return store layout recommendations."""
    result = await db.execute(
        select(StoreLayout)
        .where(StoreLayout.neighborhood_id == neighborhood_id)
        .where(StoreLayout.store_size_sqft == store_size)
    )
    recs = result.scalars().all()
    if recs:
        return recs

    # Default layout for a given store size
    return [
        LayoutRec(
            store_size_sqft=store_size,
            layout_zones={
                "cold_storage": {"pct": 20, "items": "Dairy, Frozen, Meat"},
                "ambient_shelves": {"pct": 35, "items": "Snacks, Staples, Beverages"},
                "fresh_produce": {"pct": 20, "items": "Fruits, Vegetables"},
                "personal_care": {"pct": 10, "items": "Personal Care, Baby"},
                "packing_station": {"pct": 10, "items": "Order assembly"},
                "loading_bay": {"pct": 5, "items": "Inbound/outbound"},
            },
            based_on_orders=0,
        )
    ]


@router.get("/complete")
async def get_complete_recommendations(
    neighborhood_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Get complete layout, inventory and pricing recommendations combined."""
    inv = await get_inventory_recommendations(neighborhood_id=neighborhood_id, budget=1600000.0, db=db, payload=payload)
    pricing = await get_pricing_recommendations(neighborhood_id=neighborhood_id, db=db, payload=payload)
    layout = await get_layout_recommendations(neighborhood_id=neighborhood_id, store_size=1500, db=db, payload=payload)
    return {
        "inventory": inv,
        "pricing": pricing,
        "layout": layout,
    }
