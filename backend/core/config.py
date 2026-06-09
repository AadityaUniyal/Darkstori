"""Consolidated Backend Configuration Management.

This is the single source of truth for all configuration.
Uses Pydantic BaseSettings for validation and type safety.
"""

from pathlib import Path
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
EXTERNAL_DATA_DIR = DATA_DIR / "external"
MODELS_DIR = PROJECT_ROOT / "models"

# Create directories if they don't exist
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, EXTERNAL_DATA_DIR, MODELS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    """Application settings with validation."""

    # Environment
    ENVIRONMENT: str = "development"

    # API Settings
    APP_NAME: str = "Darkstori — Hyperlocal Delivery Intelligence"
    VERSION: str = "3.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Focus Cities (hardcoded — do not override via env)
    FOCUS_CITIES: List[str] = ["Bangalore", "Delhi", "Mumbai", "Hyderabad", "Pune"]

    # Database — must be set via environment variable
    DATABASE_URL: str = ""

    # JWT Security
    JWT_SECRET_KEY: str = "change-me-in-production-min-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ENCRYPTION_KEY: str = ""

    # CORS (override via env var as JSON array or comma-separated)
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8501",
        "http://localhost:5173",
        "https://darkstore-intelligence.vercel.app",
    ]

    # External APIs
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_PLACES_API_KEY: str = ""
    GOOGLE_GEOCODING_API_KEY: str = ""
    GOOGLE_DISTANCE_MATRIX_API_KEY: str = ""
    GOOGLE_API_DAILY_LIMIT: int = 40000

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Cache
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery Configuration
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Monitoring
    ENABLE_METRICS: bool = True
    LOG_LEVEL: str = "INFO"

    # Email Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    ALERT_EMAIL: str = ""

    # Scraping Configuration
    SCRAPE_DELAY_SECONDS: int = 2
    MAX_RETRIES: int = 3

    # MLflow Configuration
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_ARTIFACT_LOCATION: str = "./mlruns"
    MLFLOW_SERVER_HOST: str = "0.0.0.0"
    MLFLOW_SERVER_PORT: int = 5000
    MLFLOW_SERVER_WORKERS: int = 1
    MLFLOW_ENABLE_TRACKING: bool = True

    # Model Serving Configuration
    MODEL_CACHE_TTL_SECONDS: int = 3600
    MODEL_RELOAD_CHECK_INTERVAL: int = 60
    DEFAULT_MODEL_NAME: str = "demand_forecasting_model"

    # ML Monitoring Configuration
    ENABLE_PERFORMANCE_MONITORING: bool = True
    ENABLE_DRIFT_DETECTION: bool = True
    DRIFT_CHECK_FREQUENCY_DAYS: int = 7
    PERFORMANCE_ROLLING_WINDOWS: List[int] = [7, 30, 90]

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v, info):
        """Validate JWT secret key meets minimum security requirements."""
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production" and "change" in v.lower() and "production" in v.lower():
            raise ValueError("JWT_SECRET_KEY must be changed in production")
        return v

    @field_validator("DEBUG")
    @classmethod
    def validate_debug(cls, v, info):
        """Ensure DEBUG is False in production."""
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production" and v:
            raise ValueError("DEBUG must be False in production")
        return v

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore",
        "populate_by_name": True,
    }


settings = Settings()


# Platform Configuration
PLATFORMS = {
    "blinkit": {
        "name": "Blinkit",
        "url": "https://blinkit.com",
        "app_id": "com.grofers.customerapp",
        "color": "red",
    },
    "zepto": {
        "name": "Zepto",
        "url": "https://www.zeptonow.com",
        "app_id": "com.zepto.app",
        "color": "blue",
    },
    "instamart": {
        "name": "Instamart",
        "url": "https://www.swiggy.com/instamart",
        "app_id": "in.swiggy.android",
        "color": "orange",
    },
    "flipkart_minutes": {
        "name": "Flipkart Minutes",
        "url": "https://www.flipkart.com",
        "app_id": "com.flipkart.android",
        "color": "yellow",
    },
}

# City Tier Classification
METRO_CITIES = [
    "Mumbai",
    "Delhi",
    "Bangalore",
    "Hyderabad",
    "Chennai",
    "Kolkata",
    "Pune",
    "Ahmedabad",
]
TIER1_CITIES = [
    "Jaipur",
    "Lucknow",
    "Kanpur",
    "Nagpur",
    "Indore",
    "Thane",
    "Bhopal",
    "Visakhapatnam",
    "Patna",
    "Vadodara",
]
TIER2_CITIES = [
    "Agra",
    "Nashik",
    "Faridabad",
    "Meerut",
    "Rajkot",
    "Varanasi",
    "Srinagar",
    "Amritsar",
    "Allahabad",
    "Ranchi",
]


def get_city_tier(city: str) -> str:
    """Determine city tier based on city name."""
    if city in METRO_CITIES:
        return "Metro"
    elif city in TIER1_CITIES:
        return "Tier1"
    elif city in TIER2_CITIES:
        return "Tier2"
    else:
        return "Tier3"
