"""Unit Economics API Routes.

Lets users model dark-store unit economics — revenue, COGS, delivery costs,
gross margin — and project break-even at different scale scenarios.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import EconomicProjection

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────────

class EconomicsInput(BaseModel):
    """User-supplied parameters for a unit-economics projection."""
    store_size_sqft: int = Field(default=1500, ge=200, le=10_000)
    monthly_rent_per_sqft: float = Field(default=45)
    staff_count: int = Field(default=8, ge=2, le=100)
    avg_salary_per_staff: float = Field(default=25_000)
    avg_order_value: float = Field(default=350, ge=50)
    daily_orders: int = Field(default=150, ge=1)
    delivery_cost_per_order: float = Field(default=18)
    cogs_pct: float = Field(default=0.65, ge=0, le=1, description="Cost of goods as fraction of revenue")
    commission_pct: float = Field(default=0.05, ge=0, le=1)
    marketing_monthly: float = Field(default=50_000, ge=0)
    initial_investment: float = Field(default=2_000_000, ge=0)


class EconomicsResult(BaseModel):
    monthly_revenue: float
    monthly_cogs: float
    monthly_delivery_cost: float
    monthly_rent: float
    monthly_salaries: float
    monthly_marketing: float
    monthly_commission: float
    total_monthly_cost: float
    monthly_gross_profit: float
    gross_margin_pct: float
    monthly_net_profit: float
    net_margin_pct: float
    break_even_months: int
    annual_roi_pct: float
    daily_break_even_orders: int


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/project", response_model=EconomicsResult)
async def project_economics(
    inp: EconomicsInput,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Run a unit-economics projection and persist it."""
    monthly_revenue = inp.avg_order_value * inp.daily_orders * 30
    monthly_cogs = monthly_revenue * inp.cogs_pct
    monthly_delivery = inp.delivery_cost_per_order * inp.daily_orders * 30
    monthly_rent = inp.store_size_sqft * inp.monthly_rent_per_sqft
    monthly_salaries = inp.staff_count * inp.avg_salary_per_staff
    monthly_commission = monthly_revenue * inp.commission_pct
    total_cost = (
        monthly_cogs + monthly_delivery + monthly_rent
        + monthly_salaries + inp.marketing_monthly + monthly_commission
    )

    gross_profit = monthly_revenue - monthly_cogs
    gross_margin = (gross_profit / monthly_revenue * 100) if monthly_revenue else 0
    net_profit = monthly_revenue - total_cost
    net_margin = (net_profit / monthly_revenue * 100) if monthly_revenue else 0

    if net_profit > 0:
        break_even = max(1, int(inp.initial_investment / net_profit) + 1)
    else:
        break_even = 999

    annual_roi = (net_profit * 12 / inp.initial_investment * 100) if inp.initial_investment else 0

    # Daily orders needed to break even
    fixed_daily = (monthly_rent + monthly_salaries + inp.marketing_monthly) / 30
    variable_per_order = (
        inp.avg_order_value * inp.cogs_pct
        + inp.delivery_cost_per_order
        + inp.avg_order_value * inp.commission_pct
    )
    contribution_per_order = inp.avg_order_value - variable_per_order
    daily_be_orders = int(fixed_daily / contribution_per_order) + 1 if contribution_per_order > 0 else 9999

    # Persist
    user_id = payload.get("sub") or payload.get("user_id", 0)
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        user_id_int = 1

    projection = EconomicProjection(
        user_id=user_id_int,
        name="Unit Economics Projection",
        input_params=inp.model_dump(),
        results={
            "monthly_revenue": round(monthly_revenue, 2),
            "net_profit": round(net_profit, 2),
            "break_even_months": break_even,
            "annual_roi_pct": round(annual_roi, 1),
        },
    )
    db.add(projection)
    await db.commit()

    logger.info(
        f"Economics projection: ₹{monthly_revenue:,.0f} revenue, "
        f"₹{net_profit:,.0f} net profit, break-even {break_even} months"
    )

    return EconomicsResult(
        monthly_revenue=round(monthly_revenue, 2),
        monthly_cogs=round(monthly_cogs, 2),
        monthly_delivery_cost=round(monthly_delivery, 2),
        monthly_rent=round(monthly_rent, 2),
        monthly_salaries=round(monthly_salaries, 2),
        monthly_marketing=round(inp.marketing_monthly, 2),
        monthly_commission=round(monthly_commission, 2),
        total_monthly_cost=round(total_cost, 2),
        monthly_gross_profit=round(gross_profit, 2),
        gross_margin_pct=round(gross_margin, 1),
        monthly_net_profit=round(net_profit, 2),
        net_margin_pct=round(net_margin, 1),
        break_even_months=break_even,
        annual_roi_pct=round(annual_roi, 1),
        daily_break_even_orders=daily_be_orders,
    )


@router.get("/history")
async def economics_history(
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """List past projections for the current user."""
    user_id = payload.get("sub") or payload.get("user_id", 0)
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        user_id_int = 1

    query = (
        select(EconomicProjection)
        .where(EconomicProjection.user_id == user_id_int)
        .order_by(EconomicProjection.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(query)).scalars().all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "inputs": r.input_params,
            "results": r.results,
            "created_at": str(r.created_at),
        }
        for r in rows
    ]
