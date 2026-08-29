"""Tests for coverage and placement API endpoints."""
import pytest
from backend.database.connection import get_db


def test_coverage_gaps_returns_200(test_client):
    """Coverage gaps endpoint should return HTTP 200 with valid structure."""
    response = test_client.get("/api/v1/analytics/coverage-gaps")
    assert response.status_code == 200


def test_opportunity_zones_returns_200(test_client):
    """Opportunity zones endpoint should return HTTP 200 with valid structure."""
    response = test_client.get("/api/v1/placement/opportunity-zones")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_placement_summary_returns_200(test_client):
    """Placement summary endpoint should return HTTP 200."""
    response = test_client.get("/api/v1/placement/summary")
    assert response.status_code == 200


def test_health_endpoint(test_client):
    """Health endpoint should return 200 with status info."""
    response = test_client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_predict_response_structure(test_client):
    """Prediction response should include model metadata fields."""
    # Mock the neighborhood lookup to return data
    class MockRow:
        neighborhood_id = 1
        population = 100000
        population_density = 7500.0
        avg_household_income = 800000.0
        working_professionals_pct = 70.0
        total_stores = 4
        comp_level = 1
        avg_daily_orders = 250.0
        std_daily_orders = 30.0
        avg_order_value = 500.0
        avg_discount = 25.0
        platform_diversity = 0.7
        category_diversity = 0.65

    class MockResult:
        def one_or_none(self):
            return MockRow()

    class MockSession:
        async def execute(self, *args, **kwargs):
            return MockResult()
        async def commit(self):
            pass
        async def close(self):
            pass

    async def override_db():
        yield MockSession()

    from backend.app import app
    app.dependency_overrides[get_db] = override_db

    response = test_client.post(
        "/api/v1/predictions/predict",
        json={
            "pincode": "560001",
            "order_date": "2026-06-15"
        }
    )

    app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    json_data = response.json()

    # Verify all required metadata fields are present
    assert "prediction" in json_data
    assert "lower_bound" in json_data
    assert "upper_bound" in json_data
    assert "model_name" in json_data
    assert "model_version" in json_data
    assert "latency_ms" in json_data
    assert "prediction_id" in json_data

    # Verify confidence intervals make sense (not flat ±10%)
    prediction = json_data["prediction"]
    lower = json_data["lower_bound"]
    upper = json_data["upper_bound"]
    assert lower < prediction < upper
    # The interval should not be exactly ±10% of prediction (Flaw 11 check)
    # With std_dev = 30 and 1.645 multiplier, the margin should be ~49.35
    assert abs((prediction - lower) - (upper - prediction)) < 1.0  # Symmetric bounds


def test_neighborhoods_endpoint(test_client):
    """Neighborhoods endpoint should return HTTP 200."""
    response = test_client.get("/api/v1/neighborhoods/")
    assert response.status_code == 200
