"""Input validation and sanitization to prevent injection attacks."""

import re
from typing import Any, List

from backend.core.logger import logger


class InputValidator:
    """Validate and sanitize user inputs."""

    # Regex patterns for validation
    PINCODE_PATTERN = re.compile(r"^\d{6}$")
    EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    PHONE_PATTERN = re.compile(r"^\+?91?[6-9]\d{9}$")
    ALPHANUMERIC_PATTERN = re.compile(r"^[a-zA-Z0-9\s\-_]+$")

    # SQL injection patterns to block
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b.*\bSELECT\b)",
        r"(\bDROP\b.*\bTABLE\b)",
        r"(\bINSERT\b.*\bINTO\b)",
        r"(\bDELETE\b.*\bFROM\b)",
        r"(\bUPDATE\b.*\bSET\b)",
        r"(--)",
        r"(;)",
        r"(\bOR\b.*=.*)",
        r"(\bAND\b.*=.*)",
        r"('.*OR.*'=')",
    ]

    # XSS patterns to block
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"onerror\s*=",
        r"onload\s*=",
        r"<iframe",
        r"<object",
        r"<embed",
    ]

    @staticmethod
    def validate_pincode(pincode: str) -> bool:
        """Validate Indian PIN code format."""
        if not pincode:
            return False
        return bool(InputValidator.PINCODE_PATTERN.match(str(pincode)))

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format."""
        if not email:
            return False
        return bool(InputValidator.EMAIL_PATTERN.match(email))

    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate Indian phone number."""
        if not phone:
            return False
        return bool(InputValidator.PHONE_PATTERN.match(phone))

    @staticmethod
    def sanitize_string(input_str: str, max_length: int = 255) -> str:
        """
        Sanitize string input to prevent injection attacks.

        Args:
            input_str: Input string to sanitize
            max_length: Maximum allowed length

        Returns:
            Sanitized string
        """
        if not input_str:
            return ""

        # Truncate to max length
        sanitized = str(input_str)[:max_length]

        # Remove null bytes
        sanitized = sanitized.replace("\x00", "")

        # Check for SQL injection patterns
        for pattern in InputValidator.SQL_INJECTION_PATTERNS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                logger.warning(f"SQL injection attempt detected: {sanitized}")
                raise ValueError("Invalid input: potential SQL injection detected")

        # Check for XSS patterns
        for pattern in InputValidator.XSS_PATTERNS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                logger.warning(f"XSS attempt detected: {sanitized}")
                raise ValueError("Invalid input: potential XSS attack detected")

        return sanitized

    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> bool:
        """Validate latitude and longitude."""
        try:
            lat = float(lat)
            lng = float(lng)
            return -90 <= lat <= 90 and -180 <= lng <= 180
        except (ValueError, TypeError):
            return False

    @staticmethod
    def validate_platform(platform: str) -> bool:
        """Validate platform name against whitelist."""
        valid_platforms = ["Blinkit", "Zepto", "Instamart", "Flipkart Minutes"]
        return platform in valid_platforms

    @staticmethod
    def validate_city_tier(tier: str) -> bool:
        """Validate city tier against whitelist."""
        valid_tiers = ["Metro", "Tier1", "Tier2", "Tier3"]
        return tier in valid_tiers

    @staticmethod
    def sanitize_sql_params(params: dict) -> dict:
        """Sanitize parameters for SQL queries."""
        sanitized = {}
        for key, value in params.items():
            if isinstance(value, str):
                sanitized[key] = InputValidator.sanitize_string(value)
            elif isinstance(value, (int, float, bool)):
                sanitized[key] = value
            elif value is None:
                sanitized[key] = None
            else:
                sanitized[key] = str(value)
        return sanitized


# Global validator instance
validator = InputValidator()
