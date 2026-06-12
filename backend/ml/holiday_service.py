"""
India Holiday Calendar Service

Replaces hardcoded is_holiday=0 with real Indian public holiday detection
using the `holidays` Python library.

Section 6, Dataset #10: India public holidays calendar
"""
import logging
from datetime import date, datetime
from typing import Union

logger = logging.getLogger(__name__)

# Pre-generate India holiday sets for fast O(1) lookups
_india_holidays = {}

def _get_holiday_set(year: int):
    """Lazy-load and cache holiday sets per year."""
    if year not in _india_holidays:
        try:
            import holidays
            _india_holidays[year] = holidays.India(years=year)
            logger.info(f"Loaded {len(_india_holidays[year])} Indian holidays for {year}")
        except ImportError:
            logger.warning("holidays library not installed; falling back to manual list")
            _india_holidays[year] = _manual_holidays(year)
    return _india_holidays[year]


def _manual_holidays(year: int) -> dict:
    """
    Fallback: manually defined major Indian retail holidays when the
    `holidays` library isn't installed.
    """
    return {
        date(year, 1, 1): "New Year's Day",
        date(year, 1, 26): "Republic Day",
        date(year, 3, 14): "Holi",
        date(year, 4, 14): "Ambedkar Jayanti",
        date(year, 5, 1): "May Day",
        date(year, 8, 15): "Independence Day",
        date(year, 10, 2): "Gandhi Jayanti",
        date(year, 10, 24): "Dussehra (approx)",
        date(year, 11, 12): "Diwali (approx)",
        date(year, 12, 25): "Christmas",
    }


def is_india_holiday(dt: Union[date, datetime, str]) -> bool:
    """
    Check whether a date falls on an Indian public holiday.

    Args:
        dt: A date/datetime object or ISO string (YYYY-MM-DD)

    Returns:
        True if the date is an Indian public holiday
    """
    if isinstance(dt, str):
        dt = datetime.strptime(dt, "%Y-%m-%d").date()
    elif isinstance(dt, datetime):
        dt = dt.date()

    holiday_set = _get_holiday_set(dt.year)
    return dt in holiday_set


def get_holiday_name(dt: Union[date, datetime, str]) -> str:
    """Return the holiday name if the date is a holiday, else empty string."""
    if isinstance(dt, str):
        dt = datetime.strptime(dt, "%Y-%m-%d").date()
    elif isinstance(dt, datetime):
        dt = dt.date()

    holiday_set = _get_holiday_set(dt.year)
    return holiday_set.get(dt, "")


def get_holidays_for_year(year: int) -> dict:
    """Return all Indian holidays for a given year as {date: name}."""
    return dict(_get_holiday_set(year))
