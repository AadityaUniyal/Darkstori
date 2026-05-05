"""Backend Configuration Management."""
import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings."""
    
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
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    
    # Cache
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


settings = Settings()
