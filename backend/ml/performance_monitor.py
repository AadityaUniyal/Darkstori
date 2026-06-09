"""Performance Monitoring for ML Models.

This module provides performance monitoring, drift detection,
and alerting for deployed ML models.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy import stats
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ml.alert_manager import get_alert_manager
from database.models.models import MLFeatureDrift, MLPerformanceMetric, MLPrediction

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor model performance and detect drift.

    Tracks predictions, calculates rolling metrics, detects feature drift,
    and triggers alerts for performance degradation.
    """

    def __init__(self, db_session: AsyncSession, enable_alerts: bool = True):
        """Initialize performance monitor.

        Args:
            db_session: Database session for storing monitoring data
            enable_alerts: Enable automatic alerting
        """
        self.db = db_session
        self.enable_alerts = enable_alerts

        # Get alert manager if alerts enabled
        self.alert_manager = get_alert_manager() if enable_alerts else None

        logger.info(f"PerformanceMonitor initialized (alerts: {enable_alerts})")

    async def log_prediction(
        self,
        prediction_id: str,
        model_name: str,
        model_version: str,
        input_data: Dict[str, Any],
        prediction: float,
        lower_bound: Optional[float] = None,
        upper_bound: Optional[float] = None,
        latency_ms: Optional[float] = None,
    ) -> None:
        """Log a prediction for monitoring.

        Args:
            prediction_id: Unique prediction ID
            model_name: Model name
            model_version: Model version
            input_data: Input data dictionary
            prediction: Prediction value
            lower_bound: Lower confidence bound
            upper_bound: Upper confidence bound
            latency_ms: Prediction latency in milliseconds
        """
        try:
            ml_prediction = MLPrediction(
                prediction_id=prediction_id,
                model_name=model_name,
                model_version=model_version,
                input_data=input_data,
                prediction=prediction,
                lower_bound=lower_bound,
                upper_bound=upper_bound,
                latency_ms=latency_ms,
            )

            self.db.add(ml_prediction)
            await self.db.commit()

            logger.debug(f"Logged prediction: {prediction_id}")

        except Exception as e:
            logger.error(f"Failed to log prediction: {e}")
            await self.db.rollback()
            # Don't raise - monitoring should not break prediction service

    async def log_actual(self, prediction_id: str, actual_value: float) -> None:
        """Log actual outcome for a prediction.

        Args:
            prediction_id: Unique prediction ID
            actual_value: Actual observed value
        """
        try:
            # Find the prediction
            result = await self.db.execute(
                select(MLPrediction).where(MLPrediction.prediction_id == prediction_id)
            )
            ml_prediction = result.scalar_one_or_none()

            if ml_prediction:
                # Update with actual value and calculate error
                ml_prediction.actual_value = actual_value
                ml_prediction.prediction_error = abs(
                    actual_value - ml_prediction.prediction
                )
                ml_prediction.updated_at = datetime.now()

                await self.db.commit()

                logger.debug(f"Logged actual for prediction: {prediction_id}")
            else:
                logger.warning(f"Prediction not found: {prediction_id}")

        except Exception as e:
            logger.error(f"Failed to log actual: {e}")
            await self.db.rollback()

    async def calculate_rolling_metrics(
        self, model_name: str, model_version: Optional[str] = None, window_days: int = 7
    ) -> Dict[str, float]:
        """Calculate rolling window performance metrics.

        Args:
            model_name: Model name
            model_version: Model version (all versions if None)
            window_days: Rolling window size in days

        Returns:
            Dictionary with performance metrics
        """
        try:
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=window_days)

            # Build query
            query = select(MLPrediction).where(
                and_(
                    MLPrediction.model_name == model_name,
                    MLPrediction.created_at >= start_date,
                    MLPrediction.created_at <= end_date,
                    MLPrediction.actual_value.isnot(None),
                )
            )

            if model_version:
                query = query.where(MLPrediction.model_version == model_version)

            # Execute query
            result = await self.db.execute(query)
            predictions = result.scalars().all()

            if not predictions:
                logger.warning(
                    f"No predictions found for {model_name} in last {window_days} days"
                )
                return {}

            # Extract values
            y_true = np.array([p.actual_value for p in predictions])
            y_pred = np.array([p.prediction for p in predictions])
            latencies = [p.latency_ms for p in predictions if p.latency_ms is not None]

            # Calculate metrics
            metrics = self._calculate_metrics(y_true, y_pred)

            # Add latency metrics
            if latencies:
                metrics["avg_latency_ms"] = float(np.mean(latencies))
                metrics["p50_latency_ms"] = float(np.percentile(latencies, 50))
                metrics["p95_latency_ms"] = float(np.percentile(latencies, 95))
                metrics["p99_latency_ms"] = float(np.percentile(latencies, 99))

            # Add prediction count
            metrics["prediction_count"] = len(predictions)

            # Store metrics in database
            await self._store_metrics(
                model_name=model_name,
                model_version=model_version or "all",
                window_days=window_days,
                metrics=metrics,
            )

            logger.info(
                f"Calculated rolling metrics for {model_name}: "
                f"R²={metrics.get('r2_score', 0):.3f}, "
                f"RMSE={metrics.get('rmse', 0):.2f}"
            )

            return metrics

        except Exception as e:
            logger.error(f"Failed to calculate rolling metrics: {e}")
            return {}

    def _calculate_metrics(
        self, y_true: np.ndarray, y_pred: np.ndarray
    ) -> Dict[str, float]:
        """Calculate performance metrics.

        Args:
            y_true: True values
            y_pred: Predicted values

        Returns:
            Dictionary with metrics
        """
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

        metrics = {}

        try:
            # MAE
            metrics["mae"] = float(mean_absolute_error(y_true, y_pred))

            # RMSE
            metrics["rmse"] = float(np.sqrt(mean_squared_error(y_true, y_pred)))

            # MSE
            metrics["mse"] = float(mean_squared_error(y_true, y_pred))

            # R² Score
            metrics["r2_score"] = float(r2_score(y_true, y_pred))

            # MAPE
            mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
            metrics["mape"] = float(mape)

        except Exception as e:
            logger.error(f"Failed to calculate metrics: {e}")

        return metrics

    async def _store_metrics(
        self,
        model_name: str,
        model_version: str,
        window_days: int,
        metrics: Dict[str, float],
    ) -> None:
        """Store metrics in database.

        Args:
            model_name: Model name
            model_version: Model version
            window_days: Rolling window size
            metrics: Metrics dictionary
        """
        try:
            metric_date = datetime.now().date()

            # Check if metrics already exist for today
            result = await self.db.execute(
                select(MLPerformanceMetric).where(
                    and_(
                        MLPerformanceMetric.model_name == model_name,
                        MLPerformanceMetric.model_version == model_version,
                        MLPerformanceMetric.metric_date == metric_date,
                        MLPerformanceMetric.window_days == window_days,
                    )
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                # Update existing
                existing.r2_score = metrics.get("r2_score")
                existing.rmse = metrics.get("rmse")
                existing.mae = metrics.get("mae")
                existing.mape = metrics.get("mape")
                existing.prediction_count = metrics.get("prediction_count")
                existing.avg_latency_ms = metrics.get("avg_latency_ms")
            else:
                # Create new
                perf_metric = MLPerformanceMetric(
                    model_name=model_name,
                    model_version=model_version,
                    metric_date=metric_date,
                    window_days=window_days,
                    r2_score=metrics.get("r2_score"),
                    rmse=metrics.get("rmse"),
                    mae=metrics.get("mae"),
                    mape=metrics.get("mape"),
                    prediction_count=metrics.get("prediction_count"),
                    avg_latency_ms=metrics.get("avg_latency_ms"),
                )
                self.db.add(perf_metric)

            await self.db.commit()

        except Exception as e:
            logger.error(f"Failed to store metrics: {e}")
            await self.db.rollback()

    async def detect_drift(
        self,
        model_name: str,
        training_data: pd.DataFrame,
        recent_days: int = 7,
        threshold: float = 0.05,
    ) -> Dict[str, Any]:
        """Detect feature drift using Kolmogorov-Smirnov test.

        Args:
            model_name: Model name
            training_data: Training data for comparison
            recent_days: Number of recent days to analyze
            threshold: P-value threshold for drift detection

        Returns:
            Dictionary with drift detection results
        """
        try:
            # Get recent predictions
            end_date = datetime.now()
            start_date = end_date - timedelta(days=recent_days)

            result = await self.db.execute(
                select(MLPrediction).where(
                    and_(
                        MLPrediction.model_name == model_name,
                        MLPrediction.created_at >= start_date,
                        MLPrediction.created_at <= end_date,
                    )
                )
            )
            predictions = result.scalars().all()

            if not predictions:
                logger.warning(f"No recent predictions found for {model_name}")
                return {"error": "No recent predictions"}

            # Extract input data
            recent_data = pd.DataFrame([p.input_data for p in predictions])

            # Detect drift for each numeric feature
            drift_results = []
            features_checked = 0
            drift_detected_count = 0

            for column in training_data.select_dtypes(include=[np.number]).columns:
                if column not in recent_data.columns:
                    continue

                features_checked += 1

                # Get distributions
                training_dist = training_data[column].dropna()
                recent_dist = recent_data[column].dropna()

                if len(training_dist) == 0 or len(recent_dist) == 0:
                    continue

                # Perform KS test
                ks_statistic, p_value = stats.ks_2samp(training_dist, recent_dist)

                # Check if drift detected
                drift_detected = p_value < threshold
                if drift_detected:
                    drift_detected_count += 1

                # Calculate statistics
                training_mean = float(training_dist.mean())
                training_std = float(training_dist.std())
                current_mean = float(recent_dist.mean())
                current_std = float(recent_dist.std())

                # Store drift result
                await self._store_drift_result(
                    model_name=model_name,
                    feature_name=column,
                    ks_statistic=float(ks_statistic),
                    p_value=float(p_value),
                    drift_detected=drift_detected,
                    training_mean=training_mean,
                    training_std=training_std,
                    current_mean=current_mean,
                    current_std=current_std,
                )

                drift_results.append(
                    {
                        "feature_name": column,
                        "ks_statistic": float(ks_statistic),
                        "p_value": float(p_value),
                        "drift_detected": drift_detected,
                        "training_mean": training_mean,
                        "current_mean": current_mean,
                        "mean_change_pct": (
                            ((current_mean - training_mean) / training_mean * 100)
                            if training_mean != 0
                            else 0
                        ),
                    }
                )

            logger.info(
                f"Drift detection for {model_name}: "
                f"{drift_detected_count}/{features_checked} features with drift"
            )

            # Trigger alert if drift detected
            if drift_detected_count > 0 and self.alert_manager:
                features_with_drift = [
                    r["feature_name"] for r in drift_results if r["drift_detected"]
                ]

                await self.alert_manager.send_drift_detection_alert(
                    model_name=model_name,
                    features_with_drift=features_with_drift,
                    total_features=features_checked,
                    drift_details=drift_results,
                )

            return {
                "model_name": model_name,
                "check_date": datetime.now().date().isoformat(),
                "features_checked": features_checked,
                "drift_detected_count": drift_detected_count,
                "drift_details": drift_results,
            }

        except Exception as e:
            logger.error(f"Failed to detect drift: {e}")
            return {"error": str(e)}

    async def _store_drift_result(
        self,
        model_name: str,
        feature_name: str,
        ks_statistic: float,
        p_value: float,
        drift_detected: bool,
        training_mean: float,
        training_std: float,
        current_mean: float,
        current_std: float,
    ) -> None:
        """Store drift detection result in database.

        Args:
            model_name: Model name
            feature_name: Feature name
            ks_statistic: KS test statistic
            p_value: KS test p-value
            drift_detected: Whether drift was detected
            training_mean: Training data mean
            training_std: Training data std
            current_mean: Current data mean
            current_std: Current data std
        """
        try:
            check_date = datetime.now().date()

            # Check if drift result already exists for today
            result = await self.db.execute(
                select(MLFeatureDrift).where(
                    and_(
                        MLFeatureDrift.model_name == model_name,
                        MLFeatureDrift.feature_name == feature_name,
                        MLFeatureDrift.check_date == check_date,
                    )
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                # Update existing
                existing.ks_statistic = ks_statistic
                existing.p_value = p_value
                existing.drift_detected = drift_detected
                existing.training_mean = training_mean
                existing.training_std = training_std
                existing.current_mean = current_mean
                existing.current_std = current_std
            else:
                # Create new
                drift_record = MLFeatureDrift(
                    model_name=model_name,
                    feature_name=feature_name,
                    check_date=check_date,
                    ks_statistic=ks_statistic,
                    p_value=p_value,
                    drift_detected=drift_detected,
                    training_mean=training_mean,
                    training_std=training_std,
                    current_mean=current_mean,
                    current_std=current_std,
                )
                self.db.add(drift_record)

            await self.db.commit()

        except Exception as e:
            logger.error(f"Failed to store drift result: {e}")
            await self.db.rollback()

    async def check_performance_degradation(
        self,
        model_name: str,
        model_version: Optional[str] = None,
        warning_threshold: float = 0.80,
        alert_threshold: float = 0.75,
        window_days: int = 7,
    ) -> Dict[str, Any]:
        """Check for performance degradation.

        Args:
            model_name: Model name
            model_version: Model version
            warning_threshold: R² threshold for warning
            alert_threshold: R² threshold for alert
            window_days: Rolling window size

        Returns:
            Dictionary with degradation check results
        """
        try:
            # Calculate current metrics
            metrics = await self.calculate_rolling_metrics(
                model_name=model_name,
                model_version=model_version,
                window_days=window_days,
            )

            if not metrics:
                return {"error": "No metrics available"}

            r2_score = metrics.get("r2_score", 0)

            # Determine status
            if r2_score < alert_threshold:
                status = "alert"
                message = f"ALERT: R² score ({r2_score:.3f}) below alert threshold ({alert_threshold})"
                severity = "high"
            elif r2_score < warning_threshold:
                status = "warning"
                message = f"WARNING: R² score ({r2_score:.3f}) below warning threshold ({warning_threshold})"
                severity = "medium"
            else:
                status = "healthy"
                message = f"Model performance is healthy (R²={r2_score:.3f})"
                severity = "low"

            logger.info(f"Performance check for {model_name}: {status}")

            # Trigger alert if degradation detected
            if status in ["warning", "alert"] and self.alert_manager:
                await self.alert_manager.send_performance_degradation_alert(
                    model_name=model_name,
                    model_version=model_version or "all",
                    current_r2=r2_score,
                    threshold=(
                        alert_threshold if status == "alert" else warning_threshold
                    ),
                    metrics=metrics,
                )

            return {
                "model_name": model_name,
                "model_version": model_version or "all",
                "status": status,
                "severity": severity,
                "message": message,
                "metrics": metrics,
                "thresholds": {"warning": warning_threshold, "alert": alert_threshold},
                "checked_at": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to check performance degradation: {e}")
            return {"error": str(e)}

    async def get_performance_history(
        self,
        model_name: str,
        model_version: Optional[str] = None,
        days: int = 30,
        window_days: int = 7,
    ) -> List[Dict[str, Any]]:
        """Get performance metrics history.

        Args:
            model_name: Model name
            model_version: Model version
            days: Number of days of history
            window_days: Rolling window size

        Returns:
            List of performance metrics over time
        """
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)

            query = (
                select(MLPerformanceMetric)
                .where(
                    and_(
                        MLPerformanceMetric.model_name == model_name,
                        MLPerformanceMetric.window_days == window_days,
                        MLPerformanceMetric.metric_date >= start_date,
                        MLPerformanceMetric.metric_date <= end_date,
                    )
                )
                .order_by(MLPerformanceMetric.metric_date)
            )

            if model_version:
                query = query.where(MLPerformanceMetric.model_version == model_version)

            result = await self.db.execute(query)
            metrics = result.scalars().all()

            history = []
            for metric in metrics:
                history.append(
                    {
                        "date": metric.metric_date.isoformat(),
                        "r2_score": metric.r2_score,
                        "rmse": metric.rmse,
                        "mae": metric.mae,
                        "mape": metric.mape,
                        "prediction_count": metric.prediction_count,
                        "avg_latency_ms": metric.avg_latency_ms,
                    }
                )

            return history

        except Exception as e:
            logger.error(f"Failed to get performance history: {e}")
            return []

    async def get_drift_history(
        self, model_name: str, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get drift detection history.

        Args:
            model_name: Model name
            days: Number of days of history

        Returns:
            List of drift detection results over time
        """
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)

            result = await self.db.execute(
                select(MLFeatureDrift)
                .where(
                    and_(
                        MLFeatureDrift.model_name == model_name,
                        MLFeatureDrift.check_date >= start_date,
                        MLFeatureDrift.check_date <= end_date,
                        MLFeatureDrift.drift_detected == True,
                    )
                )
                .order_by(MLFeatureDrift.check_date.desc())
            )
            drifts = result.scalars().all()

            history = []
            for drift in drifts:
                history.append(
                    {
                        "date": drift.check_date.isoformat(),
                        "feature_name": drift.feature_name,
                        "ks_statistic": drift.ks_statistic,
                        "p_value": drift.p_value,
                        "training_mean": drift.training_mean,
                        "current_mean": drift.current_mean,
                        "mean_change_pct": (
                            (
                                (drift.current_mean - drift.training_mean)
                                / drift.training_mean
                                * 100
                            )
                            if drift.training_mean != 0
                            else 0
                        ),
                    }
                )

            return history

        except Exception as e:
            logger.error(f"Failed to get drift history: {e}")
            return []
