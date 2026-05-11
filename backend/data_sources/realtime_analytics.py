"""Real-time analytics engine for live dashboard updates."""

from collections import deque
from datetime import datetime, timedelta
from typing import Dict, List

import numpy as np
import pandas as pd

from backend.core.logger import logger


class RealtimeAnalytics:
    """Process and analyze data in real-time."""

    def __init__(self, window_size: int = 100):
        """
        Initialize real-time analytics engine.

        Args:
            window_size: Number of data points to keep in memory
        """
        self.window_size = window_size
        self.order_stream = deque(maxlen=window_size)
        self.metrics_history = deque(maxlen=window_size)
        self.anomaly_threshold = 2.5  # Standard deviations

    def add_order(self, order: Dict):
        """Add new order to stream."""
        order["timestamp"] = datetime.now()
        self.order_stream.append(order)
        self._update_metrics()

    def _update_metrics(self):
        """Update real-time metrics."""
        if len(self.order_stream) == 0:
            return

        df = pd.DataFrame(list(self.order_stream))

        metrics = {
            "timestamp": datetime.now(),
            "total_orders": len(df),
            "avg_order_value": df["order_value"].mean() if "order_value" in df else 0,
            "orders_per_minute": self._calculate_rate(),
            "top_platform": df["platform"].mode()[0] if "platform" in df else "Unknown",
            "peak_hour": df["hour"].mode()[0] if "hour" in df else 0,
        }

        self.metrics_history.append(metrics)

    def _calculate_rate(self) -> float:
        """Calculate orders per minute."""
        if len(self.order_stream) < 2:
            return 0.0

        first_order = list(self.order_stream)[0]
        last_order = list(self.order_stream)[-1]

        time_diff = (
            last_order["timestamp"] - first_order["timestamp"]
        ).total_seconds() / 60

        if time_diff > 0:
            return len(self.order_stream) / time_diff
        return 0.0

    def detect_anomalies(self) -> List[Dict]:
        """Detect anomalies in order stream."""
        if len(self.metrics_history) < 10:
            return []

        df = pd.DataFrame(list(self.metrics_history))
        anomalies = []

        # Check for order value anomalies
        if "avg_order_value" in df:
            mean = df["avg_order_value"].mean()
            std = df["avg_order_value"].std()

            current_value = df["avg_order_value"].iloc[-1]

            if abs(current_value - mean) > self.anomaly_threshold * std:
                anomalies.append(
                    {
                        "type": "order_value",
                        "severity": (
                            "high" if abs(current_value - mean) > 3 * std else "medium"
                        ),
                        "message": f"Unusual order value: ₹{current_value:.2f} (avg: ₹{mean:.2f})",
                        "timestamp": datetime.now(),
                    }
                )

        # Check for order rate anomalies
        if "orders_per_minute" in df:
            mean_rate = df["orders_per_minute"].mean()
            std_rate = df["orders_per_minute"].std()

            current_rate = df["orders_per_minute"].iloc[-1]

            if abs(current_rate - mean_rate) > self.anomaly_threshold * std_rate:
                anomalies.append(
                    {
                        "type": "order_rate",
                        "severity": "high",
                        "message": f"Unusual order rate: {current_rate:.1f}/min (avg: {mean_rate:.1f}/min)",
                        "timestamp": datetime.now(),
                    }
                )

        return anomalies

    def get_live_metrics(self) -> Dict:
        """Get current live metrics."""
        if len(self.metrics_history) == 0:
            return {}

        latest = list(self.metrics_history)[-1]

        # Calculate trends
        if len(self.metrics_history) >= 2:
            previous = list(self.metrics_history)[-2]

            order_trend = (
                (
                    (latest["total_orders"] - previous["total_orders"])
                    / previous["total_orders"]
                    * 100
                )
                if previous["total_orders"] > 0
                else 0
            )

            value_trend = (
                (
                    (latest["avg_order_value"] - previous["avg_order_value"])
                    / previous["avg_order_value"]
                    * 100
                )
                if previous["avg_order_value"] > 0
                else 0
            )
        else:
            order_trend = 0
            value_trend = 0

        return {
            **latest,
            "order_trend": order_trend,
            "value_trend": value_trend,
            "anomalies": self.detect_anomalies(),
        }

    def get_time_series(self, metric: str, minutes: int = 60) -> pd.DataFrame:
        """
        Get time series data for a specific metric.

        Args:
            metric: Metric name
            minutes: Number of minutes to look back

        Returns:
            DataFrame with timestamp and metric values
        """
        if len(self.metrics_history) == 0:
            return pd.DataFrame()

        df = pd.DataFrame(list(self.metrics_history))

        # Filter by time window
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        df = df[df["timestamp"] >= cutoff_time]

        if metric in df.columns:
            return df[["timestamp", metric]]
        else:
            return pd.DataFrame()

    def generate_live_forecast(self, horizon_minutes: int = 30) -> pd.DataFrame:
        """
        Generate short-term forecast for next N minutes.

        Args:
            horizon_minutes: Forecast horizon in minutes

        Returns:
            DataFrame with forecasted values
        """
        if len(self.metrics_history) < 10:
            return pd.DataFrame()

        df = pd.DataFrame(list(self.metrics_history))

        # Simple moving average forecast
        window = min(10, len(df))
        recent_rate = df["orders_per_minute"].tail(window).mean()

        # Generate forecast timestamps
        last_time = df["timestamp"].iloc[-1]
        forecast_times = [
            last_time + timedelta(minutes=i) for i in range(1, horizon_minutes + 1)
        ]

        # Simple linear trend
        forecast_values = [recent_rate * (1 + 0.01 * i) for i in range(horizon_minutes)]

        forecast_df = pd.DataFrame(
            {
                "timestamp": forecast_times,
                "forecasted_orders_per_minute": forecast_values,
            }
        )

        return forecast_df

    def get_platform_performance(self) -> pd.DataFrame:
        """Get real-time platform performance comparison."""
        if len(self.order_stream) == 0:
            return pd.DataFrame()

        df = pd.DataFrame(list(self.order_stream))

        if "platform" not in df:
            return pd.DataFrame()

        performance = (
            df.groupby("platform")
            .agg(
                {
                    "order_value": ["count", "mean", "sum"],
                    "delivery_time": "mean" if "delivery_time" in df else lambda x: 0,
                }
            )
            .reset_index()
        )

        performance.columns = [
            "platform",
            "order_count",
            "avg_order_value",
            "total_revenue",
            "avg_delivery_time",
        ]

        return performance.sort_values("total_revenue", ascending=False)


# Global instance
realtime_analytics = RealtimeAnalytics()


def simulate_live_orders(n: int = 10):
    """Simulate live orders for testing."""
    platforms = ["Blinkit", "Zepto", "Instamart", "Flipkart Minutes"]

    for _ in range(n):
        order = {
            "platform": np.random.choice(platforms),
            "order_value": np.random.uniform(200, 1500),
            "delivery_time": np.random.randint(8, 25),
            "hour": datetime.now().hour,
            "pincode": f"{np.random.randint(100000, 999999)}",
        }
        realtime_analytics.add_order(order)

    logger.info(f"Simulated {n} live orders")
    return realtime_analytics.get_live_metrics()


if __name__ == "__main__":
    # Test real-time analytics
    metrics = simulate_live_orders(50)
    print("\n=== Live Metrics ===")
    for key, value in metrics.items():
        if key != "anomalies":
            print(f"{key}: {value}")

    if metrics.get("anomalies"):
        print("\n=== Anomalies Detected ===")
        for anomaly in metrics["anomalies"]:
            print(f"[{anomaly['severity'].upper()}] {anomaly['message']}")
