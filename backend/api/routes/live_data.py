"""Live data streaming API routes."""

import asyncio
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.database.connection import get_db

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for live data streaming."""
    await manager.connect(websocket)

    try:
        while True:
            # Send live metrics every 5 seconds
            live_data = {
                "timestamp": datetime.now().isoformat(),
                "total_orders": 1234,
                "orders_per_minute": 45.2,
                "avg_order_value": 567.89,
                "top_platform": "Blinkit",
                "active_stores": 4400,
            }

            await websocket.send_json(live_data)
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("/metrics")
async def get_live_metrics(db: AsyncSession = Depends(get_db)):
    """Get current live metrics."""
    return {
        "timestamp": datetime.now().isoformat(),
        "total_orders": 1234,
        "orders_per_minute": 45.2,
        "avg_order_value": 567.89,
        "top_platform": "Blinkit",
        "active_stores": 4400,
        "anomalies": [],
    }


@router.get("/stores/nearby")
async def get_nearby_stores(
    lat: float, lng: float, radius: int = 5000, db: AsyncSession = Depends(get_db)
):
    """Get nearby stores with live status."""
    # In production, query database with geospatial search
    return {
        "stores": [
            {
                "id": 1,
                "name": "Blinkit Koramangala",
                "platform": "Blinkit",
                "lat": lat + 0.01,
                "lng": lng + 0.01,
                "is_open": True,
                "rating": 4.5,
                "distance_km": 1.2,
            }
        ]
    }
