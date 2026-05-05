"""Input validation utilities."""
import re
from typing import Optional
from fastapi import HTTPException, status


def validate_pincode(pincode: str) -> bool:
    """
    Validate Indian PIN code format.
    
    Args:
        pincode: PIN code string
        
    Returns:
        True if valid
        
    Raises:
        HTTPException: If invalid
    """
    if not pincode or not isinstance(pincode, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN code is required"
        )
    
    # Remove spaces and check format
    pincode = pincode.strip().replace(" ", "")
    
    if not re.match(r'^\d{6}$', pincode):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN code must be 6 digits"
        )
    
    return True


def validate_coordinates(latitude: float, longitude: float) -> bool:
    """
    Validate geographic coordinates.
    
    Args:
        latitude: Latitude value
        longitude: Longitude value
        
    Returns:
        True if valid
        
    Raises:
        HTTPException: If invalid
    """
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coordinates must be numeric"
        )
    
    if not (-90 <= latitude <= 90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Latitude must be between -90 and 90"
        )
    
    if not (-180 <= longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Longitude must be between -180 and 180"
        )
    
    # Check if coordinates are in India (approximate bounds)
    if not (6 <= latitude <= 37 and 68 <= longitude <= 98):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coordinates must be within India"
        )
    
    return True


def validate_platform(platform: str) -> bool:
    """
    Validate platform name.
    
    Args:
        platform: Platform name
        
    Returns:
        True if valid
        
    Raises:
        HTTPException: If invalid
    """
    valid_platforms = ["Blinkit", "Zepto", "Instamart", "Flipkart Minutes"]
    
    if platform not in valid_platforms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Platform must be one of: {', '.join(valid_platforms)}"
        )
    
    return True


def validate_date_range(start_date: str, end_date: str) -> bool:
    """
    Validate date range.
    
    Args:
        start_date: Start date string (YYYY-MM-DD)
        end_date: End date string (YYYY-MM-DD)
        
    Returns:
        True if valid
        
    Raises:
        HTTPException: If invalid
    """
    from datetime import datetime
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dates must be in YYYY-MM-DD format"
        )
    
    if start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date must be before end date"
        )
    
    # Check if range is reasonable (not more than 1 year)
    if (end - start).days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date range cannot exceed 1 year"
        )
    
    return True


def sanitize_string(text: str, max_length: int = 200) -> str:
    """
    Sanitize user input string.
    
    Args:
        text: Input string
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not text:
        return ""
    
    # Remove potentially dangerous characters
    text = re.sub(r'[<>\"\'%;()&+]', '', text)
    
    # Trim to max length
    text = text[:max_length]
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text
