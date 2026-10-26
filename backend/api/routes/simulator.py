"""Store Simulator API Routes.

Allows users to simulate opening a new dark store in a neighborhood,
get projected revenue, break-even timeline, ROI estimates, and manage
the workflow from proposal to approval.
"""

import math
from typing import Any, List, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import (
    Neighborhood,
    StoreSimulation,
    DarkStore,
    AuditLog,
)
from backend.utils.routing import get_route_summary

router = APIRouter()


# ── Request / Response Schemas ──────────────────────────────────────────────

class SimulationRequest(BaseModel):
    """Input parameters for a new-store simulation."""
    neighborhood_id: int
    investment_amount: float = Field(ge=100_000, description="Capital investment in INR")
    store_size_sqft: int = Field(ge=200, le=10_000, description="Floor area")
    operating_hours: str = Field(default="08:00-22:00", description="e.g. 08:00-22:00 or 24x7")
    avg_order_value: float = Field(default=350.0, ge=50)
    
    # Custom operating cost parameters (Grounded in real costs)
    rent_per_sqft: Optional[float] = Field(default=None, description="Rent per sqft monthly")
    staff_salary_monthly: Optional[float] = Field(default=None, description="Monthly salary per staff member")
    capex_override: Optional[float] = Field(default=None, description="Total initial capex/setup cost")
    delivery_cost_per_order: Optional[float] = Field(default=None, description="Avg logistics/delivery cost per order")
    routing_constraint_mins: Optional[float] = Field(default=15.0, description="Serviceability radius in minutes")

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "sqft" in data and "store_size_sqft" not in data:
                data["store_size_sqft"] = data["sqft"]
            if isinstance(data.get("operating_hours"), (int, float)):
                data["operating_hours"] = f"08:00-{int(data['operating_hours']):02d}:00"
            if "investment_amount" not in data and "daily_capex_target" in data:
                data["investment_amount"] = data["daily_capex_target"]
        return data


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
    confidence_level: Optional[float] = None
    data_mode: str = "heuristic_simulation"
    factors: dict
    status: str = "proposed"
    comments: Optional[str] = None
    
    # Rates used (for display grounding)
    rent_rate: float
    staff_rate: float
    capex_rate: float
    delivery_rate: float
    routing_mins: float

    model_config = {"from_attributes": True}


class ReviewRequest(BaseModel):
    comments: str


# ── Helpers ─────────────────────────────────────────────────────────────────

def _estimate_daily_orders(
    population: int,
    density: float,
    income: float,
    store_sqft: int,
    competition: int,
    delivery_time_mins: float,
    max_delivery_mins: float,
) -> int:
    """Heuristic demand estimation adjusted for OSRM delivery time constraint."""
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
    
    # Serviceability routing penalty (orders drop if promised window > travel limit)
    routing_penalty = 1.0
    if delivery_time_mins > max_delivery_mins:
        diff = delivery_time_mins - max_delivery_mins
        routing_penalty = max(0.1, 1.0 - (diff / 10.0)) # steep decay if route time exceeds promised window
    
    orders = base * density_factor * income_factor * capacity_factor * comp_factor * routing_penalty
    return max(10, int(orders))


