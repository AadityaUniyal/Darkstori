"""Live Delivery Feed - Real-time delivery tracking and analytics."""

import asyncio
import logging
import uuid
from collections import deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import aiohttp
import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models.models import (
    DailyMarketReport,
    LiveDeliveryEvent,
    LiveFeedMetrics,
    PlatformAvailability,
    SocialSentiment,
)

logger = logging.getLogger(__name__)


class LiveDeliveryFeed:
    """
    Aggregate live delivery data from multiple sources.

    Features:
    - Real-time delivery tracking
    - Platform availability monitoring
    - Delivery time estimation
    - Order volume estimation
    - Service disruption detection
    """

    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.delivery_stream = deque(maxlen=10000)
        self.platform_status = {}
        self.last_update = {}
        self.db_session = db_session

    async def fetch_platform_availability(self, pincode: str) -> Dict[str, bool]:
        """
        Check which platforms are currently serving a PIN code.

        Args:
            pincode: Indian PIN code

        Returns:
            Dict with platform availability status
        """
        platforms = {
            "blinkit": "https://blinkit.com",
            "zepto": "https://www.zeptonow.com",
            "instamart": "https://www.swiggy.com/instamart",
            "dunzo": "https://www.dunzo.com",
        }

        availability = {}

        async with aiohttp.ClientSession() as session:
            for platform, url in platforms.items():
                try:
                    # Check if platform serves this pincode
                    is_available = await self._check_pincode_availability(
                        session, platform, url, pincode
                    )
                    availability[platform] = is_available

                except Exception as e:
                    logger.error(f"Error checking {platform}: {e}")
                    availability[platform] = None

        return availability

    async def _check_pincode_availability(
        self, session: aiohttp.ClientSession, platform: str, url: str, pincode: str
    ) -> bool:
        """Check if a platform serves a specific pincode."""
        # Implementation varies by platform
        # This is a simplified example
        try:
            async with session.get(url, timeout=10) as response:
                if response.status == 200:
                    # Platform-specific logic to check availability
                    return True
                return False
        except:
            return False

    async def estimate_delivery_times(self, pincode: str) -> Dict[str, int]:
        """
        Estimate current delivery times for each platform.

        Args:
            pincode: Indian PIN code

        Returns:
            Dict with estimated delivery times in minutes
        """
        # Check platform availability first
        availability = await self.fetch_platform_availability(pincode)

        delivery_times = {}

        for platform, is_available in availability.items():
            if is_available:
                # Estimate based on historical data + current conditions
                base_time = self._get_base_delivery_time(platform)
                traffic_factor = await self._get_traffic_factor(pincode)
                demand_factor = self._get_demand_factor(platform, pincode)

                estimated_time = int(base_time * traffic_factor * demand_factor)
                delivery_times[platform] = estimated_time
            else:
                delivery_times[platform] = None

        return delivery_times

    def _get_base_delivery_time(self, platform: str) -> int:
        """Get base delivery time for platform (in minutes)."""
        base_times = {"blinkit": 12, "zepto": 10, "instamart": 15, "dunzo": 20}
        return base_times.get(platform, 15)

    async def _get_traffic_factor(self, pincode: str) -> float:
        """Get traffic congestion factor (1.0 = normal, >1.0 = congested)."""
        # Integrate with Google Maps Traffic API
        # For now, return time-based estimate
        hour = datetime.now().hour

        if 8 <= hour <= 10 or 18 <= hour <= 21:
            return 1.3  # Peak hours
        elif 12 <= hour <= 14:
            return 1.2  # Lunch rush
        else:
            return 1.0  # Normal

    def _get_demand_factor(self, platform: str, pincode: str) -> float:
        """Get demand factor based on recent orders (1.0 = normal, >1.0 = high demand)."""
        # Check recent order volume from stream
        recent_orders = [
            d
            for d in self.delivery_stream
            if d["platform"] == platform
            and d["pincode"] == pincode
            and (datetime.now() - d["timestamp"]).seconds < 3600
        ]

        if len(recent_orders) > 50:
            return 1.4  # Very high demand
        elif len(recent_orders) > 20:
            return 1.2  # High demand
        else:
            return 1.0  # Normal

    async def monitor_social_sentiment(self, platform: str) -> Dict:
        """
        Monitor social media for delivery issues and sentiment.

        Args:
            platform: Platform name

        Returns:
            Sentiment analysis results
        """
        # This would integrate with Twitter API
        # Placeholder implementation
        return {
            "sentiment_score": 0.7,  # -1 to 1
            "mention_count": 150,
            "complaint_count": 12,
            "praise_count": 45,
            "trending_issues": ["delayed delivery", "missing items"],
        }

    def add_delivery_event(self, event: Dict):
        """
        Add a delivery event to the stream and database.

        Args:
            event: Dict with delivery information
        """
        event["timestamp"] = datetime.now()
        event_id = f"evt_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"
        event["event_id"] = event_id

        self.delivery_stream.append(event)

        # Update platform status
        platform = event.get("platform")
        if platform:
            if platform not in self.platform_status:
                self.platform_status[platform] = {
                    "total_deliveries": 0,
                    "avg_time": 0,
                    "success_rate": 1.0,
                }

            self.platform_status[platform]["total_deliveries"] += 1
            self.last_update[platform] = datetime.now()

        # Save to database if session available
        if self.db_session:
            asyncio.create_task(self._save_event_to_db(event))

    async def _save_event_to_db(self, event: Dict):
        """Save delivery event to database."""
        try:
            db_event = LiveDeliveryEvent(
                event_id=event.get("event_id"),
                platform=event.get("platform"),
                pincode=event.get("pincode"),
                delivery_time_mins=event.get("delivery_time"),
                order_value=event.get("order_value"),
                items_count=event.get("items_count"),
                success=event.get("success", True),
                city=event.get("city"),
                latitude=event.get("latitude"),
                longitude=event.get("longitude"),
                event_timestamp=event.get("timestamp", datetime.now()),
                source=event.get("source", "api"),
                user_id=event.get("user_id"),
            )

            self.db_session.add(db_event)
            await self.db_session.commit()
            logger.info(f"Saved delivery event {event.get('event_id')} to database")
        except Exception as e:
            logger.error(f"Failed to save event to database: {e}")
            await self.db_session.rollback()

    def get_live_metrics(self) -> Dict:
        """Get current live metrics across all platforms."""
        if not self.delivery_stream:
            return {}

        df = pd.DataFrame(list(self.delivery_stream))

        # Calculate metrics
        metrics = {
            "total_deliveries_last_hour": len(
                df[(datetime.now() - df["timestamp"]).dt.seconds < 3600]
            ),
            "avg_delivery_time": (
                df["delivery_time"].mean() if "delivery_time" in df else 0
            ),
            "platform_breakdown": (
                df["platform"].value_counts().to_dict() if "platform" in df else {}
            ),
            "busiest_pincodes": (
                df["pincode"].value_counts().head(10).to_dict()
                if "pincode" in df
                else {}
            ),
            "last_updated": datetime.now().isoformat(),
        }

        return metrics

    async def generate_daily_report(self, date: Optional[datetime] = None) -> Dict:
        """
        Generate comprehensive daily delivery report.

        Args:
            date: Date for report (defaults to today)

        Returns:
            Daily report with key metrics
        """
        if date is None:
            date = datetime.now().date()

        # Filter deliveries for the date
        df = pd.DataFrame(list(self.delivery_stream))
        if df.empty:
            return {}

        df["date"] = df["timestamp"].dt.date
        daily_df = df[df["date"] == date]

        if daily_df.empty:
            return {}

        report = {
            "date": date.isoformat(),
            "total_deliveries": len(daily_df),
            "platforms": {
                platform: {
                    "deliveries": len(daily_df[daily_df["platform"] == platform]),
                    "avg_time": (
                        daily_df[daily_df["platform"] == platform][
                            "delivery_time"
                        ].mean()
                        if "delivery_time" in daily_df
                        else 0
                    ),
                    "market_share": len(daily_df[daily_df["platform"] == platform])
                    / len(daily_df)
                    * 100,
                }
                for platform in daily_df["platform"].unique()
            },
            "peak_hours": daily_df.groupby(daily_df["timestamp"].dt.hour)
            .size()
            .to_dict(),
            "top_pincodes": (
                daily_df["pincode"].value_counts().head(20).to_dict()
                if "pincode" in daily_df
                else {}
            ),
            "insights": self._generate_insights(daily_df),
        }

        return report

    def _generate_insights(self, df: pd.DataFrame) -> List[str]:
        """Generate actionable insights from delivery data."""
        insights = []

        # Delivery time insights
        if "delivery_time" in df:
            avg_time = df["delivery_time"].mean()
            if avg_time > 20:
                insights.append(
                    f"⚠️ Average delivery time is high ({avg_time:.1f} mins)"
                )
            elif avg_time < 12:
                insights.append(f"✅ Excellent delivery times ({avg_time:.1f} mins)")

        # Platform insights
        if "platform" in df:
            platform_counts = df["platform"].value_counts()
            leader = platform_counts.index[0]
            leader_share = platform_counts.iloc[0] / len(df) * 100
            insights.append(f"📊 {leader} leads with {leader_share:.1f}% market share")

        # Time-based insights
        if "timestamp" in df:
            hourly = df.groupby(df["timestamp"].dt.hour).size()
            peak_hour = hourly.idxmax()
            insights.append(f"⏰ Peak delivery hour: {peak_hour}:00")

        return insights


