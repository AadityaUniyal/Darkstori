"""Adversarial stress test suite for M1 Test Infrastructure & PostGIS Clustering Mocks.

Probes:
1. Empty store sets (both DarkStore & CompetitorStore empty, 0 rows from PostGIS).
2. Sub-threshold / single store clusters (fewer than min_stores, single isolated points).
3. Epsilon boundary conditions: zero epsilon, negative epsilon, large epsilon.
4. Large and extreme coordinate geometry: poles, antimeridian, antipodal points.
5. Database dialect exceptions, engine disconnects, connection dropouts during fallback.
6. PostGIS noise points (all cid=None).
7. Test infrastructure resilience: DummySession API fidelity, StaticPool concurrency, dependency override restoration.
"""
import math
import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import DBAPIError, OperationalError, SQLAlchemyError
from sqlalchemy import text, select

from backend.api.routes.placement import (
    get_opportunity_zones,
    _haversine_km,
    _simple_dbscan,
    OpportunityZone,
)
from backend.database.connection import engine, AsyncSessionLocal, init_db, close_db
from backend.database.models.models import DarkStore, CompetitorStore, Base
from backend.tests.conftest import DummySession


# ── 1. Edge Case: Empty Store Sets ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_adversarial_empty_store_set_postgis():
    """When PostGIS returns 0 rows, fallback path executes and returns valid zone structure without crashing."""
    db = MagicMock(spec=AsyncSession)
    db.bind = MagicMock()
    db.bind.dialect.name = "postgresql"

    # PostGIS returns 0 rows (fewer than min_stores=3)
    mock_postgis_result = MagicMock()
    mock_postgis_result.mappings.return_value.all.return_value = []

    # Fallback dark stores returns 0
    mock_dark_result = MagicMock()
    mock_dark_result.scalars.return_value.all.return_value = []

    # Fallback comp stores returns 0
    mock_comp_result = MagicMock()
    mock_comp_result.scalars.return_value.all.return_value = []

    db.execute.side_effect = [
        mock_postgis_result,
        mock_dark_result,
        mock_comp_result,
    ]

    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=3, db=db, payload=payload)

    assert isinstance(zones, list)
    assert len(zones) >= 1  # Should return fallback zone rather than crashing
    assert zones[0].store_count > 0
    assert zones[0].dominant_platform != ""


@pytest.mark.asyncio
async def test_adversarial_empty_store_set_sqlite():
    """When SQLite DB contains 0 stores, fallback gracefully handles empty store collections."""
    db = MagicMock(spec=AsyncSession)
    db.bind = MagicMock()
    db.bind.dialect.name = "sqlite"

    mock_dark_result = MagicMock()
    mock_dark_result.scalars.return_value.all.return_value = []

    mock_comp_result = MagicMock()
    mock_comp_result.scalars.return_value.all.return_value = []

    db.execute.side_effect = [
        Exception("SQLite dialect does not have ST_ClusterDBSCAN"),
        mock_dark_result,
        mock_comp_result,
    ]

    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Pune", eps_km=1.5, min_stores=3, db=db, payload=payload)

    assert isinstance(zones, list)
    assert len(zones) == 1
    assert zones[0].cluster_id == 0


def test_adversarial_simple_dbscan_empty_input():
    """Pure Python DBSCAN with 0 coordinates returns empty cluster mapping."""
    clusters = _simple_dbscan([], eps_km=1.5, min_samples=3)
    assert clusters == {}


# ── 2. Edge Case: Single Store / Sub-Threshold Clusters ──────────────────────

@pytest.mark.asyncio
async def test_adversarial_subthreshold_single_store():
    """When only 1 store exists and min_stores=3, fallback behavior prevents out-of-bounds indexing."""
    db = MagicMock(spec=AsyncSession)
    db.bind = MagicMock()
    db.bind.dialect.name = "sqlite"

    store1 = MagicMock()
    store1.latitude = 12.9345
    store1.longitude = 77.6266
    store1.platform = "Zepto"
    store1.id = 1
    store1.city = "Bangalore"
    store1.is_active = True

    mock_dark_result = MagicMock()
    mock_dark_result.scalars.return_value.all.return_value = [store1]

    mock_comp_result = MagicMock()
    mock_comp_result.scalars.return_value.all.return_value = []

    db.execute.side_effect = [
        Exception("No PostGIS"),
        mock_dark_result,
        mock_comp_result,
    ]

    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=3, db=db, payload=payload)
    assert isinstance(zones, list)
    assert len(zones) == 1


