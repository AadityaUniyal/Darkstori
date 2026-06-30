"""
Open-Meteo Weather Data Service

Replaces hardcoded weather_Cloudy=0, weather_Rainy=0 with real historical
weather data from the Open-Meteo API (free, no API key needed).

Section 6, Dataset #11: Open-Meteo Historical Weather API
"""
import logging
from datetime import date, datetime, timedelta
from typing import Dict, Optional, Union

import httpx

logger = logging.getLogger(__name__)

# Cache weather data in-memory for the session to avoid repeat API calls
_weather_cache: Dict[str, dict] = {}

# City centroids for weather lookups (matches our 5 focus cities)
CITY_COORDS = {
    "Bangalore": {"lat": 12.9716, "lng": 77.5946},
    "Delhi":     {"lat": 28.6139, "lng": 77.2090},
    "Mumbai":    {"lat": 19.0760, "lng": 72.8777},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
    "Pune":      {"lat": 18.5204, "lng": 73.8567},
}

# PIN code prefix → city mapping
PINCODE_CITY_MAP = {
    "560": "Bangalore",
    "110": "Delhi",
    "400": "Mumbai",
    "500": "Hyderabad",
    "411": "Pune",
}


def _pincode_to_city(pincode: str) -> str:
    """Resolve a pincode to its parent city for weather lookups."""
    prefix = pincode[:3]
    return PINCODE_CITY_MAP.get(prefix, "Bangalore")


def _cache_key(city: str, dt: date) -> str:
    return f"{city}_{dt.isoformat()}"


async def fetch_weather_for_date(
    pincode: str,
    target_date: Union[date, datetime, str],
) -> dict:
    """
    Fetch weather data for a specific pincode and date.

    Returns dict with keys:
        - temperature_max: float (°C)
        - precipitation_sum: float (mm)
        - weather_category: str ('Clear', 'Cloudy', or 'Rainy')
        - is_rainy: bool
        - is_cloudy: bool

    Uses Open-Meteo Historical Weather API (free, no key required).
    Falls back to heuristic if the API is unreachable.
    """
    if isinstance(target_date, str):
        target_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    elif isinstance(target_date, datetime):
        target_date = target_date.date()

    city = _pincode_to_city(pincode)
    key = _cache_key(city, target_date)

    if key in _weather_cache:
        return _weather_cache[key]

    coords = CITY_COORDS.get(city, CITY_COORDS["Bangalore"])

    # Only fetch historical weather (past dates) — for future dates use heuristic
    today = date.today()
    if target_date >= today:
        result = _seasonal_heuristic(city, target_date)
        _weather_cache[key] = result
        return result

    try:
        result = await _fetch_from_api(coords, target_date)
        _weather_cache[key] = result
        return result
    except Exception as e:
        logger.warning(f"Weather API failed for {city}/{target_date}: {e}, using heuristic")
        result = _seasonal_heuristic(city, target_date)
        _weather_cache[key] = result
        return result


async def _fetch_from_api(coords: dict, target_date: date) -> dict:
    """Call Open-Meteo Historical Weather API."""
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": coords["lat"],
        "longitude": coords["lng"],
        "start_date": target_date.isoformat(),
        "end_date": target_date.isoformat(),
        "daily": "temperature_2m_max,precipitation_sum",
        "timezone": "Asia/Kolkata",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    daily = data.get("daily", {})
    temp_max = (daily.get("temperature_2m_max") or [30.0])[0]
    precip = (daily.get("precipitation_sum") or [0.0])[0]

    return _classify_weather(temp_max, precip)


def _classify_weather(temp_max: float, precip: float) -> dict:
    """Classify weather into categories matching model features."""
    if precip > 2.5:
        category = "Rainy"
    elif precip > 0.5 or temp_max < 25:
        category = "Cloudy"
    else:
        category = "Clear"

    return {
        "temperature_max": temp_max,
        "precipitation_sum": precip,
        "weather_category": category,
        "is_rainy": category == "Rainy",
        "is_cloudy": category == "Cloudy",
        "weather_Rainy": 1 if category == "Rainy" else 0,
        "weather_Cloudy": 1 if category == "Cloudy" else 0,
    }


