"""OSM-backed geo services for free location resolution and POI discovery."""

import logging
from typing import Dict, List, Optional
import json

import httpx
from backend.core.circuit_breaker import circuit_breaker, CircuitBreakerOpenException
from backend.core.cache import cache

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

CITY_CENTROIDS = {
    "bangalore": {"lat": 12.9716, "lng": 77.5946, "display_name": "Bangalore, Karnataka, India"},
    "delhi": {"lat": 28.6139, "lng": 77.2090, "display_name": "Delhi, India"},
    "mumbai": {"lat": 19.0760, "lng": 72.8777, "display_name": "Mumbai, Maharashtra, India"},
    "hyderabad": {"lat": 17.3850, "lng": 78.4867, "display_name": "Hyderabad, Telangana, India"},
    "pune": {"lat": 18.5204, "lng": 73.8567, "display_name": "Pune, Maharashtra, India"},
    "new york": {"lat": 40.7128, "lng": -74.0060, "display_name": "New York, USA"},
    "london": {"lat": 51.5074, "lng": -0.1278, "display_name": "London, UK"},
    "tokyo": {"lat": 35.6762, "lng": 139.6503, "display_name": "Tokyo, Japan"},
    "singapore": {"lat": 1.3521, "lng": 103.8198, "display_name": "Singapore"},
    "dubai": {"lat": 25.2048, "lng": 55.2708, "display_name": "Dubai, UAE"},
    "são paulo": {"lat": -23.5505, "lng": -46.6333, "display_name": "São Paulo, Brazil"},
    "paris": {"lat": 48.8566, "lng": 2.3522, "display_name": "Paris, France"},
    "berlin": {"lat": 52.5200, "lng": 13.4050, "display_name": "Berlin, Germany"},
    "sydney": {"lat": -33.8688, "lng": 151.2093, "display_name": "Sydney, Australia"},
    "toronto": {"lat": 43.6510, "lng": -79.3470, "display_name": "Toronto, Canada"},
    "shanghai": {"lat": 31.2304, "lng": 121.4737, "display_name": "Shanghai, China"},
    "seoul": {"lat": 37.5665, "lng": 126.9780, "display_name": "Seoul, South Korea"},
    "bangkok": {"lat": 13.7563, "lng": 100.5018, "display_name": "Bangkok, Thailand"},
    "jakarta": {"lat": -6.2088, "lng": 106.8456, "display_name": "Jakarta, Indonesia"},
    "lagos": {"lat": 6.5244, "lng": 3.3792, "display_name": "Lagos, Nigeria"},
    "cairo": {"lat": 30.0444, "lng": 31.2357, "display_name": "Cairo, Egypt"},
    "mexico city": {"lat": 19.4326, "lng": -99.1332, "display_name": "Mexico City, Mexico"},
    "moscow": {"lat": 55.7558, "lng": 37.6173, "display_name": "Moscow, Russia"},
    "istanbul": {"lat": 41.0082, "lng": 28.9784, "display_name": "Istanbul, Turkey"},
    "nairobi": {"lat": -1.2921, "lng": 36.8219, "display_name": "Nairobi, Kenya"},
}


@circuit_breaker(failure_threshold=2, recovery_timeout=30)
async def _execute_nominatim_search(url: str, params: dict) -> list:
    async with httpx.AsyncClient(
        timeout=20.0,
        headers={"User-Agent": "Darkstori/1.0 (regional-expansion-cockpit)"},
    ) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


@circuit_breaker(failure_threshold=2, recovery_timeout=30)
async def _execute_nominatim_reverse(url: str, params: dict) -> dict:
    async with httpx.AsyncClient(
        timeout=20.0,
        headers={"User-Agent": "Darkstori/1.0 (regional-expansion-cockpit)"},
    ) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


@circuit_breaker(failure_threshold=2, recovery_timeout=30)
async def _execute_osm_query(url: str, query: str) -> dict:
    async with httpx.AsyncClient(
        timeout=30.0,
        headers={"User-Agent": "Darkstori/1.0 (regional-expansion-cockpit)"},
    ) as client:
        response = await client.post(url, data={"data": query})
        response.raise_for_status()
        return response.json()


