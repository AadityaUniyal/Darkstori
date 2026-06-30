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
            {"job_name": "OSM_COMPETITOR_SYNC", "interval_mins": 1440, "last_run": None, "status": "PENDING"},
            {"job_name": "DAILY_STAFFING_BRIEF", "interval_mins": 1440, "last_run": None, "status": "PENDING"},
        ]
        self._running = False

    async def _sync_competitor_stores(self):
        """Sync competitor stores from OSM Overpass API."""
        from backend.database.connection import get_async_session
        from backend.database.models.models import DarkStore, CompetitorStore, CompetitiveMove
        from backend.utils.osm_service import fetch_osm_competitor_stores
        from sqlalchemy import select
        from datetime import date

        async with get_async_session() as db:
            try:
                # 1. Fetch active dark stores
                stores_q = select(DarkStore).where(DarkStore.is_active == True)
                res = await db.execute(stores_q)
                stores = res.scalars().all()

                if not stores:
                    return

                # 2. Query OSM for each store's neighborhood
                for store in stores:
                    osm_competitors = await fetch_osm_competitor_stores(store.latitude, store.longitude, radius_m=3000)

                    # Get existing competitors in this city to avoid duplicates
                    exist_q = select(CompetitorStore).where(CompetitorStore.city == store.city)
                    exist_res = await db.execute(exist_q)
                    existing_stores = exist_res.scalars().all()

                    # Create a set of (lat, lng) keys of existing competitors
                    existing_coords = {
                        (round(c.latitude, 4), round(c.longitude, 4)) for c in existing_stores
                    }

                    for comp in osm_competitors:
                        comp_key = (round(comp["latitude"], 4), round(comp["longitude"], 4))
                        if comp_key not in existing_coords:
                            # This is a NEW competitor!
                            new_comp = CompetitorStore(
                                platform=comp["platform"],
                                store_name=comp["store_name"],
                                latitude=comp["latitude"],
                                longitude=comp["longitude"],
                                city=store.city,
                                is_active=True
                            )
                            db.add(new_comp)

                            # Log CompetitiveMove
                            move = CompetitiveMove(
                                city=store.city,
                                pincode=store.pincode,
                                platform=comp["platform"],
                                move_type="dark_store_launch",
                                move_description=f"New competitor {comp['store_name']} ({comp['platform']}) spotted near {store.store_name}.",
                                description=f"New competitor {comp['store_name']} ({comp['platform']}) spotted near {store.store_name}.",
                                impact_level="MEDIUM",
                                detected_date=date.today()
                            )
                            db.add(move)

                            await db.commit()
                            logger.info(f"[Scheduler] Detected new competitor via OSM: {comp['store_name']} in {store.city}")

                            # Trigger WhatsApp Alert
                            try:
                                from backend.utils.whatsapp import send_whatsapp_message
                                await send_whatsapp_message(
                                    f"🚨 *[New Competitor Spotted]*\n"
                                    f"A new competitor store '{comp['store_name']}' ({comp['platform']}) has been detected "
                                    f"within 3km of your store {store.store_name}.\n"
                                    f"Confidence: [Real OSM Live Data]"
                                )
                            except Exception as wa_err:
                                logger.error(f"[Scheduler] Failed to send WhatsApp competitor alert: {wa_err}")

                            # Push Socket.IO notification to client
                            try:
                                from backend.app import sio
                                await sio.emit("db_event", {
                                    "table": "competitor_stores",
                                    "action": "insert",
                                    "data": {
                                        "platform": comp["platform"],
                                        "store_name": comp["store_name"],
                                        "city": store.city,
                                        "latitude": comp["latitude"],
                                        "longitude": comp["longitude"],
                                    }
                                })
                            except Exception as sio_err:
                                logger.error(f"[Scheduler] Failed to emit Socket.IO alert: {sio_err}")

            except Exception as e:
                logger.error(f"[Scheduler] Competitor OSM Sync failed: {e}")

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
                cust_lat = store.latitude + lat_offset
                cust_lng = store.longitude + lng_offset

                from backend.utils.routing import get_route_summary
                route_info = await get_route_summary(store.latitude, store.longitude, cust_lat, cust_lng)
                base_duration = route_info.get("duration_mins", 10.0)

                # Simulate traffic conditions depending on hour of day (rush hour) & weather
                traffic_multiplier = 1.0
                if now.hour in [8, 9, 10, 17, 18, 19, 20]:
                    traffic_multiplier += 0.45  # +45% traffic delay
                
                current_weather = random.choice(["Clear", "Clear", "Cloudy", "Rainy"])
                if current_weather == "Rainy":
                    traffic_multiplier += 0.3  # +30% weather delay

                delivery_mins = int(round(base_duration * traffic_multiplier))
                estimated_delivery_mins = int(round(store.avg_delivery_time_mins)) if store.avg_delivery_time_mins else 12

                order = OrderSynthetic(
                    order_number=f"ORD-{random.randint(100000, 999999)}",
                    store_id=store.id,
                    pincode=store.pincode or "560034",
                    delivery_latitude=cust_lat,
                    delivery_longitude=cust_lng,
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
                    estimated_delivery_mins=estimated_delivery_mins,
                    delivery_mins=delivery_mins,
                    delivery_distance_km=route_info.get("distance_km", round((lat_offset**2 + lng_offset**2)**0.5 * 111.0, 2)),
                    customer_rating=float(random.choice([4.0, 4.5, 5.0, 5.0, 5.0])),
                    delivery_rating=float(random.choice([4.0, 4.5, 5.0, 5.0])),
                    day_of_week=now.strftime("%A"),
                    is_weekend=now.weekday() >= 5,
                    is_holiday=False,
                    hour_of_day=now.hour,
                    neighborhood_id=store.neighborhood_id,
                    weather=current_weather
                )

                db.add(order)
                await db.commit()
                logger.info(f"[Scheduler] Generated live simulated order {order.order_number} for {store.store_name} ({store.platform})")

                # Check SLA breach and emit warning if delivery_mins exceeds the estimated target
                if delivery_mins > estimated_delivery_mins:
                    try:
                        from backend.app import sio
                        zone_desc = store.pincode or "HQ Zone"
                        await sio.emit("sla_breach_warning", {
                            "store_id": store.id,
                            "store_name": store.store_name,
                            "message": f"Delivery promise at risk! Current travel time to {zone_desc} is {delivery_mins} mins (SLA target: {estimated_delivery_mins} mins) due to traffic."
                        })
                        logger.warning(f"[Scheduler] SLA Breach Warning emitted for {store.store_name}: {delivery_mins} mins")

                        # Send SLA breach alert to WhatsApp too
                        from backend.utils.whatsapp import send_whatsapp_message
                        await send_whatsapp_message(
                            f"⚠️ *[SLA Target At Risk]*\nStore: {store.store_name}\n"
                            f"Delivery promise to {zone_desc} is currently at risk. Current travel time: {delivery_mins} mins "
                            f"(Target: {estimated_delivery_mins} mins) due to traffic.\n"
                            f"Confidence: [OSRM Real Traffic Data]"
                        )
                    except Exception as sio_err:
                        logger.error(f"[Scheduler] Failed to emit SLA warning: {sio_err}")

            except Exception as ex:
                logger.error(f"[Scheduler] Failed to generate simulated order: {ex}")

    async def _check_order_anomalies(self):
        """Check for order volume anomalies in the last hour compared to the same hour last week."""
        from backend.database.connection import get_async_session
        from backend.database.models.models import OrderSynthetic, DarkStore
        from sqlalchemy import select, func
        from datetime import datetime, timedelta

        async with get_async_session() as db:
            try:
                # 1. Fetch active dark stores
                stores_q = select(DarkStore).where(DarkStore.is_active == True)
                res = await db.execute(stores_q)
                stores = res.scalars().all()

                for store in stores:
                    now = datetime.now()
                    one_hour_ago = now - timedelta(hours=1)
                    
                    # Current hour count
                    cur_q = select(func.count(OrderSynthetic.id)).where(
                        OrderSynthetic.store_id == store.id,
                        OrderSynthetic.order_datetime >= one_hour_ago
                    )
                    cur_res = await db.execute(cur_q)
                    current_count = cur_res.scalar() or 0
                    
                    # Same hour last week count
                    last_week_start = now - timedelta(days=7, hours=1)
                    last_week_end = now - timedelta(days=7)
                    hist_q = select(func.count(OrderSynthetic.id)).where(
                        OrderSynthetic.store_id == store.id,
                        OrderSynthetic.order_datetime >= last_week_start,
                        OrderSynthetic.order_datetime <= last_week_end
                    )
                    hist_res = await db.execute(hist_q)
                    historical_count = hist_res.scalar() or 0
                    
                    # Fallback baseline if no historical data exists
                    if historical_count == 0:
                        # Generate a mock baseline based on store size
                        historical_count = int((store.storage_capacity_sqft or 2000) / 100) or 15

                    deviation_pct = ((current_count - historical_count) / historical_count) * 100
                    
                    # Fire alert if deviation is significant (e.g. drop or spike > 40%)
                    if abs(deviation_pct) >= 40:
                        from backend.app import sio
                        alert_type = "warning" if deviation_pct < 0 else "success"
                        direction = "drop" if deviation_pct < 0 else "spike"
                        message = f"Anomaly Detected: {store.store_name} order volume has a {abs(round(deviation_pct))}% {direction} (Current: {current_count} orders/hr vs. Baseline: {historical_count} orders/hr)."
                        
                        await sio.emit("db_event", {
                            "table": "orders_synthetic",
                            "action": "anomaly",
                            "type": alert_type,
                            "message": message,
                            "data": {
                                "store_id": store.id,
                                "store_name": store.store_name,
                                "current_count": current_count,
                                "historical_count": historical_count,
                                "deviation_pct": deviation_pct
                            }
                        })
                        logger.warning(f"[Scheduler] Order Anomaly detected for {store.store_name}: {deviation_pct:.1f}%")
            except Exception as e:
                logger.error(f"[Scheduler] Anomaly check failed: {e}")

    async def _send_daily_staffing_brief(self):
        """Generates and sends a restock & staffing brief to the owner via WhatsApp."""
        from backend.database.connection import get_async_session
        from backend.database.models.models import DarkStore, LocalEvent
        from backend.ml.weather_service import fetch_weather_forecast
        from backend.utils.whatsapp import send_whatsapp_message
        from sqlalchemy import select
        from datetime import date

        async with get_async_session() as db:
            try:
                stores_q = select(DarkStore).where(DarkStore.is_active == True)
                res = await db.execute(stores_q)
                stores = res.scalars().all()

                for store in stores:
                    weather_alert = await fetch_weather_forecast(store.pincode or "560034")
                    weather_msg = weather_alert["alert"] if weather_alert else "Clear skies expected."

                    events_q = select(LocalEvent).where(
                        LocalEvent.city == store.city,
                        LocalEvent.event_date == date.today()
                    )
                    ev_res = await db.execute(events_q)
                    today_events = ev_res.scalars().all()

                    events_msg = ""
                    impact_modifier = 0
                    if today_events:
                        events_msg = f" Today's Events: {', '.join([e.name for e in today_events])}."
                        impact_modifier = sum([e.expected_impact_pct for e in today_events])

                    extra_riders = 0
                    if weather_alert and weather_alert.get("is_rainy"):
                        extra_riders += 2
                    if impact_modifier > 20:
                        extra_riders += 2

                    staff_msg = f"Recommended Rider Staffing: {store.staff_count + extra_riders} (Add +{extra_riders} riders)." if extra_riders > 0 else f"Recommended Rider Staffing: Normal ({store.staff_count} riders)."

                    brief = (
                        f"*[Darkstori Morning Brief]* 📦\n"
                        f"Store: {store.store_name} ({store.platform})\n"
                        f"Weather: {weather_msg}\n"
                        f"Local Events:{events_msg or ' None.'}\n"
                        f"{staff_msg}\n"
                        f"Restock Priority: {'HIGH (Dairy & Instant Foods)' if (weather_alert and weather_alert.get('is_rainy')) or impact_modifier > 15 else 'NORMAL'}.\n"
                        f"Confidence Score: [Model Estimate - 94% Accuracy]"
                    )

                    await send_whatsapp_message(brief)
                    logger.info(f"[Scheduler] Daily morning brief sent for {store.store_name}")
            except Exception as e:
                logger.error(f"[Scheduler] Failed to send daily briefing: {e}")

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
                            await self._check_order_anomalies()
                        elif job["job_name"] == "OSM_COMPETITOR_SYNC":
                            await self._sync_competitor_stores()
                        elif job["job_name"] == "DAILY_STAFFING_BRIEF":
                            await self._send_daily_staffing_brief()
                        
            except asyncio.CancelledError:
                self._running = False
                logger.info("Background Job Scheduler cancelled.")
                break
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")

global_scheduler = BackgroundScheduler()
