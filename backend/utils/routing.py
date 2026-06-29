"""Routing service utility for OSRM integration with simulated road network fallback."""

import math
import httpx
from backend.core.logger import logger

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points on Earth."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

async def get_route_summary(lat1: float, lon1: float, lat2: float, lon2: float) -> dict:
    """
    Get routing distance (km) and estimated travel duration (mins).
    Queries OSRM API, falls back to a traffic-adjusted Manhattan distance estimate.
    """
    url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=false"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                if "routes" in data and len(data["routes"]) > 0:
                    route = data["routes"][0]
                    distance_km = route["distance"] / 1000.0
                    duration_mins = route["duration"] / 60.0
                    logger.info(f"OSRM routing successful: {distance_km:.2f} km, {duration_mins:.1f} mins")
                    return {
                        "distance_km": round(distance_km, 2),
                        "duration_mins": round(duration_mins, 1),
                        "source": "osrm"
                    }
    except Exception as e:
        logger.warning(f"OSRM routing request failed: {e}. Using fallback calculation.")

    # Fallback to circuity-adjusted haversine & typical Indian city traffic speeds (avg ~18 km/h)
    straight_dist = _haversine_km(lat1, lon1, lat2, lon2)
    # 1.35x circuity factor for city road grids
    road_dist = straight_dist * 1.35
    # Average speed in city traffic is ~18 km/h (0.3 km/minute)
    duration_mins = road_dist / 18.0 * 60.0

    return {
        "distance_km": round(road_dist, 2),
        "duration_mins": round(duration_mins, 1),
        "source": "fallback_model"
    }
