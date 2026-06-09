"""Pydantic Schemas for ML API.

This module defines request and response schemas for ML prediction
and model management endpoints.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

# Prediction Schemas


class PredictionRequest(BaseModel):
    """Request schema for single prediction."""

    pincode: str = Field(..., description="6-digit PIN code to look up neighborhood")
    order_date: str = Field(..., description="Order date in YYYY-MM-DD format")
    population: Optional[int] = Field(None, ge=0, description="Override population")
    platform_count: Optional[int] = Field(None, ge=1, description="Override active platform count")

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v):
        """Validate PIN code format."""
        if not v.isdigit() or len(v) != 6:
            raise ValueError("PIN code must be 6 digits")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "pincode": "560001",
                "order_date": "2026-05-15",
            }
        }


class PredictionResponse(BaseModel):
    """Response schema for single prediction."""

    prediction: float = Field(..., description="Predicted order count")
    lower_bound: float = Field(..., description="Lower confidence bound")
    upper_bound: float = Field(..., description="Upper confidence bound")
    model_name: str = Field(..., description="Model name used")
    model_version: str = Field(..., description="Model version used")
    latency_ms: float = Field(..., description="Prediction latency in milliseconds")
    prediction_id: str = Field(..., description="Unique prediction ID")
    timestamp: str = Field(..., description="Prediction timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "prediction": 150.5,
                "lower_bound": 140.0,
                "upper_bound": 160.0,
                "model_name": "demand_forecasting_model",
                "model_version": "1",
                "latency_ms": 45.2,
                "prediction_id": "pred_20260510_123456",
                "timestamp": "2026-05-10T12:34:56",
            }
        }


class BatchPredictionRequest(BaseModel):
    """Request schema for batch predictions."""

    file_path: str = Field(..., description="Path to CSV file with input data")
    output_path: Optional[str] = Field(
        None, description="Path for output CSV (optional)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "file_path": "/data/input_batch.csv",
                "output_path": "/data/output_batch.csv",
            }
        }


class BatchPredictionResponse(BaseModel):
    """Response schema for batch predictions."""

    job_id: str = Field(..., description="Batch job ID")
    status: str = Field(..., description="Job status")
    total_rows: int = Field(..., description="Total rows processed")
    output_path: str = Field(..., description="Path to output file")
    processing_time_seconds: float = Field(..., description="Processing time")

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "batch_20260510_123456",
                "status": "completed",
                "total_rows": 1000,
                "output_path": "/data/output_batch.csv",
                "processing_time_seconds": 12.5,
            }
        }


# Model Management Schemas


class ModelInfoResponse(BaseModel):
    """Response schema for model information."""

    model_name: str = Field(..., description="Model name")
    model_version: str = Field(..., description="Model version")
    stage: str = Field(..., description="Model stage")
    created_at: str = Field(..., description="Creation timestamp")
    metrics: Dict[str, float] = Field(..., description="Model metrics")
    tags: Dict[str, str] = Field(default_factory=dict, description="Model tags")
    description: Optional[str] = Field(None, description="Model description")

    class Config:
        json_schema_extra = {
            "example": {
                "model_name": "demand_forecasting_model",
                "model_version": "1",
                "stage": "Production",
                "created_at": "2026-05-10T10:00:00",
                "metrics": {"r2_score": 0.87, "rmse": 45.2, "mae": 32.1},
                "tags": {"model_type": "xgboost", "training_date": "2026-05-10"},
                "description": "XGBoost model for demand forecasting",
            }
        }


class ModelTransitionRequest(BaseModel):
    """Request schema for model stage transition."""

    model_name: str = Field(..., description="Model name")
    version: int = Field(..., ge=1, description="Model version")
    stage: str = Field(..., description="Target stage")
    archive_existing: bool = Field(
        True, description="Archive existing models in target stage"
    )

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, v):
        """Validate stage."""
        allowed = ["None", "Staging", "Production", "Archived"]
        if v not in allowed:
            raise ValueError(f"Stage must be one of {allowed}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "model_name": "demand_forecasting_model",
                "version": 2,
                "stage": "Production",
                "archive_existing": True,
            }
        }


class ModelReloadResponse(BaseModel):
    """Response schema for model reload."""

    success: bool = Field(..., description="Whether reload was successful")
    message: str = Field(..., description="Status message")
    model_name: str = Field(..., description="Model name")
    model_version: str = Field(..., description="Current model version")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Model reloaded successfully",
                "model_name": "demand_forecasting_model",
                "model_version": "2",
            }
        }


class ModelTransitionResponse(BaseModel):
    """Response schema for model stage transition."""

    success: bool = Field(..., description="Whether transition was successful")
    message: str = Field(..., description="Status message")
    model_name: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    new_stage: str = Field(..., description="New stage")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Model transitioned successfully",
                "model_name": "demand_forecasting_model",
                "version": "2",
                "new_stage": "Production",
            }
        }


class ModelListResponse(BaseModel):
    """Response schema for listing models."""

    models: List[Dict[str, Any]] = Field(..., description="List of models")
    total_count: int = Field(..., description="Total number of models")

    class Config:
        json_schema_extra = {
            "example": {
                "models": [
                    {
                        "name": "demand_forecasting_model",
                        "production_version": "2",
                        "staging_version": "3",
                        "latest_version": "3",
                    }
                ],
                "total_count": 1,
            }
        }


# Training Schemas


class TrainingJobRequest(BaseModel):
    """Request schema for training job."""

    experiment_name: str = Field(..., description="Experiment name")
    model_types: Optional[List[str]] = Field(None, description="Model types to train")
    config_override: Optional[Dict[str, Any]] = Field(
        None, description="Configuration overrides"
    )
    dataset_version: Optional[str] = Field(None, description="Dataset version")

    @field_validator("model_types")
    @classmethod
    def validate_model_types(cls, v):
        """Validate model types."""
        if v is not None:
            allowed = ["xgboost", "random_forest", "gradient_boosting"]
            for model_type in v:
                if model_type not in allowed:
                    raise ValueError(f"Model type must be one of {allowed}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "experiment_name": "demand_forecasting",
                "model_types": ["xgboost", "random_forest"],
                "config_override": {"test_size": 0.2},
                "dataset_version": "v1.0",
            }
        }


class TrainingJobResponse(BaseModel):
    """Response schema for training job."""

    job_id: str = Field(..., description="Training job ID")
    status: str = Field(..., description="Job status")
    experiment_name: str = Field(..., description="Experiment name")
    run_id: Optional[str] = Field(None, description="MLflow run ID")
    started_at: str = Field(..., description="Start timestamp")
    completed_at: Optional[str] = Field(None, description="Completion timestamp")
    best_model_type: Optional[str] = Field(None, description="Best model type")
    best_r2_score: Optional[float] = Field(None, description="Best R² score")
    training_duration_seconds: Optional[int] = Field(
        None, description="Training duration"
    )
    error_message: Optional[str] = Field(None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "job_id": "job_20260510_123456",
                "status": "completed",
                "experiment_name": "demand_forecasting",
                "run_id": "abc123def456",
                "started_at": "2026-05-10T10:00:00",
                "completed_at": "2026-05-10T10:05:00",
                "best_model_type": "xgboost",
                "best_r2_score": 0.87,
                "training_duration_seconds": 300,
                "error_message": None,
            }
        }


# Performance Monitoring Schemas


class PerformanceMetricsResponse(BaseModel):
    """Response schema for performance metrics."""

    model_name: str = Field(..., description="Model name")
    model_version: str = Field(..., description="Model version")
    window_days: int = Field(..., description="Rolling window in days")
    metrics: Dict[str, float] = Field(..., description="Performance metrics")
    prediction_count: int = Field(..., description="Number of predictions")
    metric_date: str = Field(..., description="Metric date")

    class Config:
        json_schema_extra = {
            "example": {
                "model_name": "demand_forecasting_model",
                "model_version": "1",
                "window_days": 7,
                "metrics": {"r2_score": 0.85, "rmse": 48.5, "mae": 35.2, "mape": 13.5},
                "prediction_count": 1500,
                "metric_date": "2026-05-10",
            }
        }


class DriftDetectionResponse(BaseModel):
    """Response schema for drift detection."""

    model_name: str = Field(..., description="Model name")
    check_date: str = Field(..., description="Check date")
    features_checked: int = Field(..., description="Number of features checked")
    drift_detected_count: int = Field(..., description="Number of features with drift")
    drift_details: List[Dict[str, Any]] = Field(
        ..., description="Drift details per feature"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "model_name": "demand_forecasting_model",
                "check_date": "2026-05-10",
                "features_checked": 20,
                "drift_detected_count": 2,
                "drift_details": [
                    {
                        "feature_name": "population",
                        "drift_detected": True,
                        "ks_statistic": 0.15,
                        "p_value": 0.03,
                    }
                ],
            }
        }


class HealthCheckResponse(BaseModel):
    """Response schema for health check."""

    status: str = Field(..., description="Overall status")
    mlflow_server: str = Field(..., description="MLflow server status")
    database: str = Field(..., description="Database status")
    model_available: bool = Field(..., description="Model availability")
    artifact_storage: str = Field(..., description="Artifact storage status")
    timestamp: str = Field(..., description="Check timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "mlflow_server": "connected",
                "database": "connected",
                "model_available": True,
                "artifact_storage": "accessible",
                "timestamp": "2026-05-10T12:34:56",
            }
        }


# Experiment Schemas


class ExperimentListResponse(BaseModel):
    """Response schema for listing experiments."""

    experiments: List[Dict[str, Any]] = Field(..., description="List of experiments")
    total_count: int = Field(..., description="Total number of experiments")

    class Config:
        json_schema_extra = {
            "example": {
                "experiments": [
                    {
                        "experiment_id": "1",
                        "name": "demand_forecasting",
                        "artifact_location": "./mlruns/1",
                        "lifecycle_stage": "active",
                    }
                ],
                "total_count": 1,
            }
        }


class RunListResponse(BaseModel):
    """Response schema for listing runs."""

    runs: List[Dict[str, Any]] = Field(..., description="List of runs")
    total_count: int = Field(..., description="Total number of runs")

    class Config:
        json_schema_extra = {
            "example": {
                "runs": [
                    {
                        "run_id": "abc123",
                        "experiment_id": "1",
                        "status": "FINISHED",
                        "start_time": "2026-05-10T10:00:00",
                        "metrics": {"r2_score": 0.87},
                    }
                ],
                "total_count": 1,
            }
        }
