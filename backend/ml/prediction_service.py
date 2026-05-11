"""Prediction Service for ML Models.

This module provides a service layer for making predictions
using MLflow-registered models with input validation and monitoring.
"""

import logging
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.ml.model_loader import ModelLoader
from backend.ml.model_registry import ModelRegistry
from backend.ml.performance_monitor import PerformanceMonitor
from backend.ml.schemas import PredictionRequest, PredictionResponse

logger = logging.getLogger(__name__)


class PredictionService:
    """Service for making predictions with production models."""

    def __init__(
        self, model_loader: ModelLoader, db_session: Optional[AsyncSession] = None
    ):
        """Initialize prediction service.

        Args:
            model_loader: ModelLoader instance for loading models
            db_session: Database session for logging predictions (optional)
        """
        self.model_loader = model_loader
        self.db_session = db_session
        self.default_model_name = "demand_forecasting_model"

        # Initialize performance monitor if db_session provided
        self.monitor = None
        if db_session:
            self.monitor = PerformanceMonitor(db_session)

        logger.info("PredictionService initialized")

    async def predict(
        self, request: PredictionRequest, model_name: Optional[str] = None
    ) -> PredictionResponse:
        """Make a single prediction.

        Args:
            request: Prediction request with input data
            model_name: Model name (uses default if not provided)

        Returns:
            PredictionResponse with prediction and metadata
        """
        start_time = time.time()
        model_name = model_name or self.default_model_name

        try:
            # Load production model
            model, scaler, feature_names = self.model_loader.load_production_model(
                model_name, force_reload=False
            )

            # Prepare input data
            input_df = self._prepare_input(request)

            # Engineer features
            features = self._engineer_features(input_df)

            # Validate features
            self._validate_features(features, feature_names)

            # Scale features if scaler available
            if scaler is not None:
                try:
                    features_scaled = scaler.transform(features)
                except Exception as e:
                    logger.warning(
                        f"Scaler transform failed: {e}, using unscaled features"
                    )
                    features_scaled = features.values
            else:
                features_scaled = features.values

            # Make prediction
            prediction = model.predict(features_scaled)[0]

            # Calculate confidence intervals
            lower_bound, upper_bound = self._calculate_confidence_intervals(
                prediction, features_scaled
            )

            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000

            # Generate prediction ID
            prediction_id = self._generate_prediction_id()

            # Get model version
            model_info = self.model_loader.get_model_info(model_name)
            model_version = (
                model_info.get("version", "unknown") if model_info else "unknown"
            )

            # Log prediction for monitoring
            await self._log_prediction(
                prediction_id=prediction_id,
                model_name=model_name,
                model_version=str(model_version),
                input_data=request.model_dump(),
                prediction=float(prediction),
                lower_bound=float(lower_bound),
                upper_bound=float(upper_bound),
                latency_ms=latency_ms,
            )

            logger.info(
                f"Prediction made: {prediction:.2f} for {request.city} "
                f"(latency: {latency_ms:.2f}ms)"
            )

            return PredictionResponse(
                prediction=float(prediction),
                lower_bound=float(lower_bound),
                upper_bound=float(upper_bound),
                model_name=model_name,
                model_version=str(model_version),
                latency_ms=latency_ms,
                prediction_id=prediction_id,
                timestamp=datetime.now().isoformat(),
            )

        except Exception as e:
            logger.error(f"Prediction failed: {e}", exc_info=True)
            raise

    async def predict_batch(
        self,
        file_path: str,
        output_path: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process batch predictions from CSV file.

        Args:
            file_path: Path to input CSV file
            output_path: Path for output CSV (optional)
            model_name: Model name (uses default if not provided)

        Returns:
            Dictionary with batch job results
        """
        start_time = time.time()
        model_name = model_name or self.default_model_name

        try:
            # Load production model
            model, scaler, feature_names = self.model_loader.load_production_model(
                model_name, force_reload=False
            )

            # Read input CSV
            input_df = pd.read_csv(file_path)

            # Validate required columns
            self._validate_batch_input(input_df)

            # Process in chunks for memory efficiency
            chunk_size = 1000
            predictions = []
            lower_bounds = []
            upper_bounds = []

            for i in range(0, len(input_df), chunk_size):
                chunk = input_df.iloc[i : i + chunk_size]

                # Engineer features
                features = self._engineer_features(chunk)

                # Scale features
                if scaler is not None:
                    features_scaled = scaler.transform(features)
                else:
                    features_scaled = features.values

                # Make predictions
                chunk_predictions = model.predict(features_scaled)
                predictions.extend(chunk_predictions)

                # Calculate confidence intervals
                for pred in chunk_predictions:
                    lower, upper = self._calculate_confidence_intervals(pred, None)
                    lower_bounds.append(lower)
                    upper_bounds.append(upper)

                logger.info(
                    f"Processed {min(i+chunk_size, len(input_df))}/{len(input_df)} rows"
                )

            # Add predictions to dataframe
            input_df["prediction"] = predictions
            input_df["lower_bound"] = lower_bounds
            input_df["upper_bound"] = upper_bounds

            # Save output
            if output_path is None:
                output_path = file_path.replace(".csv", "_predictions.csv")

            input_df.to_csv(output_path, index=False)

            # Calculate processing time
            processing_time = time.time() - start_time

            # Generate job ID
            job_id = f"batch_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"

            logger.info(
                f"Batch prediction completed: {len(input_df)} rows in {processing_time:.2f}s"
            )

            return {
                "job_id": job_id,
                "status": "completed",
                "total_rows": len(input_df),
                "output_path": output_path,
                "processing_time_seconds": processing_time,
                "model_name": model_name,
                "model_version": str(
                    self.model_loader.get_model_info(model_name).get(
                        "version", "unknown"
                    )
                ),
            }

        except Exception as e:
            logger.error(f"Batch prediction failed: {e}", exc_info=True)
            raise

    def _prepare_input(self, request: PredictionRequest) -> pd.DataFrame:
        """Prepare input data from request.

        Args:
            request: Prediction request

        Returns:
            DataFrame with input data
        """
        return pd.DataFrame(
            [
                {
                    "pincode": request.pincode,
                    "order_date": request.order_date,
                    "population": request.population,
                    "coverage_score": request.coverage_score,
                    "city_tier": request.city_tier,
                    "city": request.city,
                    "state": request.state,
                }
            ]
        )

    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for prediction.

        This should match the feature engineering in the training pipeline.

        Args:
            df: Input dataframe

        Returns:
            DataFrame with engineered features
        """
        features = df.copy()

        # Parse order date
        if "order_date" in features.columns:
            features["order_date"] = pd.to_datetime(features["order_date"])
            features["year"] = features["order_date"].dt.year
            features["month"] = features["order_date"].dt.month
            features["day"] = features["order_date"].dt.day
            features["day_of_week"] = features["order_date"].dt.dayofweek
            features["is_weekend"] = features["day_of_week"].isin([5, 6]).astype(int)
            features["quarter"] = features["order_date"].dt.quarter

        # City tier encoding
        if "city_tier" in features.columns:
            tier_mapping = {"Metro": 4, "Tier1": 3, "Tier2": 2, "Tier3": 1}
            features["tier_score"] = features["city_tier"].map(tier_mapping)

        # Population features
        if "population" in features.columns:
            features["log_population"] = np.log1p(features["population"])
            features["population_density"] = features["population"] / 1000

        # Coverage features
        if "coverage_score" in features.columns:
            features["has_coverage"] = (features["coverage_score"] > 0).astype(int)
            features["coverage_squared"] = features["coverage_score"] ** 2

        # Select numeric columns only
        numeric_cols = features.select_dtypes(include=[np.number]).columns
        features = features[numeric_cols]

        # Fill missing values
        features = features.fillna(features.median())

        return features

    def _validate_features(
        self, features: pd.DataFrame, expected_features: Optional[List[str]]
    ) -> None:
        """Validate features against expected schema.

        Args:
            features: Engineered features
            expected_features: Expected feature names
        """
        if expected_features is None:
            logger.warning("No expected features provided, skipping validation")
            return

        # Check for missing features
        missing = set(expected_features) - set(features.columns)
        if missing:
            logger.warning(f"Missing features: {missing}")

        # Check for extra features
        extra = set(features.columns) - set(expected_features)
        if extra:
            logger.warning(f"Extra features: {extra}")

    def _validate_batch_input(self, df: pd.DataFrame) -> None:
        """Validate batch input dataframe.

        Args:
            df: Input dataframe
        """
        required_cols = [
            "pincode",
            "order_date",
            "population",
            "coverage_score",
            "city_tier",
            "city",
            "state",
        ]

        missing_cols = set(required_cols) - set(df.columns)
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")

    def _calculate_confidence_intervals(
        self, prediction: float, features: Optional[np.ndarray]
    ) -> Tuple[float, float]:
        """Calculate confidence intervals for prediction.

        Args:
            prediction: Point prediction
            features: Input features (optional, for advanced CI calculation)

        Returns:
            Tuple of (lower_bound, upper_bound)
        """
        # Simplified confidence interval (10% margin)
        # TODO: Implement proper confidence intervals using model uncertainty
        margin = prediction * 0.1
        lower_bound = max(0, prediction - margin)
        upper_bound = prediction + margin

        return lower_bound, upper_bound

    def _generate_prediction_id(self) -> str:
        """Generate unique prediction ID.

        Returns:
            Unique prediction ID
        """
        return f"pred_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"

    async def _log_prediction(
        self,
        prediction_id: str,
        model_name: str,
        model_version: str,
        input_data: Dict[str, Any],
        prediction: float,
        lower_bound: float,
        upper_bound: float,
        latency_ms: float,
    ) -> None:
        """Log prediction for monitoring.

        Args:
            prediction_id: Unique prediction ID
            model_name: Model name
            model_version: Model version
            input_data: Input data
            prediction: Prediction value
            lower_bound: Lower confidence bound
            upper_bound: Upper confidence bound
            latency_ms: Prediction latency
        """
        if self.monitor:
            try:
                await self.monitor.log_prediction(
                    prediction_id=prediction_id,
                    model_name=model_name,
                    model_version=model_version,
                    input_data=input_data,
                    prediction=prediction,
                    lower_bound=lower_bound,
                    upper_bound=upper_bound,
                    latency_ms=latency_ms,
                )
            except Exception as e:
                logger.error(f"Failed to log prediction: {e}")
                # Don't raise - monitoring should not break predictions
        else:
            logger.debug(
                f"Prediction logged (no monitor): {prediction_id} - "
                f"{model_name} v{model_version} - {prediction:.2f}"
            )
