import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import Request, HTTPException
from backend.core.rate_limiter import RateLimiter, InMemoryRateLimiter, RedisRateLimiter

@pytest.mark.asyncio
async def test_in_memory_rate_limiter():
    limiter = InMemoryRateLimiter(requests_per_minute=2)
    request = MagicMock(spec=Request)
    request.headers = {}
    request.client = MagicMock()
    request.client.host = "127.0.0.1"

    # First request
    allowed, remaining = await limiter.check_rate_limit(request)
    assert allowed is True
    assert remaining == 1

    # Second request
    allowed, remaining = await limiter.check_rate_limit(request)
    assert allowed is True
    assert remaining == 0

    # Third request (should fail)
    with pytest.raises(HTTPException) as exc_info:
        await limiter.check_rate_limit(request)
    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_redis_rate_limiter_success():
    limiter = RedisRateLimiter(requests_per_minute=5, redis_url="redis://localhost:6379/0")
    
    # Mock redis client and its methods
    mock_client = MagicMock()
    mock_pipeline = AsyncMock()
    mock_pipeline.execute.return_value = [0, 2]  # 2 recent requests
    mock_client.pipeline.return_value.__aenter__.return_value = mock_pipeline
    
    limiter.client = mock_client
    limiter._connected = True

    request = MagicMock(spec=Request)
    request.headers = {}
    request.client = MagicMock()
    request.client.host = "127.0.0.1"

    allowed, remaining = await limiter.check_rate_limit(request)
    assert allowed is True
    assert remaining == 2  # limit 5 - count 2 - 1 = 2


@pytest.mark.asyncio
async def test_redis_rate_limiter_exceeded():
    limiter = RedisRateLimiter(requests_per_minute=5, redis_url="redis://localhost:6379/0")
    
    mock_client = MagicMock()
    mock_pipeline = AsyncMock()
    mock_pipeline.execute.return_value = [0, 5]  # 5 recent requests (already at limit)
    mock_client.pipeline.return_value.__aenter__.return_value = mock_pipeline
    
    limiter.client = mock_client
    limiter._connected = True

    request = MagicMock(spec=Request)
    request.headers = {}
    request.client = MagicMock()
    request.client.host = "127.0.0.1"

    with pytest.raises(HTTPException) as exc_info:
        await limiter.check_rate_limit(request)
    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_unified_rate_limiter_fallback():
    limiter = RateLimiter(requests_per_minute=5)
    
    # Force Redis failure by mocking check_rate_limit to raise RuntimeError
    limiter.redis_limiter.check_rate_limit = AsyncMock(side_effect=RuntimeError("Redis down"))
    limiter.in_memory_limiter.check_rate_limit = AsyncMock(return_value=(True, 4))
    
    request = MagicMock(spec=Request)
    allowed, remaining = await limiter.check_rate_limit(request)
    
    assert allowed is True
    assert remaining == 4
    limiter.in_memory_limiter.check_rate_limit.assert_called_once_with(request)
