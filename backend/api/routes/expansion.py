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

from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import (
    AuditLog,
    DarkStore,
    ExpansionDecision,
    FocusCity,
    Neighborhood,
    StoreSimulation,
)
from backend.api.routes.simulator import run_simulation, SimulationRequest

router = APIRouter()


class OpportunityOut(BaseModel):
    neighborhood_id: int
    neighborhood_name: str
    city: str
    pincode: Optional[str] = None
    opportunity_score: float
    demand_estimate: int
    coverage_gain_pct: float
    cannibalization_risk_pct: float
    roi_12_months_pct: float
    breakeven_months: int
    status: str
    store_count: int
    competition_intensity: Optional[str] = None
    avg_household_income: Optional[float] = None
    population_density: Optional[float] = None


class ReviewPayload(BaseModel):
    review_notes: str = Field(default="")


def _score_from_neighbors(nb: Neighborhood, active_stores: int, competitor_stores: int) -> dict:
    population = nb.population or 50000
    density = nb.population_density or 5000.0
    income = nb.avg_household_income or 600000.0
    competition = nb.total_stores or active_stores or competitor_stores

    demand_estimate = int(max(18, (population * 0.0045) + (density / 240) + (income / 300000) - competition * 2))
    coverage_gain_pct = round(min(32.0, 10 + density / 1200 + max(0, 6 - competition) * 2), 1)
    cannibalization_risk_pct = round(min(40.0, 8 + competition * 2.5 + max(0, 1000000 - income) / 200000), 1)
    roi_12_months_pct = round(max(4.0, demand_estimate / 2.8 + coverage_gain_pct - cannibalization_risk_pct / 2), 1)
    breakeven_months = int(max(4, min(24, 24 - roi_12_months_pct / 2)))
    opportunity_score = round(max(0.0, min(100.0, roi_12_months_pct * 1.1 + coverage_gain_pct * 1.7 - cannibalization_risk_pct)), 1)

    return {
        "demand_estimate": demand_estimate,
        "coverage_gain_pct": coverage_gain_pct,
        "cannibalization_risk_pct": cannibalization_risk_pct,
        "roi_12_months_pct": roi_12_months_pct,
        "breakeven_months": breakeven_months,
        "opportunity_score": opportunity_score,
    }


