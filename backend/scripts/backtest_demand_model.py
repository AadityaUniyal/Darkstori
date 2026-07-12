"""
Demand Model Backtesting Script
Validates the historical accuracy of the demand forecasting model by comparing
predictions to actual synthetic orders week over week.
"""

import asyncio
import logging
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy import select
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error
import numpy as np

from backend.database.connection import get_async_session
from backend.database.models.models import OrderSynthetic, MLPrediction
from backend.ml.model_registry import ModelRegistry
from backend.ml.features.demand_features import build_demand_features_for_date

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_backtest():
    """Run backtesting against historical weeks."""
    logger.info("Starting Demand Model Backtesting...")
    
    registry = ModelRegistry()
    model = registry.load_model("demand_forecasting_model", stage="Production")
    if not model:
        logger.error("Production model not found! Train a model first.")
        return

    async with get_async_session() as db:
        # Define 4 historical weeks
        end_date = datetime.now().date()
        
        for weeks_ago in range(4, 0, -1):
            target_date = end_date - timedelta(days=weeks_ago * 7)
            logger.info(f"--- Backtesting Week of {target_date} ---")
            
            # 1. Fetch actual orders for that date
            q = select(OrderSynthetic).where(OrderSynthetic.order_date == target_date)
            res = await db.execute(q)
            orders = res.scalars().all()
            
            if not orders:
                logger.warning(f"No orders found for {target_date}, skipping.")
                continue
                
            actual_volume = len(orders)
            
            # 2. Build features for that date (as if we were predicting it beforehand)
            # For simplicity, we predict for the first store in the DB
            features = await build_demand_features_for_date(db, store_id=1, target_date=target_date)
            
            # 3. Make prediction
            df = pd.DataFrame([features])
            prediction_log = model.predict(df)[0]
            predicted_volume = int(np.expm1(prediction_log)) # Assuming log1p transformed
            
            # 4. Calculate error
            mape = mean_absolute_percentage_error([actual_volume], [predicted_volume])
            
            logger.info(f"Target Date: {target_date}")
            logger.info(f"Actual Orders: {actual_volume}")
            logger.info(f"Predicted Orders: {predicted_volume}")
            logger.info(f"MAPE: {mape:.2%}")
            
    logger.info("Backtesting Complete.")

if __name__ == "__main__":
    asyncio.run(run_backtest())
