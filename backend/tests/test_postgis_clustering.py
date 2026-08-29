import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from backend.api.routes.placement import get_opportunity_zones

@pytest.mark.asyncio
async def test_get_opportunity_zones_sqlite_fallback():
    """Verify get_opportunity_zones falls back to simple DBSCAN on SQLite dialect."""
    db = MagicMock(spec=AsyncSession)
    
    # Mock dialect to be sqlite
    db.bind = MagicMock()
    db.bind.dialect.name = "sqlite"
    
    # Mock return values for DarkStore query
    mock_dark_store1 = MagicMock()
    mock_dark_store1.latitude = 12.9345
    mock_dark_store1.longitude = 77.6266
    mock_dark_store1.platform = "Zepto"
    mock_dark_store1.id = 1
    mock_dark_store1.city = "Bangalore"
    mock_dark_store1.is_active = True

    mock_dark_store2 = MagicMock()
    mock_dark_store2.latitude = 12.9345
    mock_dark_store2.longitude = 77.6266
    mock_dark_store2.platform = "Zepto"
    mock_dark_store2.id = 2
    mock_dark_store2.city = "Bangalore"
    mock_dark_store2.is_active = True

    # Mock return values for CompetitorStore query
    mock_comp_store = MagicMock()
    mock_comp_store.latitude = 12.9345
    mock_comp_store.longitude = 77.6266
    mock_comp_store.platform = "Blinkit"
    mock_comp_store.id = 3
    mock_comp_store.city = "Bangalore"
    mock_comp_store.is_active = True

    mock_dark_result = MagicMock()
    mock_dark_result.scalars.return_value.all.return_value = [mock_dark_store1, mock_dark_store2]

    mock_comp_result = MagicMock()
    mock_comp_result.scalars.return_value.all.return_value = [mock_comp_store]

    # PostGIS attempt on SQLite fails / raises exception, triggering fallback to DarkStore and CompetitorStore queries
    db.execute.side_effect = [
        Exception("PostGIS ST_ClusterDBSCAN not supported on SQLite"),
        mock_dark_result,
        mock_comp_result,
    ]
    
    # Run endpoint logic
    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=2, db=db, payload=payload)
    
    # Since all 3 mock stores have the same coords, they should cluster into 1 zone
    assert len(zones) > 0
    assert zones[0].store_count == 3
    assert zones[0].dominant_platform == "Zepto"
    assert db.execute.call_count == 3


@pytest.mark.asyncio
async def test_get_opportunity_zones_postgis_query_success():
    """Verify get_opportunity_zones executes PostGIS query on PostgreSQL dialect."""
    db = MagicMock(spec=AsyncSession)
    
    # Mock dialect to be postgresql
    db.bind = MagicMock()
    db.bind.dialect.name = "postgresql"
    
    # Mock Postgres mappings return value
    mock_row = {
        "id": 1,
        "platform": "Zepto",
        "latitude": 12.9345,
        "longitude": 77.6266,
        "cid": 0
    }
    mock_result = MagicMock()
    mock_result.mappings.return_value.all.return_value = [mock_row, mock_row, mock_row]
    db.execute.return_value = mock_result
    
    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=2, db=db, payload=payload)
    
    assert len(zones) == 1
    assert zones[0].cluster_id == 0
    assert zones[0].store_count == 3
    assert zones[0].dominant_platform == "Zepto"


@pytest.mark.asyncio
async def test_get_opportunity_zones_postgis_query_failure_fallback():
    """Verify get_opportunity_zones falls back to Python DBSCAN if PostGIS query fails."""
    db = MagicMock(spec=AsyncSession)
    
    # Mock dialect to be postgresql
    db.bind = MagicMock()
    db.bind.dialect.name = "postgresql"
    
    # Set up fallback select stores return values
    mock_dark_store1 = MagicMock()
    mock_dark_store1.latitude = 12.9345
    mock_dark_store1.longitude = 77.6266
    mock_dark_store1.platform = "Zepto"
    mock_dark_store1.id = 1
    mock_dark_store1.city = "Bangalore"
    mock_dark_store1.is_active = True

    mock_dark_store2 = MagicMock()
    mock_dark_store2.latitude = 12.9345
    mock_dark_store2.longitude = 77.6266
    mock_dark_store2.platform = "Zepto"
    mock_dark_store2.id = 2
    mock_dark_store2.city = "Bangalore"
    mock_dark_store2.is_active = True

    mock_comp_store = MagicMock()
    mock_comp_store.latitude = 12.9345
    mock_comp_store.longitude = 77.6266
    mock_comp_store.platform = "Blinkit"
    mock_comp_store.id = 3
    mock_comp_store.city = "Bangalore"
    mock_comp_store.is_active = True
    
    mock_dark_result = MagicMock()
    mock_dark_result.scalars.return_value.all.return_value = [mock_dark_store1, mock_dark_store2]

    mock_comp_result = MagicMock()
    mock_comp_result.scalars.return_value.all.return_value = [mock_comp_store]
    
    # First call (PostGIS query) raises exception
    # Second call (Fallback DarkStore query) succeeds
    # Third call (Fallback CompetitorStore query) succeeds
    db.execute.side_effect = [
        RuntimeError("ST_ClusterDBSCAN does not exist"), # postgis query fail
        mock_dark_result,                                # dark stores query
        mock_comp_result,                                # competitor stores query
    ]
    
    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=2, db=db, payload=payload)
    
    assert len(zones) > 0
    assert zones[0].store_count == 3
    assert zones[0].dominant_platform == "Zepto"
    assert db.execute.call_count == 3