@router.get("/opportunities")
async def list_opportunities(
    city: Optional[str] = None,
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    from sqlalchemy.orm import selectinload
    query = select(Neighborhood).options(selectinload(Neighborhood.city))
    if city:
        query = query.join(Neighborhood.city).where(func.lower(FocusCity.city_name) == city.lower())
    result = await db.execute(query)
    neighborhoods = result.scalars().all()

    if not neighborhoods:
        fallback = [
            {"neighborhood_id": 1, "neighborhood_name": "Central Ward", "city": city or "Demo City", "pincode": "000001", "population_density": 6200.0, "avg_household_income": 950000.0, "competition_intensity": "High"},
            {"neighborhood_id": 2, "neighborhood_name": "North Market", "city": city or "Demo City", "pincode": "000002", "population_density": 5800.0, "avg_household_income": 1100000.0, "competition_intensity": "High"},
            {"neighborhood_id": 3, "neighborhood_name": "Transit Hub", "city": city or "Demo City", "pincode": "000003", "population_density": 5400.0, "avg_household_income": 850000.0, "competition_intensity": "Medium"},
            {"neighborhood_id": 4, "neighborhood_name": "Residential Edge", "city": city or "Demo City", "pincode": "000004", "population_density": 4900.0, "avg_household_income": 1200000.0, "competition_intensity": "Medium"},
        ]
        neighborhoods = []
        for idx, nb in enumerate(fallback[:limit]):
            score = _score_from_neighbors(
                type("N", (), {
                    "population": 100000 + idx * 10000,
                    "population_density": nb["population_density"],
                    "avg_household_income": nb["avg_household_income"],
                    "total_stores": 4 - idx,
                })(),
                active_stores=4 - idx,
                competitor_stores=2 + idx,
            )
            neighborhoods.append(OpportunityOut(
                neighborhood_id=nb["neighborhood_id"],
                neighborhood_name=nb["neighborhood_name"],
                city=nb["city"],
                pincode=nb["pincode"],
                opportunity_score=score["opportunity_score"],
                demand_estimate=score["demand_estimate"],
                coverage_gain_pct=score["coverage_gain_pct"],
                cannibalization_risk_pct=score["cannibalization_risk_pct"],
                roi_12_months_pct=score["roi_12_months_pct"],
                breakeven_months=score["breakeven_months"],
                status="unmapped",
                store_count=3 - idx,
                competition_intensity=nb["competition_intensity"],
                avg_household_income=nb["avg_household_income"],
                population_density=nb["population_density"],
            ).model_dump())
        return neighborhoods

    output = []
    for nb in neighborhoods[:limit]:
        active_stores = await db.scalar(select(func.count(DarkStore.id)).where(DarkStore.neighborhood_id == nb.neighborhood_id, DarkStore.is_active.is_(True))) or 0
        score = _score_from_neighbors(nb, int(active_stores), 0)
        output.append(OpportunityOut(
            neighborhood_id=nb.neighborhood_id,
            neighborhood_name=nb.neighborhood_name or "Unknown",
            city=nb.city.city_name if nb.city else (city or "Demo City"),
            pincode=nb.pincode,
            opportunity_score=score["opportunity_score"],
            demand_estimate=score["demand_estimate"],
            coverage_gain_pct=score["coverage_gain_pct"],
            cannibalization_risk_pct=score["cannibalization_risk_pct"],
            roi_12_months_pct=score["roi_12_months_pct"],
            breakeven_months=score["breakeven_months"],
            status="analyzed",
            store_count=int(active_stores),
            competition_intensity=nb.competition_intensity,
            avg_household_income=nb.avg_household_income,
            population_density=nb.population_density,
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
    payload: dict = Depends(verify_token),
):
    sim = await db.scalar(select(StoreSimulation).where(StoreSimulation.simulation_id == simulation_id))
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    nb = await db.scalar(select(Neighborhood).where(Neighborhood.neighborhood_id == sim.neighborhood_id))
    if not nb:
        raise HTTPException(status_code=404, detail="Neighborhood not found")

    decision = ExpansionDecision(
        city=nb.city.city_name if nb.city else "Demo City",
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
            "model_version": "3.1.0",
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
    payload: dict = Depends(verify_token),
):
    sim = await db.scalar(select(StoreSimulation).where(StoreSimulation.simulation_id == simulation_id))
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    nb = await db.scalar(select(Neighborhood).where(Neighborhood.neighborhood_id == sim.neighborhood_id))
    if not nb:
        raise HTTPException(status_code=404, detail="Neighborhood not found")

    sim.status = "approved"
    existing = await db.scalar(select(ExpansionDecision).where(ExpansionDecision.simulation_id == simulation_id))
    if existing:
        existing.status = "approved"
        existing.approved_by = int(payload.get("user_id")) if str(payload.get("user_id", "")).isdigit() else None
        existing.decision_payload = {**(existing.decision_payload or {}), "status": "approved"}
    else:
        db.add(ExpansionDecision(
            city=nb.city.city_name if nb.city else "Demo City",
            neighborhood_id=nb.neighborhood_id,
            neighborhood_name=nb.neighborhood_name or "Unknown",
            status="approved",
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
            decision_payload={"status": "approved"},
        ))
    db.add(AuditLog(action="APPROVE_EXPANSION_DECISION", target_table="store_simulations", target_id=simulation_id, new_state={"status": "approved", "store": nb.neighborhood_name}))
    await db.commit()
    return {"status": "approved", "simulation_id": simulation_id}


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
        }
        for row in rows
    ]
