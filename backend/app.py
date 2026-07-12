"""FastAPI Backend Application - Main Entry Point.

Darkstori — Hyperlocal Delivery Intelligence Platform
Focused on 5 key Indian cities: Bangalore, Delhi, Mumbai, Hyderabad, Pune
"""


from backend.api.routes import (
    auth,
    seed_data,
    stores,
    resilience,
    predictions,
    neighborhoods,
    simulator,
    placement,
    recommendations,
    analytics_advanced,
    sla,
    cohorts,
    economics,
    analytics_heatmap,
    ml_models,
    events,
)
import asyncio
import socketio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from backend.core.config import settings  # noqa: E402
from backend.core.logger import logger  # noqa: E402
from backend.core.metrics import get_metrics, MetricsMiddleware  # noqa: E402
from backend.core.cache import cache as redis_cache  # noqa: E402
from backend.core.rate_limiter import rate_limit_dependency  # noqa: E402

try:
    from backend.ml.mlflow_config import mlflow_config  # noqa: E402
    from backend.ml.mlflow_server import get_server_manager  # noqa: E402
    MLFLOW_AVAILABLE = True
except Exception:
    MLFLOW_AVAILABLE = False
    mlflow_config = type("MLflowConfig", (), {"enable_tracking": False})()
    get_server_manager = None

from backend.database.connection import close_db, init_db  # noqa: E402


# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting Darkstori — Hyperlocal Delivery Intelligence API...")

    # Validate production configuration
    if settings.ENVIRONMENT == "production":
        if settings.DEBUG:
            raise RuntimeError(
                "CRITICAL: DEBUG=True is not allowed in production! Set DEBUG=False in .env"
            )
        if "change-in-production" in settings.JWT_SECRET_KEY.lower():
            raise RuntimeError(
                "CRITICAL: JWT_SECRET_KEY must be changed in production!"
            )
        if not settings.ENCRYPTION_KEY:
            raise RuntimeError(
                "CRITICAL: ENCRYPTION_KEY must be set in production!"
            )
        for origin in settings.ALLOWED_ORIGINS:
            if "localhost" in origin:
                logger.warning(
                    f"ALLOWED_ORIGINS contains localhost origin '{origin}' — "
                    "remove it for production security"
                )
        logger.info("[OK] Production configuration validated")

    # Initialize database
    await init_db()
    logger.info("[OK] Database connected")

    # Start Real-time database listener if PostgreSQL
    from backend.database.connection import engine
    listener_task = None
    if engine.dialect.name == "postgresql":
        from backend.database.realtime_listener import start_realtime_listener
        listener_task = asyncio.create_task(start_realtime_listener(sio))
        logger.info("[OK] Database listener background task spawned")

    # Initialize cache layer
    await redis_cache.init()
    logger.info("[OK] Cache layer ready")

    # Start Background Scheduler
    from backend.utils.scheduler import global_scheduler
    scheduler_task = asyncio.create_task(global_scheduler.run())
    logger.info("[OK] Background scheduler task spawned")

    # Start MLflow server if enabled
    if mlflow_config.enable_tracking and get_server_manager is not None:
        if settings.MLFLOW_START_SERVER_SUBPROCESS:
            try:
                mlflow_manager = get_server_manager()
                mlflow_manager.start_server()
                logger.info("[OK] MLflow server started as subprocess")
            except Exception as e:
                logger.error(f"Failed to start MLflow server: {e}")
                logger.warning("Continuing without MLflow tracking")
        else:
            logger.info("Decoupled MLflow mode: Skipping server subprocess startup")
            # Verify connectivity to decoupled MLflow tracking server
            try:
                import httpx
                with httpx.Client(timeout=2.0) as client:
                    # Simple GET request to verify server is reachable
                    response = client.get(f"{settings.MLFLOW_TRACKING_URI}/health")
                    if response.status_code == 200:
                        logger.info(f"[OK] Successfully verified connection to decoupled MLflow server at {settings.MLFLOW_TRACKING_URI}")
                    else:
                        logger.warning(f"Decoupled MLflow server at {settings.MLFLOW_TRACKING_URI} returned status {response.status_code}")
            except Exception as conn_err:
                logger.warning(f"Could not connect to decoupled MLflow server at {settings.MLFLOW_TRACKING_URI}: {conn_err}. Fallbacks will be used.")
    else:
        logger.info("MLflow tracking disabled")

    logger.info("[OK] Darkstori API ready — serving 5 focus cities")

    yield

    # Shutdown
    logger.info("Shutting down Darkstori API...")

    if scheduler_task:
        logger.info("Cancelling scheduler task...")
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            logger.info("Scheduler task cancelled cleanly")

    if listener_task:
        logger.info("Cancelling database listener task...")
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            logger.info("Database listener task cancelled cleanly")

    # Stop MLflow server if started as subprocess
    if mlflow_config.enable_tracking and settings.MLFLOW_START_SERVER_SUBPROCESS and get_server_manager is not None:
        try:
            mlflow_manager = get_server_manager()
            mlflow_manager.stop_server()
            logger.info("[OK] MLflow server stopped")
        except Exception as e:
            logger.error(f"Error stopping MLflow server: {e}")

    await redis_cache.close()
    logger.info("[OK] Cache layer closed")

    await close_db()
    logger.info("[OK] Database disconnected")


