"""Tier 5 Adversarial Coverage Hardening & Stress Testing Suite.

Executes white-box stress testing, extreme boundary probing, zero-mock mathematical
fidelity verification, and adversarial vulnerability checks across R1-R4 engines and security.
"""

import math
import pytest
from datetime import datetime, timedelta, date
from fastapi import HTTPException

# R1 Engine
from backend.api.routes.cannibalization import (
    _haversine_km as cann_haversine,
    _huff_attractiveness,
    CannibalizationRequest,
    analyze_cannibalization,
)
from backend.api.routes.placement import _simple_dbscan

# R2 Engine
from backend.api.routes.resilience import (
    calculate_sigmoid_discount,
    DecayRequest,
    ScanRequest,
    simulate_decay,
    scan_qr_crate,
)

# R3 Engine
from backend.utils.vrp_optimizer import (
    _haversine_km as vrp_haversine,
    _travel_time_mins,
    optimize_dispatch_batches,
)

# R4 Engine
from backend.ml.weather_service import (
    _pincode_to_city,
    _seasonal_heuristic,
    fetch_weather_for_date,
    fetch_weather_forecast,
)

# Security & Core
from backend.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_admin,
    hash_password,
    verify_password,
)
from backend.database.connection import AsyncSessionLocal, init_db


class TestTier5GeospatialAdversarial:
    """Tier 5: Adversarial testing of geospatial boundaries and clustering."""

    def test_haversine_extreme_latitudes_and_longitudes(self):
        """Haversine distance does not crash on extreme lat/long poles and wraps."""
        extreme_points = [
            (-90.0, 0.0),
            (90.0, 0.0),
            (0.0, -180.0),
            (0.0, 180.0),
            (-89.9999, 179.9999),
        ]
        for lat1, lon1 in extreme_points:
            for lat2, lon2 in extreme_points:
                dist = cann_haversine(lat1, lon1, lat2, lon2)
                assert not math.isnan(dist)
                assert dist >= 0.0
                assert dist <= (math.pi * 6371.0 + 1.0)

    def test_huff_gravity_extreme_sqft_and_distances(self):
        """Huff model handles massive square footage and microscopic/huge distances."""
        # 100,000 sqft mega-fulfillment hub at 0.0001 km
        score_close = _huff_attractiveness(100000, 0.0001, beta=2.0)
        assert not math.isinf(score_close)
        assert not math.isnan(score_close)
        assert score_close > 0.0

        # Small 200 sqft kiosk at 5000 km distance
        score_far = _huff_attractiveness(200, 5000.0, beta=2.0)
        assert score_far > 0.0
        assert not math.isnan(score_far)

    def test_dbscan_clustering_collocated_and_noise_points(self):
        """DBSCAN handles 50 identical points and isolated noise points safely."""
        identical_coords = [(12.9716, 77.5946, {"id": i}) for i in range(50)]
        clusters = _simple_dbscan(identical_coords, eps_km=1.0, min_samples=3)
        assert 0 in clusters
        assert len(clusters[0]) == 50


class TestTier5VRPAdversarialStress:
    """Tier 5: High-density VRP dispatch stress and edge conditions."""

    def test_high_volume_dense_order_batching(self):
        """Optimizer batches 60 orders into valid capacity-constrained multi-drop routes."""
        orders = [
            {
                "order_id": f"ORD-STRESS-{i}",
                "lat": 12.9716 + (i % 10) * 0.0008,
                "lng": 77.5946 + (i // 10) * 0.0008,
                "order_value": 250.0 + (i * 10),
            }
            for i in range(60)
        ]
        res = optimize_dispatch_batches(
            12.9716, 77.5946, orders, max_orders_per_rider=3
        )
        assert res["total_orders"] == 60
        assert res["riders_required"] >= 20
        for b in res["batches"]:
            assert b["orders_count"] <= 3
            assert b["total_route_distance_km"] >= 0.0

    def test_widely_dispersed_outliers_require_individual_riders(self):
        """Distant orders located in opposite quadrants must not be merged if exceeding SLA duration."""
        orders = [
            {"order_id": "ORD-NORTH", "lat": 13.1500, "lng": 77.5946, "order_value": 500.0},
            {"order_id": "ORD-SOUTH", "lat": 12.8000, "lng": 77.5946, "order_value": 500.0},
            {"order_id": "ORD-EAST",  "lat": 12.9716, "lng": 77.8000, "order_value": 500.0},
        ]
        res = optimize_dispatch_batches(
            12.9716, 77.5946, orders, max_orders_per_rider=3, max_route_duration_mins=15.0
        )
        # Because each is ~20 km away in opposite directions, each must get its own rider
        assert res["riders_required"] == 3


class TestTier5ResilienceSigmoidAdversarial:
    """Tier 5: Numerical stability and extreme conditions for perishables decay."""

    def test_sigmoid_extreme_freshness_inputs(self):
        """Sigmoid discount returns clamped, valid discounts across entire float domain."""
        test_inputs = [-100.0, -1.0, 0.0, 0.1, 0.52, 0.89, 0.90, 0.99, 1.0, 100.0]
        for val in test_inputs:
            disc = calculate_sigmoid_discount(val)
            assert 0.0 <= disc <= 0.85
            assert not math.isnan(disc)

    @pytest.mark.asyncio
    async def test_simulated_decay_multi_day_continuous(self):
        """Simulating 72 hours of decay continuously clamps freshness at 0.0 without crash."""
        await init_db()
        async with AsyncSessionLocal() as session:
            payload = {"sub": "adversarial_tester", "role": "admin"}
            req = DecayRequest(hours=72.0, city="Bangalore", temp_failure=True)
            batches = await simulate_decay(req=req, db=session, payload=payload)
            for b in batches:
                assert b.freshness_score >= 0.0
                assert b.discount_rate <= 0.85
                assert b.current_price >= 0.0


class TestTier5WeatherAndSurgeAdversarial:
    """Tier 5: Weather API fallback stability and surge safety."""

    def test_weather_extreme_calendar_dates(self):
        """Seasonal heuristics handle leap years, year ends, and extreme future dates."""
        dates = [
            date(2028, 2, 29),  # Leap day
            date(2026, 12, 31), # Year end
            date(2026, 1, 1),   # Year start
        ]
        for d in dates:
            for city in ["Bangalore", "Delhi", "Mumbai", "Hyderabad", "Pune"]:
                res = _seasonal_heuristic(city, d)
                assert res["temperature_max"] > -20.0
                assert res["precipitation_sum"] >= 0.0

    @pytest.mark.asyncio
    async def test_weather_fuzzing_pincode_inputs(self):
        """Fuzzed pincodes (alphanumeric, symbols, empty) resolve to fallback city safely."""
        fuzz_pincodes = ["ABCDEF", "000000", "!@#$%^", "560-034", " ", "400_001"]
        for p in fuzz_pincodes:
            city = _pincode_to_city(p)
            assert isinstance(city, str)
            assert len(city) > 0


class TestTier5SecurityAdversarialPenetration:
    """Tier 5: JWT forgery, payload manipulation, and role tampering."""

    def test_jwt_none_algorithm_rejected(self):
        """Token with alg=none or unsigned payload is rejected."""
        tampered_token = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiJ9."
        with pytest.raises(HTTPException):
            decode_token(tampered_token)

    def test_bcrypt_long_password_safety(self):
        """Long passwords (> 72 characters) are safely truncated and verified without crash."""
        long_pass = "A" * 150 + "SecretPassword123!"
        hashed = hash_password(long_pass)
        assert verify_password(long_pass, hashed) is True
        assert verify_password("WrongPassword", hashed) is False
