"""OSM Overpass API Service for fetching competitor stores near dark store locations."""

import logging
from typing import Dict, List

import httpx

logger = logging.getLogger(__name__)


async def fetch_osm_competitor_stores(lat: float, lng: float, radius_m: int = 5000) -> List[Dict]:
    """
    Fetch supermarkets and convenience stores near the given coordinates using OSM Overpass API.
    """
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
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, data={"data": query})
            if response.status_code == 200:
                data = response.json()
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
                return competitors
            else:
                logger.error(f"Overpass API returned status {response.status_code}: {response.text}")
    except Exception as e:
        logger.error(f"Error querying Overpass API: {e}")

    return []