async def resolve_location(query: str) -> Optional[Dict]:
    """Resolve a user-entered city/address/pincode to coordinates using Nominatim."""
    if not query or not query.strip():
        return None

    cache_key = f"osm:resolve:{query.strip().lower()}"
    cached_data = await cache.get(cache_key)
    if cached_data:
        try:
            return json.loads(cached_data)
        except Exception:
            pass

    url = f"{NOMINATIM_URL}/search"
    params = {
        "q": query,
        "format": "jsonv2",
        "limit": 1,
        "addressdetails": 1,
    }

    try:
        import asyncio
        await asyncio.sleep(1)
        data = await _execute_nominatim_search(url, params)
        if not data:
            raise ValueError("Empty response from Nominatim search")
        top = data[0]
        result = {
            "display_name": top.get("display_name"),
            "lat": float(top["lat"]),
            "lng": float(top["lon"]),
            "type": top.get("type"),
            "class": top.get("class"),
            "address": top.get("address", {}),
        }
        await cache.set(cache_key, json.dumps(result), ttl=86400)
        return result
    except Exception as e:
        logger.warning(f"Nominatim resolve failed for '{query}': {e}")
        q_lower = query.lower()
        for city_key, info in CITY_CENTROIDS.items():
            if city_key in q_lower:
                return {
                    "display_name": f"{info['display_name']} (Fallback)",
                    "lat": info["lat"],
                    "lng": info["lng"],
                    "type": "city",
                    "class": "place",
                    "address": {"city": city_key.capitalize(), "country": "India"},
                }
        return {
            "display_name": "Unknown Location",
            "lat": 0.0,
            "lng": 0.0,
            "type": "error",
            "class": "error",
            "address": {"note": "Location not found"},
        }


async def reverse_location(lat: float, lng: float) -> Optional[Dict]:
    """Reverse geocode a coordinate to a human-readable location."""
    cache_key = f"osm:reverse:{lat:.5f}:{lng:.5f}"
    cached_data = await cache.get(cache_key)
    if cached_data:
        try:
            return json.loads(cached_data)
        except Exception:
            pass

    url = f"{NOMINATIM_URL}/reverse"
    params = {
        "lat": lat,
        "lon": lng,
        "format": "jsonv2",
        "addressdetails": 1,
    }

    try:
        data = await _execute_nominatim_reverse(url, params)
        result = {
            "display_name": data.get("display_name"),
            "lat": float(data.get("lat", lat)),
            "lng": float(data.get("lon", lng)),
            "address": data.get("address", {}),
        }
        await cache.set(cache_key, json.dumps(result), ttl=86400)
        return result
    except Exception as e:
        logger.warning(f"Nominatim reverse failed for ({lat}, {lng}): {e}")
        return {
            "display_name": f"Location ({lat:.4f}, {lng:.4f})",
            "lat": lat,
            "lng": lng,
            "address": {"note": "Fallback reverse location"},
        }


async def fetch_osm_competitor_stores(lat: float, lng: float, radius_m: int = 5000) -> List[Dict]:
    """
    Fetch supermarkets and convenience stores near the given coordinates using OSM Overpass API.
    """
    cache_key = f"osm:competitors:{lat:.3f}:{lng:.3f}:{radius_m}"
    cached_data = await cache.get(cache_key)
    
    if cached_data:
        try:
            return json.loads(cached_data)
        except Exception:
            pass
            
    url = OVERPASS_URL

    query = f"""
    [out:json][timeout:25];
    (
      node["shop"="supermarket"](around:{radius_m},{lat},{lng});
      way["shop"="supermarket"](around:{radius_m},{lat},{lng});
      node["shop"="convenience"](around:{radius_m},{lat},{lng});
      way["shop"="convenience"](around:{radius_m},{lat},{lng});
    );
    out center;
    """

    try:
        data = await _execute_osm_query(url, query)
        elements = data.get("elements", [])
        competitors = []

        for el in elements:
            tags = el.get("tags", {})
            name = tags.get("name") or tags.get("brand") or tags.get("operator") or "Independent Competitor"

            el_lat = el.get("lat") or (el.get("center", {}).get("lat") if "center" in el else None)
            el_lng = el.get("lon") or (el.get("center", {}).get("lon") if "center" in el else None)

            if el_lat is None or el_lng is None:
                continue

            name_lower = name.lower()
            platform = "Local/Independent"
            if "zepto" in name_lower:
                platform = "Zepto"
            elif "blinkit" in name_lower:
                platform = "Blinkit"
            elif "instamart" in name_lower or "swiggy" in name_lower:
                platform = "Swiggy Instamart"
            elif "bigbasket" in name_lower or "bbnow" in name_lower or "bb daily" in name_lower:
                platform = "BigBasket Now"
            elif "dunzo" in name_lower:
                platform = "Dunzo"

            competitors.append({
                "osm_id": el.get("id"),
                "platform": platform,
                "store_name": name,
                "latitude": el_lat,
                "longitude": el_lng,
            })
        logger.info(f"OSM fetch returned {len(competitors)} competitors")
        
        # Cache for 24 hours
        await cache.set(cache_key, json.dumps(competitors), ttl=86400)
        
        return competitors
    except Exception as e:
        logger.error(f"Error querying Overpass API: {e}")

    return []
