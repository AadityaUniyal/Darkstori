"""Analytics API routes."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from database.models.models import OrderSynthetic, PincodeCoverage

router = APIRouter()


@router.get("/coverage-gaps")
async def get_coverage_gaps(
    min_population: int = Query(100000, ge=0),
    max_coverage: float = Query(1.0, ge=0, le=4),
    limit: int = Query(50, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get PIN codes with coverage gaps (high population, low coverage)."""
    query = (
        select(PincodeCoverage)
        .where(
            PincodeCoverage.population >= min_population,
            PincodeCoverage.coverage_score <= max_coverage,
        )
        .order_by(PincodeCoverage.population.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    gaps = result.scalars().all()

    return {
        "total_opportunities": len(gaps),
        "opportunities": [
            {
                "pincode": gap.pincode,
                "city": gap.city,
                "state": gap.state,
                "population": gap.population,
                "coverage_score": gap.coverage_score,
                "latitude": gap.latitude,
                "longitude": gap.longitude,
            }
            for gap in gaps
        ],
    }


@router.get("/coverage-by-tier")
async def get_coverage_by_tier(db: AsyncSession = Depends(get_db)):
    """Get coverage statistics by city tier."""
    query = select(
        PincodeCoverage.city_tier,
        func.count(PincodeCoverage.id).label("total_pincodes"),
        func.avg(PincodeCoverage.coverage_score).label("avg_coverage"),
        func.sum(PincodeCoverage.population).label("total_population"),
    ).group_by(PincodeCoverage.city_tier)

    result = await db.execute(query)

    return {
        "by_tier": [
            {
                "tier": row[0],
                "total_pincodes": row[1],
                "avg_coverage": round(float(row[2]), 2) if row[2] else 0,
                "total_population": row[3] or 0,
            }
            for row in result
        ]
    }


@router.get("/order-trends")
async def get_order_trends(
    days: int = Query(30, ge=1, le=365),
    platform: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get order trends over time."""
    cutoff_date = datetime.now().date() - timedelta(days=days)

    query = select(
        OrderSynthetic.order_date,
        OrderSynthetic.platform,
        func.count(OrderSynthetic.id).label("order_count"),
        func.avg(OrderSynthetic.order_value).label("avg_value"),
    ).where(OrderSynthetic.order_date >= cutoff_date)

    if platform:
        query = query.where(OrderSynthetic.platform == platform)

    query = query.group_by(OrderSynthetic.order_date, OrderSynthetic.platform)

    result = await db.execute(query)

    return {
        "trends": [
            {
                "date": str(row[0]),
                "platform": row[1],
                "order_count": row[2],
                "avg_value": round(float(row[3]), 2) if row[3] else 0,
            }
            for row in result
        ]
    }


@router.get("/platform-comparison")
async def get_platform_comparison(db: AsyncSession = Depends(get_db)):
    """Compare platforms across key metrics."""
    query = select(
        OrderSynthetic.platform,
        func.count(OrderSynthetic.id).label("total_orders"),
        func.avg(OrderSynthetic.order_value).label("avg_order_value"),
        func.avg(OrderSynthetic.delivery_mins).label("avg_delivery_time"),
    ).group_by(OrderSynthetic.platform)

    result = await db.execute(query)

    return {
        "comparison": [
            {
                "platform": row[0],
                "total_orders": row[1],
                "avg_order_value": round(float(row[2]), 2) if row[2] else 0,
                "avg_delivery_time": round(float(row[3]), 2) if row[3] else 0,
            }
            for row in result
        ]
    }
