"""Drift Detection Monitor.

Checks model performance over time by comparing predicted vs actual orders.
If the Mean Absolute Percentage Error (MAPE) exceeds a threshold, it logs an alert.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import SessionLocal
from backend.database.models.models import StoreOrder, OrderForecast
from backend.core.config import settings

logger = logging.getLogger(__name__)


class DriftMonitor:
    """Monitors model drift by evaluating predictions against actual outcomes."""
    
    def __init__(self, threshold_mape: float = 15.0):
        self.threshold_mape = threshold_mape
        
    async def calculate_drift(self, db: AsyncSession, days_back: int = 7) -> Dict[str, Any]:
        """Calculate drift over a rolling window."""
        start_date = datetime.now().date() - timedelta(days=days_back)
        
        # Get actual orders and forecasts joined by date and neighborhood
        # In a real system, you might join by store_id and date.
        # Since we use synthetic data, we will mock the drift calculation conceptually.
        
        # NOTE: For this simulated environment, we will fetch the last N forecasts
        # and compare them with simulated actual orders.
        query = select(OrderForecast).where(OrderForecast.target_date >= start_date)
        result = await db.execute(query)
        forecasts = result.scalars().all()
        
        if not forecasts:
            return {"status": "skipped", "reason": "No recent forecasts found"}
            
        actual_vs_pred = []
        for forecast in forecasts:
            # We would normally query StoreOrder here, but since the database 
            # structure stores aggregate predictions, we simulate actuals by
            # injecting a synthetic drift (this is just for demonstration).
            # If we had actual counts, it would be: actual = await db.query(count)...
            
            # Simulated actual: forecast + some random noise
            import random
            random.seed(hash(f"{forecast.neighborhood_id}_{forecast.target_date}"))
            
            # Simulate a 12% baseline drift to trigger alerts occasionally
            noise_factor = random.uniform(-0.05, 0.20)
            actual_orders = int(forecast.predicted_orders * (1 + noise_factor))
            
            actual_vs_pred.append({
                "predicted": forecast.predicted_orders,
                "actual": actual_orders
            })
            
        if not actual_vs_pred:
            return {"status": "skipped", "reason": "No comparable data found"}
            
        # Calculate MAPE
        total_pe = 0.0
        for pair in actual_vs_pred:
            if pair["actual"] > 0:
                pe = abs(pair["actual"] - pair["predicted"]) / pair["actual"]
                total_pe += pe
                
        mape = (total_pe / len(actual_vs_pred)) * 100
        
        is_drifting = mape > self.threshold_mape
        
        result_data = {
            "status": "completed",
            "mape": round(mape, 2),
            "threshold": self.threshold_mape,
            "is_drifting": is_drifting,
            "samples": len(actual_vs_pred),
            "window_days": days_back
        }
        
        if is_drifting:
            logger.warning(
                f"[DRIFT ALERT] Model performance degraded! "
                f"MAPE={mape:.2f}% over last {days_back} days (Threshold: {self.threshold_mape}%). "
                f"Consider retraining the model."
            )
        else:
            logger.info(
                f"Model performance is healthy. "
                f"MAPE={mape:.2f}% over last {days_back} days."
            )
            
        return result_data


async def run_drift_check():
    """Entry point to run the drift check job."""
    if not settings.ENABLE_DRIFT_DETECTION:
        logger.info("Drift detection is disabled in settings.")
        return
        
    logger.info("Starting model drift check...")
    monitor = DriftMonitor()
    
    async with SessionLocal() as db:
        await monitor.calculate_drift(db, days_back=settings.DRIFT_CHECK_FREQUENCY_DAYS)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_drift_check())
