"""Consolidated Backend Configuration Management.

This is the single source of truth for all configuration.
Uses Pydantic BaseSettings for validation and type safety.
"""
import os
from typing import List
from pathlib import Path
from pydantic import validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

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
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # API Settings
    APP_NAME: str = "Dark Store Intelligence API"
    VERSION: str = "2.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://neondb_owner:npg_roH2CA1qBcIU@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
    )
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "darkstore-secret-key-change-in-production-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    JWT_EXPIRATION_HOURS: int = 24
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "darkstore-encryption-key-2026")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8501",
        "http://localhost:5173",
        "https://darkstore-intelligence.vercel.app"
    ]
    
    # External APIs
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    GOOGLE_API_DAILY_LIMIT: int = int(os.getenv("GOOGLE_API_DAILY_LIMIT", "40000"))
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    # Cache
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Monitoring
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "True").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ALERT_EMAIL: str = os.getenv("ALERT_EMAIL", "")
    
    # Scraping Configuration
    SCRAPE_DELAY_SECONDS: int = int(os.getenv("SCRAPE_DELAY_SECONDS", "2"))
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    
    # MLflow Configuration
    MLFLOW_TRACKING_URI: str = os.getenv(
        "MLFLOW_TRACKING_URI",
        "postgresql+psycopg2://neondb_owner:npg_roH2CA1qBcIU@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
    )
    MLFLOW_ARTIFACT_LOCATION: str = os.getenv("MLFLOW_ARTIFACT_LOCATION", "./mlruns")
    MLFLOW_SERVER_HOST: str = os.getenv("MLFLOW_SERVER_HOST", "0.0.0.0")
    MLFLOW_SERVER_PORT: int = int(os.getenv("MLFLOW_SERVER_PORT", "5000"))
    MLFLOW_SERVER_WORKERS: int = int(os.getenv("MLFLOW_SERVER_WORKERS", "1"))
    MLFLOW_ENABLE_TRACKING: bool = os.getenv("MLFLOW_ENABLE_TRACKING", "True").lower() == "true"
    
    # Model Serving Configuration
    MODEL_CACHE_TTL_SECONDS: int = int(os.getenv("MODEL_CACHE_TTL_SECONDS", "3600"))
    MODEL_RELOAD_CHECK_INTERVAL: int = int(os.getenv("MODEL_RELOAD_CHECK_INTERVAL", "60"))
    DEFAULT_MODEL_NAME: str = os.getenv("DEFAULT_MODEL_NAME", "demand_forecasting_model")
    
    # ML Monitoring Configuration
    ENABLE_PERFORMANCE_MONITORING: bool = os.getenv("ENABLE_PERFORMANCE_MONITORING", "True").lower() == "true"
    ENABLE_DRIFT_DETECTION: bool = os.getenv("ENABLE_DRIFT_DETECTION", "True").lower() == "true"
    DRIFT_CHECK_FREQUENCY_DAYS: int = int(os.getenv("DRIFT_CHECK_FREQUENCY_DAYS", "7"))
    PERFORMANCE_ROLLING_WINDOWS: List[int] = [7, 30, 90]  # Days for rolling metrics
    
    @validator('SECRET_KEY')
    def validate_secret_key(cls, v, values):
        """Validate JWT secret key meets minimum security requirements."""
        if len(v) < 32:
            raise ValueError('SECRET_KEY must be at least 32 characters')
        if values.get('ENVIRONMENT') == 'production' and 'change-in-production' in v.lower():
            raise ValueError('SECRET_KEY must be changed in production')
        return v
    
    @validator('ALLOWED_ORIGINS')
    def validate_origins(cls, v, values):
        """Validate CORS origins for production."""
        if values.get('ENVIRONMENT') == 'production':
            for origin in v:
                if 'localhost' in origin:
                    raise ValueError('localhost not allowed in production CORS origins')
        return v
    
    @validator('DEBUG')
    def validate_debug(cls, v, values):
        """Ensure DEBUG is False in production."""
        if values.get('ENVIRONMENT') == 'production' and v:
            raise ValueError('DEBUG must be False in production')
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


settings = Settings()


# Platform Configuration
PLATFORMS = {
    "blinkit": {
        "name": "Blinkit",
        "url": "https://blinkit.com",
        "app_id": "com.grofers.customerapp",
        "color": "red"
    },
    "zepto": {
        "name": "Zepto",
        "url": "https://www.zeptonow.com",
        "app_id": "com.zepto.app",
        "color": "blue"
    },
    "instamart": {
        "name": "Instamart",
        "url": "https://www.swiggy.com/instamart",
        "app_id": "in.swiggy.android",
        "color": "orange"
    },
    "flipkart_minutes": {
        "name": "Flipkart Minutes",
        "url": "https://www.flipkart.com",
        "app_id": "com.flipkart.android",
        "color": "yellow"
    }
}

# City Tier Classification
METRO_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad"]
TIER1_CITIES = ["Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara"]
TIER2_CITIES = ["Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar", "Amritsar", "Allahabad", "Ranchi"]


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
