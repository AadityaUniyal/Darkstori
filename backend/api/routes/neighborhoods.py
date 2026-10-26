"""Neighborhood Intelligence API Routes.

Provides endpoints for retrieving focus cities, neighborhoods,
and neighborhood-specific DNA profiling.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import FocusCity, Neighborhood, NeighborhoodDNA

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────────

class CityResponse(BaseModel):
    city_id: int
    city_name: str
    state: Optional[str] = None
    analysis_depth: Optional[str] = None
    total_dark_stores: Optional[int] = None
    total_neighborhoods: Optional[int] = None
    market_maturity: Optional[str] = None
    total_population: Optional[int] = None
    total_area_km2: Optional[float] = None
    num_pincodes: Optional[int] = None

    model_config = {"from_attributes": True}


class NeighborhoodResponse(BaseModel):
    neighborhood_id: int
    city_id: Optional[int] = None
    city: Optional[str] = None
    neighborhood_name: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    centroid_lat: Optional[float] = None
    centroid_lng: Optional[float] = None
    population: Optional[int] = None
    avg_age: Optional[float] = None
    avg_household_income: Optional[float] = None
    working_professionals_pct: Optional[float] = None
    peak_order_hours: Optional[dict] = None
    preferred_categories: Optional[dict] = None
    price_sensitivity: Optional[str] = None
    total_stores: Optional[int] = None
    competition_intensity: Optional[str] = None
    market_potential_score: Optional[float] = None
    opportunity_rank: Optional[int] = None
    area_sqkm: Optional[float] = None
    population_density: Optional[float] = None

    model_config = {"from_attributes": True}


class DNAResponse(BaseModel):
    dna_id: int
    neighborhood_id: Optional[int] = None
    dominant_demographic: Optional[str] = None
    lifestyle_profile: Optional[str] = None
    order_triggers: Optional[dict] = None
    peak_times: Optional[dict] = None
    preferred_categories: Optional[dict] = None
    loyalty_pattern: Optional[str] = None
    growth_trajectory: Optional[str] = None
    opportunity_score: Optional[float] = None

    model_config = {"from_attributes": True}


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/cities", response_model=List[CityResponse])
async def get_focus_cities(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Retrieve all focus cities."""
    query = select(FocusCity).order_by(FocusCity.city_name.asc())
    result = await db.execute(query)
    cities = result.scalars().all()

    return cities


@router.get("", response_model=List[NeighborhoodResponse])
@router.get("/", response_model=List[NeighborhoodResponse], include_in_schema=False)
async def get_neighborhoods(
    city_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Get neighborhoods, optionally filtered by city."""
    from sqlalchemy.orm import selectinload
    query = select(Neighborhood).options(selectinload(Neighborhood.city))
    if city_id is not None:
        query = query.where(Neighborhood.city_id == city_id)
    query = query.limit(limit)

    result = await db.execute(query)
    neighborhoods = result.scalars().all()

    return [
        NeighborhoodResponse(
            neighborhood_id=n.neighborhood_id,
            city_id=n.city_id,
            city=n.city.city_name if getattr(n, "city", None) and n.city else None,
            neighborhood_name=n.neighborhood_name,
            pincode=n.pincode,
            latitude=n.latitude or n.centroid_lat,
            longitude=n.longitude or n.centroid_lng,
            centroid_lat=n.centroid_lat or n.latitude,
            centroid_lng=n.centroid_lng or n.longitude,
            population=n.population,
            avg_age=n.avg_age,
            avg_household_income=n.avg_household_income,
            working_professionals_pct=n.working_professionals_pct,
            peak_order_hours=n.peak_order_hours,
            preferred_categories=n.preferred_categories,
            price_sensitivity=n.price_sensitivity,
            total_stores=n.total_stores,
            competition_intensity=n.competition_intensity,
            market_potential_score=n.market_potential_score,
            opportunity_rank=n.opportunity_rank,
            area_sqkm=n.area_sqkm,
            population_density=n.population_density,
        )
        for n in neighborhoods
    ]


@router.get("/{neighborhood_id}", response_model=NeighborhoodResponse)
async def get_neighborhood_by_id(
    neighborhood_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Retrieve details for a single neighborhood by ID."""
    query = select(Neighborhood).where(Neighborhood.neighborhood_id == neighborhood_id)
    result = await db.execute(query)
    nbhd = result.scalar_one_or_none()

    if not nbhd:
        raise HTTPException(status_code=404, detail="Neighborhood not found")

    return nbhd


@router.get("/{neighborhood_id}/dna", response_model=DNAResponse)
async def get_neighborhood_dna(
    neighborhood_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Retrieve hyper-local consumer DNA and behavior profile."""
    query = select(NeighborhoodDNA).where(NeighborhoodDNA.neighborhood_id == neighborhood_id)
    result = await db.execute(query)
    dna = result.scalar_one_or_none()

    if not dna:
        raise HTTPException(status_code=404, detail="Neighborhood behavior profile is not available")

    return dna
