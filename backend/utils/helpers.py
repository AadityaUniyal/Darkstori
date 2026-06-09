"""Helper utilities for data cleaning, sanitization, and verification."""

from typing import Any


def validate_coordinates(latitude: Any, longitude: Any) -> bool:
    """
    Validate that latitude and longitude coordinates fall within standard geographic bounds.
    """
    try:
        lat = float(latitude)
        lon = float(longitude)
        # Standard latitude bounds (-90 to 90) and longitude bounds (-180 to 180)
        # Also exclude 0,0 default resets
        if lat == 0.0 and lon == 0.0:
            return False
        return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0
    except (ValueError, TypeError):
        return False


def clean_platform_name(name: Any) -> str:
    """
    Standardize platform name variants into uniform category names.
    """
    if not isinstance(name, str):
        return "Unknown"

    n = name.strip().lower()
    if "zepto" in n:
        return "Zepto"
    elif "blinkit" in n or "grofers" in n:
        return "Blinkit"
    elif "dunzo" in n:
        return "Dunzo"
    elif "instamart" in n or "swiggy" in n:
        return "Instamart"
    elif "bigbasket" in n or "bb" in n:
        return "BigBasket"

    return name.strip()
