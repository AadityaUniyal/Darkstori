"""Split-conformal interval helper requiring caller-supplied measured residuals.

This helper does not train a latency model or collect calibration data. The SLA
API remains unavailable until a representative holdout calibration set and a
compatible point predictor are connected.
"""

import math
from typing import Dict, List, Optional


class ConformalSlaPredictor:
    """Calculate a residual quantile from explicitly supplied calibration data."""

    def __init__(self, calibration_residuals: Optional[List[float]] = None):
        values = calibration_residuals or []
        if any(not math.isfinite(float(value)) or float(value) < 0 for value in values):
            raise ValueError("Calibration residuals must be finite non-negative numbers")
        self.calibration_residuals = sorted(float(value) for value in values)
        self.calibration_size = len(self.calibration_residuals)

    def compute_conformal_quantile(self, alpha: float = 0.05) -> float:
        if not 0 < alpha < 1:
            raise ValueError("alpha must be between 0 and 1")
        n = len(self.calibration_residuals)
        if not n:
            raise RuntimeError("No measured calibration residuals are available")
        rank = min(n, math.ceil((n + 1) * (1 - alpha)))
        return self.calibration_residuals[rank - 1]

    def predict_interval(
        self,
        predicted_mean_min: float,
        alpha: float = 0.05,
        traffic_multiplier: float = 1.0,
        weather_multiplier: float = 1.0,
        anticipatory_prepick_enabled: bool = False,
    ) -> Dict:
        """Return a scenario interval; input modifiers are not calibrated features."""
        quantile = self.compute_conformal_quantile(alpha)
        friction = (traffic_multiplier + weather_multiplier) / 2.0
        point = round(predicted_mean_min * (0.85 + 0.15 * friction), 2)
        prepick_savings = 1.8 if anticipatory_prepick_enabled else 0.0
        point = max(2.5, round(point - prepick_savings, 2))
        half_width = round(quantile * friction, 2)
        lower = max(1.5, round(point - half_width, 2))
        upper = round(point + half_width, 2)
        ceiling = 10.0
        if upper <= ceiling:
            risk, promise = "WITHIN_SCENARIO_BOUND", 10
        elif lower <= ceiling < upper <= 12.5:
            risk, promise = "SCENARIO_RISK", 12
        else:
            risk, promise = "SCENARIO_EXCEEDS_BOUND", 15
        return {
            "alpha": alpha,
            "nominal_coverage_pct": round((1.0 - alpha) * 100, 1),
            "point_estimate_min": point,
            "conformal_half_width_min": half_width,
            "lower_bound_min": lower,
            "upper_bound_min": upper,
            "interval_width_min": round(upper - lower, 2),
            "sla_ceiling_min": ceiling,
            "sla_risk_state": risk,
            "storefront_promised_eta_min": promise,
            "anticipatory_prepick_active": anticipatory_prepick_enabled,
            "prepick_latency_saved_min": prepick_savings,
            "calibration_samples": self.calibration_size,
            "data_mode": "scenario_only",
            "calibration_note": "No production coverage claim: point prediction and scenario modifiers are not calibrated.",
        }


# No synthetic residuals are loaded at import time.
conformal_sla_engine = ConformalSlaPredictor()
