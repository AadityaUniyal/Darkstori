"""ML Prediction API Endpoints.

This module provides FastAPI endpoints for making predictions
using MLflow-registered models.
"""

import os
import tempfile
from datetime import datetime
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.database.connection import get_db
from backend.ml.mlflow_config import get_mlflow_tracking_uri
from backend.ml.model_loader import ModelLoader
from backend.ml.model_registry import ModelRegistry
from backend.ml.prediction_service import PredictionService
from backend.ml.schemas import (
    BatchPredictionResponse,
    PredictionRequest,
    PredictionResponse,
)

router = APIRouter()


async def get_prediction_service(
    db: AsyncSession = Depends(get_db),
) -> PredictionService:
    """Dependency to get prediction service."""
    registry = ModelRegistry(tracking_uri=get_mlflow_tracking_uri())
    model_loader = ModelLoader(registry=registry)
    return PredictionService(model_loader=model_loader, db_session=db)


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    request: PredictionRequest,
    service: PredictionService = Depends(get_prediction_service),
) -> PredictionResponse:
    """
    Make a single prediction using the production model.

    - Validates input against model signature
    - Applies feature engineering pipeline
    - Returns prediction with confidence intervals
    - Logs prediction for monitoring
    """
    try:
        return await service.predict(request)

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except FileNotFoundError as e:
        logger.error(f"Model not found: {e}")
        raise HTTPException(
            status_code=503, detail="Model service unavailable. Please try again later."
        )
    except Exception as e:
        logger.error(f"Unexpected error in prediction: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch(
    file: UploadFile = File(...),
    service: PredictionService = Depends(get_prediction_service),
) -> BatchPredictionResponse:
    """
    Process batch predictions from CSV file.

    - Accepts CSV with required columns
    - Processes in chunks for memory efficiency
    - Returns download link for results
    """
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(
            mode="wb", delete=False, suffix=".csv"
        ) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        try:
            # Process batch predictions
            result = await service.predict_batch(
                file_path=temp_file_path, output_path=None
            )

            return BatchPredictionResponse(
                job_id=result["job_id"],
                status=result["status"],
                total_rows=result["total_rows"],
                output_path=result["output_path"],
                processing_time_seconds=result["processing_time_seconds"],
            )

        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")


@router.post("/forecast")
async def forecast_future(
    request: PredictionRequest,
    horizon_days: int = 7,
    service: PredictionService = Depends(get_prediction_service),
) -> Dict[str, Any]:
    """
    Generate multi-period forecast.

    - Accepts base data and forecast horizon
    - Returns predictions with confidence intervals for each period
    """
    try:
        forecasts = []

        # Generate forecasts for each day in horizon
        for day_offset in range(horizon_days):
            # Create modified request for each day
            forecast_date = pd.to_datetime(request.order_date) + pd.Timedelta(
                days=day_offset
            )

            forecast_request = PredictionRequest(
                pincode=request.pincode,
                order_date=forecast_date.strftime("%Y-%m-%d"),
                population=request.population,
                coverage_score=request.coverage_score,
                city_tier=request.city_tier,
                city=request.city,
                state=request.state,
            )

            # Make prediction
            prediction = await service.predict(forecast_request)

            forecasts.append(
                {
                    "date": forecast_date.strftime("%Y-%m-%d"),
                    "prediction": prediction.prediction,
                    "lower_bound": prediction.lower_bound,
                    "upper_bound": prediction.upper_bound,
                }
            )

        return {
            "location": {
                "pincode": request.pincode,
                "city": request.city,
                "state": request.state,
            },
            "forecast_horizon_days": horizon_days,
            "forecasts": forecasts,
            "model_name": forecasts[0]["prediction"] if forecasts else None,
            "generated_at": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Forecast failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")