# Global instance
live_feed = LiveDeliveryFeed()


async def simulate_live_feed(duration_minutes: int = 60):
    """
    Simulate live delivery feed for testing.

    Args:
        duration_minutes: How long to simulate
    """
    platforms = ["blinkit", "zepto", "instamart", "dunzo"]
    pincodes = ["110001", "400001", "560001", "600001", "700001"]

    logger.info(f"Starting live feed simulation for {duration_minutes} minutes...")

    end_time = datetime.now() + timedelta(minutes=duration_minutes)

    while datetime.now() < end_time:
        # Generate random delivery event
        event = {
            "platform": np.random.choice(platforms),
            "pincode": np.random.choice(pincodes),
            "delivery_time": np.random.randint(8, 25),
            "order_value": np.random.uniform(200, 1500),
            "items_count": np.random.randint(1, 15),
            "success": np.random.random() > 0.05,  # 95% success rate
        }

        live_feed.add_delivery_event(event)

        # Wait random interval (simulate real-time)
        await asyncio.sleep(np.random.uniform(0.5, 3))

    logger.info("Simulation completed")
    return live_feed.get_live_metrics()


if __name__ == "__main__":
    # Test the live feed
    asyncio.run(simulate_live_feed(5))

    metrics = live_feed.get_live_metrics()
    print("\n=== Live Delivery Metrics ===")
    for key, value in metrics.items():
        print(f"{key}: {value}")
