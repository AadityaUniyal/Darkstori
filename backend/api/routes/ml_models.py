"""API routes for ML Model Registry and training pipeline orchestration."""

import logging
from typing import List, Dict, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, BackgroundTasks, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.core.security import verify_token
from backend.ml.model_registry import ModelRegistry
from backend.pipelines.training_pipeline import TrainingPipeline
from backend.utils.scheduler import global_scheduler
from backend.database.connection import get_db
from backend.ml.drift_monitor import DriftMonitor
from backend.core.audit import log_audit_action

logger = logging.getLogger(__name__)
router = APIRouter()


class ModelListResponse(BaseModel):
    name: str
    creation_timestamp: str
    last_updated_timestamp: str
    description: Optional[str] = None
    production_version: Optional[str] = None
    staging_version: Optional[str] = None
    latest_version: Optional[str] = None
    is_fallback: bool = False


class ModelInfoResponse(BaseModel):
    name: str
    version: str
    stage: str
    description: Optional[str] = None
    creation_timestamp: str
    last_updated_timestamp: str
    run_id: str
    source: str
    tags: Dict[str, str]
    status: str
    is_fallback: bool = False


# Helper to run pipeline in background
def run_training_job():
    logger.info("Starting background ML model training task...")
    try:
        pipeline = TrainingPipeline()
        results = pipeline.run()
        logger.info(f"Background ML training complete! Best Model: {results['best_model']}")
    except Exception as e:
        logger.error(f"Background ML training failed: {e}")


@router.get("/models", response_model=List[ModelListResponse])
async def list_models(
    token_payload: dict = Depends(verify_token)
):
    """List all registered ML models with their latest versions in MLflow registry."""
    try:
        registry = ModelRegistry()
        models = registry.list_models()
        if not models:
            raise ValueError("No models registered in MLflow")
        
        # Add is_fallback=False
        return [
            ModelListResponse(**m, is_fallback=False) if isinstance(m, dict) else ModelListResponse(
                name=m.name,
                creation_timestamp=m.creation_timestamp,
                last_updated_timestamp=m.last_updated_timestamp,
                description=m.description,
                production_version=m.production_version,
                staging_version=m.staging_version,
                latest_version=m.latest_version,
                is_fallback=False
            ) for m in models
        ]
    except Exception as e:
        logger.warning(f"MLflow registry unavailable or empty, returning local cache model: {e}")
        # Fallback list for offline mode marked clearly
        return [
            ModelListResponse(
                name="demand_forecasting_model",
                creation_timestamp="2026-06-01T00:00:00Z", # static timestamp instead of datetime.now()
                last_updated_timestamp="2026-06-15T00:00:00Z",
                description="Hyperlocal demand forecasting ensemble model (Simulated Local Fallback).",
                production_version="3.0.0",
                staging_version="3.1.0-rc",
                latest_version="3.1.0",
                is_fallback=True
            )
        ]


@router.get("/model/info", response_model=ModelInfoResponse)
async def get_model_info(
    model_name: str = "demand_forecasting_model",
    stage: str = "Production",
    token_payload: dict = Depends(verify_token)
):
    """Get detailed metadata of a specific model version and lifecycle stage."""
    try:
        registry = ModelRegistry()
        info = registry.get_model_info(model_name, stage=stage)
        if not info or "error" in info:
            raise ValueError(info.get("error") if info else "Model info is empty")
        return ModelInfoResponse(**info, is_fallback=False)
    except Exception as e:
        logger.warning(f"Could not retrieve model details from MLflow: {e}")
        # Fallback details for offline mode marked clearly
        return ModelInfoResponse(
            name=model_name,
            version="3.0.0",
            stage=stage,
            description="Ensemble regressor combining XGBoost, GradientBoosting, and RandomForest (Simulated Local Fallback).",
            creation_timestamp="2026-06-01T00:00:00Z",
            last_updated_timestamp="2026-06-15T00:00:00Z",
            run_id="local-fallback-run-uuid-001",
            source="./models/production",
            tags={"framework": "scikit-learn/xgboost", "focus": "seasonality"},
            status="READY",
            is_fallback=True
        )


@router.post("/train", status_code=status.HTTP_202_ACCEPTED)
async def trigger_training(
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token)
):
    """Trigger the end-to-end ML model training pipeline in a background task."""
    background_tasks.add_task(run_training_job)
    user_id = token_payload.get("user_id")
    await log_audit_action(db, "ML_TRAINING_TRIGGERED", request=request, user_id=int(user_id) if user_id else None)
    return {"message": "Model training task started successfully in background."}


@router.get("/scheduler/jobs")
async def get_scheduler_jobs(
    token_payload: dict = Depends(verify_token)
):
    """List all scheduled background sync jobs and their execution states."""
    return global_scheduler.jobs_history


# ── MLOps Settings & Auto-Retraining Triggers ───────────────────────────────

ml_settings = {"auto_retrain_enabled": False}

class MLSettingsRequest(BaseModel):
    auto_retrain_enabled: bool


@router.get("/settings")
async def get_ml_settings(
    token_payload: dict = Depends(verify_token)
):
    """Get active ML settings."""
    return ml_settings


@router.post("/settings")
async def update_ml_settings(
    req: MLSettingsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token)
):
    """Update active ML settings."""
    global ml_settings
    ml_settings["auto_retrain_enabled"] = req.auto_retrain_enabled
    user_id = token_payload.get("user_id")
    await log_audit_action(db, "ML_SETTINGS_UPDATED", request=request, user_id=int(user_id) if user_id else None, new_state={"auto_retrain": req.auto_retrain_enabled})
    return ml_settings


@router.post("/check-drift")
async def check_drift_and_retrain(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(verify_token)
):
    """Scan drift parameters and auto-trigger retrain if conditions breached."""
    monitor = DriftMonitor()
    result = await monitor.calculate_drift(db)
    
    drift_detected = result.get("is_drifting", False)
    triggered = False
    
    if drift_detected and ml_settings["auto_retrain_enabled"]:
        background_tasks.add_task(run_training_job)
        triggered = True
        logger.warning(f"[MLOps] Automated retraining triggered. MAPE: {result.get('mape')}%")
        
    return {
        "status": "success",
        "drift_detected": drift_detected,
        "mape": result.get("mape", 0.0),
        "retraining_triggered": triggered,
        "timestamp": datetime.now().isoformat()
    }
