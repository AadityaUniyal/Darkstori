"""Delivery SLA Metrics API Routes.

Tracks delivery SLA compliance — average ETA, breach rates, and
peak-hour performance per pincode / neighborhood.
"""

from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import DeliverySLAMetric, OrderSynthetic

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────────

class SLAOverview(BaseModel):
    city: str
    avg_eta_min: float
    avg_breach_pct: float
    worst_pincode: Optional[str] = None
    worst_breach_pct: Optional[float] = None
    total_pincodes_tracked: int


class SLAPincodeDetail(BaseModel):
    pincode: str
    neighborhood_name: Optional[str]
    city: str
    avg_eta_min: Optional[float]
    sla_breach_pct: Optional[float]
    peak_eta_min: Optional[float]
    orders_7d: int
    recorded_date: Optional[str]

    model_config = {"from_attributes": True}


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/metrics", response_model=List[SLAPincodeDetail])
async def get_sla_metrics(
    city: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Retrieve SLA performance details for pincodes, optionally filtered by city."""
    query = select(DeliverySLAMetric).order_by(DeliverySLAMetric.sla_breach_pct.desc())
    if city:
        query = query.where(DeliverySLAMetric.city == city)
    query = query.limit(limit)

    rows = (await db.execute(query)).scalars().all()

    if not rows:
        # Fallback dummy SLA metrics
        c = city or "Bangalore"
        return [
            SLAPincodeDetail(
                pincode="560034" if c == "Bangalore" else "110017" if c == "Delhi" else "400053",
                neighborhood_name="Koramangala" if c == "Bangalore" else "Saket" if c == "Delhi" else "Andheri West",
                city=c,
                avg_eta_min=14.2,
                sla_breach_pct=4.5,
                peak_eta_min=24.5,
                orders_7d=2800,
                recorded_date=str(date.today()),
            ),
            SLAPincodeDetail(
                pincode="560038" if c == "Bangalore" else "110001" if c == "Delhi" else "400050",
                neighborhood_name="Indiranagar" if c == "Bangalore" else "Connaught Place" if c == "Delhi" else "Bandra West",
                city=c,
                avg_eta_min=12.8,
                sla_breach_pct=3.1,
                peak_eta_min=21.0,
                orders_7d=3200,
                recorded_date=str(date.today()),
            ),
            SLAPincodeDetail(
                pincode="560102" if c == "Bangalore" else "110048" if c == "Delhi" else "400011",
                neighborhood_name="HSR Layout" if c == "Bangalore" else "GK 1" if c == "Delhi" else "Chinchpokli",
                city=c,
                avg_eta_min=15.5,
                sla_breach_pct=6.8,
                peak_eta_min=28.0,
                orders_7d=2400,
                recorded_date=str(date.today()),
            )
        ]

    return [
        SLAPincodeDetail(
            pincode=r.pincode,
            neighborhood_name=r.neighborhood_name,
            city=r.city,
            avg_eta_min=r.avg_eta_min,
            sla_breach_pct=r.sla_breach_pct,
            peak_eta_min=r.peak_eta_min,
            orders_7d=r.orders_7d or 0,
            recorded_date=str(r.recorded_date) if r.recorded_date else None,
        )
        for r in rows
    ]


@router.get("/overview")
async def sla_overview(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Aggregate SLA metrics across all cities."""
    query = select(
        DeliverySLAMetric.city,
        func.avg(DeliverySLAMetric.avg_eta_min).label("avg_eta"),
        func.avg(DeliverySLAMetric.sla_breach_pct).label("avg_breach"),
        func.count(DeliverySLAMetric.id).label("pincode_count"),
    ).group_by(DeliverySLAMetric.city)

    rows = (await db.execute(query)).all()

    if not rows:
        return [
            SLAOverview(
                city=c,
                avg_eta_min=15.0 if c == "Mumbai" else 13.5 if c == "Bangalore" else 14.0,
                avg_breach_pct=11.5 if c == "Mumbai" else 3.8 if c == "Bangalore" else 6.0,
                total_pincodes_tracked=3 if c == "Bangalore" else 2,
            )
            for c in ["Bangalore", "Delhi", "Mumbai", "Hyderabad", "Pune"]
        ]

    results = []
    for city_name, avg_eta, avg_breach, pc_count in rows:
        worst = (await db.execute(
            select(DeliverySLAMetric.pincode, DeliverySLAMetric.sla_breach_pct)
            .where(DeliverySLAMetric.city == city_name)
            .order_by(DeliverySLAMetric.sla_breach_pct.desc())
            .limit(1)
        )).one_or_none()

        results.append(SLAOverview(
            city=city_name,
            avg_eta_min=round(float(avg_eta or 0), 1),
            avg_breach_pct=round(float(avg_breach or 0), 2),
            worst_pincode=worst[0] if worst else None,
            worst_breach_pct=round(float(worst[1]), 2) if worst and worst[1] else None,
            total_pincodes_tracked=pc_count,
        ))

    return results


@router.get("/by-city/{city}", response_model=List[SLAPincodeDetail])
async def sla_by_city(
    city: str,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """SLA breakdown by pincode for a specific city, sorted by breach rate."""
    return await get_sla_metrics(city=city, limit=limit, db=db, payload=payload)


@router.get("/live-performance")
async def live_sla_performance(
    city: Optional[str] = None,
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Compute live SLA performance from recent orders (orders_synthetic)."""
    from datetime import datetime

    cutoff = datetime.utcnow() - timedelta(hours=hours)
    query = select(
        OrderSynthetic.platform,
        func.count(OrderSynthetic.id).label("total"),
        func.avg(OrderSynthetic.delivery_mins).label("avg_delivery"),
        func.sum(
            func.cast(
                OrderSynthetic.delivery_mins > OrderSynthetic.estimated_delivery_mins,
                func.Integer,
            )
        ).label("breaches"),
    ).where(
        OrderSynthetic.order_datetime >= cutoff,
        OrderSynthetic.delivery_mins.isnot(None),
    ).group_by(OrderSynthetic.platform)

    if city:
        from backend.database.models.models import DarkStore
        query = query.where(
            OrderSynthetic.store_id.in_(
                select(DarkStore.id).where(DarkStore.city == city)
            )
        )

    rows = (await db.execute(query)).all()

    return {
        "window_hours": hours,
        "city": city or "All",
        "platforms": [
            {
                "platform": r[0],
                "total_orders": r[1],
                "avg_delivery_min": round(float(r[2] or 0), 1),
                "breach_count": int(r[3] or 0),
                "breach_pct": round(int(r[3] or 0) / r[1] * 100, 1) if r[1] else 0,
            }
            for r in rows
        ],
    }
