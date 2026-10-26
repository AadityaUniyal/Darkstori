"""Tests for conformal quantiles using caller-supplied measured residuals."""

import pytest

from backend.ml.conformal_prediction import ConformalSlaPredictor


def test_conformal_quantile_monotonicity_with_measured_residuals():
    engine = ConformalSlaPredictor(calibration_residuals=list(range(1, 1001)))
    q_90 = engine.compute_conformal_quantile(alpha=0.10)
    q_95 = engine.compute_conformal_quantile(alpha=0.05)
    q_99 = engine.compute_conformal_quantile(alpha=0.01)

    assert q_90 <= q_95 <= q_99
    assert q_95 > 0.0


def test_predictor_refuses_to_claim_interval_without_calibration():
    engine = ConformalSlaPredictor()
    with pytest.raises(RuntimeError, match="No measured calibration residuals"):
        engine.predict_interval(predicted_mean_min=8.0, alpha=0.05)


def test_conformal_interval_validity_from_supplied_calibration():
    engine = ConformalSlaPredictor(calibration_residuals=[0.5, 0.8, 1.2, 1.5, 2.0])
    result = engine.predict_interval(predicted_mean_min=8.0, alpha=0.05)

    assert result["lower_bound_min"] <= result["point_estimate_min"] <= result["upper_bound_min"]
    assert result["lower_bound_min"] >= 1.5
    assert result["nominal_coverage_pct"] == 95.0
    assert result["calibration_samples"] == 5
    assert result["data_mode"] == "scenario_only"


def test_anticipatory_prepick_applies_only_documented_scenario_adjustment():
    engine = ConformalSlaPredictor(calibration_residuals=[0.5, 0.8, 1.2, 1.5, 2.0])
    baseline = engine.predict_interval(predicted_mean_min=9.5, alpha=0.05)
    with_prepick = engine.predict_interval(
        predicted_mean_min=9.5, alpha=0.05, anticipatory_prepick_enabled=True
    )

    assert with_prepick["point_estimate_min"] < baseline["point_estimate_min"]
    assert with_prepick["upper_bound_min"] < baseline["upper_bound_min"]
    assert with_prepick["prepick_latency_saved_min"] == 1.8
    assert with_prepick["data_mode"] == "scenario_only"


def test_traffic_multiplier_expands_scenario_interval():
    engine = ConformalSlaPredictor(calibration_residuals=[0.5, 0.8, 1.2, 1.5, 2.0])
    normal_traffic = engine.predict_interval(predicted_mean_min=8.0, traffic_multiplier=1.0)
    heavy_traffic = engine.predict_interval(predicted_mean_min=8.0, traffic_multiplier=1.5)

    assert heavy_traffic["conformal_half_width_min"] > normal_traffic["conformal_half_width_min"]
    assert heavy_traffic["interval_width_min"] > normal_traffic["interval_width_min"]


def test_split_conformal_rank_gives_expected_empirical_calibration_fraction():
    residuals = list(range(1, 1001))
    engine = ConformalSlaPredictor(calibration_residuals=residuals)
    alpha = 0.05
    quantile = engine.compute_conformal_quantile(alpha=alpha)
    calibration_fraction = sum(value <= quantile for value in residuals) / len(residuals)

    # This checks the finite-sample rank calculation on the calibration set.
    # It is not a production coverage evaluation on a held-out order stream.
    assert quantile == 951
    assert calibration_fraction >= 1.0 - alpha
