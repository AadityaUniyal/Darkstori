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
)
import asyncio
import sys
import socketio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent))

from backend.core.config import settings  # noqa: E402
from backend.core.logger import logger  # noqa: E402
from backend.core.metrics import get_metrics  # noqa: E402
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

from database.connection import close_db, init_db  # noqa: E402


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
    from database.connection import engine
    listener_task = None
    if engine.dialect.name == "postgresql":
        from database.realtime_listener import start_realtime_listener
        listener_task = asyncio.create_task(start_realtime_listener(sio))
        logger.info("[OK] Database listener background task spawned")

    # Initialize cache layer
    await redis_cache.init()
    logger.info("[OK] Cache layer ready")

    # Start MLflow server if enabled
    if mlflow_config.enable_tracking:
        try:
            mlflow_manager = get_server_manager()
            mlflow_manager.start_server()
            logger.info("[OK] MLflow server started")
        except Exception as e:
            logger.error(f"Failed to start MLflow server: {e}")
            logger.warning("Continuing without MLflow tracking")
    else:
        logger.info("MLflow tracking disabled")

    logger.info("[OK] Darkstori API ready — serving 5 focus cities")

    yield

    # Shutdown
    logger.info("Shutting down Darkstori API...")

    if listener_task:
        logger.info("Cancelling database listener task...")
        listener_task.cancel()
        try:
            await listener_task
        except asyncio.CancelledError:
            logger.info("Database listener task cancelled cleanly")

    # Stop MLflow server
    if mlflow_config.enable_tracking:
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

# Initialize Socket.io server
sio = socketio.AsyncServer(async_mode="asgi")
app.mount("/socket.io", socketio.ASGIApp(sio))

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

# Health check endpoint


@app.get("/health", tags=["System"])
async def health_check():
    """Enhanced health check endpoint with component status."""
    health_status = {
        "status": "healthy",
        "version": "3.0.0",
        "platform": "Darkstori — Hyperlocal Delivery Intelligence",
        "focus_cities": settings.FOCUS_CITIES,
        "components": {},
    }

    # Check database
    try:
        from database.connection import engine
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

    # Check model availability (only if MLflow is reachable)
    if mlflow_healthy:
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
        health_status["components"]["model"] = "unavailable: MLflow offline"

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
        "health": "/health",
    }


# ── Core Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(stores.router, prefix="/api/stores", tags=["Stores"])
app.include_router(resilience.router, prefix="/api/resilience", tags=["Zero-Waste Perishables"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["AI Demand Forecasting"])
app.include_router(ml_models.router, prefix="/api/v1/ml", tags=["Machine Learning"])

# ── Neighborhood Intelligence ──────────────────────────────────────────────────────
app.include_router(neighborhoods.router, prefix="/api/neighborhoods", tags=["Neighborhoods"])
app.include_router(simulator.router, prefix="/api/simulator", tags=["Store Simulator"])
app.include_router(placement.router, prefix="/api/placement", tags=["Placement Scoring"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])

# ── Analytics & Intelligence ───────────────────────────────────────────────────────
app.include_router(analytics_advanced.router, prefix="/api/analytics/advanced", tags=["Advanced Analytics"])
app.include_router(analytics_heatmap.router, prefix="/api/analytics", tags=["Heatmap Analytics"])
app.include_router(sla.router, prefix="/api/sla", tags=["Delivery SLA"])
app.include_router(cohorts.router, prefix="/api/cohorts", tags=["Customer Cohorts"])
app.include_router(economics.router, prefix="/api/economics", tags=["Unit Economics"])

# ── Seed Data ────────────────────────────────────────────────────────────────────
app.include_router(seed_data.router, prefix="/api", tags=["Seed Data"])


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