def _estimate_monthly_opex(
    store_sqft: int,
    daily_orders: int,
    rent_rate: float,
    staff_rate: float,
    delivery_rate: float,
) -> float:
    """Estimate monthly operating expenses based on ground costs."""
    rent = store_sqft * rent_rate
    staff = max(4, daily_orders // 30) * staff_rate
    logistics = daily_orders * 30 * delivery_rate
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
    # Use a real neighborhood record; no synthetic neighborhood substitutes.
    result = await db.execute(
        select(Neighborhood)
        .options(selectinload(Neighborhood.city))
        .where(Neighborhood.neighborhood_id == req.neighborhood_id)
    )
    nbhd = result.scalar_one_or_none()
    
    # Determine base values
    if not nbhd:
        raise HTTPException(status_code=404, detail="Neighborhood not found")
    if not nbhd.population or not nbhd.population_density or not nbhd.avg_household_income:
        raise HTTPException(status_code=422, detail="Population, density, and household income are required for this scenario")
    nb_lat = nbhd.centroid_lat or nbhd.latitude
    nb_lng = nbhd.centroid_lng or nbhd.longitude
    if nb_lat is None or nb_lng is None:
        raise HTTPException(status_code=422, detail="The neighborhood has no recorded coordinates")

    name = cast(str, nbhd.neighborhood_name) or "Unknown"
    pop = int(nbhd.population)
    dens = float(nbhd.population_density)
    inc = float(nbhd.avg_household_income)
    city = cast(str, nbhd.city.city_name) if nbhd.city else "Unknown"
    comp_result = await db.execute(
        select(DarkStore.id)
        .where(DarkStore.neighborhood_id == req.neighborhood_id)
        .where(DarkStore.is_active.is_(True))
    )
    comp = len(comp_result.all())

    # Route based delivery time check (Serviceability constraint)
    # We measure route from neighborhood centroid to a simulated perimeter delivery node (approx 2.5 km away)
    route_info = await get_route_summary(nb_lat, nb_lng, nb_lat + 0.02, nb_lng + 0.02)
    delivery_time_mins = route_info.get("duration_mins", 12.0)

    # Cost variables grounding
    rent_rate = req.rent_per_sqft if req.rent_per_sqft is not None else 45.0
    staff_rate = req.staff_salary_monthly if req.staff_salary_monthly is not None else 25000.0
    delivery_rate = req.delivery_cost_per_order if req.delivery_cost_per_order is not None else 18.0
    capex_rate = req.capex_override if req.capex_override is not None else req.investment_amount

    daily_orders = _estimate_daily_orders(
        pop, dens, inc, req.store_size_sqft, comp, delivery_time_mins, req.routing_constraint_mins or 15.0
    )
    monthly_revenue = daily_orders * 30 * req.avg_order_value
    monthly_opex = _estimate_monthly_opex(
        req.store_size_sqft, daily_orders, rent_rate, staff_rate, delivery_rate
    )
    monthly_profit = monthly_revenue - monthly_opex

    if monthly_profit > 0:
        break_even_month = max(1, math.ceil(capex_rate / monthly_profit))
    else:
        break_even_month = 999  # not profitable

    roi_12 = ((monthly_profit * 12) / capex_rate) * 100 if capex_rate else 0

    # Persist the simulation if DB model was resolved
    sim_id = None
    if nbhd:
        sim = StoreSimulation(
            neighborhood_id=req.neighborhood_id,
            investment_amount=capex_rate,
            store_size_sqft=req.store_size_sqft,
            operating_hours=req.operating_hours,
            predicted_daily_orders=daily_orders,
            predicted_monthly_revenue=monthly_revenue,
            break_even_month=break_even_month,
            roi_months=break_even_month,
            confidence_level=None,
            status="simulation",
            comments=f"OSRM delivery time: {delivery_time_mins:.1f} mins"
        )
        db.add(sim)
        await db.commit()
        await db.refresh(sim)
        sim_id = cast(int, sim.simulation_id)

    return SimulationResponse(
        simulation_id=sim_id,
        neighborhood_name=name,
        city=city,
        predicted_daily_orders=daily_orders,
        predicted_monthly_revenue=round(monthly_revenue, 2),
        monthly_operating_cost=round(monthly_opex, 2),
        break_even_month=break_even_month,
        roi_12_months_pct=round(roi_12, 1),
        confidence_level=None,
        data_mode="heuristic_simulation",
        status="simulation",
        comments=None,
        rent_rate=rent_rate,
        staff_rate=staff_rate,
        capex_rate=capex_rate,
        delivery_rate=delivery_rate,
        routing_mins=delivery_time_mins,
        factors={
            "population": pop,
            "density": dens,
            "income": inc,
            "competition_stores": comp,
            "store_sqft": req.store_size_sqft,
            "delivery_time_source": route_info.get("source", "unknown"),
            "demand_method": "transparent heuristic; not a trained or validated forecast",
            "route_method": "sample route from neighborhood centroid to an assumed 2.5 km perimeter point",
            "cost_inputs": "operator inputs or clearly stated simulator defaults",
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
            continue

    return results


# ── Propose / Review / Approve Workflow ──────────────────────────────────────

@router.get("/proposals")
async def get_proposals(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """List all proposed dark store simulations."""
    result = await db.execute(
        select(StoreSimulation).order_by(StoreSimulation.created_at.desc())
    )
    sims = result.scalars().all()
    
    # Enhance outputs with neighborhood details
    enhanced = []
    for sim in sims:
        nb_res = await db.execute(
            select(Neighborhood)
            .options(selectinload(Neighborhood.city))
            .where(Neighborhood.neighborhood_id == sim.neighborhood_id)
        )
        nb = nb_res.scalar_one_or_none()
        enhanced.append({
            "simulation_id": sim.simulation_id,
            "neighborhood_id": sim.neighborhood_id,
            "neighborhood_name": nb.neighborhood_name if nb else f"Neighborhood #{sim.neighborhood_id}",
            "city": nb.city.city_name if nb and nb.city else "Bangalore",
            "investment_amount": sim.investment_amount,
            "store_size_sqft": sim.store_size_sqft,
            "predicted_daily_orders": sim.predicted_daily_orders,
            "predicted_monthly_revenue": sim.predicted_monthly_revenue,
            "break_even_month": sim.break_even_month,
            "status": sim.status or "proposed",
            "comments": sim.comments,
            "created_at": sim.created_at
        })
    return enhanced


@router.post("/propose/{sim_id}")
async def propose_location(
    sim_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Mark location simulation status as proposed."""
    result = await db.execute(select(StoreSimulation).where(StoreSimulation.simulation_id == sim_id))
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status not in {"simulation", "draft"}:
        raise HTTPException(status_code=409, detail="Only a new simulation can be proposed")

    sim.status = "proposed"
    await db.commit()
    return {"status": "success", "message": f"Simulation #{sim_id} proposed successfully."}


@router.post("/review/{sim_id}")
async def review_location(
    sim_id: int,
    req: ReviewRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Set location status to reviewed and add comments."""
    result = await db.execute(select(StoreSimulation).where(StoreSimulation.simulation_id == sim_id))
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status != "proposed":
        raise HTTPException(status_code=409, detail="Only a proposed simulation can be reviewed")

    sim.status = "reviewed"
    sim.comments = req.comments
    
    # Audit log entry
    audit = AuditLog(
        user_id=int(payload.get("user_id")) if payload.get("user_id") and payload.get("user_id").isdigit() else None,
        action="REVIEW_SIMULATION",
        target_table="store_simulations",
        target_id=sim_id,
        new_state={"status": "reviewed", "comments": req.comments}
    )
    db.add(audit)
    await db.commit()
    return {"status": "success", "message": f"Simulation #{sim_id} reviewed successfully."}


@router.post("/approve/{sim_id}")
async def approve_location(
    sim_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Approve a reviewed scenario; physical store provisioning is a separate workflow."""
    result = await db.execute(select(StoreSimulation).where(StoreSimulation.simulation_id == sim_id))
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    if sim.status != "reviewed":
        raise HTTPException(status_code=409, detail="Only a reviewed simulation can be approved")

    sim.status = "approved"
    audit = AuditLog(
        user_id=int(payload.get("user_id")) if payload.get("user_id") and payload.get("user_id").isdigit() else None,
        action="APPROVE_SIMULATION",
        target_table="store_simulations",
        target_id=sim_id,
        new_state={
            "status": "approved",
            "physical_store_created": False,
            "note": "Approval records a decision only; create and verify a physical store separately.",
            "parameters_snapshot": {
                "investment": sim.investment_amount,
                "size_sqft": sim.store_size_sqft,
                "predicted_daily_orders": sim.predicted_daily_orders,
                "predicted_monthly_revenue": sim.predicted_monthly_revenue,
            },
            "approver": {"email": payload.get("sub"), "role": payload.get("role")},
        }
    )
    db.add(audit)
    
    await db.commit()
    return {"status": "approved", "message": f"Simulation #{sim_id} approved. No physical store was provisioned."}


@router.get("/audit-logs")
async def get_audit_logs(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Retrieve decision provenance logs from the database."""
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.action == "APPROVE_SIMULATION")
        .order_by(AuditLog.created_at.desc())
        .limit(50)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "target_table": l.target_table,
            "target_id": l.target_id,
            "new_state": l.new_state,
            "created_at": l.created_at
        }
        for l in logs
    ]