def test_adversarial_simple_dbscan_single_point_min_samples_1_vs_2():
    """Pure Python DBSCAN clustering behavior on isolated point."""
    coords = [(12.93, 77.62, {"platform": "Zepto", "id": 1})]
    
    # min_samples = 1 should form a cluster
    c1 = _simple_dbscan(coords, eps_km=1.5, min_samples=1)
    assert 0 in c1
    assert len(c1[0]) == 1

    # min_samples = 2 should label point as noise (-1)
    c2 = _simple_dbscan(coords, eps_km=1.5, min_samples=2)
    assert -1 in c2
    assert len(c2[-1]) == 1


# ── 3. Edge Case: Zero, Negative, and Extreme Epsilon ───────────────────────

def test_adversarial_zero_epsilon_clustering():
    """With eps_km=0.0, only exactly co-located stores form a cluster."""
    coords = [
        (12.9345, 77.6266, {"platform": "Zepto", "id": 1}),
        (12.9345, 77.6266, {"platform": "Blinkit", "id": 2}),
        (12.9345, 77.6266, {"platform": "Instamart", "id": 3}),
        (12.9400, 77.6300, {"platform": "Zepto", "id": 4}),  # Distinct location
    ]
    clusters = _simple_dbscan(coords, eps_km=0.0, min_samples=3)
    # The 3 co-located points should form cluster 0
    assert 0 in clusters
    assert len(clusters[0]) == 3
    # The 4th point should be noise (-1)
    assert -1 in clusters
    assert len(clusters[-1]) == 1


def test_adversarial_negative_epsilon_clustering():
    """With negative eps_km, distance is never <= eps_km, so all points are noise (-1)."""
    coords = [
        (12.9345, 77.6266, {"platform": "Zepto", "id": 1}),
        (12.9345, 77.6266, {"platform": "Blinkit", "id": 2}),
        (12.9345, 77.6266, {"platform": "Instamart", "id": 3}),
    ]
    clusters = _simple_dbscan(coords, eps_km=-1.0, min_samples=2)
    assert -1 in clusters
    assert len(clusters[-1]) == 3
    assert 0 not in clusters


def test_adversarial_huge_epsilon_clustering():
    """With large eps_km=10000.0 km, all stores across continents merge into 1 cluster."""
    coords = [
        (12.93, 77.62, {"platform": "Zepto", "id": 1}),       # Bangalore
        (28.61, 77.20, {"platform": "Blinkit", "id": 2}),     # Delhi (~1740 km away)
        (19.07, 72.87, {"platform": "Instamart", "id": 3}),   # Mumbai (~840 km away)
    ]
    clusters = _simple_dbscan(coords, eps_km=10000.0, min_samples=3)
    assert 0 in clusters
    assert len(clusters[0]) == 3


# ── 4. Edge Case: Large / Extreme Coordinates Geometry ──────────────────────

def test_adversarial_haversine_poles_and_antimeridian():
    """Haversine formula handles extreme latitudes, poles, and antimeridian wrap-around."""
    # North Pole to South Pole: Half Earth circumference (~20015 km)
    dist_poles = _haversine_km(90.0, 0.0, -90.0, 0.0)
    assert abs(dist_poles - math.pi * 6371.0) < 1.0

    # Antimeridian wrap: +179.9999 deg and -179.9999 deg (few meters apart)
    dist_antimeridian = _haversine_km(0.0, 179.9999, 0.0, -179.9999)
    assert dist_antimeridian < 0.1  # Less than 100 meters

    # Identical coordinates
    dist_zero = _haversine_km(12.9345, 77.6266, 12.9345, 77.6266)
    assert dist_zero == 0.0


def test_adversarial_haversine_antipodal_floating_point_bounds():
    """Antipodal points (opposite sides of the globe) do not cause math domain error."""
    # Opposite points on equator: (0, 0) and (0, 180)
    dist_equator_opp = _haversine_km(0.0, 0.0, 0.0, 180.0)
    assert abs(dist_equator_opp - math.pi * 6371.0) < 1.0

    # Opposite arbitrary points: (45.0, -100.0) and (-45.0, 80.0)
    dist_arb_opp = _haversine_km(45.0, -100.0, -45.0, 80.0)
    assert abs(dist_arb_opp - math.pi * 6371.0) < 1.0


# ── 5. Edge Case: Database Dialect Exceptions & Connection Resiliency ────────

