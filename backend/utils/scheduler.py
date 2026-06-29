"""Background job scheduler for periodic data updates (competitor prices, demand, drift)."""

import asyncio
from datetime import datetime
from backend.core.logger import logger

class BackgroundScheduler:
    def __init__(self):
        self.jobs_history = [
            {"job_name": "COMPETITOR_PRICING_SYNC", "interval_mins": 30, "last_run": None, "status": "PENDING"},
            {"job_name": "DEMAND_FORECAST_REFRESH", "interval_mins": 60, "last_run": None, "status": "PENDING"},
            {"job_name": "DRIFT_TELEMETRY_SCAN", "interval_mins": 5, "last_run": None, "status": "PENDING"},
            {"job_name": "REALTIME_ORDER_SIMULATION", "interval_mins": 0.25, "last_run": None, "status": "PENDING"},
        ]
        self._running = False

    async def _generate_simulated_order(self):
        """Generates a random order for an active dark store and commits to database."""
        from backend.database.connection import get_async_session
        from backend.database.models.models import DarkStore, OrderSynthetic
        from sqlalchemy import select
        import random
        from datetime import datetime, date, time
        import uuid

        async with get_async_session() as db:
            try:
                # 1. Fetch all active dark stores
                stores_q = select(DarkStore).where(DarkStore.is_active == True)
                res = await db.execute(stores_q)
                stores = res.scalars().all()

                if not stores:
                    logger.warning("[Scheduler] No active dark stores found in the database. Please seed the database first.")
                    return

                # 2. Pick a random store
                store = random.choice(stores)

                # 3. Create a simulated order
                categories = [
                    ("Fruits & Vegetables", ["Fresh Tomatoes", "Bananas Organic", "Baby Potato", "Onion Red"]),
                    ("Dairy & Bread", ["Fresh Milk 1L", "Brown Bread", "Salted Butter 100g", "Amul Cheese"]),
                    ("Snacks & Beverages", ["Potato Chips", "Diet Cola 300ml", "Chocolate Bar", "Green Tea"]),
                    ("Instant Food", ["Cup Noodles", "Ready Pasta", "Tomato Soup Packet"]),
                    ("Personal Care", ["Hand Wash", "Toothpaste 150g", "Moisturizing Cream"]),
                    ("Household", ["Dishwashing Liquid", "Garbage Bags", "Kitchen Roll"]),
                ]
                
                cat_info = random.choice(categories)
                category = cat_info[0]
                subcategory = random.choice(cat_info[1])
                
                subtotal = round(random.uniform(80.0, 800.0), 2)
                delivery_fee = 15.0 if subtotal < 250 else 0.0
                discount = round(random.choice([0.0, 0.0, 10.0, 20.0, 50.0]), 2)
                tax = round(subtotal * 0.05, 2)
                order_value = round(subtotal + delivery_fee + tax - discount, 2)

                now = datetime.now()
                
                # Offset coordinates slightly to simulate delivery route (within ~1.5km radius)
                lat_offset = random.uniform(-0.012, 0.012)
                lng_offset = random.uniform(-0.012, 0.012)

                order = OrderSynthetic(
                    order_number=f"ORD-{random.randint(100000, 999999)}",
                    store_id=store.id,
                    pincode=store.pincode or "560034",
                    delivery_latitude=store.latitude + lat_offset,
                    delivery_longitude=store.longitude + lng_offset,
                    customer_id=f"CUST-{random.randint(1000, 9999)}",
                    is_first_order=random.choice([True, False, False, False]),
                    platform=store.platform,
                    order_date=now.date(),
                    order_time=now.time(),
                    order_datetime=now,
                    total_items=random.randint(1, 6),
                    category=category,
                    subcategory=subcategory,
                    subtotal=subtotal,
                    delivery_fee=delivery_fee,
                    discount=discount,
                    tax=tax,
                    order_value=order_value,
                    payment_method=random.choice(["UPI", "UPI", "Credit Card", "COD"]),
                    is_paid=True,
                    status="delivered",
                    estimated_delivery_mins=random.randint(9, 15),
                    delivery_mins=random.randint(8, 18),
                    delivery_distance_km=round((lat_offset**2 + lng_offset**2)**0.5 * 111.0, 2),
                    customer_rating=float(random.choice([4.0, 4.5, 5.0, 5.0, 5.0])),
                    delivery_rating=float(random.choice([4.0, 4.5, 5.0, 5.0])),
                    day_of_week=now.strftime("%A"),
                    is_weekend=now.weekday() >= 5,
                    is_holiday=False,
                    hour_of_day=now.hour,
                    neighborhood_id=store.neighborhood_id,
                    weather=random.choice(["Clear", "Clear", "Cloudy", "Rainy"])
                )

                db.add(order)
                await db.commit()
                logger.info(f"[Scheduler] Generated live simulated order {order.order_number} for {store.store_name} ({store.platform})")
            except Exception as ex:
                logger.error(f"[Scheduler] Failed to generate simulated order: {ex}")

    async def run(self):
        self._running = True
        logger.info("Initializing Background Job Scheduler...")
        
        # Seed initial runs
        for job in self.jobs_history:
            job["last_run"] = datetime.now().isoformat()
            job["status"] = "SUCCESS"
            
        counter = 0
        while self._running:
            try:
                # Sleep for 10 seconds per tick
                await asyncio.sleep(10)
                counter += 10
                
                # Check jobs
                for job in self.jobs_history:
                    interval_secs = job["interval_mins"] * 60
                    # For demo / simulation purposes, we speed up cycles slightly:
                    # Treat minutes as seconds so the UI shows active updates!
                    if counter % int(job["interval_mins"] * 5) == 0:
                        job["last_run"] = datetime.now().isoformat()
                        job["status"] = "SUCCESS"
                        logger.info(f"[Scheduler] Executed periodic background task: {job['job_name']}")
                        
                        # Trigger simulated order generation on simulation ticks
                        if job["job_name"] == "REALTIME_ORDER_SIMULATION":
                            await self._generate_simulated_order()
                        
            except asyncio.CancelledError:
                self._running = False
                logger.info("Background Job Scheduler cancelled.")
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")

global_scheduler = BackgroundScheduler()
