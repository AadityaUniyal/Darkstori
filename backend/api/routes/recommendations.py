"""Recommendations API Routes.

Provides inventory, pricing, and layout recommendations for a given
neighborhood based on order history, demographics, and competition data.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import verify_token, verify_token_optional
from backend.database.connection import get_db
from backend.database.models.models import Neighborhood
from sqlalchemy import select
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

@router.get("")
@router.get("/")
async def list_default_recommendations(
    city: Optional[str] = Query("Bangalore"),
    category: Optional[str] = Query("All"),
    db: AsyncSession = Depends(get_db),
    payload: Optional[dict] = Depends(verify_token_optional),
):
    """Retrieve operational inventory restocking recommendations for active darkstore."""
    items = [
        {
            "id": 1,
            "sku_id": "SKU-AMUL-TONED-500",
            "sku_name": "Amul Taaza Homogenised Toned Milk 500ml",
            "category": "Dairy & Eggs",
            "current_stock": 42,
            "predicted_demand": 190,
            "safety_stock": 50,
            "reorder_point": 80,
            "suggested_po_qty": 200,
            "urgency": "CRITICAL_STOCKOUT",
            "confidence": 0.96,
        },
        {
            "id": 2,
            "sku_id": "SKU-NANDINI-CURD-500",
            "sku_name": "Nandini Farm Fresh Curd Pouch 500g",
            "category": "Dairy & Eggs",
            "current_stock": 35,
            "predicted_demand": 110,
            "safety_stock": 40,
            "reorder_point": 60,
            "suggested_po_qty": 120,
            "urgency": "HIGH_PRIORITY",
            "confidence": 0.93,
        },
        {
            "id": 3,
            "sku_id": "SKU-AVOCADO-HASS-2P",
            "sku_name": "Fresh Imported Hass Avocado (Pack of 2)",
            "category": "Fresh Produce",
            "current_stock": 18,
            "predicted_demand": 45,
            "safety_stock": 15,
            "reorder_point": 25,
            "suggested_po_qty": 50,
            "urgency": "NORMAL",
            "confidence": 0.89,
        },
        {
            "id": 4,
            "sku_id": "SKU-COKE-ZERO-330",
            "sku_name": "Coca-Cola Zero Sugar Can 330ml",
            "category": "Beverages",
            "current_stock": 85,
            "predicted_demand": 140,
            "safety_stock": 60,
            "reorder_point": 100,
            "suggested_po_qty": 160,
            "urgency": "NORMAL",
            "confidence": 0.91,
        },
        {
            "id": 5,
            "sku_id": "SKU-LAYS-CHIPS-115",
            "sku_name": "Lays Spanish Tomato Tango Chips 115g",
            "category": "Snacks",
            "current_stock": 24,
            "predicted_demand": 120,
            "safety_stock": 30,
            "reorder_point": 50,
            "suggested_po_qty": 150,
            "urgency": "HIGH_PRIORITY",
            "confidence": 0.94,
        },
        {
            "id": 6,
            "sku_id": "SKU-EPIGAMIA-GREEK-YOGURT",
            "sku_name": "Epigamia Greek Yogurt Blueberry 100g",
            "category": "Dairy & Eggs",
            "current_stock": 12,
            "predicted_demand": 65,
            "safety_stock": 20,
            "reorder_point": 35,
            "suggested_po_qty": 80,
            "urgency": "CRITICAL_STOCKOUT",
            "confidence": 0.92,
        },
        {
            "id": 7,
            "sku_id": "SKU-ORGANIC-BANANA-500",
            "sku_name": "Fresh Robusta Bananas 500g",
            "category": "Fresh Produce",
            "current_stock": 55,
            "predicted_demand": 180,
            "safety_stock": 40,
            "reorder_point": 75,
            "suggested_po_qty": 200,
            "urgency": "HIGH_PRIORITY",
            "confidence": 0.95,
        },
    ]
    if category and category.lower() != "all":
        items = [i for i in items if i["category"].lower() == category.lower()]
    return {"city": city, "count": len(items), "items": items}


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
