"""Helper utility functions."""
import time
import logging
from functools import wraps
from typing import Callable, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def retry_on_failure(max_retries: int = 3, delay: float = 2.0):
    """Decorator to retry a function on failure."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        logger.error(f"Failed after {max_retries} attempts: {e}")
                        raise
                    logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying...")
                    time.sleep(delay)
            return None
        return wrapper
    return decorator


def rate_limit(calls_per_second: float = 1.0):
    """Decorator to rate limit function calls."""
    min_interval = 1.0 / calls_per_second
    last_called = [0.0]
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            elapsed = time.time() - last_called[0]
            if elapsed < min_interval:
                time.sleep(min_interval - elapsed)
            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator


def validate_coordinates(lat: float, lng: float) -> bool:
    """Validate latitude and longitude coordinates."""
    return -90 <= lat <= 90 and -180 <= lng <= 180


def clean_platform_name(platform: str) -> str:
    """Standardize platform names."""
    platform_map = {
        "blinkit": "Blinkit",
        "grofers": "Blinkit",
        "swiggy instamart": "Instamart",
        "instamart": "Instamart",
        "zepto": "Zepto",
        "flipkart minutes": "Flipkart Minutes",
        "flipkart": "Flipkart Minutes"
    }
    return platform_map.get(platform.lower().strip(), platform)


def format_indian_number(num: int) -> str:
    """Format numbers in Indian numbering system (lakhs, crores)."""
    if num >= 10000000:  # 1 crore
        return f"{num/10000000:.2f} Cr"
    elif num >= 100000:  # 1 lakh
        return f"{num/100000:.2f} L"
    elif num >= 1000:  # 1 thousand
        return f"{num/1000:.2f} K"
    else:
        return str(num)


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in kilometers.
    """
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in kilometers
    
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c
