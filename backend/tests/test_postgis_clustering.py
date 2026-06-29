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
    
    # Mock return values for standard query select(DarkStore)
    mock_store = MagicMock()
    mock_store.latitude = 12.9345
    mock_store.longitude = 77.6266
    mock_store.platform = "Zepto"
    mock_store.id = 1
    mock_store.city = "Bangalore"
    mock_store.is_active = True
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_store, mock_store, mock_store]
    db.execute.return_value = mock_result
    
    # Run endpoint logic
    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=2, db=db, payload=payload)
    
    # Since all 3 mock stores have the same coords, they should cluster into 1 zone
    assert len(zones) > 0
    assert zones[0].store_count == 3
    db.execute.assert_called_once() # Should only execute the SQLAlchemy select query once


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
    mock_store = MagicMock()
    mock_store.latitude = 12.9345
    mock_store.longitude = 77.6266
    mock_store.platform = "Zepto"
    mock_store.id = 1
    mock_store.city = "Bangalore"
    mock_store.is_active = True
    
    mock_result_fallback = MagicMock()
    mock_result_fallback.scalars.return_value.all.return_value = [mock_store, mock_store, mock_store]
    
    # First call (PostGIS query) raises exception
    # Second call (Fallback SELECT query) succeeds
    db.execute.side_effect = [
        RuntimeError("ST_ClusterDBSCAN does not exist"), # postgis query fail
        mock_result_fallback # fallback stores query
    ]
    
    payload = {"sub": "test_user"}
    zones = await get_opportunity_zones(city="Bangalore", eps_km=1.5, min_stores=2, db=db, payload=payload)
    
    assert len(zones) > 0
    assert zones[0].store_count == 3
    assert db.execute.call_count == 2
