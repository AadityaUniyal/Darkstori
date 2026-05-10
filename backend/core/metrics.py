"""
Prometheus Metrics for ML System Observability

Provides metrics for monitoring predictions, training, and model performance.
"""

import logging
from typing import Optional
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response
import time

logger = logging.getLogger(__name__)


# Prediction Metrics
prediction_counter = Counter(
    'ml_predictions_total',
    'Total number of predictions made',
    ['model_name', 'model_version', 'status']
)

prediction_latency = Histogram(
    'ml_prediction_latency_seconds',
    'Prediction latency in seconds',
    ['model_name', 'model_version'],
    buckets=[0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0]
)

batch_prediction_size = Histogram(
    'ml_batch_prediction_size',
    'Number of predictions in batch requests',
    buckets=[1, 10, 50, 100, 500, 1000, 5000, 10000]
)

# Model Performance Metrics
model_accuracy = Gauge(
    'ml_model_accuracy',
    'Current model accuracy (R² score)',
    ['model_name', 'model_version']
)

model_mae = Gauge(
    'ml_model_mae',
    'Current model MAE',
    ['model_name', 'model_version']
)

model_rmse = Gauge(
    'ml_model_rmse',
    'Current model RMSE',
    ['model_name', 'model_version']
)

# Training Metrics
training_duration = Histogram(
    'ml_training_duration_seconds',
    'Model training duration in seconds',
    ['model_type', 'status'],
    buckets=[10, 30, 60, 120, 300, 600, 1800, 3600]
)

training_counter = Counter(
    'ml_training_jobs_total',
    'Total number of training jobs',
    ['model_type', 'status', 'trigger']
)

# Model Registry Metrics
model_transitions = Counter(
    'ml_model_transitions_total',
    'Total number of model stage transitions',
    ['model_name', 'from_stage', 'to_stage']
)

active_models = Gauge(
    'ml_active_models',
    'Number of active models by stage',
    ['stage']
)

# Monitoring Metrics
drift_detected = Counter(
    'ml_drift_detected_total',
    'Total number of drift detections',
    ['model_name', 'feature_name', 'severity']
)

performance_degradation = Counter(
    'ml_performance_degradation_total',
    'Total number of performance degradation alerts',
    ['model_name', 'severity']
)

# System Metrics
model_cache_hits = Counter(
    'ml_model_cache_hits_total',
    'Total number of model cache hits',
    ['model_name']
)

model_cache_misses = Counter(
    'ml_model_cache_misses_total',
    'Total number of model cache misses',
    ['model_name']
)

model_load_time = Histogram(
    'ml_model_load_time_seconds',
    'Time to load model from registry',
    ['model_name'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)


class MetricsCollector:
    """Helper class for collecting and recording metrics."""
    
    @staticmethod
    def record_prediction(
        model_name: str,
        model_version: str,
        latency_seconds: float,
        status: str = 'success'
    ):
        """Record a prediction event."""
        try:
            prediction_counter.labels(
                model_name=model_name,
                model_version=model_version,
                status=status
            ).inc()
            
            prediction_latency.labels(
                model_name=model_name,
                model_version=model_version
            ).observe(latency_seconds)
            
        except Exception as e:
            logger.error(f"Failed to record prediction metrics: {e}")
    
    @staticmethod
    def record_batch_prediction(
        model_name: str,
        model_version: str,
        batch_size: int,
        latency_seconds: float,
        status: str = 'success'
    ):
        """Record a batch prediction event."""
        try:
            prediction_counter.labels(
                model_name=model_name,
                model_version=model_version,
                status=status
            ).inc(batch_size)
            
            batch_prediction_size.observe(batch_size)
            
            prediction_latency.labels(
                model_name=model_name,
                model_version=model_version
            ).observe(latency_seconds)
            
        except Exception as e:
            logger.error(f"Failed to record batch prediction metrics: {e}")
    
    @staticmethod
    def update_model_performance(
        model_name: str,
        model_version: str,
        r2_score: float,
        mae: float,
        rmse: float
    ):
        """Update model performance metrics."""
        try:
            model_accuracy.labels(
                model_name=model_name,
                model_version=model_version
            ).set(r2_score)
            
            model_mae.labels(
                model_name=model_name,
                model_version=model_version
            ).set(mae)
            
            model_rmse.labels(
                model_name=model_name,
                model_version=model_version
            ).set(rmse)
            
        except Exception as e:
            logger.error(f"Failed to update model performance metrics: {e}")
    
    @staticmethod
    def record_training(
        model_type: str,
        duration_seconds: float,
        status: str = 'success',
        trigger: str = 'manual'
    ):
        """Record a training event."""
        try:
            training_duration.labels(
                model_type=model_type,
                status=status
            ).observe(duration_seconds)
            
            training_counter.labels(
                model_type=model_type,
                status=status,
                trigger=trigger
            ).inc()
            
        except Exception as e:
            logger.error(f"Failed to record training metrics: {e}")
    
    @staticmethod
    def record_model_transition(
        model_name: str,
        from_stage: str,
        to_stage: str
    ):
        """Record a model stage transition."""
        try:
            model_transitions.labels(
                model_name=model_name,
                from_stage=from_stage,
                to_stage=to_stage
            ).inc()
            
        except Exception as e:
            logger.error(f"Failed to record model transition metrics: {e}")
    
    @staticmethod
    def update_active_models(stage: str, count: int):
        """Update active models count."""
        try:
            active_models.labels(stage=stage).set(count)
        except Exception as e:
            logger.error(f"Failed to update active models metrics: {e}")
    
    @staticmethod
    def record_drift(
        model_name: str,
        feature_name: str,
        severity: str = 'warning'
    ):
        """Record a drift detection event."""
        try:
            drift_detected.labels(
                model_name=model_name,
                feature_name=feature_name,
                severity=severity
            ).inc()
            
        except Exception as e:
            logger.error(f"Failed to record drift metrics: {e}")
    
    @staticmethod
    def record_performance_degradation(
        model_name: str,
        severity: str = 'warning'
    ):
        """Record a performance degradation event."""
        try:
            performance_degradation.labels(
                model_name=model_name,
                severity=severity
            ).inc()
            
        except Exception as e:
            logger.error(f"Failed to record performance degradation metrics: {e}")
    
    @staticmethod
    def record_cache_hit(model_name: str):
        """Record a model cache hit."""
        try:
            model_cache_hits.labels(model_name=model_name).inc()
        except Exception as e:
            logger.error(f"Failed to record cache hit metrics: {e}")
    
    @staticmethod
    def record_cache_miss(model_name: str):
        """Record a model cache miss."""
        try:
            model_cache_misses.labels(model_name=model_name).inc()
        except Exception as e:
            logger.error(f"Failed to record cache miss metrics: {e}")
    
    @staticmethod
    def record_model_load(model_name: str, load_time_seconds: float):
        """Record model load time."""
        try:
            model_load_time.labels(model_name=model_name).observe(load_time_seconds)
        except Exception as e:
            logger.error(f"Failed to record model load metrics: {e}")


def get_metrics() -> Response:
    """
    Get Prometheus metrics in text format.
    
    Returns:
        Response with metrics in Prometheus format
    """
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


class MetricsMiddleware:
    """Middleware for automatic metrics collection."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Record request metrics here if needed
                pass
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
        
        # Record latency
        latency = time.time() - start_time
        # Additional metrics can be recorded here


# Initialize metrics collector
metrics_collector = MetricsCollector()
