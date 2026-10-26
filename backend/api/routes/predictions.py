"""AI Demand Forecasting API Routes."""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.models.models import Neighborhood
from backend.core.security import verify_token
from backend.core.idempotency import idempotent
from backend.ml.prediction_service import PredictionService
from backend.ml.model_loader import ModelLoader
from backend.ml.schemas import PredictionRequest, PredictionResponse

logger = logging.getLogger(__name__)
router = APIRouter()
model_loader = ModelLoader()


class NeighborhoodOption(BaseModel):
    pincode: str
    neighborhood_name: str
    city: str
    population: int
    population_density: float
    avg_household_income: float


@router.get("/neighborhoods", response_model=List[NeighborhoodOption])
async def list_forecast_neighborhoods(
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    """Fetch available pincodes/neighborhoods for forecasting."""
    try:
        from sqlalchemy.orm import selectinload
        q = select(Neighborhood).options(selectinload(Neighborhood.city)).order_by(Neighborhood.neighborhood_name.asc())
        res = await db.execute(q)
        rows = res.scalars().all()

        if not rows:
            return []

        return [
            NeighborhoodOption(
                pincode=str(n.pincode),
                neighborhood_name=str(n.neighborhood_name),
                city=str(n.city.city_name) if getattr(n, "city", None) and n.city else "Unknown",
                population=int(n.population or 0),
                population_density=float(n.population_density or 0),
                avg_household_income=float(n.avg_household_income or 0),
            ) for n in rows if n.pincode
        ]
    except Exception as e:
        logger.warning(f"Error fetching neighborhoods: {e}")
        raise HTTPException(status_code=503, detail="Forecast neighborhood data is unavailable") from e


@router.post("/predict", response_model=PredictionResponse)
async def predict_demand(
    request: PredictionRequest,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token),
):
    """Predict demand for a pincode on a specific date."""
    service = PredictionService(model_loader=model_loader, db_session=db)
    try:
        response = await service.predict(request)
        return response
    except Exception as e:
        logger.error(f"Prediction route failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )
