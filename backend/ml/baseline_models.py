"""
Baseline Model Benchmarking

Provides simple baseline models for comparison to evaluate
the value added by more complex ML models.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger(__name__)


class BaselineModels:
    """Collection of simple baseline models for benchmarking."""

    def __init__(self):
        """Initialize baseline models."""
        self.baselines = {}
        self.baseline_results = {}
        logger.info("BaselineModels initialized")

    def train_all_baselines(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> Dict[str, Dict[str, float]]:
        """
        Train all baseline models.

        Args:
            X_train: Training features
            y_train: Training target
            X_test: Test features
            y_test: Test target

        Returns:
            Dictionary with baseline results
        """
        try:
            logger.info("Training baseline models...")

            # Mean predictor
            mean_results = self._train_mean_predictor(X_train, y_train, X_test, y_test)
            self.baseline_results["mean_predictor"] = mean_results

            # Median predictor
            median_results = self._train_median_predictor(
                X_train, y_train, X_test, y_test
            )
            self.baseline_results["median_predictor"] = median_results

            # Simple linear regression
            linear_results = self._train_linear_regression(
                X_train, y_train, X_test, y_test
            )
            self.baseline_results["linear_regression"] = linear_results

            # Last value predictor (for time series)
            if self._is_time_series(X_train):
                last_value_results = self._train_last_value_predictor(
                    X_train, y_train, X_test, y_test
                )
                self.baseline_results["last_value"] = last_value_results

            logger.info(f"Trained {len(self.baseline_results)} baseline models")

            return self.baseline_results

        except Exception as e:
            logger.error(f"Error training baseline models: {e}")
            raise

    def _train_mean_predictor(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> Dict[str, float]:
        """Train mean predictor baseline."""
        try:
            model = DummyRegressor(strategy="mean")
            model.fit(X_train, y_train)

            predictions = model.predict(X_test)
            metrics = self._calculate_metrics(y_test, predictions)

            self.baselines["mean_predictor"] = model

            logger.info(
                f"Mean predictor - R²: {metrics['r2_score']:.4f}, RMSE: {metrics['rmse']:.2f}"
            )

            return metrics

        except Exception as e:
            logger.error(f"Error training mean predictor: {e}")
            return {}

    def _train_median_predictor(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> Dict[str, float]:
        """Train median predictor baseline."""
        try:
            model = DummyRegressor(strategy="median")
            model.fit(X_train, y_train)

            predictions = model.predict(X_test)
            metrics = self._calculate_metrics(y_test, predictions)

            self.baselines["median_predictor"] = model

            logger.info(
                f"Median predictor - R²: {metrics['r2_score']:.4f}, RMSE: {metrics['rmse']:.2f}"
            )

            return metrics

        except Exception as e:
            logger.error(f"Error training median predictor: {e}")
            return {}

    def _train_linear_regression(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> Dict[str, float]:
        """Train simple linear regression baseline."""
        try:
            model = LinearRegression()
            model.fit(X_train, y_train)

            predictions = model.predict(X_test)
            metrics = self._calculate_metrics(y_test, predictions)

            self.baselines["linear_regression"] = model

            logger.info(
                f"Linear regression - R²: {metrics['r2_score']:.4f}, RMSE: {metrics['rmse']:.2f}"
            )

            return metrics

        except Exception as e:
            logger.error(f"Error training linear regression: {e}")
            return {}

    def _train_last_value_predictor(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> Dict[str, float]:
        """Train last value predictor for time series."""
        try:
            # Use last training value as prediction
            last_value = y_train.iloc[-1]
            predictions = np.full(len(y_test), last_value)

            metrics = self._calculate_metrics(y_test, predictions)

            logger.info(
                f"Last value predictor - R²: {metrics['r2_score']:.4f}, RMSE: {metrics['rmse']:.2f}"
            )

            return metrics

        except Exception as e:
            logger.error(f"Error training last value predictor: {e}")
            return {}

    def _calculate_metrics(
        self, y_true: pd.Series, y_pred: np.ndarray
    ) -> Dict[str, float]:
        """Calculate evaluation metrics."""
        try:
            mae = mean_absolute_error(y_true, y_pred)
            mse = mean_squared_error(y_true, y_pred)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_true, y_pred)

            # Calculate MAPE
            mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100

            return {
                "mae": float(mae),
                "mse": float(mse),
                "rmse": float(rmse),
                "r2_score": float(r2),
                "mape": float(mape),
            }

        except Exception as e:
            logger.error(f"Error calculating metrics: {e}")
            return {}

    def _is_time_series(self, X: pd.DataFrame) -> bool:
        """Check if data is time series."""
        # Simple heuristic: check for date/time columns
        date_cols = X.select_dtypes(include=["datetime64"]).columns
        return len(date_cols) > 0 or any("date" in col.lower() for col in X.columns)

    def compare_with_model(
        self, model_name: str, model_metrics: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Compare model performance against baselines.

        Args:
            model_name: Name of the model
            model_metrics: Metrics from the model

        Returns:
            Dictionary with comparison results
        """
        try:
            if not self.baseline_results:
                logger.warning("No baseline results available for comparison")
                return {}

            comparison = {
                "model_name": model_name,
                "model_metrics": model_metrics,
                "baseline_comparisons": {},
                "improvements": {},
                "best_baseline": None,
                "beats_all_baselines": False,
            }

            # Find best baseline
            best_baseline_r2 = max(
                results.get("r2_score", -np.inf)
                for results in self.baseline_results.values()
            )

            for baseline_name, baseline_metrics in self.baseline_results.items():
                if baseline_metrics.get("r2_score", -np.inf) == best_baseline_r2:
                    comparison["best_baseline"] = baseline_name
                    break

            # Compare against each baseline
            model_r2 = model_metrics.get("r2_score", 0)

            for baseline_name, baseline_metrics in self.baseline_results.items():
                baseline_r2 = baseline_metrics.get("r2_score", 0)

                improvement = model_r2 - baseline_r2
                improvement_pct = (
                    (improvement / abs(baseline_r2)) * 100 if baseline_r2 != 0 else 0
                )

                comparison["baseline_comparisons"][baseline_name] = {
                    "baseline_r2": baseline_r2,
                    "model_r2": model_r2,
                    "improvement": improvement,
                    "improvement_pct": improvement_pct,
                    "beats_baseline": model_r2 > baseline_r2,
                }

                comparison["improvements"][baseline_name] = improvement_pct

            # Check if beats all baselines
            comparison["beats_all_baselines"] = all(
                comp["beats_baseline"]
                for comp in comparison["baseline_comparisons"].values()
            )

            logger.info(
                f"Model {model_name} comparison: "
                f"{'Beats' if comparison['beats_all_baselines'] else 'Does not beat'} all baselines"
            )

            return comparison

        except Exception as e:
            logger.error(f"Error comparing with baselines: {e}")
            return {}

    def generate_comparison_table(
        self,
        model_name: str,
        model_metrics: Dict[str, float],
        output_path: Optional[str] = None,
    ) -> pd.DataFrame:
        """
        Generate comparison table.

        Args:
            model_name: Name of the model
            model_metrics: Metrics from the model
            output_path: Path to save table (optional)

        Returns:
            DataFrame with comparison table
        """
        try:
            # Prepare data for table
            rows = []

            # Add baselines
            for baseline_name, metrics in self.baseline_results.items():
                rows.append(
                    {
                        "Model": baseline_name,
                        "Type": "Baseline",
                        "R² Score": metrics.get("r2_score", 0),
                        "RMSE": metrics.get("rmse", 0),
                        "MAE": metrics.get("mae", 0),
                        "MAPE": metrics.get("mape", 0),
                    }
                )

            # Add actual model
            rows.append(
                {
                    "Model": model_name,
                    "Type": "ML Model",
                    "R² Score": model_metrics.get("r2_score", 0),
                    "RMSE": model_metrics.get("rmse", 0),
                    "MAE": model_metrics.get("mae", 0),
                    "MAPE": model_metrics.get("mape", 0),
                }
            )

            # Create DataFrame
            df = pd.DataFrame(rows)
            df = df.sort_values("R² Score", ascending=False)

            # Save if path provided
            if output_path:
                df.to_csv(output_path, index=False)
                logger.info(f"Comparison table saved to {output_path}")

            return df

        except Exception as e:
            logger.error(f"Error generating comparison table: {e}")
            return pd.DataFrame()

    def generate_comparison_chart(
        self,
        model_name: str,
        model_metrics: Dict[str, float],
        output_path: Optional[str] = None,
    ) -> str:
        """
        Generate comparison chart.

        Args:
            model_name: Name of the model
            model_metrics: Metrics from the model
            output_path: Path to save chart

        Returns:
            Path to saved chart
        """
        try:
            # Prepare data
            models = list(self.baseline_results.keys()) + [model_name]
            r2_scores = [
                metrics.get("r2_score", 0) for metrics in self.baseline_results.values()
            ] + [model_metrics.get("r2_score", 0)]

            rmse_scores = [
                metrics.get("rmse", 0) for metrics in self.baseline_results.values()
            ] + [model_metrics.get("rmse", 0)]

            # Create figure with subplots
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

            # R² Score comparison
            colors = ["lightblue"] * len(self.baseline_results) + ["darkblue"]
            ax1.barh(models, r2_scores, color=colors)
            ax1.set_xlabel("R² Score")
            ax1.set_title("R² Score Comparison")
            ax1.axvline(x=0, color="black", linestyle="-", linewidth=0.5)

            # RMSE comparison
            ax2.barh(models, rmse_scores, color=colors)
            ax2.set_xlabel("RMSE (lower is better)")
            ax2.set_title("RMSE Comparison")

            plt.tight_layout()

            # Save chart
            if output_path is None:
                output_path = "baseline_comparison.png"

            plt.savefig(output_path, dpi=300, bbox_inches="tight")
            plt.close()

            logger.info(f"Comparison chart saved to {output_path}")

            return output_path

        except Exception as e:
            logger.error(f"Error generating comparison chart: {e}")
            return ""

    def generate_improvement_chart(
        self,
        model_name: str,
        model_metrics: Dict[str, float],
        output_path: Optional[str] = None,
    ) -> str:
        """
        Generate improvement percentage chart.

        Args:
            model_name: Name of the model
            model_metrics: Metrics from the model
            output_path: Path to save chart

        Returns:
            Path to saved chart
        """
        try:
            comparison = self.compare_with_model(model_name, model_metrics)

            if not comparison:
                return ""

            # Extract improvement percentages
            baselines = list(comparison["improvements"].keys())
            improvements = list(comparison["improvements"].values())

            # Create chart
            plt.figure(figsize=(10, 6))
            colors = ["green" if imp > 0 else "red" for imp in improvements]
            plt.barh(baselines, improvements, color=colors)
            plt.xlabel("Improvement over Baseline (%)")
            plt.title(f"{model_name} - Improvement over Baselines")
            plt.axvline(x=0, color="black", linestyle="-", linewidth=0.5)

            # Add value labels
            for i, v in enumerate(improvements):
                plt.text(v, i, f" {v:.1f}%", va="center")

            plt.tight_layout()

            # Save chart
            if output_path is None:
                output_path = "improvement_chart.png"

            plt.savefig(output_path, dpi=300, bbox_inches="tight")
            plt.close()

            logger.info(f"Improvement chart saved to {output_path}")

            return output_path

        except Exception as e:
            logger.error(f"Error generating improvement chart: {e}")
            return ""


