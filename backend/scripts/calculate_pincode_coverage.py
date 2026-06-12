"""Recalculate Pincode Coverage dynamically from the database dark stores."""

import os
import sys
import math
import asyncio
import pandas as pd
from pathlib import Path
from sqlalchemy import select

# Setup python path
PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
BACKEND_DIR = str(Path(__file__).parent.parent)
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.database.connection import get_async_session, init_db
from backend.database.models.models import DarkStore, PincodeCoverage

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance in kilometers between two points on the earth."""
    # convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371.0  # Radius of earth in kilometers.
    return c * r

async def calculate_coverage():
    print("Recalculating pincode coverage dynamically...")
    await init_db()

    async with get_async_session() as db:
        # Fetch all active stores
        stores_q = select(DarkStore).where(DarkStore.is_active.is_(True))
        stores = (await db.execute(stores_q)).scalars().all()
        print(f"Loaded {len(stores)} active dark stores from backend.database.")

        # Fetch all pincode coverage rows
        pincodes_q = select(PincodeCoverage)
        pincodes = (await db.execute(pincodes_q)).scalars().all()
        print(f"Loaded {len(pincodes)} pincodes from backend.database.")

        csv_rows = []

        for p in pincodes:
            # Filter stores in the same city for faster distance calculations
            city_stores = [s for s in stores if s.city.lower() == p.city.lower()]
            if not city_stores:
                # Fallback to all stores if no city match
                city_stores = list(stores)

            nearest_dist = 999.0
            platform_min_dists = {
                "Blinkit": 999.0,
                "Zepto": 999.0,
                "Swiggy Instamart": 999.0,
                "Flipkart Minutes": 999.0
            }

            for s in city_stores:
                d = haversine(p.latitude, p.longitude, s.latitude, s.longitude)
                if d < nearest_dist:
                    nearest_dist = d
                
                # Check platform
                plat = s.platform
                if plat in platform_min_dists:
                    if d < platform_min_dists[plat]:
                        platform_min_dists[plat] = d
            
            # Determine platform served status within 3.0 km
            p.blinkit = platform_min_dists["Blinkit"] <= 3.0
            p.zepto = platform_min_dists["Zepto"] <= 3.0
            p.instamart = platform_min_dists["Swiggy Instamart"] <= 3.0
            p.flipkart_min = platform_min_dists["Flipkart Minutes"] <= 3.0

            # Calculate dynamic distance-decayed coverage score
            score = 0.0
            for plat_name, dist in platform_min_dists.items():
                if dist <= 3.0:
                    score += 25.0 * (1.0 - (dist / 3.0))

            p.coverage_score = round(score, 2)
            p.nearest_store_distance_km = round(nearest_dist, 4)

            # Recalculate other derived fields
            p.market_potential_score = round(max(1.0, min(10.0, 10.0 - (nearest_dist / 1.2))), 1)
            p.competition_intensity = round(min(10.0, score / 10.0), 1)

            csv_rows.append({
                "pincode": int(p.pincode),
                "coverage_score": p.coverage_score,
                "nearest_store_km": p.nearest_store_distance_km
            })

        await db.commit()
        print("Database pincode_coverage table updated successfully.")

        # Write to CSV
        csv_path = Path(PROJECT_ROOT) / "data" / "external" / "coverage_data.csv"
        df_new = pd.DataFrame(csv_rows)
        df_new.to_csv(csv_path, index=False)
        print(f"Updated CSV file written successfully to: {csv_path}")

if __name__ == "__main__":
    asyncio.run(calculate_coverage())
