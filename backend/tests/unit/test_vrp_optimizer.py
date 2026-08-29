"""Unit tests for R3: 10-Minute SLA Vehicle Routing Problem (VRP) Dispatch Optimizer.

Tests Clarke-Wright Savings algorithm, 1.35x Indian metropolitan road grid circuity factor,
max 3 drops per rider capacity constraints, route duration limits, and delivery SLA ETA calculation.
"""

import math
import pytest
from backend.utils.vrp_optimizer import (
    _haversine_km,
    _travel_time_mins,
    optimize_dispatch_batches,
)


class TestCircuityAndTravelTime:
    """Tests for road grid circuity factor and urban transit velocity calculations."""

    def test_circuity_factor_applied(self):
        """Haversine distance must include 1.35x circuity factor over straight-line."""
        lat1, lon1 = 12.9716, 77.5946
        lat2, lon2 = 12.9352, 77.6245

        # Straight-line distance
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        straight_dist = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        circuity_dist = _haversine_km(lat1, lon1, lat2, lon2)

        assert abs(circuity_dist - (straight_dist * 1.35)) < 1e-6

    def test_travel_time_formula(self):
        """Travel time must equal (distance / 18.0 km/h) * 60 minutes."""
        dist = 3.0  # 3 km
        expected_mins = (3.0 / 18.0) * 60.0  # 10.0 minutes
        assert abs(_travel_time_mins(dist, speed_kmh=18.0) - expected_mins) < 1e-9


class TestClarkeWrightOptimizer:
    """Tests for Clarke-Wright Savings order batching heuristic."""

    def test_empty_orders_returns_empty_dispatch(self):
        """Optimizing zero orders returns empty batch structure with zero metrics."""
        res = optimize_dispatch_batches(12.9716, 77.5946, [])
        assert res["total_orders"] == 0
        assert res["riders_required"] == 0
        assert res["batches"] == []
        assert res["cost_savings_pct"] == 0.0

    def test_single_order_dispatch(self):
        """Single order produces exactly 1 batch with 1 rider."""
        orders = [
            {"order_id": "ORD-001", "lat": 12.9750, "lng": 77.5980, "order_value": 450.0}
        ]
        res = optimize_dispatch_batches(12.9716, 77.5946, orders)
        assert res["total_orders"] == 1
        assert res["riders_required"] == 1
        assert len(res["batches"]) == 1
        assert res["batches"][0]["orders_count"] == 1

    def test_capacity_constraint_max_three_drops(self):
        """No rider batch may exceed the maximum 3 orders per rider constraint."""
        # 7 tightly clustered orders near dark store
        orders = [
            {"order_id": f"ORD-{i}", "lat": 12.9720 + i * 0.002, "lng": 77.5950 + i * 0.002, "order_value": 300.0}
            for i in range(7)
        ]
        res = optimize_dispatch_batches(
            12.9716, 77.5946, orders, max_orders_per_rider=3
        )
        assert res["total_orders"] == 7
        assert res["riders_required"] >= 3  # Minimum ceil(7/3) = 3 riders

        for batch in res["batches"]:
            assert batch["orders_count"] <= 3, f"Batch exceeded max 3 drops: {batch['orders_count']}"

    def test_clarke_wright_savings_efficiency(self):
        """Multi-drop batching must achieve lower total distance than individual roundtrips."""
        # 3 collinear orders in same direction within tight delivery radius
        orders = [
            {"order_id": "ORD-A", "lat": 12.9722, "lng": 77.5952, "order_value": 350.0},
            {"order_id": "ORD-B", "lat": 12.9728, "lng": 77.5958, "order_value": 420.0},
            {"order_id": "ORD-C", "lat": 12.9734, "lng": 77.5964, "order_value": 290.0},
        ]
        res = optimize_dispatch_batches(
            12.9716, 77.5946, orders, max_orders_per_rider=3
        )
        # Should merge into 1 batch of 3 orders
        assert res["riders_required"] == 1
        assert res["distance_saved_km"] > 0.0
        assert res["cost_savings_pct"] > 0.0
        assert res["co2_saved_kg"] > 0.0

    def test_sla_eta_tracking_and_status(self):
        """Each order in batch receives an estimated delivery ETA and SLA status."""
        orders = [
            {"order_id": "ORD-1", "lat": 12.9730, "lng": 77.5960, "order_value": 300.0},
            {"order_id": "ORD-2", "lat": 12.9740, "lng": 77.5970, "order_value": 350.0},
        ]
        res = optimize_dispatch_batches(12.9716, 77.5946, orders)
        batch = res["batches"][0]
        for order in batch["orders"]:
            assert "est_delivery_mins" in order
            assert order["est_delivery_mins"] > 0.0
            assert order["sla_status"] in ["ON_TRACK", "AT_RISK"]
