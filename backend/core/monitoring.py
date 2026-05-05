"""Monitoring and metrics collection."""
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request, Response
from time import time
from typing import Callable

from backend.core.logger import logger

# Metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

active_requests = Gauge(
    'http_requests_active',
    'Number of active HTTP requests'
)

database_queries = Counter(
    'database_queries_total',
    'Total database queries',
    ['operation']
)

ml_predictions = Counter(
    'ml_predictions_total',
    'Total ML predictions made',
    ['model']
)


async def metrics_middleware(request: Request, call_next: Callable) -> Response:
    """Middleware to collect request metrics."""
    # Skip metrics endpoint itself
    if request.url.path == "/metrics":
        return await call_next(request)
    
    active_requests.inc()
    start_time = time()
    
    try:
        response = await call_next(request)
        
        # Record metrics
        duration = time() - start_time
        request_duration.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)
        
        request_count.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        # Add custom headers
        response.headers["X-Process-Time"] = str(duration)
        
        return response
        
    except Exception as e:
        logger.error(f"Request failed: {e}")
        raise
    finally:
        active_requests.dec()


def get_metrics() -> Response:
    """Get Prometheus metrics."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
