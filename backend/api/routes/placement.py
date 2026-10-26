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
    opportunity_score: Optional[float] = None
    zone_type: str  # "saturated" | "growth" | "greenfield"
    data_mode: str = "recorded_store_density"
    note: str = "Observed store density only; demand and profitability are not inferred."


class PlacementScoreResponse(BaseModel):
    id: int
    neighborhood_name: str
    city: str
    lat: Optional[float]
    lng: Optional[float]
    opportunity_score: Optional[float] = None
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
    a = min(1.0, max(0.0, a))
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))


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
    # Check if database is PostgreSQL and try to use PostGIS ST_ClusterDBSCAN
    use_postgis = False
    clusters = {}
    try:
        from sqlalchemy import text
        eps_meters = eps_km * 1000.0
        sql = """
            SELECT 
              id,
              platform,
              latitude,
              longitude,
              ST_ClusterDBSCAN(
                ST_Transform(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326), 3857),
                eps := :eps_m,
                minpoints := :min_samples
              ) OVER() AS cid
            FROM (
                SELECT id, platform, latitude, longitude, city, is_active, organization_id FROM dark_stores
                UNION ALL
                SELECT id, platform, latitude, longitude, city, is_active, NULL AS organization_id FROM competitor_stores
            ) AS all_active_stores
            WHERE is_active = true
        """
        params = {"eps_m": eps_meters, "min_samples": min_stores}
        organization_id = payload.get("org_id") or payload.get("organization_id")
        if str(organization_id or "").isdigit() and int(organization_id) > 0:
            sql += " AND (organization_id = :organization_id OR organization_id IS NULL)"
            params["organization_id"] = int(organization_id)
        else:
            sql += " AND organization_id IS NULL"
        if city:
            sql += " AND city = :city"
            params["city"] = city

        db_res = await db.execute(text(sql), params)
        rows = db_res.mappings().all()

        if len(rows) >= min_stores:
            for r in rows:
                cid = r["cid"]
                if cid is None:
                    cid = -1
                clusters.setdefault(cid, []).append(
                    (r["latitude"], r["longitude"], {"platform": r["platform"], "id": r["id"]})
                )
            use_postgis = True
            logger.info("Successfully calculated opportunity zones using PostGIS ST_ClusterDBSCAN")
    except Exception as e:
        logger.debug(f"PostGIS DBSCAN query not available, falling back to python DBSCAN: {e}")
        use_postgis = False

    if not use_postgis:
        from backend.database.models.models import CompetitorStore
        query = select(DarkStore).where(DarkStore.is_active.is_(True))
        if city:
            query = query.where(DarkStore.city == city)

        result = await db.execute(query)
        stores = list(result.scalars().all())

        comp_query = select(CompetitorStore).where(CompetitorStore.is_active.is_(True))
        if city:
            comp_query = comp_query.where(CompetitorStore.city == city)
        comp_result = await db.execute(comp_query)
        stores.extend(comp_result.scalars().all())

        if len(stores) < min_stores:
            return []

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
        # A POI cluster only measures recorded store density; it cannot establish demand or profitability.
        opp_score = None
        zone_type = "observed_cluster"

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

    zones.sort(key=lambda z: z.store_count, reverse=True)
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
        "total_pincodes": total,
        "served_pincodes": served,
        "unserved_pincodes": max(0, total - served),
        "coverage_pct": round(served / total * 100, 1) if total else None,
        "avg_coverage_score": round(float(row[1]), 2) if row and row[1] is not None else None,
        "total_population_covered": int(row[2]) if row and row[2] is not None else None,
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

    return scores
