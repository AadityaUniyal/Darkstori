"""Evaluation Engine for ML Models.

This module provides comprehensive model evaluation functionality including
metrics calculation, cross-validation, visualization, and validation.
"""

import logging
from typing import Any, Dict, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import (
    mean_absolute_error,
    mean_absolute_percentage_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import cross_val_score

from backend.ml.experiment_tracker import ExperimentTracker

logger = logging.getLogger(__name__)


class EvaluationEngine:
    """Engine for comprehensive model evaluation.

    Calculates metrics, performs cross-validation, generates plots,
    and validates models against thresholds.
    """

    def __init__(self, tracker: Optional[ExperimentTracker] = None):
        """Initialize evaluation engine.

        Args:
            tracker: ExperimentTracker for logging results (optional)
        """
        self.tracker = tracker
        logger.info("EvaluationEngine initialized")

    def evaluate_regression(
        self, y_true: np.ndarray, y_pred: np.ndarray, dataset_name: str = "test"
    ) -> Dict[str, float]:
        """Calculate regression metrics.

        Args:
            y_true: True values
            y_pred: Predicted values
            dataset_name: Name of the dataset (for logging)

        Returns:
            Dictionary of metrics
        """
        try:
            metrics = {
                f"{dataset_name}_mae": mean_absolute_error(y_true, y_pred),
                f"{dataset_name}_rmse": np.sqrt(mean_squared_error(y_true, y_pred)),
                f"{dataset_name}_mse": mean_squared_error(y_true, y_pred),
                f"{dataset_name}_r2": r2_score(y_true, y_pred),
                f"{dataset_name}_mape": mean_absolute_percentage_error(y_true, y_pred)
                * 100,
            }

            logger.info(f"Calculated {len(metrics)} metrics for {dataset_name} set")

            # Log to MLflow if tracker available
            if self.tracker:
                self.tracker.log_metrics(metrics)

            return metrics

        except Exception as e:
            logger.error(f"Failed to evaluate regression: {e}")
            raise

    def cross_validate(
        self, model: Any, X: np.ndarray, y: np.ndarray, cv: int = 5, scoring: str = "r2"
    ) -> Dict[str, float]:
        """Perform k-fold cross-validation.

        Args:
            model: Model to evaluate
            X: Feature matrix
            y: Target vector
            cv: Number of folds
            scoring: Scoring metric

        Returns:
            Dictionary with mean and std of scores
        """
        try:
            scores = cross_val_score(model, X, y, cv=cv, scoring=scoring)

            cv_metrics = {
                f"cv_{scoring}_mean": scores.mean(),
                f"cv_{scoring}_std": scores.std(),
                f"cv_{scoring}_min": scores.min(),
                f"cv_{scoring}_max": scores.max(),
            }

            logger.info(
                f"Cross-validation ({cv} folds): {scoring} = {scores.mean():.4f} ± {scores.std():.4f}"
            )

            # Log to MLflow if tracker available
            if self.tracker:
                self.tracker.log_metrics(cv_metrics)

            return cv_metrics

        except Exception as e:
            logger.error(f"Failed to perform cross-validation: {e}")
            raise

    def evaluate_by_tier(
        self, y_true: pd.Series, y_pred: np.ndarray, tiers: pd.Series
    ) -> Dict[str, Dict[str, float]]:
        """Calculate metrics per city tier.

        Args:
            y_true: True values
            y_pred: Predicted values
            tiers: City tier labels

        Returns:
            Dictionary of metrics by tier
        """
        try:
            tier_metrics = {}

            for tier in tiers.unique():
                mask = tiers == tier
                tier_y_true = y_true[mask]
                tier_y_pred = y_pred[mask]

                if len(tier_y_true) > 0:
                    tier_metrics[tier] = {
                        "mae": mean_absolute_error(tier_y_true, tier_y_pred),
                        "rmse": np.sqrt(mean_squared_error(tier_y_true, tier_y_pred)),
                        "r2": r2_score(tier_y_true, tier_y_pred),
                        "mape": mean_absolute_percentage_error(tier_y_true, tier_y_pred)
                        * 100,
                        "count": len(tier_y_true),
                    }

            logger.info(f"Calculated metrics for {len(tier_metrics)} tiers")

            # Log to MLflow if tracker available
            if self.tracker:
                self.tracker.log_dict(tier_metrics, "tier_metrics.json")

            return tier_metrics

        except Exception as e:
            logger.error(f"Failed to evaluate by tier: {e}")
            raise

    def calculate_residuals(
        self, y_true: np.ndarray, y_pred: np.ndarray
    ) -> Dict[str, float]:
        """Calculate residual statistics.

        Args:
            y_true: True values
            y_pred: Predicted values

        Returns:
            Dictionary of residual statistics
        """
        try:
            residuals = y_true - y_pred

            residual_stats = {
                "residual_mean": residuals.mean(),
                "residual_median": np.median(residuals),
                "residual_std": residuals.std(),
                "residual_min": residuals.min(),
                "residual_max": residuals.max(),
                "residual_q25": np.percentile(residuals, 25),
                "residual_q75": np.percentile(residuals, 75),
            }

            logger.info("Calculated residual statistics")

            # Log to MLflow if tracker available
            if self.tracker:
                self.tracker.log_metrics(residual_stats)

            return residual_stats

        except Exception as e:
            logger.error(f"Failed to calculate residuals: {e}")
            raise

    def generate_plots(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        feature_importance: Optional[pd.DataFrame] = None,
    ) -> None:
        """Generate and log evaluation plots.

        Args:
            y_true: True values
            y_pred: Predicted values
            feature_importance: DataFrame with feature importance (optional)
        """
        try:
            # 1. Residual plot
            self._plot_residuals(y_true, y_pred)

            # 2. Predicted vs Actual scatter plot
            self._plot_predictions(y_true, y_pred)

            # 3. Feature importance plot (if provided)
            if feature_importance is not None:
                self._plot_feature_importance(feature_importance)

            logger.info("Generated evaluation plots")

        except Exception as e:
            logger.error(f"Failed to generate plots: {e}")
            raise

    def _plot_residuals(self, y_true: np.ndarray, y_pred: np.ndarray) -> None:
        """Generate residual plot."""
        residuals = y_true - y_pred

        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        # Residual scatter plot
        axes[0].scatter(y_pred, residuals, alpha=0.5)
        axes[0].axhline(y=0, color="r", linestyle="--")
        axes[0].set_xlabel("Predicted Values")
        axes[0].set_ylabel("Residuals")
        axes[0].set_title("Residual Plot")
        axes[0].grid(True, alpha=0.3)

        # Residual histogram
        axes[1].hist(residuals, bins=50, edgecolor="black", alpha=0.7)
        axes[1].axvline(x=0, color="r", linestyle="--")
        axes[1].set_xlabel("Residuals")
        axes[1].set_ylabel("Frequency")
        axes[1].set_title("Residual Distribution")
        axes[1].grid(True, alpha=0.3)

        plt.tight_layout()

        if self.tracker:
            self.tracker.log_figure(fig, "residual_plot.png")

        plt.close(fig)

    def _plot_predictions(self, y_true: np.ndarray, y_pred: np.ndarray) -> None:
        """Generate predicted vs actual scatter plot."""
        fig, ax = plt.subplots(figsize=(8, 8))

        ax.scatter(y_true, y_pred, alpha=0.5)

        # Perfect prediction line
        min_val = min(y_true.min(), y_pred.min())
        max_val = max(y_true.max(), y_pred.max())
        ax.plot(
            [min_val, max_val],
            [min_val, max_val],
            "r--",
            lw=2,
            label="Perfect Prediction",
        )

        ax.set_xlabel("Actual Values")
        ax.set_ylabel("Predicted Values")
        ax.set_title("Predicted vs Actual")
        ax.legend()
        ax.grid(True, alpha=0.3)

        # Add R² score to plot
        r2 = r2_score(y_true, y_pred)
        ax.text(
            0.05,
            0.95,
            f"R² = {r2:.4f}",
            transform=ax.transAxes,
            verticalalignment="top",
            bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.5),
        )

        plt.tight_layout()

        if self.tracker:
            self.tracker.log_figure(fig, "predictions_plot.png")

        plt.close(fig)

    def _plot_feature_importance(
        self, feature_importance: pd.DataFrame, top_n: int = 20
    ) -> None:
        """Generate feature importance bar chart."""
        # Sort by importance and take top N
        fi_sorted = feature_importance.sort_values("importance", ascending=False).head(
            top_n
        )

        fig, ax = plt.subplots(figsize=(10, 8))

        ax.barh(range(len(fi_sorted)), fi_sorted["importance"])
        ax.set_yticks(range(len(fi_sorted)))
        ax.set_yticklabels(fi_sorted["feature"])
        ax.set_xlabel("Importance")
        ax.set_title(f"Top {top_n} Feature Importance")
        ax.invert_yaxis()
        ax.grid(True, alpha=0.3, axis="x")

        plt.tight_layout()

        if self.tracker:
            self.tracker.log_figure(fig, "feature_importance.png")

        plt.close(fig)

    def validate_model(
        self,
        model: Any,
        X_test: np.ndarray,
        y_test: np.ndarray,
        thresholds: Dict[str, float],
    ) -> Tuple[bool, Dict[str, Any]]:
        """Validate model meets minimum thresholds.

        Args:
            model: Trained model
            X_test: Test features
            y_test: Test targets
            thresholds: Dictionary of metric thresholds

        Returns:
            Tuple of (is_valid, validation_results)
        """
        try:
            # Make predictions
            y_pred = model.predict(X_test)

            # Calculate metrics
            metrics = self.evaluate_regression(y_test, y_pred, "validation")

            # Check thresholds
            validation_results = {
                "metrics": metrics,
                "thresholds": thresholds,
                "checks": {},
            }

            is_valid = True

            # Check R² threshold
            if "min_r2" in thresholds:
                r2_value = metrics.get("validation_r2", 0)
                passes = r2_value >= thresholds["min_r2"]
                validation_results["checks"]["r2"] = {
                    "value": r2_value,
                    "threshold": thresholds["min_r2"],
                    "passes": passes,
                }
                is_valid = is_valid and passes

            # Check MAPE threshold
            if "max_mape" in thresholds:
                mape_value = metrics.get("validation_mape", float("inf"))
                passes = mape_value <= thresholds["max_mape"]
                validation_results["checks"]["mape"] = {
                    "value": mape_value,
                    "threshold": thresholds["max_mape"],
                    "passes": passes,
                }
                is_valid = is_valid and passes

            # Check latency threshold (if applicable)
            if "max_latency_ms" in thresholds:
                import time

                start = time.time()
                _ = model.predict(X_test[:100])  # Test on 100 samples
                latency_ms = (time.time() - start) * 1000 / 100
                passes = latency_ms <= thresholds["max_latency_ms"]
                validation_results["checks"]["latency"] = {
                    "value": latency_ms,
                    "threshold": thresholds["max_latency_ms"],
                    "passes": passes,
                }
                is_valid = is_valid and passes

            validation_results["is_valid"] = is_valid

            logger.info(f"Model validation: {'PASSED' if is_valid else 'FAILED'}")

            # Log validation results
            if self.tracker:
                self.tracker.log_dict(validation_results, "validation_results.json")
                self.tracker.set_tag(
                    "validation_status", "passed" if is_valid else "failed"
                )

            return is_valid, validation_results

        except Exception as e:
            logger.error(f"Failed to validate model: {e}")
            raise

    def compare_models(
        self, models: Dict[str, Any], X_test: np.ndarray, y_test: np.ndarray
    ) -> pd.DataFrame:
        """Compare multiple models on the same test set.

        Args:
            models: Dictionary of {model_name: model}
            X_test: Test features
            y_test: Test targets

        Returns:
            DataFrame with comparison results
        """
        try:
            results = []

            for name, model in models.items():
                y_pred = model.predict(X_test)

                metrics = {
                    "model": name,
                    "mae": mean_absolute_error(y_test, y_pred),
                    "rmse": np.sqrt(mean_squared_error(y_test, y_pred)),
                    "r2": r2_score(y_test, y_pred),
                    "mape": mean_absolute_percentage_error(y_test, y_pred) * 100,
                }

                results.append(metrics)

            comparison_df = pd.DataFrame(results)
            comparison_df = comparison_df.sort_values("r2", ascending=False)

            logger.info(f"Compared {len(models)} models")

            # Log comparison
            if self.tracker:
                self.tracker.log_dataset(comparison_df, "model_comparison.csv")

            return comparison_df

        except Exception as e:
            logger.error(f"Failed to compare models: {e}")
            raise
