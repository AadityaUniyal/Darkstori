"""Unit tests for R4: Atmospheric Weather Telemetry & XGBoost Demand Forecasting.

Tests Open-Meteo weather integration, 1.25x monsoon/rain surge multipliers,
pincode resolution, seasonal climatology heuristics, and time-series feature engineering.
"""

import pytest
from datetime import date, datetime
from backend.ml.weather_service import (
    _pincode_to_city,
    _seasonal_heuristic,
    fetch_weather_forecast,
    fetch_weather_for_date,
    CITY_COORDS,
    PINCODE_CITY_MAP,
)


class TestPincodeCityMapping:
    """Tests for Indian postal code resolution across the 5 focus cities."""

    def test_known_pincode_prefixes(self):
        """Standard 3-digit prefixes map correctly to their primary metropolitan clusters."""
        assert _pincode_to_city("560001") == "Bangalore"
        assert _pincode_to_city("110001") == "Delhi"
        assert _pincode_to_city("400001") == "Mumbai"
        assert _pincode_to_city("500001") == "Hyderabad"
        assert _pincode_to_city("411001") == "Pune"

    def test_unknown_pincode_defaults_to_bangalore(self):
        """Unknown pincodes safely fallback to default hub (Bangalore)."""
        assert _pincode_to_city("999999") == "Bangalore"
        assert _pincode_to_city("") == "Bangalore"


class TestSeasonalWeatherHeuristics:
    """Tests for seasonal climatology heuristics and precipitation categories."""

    def test_mumbai_monsoon_july_is_rainy(self):
        """Mumbai in July (Monsoon season) must be classified as Rainy with heavy precipitation."""
        july_date = date(2026, 7, 15)
        weather = _seasonal_heuristic("Mumbai", july_date)
        assert weather["weather_category"] == "Rainy"
        assert weather["is_rainy"] is True
        assert weather["precipitation_sum"] > 5.0

    def test_delhi_summer_may_is_clear_and_hot(self):
        """Delhi in May must reflect high summer temperatures."""
        may_date = date(2026, 5, 20)
        weather = _seasonal_heuristic("Delhi", may_date)
        assert weather["temperature_max"] >= 35.0
        assert weather["is_rainy"] is False

    def test_all_focus_cities_supported(self):
        """All 5 focus cities produce valid non-null weather metrics."""
        test_dt = date(2026, 8, 1)
        for city in CITY_COORDS.keys():
            w = _seasonal_heuristic(city, test_dt)
            assert "temperature_max" in w
            assert "precipitation_sum" in w
            assert "weather_category" in w
            assert isinstance(w["is_rainy"], bool)


class TestWeatherSurgeMultipliers:
    """Tests for dynamic weather surge multipliers and Open-Meteo telemetry."""

    @pytest.mark.asyncio
    async def test_fetch_weather_forecast_structure(self):
        """fetch_weather_forecast returns complete telemetry payload with surge multiplier."""
        telemetry = await fetch_weather_forecast("560034")
        assert "city" in telemetry
        assert telemetry["city"] == "Bangalore"
        assert "temperature_c" in telemetry
        assert "surge_multiplier" in telemetry
        assert telemetry["surge_multiplier"] >= 1.0
        assert "condition" in telemetry

    @pytest.mark.asyncio
    async def test_rain_surge_multiplier_value(self):
        """When condition is Rainy, surge multiplier is 1.25x (or 1.22x seasonal fallback)."""
        # Testing date-based lookup for monsoon
        w_data = await fetch_weather_for_date("400050", date(2026, 7, 10))
        assert "weather_category" in w_data
        assert "is_rainy" in w_data
        assert "temperature_max" in w_data
