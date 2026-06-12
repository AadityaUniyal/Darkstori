"""Store Simulator API Routes.

Allows users to simulate opening a new dark store in a neighborhood
and get projected revenue, break-even timeline, and ROI estimates.
"""

import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import (
    Neighborhood,
    StoreSimulation,
    DarkStore,
)

router = APIRouter()


# ── Request / Response Schemas ──────────────────────────────────────────────

class SimulationRequest(BaseModel):
    """Input parameters for a new-store simulation."""
    neighborhood_id: int
    investment_amount: float = Field(ge=100_000, description="Capital investment in INR")
    store_size_sqft: int = Field(ge=200, le=10_000, description="Floor area")
    operating_hours: str = Field(default="08:00-22:00", description="e.g. 08:00-22:00 or 24x7")
    avg_order_value: float = Field(default=350.0, ge=50)


class SimulationResponse(BaseModel):
    """Projected outcome of the simulation."""
    simulation_id: Optional[int] = None
    neighborhood_name: str
    city: str
    predicted_daily_orders: int
    predicted_monthly_revenue: float
    monthly_operating_cost: float
    break_even_month: int
    roi_12_months_pct: float
    confidence_level: float
    factors: dict

    model_config = {"from_attributes": True}


# ── Helpers ─────────────────────────────────────────────────────────────────

def _estimate_daily_orders(
    population: int,
    density: float,
    income: float,
    store_sqft: int,
    competition: int,
) -> int:
    """Heuristic demand estimation based on neighborhood features."""
    # Base penetration rate: ~0.5 % of population orders daily
    base = population * 0.005
    # Density multiplier (higher density → more impulse orders)
    density_factor = min(density / 5000, 2.0) if density else 1.0
    # Income multiplier (higher income → higher AOV but slightly fewer orders)
    income_factor = min(income / 800_000, 1.5) if income else 1.0
    # Store capacity factor
    capacity_factor = min(store_sqft / 1500, 2.0)
    # Competition dampening
    comp_factor = max(0.3, 1 - 0.12 * competition)
    orders = base * density_factor * income_factor * capacity_factor * comp_factor
    return max(10, int(orders))


def _estimate_monthly_opex(store_sqft: int, daily_orders: int) -> float:
    """Estimate monthly operating expenses."""
    rent = store_sqft * 45  # ₹45/sqft/month avg across metros
    staff = max(4, daily_orders // 30) * 25_000  # ₹25k/staff/month
    logistics = daily_orders * 30 * 18  # ₹18 per delivery avg
    utilities = 15_000 + store_sqft * 5
    return rent + staff + logistics + utilities


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/predict", response_model=SimulationResponse)
async def run_simulation(
    req: SimulationRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Run a what-if simulation for a new dark store (predict ROI)."""
    # Fetch neighborhood data
    result = await db.execute(
        select(Neighborhood).where(
            Neighborhood.neighborhood_id == req.neighborhood_id
        )
    )
    nbhd = result.scalar_one_or_none()
    if not nbhd:
        # Check dummy list
        dummy_nbhds = {
            1: ("Koramangala", 150000, 27272.7, 950000.0, 3, "Bangalore"),
            2: ("Indiranagar", 120000, 25000.0, 1100000.0, 4, "Bangalore"),
            3: ("HSR Layout", 180000, 29032.2, 850000.0, 3, "Bangalore"),
            4: ("Saket", 140000, 28000.0, 1200000.0, 2, "Delhi"),
            5: ("Hitech City", 200000, 25000.0, 900000.0, 2, "Hyderabad"),
        }
        if req.neighborhood_id in dummy_nbhds:
            name, pop, dens, inc, comp, city = dummy_nbhds[req.neighborhood_id]
        else:
            raise HTTPException(status_code=404, detail="Neighborhood not found")
    else:
        name = nbhd.neighborhood_name or "Unknown"
        pop = nbhd.population or 50_000
        dens = nbhd.population_density or 5_000
        inc = nbhd.avg_household_income or 600_000
        # Count existing stores
        comp_result = await db.execute(
            select(DarkStore)
            .where(DarkStore.neighborhood_id == req.neighborhood_id)
            .where(DarkStore.is_active.is_(True))
        )
        comp = len(comp_result.scalars().all())
        city = "Bangalore"  # Default city

    daily_orders = _estimate_daily_orders(
        pop, dens, inc, req.store_size_sqft, comp
    )
    monthly_revenue = daily_orders * 30 * req.avg_order_value
    monthly_opex = _estimate_monthly_opex(req.store_size_sqft, daily_orders)
    monthly_profit = monthly_revenue - monthly_opex

    if monthly_profit > 0:
        break_even_month = max(1, math.ceil(req.investment_amount / monthly_profit))
    else:
        break_even_month = 999  # not profitable

    roi_12 = ((monthly_profit * 12) / req.investment_amount) * 100 if req.investment_amount else 0
    confidence = 0.72 + min(0.18, pop / 500_000)

    # Persist the simulation if DB model was resolved
    sim_id = None
    if nbhd:
        sim = StoreSimulation(
            neighborhood_id=req.neighborhood_id,
            investment_amount=req.investment_amount,
            store_size_sqft=req.store_size_sqft,
            operating_hours=req.operating_hours,
            predicted_daily_orders=daily_orders,
            predicted_monthly_revenue=monthly_revenue,
            break_even_month=break_even_month,
            roi_months=break_even_month,
            confidence_level=round(confidence, 2),
        )
        db.add(sim)
        await db.commit()
        await db.refresh(sim)
        sim_id = sim.simulation_id

    return SimulationResponse(
        simulation_id=sim_id,
        neighborhood_name=name,
        city=city,
        predicted_daily_orders=daily_orders,
        predicted_monthly_revenue=round(monthly_revenue, 2),
        monthly_operating_cost=round(monthly_opex, 2),
        break_even_month=break_even_month,
        roi_12_months_pct=round(roi_12, 1),
        confidence_level=round(confidence, 2),
        factors={
            "population": pop,
            "density": dens,
            "income": inc,
            "competition_stores": comp,
            "store_sqft": req.store_size_sqft,
        },
    )


@router.get("/quick-estimate", response_model=SimulationResponse)
async def quick_estimate(
    neighborhood_id: int,
    investment_amount: float,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Generate quick default ROI estimation for standard store settings."""
    req = SimulationRequest(
        neighborhood_id=neighborhood_id,
        investment_amount=investment_amount,
        store_size_sqft=1500,
        operating_hours="08:00-22:00",
        avg_order_value=350.0,
    )
    return await run_simulation(req, db=db, payload=payload)


@router.get("/compare", response_model=List[SimulationResponse])
async def compare_neighborhoods(
    neighborhood_ids: str = Query(..., description="Comma-separated list of neighborhood IDs"),
    investment_amount: float = Query(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Compare multiple potential store locations side-by-side."""
    try:
        ids = [int(i.strip()) for i in neighborhood_ids.split(",") if i.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid neighborhood_ids format")

    results = []
    for nid in ids:
        try:
            req = SimulationRequest(
                neighborhood_id=nid,
                investment_amount=investment_amount,
                store_size_sqft=1500,
                operating_hours="08:00-22:00",
                avg_order_value=350.0,
            )
            sim = await run_simulation(req, db=db, payload=payload)
            results.append(sim)
        except Exception:
            # Skip failures to continue comparison
            continue

    return results
