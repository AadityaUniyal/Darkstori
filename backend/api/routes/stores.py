"""Dark stores API routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import require_roles, verify_token
from backend.database.connection import get_db
from backend.database.models.models import DarkStore
from backend.ml.weather_service import fetch_weather_forecast

router = APIRouter()


def _scope_store_query(query, payload: dict):
    organization_id = payload.get("org_id") or payload.get("organization_id")
    if str(organization_id or "").isdigit() and int(organization_id) > 0:
        return query.where(DarkStore.organization_id == int(organization_id))
    return query.where(DarkStore.organization_id.is_(None))


class StoreResponse(BaseModel):
    """Store response model."""

    id: int
    platform: str
    store_name: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    latitude: float
    longitude: float
    city_tier: Optional[str] = None
    is_active: bool = True

    model_config = {"from_attributes": True}


class StoreCreate(BaseModel):
    """Store creation model."""

    platform: str
    store_name: str
    city: str
    pincode: Optional[str]
    latitude: float
    longitude: float
    city_tier: Optional[str]
    source: str = "manual"


@router.get("", response_model=List[StoreResponse])
@router.get("/", response_model=List[StoreResponse], include_in_schema=False)
async def get_stores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    platform: Optional[str] = None,
    city: Optional[str] = None,
    city_tier: Optional[str] = None,
    include_competitors: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Get all active dark stores, optionally filtered."""
    from backend.database.models.models import CompetitorStore

    query = _scope_store_query(select(DarkStore), payload).where(DarkStore.is_active.is_(True))

    if platform:
        query = query.where(DarkStore.platform == platform)
    if city:
        query = query.where(DarkStore.city == city)
    if city_tier:
        query = query.where(DarkStore.city_tier == city_tier)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    stores = list(result.scalars().all())

    if include_competitors:
        comp_query = select(CompetitorStore).where(CompetitorStore.is_active.is_(True))
        if platform:
            comp_query = comp_query.where(CompetitorStore.platform == platform)
        if city:
            comp_query = comp_query.where(CompetitorStore.city == city)
        comp_query = comp_query.limit(limit)
        comp_result = await db.execute(comp_query)
        competitors = comp_result.scalars().all()
        stores.extend(competitors)

    return stores


@router.get("/stats")
async def get_store_stats(db: AsyncSession = Depends(get_db), payload: dict = Depends(verify_token)):
    """Get store statistics."""
    # Total stores
    total_query = _scope_store_query(select(func.count(DarkStore.id)), payload).where(DarkStore.is_active.is_(True))
    total_result = await db.execute(total_query)
    total_stores = total_result.scalar() or 0

    # By platform
    platform_query = (
        _scope_store_query(select(DarkStore.platform, func.count(DarkStore.id).label("count")), payload)
        .where(DarkStore.is_active.is_(True))
        .group_by(DarkStore.platform)
    )

    platform_result = await db.execute(platform_query)
    by_platform = {row[0]: row[1] for row in platform_result.all()}

    # By city tier
    tier_query = (
        _scope_store_query(select(DarkStore.city_tier, func.count(DarkStore.id).label("count")), payload)
        .where(DarkStore.is_active.is_(True))
        .group_by(DarkStore.city_tier)
    )

    tier_result = await db.execute(tier_query)
    by_tier = {row[0]: row[1] for row in tier_result.all()}

    return {
        "total_stores": total_stores,
        "by_platform": by_platform,
        "by_city_tier": by_tier,
    }


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Get a single dark store by ID."""
    result = await db.execute(_scope_store_query(select(DarkStore), payload).where(DarkStore.id == store_id))
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    return store


@router.post("", response_model=StoreResponse, dependencies=[Depends(require_roles("admin", "regional_head"))])
@router.post("/", response_model=StoreResponse, dependencies=[Depends(require_roles("admin", "regional_head"))], include_in_schema=False)
async def create_store(
    store: StoreCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "regional_head")),
):
    """Create a new store (requires authentication)."""
    organization_id = payload.get("org_id") or payload.get("organization_id")
    db_store = DarkStore(
        **store.model_dump(),
        organization_id=int(organization_id) if str(organization_id or "").isdigit() and int(organization_id) > 0 else None,
    )
    db.add(db_store)
    await db.commit()
    await db.refresh(db_store)

    logger.info(f"New store created: {store.store_name}")

    return db_store


@router.get("/{store_id}/weather-alert")
async def get_store_weather_alert(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Fetch live weather forecasts and return alert if rain expected."""
    result = await db.execute(_scope_store_query(select(DarkStore), payload).where(DarkStore.id == store_id))
    store = result.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    pincode = str(store.pincode) if store.pincode else "560034"
    alert_info = await fetch_weather_forecast(pincode)
    return alert_info or {"alert": None, "is_rainy": False, "city": store.city}

