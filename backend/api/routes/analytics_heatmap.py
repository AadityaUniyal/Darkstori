"""Heatmap and Coverage Analytics API Routes.

Provides endpoints for geospatial order distribution (heatmap),
coverage gap identification, and platform order comparison.
"""

from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import PincodeCoverage, OrderSynthetic, DarkStore

router = APIRouter()


@router.get("/order-heatmap")
async def get_order_heatmap(
    city: Optional[str] = None,
    days: int = Query(90, ge=1, le=365),
    limit: int = Query(5000, le=10000),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Expose only a production order feed, never benchmark coordinates."""
    raise HTTPException(status_code=501, detail="Production order geolocation is unavailable; scenario order rows are not presented as live activity")
    since = date.today() - timedelta(days=days)
    query = (
        select(
            OrderSynthetic.delivery_latitude.label("lat"),
            OrderSynthetic.delivery_longitude.label("lng"),
            OrderSynthetic.order_value.label("value"),
            OrderSynthetic.platform.label("platform"),
        )
        .where(OrderSynthetic.order_date >= since)
        .where(OrderSynthetic.delivery_latitude.isnot(None))
        .where(OrderSynthetic.delivery_longitude.isnot(None))
    )

    if city:
        query = query.where(
            OrderSynthetic.store_id.in_(
                select(DarkStore.id).where(DarkStore.city == city)
            )
        )

    query = query.limit(limit)
    result = await db.execute(query)
    rows = result.all()

    if not rows:
        return []

    return [
        {
            "lat": r.lat,
            "lng": r.lng,
            "value": r.value,
            "platform": r.platform,
        }
        for r in rows
    ]


@router.get("/coverage-gaps")
async def get_coverage_gaps(
    city: Optional[str] = None,
    threshold: float = Query(50.0, ge=0, le=100),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Find under-served pincodes (coverage score below threshold)."""
    query = (
        select(PincodeCoverage)
        .where(PincodeCoverage.coverage_score < threshold)
        .order_by(PincodeCoverage.coverage_score.asc())
    )
    if city:
        query = query.where(PincodeCoverage.city == city)

    result = await db.execute(query)
    gaps = result.scalars().all()

    return [
        {
            "id": g.id,
            "pincode": g.pincode,
            "city": g.city,
            "coverage_score": g.coverage_score,
            "unserved_population": g.unserved_population,
            "nearest_store_distance_km": g.nearest_store_distance_km,
            "competitor_count": g.competitor_count,
        }
        for g in gaps
    ]


@router.get("/platform-comparison")
async def get_platform_comparison(
    city: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Compare platforms only after a production order source is connected."""
    raise HTTPException(status_code=501, detail="Platform order comparison requires a verified production order feed")
    query = select(
        OrderSynthetic.platform,
        func.count(OrderSynthetic.id).label("total_orders"),
        func.avg(OrderSynthetic.delivery_mins).label("avg_delivery_mins"),
        func.avg(OrderSynthetic.order_value).label("avg_order_value"),
        func.sum(OrderSynthetic.order_value).label("total_revenue"),
    ).group_by(OrderSynthetic.platform)

    if city:
        query = query.where(
            OrderSynthetic.store_id.in_(
                select(DarkStore.id).where(DarkStore.city == city)
            )
        )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "platform": r.platform,
            "total_orders": r.total_orders,
            "avg_delivery_mins": round(r.avg_delivery_mins, 1) if r.avg_delivery_mins else 0,
            "avg_order_value": round(r.avg_order_value, 2) if r.avg_order_value else 0,
            "total_revenue": round(r.total_revenue, 2) if r.total_revenue else 0,
        }
        for r in rows
    ]


@router.get("/order-trends")
async def get_order_trends(
    city: Optional[str] = None,
    days: int = Query(30, ge=0, le=365),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Aggregate daily order trends from a production feed."""
    raise HTTPException(status_code=501, detail="Order trends require a verified production order feed")
    since = date.today() - timedelta(days=days)
    query = (
        select(
            OrderSynthetic.order_date.label("date"),
            func.count(OrderSynthetic.id).label("total_orders"),
            func.sum(OrderSynthetic.order_value).label("total_revenue"),
            func.avg(OrderSynthetic.delivery_mins).label("avg_delivery_mins"),
        )
        .where(OrderSynthetic.order_date >= since)
        .group_by(OrderSynthetic.order_date)
        .order_by(OrderSynthetic.order_date.asc())
    )

    if city:
        query = query.where(
            OrderSynthetic.store_id.in_(
                select(DarkStore.id).where(DarkStore.city == city)
            )
        )

    result = await db.execute(query)
    rows = result.all()

    if not rows:
        return {"trends": [], "days": days, "city": city}

    trends = [
        {
            "date": str(r.date),
            "total_orders": r.total_orders,
            "total_revenue": round(r.total_revenue, 2) if r.total_revenue else 0.0,
            "avg_delivery_mins": round(r.avg_delivery_mins, 1) if r.avg_delivery_mins else 0.0,
        }
        for r in rows
    ]
    return {"trends": trends, "days": days, "city": city}

