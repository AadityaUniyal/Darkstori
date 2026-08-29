import pytest
from backend.database.connection import get_db

def test_predict_success(test_client):
    # Mock get_db session to return a mock neighborhood row
    class MockRow:
        def __init__(self):
            self.neighborhood_id = 1
            self.population = 100000
            self.population_density = 7500.0
            self.avg_household_income = 800000.0
            self.working_professionals_pct = 70.0
            self.total_stores = 4
            self.comp_level = 1
            self.avg_daily_orders = 250.0
            self.std_daily_orders = 30.0
            self.avg_order_value = 500.0
            self.avg_discount = 25.0
            self.platform_diversity = 0.7
            self.category_diversity = 0.65
            self.is_holiday = 0

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
    assert "prediction" in json_data
    assert "lower_bound" in json_data
    assert "upper_bound" in json_data
    assert json_data["lower_bound"] <= json_data["prediction"] <= json_data["upper_bound"]
