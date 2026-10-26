"""Neighborhood demand mood endpoints.

The previous implementation combined demo review/order rows with assumed
weather and baseline growth values. It produced confident but ungrounded
promotion advice. Keep the routes explicit until verified production sources
and a validated scoring method are connected.
"""

from fastapi import APIRouter, Depends, HTTPException

from backend.core.security import verify_token

router = APIRouter()
UNAVAILABLE_DETAIL = (
    "Demand mood scoring is unavailable: this deployment has no verified, "
    "production order and weather feeds for this analysis."
)


@router.get("/neighborhood/{neighborhood_id}")
async def get_neighborhood_mood(neighborhood_id: int, payload: dict = Depends(verify_token)):
    raise HTTPException(status_code=501, detail=UNAVAILABLE_DETAIL)


@router.get("/city/{city}")
async def get_city_mood(city: str, payload: dict = Depends(verify_token)):
    raise HTTPException(status_code=501, detail=UNAVAILABLE_DETAIL)


@router.get("/summary")
async def get_mood_summary(payload: dict = Depends(verify_token)):
    raise HTTPException(status_code=501, detail=UNAVAILABLE_DETAIL)
