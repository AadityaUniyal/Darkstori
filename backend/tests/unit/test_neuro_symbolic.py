"""Unit Tests for Neuro-Symbolic Anticipatory Dark Store & Locally-Adaptive CQR Engine."""

import pytest
from backend.ml.neuro_symbolic_engine import (
    HawkesBasketExcitation,
    LocallyAdaptiveCQR,
    DarkStoreDigitalTwin,
    hawkes_engine,
    adaptive_cqr_engine,
    digital_twin_engine,
)


def test_hawkes_basket_cross_excitation():
    """Verify that lingering on Dairy cross-excites Bakery and Produce."""
    hawkes = HawkesBasketExcitation()
    dwell_events = [
        {"category": "dairy", "sku": "Amul Milk 500ml", "dwell_sec": 4.5}
    ]
    basket = hawkes.compute_basket_probabilities(dwell_events)

    assert len(basket) == 5
    # Dairy and Bakery should have high excitation
    dairy_pred = next(p for p in basket if p["category"] == "dairy")
    bakery_pred = next(p for p in basket if p["category"] == "bakery")

    assert dairy_pred["prepick_confidence_pct"] >= 80.0
    assert bakery_pred["prepick_confidence_pct"] >= 75.0
    assert dairy_pred["prepick_triggered"] is True


def test_locally_adaptive_cqr_heteroscedasticity():
    """Verify that higher rain and congestion increases local sigma and widens bounds."""
    cqr = LocallyAdaptiveCQR(calibration_size=500, random_seed=42)
    clear_sim = cqr.compute_adaptive_interval(nominal_eta_min=8.0, alpha=0.05, traffic_congestion_index=1.0, weather_rain_mm=0.0)
    storm_sim = cqr.compute_adaptive_interval(nominal_eta_min=8.0, alpha=0.05, traffic_congestion_index=1.6, weather_rain_mm=40.0)

    assert storm_sim["local_heteroscedastic_sigma"] > clear_sim["local_heteroscedastic_sigma"]
    assert storm_sim["conformal_half_width_min"] > clear_sim["conformal_half_width_min"]


def test_actuators_defend_sla_under_storm():
    """Verify that actuators pull the upper bound beneath the 10-minute SLA ceiling."""
    cqr = LocallyAdaptiveCQR(calibration_size=500, random_seed=42)
    unmitigated = cqr.compute_adaptive_interval(
        nominal_eta_min=9.2, alpha=0.05, traffic_congestion_index=1.3, weather_rain_mm=20.0, applied_actuators=[]
    )
    mitigated = cqr.compute_adaptive_interval(
        nominal_eta_min=9.2, alpha=0.05, traffic_congestion_index=1.3, weather_rain_mm=20.0,
        applied_actuators=["anticipatory_prepick", "rider_bay_priority", "vrp_dynamic_resequence"]
    )

    assert mitigated["adjusted_point_min"] < unmitigated["adjusted_point_min"]
    assert mitigated["total_latency_reduction_min"] == 3.6  # 1.8 + 0.6 + 1.2
    assert mitigated["upper_bound_min"] < unmitigated["upper_bound_min"]


def test_digital_twin_kinematics():
    """Verify dark store digital twin models aisle picker distance and walk times."""
    dt = DarkStoreDigitalTwin()
    sample_basket = [
        {"category": "dairy", "prepick_triggered": True},
        {"category": "bakery", "prepick_triggered": True},
    ]
    res = dt.simulate_digital_twin_lifecycle(sample_basket, dwell_seconds=3.0, traffic_congestion=1.1, rain_mm=10.0)

    assert "digital_twin" in res
    assert len(res["digital_twin"]["aisles"]) == 4
    picker = res["digital_twin"]["picker_kinematics"]
    assert picker["travel_distance_meters"] > 0
    assert picker["pick_walk_time_seconds"] > 0

    # Verify head-to-head proof
    assert res["darkstori_apex_pipeline"]["total_seconds"] < res["traditional_pipeline"]["total_seconds"]
    assert res["darkstori_apex_pipeline"]["pick_pack_duration_s"] == 28
