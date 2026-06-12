"""Database Seeding Script from CSV Datasets.

Seeds database tables with full-scale generated PIN codes, dark stores, and order metrics.
"""

import os
import sys
import random
import asyncio
import pandas as pd
from datetime import datetime, timedelta, date
from pathlib import Path
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

# Setup python path
PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
BACKEND_DIR = str(Path(__file__).parent.parent)
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.database.connection import init_db, get_async_session, engine
from backend.database.models.models import (
    FocusCity,
    Neighborhood,
    NeighborhoodDNA,
    DarkStore,
    PincodeCoverage,
    OrderSynthetic,
    MarketMetrics,
    CompetitorStore,
    ProductBatch,
    CustomerCohort,
    DeliverySLAMetric,
    CompetitiveMove,
)

async def seed_from_csv():
    print("Starting database seeding from CSV files...")
    
    # 1. Initialize database (create schema if needed)
    await init_db()
    
    async with get_async_session() as db:
        # 2. Clear existing records to avoid constraints conflicts
        print("Clearing existing records...")
        from sqlalchemy import text
        if engine.dialect.name == "postgresql":
            # For PostgreSQL, use CASCADE to handle foreign key dependencies automatically
            tables_to_truncate = [
                "product_batches", "stock_ledger", "orders_synthetic", "dark_stores",
                "competitor_stores", "competitor_pricing", "user_reviews", "market_metrics",
                "api_keys", "refresh_tokens", "users", "organizations",
                "neighborhood_dna", "store_simulations", "inventory_recommendations",
                "pricing_strategies", "store_layouts", "competitive_moves",
                "neighborhoods", "focus_cities", "pincode_coverage",
                "ml_predictions", "ml_performance_metrics", "ml_feature_drift",
                "ml_training_jobs", "placement_scores", "delivery_sla_metrics",
                "customer_cohorts", "economic_projections", "pilot_customers", "audit_logs"
            ]
            for table in tables_to_truncate:
                await db.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
        else:
            # Fallback for SQLite
            await db.execute(delete(ProductBatch))
            await db.execute(delete(DeliverySLAMetric))
            await db.execute(delete(CustomerCohort))
            await db.execute(delete(CompetitiveMove))
            await db.execute(delete(OrderSynthetic))
            await db.execute(delete(DarkStore))
            await db.execute(delete(CompetitorStore))
            await db.execute(delete(PincodeCoverage))
            await db.execute(delete(NeighborhoodDNA))
            await db.execute(delete(Neighborhood))
            await db.execute(delete(FocusCity))
            await db.execute(delete(MarketMetrics))
        await db.commit()
        print("Existing records cleared.")

        # 3. Load CSV files
        print("Loading CSV files...")
        df_pincodes = pd.read_csv("data/raw/india_pincodes.csv")
        df_population = pd.read_csv("data/raw/population_data.csv")
        df_orders = pd.read_csv("data/raw/orders_data.csv")
        df_stores = pd.read_csv("data/external/google_places_stores.csv")
        df_coverage = pd.read_csv("data/external/coverage_data.csv")

        # 4. Seed Focus Cities
        print("Seeding Focus Cities...")
        cities_map = {
            "Bangalore": {"state": "Karnataka", "lat": 12.9716, "lng": 77.5946, "tier": "Metro", "depth": "DEEP"},
            "Delhi": {"state": "Delhi", "lat": 28.6139, "lng": 77.2090, "tier": "Metro", "depth": "DEEP"},
            "Mumbai": {"state": "Maharashtra", "lat": 19.0760, "lng": 72.8777, "tier": "Metro", "depth": "DEEP"},
            "Hyderabad": {"state": "Telangana", "lat": 17.3850, "lng": 78.4867, "tier": "Metro", "depth": "MEDIUM"},
            "Pune": {"state": "Maharashtra", "lat": 18.5204, "lng": 73.8567, "tier": "Tier1", "depth": "MEDIUM"},
        }
        
        db_cities = []
        for idx, (city_name, info) in enumerate(cities_map.items(), 1):
            city_pincodes = len(df_pincodes[df_pincodes["city"] == city_name])
            db_cities.append(FocusCity(
                city_id=idx,
                city_name=city_name,
                state=info["state"],
                analysis_depth=info["depth"],
                total_dark_stores=0, # Will update
                total_neighborhoods=city_pincodes,
                market_maturity="Mature" if info["tier"] == "Metro" else "Growth",
                total_population=12000000 if city_name == "Bangalore" else 16000000 if city_name == "Delhi" else 18000000 if city_name == "Mumbai" else 10000000 if city_name == "Hyderabad" else 7000000,
                total_area_km2=709.0 if city_name == "Bangalore" else 1484.0,
                num_pincodes=city_pincodes
            ))
        db.add_all(db_cities)
        await db.commit()
        print(f"Seeded {len(db_cities)} Focus Cities.")

        # 5. Seed Neighborhoods (one per PIN code for high geospatial resolution)
        print("Seeding Neighborhoods...")
        db_nbhds = []
        pincode_to_nbhd_id = {}
        for idx, row in df_pincodes.iterrows():
            nbhd_id = idx + 1
            pincode = str(row["pincode"]).zfill(6)
            city_name = row["city"]
            city_id = next(c.city_id for c in db_cities if c.city_name == city_name)
            
            pop = int(df_population[df_population["pincode"] == int(pincode)]["population"].iloc[0])
            
            nbhd = Neighborhood(
                neighborhood_id=nbhd_id,
                city_id=city_id,
                neighborhood_name=f"Sector {pincode[-3:]} ({city_name})",
                pincode=pincode,
                population=pop,
                avg_age=28.5,
                avg_household_income=850000.0,
                working_professionals_pct=70.0,
                peak_order_hours={"18-21": 0.45, "08-11": 0.25},
                preferred_categories={"Produce": 0.35, "Dairy": 0.25},
                price_sensitivity="Medium",
                total_stores=0, # Will update
                competition_intensity="Medium",
                market_potential_score=round(random.uniform(5.0, 9.5), 1),
                opportunity_rank=1,
                area_sqkm=5.0,
                population_density=pop / 5.0
            )
            db_nbhds.append(nbhd)
            pincode_to_nbhd_id[pincode] = nbhd_id
            
        db.add_all(db_nbhds)
        await db.commit()
        print(f"Seeded {len(db_nbhds)} Neighborhoods.")

        # 6. Seed Pincode Coverage
        print("Seeding Pincode Coverage...")
        db_pincodes_cov = []
        for idx, row in df_pincodes.iterrows():
            pincode = str(row["pincode"]).zfill(6)
            city_name = row["city"]
            state = row["state"]
            district = row["district"]
            lat = float(row["latitude"])
            lng = float(row["longitude"])
            
            pop = int(df_population[df_population["pincode"] == int(pincode)]["population"].iloc[0])
            cov_row = df_coverage[df_coverage["pincode"] == int(pincode)].iloc[0]
            cov_score = float(cov_row["coverage_score"])
            nearest_dist = float(cov_row["nearest_store_km"])
            
            db_pincodes_cov.append(PincodeCoverage(
                pincode=pincode,
                city=city_name,
                state=state,
                district=district,
                latitude=lat,
                longitude=lng,
                city_tier=cities_map[city_name]["tier"],
                population=pop,
                blinkit=cov_score > 40,
                zepto=cov_score > 55,
                instamart=cov_score > 30,
                flipkart_min=cov_score > 70,
                coverage_score=cov_score,
                nearest_store_distance_km=nearest_dist,
                estimated_daily_orders=int(pop * 0.0025),
                market_potential_score=round(10.0 - (nearest_dist / 1.2), 1),
                competition_intensity=round(cov_score / 15.0, 1)
            ))
        db.add_all(db_pincodes_cov)
        await db.commit()
        print(f"Seeded {len(db_pincodes_cov)} PIN code coverage records.")

        # 7. Seed Dark Stores
        print("Seeding Dark Stores...")
        db_stores = []
        for idx, row in df_stores.iterrows():
            lat = float(row["latitude"])
            lng = float(row["longitude"])
            platform = row["platform"]
            store_name = row["name"]
            
            # Find closest city center
            closest_city = "Bangalore"
            min_dist = 9999.0
            for c_name, c_info in cities_map.items():
                d = ((lat - c_info["lat"])**2 + (lng - c_info["lng"])**2)**0.5
                if d < min_dist:
                    min_dist = d
                    closest_city = c_name
                    
            # Find nearest neighborhood/pincode
            closest_pincode = "560001"
            min_p_dist = 9999.0
            closest_nbhd_id = 1
            city_pincodes = df_pincodes[df_pincodes["city"] == closest_city]
            for _, p_row in city_pincodes.iterrows():
                p_lat = float(p_row["latitude"])
                p_lng = float(p_row["longitude"])
                p_code = str(p_row["pincode"]).zfill(6)
                
                pd_dist = ((lat - p_lat)**2 + (lng - p_lng)**2)**0.5
                if pd_dist < min_p_dist:
                    min_p_dist = pd_dist
                    closest_pincode = p_code
                    closest_nbhd_id = pincode_to_nbhd_id[p_code]
            
            store = DarkStore(
                id=idx + 1,
                platform=platform,
                store_name=store_name,
                store_code=f"ST-{platform[:3].upper()}-{idx+1:03d}",
                city=closest_city,
                pincode=closest_pincode,
                latitude=lat,
                longitude=lng,
                city_tier=cities_map[closest_city]["tier"],
                is_active=True,
                neighborhood_id=closest_nbhd_id,
                estimated_daily_orders=random.randint(180, 450),
                store_type=random.choice(["Standard Hub", "Super Hub", "Mini Hub"]),
                total_orders_served=random.randint(5000, 60000)
            )
            db_stores.append(store)
            
        db.add_all(db_stores)
        await db.commit()
        print(f"Seeded {len(db_stores)} Dark Stores.")
        
        # Update dark store counts in FocusCity and Neighborhoods
        for city in db_cities:
            cnt = len([s for s in db_stores if s.city == city.city_name])
            city.total_dark_stores = cnt
            
        for nbhd in db_nbhds:
            cnt = len([s for s in db_stores if s.neighborhood_id == nbhd.neighborhood_id])
            nbhd.total_stores = cnt
            
        await db.commit()
        print("Updated dark store counts in cities and neighborhoods.")

        # 8. Seed Customer Cohorts (mock data but high quality)
        print("Seeding Customer Cohorts...")
        cohort_months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]
        db_cohorts = []
        for month in cohort_months:
            db_cohorts.append(CustomerCohort(
                cohort_month=month,
                user_count=random.randint(1000, 3000),
                m1_retention=round(random.uniform(65.0, 75.0), 1),
                m2_retention=round(random.uniform(50.0, 58.0), 1),
                m3_retention=round(random.uniform(40.0, 46.0), 1),
                m4_retention=round(random.uniform(32.0, 38.0), 1),
                m5_retention=round(random.uniform(26.0, 32.0), 1),
                m6_retention=round(random.uniform(20.0, 26.0), 1)
            ))
        db.add_all(db_cohorts)
        await db.commit()

        # 9. Seed Market Metrics (aggregated from orders_data.csv)
        print("Seeding Market Metrics daily aggregates...")
        # Group df_orders by order_date and city
        df_orders_grouped = df_orders.merge(df_pincodes[["pincode", "city"]], on="pincode", how="left")
        df_grouped = df_orders_grouped.groupby(["order_date", "city"]).agg(
            total_orders=("order_count", "sum"),
            total_revenue=("total_revenue", "sum")
        ).reset_index()

        db_metrics = []
        for idx, row in df_grouped.iterrows():
            o_date = datetime.strptime(row["order_date"], "%Y-%m-%d").date()
            city = row["city"]
            tot_orders = int(row["total_orders"])
            tot_rev = float(row["total_revenue"])
            
            # Split counts between platforms
            blinkit_share = int(tot_orders * random.uniform(0.3, 0.4))
            zepto_share = int(tot_orders * random.uniform(0.3, 0.4))
            instamart_share = int(tot_orders * random.uniform(0.2, 0.3))
            flipkart_share = tot_orders - (blinkit_share + zepto_share + instamart_share)
            
            db_metrics.append(MarketMetrics(
                metric_date=o_date,
                city=city,
                pincode="All",
                total_orders=tot_orders,
                total_revenue=tot_rev,
                avg_order_value=round(tot_rev / max(1, tot_orders), 2),
                avg_delivery_time=round(random.uniform(11.5, 16.5), 1),
                blinkit_orders=blinkit_share,
                zepto_orders=zepto_share,
                instamart_orders=instamart_share,
                flipkart_orders=max(0, flipkart_share),
                new_customers=int(tot_orders * 0.15),
                repeat_customers=int(tot_orders * 0.85),
                customer_retention_rate=round(random.uniform(0.70, 0.82), 2),
                avg_preparation_time=round(random.uniform(2.5, 4.0), 1),
                order_cancellation_rate=round(random.uniform(0.01, 0.04), 3),
                on_time_delivery_rate=round(random.uniform(0.90, 0.97), 2)
            ))
            
            # Print status periodically
            if len(db_metrics) % 200 == 0:
                db.add_all(db_metrics)
                await db.commit()
                print(f"Seeded {len(db_metrics)} daily metrics rows...")
                db_metrics = []

        if db_metrics:
            db.add_all(db_metrics)
            await db.commit()
        print("Market Metrics daily aggregates seeded.")

        # 10. Seed Order History (OrdersSynthetic - Sample of 5000 transactions for map display)
        print("Seeding a sample of 5000 individual delivery transaction logs for map displays...")
        categories = ["Produce", "Dairy", "Snacks", "Personal Care", "Household", "Baby & Kids", "Instant Food"]
        platforms = ["Blinkit", "Zepto", "Swiggy Instamart", "Flipkart Minutes"]
        weathers = ["Sunny", "Rainy", "Cloudy", "Windy"]
        
        db_orders = []
        for i in range(5000):
            store = random.choice(db_stores)
            order_date = date.today() - timedelta(days=random.randint(0, 45))
            hour = random.randint(7, 23)
            val = round(random.uniform(150, 1100), 2)
            
            order = OrderSynthetic(
                order_number=f"ORD-{order_date.strftime('%y%m%d')}-{i:05d}",
                store_id=store.id,
                pincode=store.pincode,
                delivery_latitude=store.latitude + random.uniform(-0.018, 0.018),
                delivery_longitude=store.longitude + random.uniform(-0.018, 0.018),
                customer_id=f"CUST-{random.randint(1000, 4999)}",
                is_first_order=random.choice([True, False, False, False]),
                platform=store.platform,
                order_date=order_date,
                order_time=datetime.strptime(f"{hour:02d}:00:00", "%H:%M:%S").time(),
                order_datetime=datetime.combine(order_date, datetime.strptime(f"{hour:02d}:00:00", "%H:%M:%S").time()),
                total_items=random.randint(2, 12),
                category=random.choice(categories),
                subtotal=val - 15,
                delivery_fee=10.0,
                discount=0.0,
                tax=5.0,
                order_value=val,
                payment_method=random.choice(["UPI", "Card", "COD"]),
                is_paid=True,
                status="Delivered",
                estimated_delivery_mins=15,
                delivery_mins=random.randint(8, 22),
                delivery_distance_km=random.uniform(0.4, 2.8),
                customer_rating=float(random.randint(3, 5)),
                delivery_rating=float(random.randint(3, 5)),
                is_weekend=order_date.weekday() >= 5,
                hour_of_day=hour,
                neighborhood_id=store.neighborhood_id,
                weather=random.choice(weathers),
            )
            db_orders.append(order)
            
            if len(db_orders) % 1000 == 0:
                db.add_all(db_orders)
                await db.commit()
                print(f"Seeded {len(db_orders)} transaction logs...")
                db_orders = []

        if db_orders:
            db.add_all(db_orders)
            await db.commit()
        print("[OK] Individual delivery transaction logs seeded.")

    print("\nDatabase seeding completed successfully from CSV data!")

if __name__ == "__main__":
    asyncio.run(seed_from_csv())