def log_baseline_comparisons_to_mlflow(
    baseline_models: BaselineModels,
    model_name: str,
    model_metrics: Dict[str, float],
    mlflow_client: Any,
    run_id: str,
    artifact_path: str = "baseline_comparison",
) -> None:
    """
    Log baseline comparisons to MLflow.

    Args:
        baseline_models: BaselineModels instance
        model_name: Name of the model
        model_metrics: Metrics from the model
        mlflow_client: MLflow client
        run_id: MLflow run ID
        artifact_path: Path for artifacts
    """
    try:
        # Generate comparison
        comparison = baseline_models.compare_with_model(model_name, model_metrics)

        # Log baseline metrics
        for baseline_name, baseline_metrics in baseline_models.baseline_results.items():
            mlflow_client.log_metric(
                run_id,
                f"baseline_{baseline_name}_r2",
                baseline_metrics.get("r2_score", 0),
            )
            mlflow_client.log_metric(
                run_id,
                f"baseline_{baseline_name}_rmse",
                baseline_metrics.get("rmse", 0),
            )

        # Log improvements
        for baseline_name, improvement_pct in comparison.get(
            "improvements", {}
        ).items():
            mlflow_client.log_metric(
                run_id, f"improvement_over_{baseline_name}_pct", improvement_pct
            )

        # Log comparison artifacts
        table_path = f"{artifact_path}/comparison_table.csv"
        baseline_models.generate_comparison_table(model_name, model_metrics, table_path)
        mlflow_client.log_artifact(run_id, table_path)

        chart_path = f"{artifact_path}/comparison_chart.png"
        baseline_models.generate_comparison_chart(model_name, model_metrics, chart_path)
        mlflow_client.log_artifact(run_id, chart_path)

        improvement_path = f"{artifact_path}/improvement_chart.png"
        baseline_models.generate_improvement_chart(
            model_name, model_metrics, improvement_path
        )
        mlflow_client.log_artifact(run_id, improvement_path)

        # Log tags
        mlflow_client.set_tag(
            run_id,
            "beats_all_baselines",
            str(comparison.get("beats_all_baselines", False)),
        )
        mlflow_client.set_tag(
            run_id, "best_baseline", comparison.get("best_baseline", "unknown")
        )

        logger.info(f"Logged baseline comparisons to MLflow for run {run_id}")

    except Exception as e:
        logger.error(f"Error logging baseline comparisons to MLflow: {e}")
