"""Recommendations API Routes.

Provides inventory, pricing, and layout recommendations for a given
neighborhood based on order history, demographics, and competition data.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.utils.recommendation_engine import (
    RecommendationEngine,
    InventoryStrategy,
    PricingStrategyContext,
    LayoutStrategy,
    InventoryRec,
    PricingRec,
    LayoutRec,
)

router = APIRouter()


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/inventory", response_model=List[InventoryRec])
async def get_inventory_recommendations(
    neighborhood_id: int = Query(...),
    budget: float = Query(1600000.0),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Return inventory recommendations for a neighborhood."""
    engine = RecommendationEngine(InventoryStrategy())
    return await engine.execute(neighborhood_id, {"budget": budget}, db)


@router.get("/pricing", response_model=List[PricingRec])
async def get_pricing_recommendations(
    neighborhood_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Return pricing strategy recommendations."""
    engine = RecommendationEngine(PricingStrategyContext())
    return await engine.execute(neighborhood_id, {}, db)


@router.get("/layout", response_model=List[LayoutRec])
async def get_layout_recommendations(
    neighborhood_id: int = Query(...),
    store_size: int = Query(1500),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Return store layout recommendations."""
    engine = RecommendationEngine(LayoutStrategy())
    return await engine.execute(neighborhood_id, {"store_size": store_size}, db)


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
