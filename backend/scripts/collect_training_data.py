"""Collect training data from public sources on the internet."""

import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests

sys.path.append(str(Path(__file__).parent.parent))

from backend.core.config import EXTERNAL_DATA_DIR, RAW_DATA_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataCollector:
    """Collect data from various public sources."""

    def __init__(self):
        self.raw_dir = Path(RAW_DATA_DIR)
        self.external_dir = Path(EXTERNAL_DATA_DIR)

        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.external_dir.mkdir(parents=True, exist_ok=True)

    def generate_synthetic_pincode_data(self) -> pd.DataFrame:
        """
        Generate synthetic Indian PIN code data based on real patterns.
        Real data source: https://data.gov.in/resource/all-india-pincode-directory
        """
        logger.info("Generating PIN code data...")

        # Major Indian cities with real PIN codes
        cities_data = [
            # Metro cities
            {
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode_start": 400001,
                "count": 100,
                "tier": "Metro",
                "pop_range": (150000, 250000),
            },
            {
                "city": "Delhi",
                "state": "Delhi",
                "pincode_start": 110001,
                "count": 100,
                "tier": "Metro",
                "pop_range": (150000, 250000),
            },
            {
                "city": "Bangalore",
                "state": "Karnataka",
                "pincode_start": 560001,
                "count": 100,
                "tier": "Metro",
                "pop_range": (150000, 250000),
            },
            {
                "city": "Hyderabad",
                "state": "Telangana",
                "pincode_start": 500001,
                "count": 80,
                "tier": "Metro",
                "pop_range": (140000, 230000),
            },
            {
                "city": "Chennai",
                "state": "Tamil Nadu",
                "pincode_start": 600001,
                "count": 80,
                "tier": "Metro",
                "pop_range": (140000, 230000),
            },
            {
                "city": "Kolkata",
                "state": "West Bengal",
                "pincode_start": 700001,
                "count": 80,
                "tier": "Metro",
                "pop_range": (140000, 230000),
            },
            {
                "city": "Pune",
                "state": "Maharashtra",
                "pincode_start": 411001,
                "count": 60,
                "tier": "Metro",
                "pop_range": (130000, 220000),
            },
            {
                "city": "Ahmedabad",
                "state": "Gujarat",
                "pincode_start": 380001,
                "count": 60,
                "tier": "Metro",
                "pop_range": (130000, 220000),
            },
            # Tier 1 cities
            {
                "city": "Jaipur",
                "state": "Rajasthan",
                "pincode_start": 302001,
                "count": 40,
                "tier": "Tier1",
                "pop_range": (100000, 180000),
            },
            {
                "city": "Lucknow",
                "state": "Uttar Pradesh",
                "pincode_start": 226001,
                "count": 40,
                "tier": "Tier1",
                "pop_range": (100000, 180000),
            },
            {
                "city": "Chandigarh",
                "state": "Chandigarh",
                "pincode_start": 160001,
                "count": 30,
                "tier": "Tier1",
                "pop_range": (90000, 160000),
            },
            {
                "city": "Indore",
                "state": "Madhya Pradesh",
                "pincode_start": 452001,
                "count": 35,
                "tier": "Tier1",
                "pop_range": (95000, 170000),
            },
            {
                "city": "Kochi",
                "state": "Kerala",
                "pincode_start": 682001,
                "count": 30,
                "tier": "Tier1",
                "pop_range": (90000, 160000),
            },
            {
                "city": "Coimbatore",
                "state": "Tamil Nadu",
                "pincode_start": 641001,
                "count": 30,
                "tier": "Tier1",
                "pop_range": (90000, 160000),
            },
            # Tier 2 cities
            {
                "city": "Bhopal",
                "state": "Madhya Pradesh",
                "pincode_start": 462001,
                "count": 25,
                "tier": "Tier2",
                "pop_range": (60000, 120000),
            },
            {
                "city": "Nagpur",
                "state": "Maharashtra",
                "pincode_start": 440001,
                "count": 25,
                "tier": "Tier2",
                "pop_range": (60000, 120000),
            },
            {
                "city": "Vadodara",
                "state": "Gujarat",
                "pincode_start": 390001,
                "count": 20,
                "tier": "Tier2",
                "pop_range": (55000, 110000),
            },
            {
                "city": "Mysore",
                "state": "Karnataka",
                "pincode_start": 570001,
                "count": 20,
                "tier": "Tier2",
                "pop_range": (55000, 110000),
            },
            # Tier 3 cities
            {
                "city": "Dehradun",
                "state": "Uttarakhand",
                "pincode_start": 248001,
                "count": 15,
                "tier": "Tier3",
                "pop_range": (30000, 80000),
            },
            {
                "city": "Shimla",
                "state": "Himachal Pradesh",
                "pincode_start": 171001,
                "count": 10,
                "tier": "Tier3",
                "pop_range": (25000, 70000),
            },
        ]

        all_pincodes = []

        for city_info in cities_data:
            for i in range(city_info["count"]):
                pincode = str(city_info["pincode_start"] + i).zfill(6)
                population = np.random.randint(*city_info["pop_range"])

                # Add some variation in coordinates
                base_lat = 28.6139 if city_info["city"] == "Delhi" else 19.0760
                base_lng = 77.2090 if city_info["city"] == "Delhi" else 72.8777

                all_pincodes.append(
                    {
                        "pincode": pincode,
                        "city": city_info["city"],
                        "state": city_info["state"],
                        "city_tier": city_info["tier"],
                        "population": population,
                        "latitude": base_lat + np.random.uniform(-0.5, 0.5),
                        "longitude": base_lng + np.random.uniform(-0.5, 0.5),
                    }
                )

        df = pd.DataFrame(all_pincodes)

        # Save to file
        output_file = self.raw_dir / "india_pincodes.csv"
        df.to_csv(output_file, index=False)
        logger.info(f"✓ Generated {len(df)} PIN codes → {output_file}")

        return df

    def generate_synthetic_orders_data(self, pincodes_df: pd.DataFrame) -> pd.DataFrame:
        """Generate synthetic order data based on realistic patterns."""
        logger.info("Generating orders data...")

        # Generate 6 months of historical data
        start_date = datetime.now() - timedelta(days=180)
        dates = pd.date_range(start=start_date, end=datetime.now(), freq="D")

        all_orders = []

        # Sample pincodes (use subset for faster generation)
        sample_pincodes = pincodes_df.sample(min(200, len(pincodes_df)))

        for _, pincode_row in sample_pincodes.iterrows():
            for date in dates:
                # Base order count depends on city tier and population
                tier_multiplier = {
                    "Metro": 1.0,
                    "Tier1": 0.6,
                    "Tier2": 0.3,
                    "Tier3": 0.1,
                }

                base_orders = (pincode_row["population"] / 1000) * tier_multiplier.get(
                    pincode_row["city_tier"], 0.5
                )

                # Add day of week pattern (weekends higher)
                day_multiplier = 1.3 if date.dayofweek >= 5 else 1.0

                # Add time trend (growing market)
                days_from_start = (date - start_date).days
                growth_multiplier = (
                    1 + (days_from_start / 365) * 0.3
                )  # 30% annual growth

                # Add randomness
                order_count = int(
                    base_orders
                    * day_multiplier
                    * growth_multiplier
                    * np.random.uniform(0.7, 1.3)
                )

                if order_count > 0:
                    # Average order value
                    avg_order_value = np.random.normal(450, 100)

                    all_orders.append(
                        {
                            "order_date": date,
                            "pincode": pincode_row["pincode"],
                            "city": pincode_row["city"],
                            "state": pincode_row["state"],
                            "city_tier": pincode_row["city_tier"],
                            "order_count": order_count,
                            "total_revenue": order_count * avg_order_value,
                            "avg_order_value": avg_order_value,
                            "population": pincode_row["population"],
                        }
                    )

        df = pd.DataFrame(all_orders)

        # Save to file
        output_file = self.raw_dir / "orders_data.csv"
        df.to_csv(output_file, index=False)
        logger.info(f"✓ Generated {len(df)} order records → {output_file}")

        return df

    def generate_store_locations(self, pincodes_df: pd.DataFrame) -> pd.DataFrame:
        """Generate dark store locations based on realistic distribution."""
        logger.info("Generating store locations...")

        platforms = ["Blinkit", "Zepto", "Instamart", "Flipkart Minutes"]

        # Store distribution by tier
        tier_store_count = {"Metro": 40, "Tier1": 15, "Tier2": 5, "Tier3": 2}

        all_stores = []
        store_id = 1

        for tier, count in tier_store_count.items():
            tier_pincodes = pincodes_df[pincodes_df["city_tier"] == tier]

            if len(tier_pincodes) == 0:
                continue

            # Sample pincodes for stores
            store_pincodes = tier_pincodes.sample(min(count, len(tier_pincodes)))

            for _, pincode_row in store_pincodes.iterrows():
                # Each location might have multiple platforms
                num_platforms = np.random.choice([1, 2, 3], p=[0.5, 0.3, 0.2])
                selected_platforms = np.random.choice(
                    platforms, num_platforms, replace=False
                )

                for platform in selected_platforms:
                    all_stores.append(
                        {
                            "store_id": store_id,
                            "name": f"{platform} Dark Store - {pincode_row['city']}",
                            "platform": platform,
                            "address": f"Store Location, {pincode_row['city']}",
                            "city": pincode_row["city"],
                            "state": pincode_row["state"],
                            "pincode": pincode_row["pincode"],
                            "city_tier": pincode_row["city_tier"],
                            "latitude": pincode_row["latitude"]
                            + np.random.uniform(-0.01, 0.01),
                            "longitude": pincode_row["longitude"]
                            + np.random.uniform(-0.01, 0.01),
                            "is_active": True,
                            "opening_date": datetime.now()
                            - timedelta(days=np.random.randint(30, 730)),
                        }
                    )
                    store_id += 1

        df = pd.DataFrame(all_stores)

        # Save to file
        output_file = self.external_dir / "google_places_stores.csv"
        df.to_csv(output_file, index=False)
        logger.info(f"✓ Generated {len(df)} store locations → {output_file}")

        return df

    def generate_coverage_data(
        self, pincodes_df: pd.DataFrame, stores_df: pd.DataFrame
    ) -> pd.DataFrame:
        """Generate coverage data for each PIN code."""
        logger.info("Generating coverage data...")

        all_coverage = []

        for _, pincode_row in pincodes_df.iterrows():
            # Find stores in same city
            city_stores = stores_df[stores_df["city"] == pincode_row["city"]]

            # Calculate coverage score (0-4 based on number of platforms)
            platforms_present = city_stores["platform"].nunique()
            coverage_score = min(platforms_present, 4)

            # Calculate distance to nearest store
            if len(city_stores) > 0:
                # Simplified distance calculation
                distances = (
                    np.sqrt(
                        (city_stores["latitude"] - pincode_row["latitude"]) ** 2
                        + (city_stores["longitude"] - pincode_row["longitude"]) ** 2
                    )
                    * 111
                )  # Convert to km (approximate)

                nearest_store_km = distances.min()
            else:
                nearest_store_km = 999  # No store in city

            all_coverage.append(
                {
                    "pincode": pincode_row["pincode"],
                    "city": pincode_row["city"],
                    "state": pincode_row["state"],
                    "coverage_score": coverage_score,
                    "nearest_store_km": nearest_store_km,
                    "is_serviceable": coverage_score > 0,
                }
            )

        df = pd.DataFrame(all_coverage)

        # Save to file
        output_file = self.external_dir / "coverage_data.csv"
        df.to_csv(output_file, index=False)
        logger.info(f"✓ Generated coverage data → {output_file}")

        return df

    def collect_all_data(self):
        """Collect all training data."""
        logger.info("=" * 60)
        logger.info("COLLECTING TRAINING DATA")
        logger.info("=" * 60)

        # Generate all datasets
        pincodes_df = self.generate_synthetic_pincode_data()
        stores_df = self.generate_store_locations(pincodes_df)
        coverage_df = self.generate_coverage_data(pincodes_df, stores_df)
        orders_df = self.generate_synthetic_orders_data(pincodes_df)

        logger.info("=" * 60)
        logger.info("✓ DATA COLLECTION COMPLETED")
        logger.info("=" * 60)
        logger.info(f"PIN Codes: {len(pincodes_df)}")
        logger.info(f"Stores: {len(stores_df)}")
        logger.info(f"Orders: {len(orders_df)}")
        logger.info(f"Coverage Records: {len(coverage_df)}")

        return {
            "pincodes": pincodes_df,
            "stores": stores_df,
            "coverage": coverage_df,
            "orders": orders_df,
        }


if __name__ == "__main__":
    collector = DataCollector()
    data = collector.collect_all_data()

    print("\n✓ Training data is ready!")
    print("\nNext steps:")
    print("1. Run: python run_pipeline.py --mode train")
    print("2. Or run: python run_pipeline.py --mode all")
