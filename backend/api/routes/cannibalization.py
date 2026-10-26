"""Cannibalization Simulator API Routes.

Uses Huff's Gravity Model to predict how a new store would redistribute
demand across existing stores, calculating net incremental orders vs.
cannibalized orders from the operator's own network.
"""

import math
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import (
    CannibalizationSimulation,
    DarkStore,
    CompetitorStore,
    Neighborhood,
    PincodeCoverage,
)
from backend.utils.routing import get_route_summary

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────────


class CannibalizationRequest(BaseModel):
    """Input for the cannibalization analysis."""
    lat: float = Field(..., description="Proposed store latitude")
    lng: float = Field(..., description="Proposed store longitude")
    city: str = Field(..., description="City for context")
    radius_km: float = Field(default=3.0, ge=0.5, le=10.0)
    proposed_sqft: int = Field(default=1500, ge=200, le=10000)
    avg_order_value: float = Field(default=350.0, ge=50)
    rent_per_sqft_monthly: float = Field(default=45.0, ge=0)
    staff_salary_monthly: float = Field(default=25_000.0, ge=0)
    delivery_cost_per_order: float = Field(default=18.0, ge=0)
    utilities_monthly: float = Field(default=15_000.0, ge=0)
    latent_demand_assumption_pct: float = Field(default=15.0, ge=0, le=100)

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "latitude" in data and "lat" not in data:
                data["lat"] = data["latitude"]
            if "longitude" in data and "lng" not in data:
                data["lng"] = data["longitude"]
            if "sqft" in data and "proposed_sqft" not in data:
                data["proposed_sqft"] = data["sqft"]
        return data


class AffectedStore(BaseModel):
    store_id: int
    store_name: str
    platform: str
    distance_km: float
    current_daily_orders: int
    lost_orders: int
    lost_pct: float
    remaining_orders: int


class CannibalizationResponse(BaseModel):
    data_mode: str
    assumptions: dict
    proposed_location: dict
    radius_km: float
    stores_in_radius: int
    total_market_orders: int
    new_store_predicted_orders: int
    cannibalized_from_own: int
    cannibalized_from_competitors: int
    net_incremental_orders: int
    cannibalization_rate_pct: float
    recommendation: str
    affected_stores: List[AffectedStore]
    portfolio_impact: dict


# ── Helpers ─────────────────────────────────────────────────────────────────


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    a = min(1.0, max(0.0, a))
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))


def _huff_attractiveness(sqft: int, distance_km: float, beta: float = 2.0) -> float:
    """Huff's Gravity Model: attractiveness = size / distance^beta.

    Beta = 2.0 is standard for convenience retail (quick commerce).
    Higher beta = distance matters more (customers choose nearest).
    """
    if distance_km < 0.05:
        distance_km = 0.05  # Avoid division by near-zero
    return sqft / (distance_km ** beta)


# ── Endpoint ────────────────────────────────────────────────────────────────


