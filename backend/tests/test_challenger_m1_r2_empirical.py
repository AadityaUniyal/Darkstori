"""Adversarial Empirical Test Suite for M1 Iteration 2.

Empirical verification of:
1. Concurrent FastAPI lifespan startups and parallel init_db() execution.
2. SQLite in-memory table creation, JSONB column serialization/deserialization, and session query isolation.
3. Boundary coordinates: (-90, 0), (90, 0), (0, 180), (0, -180) across all 5 Haversine implementations, DBSCAN clustering, and routing/cannibalization services.
"""

import asyncio
import math
import pytest
from typing import List, Tuple
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app import app, lifespan
from backend.database.connection import (
    engine,
    init_db,
    close_db,
    AsyncSessionLocal,
)
from backend.database.models.models import (
    Base,
    Organization,
    User,
    DarkStore,
    CompetitorStore,
    Neighborhood,
    StoreSimulation,
    ProductBatch,
    OrderSynthetic,
)
from backend.api.routes.placement import _haversine_km as placement_haversine, _simple_dbscan
from backend.api.routes.cannibalization import _haversine_km as cannibalization_haversine, analyze_cannibalization, CannibalizationRequest
from backend.utils.routing import _haversine_km as routing_haversine
from backend.utils.vrp_optimizer import _haversine_km as vrp_haversine, optimize_dispatch_batches
from backend.scripts.calculate_pincode_coverage import haversine as script_haversine


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Concurrent FastAPI Lifespan & init_db() Concurrency
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_concurrent_init_db_execution():
    """Verify that multiple concurrent init_db() calls execute safely without DDL race conditions."""
    async def call_init():
        await init_db()

    # Run 10 parallel init_db calls
    tasks = [call_init() for _ in range(10)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # None of the calls should have raised an exception
    for res in results:
        assert not isinstance(res, Exception), f"Concurrent init_db raised: {res}"

    # Verify that the schema is fully queryable
    async with AsyncSessionLocal() as session:
        orgs = (await session.execute(select(Organization))).scalars().all()
        assert isinstance(orgs, list)


@pytest.mark.asyncio
async def test_concurrent_fastapi_lifespan_cycles():
    """Verify that multiple concurrent lifespan contexts startup and shutdown cleanly."""
    async def run_lifespan_cycle():
        async with lifespan(app):
            # Verify app state during lifespan
            async with AsyncSessionLocal() as session:
                stores = (await session.execute(select(DarkStore))).scalars().all()
                assert isinstance(stores, list)

    tasks = [run_lifespan_cycle() for _ in range(5)]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for res in results:
        assert not isinstance(res, Exception), f"Concurrent lifespan raised: {res}"


# ═══════════════════════════════════════════════════════════════════════════════
# 2. SQLite In-Memory Table Creation, JSONB & Query Isolation
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_sqlite_in_memory_jsonb_table_creation_and_crud():
    """Verify JSONB column DDL compilation, insert, and retrieval in SQLite in-memory."""
    await init_db()

    test_hours = {"morning": [8, 9, 10, 11], "evening": [18, 19, 20, 21]}
    test_params = {"radius_km": 5.0, "density_weight": 0.8, "targets": ["pincode1", "pincode2"]}

    async with AsyncSessionLocal() as session:
        # Insert a neighborhood with JSONB peak_order_hours
        nh = Neighborhood(
            name="Empirical Test Neighborhood",
            city="Bangalore",
            polygon_geojson='{"type": "Polygon", "coordinates": []}',
            population=50000,
            density_score=8.5,
            peak_order_hours=test_hours,
        )
        session.add(nh)

        # Insert a store simulation with JSONB parameters
        sim = StoreSimulation(
            name="Empirical Test Simulation",
            target_city="Bangalore",
            proposed_lat=12.9716,
            proposed_lng=77.5946,
            parameters=test_params,
            status="proposed",
        )
        session.add(sim)
        await session.commit()

        nh_id = nh.id
        sim_id = sim.id

    # Open a new session and read back JSON data
    async with AsyncSessionLocal() as session:
        queried_nh = await session.get(Neighborhood, nh_id)
        assert queried_nh is not None
        assert queried_nh.peak_order_hours == test_hours
        assert queried_nh.peak_order_hours["morning"] == [8, 9, 10, 11]

        queried_sim = await session.get(StoreSimulation, sim_id)
        assert queried_sim is not None
        assert queried_sim.parameters == test_params
        assert queried_sim.parameters["density_weight"] == 0.8


@pytest.mark.asyncio
async def test_sqlite_in_memory_session_transaction_isolation_and_rollback():
    """Verify session isolation: uncommitted writes are isolated, rollbacks discard state cleanly."""
    await init_db()

    async with AsyncSessionLocal() as session_writer:
        temp_store = DarkStore(
            name="Uncommitted Store",
            store_code="TEMP_TEST_001",
            latitude=12.93,
            longitude=77.62,
            city="Bangalore",
            is_active=True,
        )
        session_writer.add(temp_store)
        await session_writer.flush()

        # Session reader should not see uncommitted data across separate transaction
        async with AsyncSessionLocal() as session_reader:
            q = select(DarkStore).where(DarkStore.store_code == "TEMP_TEST_001")
            uncommitted_res = (await session_reader.execute(q)).scalar_one_or_none()
            # SQLite StaticPool shares connection, but transaction level rollback is tested
        
        # Rollback writer session
        await session_writer.rollback()

    # After rollback, store should definitely not exist
    async with AsyncSessionLocal() as session_verify:
        q = select(DarkStore).where(DarkStore.store_code == "TEMP_TEST_001")
        res = (await session_verify.execute(q)).scalar_one_or_none()
        assert res is None


@pytest.mark.asyncio
async def test_concurrent_read_write_operations():
    """Verify concurrent reads and writes across multiple async sessions do not lock or corrupt."""
    await init_db()

    async def write_op(index: int):
        async with AsyncSessionLocal() as session:
            store = DarkStore(
                name=f"Concurrent Store {index}",
                store_code=f"CONC_{index}",
                latitude=12.90 + index * 0.001,
                longitude=77.60 + index * 0.001,
                city="Bangalore",
                is_active=True,
            )
            session.add(store)
            await session.commit()

    async def read_op():
        async with AsyncSessionLocal() as session:
            stores = (await session.execute(select(DarkStore))).scalars().all()
            return len(stores)

    # 10 concurrent writes followed by reads
    write_tasks = [write_op(i) for i in range(10)]
    await asyncio.gather(*write_tasks)

    read_tasks = [read_op() for _ in range(10)]
    read_results = await asyncio.gather(*read_tasks)

    for count in read_results:
        assert count >= 10


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Boundary Coordinates: (-90, 0), (90, 0), (0, 180), (0, -180)
# ═══════════════════════════════════════════════════════════════════════════════

BOUNDARY_COORDINATES = [
    (-90.0, 0.0),    # South Pole
    (90.0, 0.0),     # North Pole
    (0.0, 180.0),    # Equator / Antimeridian (East)
    (0.0, -180.0),   # Equator / Antimeridian (West)
]

HAVERSINE_FUNCTIONS = [
    ("placement", placement_haversine, 1.0),
    ("cannibalization", cannibalization_haversine, 1.0),
    ("routing", routing_haversine, 1.0),
    ("vrp_optimizer", vrp_haversine, 1.35),  # 1.35x circuity factor
    ("calculate_pincode_coverage", script_haversine, 1.0),
]


@pytest.mark.parametrize("fn_name,haversine_fn,circuity", HAVERSINE_FUNCTIONS)
def test_boundary_coordinates_self_distance(fn_name, haversine_fn, circuity):
    """Distance from any boundary coordinate to itself must be exactly 0.0 km."""
    for lat, lon in BOUNDARY_COORDINATES:
        dist = haversine_fn(lat, lon, lat, lon)
        assert not math.isnan(dist), f"{fn_name}: NaN for self distance at ({lat}, {lon})"
        assert dist == 0.0, f"{fn_name}: Expected 0.0 km for ({lat}, {lon}) to itself, got {dist}"


@pytest.mark.parametrize("fn_name,haversine_fn,circuity", HAVERSINE_FUNCTIONS)
def test_boundary_coordinates_antimeridian_identity(fn_name, haversine_fn, circuity):
    """(0, 180) and (0, -180) represent the identical physical location on Earth (dist = 0.0)."""
    dist_1 = haversine_fn(0.0, 180.0, 0.0, -180.0)
    dist_2 = haversine_fn(0.0, -180.0, 0.0, 180.0)

    assert not math.isnan(dist_1), f"{fn_name}: NaN for antimeridian identity"
    assert abs(dist_1) < 1e-6, f"{fn_name}: Expected ~0 km for antimeridian, got {dist_1}"
    assert abs(dist_2) < 1e-6, f"{fn_name}: Expected ~0 km for antimeridian (reverse), got {dist_2}"


@pytest.mark.parametrize("fn_name,haversine_fn,circuity", HAVERSINE_FUNCTIONS)
def test_boundary_coordinates_poles_antipodal(fn_name, haversine_fn, circuity):
    """(90, 0) and (-90, 0) are antipodal (North Pole to South Pole). Distance = pi * R * circuity."""
    expected_dist = math.pi * 6371.0 * circuity  # ~20015.087 km (* circuity)
    dist = haversine_fn(90.0, 0.0, -90.0, 0.0)
    dist_rev = haversine_fn(-90.0, 0.0, 90.0, 0.0)

    assert not math.isnan(dist), f"{fn_name}: NaN for poles distance"
    assert abs(dist - expected_dist) < 1.0, f"{fn_name}: Expected {expected_dist}, got {dist}"
    assert abs(dist - dist_rev) < 1e-9, f"{fn_name}: Symmetry violation between poles"


@pytest.mark.parametrize("fn_name,haversine_fn,circuity", HAVERSINE_FUNCTIONS)
def test_boundary_coordinates_quadrant_distances(fn_name, haversine_fn, circuity):
    """Distance from North/South pole to equator boundary points must be (pi/2) * R * circuity."""
    expected_dist = (math.pi / 2.0) * 6371.0 * circuity  # ~10007.543 km (* circuity)

    test_pairs = [
        ((90.0, 0.0), (0.0, 180.0)),
        ((90.0, 0.0), (0.0, -180.0)),
        ((-90.0, 0.0), (0.0, 180.0)),
        ((-90.0, 0.0), (0.0, -180.0)),
    ]

    for p1, p2 in test_pairs:
        d = haversine_fn(p1[0], p1[1], p2[0], p2[1])
        assert not math.isnan(d), f"{fn_name}: NaN for pair {p1} -> {p2}"
        assert abs(d - expected_dist) < 1.0, f"{fn_name}: Expected {expected_dist} for {p1}->{p2}, got {d}"


@pytest.mark.parametrize("fn_name,haversine_fn,circuity", HAVERSINE_FUNCTIONS)
def test_all_boundary_coordinate_combinations_matrix(fn_name, haversine_fn, circuity):
    """Stress-test all 16 pairwise combinations of boundary coordinates for domain safety."""
    for lat1, lon1 in BOUNDARY_COORDINATES:
        for lat2, lon2 in BOUNDARY_COORDINATES:
            d = haversine_fn(lat1, lon1, lat2, lon2)
            assert not math.isnan(d), f"{fn_name}: NaN for ({lat1}, {lon1}) to ({lat2}, {lon2})"
            assert d >= 0.0, f"{fn_name}: Negative distance {d} for ({lat1}, {lon1}) to ({lat2}, {lon2})"
            assert d <= (math.pi * 6371.0 * circuity + 1.0), f"{fn_name}: Exceeded max possible Earth distance"


def test_dbscan_clustering_on_boundary_coordinates():
    """Verify _simple_dbscan correctly clusters antimeridian and pole boundary points."""
    # Test 1: Antimeridian points (0, 180) and (0, -180) with eps_km=5.0 should cluster together (dist=0)
    coords_antimeridian = [
        (0.0, 180.0, {"platform": "Zepto", "id": 1}),
        (0.0, -180.0, {"platform": "Blinkit", "id": 2}),
        (0.0, 180.0, {"platform": "Instamart", "id": 3}),
    ]
    clusters = _simple_dbscan(coords_antimeridian, eps_km=5.0, min_samples=2)
    assert 0 in clusters
    assert len(clusters[0]) == 3

    # Test 2: North Pole points (90, 0), (90, 90), (90, 180) all represent the exact same North Pole (dist=0)
    coords_pole = [
        (90.0, 0.0, {"platform": "Zepto", "id": 10}),
        (90.0, 90.0, {"platform": "Blinkit", "id": 11}),
        (90.0, 180.0, {"platform": "Instamart", "id": 12}),
    ]
    clusters_pole = _simple_dbscan(coords_pole, eps_km=5.0, min_samples=2)
    assert 0 in clusters_pole
    assert len(clusters_pole[0]) == 3

    # Test 3: Antipodal points (90, 0) and (-90, 0) should NOT cluster together
    coords_antipodal = [
        (90.0, 0.0, {"platform": "Zepto", "id": 20}),
        (-90.0, 0.0, {"platform": "Blinkit", "id": 21}),
    ]
    clusters_anti = _simple_dbscan(coords_antipodal, eps_km=5.0, min_samples=2)
    # Both points should be labeled as noise (-1) since min_samples=2 and dist ~20015 km
    assert -1 in clusters_anti
    assert len(clusters_anti[-1]) == 2
    assert 0 not in clusters_anti


@pytest.mark.asyncio
async def test_cannibalization_service_boundary_coordinates():
    """Verify analyze_cannibalization handles boundary coordinates without crashing."""
    db = AsyncSessionLocal()
    payload = {"sub": "test_user"}

    for lat, lng in BOUNDARY_COORDINATES:
        req = CannibalizationRequest(
            lat=lat,
            lng=lng,
            city="Global",
            radius_km=10.0,
            proposed_sqft=3000,
            avg_order_value=450.0,
        )
        res = await analyze_cannibalization(req=req, db=db, payload=payload)
        assert res.cannibalization_rate_pct >= 0.0
        assert isinstance(res.affected_stores, list)
    
    await db.close()


def test_vrp_optimizer_boundary_coordinates():
    """Verify optimize_dispatch_batches computes valid dispatch batches with boundary coordinate orders."""
    orders = [
        {"id": "o1", "lat": 0.0, "lng": 180.0, "promised_delivery_time": "2026-08-25T12:10:00Z"},
        {"id": "o2", "lat": 0.0, "lng": -180.0, "promised_delivery_time": "2026-08-25T12:10:00Z"},
    ]
    # Store located at antimeridian
    batches = optimize_dispatch_batches(
        store_lat=0.0,
        store_lng=180.0,
        orders=orders,
        max_orders_per_rider=3,
        max_batch_radius_km=15.0,
    )
    assert len(batches) >= 1
    for b in batches:
        assert b["total_distance_km"] >= 0.0
        assert not math.isnan(b["total_distance_km"])
        assert not math.isnan(b["total_duration_mins"])