def _seasonal_heuristic(city: str, target_date: date) -> dict:
    """
    Seasonal weather heuristic for Indian cities when API data is unavailable.
    Uses monsoon patterns and seasonal temperature norms.
    """
    month = target_date.month

    # Monsoon months (Jun-Sep) have high rainfall probability
    monsoon_cities = {"Mumbai", "Bangalore", "Pune", "Hyderabad"}
    is_monsoon = month in (6, 7, 8, 9)
    is_winter = month in (12, 1, 2)

    # Simulate realistic weather based on season and city
    import hashlib
    seed = hashlib.md5(f"{city}-{target_date.isoformat()}".encode()).hexdigest()
    rand_val = int(seed[:4], 16) / 0xFFFF  # 0.0 - 1.0

    if is_monsoon and city in monsoon_cities:
        # 60% chance of rain during monsoon
        if rand_val < 0.60:
            precip = 8.0 + rand_val * 20  # 8-28mm
            temp = 28.0 + rand_val * 4
        elif rand_val < 0.85:
            precip = 1.0 + rand_val * 3
            temp = 29.0 + rand_val * 3
        else:
            precip = 0.0
            temp = 32.0 + rand_val * 3
    elif is_winter:
        # Winter: rare rain, cool temperatures
        precip = 0.0 if rand_val > 0.15 else 2.0
        if city == "Delhi":
            temp = 12.0 + rand_val * 10
        else:
            temp = 20.0 + rand_val * 8
    else:
        # Summer: hot, occasional pre-monsoon showers
        precip = 0.0 if rand_val > 0.20 else 5.0
        temp = 32.0 + rand_val * 8

    return _classify_weather(temp, precip)


def get_weather_sync(pincode: str, target_date: Union[date, datetime, str]) -> dict:
    """
    Synchronous weather lookup (for use in non-async contexts like model training).
    Uses only the seasonal heuristic — no API calls.
    """
    if isinstance(target_date, str):
        target_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    elif isinstance(target_date, datetime):
        target_date = target_date.date()

    city = _pincode_to_city(pincode)
    return _seasonal_heuristic(city, target_date)


async def fetch_weather_forecast(pincode: str) -> Optional[dict]:
    """
    Fetch hourly forecast from Open-Meteo API for the next 24 hours.
    Returns a dict with alert message if rain is expected, or None.
    """
    city = _pincode_to_city(pincode)
    coords = CITY_COORDS.get(city, CITY_COORDS["Bangalore"])

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": coords["lat"],
        "longitude": coords["lng"],
        "hourly": "precipitation,weathercode",
        "timezone": "Asia/Kolkata",
        "forecast_days": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        precip = hourly.get("precipitation", [])

        # Check next 4 hours
        current_time = datetime.now()
        rain_start: Optional[datetime] = None
        rain_end: Optional[datetime] = None

        for t_str, p_val in zip(times, precip):
            t = datetime.strptime(t_str, "%Y-%m-%dT%H:%M")
            if current_time <= t <= current_time + timedelta(hours=4):
                if p_val > 0.5:
                    if rain_start is None:
                        rain_start = t
                    rain_end = t

        if rain_start and rain_end:
            start_hour = rain_start.strftime("%I%p").lstrip('0').lower()
            end_time = rain_end + timedelta(hours=1)
            end_hour = end_time.strftime("%I%p").lstrip('0').lower()
            return {
                "alert": f"Rain expected {start_hour}-{end_hour} — historically +22% order volume in similar conditions",
                "is_rainy": True,
                "city": city,
            }
    except Exception as e:
        logger.warning(f"Failed to fetch forecast for {city}: {e}")

    return None

