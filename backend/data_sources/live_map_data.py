"""Live map data fetching with real-time updates."""

from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import requests

from backend.core.config import settings
from backend.core.logger import logger
from backend.core.rate_limiter import rate_limit
from backend.utils.helpers import retry_on_failure

GOOGLE_MAPS_API_KEY = settings.GOOGLE_MAPS_API_KEY


class LiveMapDataFetcher:
    """Fetch live map data including traffic, places, and real-time updates."""

    def __init__(self, api_key: str = GOOGLE_MAPS_API_KEY):
        self.api_key = api_key
        self.cache = {}
        self.cache_duration = timedelta(minutes=5)

    @retry_on_failure(max_retries=3)
    @rate_limit(calls_per_second=5)
    def fetch_live_stores(
        self, lat: float, lng: float, radius: int = 5000
    ) -> List[Dict]:
        """
        Fetch live dark store locations with real-time status.

        Args:
            lat: Latitude
            lng: Longitude
            radius: Search radius in meters

        Returns:
            List of stores with live data
        """
        cache_key = f"stores_{lat}_{lng}_{radius}"

        # Check cache
        if cache_key in self.cache:
            cached_time, cached_data = self.cache[cache_key]
            if datetime.now() - cached_time < self.cache_duration:
                logger.info("Returning cached store data")
                return cached_data

        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

        stores = []
        platforms = ["Blinkit", "Zepto", "Swiggy Instamart", "Flipkart Minutes"]

        for platform in platforms:
            params = {
                "location": f"{lat},{lng}",
                "radius": radius,
                "keyword": platform,
                "type": "store",
                "key": self.api_key,
            }

            try:
                response = requests.get(url, params=params, timeout=10)
                data = response.json()

                if data["status"] == "OK":
                    for place in data.get("results", []):
                        store = {
                            "name": place["name"],
                            "platform": self._extract_platform(place["name"]),
                            "lat": place["geometry"]["location"]["lat"],
                            "lng": place["geometry"]["location"]["lng"],
                            "address": place.get("vicinity", ""),
                            "rating": place.get("rating", 0),
                            "is_open": place.get("opening_hours", {}).get(
                                "open_now", False
                            ),
                            "place_id": place["place_id"],
                            "last_updated": datetime.now().isoformat(),
                        }
                        stores.append(store)

            except Exception as e:
                logger.error(f"Error fetching {platform} stores: {e}")

        # Cache results
        self.cache[cache_key] = (datetime.now(), stores)

        logger.info(f"Fetched {len(stores)} live stores")
        return stores

    def _extract_platform(self, name: str) -> str:
        """Extract platform from store name."""
        name_lower = name.lower()
        if "blinkit" in name_lower or "grofers" in name_lower:
            return "Blinkit"
        elif "zepto" in name_lower:
            return "Zepto"
        elif "instamart" in name_lower or "swiggy" in name_lower:
            return "Instamart"
        elif "flipkart" in name_lower:
            return "Flipkart Minutes"
        return "Unknown"

    @retry_on_failure(max_retries=3)
    def fetch_live_traffic(
        self, origin: Tuple[float, float], destination: Tuple[float, float]
    ) -> Dict:
        """
        Fetch live traffic data between two points.

        Args:
            origin: (lat, lng) tuple
            destination: (lat, lng) tuple

        Returns:
            Traffic data including duration in traffic
        """
        url = "https://maps.googleapis.com/maps/api/directions/json"

        params = {
            "origin": f"{origin[0]},{origin[1]}",
            "destination": f"{destination[0]},{destination[1]}",
            "departure_time": "now",
            "traffic_model": "best_guess",
            "key": self.api_key,
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data["status"] == "OK":
                route = data["routes"][0]["legs"][0]

                return {
                    "distance_km": route["distance"]["value"] / 1000,
                    "duration_mins": route["duration"]["value"] / 60,
                    "duration_in_traffic_mins": route.get(
                        "duration_in_traffic", {}
                    ).get("value", 0)
                    / 60,
                    "traffic_delay_mins": (
                        route.get("duration_in_traffic", {}).get("value", 0)
                        - route["duration"]["value"]
                    )
                    / 60,
                    "start_address": route["start_address"],
                    "end_address": route["end_address"],
                }
            else:
                logger.warning(f"Traffic API error: {data['status']}")
                return {}

        except Exception as e:
            logger.error(f"Error fetching traffic data: {e}")
            return {}

    def fetch_heatmap_data(self, bounds: Dict) -> pd.DataFrame:
        """
        Fetch data for heatmap visualization.

        Args:
            bounds: Dict with 'north', 'south', 'east', 'west' keys

        Returns:
            DataFrame with lat, lng, intensity
        """
        # Generate grid points within bounds
        lat_range = np.linspace(bounds["south"], bounds["north"], 50)
        lng_range = np.linspace(bounds["west"], bounds["east"], 50)

        heatmap_data = []

        for lat in lat_range:
            for lng in lng_range:
                # Simulate intensity based on proximity to stores
                # In production, this would be actual order density
                intensity = np.random.uniform(0, 100)

                heatmap_data.append({"lat": lat, "lng": lng, "intensity": intensity})

        return pd.DataFrame(heatmap_data)

    def fetch_nearby_amenities(self, lat: float, lng: float) -> Dict:
        """
        Fetch nearby amenities (restaurants, malls, residential areas).

        Args:
            lat: Latitude
            lng: Longitude

        Returns:
            Dict with counts of different amenity types
        """
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

        amenities = {
            "restaurants": 0,
            "shopping_malls": 0,
            "residential": 0,
            "offices": 0,
        }

        types_to_search = {
            "restaurant": "restaurants",
            "shopping_mall": "shopping_malls",
            "locality": "residential",
            "office": "offices",
        }

        for place_type, key in types_to_search.items():
            params = {
                "location": f"{lat},{lng}",
                "radius": 2000,
                "type": place_type,
                "key": self.api_key,
            }

            try:
                response = requests.get(url, params=params, timeout=10)
                data = response.json()

                if data["status"] == "OK":
                    amenities[key] = len(data.get("results", []))

            except Exception as e:
                logger.error(f"Error fetching {place_type}: {e}")

        return amenities

    def get_live_store_status(self, place_id: str) -> Dict:
        """
        Get live status of a specific store.

        Args:
            place_id: Google Place ID

        Returns:
            Store status including current wait time, popularity
        """
        url = "https://maps.googleapis.com/maps/api/place/details/json"

        params = {
            "place_id": place_id,
            "fields": "name,opening_hours,rating,user_ratings_total,current_opening_hours",
            "key": self.api_key,
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data["status"] == "OK":
                result = data["result"]

                return {
                    "name": result.get("name", ""),
                    "is_open": result.get("opening_hours", {}).get("open_now", False),
                    "rating": result.get("rating", 0),
                    "total_ratings": result.get("user_ratings_total", 0),
                    "popularity": self._calculate_popularity(result),
                }
            else:
                return {}

        except Exception as e:
            logger.error(f"Error fetching store status: {e}")
            return {}

    def _calculate_popularity(self, place_data: Dict) -> str:
        """Calculate popularity level based on ratings."""
        rating = place_data.get("rating", 0)
        total_ratings = place_data.get("user_ratings_total", 0)

        if rating >= 4.5 and total_ratings > 1000:
            return "Very High"
        elif rating >= 4.0 and total_ratings > 500:
            return "High"
        elif rating >= 3.5 and total_ratings > 100:
            return "Medium"
        else:
            return "Low"


# Global instance
live_map_fetcher = LiveMapDataFetcher()
