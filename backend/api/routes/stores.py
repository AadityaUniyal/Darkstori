"""Dark stores API routes."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel

from backend.database.connection import get_db
from backend.database.models import DarkStore
from backend.core.security import verify_token
from backend.core.logger import logger

router = APIRouter()


class StoreResponse(BaseModel):
    """Store response model."""
    id: int
    platform: str
    store_name: Optional[str]
    city: str
    pincode: Optional[str]
    latitude: float
    longitude: float
    city_tier: Optional[str]
    is_active: bool
    
    class Config:
        from_attributes = True


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


@router.get("/", response_model=List[StoreResponse])
async def get_stores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    platform: Optional[str] = None,
    city: Optional[str] = None,
    city_tier: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get list of dark stores with filters."""
    query = select(DarkStore).where(DarkStore.is_active == True)
    
    if platform:
        query = query.where(DarkStore.platform == platform)
    if city:
        query = query.where(DarkStore.city == city)
    if city_tier:
        query = query.where(DarkStore.city_tier == city_tier)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    stores = result.scalars().all()
    
    return stores


@router.get("/stats")
async def get_store_stats(db: AsyncSession = Depends(get_db)):
    """Get store statistics."""
    # Total stores
    total_query = select(func.count(DarkStore.id)).where(DarkStore.is_active == True)
    total_result = await db.execute(total_query)
    total_stores = total_result.scalar()
    
    # By platform
    platform_query = select(
        DarkStore.platform,
        func.count(DarkStore.id).label('count')
    ).where(DarkStore.is_active == True).group_by(DarkStore.platform)
    
    platform_result = await db.execute(platform_query)
    by_platform = {row[0]: row[1] for row in platform_result}
    
    # By city tier
    tier_query = select(
        DarkStore.city_tier,
        func.count(DarkStore.id).label('count')
    ).where(DarkStore.is_active == True).group_by(DarkStore.city_tier)
    
    tier_result = await db.execute(tier_query)
    by_tier = {row[0]: row[1] for row in tier_result}
    
    return {
        "total_stores": total_stores,
        "by_platform": by_platform,
        "by_city_tier": by_tier
    }


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(store_id: int, db: AsyncSession = Depends(get_db)):
    """Get specific store by ID."""
    query = select(DarkStore).where(DarkStore.id == store_id)
    result = await db.execute(query)
    store = result.scalar_one_or_none()
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    
    return store


@router.post("/", response_model=StoreResponse, dependencies=[Depends(verify_token)])
async def create_store(store: StoreCreate, db: AsyncSession = Depends(get_db)):
    """Create a new store (requires authentication)."""
    db_store = DarkStore(**store.dict())
    db.add(db_store)
    await db.commit()
    await db.refresh(db_store)
    
    logger.info(f"New store created: {store.store_name}")
    
    return db_store
