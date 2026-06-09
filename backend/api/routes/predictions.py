"""AI Demand Forecasting API Routes."""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_db
from database.models.models import Neighborhood
from backend.core.security import verify_token
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
        q = select(Neighborhood).order_by(Neighborhood.neighborhood_name.asc())
        res = await db.execute(q)
        rows = res.scalars().all()

        # If database is empty, return a default mock list
        if not rows:
            return [
                NeighborhoodOption(
                    pincode="560001",
                    neighborhood_name="Indiranagar",
                    city="Bangalore",
                    population=75000,
                    population_density=6200.0,
                    avg_household_income=950000.0
                ),
                NeighborhoodOption(
                    pincode="110001",
                    neighborhood_name="Connaught Place",
                    city="Delhi",
                    population=45000,
                    population_density=8000.0,
                    avg_household_income=800000.0
                ),
                NeighborhoodOption(
                    pincode="400001",
                    neighborhood_name="Colaba",
                    city="Mumbai",
                    population=90000,
                    population_density=12000.0,
                    avg_household_income=1100000.0
                ),
                NeighborhoodOption(
                    pincode="500001",
                    neighborhood_name="Banjara Hills",
                    city="Hyderabad",
                    population=65000,
                    population_density=5400.0,
                    avg_household_income=850000.0
                ),
                NeighborhoodOption(
                    pincode="411001",
                    neighborhood_name="Koregaon Park",
                    city="Pune",
                    population=55000,
                    population_density=5800.0,
                    avg_household_income=720000.0
                )
            ]

        return [
            NeighborhoodOption(
                pincode=n.pincode or "560001",
                neighborhood_name=n.neighborhood_name or "Unknown Zone",
                city="Bangalore",  # fallback
                population=n.population or 50000,
                population_density=n.population_density or 5000.0,
                avg_household_income=n.avg_household_income or 500000.0
            ) for n in rows if n.pincode
        ]
    except Exception as e:
        logger.warning(f"Error fetching neighborhoods: {e}")
        # Fallback list
        return [
            NeighborhoodOption(
                pincode="560001",
                neighborhood_name="Indiranagar",
                city="Bangalore",
                population=75000,
                population_density=6200.0,
                avg_household_income=950000.0
            ),
            NeighborhoodOption(
                pincode="110001",
                neighborhood_name="Connaught Place",
                city="Delhi",
                population=45000,
                population_density=8000.0,
                avg_household_income=800000.0
            ),
            NeighborhoodOption(
                pincode="400001",
                neighborhood_name="Colaba",
                city="Mumbai",
                population=90000,
                population_density=12000.0,
                avg_household_income=1100000.0
            ),
            NeighborhoodOption(
                pincode="500001",
                neighborhood_name="Banjara Hills",
                city="Hyderabad",
                population=65000,
                population_density=5400.0,
                avg_household_income=850000.0
            ),
            NeighborhoodOption(
                pincode="411001",
                neighborhood_name="Koregaon Park",
                city="Pune",
                population=55000,
                population_density=5800.0,
                avg_household_income=720000.0
            )
        ]


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
