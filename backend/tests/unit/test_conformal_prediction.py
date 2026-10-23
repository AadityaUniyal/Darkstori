"""Unit Tests for Distribution-Free Split Conformal Prediction SLA Engine."""

import pytest
from backend.ml.conformal_prediction import ConformalSlaPredictor, conformal_sla_engine


def test_conformal_quantile_monotonicity():
    """Verify that smaller alpha (higher confidence) yields wider conformal quantiles."""
    engine = ConformalSlaPredictor(calibration_size=500, random_seed=42)
    q_90 = engine.compute_conformal_quantile(alpha=0.10)
    q_95 = engine.compute_conformal_quantile(alpha=0.05)
    q_99 = engine.compute_conformal_quantile(alpha=0.01)

    assert q_90 <= q_95 <= q_99
    assert q_95 > 0.0


def test_conformal_interval_validity():
    """Verify prediction intervals maintain non-negative bounds and proper ordering."""
    engine = ConformalSlaPredictor()
    result = engine.predict_interval(predicted_mean_min=8.0, alpha=0.05)

    assert result["lower_bound_min"] <= result["point_estimate_min"] <= result["upper_bound_min"]
    assert result["lower_bound_min"] >= 1.5
    assert result["confidence_level_pct"] == 95.0
    assert result["sla_ceiling_min"] == 10.0


def test_anticipatory_prepick_reduces_latency():
    """Verify anticipatory pre-picking shifts latency interval leftwards into safe zone."""
    engine = ConformalSlaPredictor()
    baseline = engine.predict_interval(predicted_mean_min=9.5, alpha=0.05, anticipatory_prepick_enabled=False)
    with_prepick = engine.predict_interval(predicted_mean_min=9.5, alpha=0.05, anticipatory_prepick_enabled=True)

    assert with_prepick["point_estimate_min"] < baseline["point_estimate_min"]
    assert with_prepick["upper_bound_min"] < baseline["upper_bound_min"]
    assert with_prepick["prepick_latency_saved_min"] == 1.8


def test_traffic_multiplier_expands_uncertainty():
    """Verify higher traffic friction widens the conformal prediction interval."""
    engine = ConformalSlaPredictor()
    normal_traffic = engine.predict_interval(predicted_mean_min=8.0, alpha=0.05, traffic_multiplier=1.0)
    heavy_traffic = engine.predict_interval(predicted_mean_min=8.0, alpha=0.05, traffic_multiplier=1.5)

    assert heavy_traffic["conformal_half_width_min"] > normal_traffic["conformal_half_width_min"]
    assert heavy_traffic["interval_width_min"] > normal_traffic["interval_width_min"]


def test_finite_sample_coverage_guarantee():
    """Empirical calibration validation: coverage on calibrated noise >= 1 - alpha."""
    engine = ConformalSlaPredictor(calibration_size=1000, random_seed=123)
    alpha = 0.05
    quantile = engine.compute_conformal_quantile(alpha=alpha)

    # Proportion of calibration residuals <= quantile should be >= (1 - alpha)
    covered = sum(1 for r in engine.calibration_residuals if r <= quantile)
    empirical_coverage = covered / len(engine.calibration_residuals)

    assert empirical_coverage >= (1.0 - alpha) - 0.01
