"""Unit tests for R1: Greenfield Placement & Cannibalization Engine.

Tests Huff's Gravity Model demand redistribution, geospatial distance calculation,
and cannibalization impact assessment with mathematical precision.
"""

import math
import pytest
from backend.api.routes.cannibalization import (
    _haversine_km,
    _huff_attractiveness,
    CannibalizationRequest,
    analyze_cannibalization,
)
from backend.database.connection import AsyncSessionLocal, init_db


class TestHaversineDistance:
    """Tests for great-circle Haversine distance calculation."""

    def test_identical_coordinates_zero_distance(self):
        """Distance between identical coordinates must be exactly 0.0 km."""
        assert _haversine_km(12.9716, 77.5946, 12.9716, 77.5946) == 0.0

    def test_known_city_distance_bangalore_to_delhi(self):
        """Bangalore (12.9716, 77.5946) to Delhi (28.6139, 77.2090) is ~1740 km."""
        dist = _haversine_km(12.9716, 77.5946, 28.6139, 77.2090)
        assert 1730.0 < dist < 1755.0

    def test_symmetry(self):
        """Distance A -> B must equal distance B -> A."""
        d_ab = _haversine_km(12.9352, 77.6245, 12.9716, 77.5946)
        d_ba = _haversine_km(12.9716, 77.5946, 12.9352, 77.6245)
        assert abs(d_ab - d_ba) < 1e-9

    def test_domain_clamping_antipodal(self):
        """Antipodal points (e.g. North Pole 90,0 to South Pole -90,0) must not cause math domain error."""
        dist = _haversine_km(90.0, 0.0, -90.0, 0.0)
        expected = math.pi * 6371.0
        assert abs(dist - expected) < 1.0


class TestHuffGravityModel:
    """Tests for Huff's Gravity Model attractiveness and probability distribution."""

    def test_attractiveness_proportional_to_sqft(self):
        """Attractiveness must scale linearly with store square footage at fixed distance."""
        dist = 1.5
        attr_1000 = _huff_attractiveness(1000, dist, beta=2.0)
        attr_2000 = _huff_attractiveness(2000, dist, beta=2.0)
        assert abs(attr_2000 - 2 * attr_1000) < 1e-9

    def test_attractiveness_inverse_square_distance(self):
        """With beta=2.0, doubling distance must reduce attractiveness by 4x."""
        attr_d1 = _huff_attractiveness(2000, 1.0, beta=2.0)
        attr_d2 = _huff_attractiveness(2000, 2.0, beta=2.0)
        assert abs(attr_d1 - 4 * attr_d2) < 1e-9

    def test_zero_distance_clamping_prevents_zero_division(self):
        """Distance < 0.05 km must be clamped to 0.05 km to prevent division by zero."""
        attr_zero = _huff_attractiveness(1500, 0.0, beta=2.0)
        attr_small = _huff_attractiveness(1500, 0.05, beta=2.0)
        assert attr_zero == attr_small
        assert not math.isinf(attr_zero)
        assert not math.isnan(attr_zero)

    def test_huff_probability_distribution_sums_to_one(self):
        """Customer choice probabilities across all competing stores must sum to 1.0."""
        stores = [
            {"name": "Darkstori Koramangala", "sqft": 2500, "dist_km": 0.8},
            {"name": "Zepto Koramangala", "sqft": 2000, "dist_km": 1.2},
            {"name": "Blinkit HSR", "sqft": 1800, "dist_km": 2.0},
            {"name": "Swiggy Instamart", "sqft": 2200, "dist_km": 1.5},
        ]
        attractiveness_scores = [_huff_attractiveness(s["sqft"], s["dist_km"]) for s in stores]
        total_attractiveness = sum(attractiveness_scores)
        probabilities = [score / total_attractiveness for score in attractiveness_scores]

        assert abs(sum(probabilities) - 1.0) < 1e-9
        # The closest store with highest sqft must have the highest market share
        assert probabilities[0] == max(probabilities)


class TestCannibalizationAnalysis:
    """Tests for cannibalization analysis endpoint calculations."""

    @pytest.mark.asyncio
    async def test_cannibalization_request_validation(self):
        """Verify CannibalizationRequest model validation boundaries."""
        req = CannibalizationRequest(
            lat=12.9716,
            lng=77.5946,
            city="Bangalore",
            radius_km=3.5,
            proposed_sqft=2500,
            avg_order_value=400.0,
        )
        assert req.lat == 12.9716
        assert req.radius_km == 3.5
        assert req.proposed_sqft == 2500

    @pytest.mark.asyncio
    async def test_cannibalization_analysis_execution(self):
        """Verify analyze_cannibalization calculates net incremental orders and cannibalization rate."""
        await init_db()
        async with AsyncSessionLocal() as session:
            req = CannibalizationRequest(
                lat=12.9716,
                lng=77.5946,
                city="Bangalore",
                radius_km=3.0,
                proposed_sqft=2000,
                avg_order_value=350.0,
            )
            payload = {"sub": "unit_test_user", "role": "admin"}
            response = await analyze_cannibalization(req=req, db=session, payload=payload)

            assert response.radius_km == 3.0
            assert response.cannibalization_rate_pct >= 0.0
            assert response.cannibalization_rate_pct <= 100.0
            assert response.net_incremental_orders >= 0
            assert response.new_store_predicted_orders >= 0
            assert isinstance(response.affected_stores, list)
            assert "monthly_revenue_gain" in response.portfolio_impact