@pytest.mark.asyncio
async def test_adversarial_postgis_noise_only_rows():
    """When PostGIS returns rows where all cid is NULL (all points are noise), endpoint returns empty list without error."""
    db = MagicMock(spec=AsyncSession)
    db.bind = MagicMock()
    db.bind.dialect.name = "postgresql"

    # PostGIS returns 3 rows, but all have cid = None (noise points)
    mock_row1 = {"id": 1, "platform": "Zepto", "latitude": 12.93, "longitude": 77.62, "cid": None}
    mock_row2 = {"id": 2, "platform": "Blinkit", "latitude": 19.07, "longitude": 72.87, "cid": None}
    mock_row3 = {"id": 3, "platform": "Instamart", "latitude": 28.61, "longitude": 77.20, "cid": None}

    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [mock_row1, mock_row2, mock_row3]
    db.execute.return_value = mock_result

    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=3, db=db, payload=payload)

    # Since all cid are None (mapped to -1), no valid clusters formed -> empty list
    assert zones == []


@pytest.mark.asyncio
async def test_adversarial_db_complete_failure_raises():
    """When PostGIS fails AND fallback DB query fails (e.g. total DB disconnect), exception is propagated."""
    db = MagicMock(spec=AsyncSession)
    db.bind = MagicMock()
    db.bind.dialect.name = "postgresql"

    # PostGIS fails with OperationalError
    # Fallback query also fails with OperationalError
    db.execute.side_effect = [
        OperationalError("connection lost", params=None, orig=Exception("socket closed")),
        OperationalError("connection lost", params=None, orig=Exception("socket closed")),
    ]

    payload = {"sub": "test_user"}
    with pytest.raises(OperationalError):
        await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=2, db=db, payload=payload)


@pytest.mark.asyncio
async def test_adversarial_unsupported_dialect_triggers_fallback():
    """When database dialect is an unsupported engine (e.g. mysql, oracle), fallback ORM path executes."""
    db = MagicMock(spec=AsyncSession)
    db.bind = MagicMock()
    db.bind.dialect.name = "oracle"

    store1 = MagicMock(latitude=12.93, longitude=77.62, platform="Zepto", id=1, city="Bangalore", is_active=True)
    store2 = MagicMock(latitude=12.93, longitude=77.62, platform="Zepto", id=2, city="Bangalore", is_active=True)
    store3 = MagicMock(latitude=12.93, longitude=77.62, platform="Blinkit", id=3, city="Bangalore", is_active=True)

    mock_dark_result = MagicMock()
    mock_dark_result.scalars.return_value.all.return_value = [store1, store2]

    mock_comp_result = MagicMock()
    mock_comp_result.scalars.return_value.all.return_value = [store3]

    db.execute.side_effect = [
        Exception("ORA-00904: ST_ClusterDBSCAN invalid identifier"),
        mock_dark_result,
        mock_comp_result,
    ]

    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=3, db=db, payload=payload)

    assert len(zones) == 1
    assert zones[0].store_count == 3
    assert zones[0].dominant_platform == "Zepto"
    assert db.execute.call_count == 3


# ── 6. Test Infrastructure & Mock Harness Resilience ─────────────────────────

@pytest.mark.asyncio
async def test_adversarial_dummy_session_api_contract():
    """Verify DummySession in conftest implements all standard SQLAlchemy AsyncSession result methods."""
    session = DummySession()
    res = await session.execute("SELECT 1")
    
    assert res.all() == []
    assert res.first() is None
    assert res.one_or_none() is None
    assert res.scalar_one_or_none() is None
    assert res.scalar() is None
    assert res.fetchall() == []
    assert res.fetchone() is None
    assert res.scalars().all() == []
    assert res.scalars().first() is None
    assert res.scalars().one_or_none() is None
    assert res.scalars().scalar_one_or_none() is None
    assert res.scalars().unique() is not None
    assert res.mappings().all() == []
    assert res.unique() is not None

    # Mutation mock methods should not raise
    dummy_obj = MagicMock()
    session.add(dummy_obj)
    session.add_all([dummy_obj])
    await session.delete(dummy_obj)
    await session.refresh(dummy_obj)
    await session.flush()
    await session.commit()
    await session.rollback()
    await session.close()


@pytest.mark.asyncio
async def test_adversarial_in_memory_sqlite_static_pool():
    """Verify in-memory SQLite with StaticPool retains table definitions across separate sessions."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Open session 1 and verify query executes against created tables
    async with AsyncSessionLocal() as session1:
        dark_stores = (await session1.execute(select(DarkStore))).scalars().all()
        assert isinstance(dark_stores, list)

    # Open session 2 (different connection instance) and verify tables still exist
    async with AsyncSessionLocal() as session2:
        comp_stores = (await session2.execute(select(CompetitorStore))).scalars().all()
        assert isinstance(comp_stores, list)
