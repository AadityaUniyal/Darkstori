"""Google Places API wrapper for finding dark stores."""

import json
from typing import Dict, List

import pandas as pd
import requests

from backend.core.config import EXTERNAL_DATA_DIR, PLATFORMS, settings
from backend.utils.helpers import logger, rate_limit, retry_on_failure

# Use specific Places API key, fallback to general Maps key
GOOGLE_PLACES_API_KEY = settings.GOOGLE_PLACES_API_KEY or settings.GOOGLE_MAPS_API_KEY


class PlacesAPI:
    """Wrapper for Google Places API."""

    BASE_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

    def __init__(self, api_key: str = GOOGLE_PLACES_API_KEY):
        self.api_key = api_key
        if not self.api_key:
            raise ValueError(
                "Google Places API key not configured. Set GOOGLE_PLACES_API_KEY in .env"
            )

    @retry_on_failure(max_retries=3)
    @rate_limit(calls_per_second=5)
    def find_darkstores_nearby(
        self, lat: float, lng: float, radius_meters: int = 3000, platform: str = None
    ) -> List[Dict]:
        """
        Find dark stores near a location.

        Args:
            lat: Latitude
            lng: Longitude
            radius_meters: Search radius (max 50000)
            platform: Specific platform to search for (optional)

        Returns:
            List of store dictionaries
        """
        keyword = (
            platform
            if platform
            else "Blinkit OR Zepto OR Swiggy Instamart OR Flipkart Minutes"
        )

        params = {
            "location": f"{lat},{lng}",
            "radius": min(radius_meters, 50000),
            "keyword": keyword,
            "type": "store",
            "key": self.api_key,
        }

        try:
            response = requests.get(self.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data["status"] == "OK":
                stores = []
                for place in data.get("results", []):
                    store = {
                        "name": place["name"],
                        "latitude": place["geometry"]["location"]["lat"],
                        "longitude": place["geometry"]["location"]["lng"],
                        "address": place.get("vicinity", ""),
                        "rating": place.get("rating", None),
                        "place_id": place.get("place_id", ""),
                        "platform": self._extract_platform(place["name"]),
                    }
                    stores.append(store)

                logger.info(f"Found {len(stores)} stores near ({lat}, {lng})")
                return stores
            else:
                logger.warning(f"Places API returned status: {data.get('status')}")
                return []

        except Exception as e:
            logger.error(f"Error finding stores: {e}")
            return []

    def _extract_platform(self, store_name: str) -> str:
        """Extract platform name from store name."""
        name_lower = store_name.lower()
        if "blinkit" in name_lower or "grofers" in name_lower:
            return "Blinkit"
        elif "zepto" in name_lower:
            return "Zepto"
        elif "instamart" in name_lower or "swiggy" in name_lower:
            return "Instamart"
        elif "flipkart" in name_lower:
            return "Flipkart Minutes"
        else:
            return "Unknown"

    def search_cities(self, cities: List[Dict[str, float]]) -> pd.DataFrame:
        """
        Search for dark stores in multiple cities.

        Args:
            cities: List of dicts with 'name', 'lat', 'lng'

        Returns:
            DataFrame with all found stores
        """
        all_stores = []

        for city in cities:
            logger.info(f"Searching in {city['name']}...")
            stores = self.find_darkstores_nearby(
                city["lat"], city["lng"], radius_meters=10000
            )

            for store in stores:
                store["city"] = city["name"]
                all_stores.append(store)

        df = pd.DataFrame(all_stores)
        logger.info(f"Total stores found: {len(df)}")

        return df


def main():
    """Example usage: Search for dark stores in major cities."""
    # Sample major Indian cities
    major_cities = [
        {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777},
        {"name": "Delhi", "lat": 28.7041, "lng": 77.1025},
        {"name": "Bangalore", "lat": 12.9716, "lng": 77.5946},
        {"name": "Hyderabad", "lat": 17.3850, "lng": 78.4867},
        {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
        {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639},
        {"name": "Pune", "lat": 18.5204, "lng": 73.8567},
        {"name": "Ahmedabad", "lat": 23.0225, "lng": 72.5714},
    ]

    places_api = PlacesAPI()
    stores_df = places_api.search_cities(major_cities)

    print("\nDark Stores Found:")
    print(stores_df.head(10))
    print(f"\nTotal: {len(stores_df)} stores")
    print(f"\nBy Platform:\n{stores_df['platform'].value_counts()}")

    # Save results
    output_path = EXTERNAL_DATA_DIR / "google_places_stores.csv"
    stores_df.to_csv(output_path, index=False)
    print(f"\nResults saved to: {output_path}")


if __name__ == "__main__":
    main()
