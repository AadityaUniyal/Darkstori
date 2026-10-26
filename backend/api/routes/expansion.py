"""Expansion intelligence routes for regional managers.

This module unifies opportunity scoring, simulation, proposal review,
approval, and the decision ledger into one workflow-focused API.
"""

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import require_roles, verify_token
from backend.database.connection import get_db
from backend.database.models.models import (
    AuditLog,
    DarkStore,
    ExpansionDecision,
    FocusCity,
    Neighborhood,
    PlacementScore,
    StoreSimulation,
)
from backend.api.routes.simulator import run_simulation, SimulationRequest

router = APIRouter()


class OpportunityOut(BaseModel):
    neighborhood_id: int
    neighborhood_name: str
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    pincode: Optional[str] = None
    opportunity_score: Optional[float] = None
    demand_estimate: Optional[int] = None
    coverage_gain_pct: Optional[float] = None
    cannibalization_risk_pct: Optional[float] = None
    roi_12_months_pct: Optional[float] = None
    breakeven_months: Optional[int] = None
    status: str
    store_count: int
    competition_intensity: Optional[str] = None
    avg_household_income: Optional[float] = None
    population_density: Optional[float] = None
    data_mode: str = "recorded_placement_score"
    scored_at: Optional[str] = None


class ReviewPayload(BaseModel):
    review_notes: str = Field(default="")


@router.get("/opportunities")
async def list_opportunities(
    city: Optional[str] = None,
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    query = select(PlacementScore).order_by(PlacementScore.opportunity_score.desc())
    if city:
        query = query.where(func.lower(PlacementScore.city) == city.lower())
    scores = (await db.execute(query.limit(limit))).scalars().all()

    output = []
    for score in scores:
        nb = await db.scalar(
            select(Neighborhood).where(
                func.lower(Neighborhood.neighborhood_name) == score.neighborhood_name.lower(),
                Neighborhood.city.has(func.lower(FocusCity.city_name) == score.city.lower()),
            )
        )
        if not nb:
            continue
        active_stores = await db.scalar(
            select(func.count(DarkStore.id)).where(
                DarkStore.neighborhood_id == nb.neighborhood_id,
                DarkStore.is_active.is_(True),
            )
        ) or 0
        output.append(OpportunityOut(
            neighborhood_id=nb.neighborhood_id,
            neighborhood_name=score.neighborhood_name,
            city=score.city,
            lat=score.lat,
            lng=score.lng,
            pincode=nb.pincode,
            opportunity_score=score.opportunity_score,
            demand_estimate=None,
            coverage_gain_pct=None,
            cannibalization_risk_pct=None,
            roi_12_months_pct=None,
            breakeven_months=score.estimated_breakeven_months,
            status="stored_score",
            store_count=int(active_stores),
            competition_intensity=None,
            avg_household_income=nb.avg_household_income,
            population_density=nb.population_density,
            data_mode="stored_placement_score",
            scored_at=score.scored_at.isoformat() if score.scored_at else None,
        ).model_dump())
    return output


@router.post("/simulate/{neighborhood_id}")
async def simulate_opportunity(
    neighborhood_id: int,
    capex: float = Query(1500000),
    store_size_sqft: int = Query(1500),
    routing_mins: float = Query(15),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    nb = await db.scalar(select(Neighborhood).where(Neighborhood.neighborhood_id == neighborhood_id))
    if not nb:
        raise HTTPException(status_code=404, detail="Neighborhood not found")

    sim = await run_simulation(
        SimulationRequest(
            neighborhood_id=neighborhood_id,
            investment_amount=capex,
            store_size_sqft=store_size_sqft,
            operating_hours="08:00-22:00",
            avg_order_value=350.0,
            capex_override=capex,
            routing_constraint_mins=routing_mins,
        ),
        db=db,
        payload=payload,
    )
    return sim


@router.post("/decisions/{simulation_id}/review")
async def review_decision(
    simulation_id: int,
    req: ReviewPayload,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "director", "regional_head", "finance_reviewer")),
):
    sim = await db.scalar(select(StoreSimulation).where(StoreSimulation.simulation_id == simulation_id))
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    nb = await db.scalar(select(Neighborhood).where(Neighborhood.neighborhood_id == sim.neighborhood_id))
    if not nb:
        raise HTTPException(status_code=404, detail="Neighborhood not found")

    decision = ExpansionDecision(
        city=nb.city.city_name if nb.city else "",
        neighborhood_id=nb.neighborhood_id,
        neighborhood_name=nb.neighborhood_name or "Unknown",
        status="reviewed",
        opportunity_score=float(sim.predicted_daily_orders or 0) / 4,
        demand_estimate=sim.predicted_daily_orders or 0,
        coverage_gain_pct=round(min(30.0, (sim.predicted_daily_orders or 0) / 12), 1),
        cannibalization_risk_pct=round(min(35.0, max(4.0, (sim.investment_amount or 0) / 600000)), 1),
        roi_12_months_pct=float(sim.predicted_daily_orders or 0) / 8,
        breakeven_months=sim.break_even_month or 0,
        capex=sim.investment_amount or 0,
        store_size_sqft=sim.store_size_sqft or 1500,
        logistics_constraint_mins=15.0,
        simulation_id=simulation_id,
        review_notes=req.review_notes,
        decision_payload={
            "status": "reviewed",
            "review_notes": req.review_notes,
            "data_mode": "heuristic_simulation",
            "scored_at": sim.created_at.isoformat() if sim.created_at else None,
        },
    )
    db.add(decision)
    sim.status = "reviewed"
    sim.comments = req.review_notes
    db.add(AuditLog(action="REVIEW_EXPANSION_DECISION", target_table="store_simulations", target_id=simulation_id, new_state={"status": "reviewed", "review_notes": req.review_notes}))
    await db.commit()
    await db.refresh(decision)
    return {"status": "reviewed", "decision_id": decision.id}


