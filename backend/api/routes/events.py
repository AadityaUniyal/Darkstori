"""Local events API routes."""

from datetime import date, time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import LocalEvent

router = APIRouter()


class EventResponse(BaseModel):
    """Event response model."""

    id: int
    name: str
    city: str
    pincode: Optional[str]
    event_date: date
    event_time: Optional[time]
    event_type: str
    expected_impact_pct: float

    model_config = {"from_attributes": True}


class EventCreate(BaseModel):
    """Event creation/update model."""

    name: str
    city: str
    pincode: Optional[str] = None
    event_date: date
    event_time: Optional[time] = None
    event_type: str = "Other"
    expected_impact_pct: float = 10.0


@router.get("/", response_model=List[EventResponse])
async def get_events(
    city: Optional[str] = None,
    pincode: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Retrieve all local events, optionally filtered by city or pincode."""
    query = select(LocalEvent).order_by(LocalEvent.event_date.asc())

    if city:
        query = query.where(LocalEvent.city == city)
    if pincode:
        query = query.where(LocalEvent.pincode == pincode)

    result = await db.execute(query)
    events = result.scalars().all()
    return events


@router.post("/", response_model=EventResponse)
async def create_event(
    event: EventCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Create a new local event."""
    db_event = LocalEvent(**event.model_dump())
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    logger.info(f"New local event created: {event.name}")
    return db_event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event: EventCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Update an existing local event."""
    result = await db.execute(select(LocalEvent).where(LocalEvent.id == event_id))
    db_event = result.scalar_one_or_none()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    for key, value in event.model_dump().items():
        setattr(db_event, key, value)

    await db.commit()
    await db.refresh(db_event)
    logger.info(f"Local event updated: {db_event.name}")
    return db_event


@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Delete a local event."""
    result = await db.execute(select(LocalEvent).where(LocalEvent.id == event_id))
    db_event = result.scalar_one_or_none()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(db_event)
    await db.commit()
    logger.info(f"Local event deleted: {event_id}")
    return {"message": "Event deleted successfully"}