@router.post("/analyze", response_model=CannibalizationResponse)
async def analyze_cannibalization(
    req: CannibalizationRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Run Huff's Gravity Model cannibalization analysis.

    1. Find all stores within radius
    2. Calculate each store's current attractiveness
    3. Add the proposed store to the model
    4. Redistribute demand proportionally
    5. Calculate net incremental vs. cannibalized orders
    """
    # 1. Fetch all active dark stores and competitor stores within radius
    query = select(DarkStore).where(
        DarkStore.is_active.is_(True),
        DarkStore.city == req.city,
    )
    result = await db.execute(query)
    all_stores = list(result.scalars().all())

    comp_query = select(CompetitorStore).where(
        CompetitorStore.is_active.is_(True),
        CompetitorStore.city == req.city,
    )
    comp_result = await db.execute(comp_query)
    all_stores.extend(comp_result.scalars().all())

    # Filter by haversine distance
    nearby_stores = []
    for s in all_stores:
        dist = _haversine_km(req.lat, req.lng, s.latitude, s.longitude)
        if dist <= req.radius_km:
            nearby_stores.append((s, dist))

    # Do not score a proposed site against invented competitors or demand.
    if not nearby_stores:
        raise HTTPException(
            status_code=422,
            detail="No recorded stores or competitors were found within the selected radius; add market data before evaluating this site.",
        )

    # 2. Extract existing store capacities
    existing_stores = []
    total_current_orders = 0
    for store, dist in nearby_stores:
        sqft = getattr(store, "storage_capacity_sqft", None) or getattr(store, "estimated_size_sqft", None)
        orders = getattr(store, "estimated_daily_orders", None) or getattr(store, "daily_order_capacity", None)
        if not sqft or not orders:
            raise HTTPException(
                status_code=422,
                detail=f"Store {store.id} lacks recorded floor area or daily order capacity; complete the market data before running this scenario.",
            )
        existing_stores.append({
            "store": store,
            "distance_km": round(dist, 2),
            "lat": store.latitude,
            "lng": store.longitude,
            "sqft": sqft,
            "current_orders": orders,
        })
        total_current_orders += orders

    # 3. Authentic Multi-Point Huff Spatial Gravity Redistribution
    # Sample customer demand points across concentric rings in the service catchment area
    demand_points = [(req.lat, req.lng)]
    num_rings = 4
    points_per_ring = 8
    for r_idx in range(1, num_rings + 1):
        r_km = (req.radius_km * r_idx) / num_rings
        for p_idx in range(points_per_ring):
            angle = (2 * math.pi * p_idx) / points_per_ring
            # 1 deg lat ~ 111 km, 1 deg lng ~ 111 * cos(lat) km
            dlat = (r_km / 111.0) * math.cos(angle)
            dlng = (r_km / (111.0 * max(0.1, math.cos(math.radians(req.lat))))) * math.sin(angle)
            demand_points.append((req.lat + dlat, req.lng + dlng))

    # Evaluate pre-entry and post-entry choice probabilities across all demand centroids
    num_dp = len(demand_points)
    store_share_old = [0.0] * len(existing_stores)
    store_share_new = [0.0] * len(existing_stores)
    new_store_total_share = 0.0

    for dp_lat, dp_lng in demand_points:
        # Pre-entry attractiveness
        old_attrs = [
            _huff_attractiveness(es["sqft"], _haversine_km(dp_lat, dp_lng, es["lat"], es["lng"]))
            for es in existing_stores
        ]
        sum_old = sum(old_attrs)
        if sum_old > 0:
            for s_idx, a in enumerate(old_attrs):
                store_share_old[s_idx] += (a / sum_old) / num_dp

        # Post-entry attractiveness with proposed store
        new_attr = _huff_attractiveness(req.proposed_sqft, _haversine_km(dp_lat, dp_lng, req.lat, req.lng))
        sum_new = sum_old + new_attr
        if sum_new > 0:
            for s_idx, a in enumerate(old_attrs):
                store_share_new[s_idx] += (a / sum_new) / num_dp
            new_store_total_share += (new_attr / sum_new) / num_dp

    # 4. Total addressable market with latent demand expansion
    latent_demand_factor = req.latent_demand_assumption_pct / 100.0
    total_market = int(total_current_orders * (1 + latent_demand_factor))
    new_store_orders = max(10, int(total_market * new_store_total_share))

    # 5. Calculate cannibalization per store
    affected_stores = []
    total_cannibalized_own = 0
    total_cannibalized_competitor = 0

    for idx, es in enumerate(existing_stores):
        store = es["store"]
        old_s = store_share_old[idx]
        new_s = store_share_new[idx]
        fraction_lost = max(0.0, (old_s - new_s) / old_s) if old_s > 0 else 0.0

        lost_orders = max(0, int(es["current_orders"] * fraction_lost))
        lost_pct = round((lost_orders / es["current_orders"]) * 100, 1) if es["current_orders"] else 0.0

        is_own = store.platform and store.platform.lower() in ["darkstori", "own"]
        if is_own:
            total_cannibalized_own += lost_orders
        else:
            total_cannibalized_competitor += lost_orders

        affected_stores.append(AffectedStore(
            store_id=store.id,
            store_name=store.store_name or f"{store.platform} #{store.id}",
            platform=store.platform or "Unknown",
            distance_km=es["distance_km"],
            current_daily_orders=es["current_orders"],
            lost_orders=lost_orders,
            lost_pct=lost_pct,
            remaining_orders=es["current_orders"] - lost_orders,
        ))

    # Sort by impact (most affected first)
    affected_stores.sort(key=lambda x: x.lost_orders, reverse=True)

    # 6. Calculate net incremental orders
    net_incremental = new_store_orders - total_cannibalized_own
    cannibalization_rate = round(
        total_cannibalized_own / new_store_orders * 100, 1
    ) if new_store_orders else 0

    # 7. Generate recommendation
    if cannibalization_rate < 15:
        recommendation = f"Scenario output: model-estimated own-network cannibalization is {cannibalization_rate}%. Validate inputs before using this result in a site decision."
    elif cannibalization_rate < 35:
        recommendation = f"Scenario output: model-estimated own-network cannibalization is {cannibalization_rate}%. Review nearby-store overlap and validate inputs before deciding."
    elif cannibalization_rate < 60:
        recommendation = f"Scenario output: model-estimated own-network cannibalization is {cannibalization_rate}%. Review the scenario and validate inputs."
    else:
        recommendation = f"Scenario output: model-estimated own-network cannibalization is {cannibalization_rate}%. Review alternatives and validate inputs."

    # 8. Portfolio P&L impact
    revenue_gain = net_incremental * 30 * req.avg_order_value
    estimated_monthly_opex = (
        req.proposed_sqft * req.rent_per_sqft_monthly
        + max(4, new_store_orders // 30) * req.staff_salary_monthly
        + new_store_orders * 30 * req.delivery_cost_per_order
        + req.utilities_monthly
    )
    net_pnl = revenue_gain - estimated_monthly_opex

    # 9. Persist simulation
    try:
        sim = CannibalizationSimulation(
            proposed_lat=req.lat,
            proposed_lng=req.lng,
            proposed_city=req.city,
            radius_km=req.radius_km,
            total_new_orders=new_store_orders,
            total_cannibalized_orders=total_cannibalized_own,
            net_incremental_orders=net_incremental,
            cannibalization_rate_pct=cannibalization_rate,
            affected_stores=[
                {
                    "store_id": a.store_id,
                    "name": a.store_name,
                    "lost_orders": a.lost_orders,
                    "lost_pct": a.lost_pct,
                }
                for a in affected_stores
            ],
            portfolio_impact={
                "monthly_revenue_gain": round(revenue_gain),
                "monthly_opex": round(estimated_monthly_opex),
                "net_monthly_pnl": round(net_pnl),
            },
        )
        db.add(sim)
        await db.commit()
    except Exception as e:
        logger.warning(f"Could not persist cannibalization simulation: {e}")

    return CannibalizationResponse(
        data_mode="heuristic_simulation",
        assumptions={
            "latent_demand_assumption_pct": req.latent_demand_assumption_pct,
            "rent_per_sqft_monthly": req.rent_per_sqft_monthly,
            "staff_salary_monthly": req.staff_salary_monthly,
            "delivery_cost_per_order": req.delivery_cost_per_order,
            "utilities_monthly": req.utilities_monthly,
            "demand_method": "Huff gravity redistribution over a geometric sample of catchment points",
            "market_orders_source": "sum of recorded nearby store daily order/capacity fields",
        },
        proposed_location={"lat": req.lat, "lng": req.lng, "city": req.city},
        radius_km=req.radius_km,
        stores_in_radius=len(nearby_stores),
        total_market_orders=total_market,
        new_store_predicted_orders=new_store_orders,
        cannibalized_from_own=total_cannibalized_own,
        cannibalized_from_competitors=total_cannibalized_competitor,
        net_incremental_orders=net_incremental,
        cannibalization_rate_pct=cannibalization_rate,
        recommendation=recommendation,
        affected_stores=affected_stores,
        portfolio_impact={
            "monthly_revenue_gain": round(revenue_gain),
            "monthly_opex": round(estimated_monthly_opex),
            "net_monthly_pnl": round(net_pnl),
            "verdict": "scenario_only",
        },
    )


@router.get("/history")
async def get_cannibalization_history(
    city: Optional[str] = None,
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Retrieve past cannibalization simulations."""
    query = (
        select(CannibalizationSimulation)
        .order_by(CannibalizationSimulation.created_at.desc())
        .limit(limit)
    )
    if city:
        query = query.where(CannibalizationSimulation.proposed_city == city)

    result = await db.execute(query)
    sims = result.scalars().all()

    return [
        {
            "id": s.id,
            "proposed_lat": s.proposed_lat,
            "proposed_lng": s.proposed_lng,
            "city": s.proposed_city,
            "radius_km": s.radius_km,
            "new_orders": s.total_new_orders,
            "cannibalized": s.total_cannibalized_orders,
            "net_incremental": s.net_incremental_orders,
            "cannibalization_rate": s.cannibalization_rate_pct,
            "affected_stores": s.affected_stores,
            "portfolio_impact": s.portfolio_impact,
            "created_at": str(s.created_at) if s.created_at else None,
        }
        for s in sims
    ]
