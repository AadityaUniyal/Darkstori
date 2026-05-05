"""Configuration management for the project."""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
EXTERNAL_DATA_DIR = DATA_DIR / "external"

# Create directories if they don't exist
for directory in [RAW_DATA_DIR, PROCESSED_DATA_DIR, EXTERNAL_DATA_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# API Configuration
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_roH2CA1qBcIU@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require")

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "darkstore-secret-key-change-in-production-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "darkstore-encryption-key-2026")

# Scraping Configuration
SCRAPE_DELAY_SECONDS = int(os.getenv("SCRAPE_DELAY_SECONDS", "2"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))

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

# Validation
if not GOOGLE_MAPS_API_KEY:
    print("WARNING: GOOGLE_MAPS_API_KEY not set in .env file")
