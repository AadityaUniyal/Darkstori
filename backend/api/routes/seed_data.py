"""Seed Data API Route.

Seeds the database with mock and scraped data for cities,
neighborhoods, dark stores, pincodes, and metrics.
"""

import random
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.database.connection import get_db
from backend.database.models.models import (
    FocusCity,
    Neighborhood,
    NeighborhoodDNA,
    DarkStore,
    PincodeCoverage,
    OrderSynthetic,
    CompetitorPricing,
    UserReview,
    MarketMetrics,
    DeliverySLAMetric,
    CustomerCohort,
    ProductBatch,
    CompetitiveMove,
    CompetitorStore,
)

router = APIRouter()


@router.post("/seed-data")
async def seed_database(db: AsyncSession = Depends(get_db)):
    """Seed the database with complete set of demo and analysis data."""
    try:
        logger.info("Starting database seeding...")

        # 1. Clear existing data to avoid conflicts
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
        await db.execute(delete(UserReview))
        await db.execute(delete(CompetitorPricing))
        await db.commit()

        # 2. Seed Focus Cities
        cities = [
            FocusCity(city_id=1, city_name="Bangalore", state="Karnataka", analysis_depth="DEEP", total_dark_stores=12, total_neighborhoods=24, market_maturity="Mature", total_population=12000000, total_area_km2=709.0, num_pincodes=150),
            FocusCity(city_id=2, city_name="Delhi", state="Delhi", analysis_depth="DEEP", total_dark_stores=8, total_neighborhoods=16, market_maturity="Mature", total_population=16000000, total_area_km2=1484.0, num_pincodes=220),
            FocusCity(city_id=3, city_name="Mumbai", state="Maharashtra", analysis_depth="DEEP", total_dark_stores=10, total_neighborhoods=20, market_maturity="Mature", total_population=18000000, total_area_km2=603.0, num_pincodes=180),
            FocusCity(city_id=4, city_name="Hyderabad", state="Telangana", analysis_depth="MEDIUM", total_dark_stores=7, total_neighborhoods=15, market_maturity="Growth", total_population=10000000, total_area_km2=625.0, num_pincodes=110),
            FocusCity(city_id=5, city_name="Pune", state="Maharashtra", analysis_depth="MEDIUM", total_dark_stores=5, total_neighborhoods=10, market_maturity="Growth", total_population=7000000, total_area_km2=331.0, num_pincodes=85),
        ]
        db.add_all(cities)
        await db.commit()

        # 3. Seed Neighborhoods
        nbhds = [
            # Bangalore (city_id 1)
            Neighborhood(neighborhood_id=1, city_id=1, neighborhood_name="Koramangala", pincode="560034", population=150000, avg_age=28.5, avg_household_income=950000.0, working_professionals_pct=72.0, peak_order_hours={"18-21": 0.45, "08-11": 0.25}, preferred_categories={"Produce": 0.35, "Dairy": 0.25}, price_sensitivity="Low", total_stores=3, competition_intensity="High", market_potential_score=9.2, opportunity_rank=1, area_sqkm=5.5, population_density=27272.7),
            Neighborhood(neighborhood_id=2, city_id=1, neighborhood_name="Indiranagar", pincode="560038", population=120000, avg_age=29.2, avg_household_income=1100000.0, working_professionals_pct=68.0, peak_order_hours={"18-21": 0.40, "08-11": 0.30}, preferred_categories={"Organic F&V": 0.38, "Gourmet": 0.22}, price_sensitivity="Low", total_stores=4, competition_intensity="High", market_potential_score=8.9, opportunity_rank=2, area_sqkm=4.8, population_density=25000.0),
            Neighborhood(neighborhood_id=3, city_id=1, neighborhood_name="HSR Layout", pincode="560102", population=180000, avg_age=27.8, avg_household_income=850000.0, working_professionals_pct=75.0, peak_order_hours={"18-21": 0.50, "11-14": 0.20}, preferred_categories={"Snacks": 0.30, "Dairy": 0.28}, price_sensitivity="Medium", total_stores=3, competition_intensity="Medium", market_potential_score=8.2, opportunity_rank=3, area_sqkm=6.2, population_density=29032.2),
            Neighborhood(neighborhood_id=4, city_id=1, neighborhood_name="Whitefield", pincode="560066", population=220000, avg_age=30.1, avg_household_income=1200000.0, working_professionals_pct=80.0, peak_order_hours={"18-21": 0.42, "08-11": 0.28}, preferred_categories={"Groceries": 0.40, "Personal Care": 0.20}, price_sensitivity="Low", total_stores=2, competition_intensity="Medium", market_potential_score=7.9, opportunity_rank=4, area_sqkm=12.0, population_density=18333.3),
            
            # Delhi (city_id 2)
            Neighborhood(neighborhood_id=5, city_id=2, neighborhood_name="Saket", pincode="110017", population=140000, avg_age=31.0, avg_household_income=1200000.0, working_professionals_pct=60.0, peak_order_hours={"18-21": 0.45}, preferred_categories={"Produce": 0.35}, price_sensitivity="Low", total_stores=2, competition_intensity="Medium", market_potential_score=9.0, opportunity_rank=1, area_sqkm=5.0, population_density=28000.0),
            Neighborhood(neighborhood_id=6, city_id=2, neighborhood_name="Connaught Place", pincode="110001", population=80000, avg_age=33.5, avg_household_income=1500000.0, working_professionals_pct=85.0, peak_order_hours={"12-15": 0.50}, preferred_categories={"Snacks": 0.40}, price_sensitivity="Low", total_stores=1, competition_intensity="Low", market_potential_score=7.1, opportunity_rank=2, area_sqkm=3.0, population_density=26666.7),
            
            # Mumbai (city_id 3)
            Neighborhood(neighborhood_id=7, city_id=3, neighborhood_name="Andheri West", pincode="400053", population=250000, avg_age=30.5, avg_household_income=1000000.0, working_professionals_pct=65.0, peak_order_hours={"18-21": 0.40}, preferred_categories={"Produce": 0.30}, price_sensitivity="Medium", total_stores=4, competition_intensity="High", market_potential_score=8.5, opportunity_rank=1, area_sqkm=7.5, population_density=33333.3),
            Neighborhood(neighborhood_id=8, city_id=3, neighborhood_name="Bandra West", pincode="400050", population=160000, avg_age=31.2, avg_household_income=1400000.0, working_professionals_pct=70.0, peak_order_hours={"18-21": 0.42}, preferred_categories={"Organic F&V": 0.40}, price_sensitivity="Low", total_stores=3, competition_intensity="High", market_potential_score=8.0, opportunity_rank=2, area_sqkm=4.5, population_density=35555.6),
            
            # Hyderabad (city_id 4)
            Neighborhood(neighborhood_id=9, city_id=4, neighborhood_name="Hitech City", pincode="500081", population=200000, avg_age=26.5, avg_household_income=900000.0, working_professionals_pct=80.0, peak_order_hours={"18-21": 0.50}, preferred_categories={"Dairy": 0.30}, price_sensitivity="Medium", total_stores=2, competition_intensity="Medium", market_potential_score=8.8, opportunity_rank=1, area_sqkm=8.0, population_density=25000.0),
            Neighborhood(neighborhood_id=10, city_id=4, neighborhood_name="Gachibowli", pincode="500032", population=180000, avg_age=27.2, avg_household_income=880000.0, working_professionals_pct=78.0, peak_order_hours={"18-21": 0.48}, preferred_categories={"Produce": 0.32}, price_sensitivity="Medium", total_stores=2, competition_intensity="Medium", market_potential_score=8.0, opportunity_rank=2, area_sqkm=9.0, population_density=20000.0),
            
            # Pune (city_id 5)
            Neighborhood(neighborhood_id=11, city_id=5, neighborhood_name="Koregaon Park", pincode="411001", population=90000, avg_age=29.0, avg_household_income=1050000.0, working_professionals_pct=75.0, peak_order_hours={"18-21": 0.42}, preferred_categories={"Gourmet": 0.35}, price_sensitivity="Low", total_stores=1, competition_intensity="Low", market_potential_score=7.4, opportunity_rank=1, area_sqkm=3.5, population_density=25714.3),
        ]
        db.add_all(nbhds)
        await db.commit()

        # 4. Seed Neighborhood DNA
        dna_profiles = [
            NeighborhoodDNA(dna_id=1, neighborhood_id=1, dominant_demographic="Young Professionals", lifestyle_profile="Tech-savvy, late-night ordering, high organic produce demand", opportunity_score=9.2, primary_order_hours={"evening": "18:00-21:00"}),
            NeighborhoodDNA(dna_id=2, neighborhood_id=2, dominant_demographic="Affluent Families", lifestyle_profile="Gourmet foods, bulk purchases, breakfast & evening peak times", opportunity_score=8.9, primary_order_hours={"evening": "18:00-21:00", "morning": "08:00-11:00"}),
            NeighborhoodDNA(dna_id=3, neighborhood_id=3, dominant_demographic="Students & Techies", lifestyle_profile="Budget snack/instant meals, highest weekend orders", opportunity_score=8.2, primary_order_hours={"night": "20:00-23:00"}),
            NeighborhoodDNA(dna_id=4, neighborhood_id=4, dominant_demographic="IT Professionals", lifestyle_profile="Convenience focus, mid-to-high ticket size orders", opportunity_score=7.9, primary_order_hours={"evening": "18:00-21:00"}),
            NeighborhoodDNA(dna_id=5, neighborhood_id=5, dominant_demographic="Premium Household", lifestyle_profile="High price ceiling, demand for express 10-min slot", opportunity_score=9.0, primary_order_hours={"evening": "18:00-21:00"}),
        ]
        db.add_all(dna_profiles)
        await db.commit()

        # 5. Seed Pincode Coverage
        pincodes = [
            # Bangalore
            PincodeCoverage(pincode="560034", city="Bangalore", state="Karnataka", district="Bangalore Urban", latitude=12.9345, longitude=77.6266, blinkit=True, zepto=True, instamart=True, coverage_score=85.0, nearest_store_distance_km=0.8, population=150000, market_potential_score=9.2),
            PincodeCoverage(pincode="560038", city="Bangalore", state="Karnataka", district="Bangalore Urban", latitude=12.9719, longitude=77.6412, blinkit=True, zepto=True, instamart=True, coverage_score=90.0, nearest_store_distance_km=0.5, population=120000, market_potential_score=8.9),
            PincodeCoverage(pincode="560102", city="Bangalore", state="Karnataka", district="Bangalore Urban", latitude=12.9103, longitude=77.6436, blinkit=True, zepto=True, instamart=True, coverage_score=80.0, nearest_store_distance_km=1.2, population=180000, market_potential_score=8.2),
            PincodeCoverage(pincode="560066", city="Bangalore", state="Karnataka", district="Bangalore Urban", latitude=12.9698, longitude=77.7499, blinkit=True, zepto=False, instamart=True, coverage_score=60.0, nearest_store_distance_km=2.4, population=220000, market_potential_score=7.9),
            
            # Delhi
            PincodeCoverage(pincode="110017", city="Delhi", state="Delhi", district="South Delhi", latitude=28.5244, longitude=77.2166, blinkit=True, zepto=True, instamart=False, coverage_score=75.0, nearest_store_distance_km=1.5, population=140000, market_potential_score=9.0),
            PincodeCoverage(pincode="110001", city="Delhi", state="Delhi", district="New Delhi", latitude=28.6304, longitude=77.2177, blinkit=False, zepto=True, instamart=False, coverage_score=45.0, nearest_store_distance_km=2.8, population=80000, market_potential_score=7.1),
            
            # Mumbai
            PincodeCoverage(pincode="400053", city="Mumbai", state="Maharashtra", district="Mumbai Suburban", latitude=19.1293, longitude=72.8271, blinkit=True, zepto=True, instamart=True, coverage_score=85.0, nearest_store_distance_km=0.9, population=250000, market_potential_score=8.5),
            PincodeCoverage(pincode="400050", city="Mumbai", state="Maharashtra", district="Mumbai Suburban", latitude=19.0544, longitude=72.8402, blinkit=True, zepto=True, instamart=True, coverage_score=80.0, nearest_store_distance_km=1.1, population=160000, market_potential_score=8.0),
        ]
        db.add_all(pincodes)
        await db.commit()

        # 6. Seed Dark Stores
        stores = [
            # Bangalore (Koramangala)
            DarkStore(id=1, platform="Zepto", store_name="Zepto Koramangala Hub", store_code="Z-BLR-KOR", city="Bangalore", pincode="560034", latitude=12.9345, longitude=77.6266, neighborhood_id=1, is_active=True, estimated_daily_orders=380, store_type="Super Hub", total_orders_served=45000),
            DarkStore(id=2, platform="Blinkit", store_name="Blinkit Koramangala South", store_code="B-BLR-KOR", city="Bangalore", pincode="560034", latitude=12.9280, longitude=77.6220, neighborhood_id=1, is_active=True, estimated_daily_orders=310, store_type="Standard Hub", total_orders_served=32000),
            DarkStore(id=3, platform="Swiggy Instamart", store_name="Instamart Koramangala North", store_code="I-BLR-KOR", city="Bangalore", pincode="560034", latitude=12.9410, longitude=77.6320, neighborhood_id=1, is_active=True, estimated_daily_orders=290, store_type="Standard Hub", total_orders_served=29000),
            
            # Bangalore (Indiranagar)
            DarkStore(id=4, platform="Zepto", store_name="Zepto Indiranagar West", store_code="Z-BLR-IND", city="Bangalore", pincode="560038", latitude=12.9719, longitude=77.6412, neighborhood_id=2, is_active=True, estimated_daily_orders=420, store_type="Super Hub", total_orders_served=58000),
            DarkStore(id=5, platform="Blinkit", store_name="Blinkit Indiranagar Central", store_code="B-BLR-IND", city="Bangalore", pincode="560038", latitude=12.9760, longitude=77.6480, neighborhood_id=2, is_active=True, estimated_daily_orders=350, store_type="Standard Hub", total_orders_served=41000),
            
            # Delhi
            DarkStore(id=6, platform="Blinkit", store_name="Blinkit Saket Mall", store_code="B-DEL-SAK", city="Delhi", pincode="110017", latitude=28.5244, longitude=77.2166, neighborhood_id=5, is_active=True, estimated_daily_orders=390, store_type="Super Hub", total_orders_served=49000),
            DarkStore(id=7, platform="Zepto", store_name="Zepto Saket Hub", store_code="Z-DEL-SAK", city="Delhi", pincode="110017", latitude=28.5210, longitude=77.2210, neighborhood_id=5, is_active=True, estimated_daily_orders=340, store_type="Standard Hub", total_orders_served=36000),
            
            # Mumbai
            DarkStore(id=8, platform="Swiggy Instamart", store_name="Instamart Andheri Central", store_code="I-BOM-AND", city="Mumbai", pincode="400053", latitude=19.1293, longitude=72.8271, neighborhood_id=7, is_active=True, estimated_daily_orders=410, store_type="Super Hub", total_orders_served=52000),
        ]
        db.add_all(stores)
        await db.commit()

        # 7. Seed Competitor Stores
        comp_stores = [
            CompetitorStore(platform="Blinkit", store_name="Blinkit Indiranagar East", latitude=12.9785, longitude=77.6530, city="Bangalore", is_active=True),
            CompetitorStore(platform="Zepto", store_name="Zepto Koramangala Ring Road", latitude=12.9245, longitude=77.6180, city="Bangalore", is_active=True),
            CompetitorStore(platform="Swiggy Instamart", store_name="Instamart Saket Extension", latitude=28.5280, longitude=77.2250, city="Delhi", is_active=True),
        ]
        db.add_all(comp_stores)
        await db.commit()

        # 8. Seed Customer Cohorts
        cohorts = [
            CustomerCohort(cohort_month="2025-01", user_count=1200, m1_retention=68.0, m2_retention=52.0, m3_retention=41.0, m4_retention=35.0, m5_retention=30.0, m6_retention=26.0),
            CustomerCohort(cohort_month="2025-02", user_count=1450, m1_retention=72.0, m2_retention=55.0, m3_retention=44.0, m4_retention=37.0, m5_retention=32.0, m6_retention=28.0),
            CustomerCohort(cohort_month="2025-03", user_count=1680, m1_retention=70.0, m2_retention=53.0, m3_retention=43.0, m4_retention=36.0, m5_retention=31.0),
            CustomerCohort(cohort_month="2025-04", user_count=1320, m1_retention=65.0, m2_retention=50.0, m3_retention=40.0, m4_retention=34.0),
            CustomerCohort(cohort_month="2025-05", user_count=1550, m1_retention=74.0, m2_retention=57.0, m3_retention=46.0),
            CustomerCohort(cohort_month="2025-06", user_count=1890, m1_retention=71.0, m2_retention=54.0),
        ]
        db.add_all(cohorts)
        await db.commit()

        # 9. Seed SLA Metrics
        sla_metrics = [
            DeliverySLAMetric(pincode="560034", neighborhood_name="Koramangala", city="Bangalore", avg_eta_min=14.2, sla_breach_pct=4.5, peak_eta_min=24.5, orders_7d=2800),
            DeliverySLAMetric(pincode="560038", neighborhood_name="Indiranagar", city="Bangalore", avg_eta_min=12.8, sla_breach_pct=3.1, peak_eta_min=21.0, orders_7d=3200),
            DeliverySLAMetric(pincode="560102", neighborhood_name="HSR Layout", city="Bangalore", avg_eta_min=15.5, sla_breach_pct=6.8, peak_eta_min=28.0, orders_7d=2400),
            DeliverySLAMetric(pincode="110017", neighborhood_name="Saket", city="Delhi", avg_eta_min=16.8, sla_breach_pct=8.2, peak_eta_min=32.4, orders_7d=2100),
            DeliverySLAMetric(pincode="400053", neighborhood_name="Andheri West", city="Mumbai", avg_eta_min=18.4, sla_breach_pct=11.5, peak_eta_min=36.0, orders_7d=2900),
        ]
        db.add_all(sla_metrics)
        await db.commit()

        # 10. Seed Competitor Moves
        moves = [
            CompetitiveMove(city_id=1, neighborhood_id=1, city="Bangalore", pincode="560034", platform="Zepto", move_type="payout_increase", description="Increased rider payout structure by 12% in Koramangala.", detected_date=date.today() - timedelta(days=2), impact_level="HIGH"),
            CompetitiveMove(city_id=2, neighborhood_id=5, city="Delhi", pincode="110017", platform="Blinkit", move_type="dark_store_launch", description="Opened a new large-format dark store in Saket.", detected_date=date.today() - timedelta(days=4), impact_level="MEDIUM"),
            CompetitiveMove(city_id=3, neighborhood_id=7, city="Mumbai", pincode="400053", platform="Swiggy Instamart", move_type="free_delivery_promo", description="Launched a free delivery promo for orders above ₹99 in Andheri West.", detected_date=date.today() - timedelta(days=5), impact_level="LOW"),
        ]
        db.add_all(moves)
        await db.commit()

        # 11. Seed Perishable Batches
        now = datetime.now()
        batches = [
            ProductBatch(product_name="Organic Bananas", category="Fruits", store_id=1, quantity=150, base_price=60.0, current_price=60.0, discount_rate=0.0, freshness_score=0.95, arrival_time=now - timedelta(hours=6), expiry_time=now + timedelta(hours=48), decay_rate_per_hour=0.015, qr_code_hash="qr_ban_01", color_state="Fresh/Optimal"),
            ProductBatch(product_name="Fresh Spinach", category="Vegetables", store_id=1, quantity=80, base_price=40.0, current_price=32.0, discount_rate=0.20, freshness_score=0.80, arrival_time=now - timedelta(hours=12), expiry_time=now + timedelta(hours=24), decay_rate_per_hour=0.025, qr_code_hash="qr_spi_02", color_state="Healthy"),
            ProductBatch(product_name="Toned Milk 1L", category="Dairy", store_id=1, quantity=200, base_price=56.0, current_price=56.0, discount_rate=0.0, freshness_score=0.99, arrival_time=now - timedelta(hours=2), expiry_time=now + timedelta(hours=72), decay_rate_per_hour=0.010, qr_code_hash="qr_milk_03", color_state="Fresh/Optimal"),
            ProductBatch(product_name="Red Tomatoes", category="Vegetables", store_id=1, quantity=120, base_price=35.0, current_price=24.5, discount_rate=0.30, freshness_score=0.70, arrival_time=now - timedelta(hours=18), expiry_time=now + timedelta(hours=36), decay_rate_per_hour=0.020, qr_code_hash="qr_tom_04", color_state="Ripening"),
        ]
        db.add_all(batches)
        await db.commit()

        # 12. Seed Order History (OrdersSynthetic)
        categories = ["Produce", "Dairy", "Snacks", "Personal Care", "Household", "Baby & Kids", "Instant Food"]
        platforms = ["Blinkit", "Zepto", "Swiggy Instamart", "Flipkart Minutes"]
        weathers = ["Sunny", "Rainy", "Cloudy", "Windy"]
        
        orders = []
        for i in range(1000):
            order_date = date.today() - timedelta(days=random.randint(0, 30))
            hour = random.randint(7, 23)
            val = round(random.uniform(150, 1200), 2)
            store = random.choice(stores)
            order = OrderSynthetic(
                order_number=f"ORD-{order_date.strftime('%y%m%d')}-{i:04d}",
                store_id=store.id,
                pincode=store.pincode,
                delivery_latitude=store.latitude + random.uniform(-0.015, 0.015),
                delivery_longitude=store.longitude + random.uniform(-0.015, 0.015),
                customer_id=f"CUST-{random.randint(1000, 2500)}",
                is_first_order=random.choice([True, False, False, False]),
                platform=store.platform,
                order_date=order_date,
                order_time=datetime.strptime(f"{hour:02d}:00:00", "%H:%M:%S").time(),
                order_datetime=datetime.combine(order_date, datetime.strptime(f"{hour:02d}:00:00", "%H:%M:%S").time()),
                total_items=random.randint(2, 15),
                category=random.choice(categories),
                subtotal=val - 20,
                delivery_fee=15.0,
                discount=0.0,
                tax=5.0,
                order_value=val,
                payment_method=random.choice(["UPI", "Card", "COD"]),
                is_paid=True,
                status="Delivered",
                estimated_delivery_mins=15,
                delivery_mins=random.randint(8, 25),
                delivery_distance_km=random.uniform(0.5, 3.2),
                customer_rating=float(random.randint(3, 5)),
                delivery_rating=float(random.randint(3, 5)),
                is_weekend=order_date.weekday() >= 5,
                hour_of_day=hour,
                neighborhood_id=store.neighborhood_id,
                weather=random.choice(weathers),
            )
            orders.append(order)
        
        db.add_all(orders)
        await db.commit()

        # 13. Seed Market Metrics (aggregates for trend analytics)
        metrics = []
        for city_name in ["Bangalore", "Delhi", "Mumbai", "Hyderabad", "Pune"]:
            for d_idx in range(30):
                metric_date = date.today() - timedelta(days=d_idx)
                metrics.append(
                    MarketMetrics(
                        metric_date=metric_date,
                        city=city_name,
                        pincode="All",
                        total_orders=random.randint(2000, 5000),
                        total_revenue=random.uniform(700000.0, 1800000.0),
                        avg_order_value=random.uniform(320.0, 390.0),
                        avg_delivery_time=random.uniform(12.5, 17.5),
                        blinkit_orders=random.randint(600, 1500),
                        zepto_orders=random.randint(800, 1800),
                        instamart_orders=random.randint(700, 1600),
                        flipkart_orders=random.randint(200, 600),
                        new_customers=random.randint(100, 400),
                        repeat_customers=random.randint(1500, 3500),
                        customer_retention_rate=random.uniform(0.65, 0.78),
                        on_time_delivery_rate=random.uniform(0.88, 0.96),
                    )
                )
        db.add_all(metrics)
        await db.commit()

        logger.info("✓ Seeding completed successfully")
        return {"success": True, "message": "Database seeded with complete analysis data."}

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to seed database: {str(e)}")
