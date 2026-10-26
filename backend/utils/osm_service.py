"""OSM-backed geo services for free location resolution and POI discovery."""

import logging
import asyncio
from typing import Dict, List, Optional
import json

import httpx
from backend.core.circuit_breaker import circuit_breaker, CircuitBreakerOpenException
from backend.core.cache import cache
from backend.core.config import settings

logger = logging.getLogger(__name__)

NOMINATIM_URL = settings.GEOCODER_BASE_URL.rstrip("/")
OVERPASS_URL = settings.OVERPASS_API_URL
_nominatim_request_lock = asyncio.Lock()

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
        async with _nominatim_request_lock:
            await asyncio.sleep(1)
            data = await _execute_nominatim_search(url, params)
        if not data:
            return None
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
        logger.warning("Nominatim resolve failed for '%s': %s", query, e)
        raise RuntimeError("Geocoding provider is unavailable") from e


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
        logger.warning("Nominatim reverse failed for (%s, %s): %s", lat, lng, e)
        raise RuntimeError("Reverse geocoding provider is unavailable") from e


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
        logger.error("Error querying Overpass API: %s", e)
        raise RuntimeError("OpenStreetMap POI provider is unavailable") from e
