"""FastAPI Backend Application - Main Entry Point."""
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from backend.api.routes import stores, analytics, predictions, auth, live_data, ml_predictions, ml_models, ml_monitoring, ml_training, live_feed
from backend.core.config import settings
from backend.core.security import verify_token
from backend.database.connection import init_db, close_db
from backend.core.logger import logger
from backend.ml.mlflow_server import get_server_manager
from backend.ml.mlflow_config import mlflow_config
from backend.core.metrics import get_metrics

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting Dark Store Intelligence API...")
    
    # Initialize database
    await init_db()
    logger.info("✓ Database connected")
    
    # Start MLflow server if enabled
    if mlflow_config.MLFLOW_ENABLE_TRACKING:
        try:
            mlflow_manager = get_server_manager()
            mlflow_manager.start_server()
            logger.info("✓ MLflow server started")
        except Exception as e:
            logger.error(f"Failed to start MLflow server: {e}")
            logger.warning("Continuing without MLflow tracking")
    else:
        logger.info("MLflow tracking disabled")
    
    yield
    
    # Shutdown
    logger.info("Shutting down API...")
    
    # Stop MLflow server
    if mlflow_config.MLFLOW_ENABLE_TRACKING:
        try:
            mlflow_manager = get_server_manager()
            mlflow_manager.stop_server()
            logger.info("✓ MLflow server stopped")
        except Exception as e:
            logger.error(f"Error stopping MLflow server: {e}")
    
    await close_db()
    logger.info("✓ Database disconnected")

# Initialize FastAPI app
app = FastAPI(
    title="Dark Store Intelligence API",
    description="Enterprise-grade API for quick commerce analytics",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """Enhanced health check endpoint with component status."""
    health_status = {
        "status": "healthy",
        "version": "2.0.0",
        "components": {}
    }
    
    # Check database
    try:
        from backend.database.connection import engine
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        health_status["components"]["database"] = "healthy"
    except Exception as e:
        health_status["components"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check MLflow
    if mlflow_config.MLFLOW_ENABLE_TRACKING:
        try:
            import requests
            response = requests.get(f"{mlflow_config.MLFLOW_TRACKING_URI}/health", timeout=2)
            if response.status_code == 200:
                health_status["components"]["mlflow"] = "healthy"
            else:
                health_status["components"]["mlflow"] = "unhealthy"
                health_status["status"] = "degraded"
        except Exception as e:
            health_status["components"]["mlflow"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
    else:
        health_status["components"]["mlflow"] = "disabled"
    
    # Check model availability
    try:
        from backend.ml.model_loader import ModelLoader
        from backend.ml.model_registry import ModelRegistry
        
        registry = ModelRegistry()
        loader = ModelLoader(registry=registry)
        
        model_info = loader.get_model_info("demand_forecasting_model")
        if model_info:
            health_status["components"]["model"] = "healthy"
        else:
            health_status["components"]["model"] = "no production model"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["components"]["model"] = f"unhealthy: {str(e)}"
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
        "message": "Dark Store Intelligence API",
        "version": "2.0.0",
        "docs": "/api/docs",
        "health": "/health"
    }

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(stores.router, prefix="/api/stores", tags=["Stores"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(live_data.router, prefix="/api/live", tags=["Live Data"])
app.include_router(live_feed.router, tags=["Live Feed"])  # New: Live delivery feed
app.include_router(ml_predictions.router, prefix="/api/v1/ml", tags=["ML Predictions"])
app.include_router(ml_models.router, prefix="/api/v1/ml", tags=["ML Models"])
app.include_router(ml_monitoring.router, prefix="/api/v1/ml", tags=["ML Monitoring"])
app.include_router(ml_training.router, prefix="/api/v1/ml", tags=["ML Training"])

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return {
        "error": "Internal server error",
        "status_code": 500
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
