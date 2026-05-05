"""Google Distance Matrix API for delivery coverage analysis."""
import requests
import pandas as pd
from typing import List, Dict
from src.utils.config import GOOGLE_MAPS_API_KEY
from src.utils.helpers import retry_on_failure, rate_limit, logger


class DistanceMatrixAPI:
    """Wrapper for Google Distance Matrix API."""
    
    BASE_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"
    
    def __init__(self, api_key: str = GOOGLE_MAPS_API_KEY):
        self.api_key = api_key
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
    
    @retry_on_failure(max_retries=3)
    @rate_limit(calls_per_second=5)
    def get_delivery_coverage(self, origin_lat: float, origin_lng: float,
                              destinations: List[Dict[str, float]],
                              mode: str = "driving") -> List[Dict]:
        """
        Calculate delivery distances and times from a dark store to multiple destinations.
        
        Args:
            origin_lat: Dark store latitude
            origin_lng: Dark store longitude
            destinations: List of dicts with 'lat' and 'lng'
            mode: Travel mode ('driving', 'walking', 'bicycling')
            
        Returns:
            List of coverage data for each destination
        """
        # Google API accepts max 25 destinations per request
        batch_size = 25
        all_results = []
        
        for i in range(0, len(destinations), batch_size):
            batch = destinations[i:i + batch_size]
            dest_string = "|".join([f"{d['lat']},{d['lng']}" for d in batch])
            
            params = {
                "origins": f"{origin_lat},{origin_lng}",
                "destinations": dest_string,
                "mode": mode,
                "key": self.api_key
            }
            
            try:
                response = requests.get(self.BASE_URL, params=params, timeout=15)
                response.raise_for_status()
                data = response.json()
                
                if data["status"] == "OK":
                    for idx, element in enumerate(data["rows"][0]["elements"]):
                        result = {
                            "destination_lat": batch[idx]["lat"],
                            "destination_lng": batch[idx]["lng"],
                            "destination_pincode": batch[idx].get("pincode", ""),
                            "status": element["status"]
                        }
                        
                        if element["status"] == "OK":
                            result["distance_meters"] = element["distance"]["value"]
                            result["distance_km"] = element["distance"]["value"] / 1000
                            result["duration_seconds"] = element["duration"]["value"]
                            result["duration_minutes"] = element["duration"]["value"] / 60
                            result["is_serviceable"] = result["distance_km"] <= 5  # 5km radius
                        else:
                            result["distance_meters"] = None
                            result["duration_minutes"] = None
                            result["is_serviceable"] = False
                        
                        all_results.append(result)
                    
                    logger.info(f"Processed batch {i//batch_size + 1}")
                else:
                    logger.warning(f"Distance Matrix API error: {data.get('status')}")
                    
            except Exception as e:
                logger.error(f"Error calculating distances: {e}")
        
        return all_results
    
    def analyze_store_coverage(self, store_lat: float, store_lng: float,
                               pincodes_df: pd.DataFrame) -> pd.DataFrame:
        """
        Analyze which PIN codes a dark store can serve.
        
        Args:
            store_lat: Store latitude
            store_lng: Store longitude
            pincodes_df: DataFrame with PIN codes and coordinates
            
        Returns:
            DataFrame with coverage analysis
        """
        destinations = []
        for _, row in pincodes_df.iterrows():
            destinations.append({
                "lat": row["latitude"],
                "lng": row["longitude"],
                "pincode": row["pincode"]
            })
        
        coverage_data = self.get_delivery_coverage(store_lat, store_lng, destinations)
        coverage_df = pd.DataFrame(coverage_data)
        
        # Merge with original PIN code data
        result = pincodes_df.merge(
            coverage_df,
            left_on="pincode",
            right_on="destination_pincode",
            how="left"
        )
        
        return result


def main():
    """Example usage: Analyze coverage for a sample dark store."""
    # Sample dark store location (Bangalore)
    store_location = {
        "name": "Blinkit Koramangala",
        "lat": 12.9352,
        "lng": 77.6245
    }
    
    # Sample nearby PIN codes
    sample_pincodes = pd.DataFrame({
        "pincode": ["560034", "560095", "560068", "560102", "560029"],
        "city": ["Bangalore"] * 5,
        "latitude": [12.9352, 12.9698, 12.9611, 12.9698, 12.9716],
        "longitude": [77.6245, 77.7499, 77.6387, 77.7499, 77.5946]
    })
    
    api = DistanceMatrixAPI()
    coverage_df = api.analyze_store_coverage(
        store_location["lat"],
        store_location["lng"],
        sample_pincodes
    )
    
    print("\nCoverage Analysis:")
    print(coverage_df[["pincode", "distance_km", "duration_minutes", "is_serviceable"]])
    
    serviceable_count = coverage_df["is_serviceable"].sum()
    print(f"\nServiceable PIN codes: {serviceable_count}/{len(coverage_df)}")


if __name__ == "__main__":
    main()