# Initialize FastAPI app
app = FastAPI(
    title="Darkstori — Hyperlocal Delivery Intelligence",
    description=(
        "Prescriptive analytics for dark store operators. "
        "Deep neighborhood intelligence for 5 key Indian cities: "
        "Bangalore, Delhi, Mumbai, Hyderabad, Pune."
    ),
    version="3.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Metrics middleware (add early to time the whole request)
app.add_middleware(MetricsMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Initialize Socket.io server (configured with CORS allowed origins and mounted after middleware)
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=settings.ALLOWED_ORIGINS)
app.mount("/socket.io", socketio.ASGIApp(sio))

# Health check endpoint


@app.get("/health/live", tags=["System"])
async def liveness_check():
    """Kubernetes-style liveness check."""
    return {"status": "alive"}

@app.get("/health/ready", tags=["System"])
async def readiness_check():
    """Enhanced readiness check endpoint with component status."""
    health_status = {
        "status": "ready",
        "version": "3.0.0",
        "platform": "Darkstori — Hyperlocal Delivery Intelligence",
        "focus_cities": settings.FOCUS_CITIES,
        "components": {},
    }

    # Check database
    try:
        from backend.database.connection import engine
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health_status["components"]["database"] = "healthy"
    except Exception as e:
        health_status["components"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"

    # Check MLflow
    mlflow_healthy = False
    if MLFLOW_AVAILABLE and mlflow_config.enable_tracking:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=2) as hc:
                resp = await hc.get(f"{mlflow_config.tracking_uri}/health")
            mlflow_healthy = resp.status_code == 200
            health_status["components"]["mlflow"] = "healthy" if mlflow_healthy else "unhealthy"
        except Exception as e:
            health_status["components"]["mlflow"] = f"unhealthy: {str(e)}"
    else:
        health_status["components"]["mlflow"] = "disabled"
        mlflow_healthy = True # Assume healthy if disabled

    # Check model availability (only if MLflow is reachable and enabled)
    if mlflow_healthy and MLFLOW_AVAILABLE and mlflow_config.enable_tracking:
        try:
            from backend.ml.model_registry import ModelRegistry
            registry = ModelRegistry()
            model_version = await asyncio.wait_for(
                asyncio.to_thread(registry.get_latest_model, "demand_forecasting_model", stage="Production"),
                timeout=3
            )
            health_status["components"]["model"] = "healthy" if model_version else "no production model"
        except asyncio.TimeoutError:
            health_status["components"]["model"] = "unavailable: MLflow timeout"
        except Exception as e:
            health_status["components"]["model"] = f"unavailable: {str(e)}"
    else:
        health_status["components"]["model"] = "skipped"

    # Check Redis Cache
    try:
        # Simple ping check for redis
        redis_is_ready = getattr(redis_cache, "redis", None) is not None
        health_status["components"]["redis"] = "healthy" if redis_is_ready else "unhealthy"
        if not redis_is_ready:
            health_status["status"] = "degraded"
    except Exception:
        health_status["components"]["redis"] = "unhealthy: connection error"
        health_status["status"] = "degraded"

    return health_status


# Metrics endpoint
@app.get("/metrics", tags=["System"])
async def metrics():
    """Prometheus metrics endpoint."""
    return get_metrics()


# Root endpoint
@app.get("/", tags=["System"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Darkstori — Hyperlocal Delivery Intelligence API",
        "version": "3.0.0",
        "focus_cities": settings.FOCUS_CITIES,
        "docs": "/api/docs",
        "health_live": "/health/live",
        "health_ready": "/health/ready",
    }


# ── Core Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(stores.router, prefix="/api/v1/stores", tags=["Stores"])
app.include_router(resilience.router, prefix="/api/v1/resilience", tags=["Zero-Waste Perishables"])
app.include_router(predictions.router, prefix="/api/v1/predictions", tags=["AI Demand Forecasting"])
app.include_router(ml_models.router, prefix="/api/v1/ml", tags=["Machine Learning"])

# ── Neighborhood Intelligence ──────────────────────────────────────────────────────
app.include_router(neighborhoods.router, prefix="/api/v1/neighborhoods", tags=["Neighborhoods"])
app.include_router(simulator.router, prefix="/api/v1/simulator", tags=["Store Simulator"])
app.include_router(placement.router, prefix="/api/v1/placement", tags=["Placement Scoring"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["Recommendations"])

# ── Analytics & Intelligence ───────────────────────────────────────────────────────
app.include_router(analytics_advanced.router, prefix="/api/v1/analytics/advanced", tags=["Advanced Analytics"])
app.include_router(analytics_heatmap.router, prefix="/api/v1/analytics", tags=["Heatmap Analytics"])
app.include_router(sla.router, prefix="/api/v1/sla", tags=["Delivery SLA"])
app.include_router(cohorts.router, prefix="/api/v1/cohorts", tags=["Customer Cohorts"])
app.include_router(economics.router, prefix="/api/v1/economics", tags=["Unit Economics"])
app.include_router(events.router, prefix="/api/v1/events", tags=["Local Events"])

# ── Seed Data ────────────────────────────────────────────────────────────────────
app.include_router(seed_data.router, prefix="/api/v1", tags=["Seed Data"])


# Rate limiting middleware — applies to all /api routes
@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    if request.url.path.startswith("/api/"):
        try:
            await rate_limit_dependency(request)
        except HTTPException:
            raise
    return await call_next(request)


# Latency tracking middleware
@app.middleware("http")
async def latency_middleware(request, call_next):
    import time
    start = time.time()
    response = await call_next(request)
    elapsed = (time.time() - start) * 1000
    if elapsed > 1000:
        logger.warning(f"Slow request: {request.method} {request.url.path} took {elapsed:.0f}ms")
    response.headers["X-Response-Time-Ms"] = f"{elapsed:.0f}"
    return response


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "status_code": 500},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
