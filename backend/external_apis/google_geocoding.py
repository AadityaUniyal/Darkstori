"""Google Geocoding API wrapper for converting PIN codes to coordinates."""
import requests
import pandas as pd
import time
from typing import Tuple, Optional
from src.utils.config import GOOGLE_MAPS_API_KEY, PROCESSED_DATA_DIR
from src.utils.helpers import retry_on_failure, rate_limit, logger


class GeocodingAPI:
    """Wrapper for Google Geocoding API."""
    
    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    
    def __init__(self, api_key: str = GOOGLE_MAPS_API_KEY):
        self.api_key = api_key
        if not self.api_key:
            raise ValueError("Google Maps API key not configured")
    
    @retry_on_failure(max_retries=3)
    @rate_limit(calls_per_second=10)  # Stay within free tier limits
    def geocode_pincode(self, pincode: str, city: str = "") -> Tuple[Optional[float], Optional[float]]:
        """
        Convert PIN code to latitude and longitude.
        
        Args:
            pincode: Indian PIN code
            city: Optional city name for better accuracy
            
        Returns:
            Tuple of (latitude, longitude) or (None, None) if failed
        """
        address = f"{pincode}, {city}, India" if city else f"{pincode}, India"
        
        params = {
            "address": address,
            "key": self.api_key,
            "region": "in"  # Bias results to India
        }
        
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if data["status"] == "OK" and data["results"]:
                location = data["results"][0]["geometry"]["location"]
                lat, lng = location["lat"], location["lng"]
                logger.info(f"Geocoded {pincode}: ({lat}, {lng})")
                return lat, lng
            else:
                logger.warning(f"Geocoding failed for {pincode}: {data.get('status')}")
                return None, None
                
        except Exception as e:
            logger.error(f"Error geocoding {pincode}: {e}")
            return None, None
    
    def geocode_dataframe(self, df: pd.DataFrame, pincode_col: str = "pincode", 
                         city_col: str = "city") -> pd.DataFrame:
        """
        Geocode all PIN codes in a DataFrame.
        
        Args:
            df: DataFrame with PIN codes
            pincode_col: Name of PIN code column
            city_col: Name of city column
            
        Returns:
            DataFrame with added latitude and longitude columns
        """
        logger.info(f"Starting geocoding for {len(df)} PIN codes...")
        
        results = []
        for idx, row in df.iterrows():
            pincode = str(row[pincode_col])
            city = row.get(city_col, "")
            lat, lng = self.geocode_pincode(pincode, city)
            results.append({"latitude": lat, "longitude": lng})
            
            if (idx + 1) % 100 == 0:
                logger.info(f"Processed {idx + 1}/{len(df)} PIN codes")
        
        df[["latitude", "longitude"]] = pd.DataFrame(results)
        
        # Remove failed geocodes
        success_count = df["latitude"].notna().sum()
        logger.info(f"Successfully geocoded {success_count}/{len(df)} PIN codes")
        
        return df


def main():
    """Example usage: Geocode sample PIN codes."""
    # Sample PIN codes for testing
    sample_data = pd.DataFrame({
        "pincode": ["110001", "400001", "560001", "600001", "700001"],
        "city": ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"]
    })
    
    geocoder = GeocodingAPI()
    result_df = geocoder.geocode_dataframe(sample_data)
    
    print("\nGeocoding Results:")
    print(result_df)
    
    # Save results
    output_path = PROCESSED_DATA_DIR / "sample_geocoded_pincodes.csv"
    result_df.to_csv(output_path, index=False)
    print(f"\nResults saved to: {output_path}")


if __name__ == "__main__":
    main()
