"""Free geo resolution and analysis routes."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import DarkStore, PincodeCoverage, Neighborhood
from backend.utils.osm_service import resolve_location, reverse_location, fetch_osm_competitor_stores
from backend.utils.routing import get_route_summary

router = APIRouter()


class GeoResolveResponse(BaseModel):
    query: str
    display_name: Optional[str] = None
    lat: float
    lng: float
    type: Optional[str] = None
    category: Optional[str] = None
    address: dict = {}


@router.get("/resolve", response_model=GeoResolveResponse)
async def resolve_geo(
    q: Optional[str] = Query(None),
    address: Optional[str] = Query(None),
    payload: dict = Depends(verify_token),
):
    query_str = q or address
    if not query_str or len(query_str.strip()) < 2:
        raise HTTPException(status_code=400, detail="Provide valid q or address parameter")
    data = await resolve_location(query_str)
    if not data:
        raise HTTPException(status_code=404, detail="Location not found")
    return GeoResolveResponse(
        query=query_str,
        display_name=data.get("display_name"),
        lat=data["lat"],
        lng=data["lng"],
        type=data.get("type"),
        category=data.get("class"),
        address=data.get("address", {}),
    )


@router.get("/reverse")
async def reverse_geo(
    lat: float,
    lng: float,
    payload: dict = Depends(verify_token),
):
    data = await reverse_location(lat, lng)
    if not data:
        raise HTTPException(status_code=404, detail="Reverse location not found")
    return data


@router.get("/analyze")
async def analyze_location(
    q: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_m: int = Query(3000, ge=500, le=10000),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    if q:
        resolved = await resolve_location(q)
        if not resolved:
            raise HTTPException(status_code=404, detail="Location not found")
        lat = resolved["lat"]
        lng = resolved["lng"]
    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="Provide either q or lat/lng")

    competitors = await fetch_osm_competitor_stores(lat, lng, radius_m=radius_m)
    nearby_stores = await db.scalars(
        select(DarkStore).where(
            DarkStore.latitude.between(lat - 0.08, lat + 0.08),
            DarkStore.longitude.between(lng - 0.08, lng + 0.08),
        )
    )
    stores = list(nearby_stores.all())

    coverage = await db.scalars(
        select(PincodeCoverage).where(
            PincodeCoverage.latitude.between(lat - 0.12, lat + 0.12),
            PincodeCoverage.longitude.between(lng - 0.12, lng + 0.12),
        )
    )
    coverage_rows = list(coverage.all())

    route_check = await get_route_summary(lat, lng, lat + 0.02, lng + 0.02)

    opp_score = round(
        min(
            100.0,
            max(0.0, 55 + len(coverage_rows) * 4 - len(competitors) * 2.5 + len(stores) * 1.5),
        ),
        1,
    )
    return {
        "query": q,
        "lat": lat,
        "lng": lng,
        "radius_m": radius_m,
        "opportunity_score": opp_score,
        "competitor_count": len(competitors),
        "active_store_count": len(stores),
        "coverage_points": len(coverage_rows),
        "road_distance_km": route_check.get("distance_km"),
        "route_duration_mins": route_check.get("duration_mins"),
        "route_source": route_check.get("source"),
        "competitors": competitors[:25],
        "stores": [
            {
                "id": s.id,
                "name": s.store_name,
                "platform": s.platform,
                "lat": s.latitude,
                "lng": s.longitude,
                "city": s.city,
            }
            for s in stores[:25]
        ],
        "coverage": [
            {
                "pincode": c.pincode,
                "coverage_score": c.coverage_score,
                "market_potential_score": c.market_potential_score,
                "city": c.city,
            }
            for c in coverage_rows[:25]
        ],
    }