@router.post("/decisions/{simulation_id}/approve")
async def approve_decision(
    simulation_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "director", "regional_head")),
):
    sim = await db.scalar(select(StoreSimulation).where(StoreSimulation.simulation_id == simulation_id))
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    nb = await db.scalar(select(Neighborhood).where(Neighborhood.neighborhood_id == sim.neighborhood_id))
    if not nb:
        raise HTTPException(status_code=404, detail="Neighborhood not found")

    sim.status = "scenario_approved"
    existing = await db.scalar(select(ExpansionDecision).where(ExpansionDecision.simulation_id == simulation_id))
    if existing:
        existing.status = "scenario_approved"
        existing.approved_by = int(payload.get("user_id")) if str(payload.get("user_id", "")).isdigit() else None
        existing.decision_payload = {
            **(existing.decision_payload or {}),
            "status": "scenario_approved",
            "data_mode": "heuristic_simulation",
            "physical_store_created": False,
        }
    else:
        db.add(ExpansionDecision(
            city=nb.city.city_name if nb.city else "",
            neighborhood_id=nb.neighborhood_id,
            neighborhood_name=nb.neighborhood_name or "Unknown",
            status="scenario_approved",
            opportunity_score=float(sim.predicted_daily_orders or 0) / 4,
            demand_estimate=sim.predicted_daily_orders or 0,
            coverage_gain_pct=round(min(30.0, (sim.predicted_daily_orders or 0) / 12), 1),
            cannibalization_risk_pct=round(min(35.0, max(4.0, (sim.investment_amount or 0) / 600000)), 1),
            roi_12_months_pct=float(sim.predicted_daily_orders or 0) / 8,
            breakeven_months=sim.break_even_month or 0,
            capex=sim.investment_amount or 0,
            store_size_sqft=sim.store_size_sqft or 1500,
            logistics_constraint_mins=15.0,
            simulation_id=simulation_id,
            approved_by=int(payload.get("user_id")) if str(payload.get("user_id", "")).isdigit() else None,
            decision_payload={"status": "scenario_approved", "data_mode": "heuristic_simulation", "physical_store_created": False},
        ))
    db.add(AuditLog(action="APPROVE_EXPANSION_DECISION", target_table="store_simulations", target_id=simulation_id, new_state={"status": "scenario_approved", "data_mode": "heuristic_simulation", "physical_store_created": False}))
    await db.commit()
    return {"status": "scenario_approved", "simulation_id": simulation_id, "physical_store_created": False, "data_mode": "heuristic_simulation"}


@router.get("/ledger")
async def decision_ledger(
    city: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    query = select(ExpansionDecision).order_by(ExpansionDecision.created_at.desc())
    if city:
        query = query.where(ExpansionDecision.city == city)
    if status:
        query = query.where(ExpansionDecision.status == status)
    rows = (await db.execute(query.limit(limit))).scalars().all()
    return [
        {
            "id": row.id,
            "city": row.city,
            "neighborhood_id": row.neighborhood_id,
            "neighborhood_name": row.neighborhood_name,
            "status": row.status,
            "opportunity_score": row.opportunity_score,
            "demand_estimate": row.demand_estimate,
            "coverage_gain_pct": row.coverage_gain_pct,
            "cannibalization_risk_pct": row.cannibalization_risk_pct,
            "roi_12_months_pct": row.roi_12_months_pct,
            "breakeven_months": row.breakeven_months,
            "capex": row.capex,
            "store_size_sqft": row.store_size_sqft,
            "simulation_id": row.simulation_id,
            "review_notes": row.review_notes,
            "created_at": row.created_at,
            "data_mode": (row.decision_payload or {}).get("data_mode", "legacy_unverified"),
            "physical_store_created": (row.decision_payload or {}).get("physical_store_created", False),
        }
        for row in rows
    ]
