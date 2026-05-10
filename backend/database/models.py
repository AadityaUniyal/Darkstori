"""SQLAlchemy ORM models for ML tracking tables.

This module contains the database models for ML prediction logging,
performance monitoring, drift detection, and training job tracking.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime, Text,
    Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base

# Import Base from the main models module
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from database.models.models import Base


class MLPrediction(Base):
    """Model prediction logging for monitoring.
    
    This table stores all predictions made by ML models for monitoring
    and performance tracking purposes.
    """
    __tablename__ = 'ml_predictions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    prediction_id = Column(String(50), unique=True, nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    
    # Prediction data
    input_data = Column(JSONB, nullable=False)
    prediction = Column(Float, nullable=False)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    
    # Actual outcome (for monitoring)
    actual_value = Column(Float)
    prediction_error = Column(Float)
    
    # Performance
    latency_ms = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_predictions_model', 'model_name', 'model_version'),
        Index('idx_predictions_created', 'created_at'),
        Index('idx_predictions_error', 'prediction_error'),
    )
    
    def __repr__(self):
        return f"<MLPrediction(id={self.prediction_id}, model={self.model_name}, version={self.model_version})>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'prediction_id': self.prediction_id,
            'model_name': self.model_name,
            'model_version': self.model_version,
            'input_data': self.input_data,
            'prediction': self.prediction,
            'lower_bound': self.lower_bound,
            'upper_bound': self.upper_bound,
            'actual_value': self.actual_value,
            'prediction_error': self.prediction_error,
            'latency_ms': self.latency_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class MLPerformanceMetric(Base):
    """Rolling performance metrics.
    
    This table stores aggregated performance metrics over rolling time windows
    for monitoring model performance degradation.
    """
    __tablename__ = 'ml_performance_metrics'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    metric_date = Column(Date, nullable=False, index=True)
    window_days = Column(Integer, nullable=False)
    
    # Performance metrics
    r2_score = Column(Float)
    rmse = Column(Float)
    mae = Column(Float)
    mape = Column(Float)
    
    # Volume metrics
    prediction_count = Column(Integer)
    avg_latency_ms = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('model_name', 'model_version', 'metric_date', 'window_days', name='uq_perf_metrics'),
        Index('idx_perf_model_date', 'model_name', 'metric_date'),
    )
    
    def __repr__(self):
        return f"<MLPerformanceMetric(model={self.model_name}, date={self.metric_date}, r2={self.r2_score})>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'model_name': self.model_name,
            'model_version': self.model_version,
            'metric_date': self.metric_date.isoformat() if self.metric_date else None,
            'window_days': self.window_days,
            'r2_score': self.r2_score,
            'rmse': self.rmse,
            'mae': self.mae,
            'mape': self.mape,
            'prediction_count': self.prediction_count,
            'avg_latency_ms': self.avg_latency_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class MLFeatureDrift(Base):
    """Feature distribution drift detection.
    
    This table stores drift detection results for monitoring changes in
    input feature distributions over time.
    """
    __tablename__ = 'ml_feature_drift'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(100), nullable=False, index=True)
    feature_name = Column(String(100), nullable=False)
    check_date = Column(Date, nullable=False, index=True)
    
    # Drift statistics
    ks_statistic = Column(Float)
    p_value = Column(Float)
    drift_detected = Column(Boolean)
    
    # Distribution statistics
    training_mean = Column(Float)
    current_mean = Column(Float)
    training_std = Column(Float)
    current_std = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        Index('idx_drift_model_date', 'model_name', 'check_date'),
        Index('idx_drift_detected', 'drift_detected', 'check_date'),
    )
    
    def __repr__(self):
        return f"<MLFeatureDrift(model={self.model_name}, feature={self.feature_name}, drift={self.drift_detected})>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'model_name': self.model_name,
            'feature_name': self.feature_name,
            'check_date': self.check_date.isoformat() if self.check_date else None,
            'ks_statistic': self.ks_statistic,
            'p_value': self.p_value,
            'drift_detected': self.drift_detected,
            'training_mean': self.training_mean,
            'current_mean': self.current_mean,
            'training_std': self.training_std,
            'current_std': self.current_std,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class MLTrainingJob(Base):
    """Training job execution history.
    
    This table tracks all training job executions including configuration,
    results, and error information.
    """
    __tablename__ = 'ml_training_jobs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(50), unique=True, nullable=False, index=True)
    job_type = Column(String(50), nullable=False)  # 'manual', 'scheduled', 'triggered'
    experiment_name = Column(String(100), nullable=False, index=True)
    run_id = Column(String(100))
    status = Column(String(50), nullable=False, index=True)  # 'running', 'completed', 'failed'
    
    # Configuration
    config = Column(JSONB)
    
    # Dataset info
    dataset_version = Column(String(50))
    dataset_size = Column(Integer)
    
    # Results
    best_model_type = Column(String(50))
    best_r2_score = Column(Float)
    training_duration_seconds = Column(Integer)
    
    # Error handling
    error_message = Column(Text)
    
    # Metadata
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    created_by = Column(String(100))
    
    __table_args__ = (
        Index('idx_jobs_status', 'status', 'started_at'),
        Index('idx_jobs_experiment', 'experiment_name', 'started_at'),
    )
    
    def __repr__(self):
        return f"<MLTrainingJob(id={self.job_id}, status={self.status}, model={self.best_model_type})>"
    
    def to_dict(self):
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'job_id': self.job_id,
            'job_type': self.job_type,
            'experiment_name': self.experiment_name,
            'run_id': self.run_id,
            'status': self.status,
            'config': self.config,
            'dataset_version': self.dataset_version,
            'dataset_size': self.dataset_size,
            'best_model_type': self.best_model_type,
            'best_r2_score': self.best_r2_score,
            'training_duration_seconds': self.training_duration_seconds,
            'error_message': self.error_message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_by': self.created_by,
        }


# Export all models
__all__ = [
    'MLPrediction',
    'MLPerformanceMetric',
    'MLFeatureDrift',
    'MLTrainingJob',
]
