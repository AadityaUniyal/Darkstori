"""
Unit Tests for Autonomous Grid, Thermodynamic Slotting, and Swarm Intercept Engines
"""

import pytest
from backend.ml.thermodynamic_slotting import slotting_engine, ThermodynamicSlottingEngine
from backend.ml.swarm_intercept import swarm_engine, SwarmInterceptEngine
from backend.ml.self_healing_grid import grid_engine, SelfHealingGridEngine


def test_thermodynamic_slotting_optimization():
    engine = ThermodynamicSlottingEngine()
    result = engine.optimize_slotting(iterations=250)

    assert result["optimized_layout_cost"] <= result["initial_layout_cost"]
    assert result["picker_walk_optimized_meters"] <= result["picker_walk_initial_meters"]
    assert result["transit_reduction_pct"] >= 0.0
    assert result["avg_pick_time_optimized_sec"] <= result["avg_pick_time_initial_sec"]
    assert len(result["migration_waves"]) > 0
    assert len(result["optimized_slots"]) == 16


def test_swarm_intercept_rendezvous():
    engine = SwarmInterceptEngine()
    courier_a = {"id": "RIDER-ALPHA", "lat": 12.9360, "lon": 77.6250}
    courier_b = {"id": "RIDER-BETA", "lat": 12.9290, "lon": 77.6320}
    target = {"lat": 12.9240, "lon": 77.6380}

    result = engine.compute_optimal_intercept(
        courier_a=courier_a,
        courier_b=courier_b,
        target_delivery=target,
        traffic_congestion=1.4
    )

    baseline = result["baseline_pipeline"]
    swarm = result["swarm_intercept_pipeline"]

    assert swarm["total_duration_min"] < baseline["total_duration_min"]
    assert swarm["time_saved_min"] > 0
    assert "rendezvous_waypoint" in swarm
    assert swarm["sla_status"] in ["Defended", "Tight"]


def test_self_healing_multi_hub_mesh():
    engine = SelfHealingGridEngine()
    result = engine.evaluate_grid_transshipments()

    assert result["active_hubs_count"] == 4
    assert result["total_transshipments_queued"] >= 2
    assert result["total_spoilage_units_saved"] > 0
    assert result["net_grid_alpha_inr"] > 0
    assert len(result["hubs_topology"]) == 4

    first_transfer = result["transshipments"][0]
    assert first_transfer["source_hub"] == "HUB-KOR"
    assert first_transfer["target_hub"] == "HUB-IND"
    assert first_transfer["net_economic_gain_inr"] > 0
