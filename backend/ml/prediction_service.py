"""Prediction Service for ML Models."""
import asyncio
import logging
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ml.model_loader import ModelLoader
from backend.ml.performance_monitor import PerformanceMonitor
from backend.ml.schemas import PredictionRequest, PredictionResponse
from database.models.models import Neighborhood

logger = logging.getLogger(__name__)


class PredictionService:
    """Service for making predictions with production models."""

    def __init__(
        self, model_loader: ModelLoader, db_session: Optional[AsyncSession] = None
    ):
        self.model_loader = model_loader
        self.db_session = db_session
        self.default_model_name = "demand_forecasting_model"

        self.monitor = None
        if db_session:
            self.monitor = PerformanceMonitor(db_session)

        logger.info("PredictionService initialized")

    async def predict(
        self, request: PredictionRequest, model_name: Optional[str] = None
    ) -> PredictionResponse:
        start_time = time.time()
        model_name = model_name or self.default_model_name

        try:
            # Load production model (sync call -> thread)
            model, scaler, feature_names = await asyncio.to_thread(
                self.model_loader.load_production_model, model_name, False
            )

            # Look up neighborhood demographics from pincode
            nbhd = await self._lookup_neighborhood(request.pincode)
            if nbhd is None:
                raise ValueError(f"No neighborhood found for pincode: {request.pincode}")

            # Build input DataFrame matching training features exactly
            dt = pd.to_datetime(request.order_date)
            nbhd_mean = nbhd.get("avg_daily_orders", 300)
            is_holiday = nbhd.get("is_holiday", 0)
            row = {
                "order_date": dt.toordinal(),
                "population": request.population or nbhd.get("population", 50000),
                "population_density": nbhd.get("population_density", 5000),
                "avg_household_income": nbhd.get("avg_household_income", 400000),
                "working_professionals_pct": nbhd.get("working_professionals_pct", 60),
                "platform_count": request.platform_count or 3,
                "day_of_week": dt.dayofweek,
                "is_weekend": int(dt.dayofweek >= 5),
                "is_holiday": is_holiday,
                "weather_Cloudy": 0,
                "weather_Rainy": 0,
                "avg_order_value": nbhd.get("avg_order_value", 450),
                "avg_discount": nbhd.get("avg_discount", 30),
                "total_stores": nbhd.get("total_stores", 5),
                "comp_level": nbhd.get("comp_level", 1),
                "lag_1": nbhd_mean,
                "lag_7": nbhd_mean,
                "rolling_7": nbhd_mean,
                "lag_14": nbhd_mean,
                "rolling_14": nbhd_mean,
                "platform_diversity": nbhd.get("platform_diversity", 0.6),
                "category_diversity": nbhd.get("category_diversity", 0.6),
            }
            input_df = pd.DataFrame([row])

            # Select only the features the model expects
            if feature_names:
                missing = set(feature_names) - set(input_df.columns)
                if missing:
                    for col in missing:
                        input_df[col] = 0
                input_df = input_df[feature_names]

            # Scale (preserve column names for MLflow signature validation)
            if scaler is not None:
                try:
                    scaled = scaler.transform(input_df)
                    input_df = pd.DataFrame(scaled, columns=input_df.columns, index=input_df.index)
                except Exception as e:
                    logger.warning(f"Scaler transform failed: {e}, using raw")

            # Predict with DataFrame (MLflow pyfunc requires named columns with float64)
            prediction = model.predict(input_df.astype(float))[0]
            lower_bound, upper_bound = self._calculate_confidence_intervals(
                prediction, input_df.values
            )

            latency_ms = (time.time() - start_time) * 1000
            prediction_id = self._generate_prediction_id()

            model_info = self.model_loader.get_model_info(model_name)
            model_version = (
                model_info.get("version", "unknown") if model_info else "unknown"
            )

            await self._log_prediction(
                prediction_id=prediction_id,
                model_name=model_name,
                model_version=str(model_version),
                input_data=row,
                prediction=float(prediction),
                lower_bound=float(lower_bound),
                upper_bound=float(upper_bound),
                latency_ms=latency_ms,
            )

            logger.info(
                f"Prediction: {prediction:.2f} for pincode {request.pincode} "
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

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            raise
        except Exception as e:
            logger.error(f"Prediction failed: {e}", exc_info=True)
            raise

    async def predict_batch(
        self,
        file_path: str,
        output_path: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        start_time = time.time()
        model_name = model_name or self.default_model_name

        try:
            model, scaler, feature_names = await asyncio.to_thread(
                self.model_loader.load_production_model, model_name, False
            )

            input_df = pd.read_csv(file_path)
            self._validate_batch_input(input_df)

            chunk_size = 1000
            predictions = []
            lower_bounds = []
            upper_bounds = []

            for i in range(0, len(input_df), chunk_size):
                chunk = input_df.iloc[i : i + chunk_size].copy()

                # Engineer features matching training
                dt = pd.to_datetime(chunk["order_date"])
                chunk["order_date"] = dt.map(pd.Timestamp.toordinal)
                chunk["day_of_week"] = dt.dt.dayofweek
                chunk["is_weekend"] = (dt.dt.dayofweek >= 5).astype(int)
                chunk["is_holiday"] = chunk.get("is_holiday", 0)
                chunk["weather_Cloudy"] = chunk.get("weather_Cloudy", 0)
                chunk["weather_Rainy"] = chunk.get("weather_Rainy", 0)
                chunk["avg_order_value"] = chunk.get("avg_order_value", 450)
                chunk["avg_discount"] = chunk.get("avg_discount", 30)
                chunk["total_stores"] = chunk.get("total_stores", 5)
                chunk["comp_level"] = chunk.get("comp_level", 1)
                chunk["lag_1"] = chunk.get("lag_1", 300)
                chunk["lag_7"] = chunk.get("lag_7", 300)
                chunk["rolling_7"] = chunk.get("rolling_7", 300)
                chunk["lag_14"] = chunk.get("lag_14", 300)
                chunk["rolling_14"] = chunk.get("rolling_14", 300)
                chunk["platform_diversity"] = chunk.get("platform_diversity", 0.6)
                chunk["category_diversity"] = chunk.get("category_diversity", 0.6)

                for col in ["population_density", "avg_household_income", "working_professionals_pct", "platform_count"]:
                    if col not in chunk.columns:
                        chunk[col] = 0

                if feature_names:
                    missing = set(feature_names) - set(chunk.columns)
                    for col in missing:
                        chunk[col] = 0
                    features = chunk[feature_names]
                else:
                    features = chunk.select_dtypes(include=[np.number])

                features = features.fillna(features.median())

                if scaler is not None:
                    scaled = scaler.transform(features)
                    features = pd.DataFrame(scaled, columns=features.columns, index=features.index)

                chunk_predictions = model.predict(features)
                predictions.extend(chunk_predictions)
                for pred in chunk_predictions:
                    lo, hi = self._calculate_confidence_intervals(pred, None)
                    lower_bounds.append(lo)
                    upper_bounds.append(hi)

            input_df["prediction"] = predictions
            input_df["lower_bound"] = lower_bounds
            input_df["upper_bound"] = upper_bounds

            if output_path is None:
                output_path = file_path.replace(".csv", "_predictions.csv")
            input_df.to_csv(output_path, index=False)

            processing_time = time.time() - start_time
            job_id = f"batch_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"

            return {
                "job_id": job_id,
                "status": "completed",
                "total_rows": len(input_df),
                "output_path": output_path,
                "processing_time_seconds": processing_time,
                "model_name": model_name,
                "version": str(
                    self.model_loader.get_model_info(model_name).get("version", "unknown")
                ),
            }

        except Exception as e:
            logger.error(f"Batch prediction failed: {e}", exc_info=True)
            raise

    async def _lookup_neighborhood(self, pincode: str) -> Optional[Dict[str, Any]]:
        if not self.db_session:
            return self._default_nbhd()
        try:
            from sqlalchemy import text as sql_text
            q = sql_text("""
                SELECT n.population, n.population_density, n.avg_household_income,
                       n.working_professionals_pct, n.total_stores,
                       CASE n.competition_intensity
                           WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 1 ELSE 0
                       END AS comp_level,
                       COALESCE(AVG(o.order_count), 300) AS avg_daily_orders,
                       COALESCE(AVG(o.avg_ord_val), 450) AS avg_order_value,
                       COALESCE(AVG(o.avg_disc), 30) AS avg_discount,
                       COALESCE(AVG(dv.plat_div), 0.6) AS platform_diversity,
                       COALESCE(AVG(dv.cat_div), 0.6) AS category_diversity
                FROM neighborhoods n
                LEFT JOIN (
                    SELECT neighborhood_id, COUNT(*)::float8 AS order_count,
                           AVG(order_value) AS avg_ord_val,
                           AVG(discount) AS avg_disc
                    FROM orders_synthetic
                    GROUP BY neighborhood_id, order_date
                ) o ON o.neighborhood_id = n.neighborhood_id
                LEFT JOIN (
                    SELECT order_date, neighborhood_id,
                           1.0 - SUM((cnt::float8 / total) * (cnt::float8 / total)) AS plat_div,
                           1.0 - SUM((cnt2::float8 / total2) * (cnt2::float8 / total2)) AS cat_div
                    FROM (
                        SELECT order_date, neighborhood_id, platform, COUNT(*)::float8 AS cnt,
                               SUM(COUNT(*)) OVER (PARTITION BY order_date, neighborhood_id)::float8 AS total
                        FROM orders_synthetic
                        GROUP BY order_date, neighborhood_id, platform
                    ) plat_sub
                    JOIN (
                        SELECT order_date, neighborhood_id, category, COUNT(*)::float8 AS cnt2,
                               SUM(COUNT(*)) OVER (PARTITION BY order_date, neighborhood_id)::float8 AS total2
                        FROM orders_synthetic
                        GROUP BY order_date, neighborhood_id, category
                    ) cat_sub USING (order_date, neighborhood_id)
                    GROUP BY order_date, neighborhood_id
                ) dv ON dv.neighborhood_id = n.neighborhood_id
                WHERE n.pincode = :p
                GROUP BY n.population, n.population_density,
                         n.avg_household_income, n.working_professionals_pct,
                         n.total_stores, n.competition_intensity
            """)
            result = await self.db_session.execute(q, {"p": pincode})
            row = result.one_or_none()
            if row:
                return {
                    "population": row.population or 50000,
                    "population_density": row.population_density or 5000,
                    "avg_household_income": row.avg_household_income or 400000,
                    "working_professionals_pct": row.working_professionals_pct or 60,
                    "total_stores": row.total_stores or 5,
                    "comp_level": row.comp_level or 1,
                    "avg_daily_orders": row.avg_daily_orders or 300,
                    "avg_order_value": row.avg_order_value or 450,
                    "avg_discount": row.avg_discount or 30,
                    "platform_diversity": row.platform_diversity or 0.6,
                    "category_diversity": row.category_diversity or 0.6,
                }
        except Exception as e:
            logger.warning(f"Neighborhood lookup failed for {pincode}: {e}")
        return self._default_nbhd()

    @staticmethod
    def _default_nbhd() -> Dict[str, Any]:
        return {
            "population": 50000, "population_density": 5000,
            "avg_household_income": 400000, "working_professionals_pct": 60,
            "total_stores": 5, "comp_level": 1,
            "avg_daily_orders": 300, "avg_order_value": 450,
            "avg_discount": 30, "platform_diversity": 0.6,
            "category_diversity": 0.6,
        }

    def _validate_batch_input(self, df: pd.DataFrame) -> None:
        required = ["pincode", "order_date"]
        missing = set(required) - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

    def _calculate_confidence_intervals(
        self, prediction: float, features: Optional[np.ndarray]
    ) -> Tuple[float, float]:
        margin = prediction * 0.1
        lower_bound = max(0, prediction - margin)
        upper_bound = prediction + margin
        return lower_bound, upper_bound

    def _generate_prediction_id(self) -> str:
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
        else:
            logger.debug(
                f"Prediction logged (no monitor): {prediction_id} - "
                f"{model_name} v{model_version} - {prediction:.2f}"
            )
