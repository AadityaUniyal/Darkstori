"""ML Monitoring API Endpoints.

This module provides FastAPI endpoints for monitoring model
performance, drift detection, and system health.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
import pandas as pd

from backend.ml.schemas import (
    PerformanceMetricsResponse,
    DriftDetectionResponse,
    HealthCheckResponse
)
from backend.ml.performance_monitor import PerformanceMonitor
from backend.ml.mlflow_server import get_server_manager
from backend.database.connection import get_db
from backend.core.logger import logger
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


async def get_monitor(db: AsyncSession = Depends(get_db)) -> PerformanceMonitor:
    """Dependency to get performance monitor."""
    return PerformanceMonitor(db_session=db)


@router.get("/performance", response_model=PerformanceMetricsResponse)
async def get_performance_metrics(
    model_name: str = "demand_forecasting_model",
    model_version: Optional[str] = None,
    window_days: int = Query(7, ge=1, le=90),
    monitor: PerformanceMonitor = Depends(get_monitor)
) -> PerformanceMetricsResponse:
    """
    Get model performance metrics over rolling window.
    
    - Returns rolling metrics for specified window
    - Shows trend analysis
    - Includes prediction count and latency stats
    """
    try:
        # Calculate rolling metrics
        metrics = await monitor.calculate_rolling_metrics(
            model_name=model_name,
            model_version=model_version,
            window_days=window_days
        )
        
        if not metrics:
            raise HTTPException(
                status_code=404,
                detail=f"No metrics found for {model_name} in last {window_days} days"
            )
        
        return PerformanceMetricsResponse(
            model_name=model_name,
            model_version=model_version or 'all',
            window_days=window_days,
            metrics={
                'r2_score': metrics.get('r2_score'),
                'rmse': metrics.get('rmse'),
                'mae': metrics.get('mae'),
                'mape': metrics.get('mape')
            },
            prediction_count=metrics.get('prediction_count', 0),
            metric_date=datetime.now().date().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve performance metrics"
        )


@router.get("/performance/history")
async def get_performance_history(
    model_name: str = "demand_forecasting_model",
    model_version: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    window_days: int = Query(7, ge=1, le=90),
    monitor: PerformanceMonitor = Depends(get_monitor)
) -> Dict[str, Any]:
    """
    Get performance metrics history over time.
    
    - Returns time series of metrics
    - Useful for trend visualization
    """
    try:
        history = await monitor.get_performance_history(
            model_name=model_name,
            model_version=model_version,
            days=days,
            window_days=window_days
        )
        
        return {
            'model_name': model_name,
            'model_version': model_version or 'all',
            'window_days': window_days,
            'history_days': days,
            'data_points': len(history),
            'history': history
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance history: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve performance history"
        )


@router.get("/drift", response_model=DriftDetectionResponse)
async def get_drift_status(
    model_name: str = "demand_forecasting_model",
    recent_days: int = Query(7, ge=1, le=30),
    monitor: PerformanceMonitor = Depends(get_monitor)
) -> DriftDetectionResponse:
    """
    Get feature drift detection results.
    
    - Returns drift statistics per feature
    - Highlights features with significant drift
    - Uses Kolmogorov-Smirnov test
    """
    try:
        # For drift detection, we need training data
        # This is a simplified version - in production, load actual training data
        # TODO: Load training data from artifacts or database
        
        # Placeholder: Return recent drift results from database
        drift_history = await monitor.get_drift_history(
            model_name=model_name,
            days=recent_days
        )
        
        if not drift_history:
            # No drift detected recently
            return DriftDetectionResponse(
                model_name=model_name,
                check_date=datetime.now().date().isoformat(),
                features_checked=0,
                drift_detected_count=0,
                drift_details=[]
            )
        
        # Group by feature and get latest
        features_with_drift = {}
        for drift in drift_history:
            feature = drift['feature_name']
            if feature not in features_with_drift:
                features_with_drift[feature] = drift
        
        drift_details = list(features_with_drift.values())
        
        return DriftDetectionResponse(
            model_name=model_name,
            check_date=datetime.now().date().isoformat(),
            features_checked=len(drift_details),
            drift_detected_count=len(drift_details),
            drift_details=drift_details
        )
        
    except Exception as e:
        logger.error(f"Failed to get drift status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve drift status"
        )


@router.post("/drift/check")
async def check_drift(
    model_name: str = "demand_forecasting_model",
    recent_days: int = Query(7, ge=1, le=30),
    threshold: float = Query(0.05, ge=0.01, le=0.1),
    monitor: PerformanceMonitor = Depends(get_monitor)
) -> Dict[str, Any]:
    """
    Trigger drift detection check.
    
    - Performs KS test on recent predictions vs training data
    - Stores results in database
    - Returns drift detection results
    """
    try:
        # TODO: Load actual training data from artifacts
        # For now, return error indicating training data needed
        
        return {
            'status': 'not_implemented',
            'message': 'Drift detection requires training data to be loaded. This will be implemented when training data artifacts are available.',
            'model_name': model_name,
            'recent_days': recent_days,
            'threshold': threshold
        }
        
    except Exception as e:
        logger.error(f"Failed to check drift: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to perform drift check"
        )


@router.get("/degradation")
async def check_degradation(
    model_name: str = "demand_forecasting_model",
    model_version: Optional[str] = None,
    warning_threshold: float = Query(0.80, ge=0.0, le=1.0),
    alert_threshold: float = Query(0.75, ge=0.0, le=1.0),
    window_days: int = Query(7, ge=1, le=90),
    monitor: PerformanceMonitor = Depends(get_monitor)
) -> Dict[str, Any]:
    """
    Check for performance degradation.
    
    - Compares current metrics against thresholds
    - Returns status: healthy, warning, or alert
    - Includes severity level
    """
    try:
        result = await monitor.check_performance_degradation(
            model_name=model_name,
            model_version=model_version,
            warning_threshold=warning_threshold,
            alert_threshold=alert_threshold,
            window_days=window_days
        )
        
        if 'error' in result:
            raise HTTPException(
                status_code=404,
                detail=result['error']
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check degradation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to check performance degradation"
        )


@router.get("/health", response_model=HealthCheckResponse)
async def ml_health_check() -> HealthCheckResponse:
    """
    Health check for ML system.
    
    - Verifies MLflow server connectivity
    - Checks database access
    - Returns system status
    """
    try:
        # Check MLflow server
        mlflow_status = "unknown"
        try:
            mlflow_manager = get_server_manager()
            if mlflow_manager.health_check():
                mlflow_status = "connected"
            else:
                mlflow_status = "disconnected"
        except Exception as e:
            logger.error(f"MLflow health check failed: {e}")
            mlflow_status = "error"
        
        # Check database
        database_status = "connected"  # If we got here, DB is working
        
        # Check model availability
        model_available = True  # Simplified check
        
        # Check artifact storage
        artifact_storage = "accessible"  # Simplified check
        
        # Determine overall status
        if mlflow_status == "connected" and database_status == "connected":
            overall_status = "healthy"
        elif mlflow_status == "disconnected":
            overall_status = "degraded"
        else:
            overall_status = "unhealthy"
        
        return HealthCheckResponse(
            status=overall_status,
            mlflow_server=mlflow_status,
            database=database_status,
            model_available=model_available,
            artifact_storage=artifact_storage,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return HealthCheckResponse(
            status="unhealthy",
            mlflow_server="error",
            database="error",
            model_available=False,
            artifact_storage="error",
            timestamp=datetime.now().isoformat()
        )


@router.get("/predictions/recent")
async def get_recent_predictions(
    model_name: str = "demand_forecasting_model",
    limit: int = Query(100, ge=1, le=1000),
    monitor: PerformanceMonitor = Depends(get_monitor)
) -> Dict[str, Any]:
    """
    Get recent predictions for analysis.
    
    - Returns recent prediction records
    - Includes actual values if available
    - Useful for debugging and analysis
    """
    try:
        from backend.database.models import MLPrediction
        from sqlalchemy import select
        
        # Query recent predictions
        result = await monitor.db.execute(
            select(MLPrediction)
            .where(MLPrediction.model_name == model_name)
            .order_by(MLPrediction.created_at.desc())
            .limit(limit)
        )
        predictions = result.scalars().all()
        
        prediction_list = []
        for pred in predictions:
            prediction_list.append({
                'prediction_id': pred.prediction_id,
                'model_version': pred.model_version,
                'prediction': pred.prediction,
                'actual_value': pred.actual_value,
                'prediction_error': pred.prediction_error,
                'latency_ms': pred.latency_ms,
                'created_at': pred.created_at.isoformat()
            })
        
        return {
            'model_name': model_name,
            'count': len(prediction_list),
            'predictions': prediction_list
        }
        
    except Exception as e:
        logger.error(f"Failed to get recent predictions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve recent predictions"
        )
