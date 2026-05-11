"""ML Predictions API routes."""

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db

router = APIRouter()


class ForecastResponse(BaseModel):
    """Forecast response model."""

    date: str
    predicted_orders: float
    lower_bound: float
    upper_bound: float


class OpportunityZone(BaseModel):
    """Opportunity zone model."""

    pincode: str
    city: str
    state: str
    population: int
    coverage_score: float
    opportunity_score: float
    latitude: float
    longitude: float


@router.get("/forecast", response_model=List[ForecastResponse])
async def get_demand_forecast(
    days: int = Query(30, ge=1, le=90), db: AsyncSession = Depends(get_db)
):
    """Get demand forecast for next N days."""
    # In production, load ML model and generate predictions
    # For now, return sample forecast

    forecasts = []
    base_orders = 45000

    for i in range(days):
        date = datetime.now().date() + timedelta(days=i)
        predicted = base_orders + (i * 200) + (i % 7) * 3000

        forecasts.append(
            {
                "date": str(date),
                "predicted_orders": predicted,
                "lower_bound": predicted * 0.9,
                "upper_bound": predicted * 1.1,
            }
        )

    return forecasts


@router.get("/opportunity-zones", response_model=List[OpportunityZone])
async def get_opportunity_zones(
    limit: int = Query(50, le=500), db: AsyncSession = Depends(get_db)
):
    """Get high-opportunity expansion zones."""
    # In production, run ML clustering model
    # For now, return sample data

    sample_zones = [
        {
            "pincode": "201301",
            "city": "Noida",
            "state": "Uttar Pradesh",
            "population": 185000,
            "coverage_score": 0.0,
            "opportunity_score": 9.2,
            "latitude": 28.5355,
            "longitude": 77.3910,
        },
        {
            "pincode": "400601",
            "city": "Thane",
            "state": "Maharashtra",
            "population": 220000,
            "coverage_score": 0.0,
            "opportunity_score": 9.5,
            "latitude": 19.2183,
            "longitude": 72.9781,
        },
    ]

    return sample_zones[:limit]


@router.post("/predict-demand")
async def predict_demand(
    population: int,
    coverage_score: float,
    avg_income: int,
    distance_to_store: float,
    internet_penetration: float,
    is_weekend: bool = False,
):
    """Predict demand for given parameters."""
    # Simple prediction formula (in production, use trained ML model)
    predicted_orders = (
        population * 0.001
        + coverage_score * 50
        + avg_income * 0.0005
        - distance_to_store * 10
        + internet_penetration * 2
        + (100 if is_weekend else 0)
    )

    return {
        "predicted_daily_orders": int(predicted_orders),
        "confidence": 0.85,
        "model": "XGBoost v2.0",
    }
