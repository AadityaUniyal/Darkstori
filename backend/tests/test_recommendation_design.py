import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from backend.utils.recommendation_engine import (
    RecommendationEngine,
    InventoryStrategy,
    PricingStrategyContext,
    LayoutStrategy,
)
from backend.database.repositories import NeighborhoodRepository, RecommendationRepository, OrderRepository

@pytest.mark.asyncio
async def test_inventory_strategy_precomputed_success():
    """Verify InventoryStrategy uses precomputed recommendations if available in repository."""
    db = MagicMock(spec=AsyncSession)
    mock_rec = MagicMock()
    mock_rec.category = "Beverages"
    mock_rec.space_allocation_pct = 40.0
    mock_rec.investment_amount = 640000.0
    mock_rec.top_skus = ["Cola", "Juice"]
    mock_rec.confidence_level = 0.9
    
    # Mock RecommendationRepository return value
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_rec]
    db.execute.return_value = mock_result

    engine = RecommendationEngine(InventoryStrategy())
    res = await engine.execute(neighborhood_id=1, context={"budget": 1600000.0}, db=db)
    
    assert len(res) == 1
    assert res[0].category == "Beverages"
    assert res[0].space_allocation_pct == 40.0
    assert res[0].investment_amount == 640000.0


@pytest.mark.asyncio
async def test_pricing_strategy_demographic_fallback():
    """Verify PricingStrategyContext falls back to demographic calculations if no precomputed strategies exist."""
    db = MagicMock(spec=AsyncSession)
    
    # Precomputed return is empty
    mock_precomputed_res = MagicMock()
    mock_precomputed_res.scalars.return_value.all.return_value = []
    
    # Demographic lookup returns neighborhood with 1.2M average income
    mock_nbhd = MagicMock()
    mock_nbhd.avg_household_income = 1200000
    mock_nbhd_res = MagicMock()
    mock_nbhd_res.scalar_one_or_none.return_value = mock_nbhd
    
    db.execute.side_effect = [mock_precomputed_res, mock_nbhd_res]

    engine = RecommendationEngine(PricingStrategyContext())
    res = await engine.execute(neighborhood_id=1, context={}, db=db)
    
    # With > 1M income, should generate Premium & Regular segments
    assert len(res) == 2
    assert res[0].segment == "Premium"
    assert res[1].segment == "Regular"


@pytest.mark.asyncio
async def test_layout_strategy_default_fallback():
    """Verify LayoutStrategy generates default warehouse percentages when no data is precomputed."""
    db = MagicMock(spec=AsyncSession)
    
    # Precomputed return is empty
    mock_precomputed_res = MagicMock()
    mock_precomputed_res.scalars.return_value.all.return_value = []
    db.execute.return_value = mock_precomputed_res

    engine = RecommendationEngine(LayoutStrategy())
    res = await engine.execute(neighborhood_id=1, context={"store_size": 2000}, db=db)
    
    assert len(res) == 1
    assert res[0].store_size_sqft == 2000
    assert "cold_storage" in res[0].layout_zones
    assert res[0].layout_zones["cold_storage"]["pct"] == 20
