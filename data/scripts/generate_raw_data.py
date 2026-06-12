"""Script to generate realistic synthetic raw data for Darkstori ML training and database seeding."""

import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def main():
    print("Generating raw and external datasets...")

    # Focus cities config
    cities = [
        {"name": "Bangalore", "state": "Karnataka", "district": "Bangalore Urban", "prefix": "5600", "tier": "Metro", "lat": 12.9716, "lng": 77.5946},
        {"name": "Delhi", "state": "Delhi", "district": "South Delhi", "prefix": "1100", "tier": "Metro", "lat": 28.6139, "lng": 77.2090},
        {"name": "Mumbai", "state": "Maharashtra", "district": "Mumbai Suburban", "prefix": "4000", "tier": "Metro", "lat": 19.0760, "lng": 72.8777},
        {"name": "Hyderabad", "state": "Telangana", "district": "Hyderabad", "prefix": "5000", "tier": "Metro", "lat": 17.3850, "lng": 78.4867},
        {"name": "Pune", "state": "Maharashtra", "district": "Pune", "prefix": "4110", "tier": "Tier1", "lat": 18.5204, "lng": 73.8567}
    ]

    pincodes_list = []
    population_list = []
    coverage_list = []
    stores_list = []
    
    # 1. Generate PIN codes (75 per city = 375 total)
    random.seed(42)
    np.random.seed(42)
    
    for city in cities:
        for idx in range(1, 76):
            pincode = f"{city['prefix']}{idx:02d}"
            # Small random offset from city center
            lat_offset = np.random.normal(0, 0.05)
            lng_offset = np.random.normal(0, 0.05)
            lat = city["lat"] + lat_offset
            lng = city["lng"] + lng_offset
            
            pincodes_list.append({
                "pincode": pincode,
                "city": city["name"],
                "state": city["state"],
                "district": city["district"],
                "latitude": lat,
                "longitude": lng
            })
            
            # Population (between 30,000 and 180,000)
            pop = int(np.random.randint(30000, 180000))
            population_list.append({
                "pincode": pincode,
                "population": pop
            })
            
            # Coverage (0 to 100 score, nearest store distance)
            cov_score = float(np.random.uniform(20.0, 98.0))
            dist = float(np.random.uniform(0.2, 7.5))
            coverage_list.append({
                "pincode": pincode,
                "coverage_score": cov_score,
                "nearest_store_km": dist
            })

    df_pincodes = pd.DataFrame(pincodes_list)
    df_population = pd.DataFrame(population_list)
    df_coverage = pd.DataFrame(coverage_list)

    # 2. Generate Google Places Stores (competitors & existing stores)
    platforms = ["Blinkit", "Zepto", "Swiggy Instamart", "BigBasket", "Dunzo"]
    store_types = ["Hub", "Super Hub", "Mini Hub", "Standard Store"]
    
    for city in cities:
        for i in range(1, 41):
            plat = random.choice(platforms)
            st_type = random.choice(store_types)
            lat_offset = np.random.normal(0, 0.04)
            lng_offset = np.random.normal(0, 0.04)
            lat = city["lat"] + lat_offset
            lng = city["lng"] + lng_offset
            
            stores_list.append({
                "name": f"{plat} {city['name']} {st_type} {i}",
                "latitude": lat,
                "longitude": lng,
                "platform": plat
            })
            
    df_stores = pd.DataFrame(stores_list)

    # 3. Generate Historical Order Data (orders_data.csv)
    # Generate 90 days of order logs for each PIN code
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=90)
    
    orders_records = []
    
    print("Generating 90 days of daily order logs for each PIN code...")
    
    # We will simulate a daily order aggregation per PIN code per platform
    # to match the time-series model structure
    for pincode_obj in pincodes_list:
        pincode = pincode_obj["pincode"]
        city_name = pincode_obj["city"]
        lat = pincode_obj["latitude"]
        lng = pincode_obj["longitude"]
        
        # Get city details
        city_info = next(c for c in cities if c["name"] == city_name)
        tier = city_info["tier"]
        
        # Base demand influenced by population
        pop = next(p["population"] for p in population_list if p["pincode"] == pincode)
        base_daily_orders = int(pop * 0.002) + random.randint(10, 50)
        
        # Select 1-2 active platforms for this pincode
        active_plats = random.sample(platforms, k=random.randint(1, 2))
        
        current_date = start_date
        while current_date <= end_date:
            # Multipliers for seasonality, day of week
            weekday = current_date.weekday()
            is_weekend_val = 1 if weekday >= 5 else 0
            day_mult = 1.25 if is_weekend_val else 0.95
            
            # Monthly factors
            month = current_date.month
            monthly_factors = {
                1: 1.05, 2: 0.98, 3: 1.02, 4: 1.12, 5: 1.15, 6: 1.05,
                7: 1.02, 8: 1.08, 9: 1.15, 10: 1.30, 11: 1.25, 12: 1.20
            }
            month_mult = monthly_factors.get(month, 1.0)
            
            # Weather factor simulation (more orders on rainy days)
            # Simulated weather: 15% rainy
            is_rainy = random.random() < 0.15
            weather_mult = 1.35 if is_rainy else 1.0
            
            for plat in active_plats:
                # Add noise
                noise = np.random.normal(0, 10)
                order_count = int(max(5, (base_daily_orders * day_mult * month_mult * weather_mult) + noise))
                
                # AOV (Average Order Value) around ₹350
                aov = random.uniform(250, 450)
                total_rev = round(order_count * aov, 2)
                
                orders_records.append({
                    "pincode": pincode,
                    "order_date": current_date.strftime("%Y-%m-%d"),
                    "order_count": order_count,
                    "total_revenue": total_rev,
                    "platform": plat,
                    "city_tier": tier
                })
                
            current_date += timedelta(days=1)

    df_orders = pd.DataFrame(orders_records)

    # 4. Save to directories
    os.makedirs("data/raw", exist_ok=True)
    os.makedirs("data/external", exist_ok=True)
    
    df_pincodes.to_csv("data/raw/india_pincodes.csv", index=False)
    df_population.to_csv("data/raw/population_data.csv", index=False)
    df_orders.to_csv("data/raw/orders_data.csv", index=False)
    df_stores.to_csv("data/external/google_places_stores.csv", index=False)
    df_coverage.to_csv("data/external/coverage_data.csv", index=False)
    
    print(f"Saved {len(df_pincodes)} PIN codes to data/raw/india_pincodes.csv")
    print(f"Saved {len(df_population)} population records to data/raw/population_data.csv")
    print(f"Saved {len(df_orders)} order logs to data/raw/orders_data.csv")
    print(f"Saved {len(df_stores)} competitor stores to data/external/google_places_stores.csv")
    print(f"Saved {len(df_coverage)} coverage records to data/external/coverage_data.csv")
    print("All synthetic datasets generated successfully!")

if __name__ == "__main__":
    main()
