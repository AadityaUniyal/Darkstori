"""OSM Overpass API Service for fetching competitor stores near dark store locations."""

import logging
from typing import Dict, List
import json

import httpx
from backend.core.circuit_breaker import circuit_breaker
from backend.core.cache import cache

logger = logging.getLogger(__name__)


@circuit_breaker(failure_threshold=2, recovery_timeout=30)
async def _execute_osm_query(url: str, query: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, data={"data": query})
        response.raise_for_status()
        return response.json()


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
            
    url = "https://overpass-api.de/api/interpreter"

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
        logger.info(f"OSM fetch returned {len(competitors)} competitors near ({lat}, {lng})")
        
        # Cache for 24 hours
        await cache.set(cache_key, json.dumps(competitors), ttl=86400)
        
        return competitors
    except Exception as e:
        logger.error(f"Error querying Overpass API: {e}")

    return []
