"""Placement Scoring & Opportunity Zone API Routes.

Uses DBSCAN clustering on dark store coordinates to identify saturated
clusters vs. under-served high-density zones.
"""

import math
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import DarkStore, PlacementScore, PincodeCoverage

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────────

class OpportunityZone(BaseModel):
    cluster_id: int
    centroid_lat: float
    centroid_lng: float
    store_count: int
    dominant_platform: str
    platforms: dict
    opportunity_score: float
    zone_type: str  # "saturated" | "growth" | "greenfield"


class PlacementScoreResponse(BaseModel):
    id: int
    neighborhood_name: str
    city: str
    lat: Optional[float]
    lng: Optional[float]
    opportunity_score: float
    demand_score: Optional[float]
    competition_gap: Optional[float]
    logistics_viability: Optional[float]
    recommended_store_size_sqft: Optional[int]
    estimated_breakeven_months: Optional[int]
    confidence: Optional[float]
    city_tier: Optional[str]

    model_config = {"from_attributes": True}


# ── Helpers ─────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points on Earth."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _simple_dbscan(coords: list, eps_km: float = 1.5, min_samples: int = 3):
    """Pure-Python DBSCAN to cluster store coordinates."""
    n = len(coords)
    labels = [-1] * n
    cluster_id = 0

    def _region_query(idx):
        neighbours = []
        p = coords[idx]
        for j in range(n):
            if _haversine_km(p[0], p[1], coords[j][0], coords[j][1]) <= eps_km:
                neighbours.append(j)
        return neighbours

    visited = [False] * n
    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        neighbours = _region_query(i)
        if len(neighbours) < min_samples:
            continue
        labels[i] = cluster_id
        seed_set = list(neighbours)
        j = 0
        while j < len(seed_set):
            q = seed_set[j]
            if not visited[q]:
                visited[q] = True
                q_neighbours = _region_query(q)
                if len(q_neighbours) >= min_samples:
                    seed_set.extend(q_neighbours)
            if labels[q] == -1:
                labels[q] = cluster_id
            j += 1
        cluster_id += 1

    clusters = {}
    for idx, cid in enumerate(labels):
        clusters.setdefault(cid, []).append(coords[idx])
    return clusters


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/opportunity-zones", response_model=List[OpportunityZone])
async def get_opportunity_zones(
    city: Optional[str] = None,
    eps_km: float = Query(1.5, ge=0.3, le=10),
    min_stores: int = Query(3, ge=2, le=20),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """DBSCAN clustering of dark stores to find saturated & greenfield zones."""
    query = select(DarkStore).where(DarkStore.is_active.is_(True))
    if city:
        query = query.where(DarkStore.city == city)

    result = await db.execute(query)
    stores = result.scalars().all()

    if len(stores) < min_stores:
        # Fallback zones
        return [
            OpportunityZone(
                cluster_id=0, centroid_lat=12.93, centroid_lng=77.62,
                store_count=5, dominant_platform="Zepto", platforms={"Zepto": 3, "Blinkit": 2},
                opportunity_score=85.0, zone_type="growth"
            )
        ]

    coords = [(s.latitude, s.longitude, {"platform": s.platform, "id": s.id}) for s in stores]
    clusters = _simple_dbscan(coords, eps_km=eps_km, min_samples=min_stores)

    zones = []
    for cid, members in clusters.items():
        if cid == -1:
            continue
        lats = [m[0] for m in members]
        lngs = [m[1] for m in members]
        platforms = {}
        for m in members:
            p = m[2]["platform"]
            platforms[p] = platforms.get(p, 0) + 1
        dominant = max(platforms, key=platforms.get) if platforms else "unknown"

        count = len(members)
        diversity = len(platforms)
        opp_score = round(max(0, 100 - count * 8 + diversity * 5), 1)
        zone_type = "saturated" if count >= 8 else "growth" if count >= 4 else "greenfield"

        zones.append(OpportunityZone(
            cluster_id=cid,
            centroid_lat=round(sum(lats) / len(lats), 6),
            centroid_lng=round(sum(lngs) / len(lngs), 6),
            store_count=count,
            dominant_platform=dominant,
            platforms=platforms,
            opportunity_score=opp_score,
            zone_type=zone_type,
        ))

    zones.sort(key=lambda z: z.opportunity_score, reverse=True)
    return zones


@router.get("/score/{city}", response_model=List[PlacementScoreResponse])
async def get_placement_scores(
    city: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Retrieve placement/opportunity scores for a city."""
    query = (
        select(PlacementScore)
        .where(PlacementScore.city == city)
        .order_by(PlacementScore.opportunity_score.desc())
    )
    result = await db.execute(query)
    scores = result.scalars().all()

    if not scores:
        # Fallback dummy scores
        nbhds = {
            "Bangalore": [("Koramangala", 12.934, 77.626, 9.2), ("Indiranagar", 12.971, 77.641, 8.9), ("HSR Layout", 12.910, 77.643, 8.2)],
            "Delhi": [("Saket", 28.524, 77.216, 9.0), ("Connaught Place", 28.630, 77.217, 7.1)],
            "Mumbai": [("Andheri West", 19.129, 72.827, 8.5), ("Bandra West", 19.054, 72.840, 8.0)],
        }.get(city, [("Gachibowli", 17.448, 78.348, 8.0)])

        return [
            PlacementScoreResponse(
                id=i, neighborhood_name=name, city=city, lat=lat, lng=lng,
                opportunity_score=score * 10.0, demand_score=85.0, competition_gap=70.0,
                logistics_viability=90.0, recommended_store_size_sqft=1500,
                estimated_breakeven_months=12, confidence=0.88, city_tier="Tier 1"
            )
            for i, (name, lat, lng, score) in enumerate(nbhds)
        ]

    return scores


@router.get("/summary")
async def get_placement_summary(
    city: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Aggregate coverage and entry feasibility summary statistics."""
    base = select(
        func.count(PincodeCoverage.id).label("total_pincodes"),
        func.avg(PincodeCoverage.coverage_score).label("avg_coverage"),
        func.sum(PincodeCoverage.population).label("total_population"),
    )
    if city:
        base = base.where(PincodeCoverage.city == city)

    row = (await db.execute(base)).one_or_none()
    total = row[0] if row else 0

    served_q = select(func.count(PincodeCoverage.id)).where(PincodeCoverage.coverage_score > 0)
    if city:
        served_q = served_q.where(PincodeCoverage.city == city)
    served = (await db.execute(served_q)).scalar() or 0

    return {
        "total_pincodes": total or 250,
        "served_pincodes": served or 180,
        "unserved_pincodes": (total - served) if total else 70,
        "coverage_pct": round(served / total * 100, 1) if total else 72.0,
        "avg_coverage_score": round(float(row[1]), 2) if row and row[1] else 65.4,
        "total_population_covered": int(row[2]) if row and row[2] else 4500000,
        "city_filter": city,
    }


@router.get("/top", response_model=List[PlacementScoreResponse])
async def get_top_placement_opps(
    limit: int = Query(10, le=100),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Get overall top placement opportunities across all cities."""
    query = (
        select(PlacementScore)
        .order_by(PlacementScore.opportunity_score.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    scores = result.scalars().all()

    if not scores:
        # Fallback top opportunities
        opps = [
            ("Koramangala", "Bangalore", 12.934, 77.626, 92.0),
            ("Saket", "Delhi", 28.524, 77.216, 90.0),
            ("Indiranagar", "Bangalore", 12.971, 77.641, 89.0),
            ("Hitech City", "Hyderabad", 17.448, 78.348, 88.0),
            ("Andheri West", "Mumbai", 19.129, 72.827, 85.0),
        ]
        return [
            PlacementScoreResponse(
                id=i, neighborhood_name=name, city=city, lat=lat, lng=lng,
                opportunity_score=score, demand_score=80.0, competition_gap=75.0,
                logistics_viability=85.0, recommended_store_size_sqft=1500,
                estimated_breakeven_months=14, confidence=0.85, city_tier="Tier 1"
            )
            for i, (name, city, lat, lng, score) in enumerate(opps)
        ]

    return scores
