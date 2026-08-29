"""
Empirical verification test suite by Challenger 1 for M2 (R1 & R2).
Tests circuit breaker state machine, OSM fallbacks, idempotency middleware headers,
cache hits, non-2xx bypass, and Redis error degradation.
"""
import asyncio
import time
import pytest
import httpx
from unittest.mock import patch, MagicMock

from fastapi import FastAPI, Response
from backend.core.circuit_breaker import CircuitBreaker, CircuitState, CircuitBreakerOpenException, circuit_breaker
from backend.utils.osm_service import resolve_location, reverse_location, _execute_nominatim_search, _execute_nominatim_reverse
from backend.core.cache import cache
from backend.core.idempotency import IdempotencyMiddleware

# Create an isolated FastAPI app for idempotency testing without DB dependencies
dummy_app = FastAPI()
dummy_app.add_middleware(IdempotencyMiddleware)

call_counter = {"count": 0}

@dummy_app.post("/api/v1/sample-mutation")
async def sample_mutation_route(payload: dict):
    call_counter["count"] += 1
    return {"message": "success", "call_count": call_counter["count"], "data": payload}

@dummy_app.post("/api/v1/sample-error")
async def sample_error_route(response: Response):
    call_counter["count"] += 1
    response.status_code = 400
    return {"error": "bad request", "call_count": call_counter["count"]}

@dummy_app.get("/api/v1/sample-get")
async def sample_get_route():
    call_counter["count"] += 1
    return {"message": "get success", "call_count": call_counter["count"]}


@pytest.mark.asyncio
async def test_cb_missing_imports_check():
    """Verify if CircuitBreaker.call() suffers from missing module imports (inspect/asyncio)."""
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=30.0)
    
    def sync_fn(x, y):
        return x + y
        
    async def async_fn(x, y):
        return x + y

    # Test sync execution via cb.call
    try:
        res_sync = cb.call(sync_fn, 2, 3)
        assert res_sync == 5
    except NameError as e:
        # Failure documented: missing 'inspect' / 'asyncio' import in circuit_breaker.py
        pytest.fail(f"CircuitBreaker.call failed with NameError on sync_fn: {e}")

    # Test async execution via cb.call
    try:
        res_async = cb.call(async_fn, 3, 4)
        assert res_async == 7
    except NameError as e:
        pytest.fail(f"CircuitBreaker.call failed with NameError on async_fn: {e}")


@pytest.mark.asyncio
async def test_cb_nominatim_outage_tripping_and_fallback():
    """Verify Circuit Breaker trips after 2 failures and resolve_location returns fallback."""
    # Create isolated circuit breaker decorated function to test state machine
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=30.0)
    
    call_attempts = {"count": 0}
    
    @cb
    async def mock_nominatim_call():
        call_attempts["count"] += 1
        raise httpx.ConnectTimeout("Connection timed out")

    # 1st Failure
    with pytest.raises(httpx.ConnectTimeout):
        await mock_nominatim_call()
    assert cb.failure_count == 1
    assert cb.state == CircuitState.CLOSED

    # 2nd Failure -> Trips state to OPEN
    with pytest.raises(httpx.ConnectTimeout):
        await mock_nominatim_call()
    assert cb.failure_count == 2
    assert cb.state == CircuitState.OPEN

    # 3rd Call -> Immediately blocked by CircuitBreakerOpenException
    with pytest.raises(CircuitBreakerOpenException):
        await mock_nominatim_call()
    
    # Attempts count should remain 2 because 3rd call was blocked by CB
    assert call_attempts["count"] == 2


@pytest.mark.asyncio
async def test_cb_state_recovery_cycle():
    """Verify OPEN -> HALF_OPEN -> CLOSED recovery on success, and HALF_OPEN -> OPEN on failure."""
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)

    @cb
    async def flaky_service(should_fail: bool):
        if should_fail:
            raise ValueError("Service error")
        return "OK"

    # Trip breaker
    with pytest.raises(ValueError):
        await flaky_service(True)
    with pytest.raises(ValueError):
        await flaky_service(True)

    assert cb.state == CircuitState.OPEN

    # Wait for recovery timeout
    await asyncio.sleep(0.15)

    # Next call should transition to HALF_OPEN and succeed -> CLOSED
    res = await flaky_service(False)
    assert res == "OK"
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0

    # Retrip breaker
    with pytest.raises(ValueError):
        await flaky_service(True)
    with pytest.raises(ValueError):
        await flaky_service(True)
    assert cb.state == CircuitState.OPEN

    await asyncio.sleep(0.15)

    # Failed trial call in HALF_OPEN should immediately trip back to OPEN
    with pytest.raises(ValueError):
        await flaky_service(True)
    assert cb.state == CircuitState.OPEN


@pytest.mark.asyncio
async def test_idempotency_isolated_mutation_caching_and_headers():
    """Verify duplicate POST request with Idempotency-Key returns cached response with X-Cache header."""
    call_counter["count"] = 0
    transport = httpx.ASGITransport(app=dummy_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Idempotency-Key": "isolated-key-1001"}
        payload = {"item": "darkstore_pune_1"}

        # Request 1: Should execute handler (call_count = 1)
        resp1 = await client.post("/api/v1/sample-mutation", json=payload, headers=headers)
        assert resp1.status_code == 200
        assert resp1.json()["call_count"] == 1
        assert resp1.headers.get("X-Cache") != "HIT-IDEMPOTENT"

        # Request 2: Duplicate key -> Should return cached response without executing handler (call_count stays 1)
        resp2 = await client.post("/api/v1/sample-mutation", json=payload, headers=headers)
        assert resp2.status_code == 200
        assert resp2.headers.get("X-Cache") == "HIT-IDEMPOTENT"
        assert resp2.json()["call_count"] == 1


@pytest.mark.asyncio
async def test_idempotency_isolated_lowercase_header_support():
    """Verify idempotency-key header in lowercase works identically."""
    call_counter["count"] = 0
    transport = httpx.ASGITransport(app=dummy_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {"item": "darkstore_mumbai_1"}

        # First request with lowercase header
        resp1 = await client.post(
            "/api/v1/sample-mutation",
            json=payload,
            headers={"idempotency-key": "isolated-lowercase-2002"}
        )
        assert resp1.status_code == 200
        assert resp1.json()["call_count"] == 1

        # Second request with titlecase header
        resp2 = await client.post(
            "/api/v1/sample-mutation",
            json=payload,
            headers={"Idempotency-Key": "isolated-lowercase-2002"}
        )
        assert resp2.status_code == 200
        assert resp2.headers.get("X-Cache") == "HIT-IDEMPOTENT"
        assert resp2.json()["call_count"] == 1


@pytest.mark.asyncio
async def test_idempotency_isolated_non_2xx_not_cached():
    """Verify non-2xx responses (e.g. 400 Bad Request) are NOT cached in Redis."""
    call_counter["count"] = 0
    transport = httpx.ASGITransport(app=dummy_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Idempotency-Key": "isolated-error-3003"}
        
        # Request 1: 400 Bad Request
        resp1 = await client.post("/api/v1/sample-error", headers=headers)
        assert resp1.status_code == 400
        assert resp1.json()["call_count"] == 1
        assert resp1.headers.get("X-Cache") != "HIT-IDEMPOTENT"

        # Request 2: Should NOT hit cache, handler executes again (call_count = 2)
        resp2 = await client.post("/api/v1/sample-error", headers=headers)
        assert resp2.status_code == 400
        assert resp2.json()["call_count"] == 2
        assert resp2.headers.get("X-Cache") != "HIT-IDEMPOTENT"


@pytest.mark.asyncio
async def test_idempotency_isolated_redis_failure_degradation():
    """Verify middleware degrades gracefully when Redis cache operation fails."""
    call_counter["count"] = 0
    transport = httpx.ASGITransport(app=dummy_app)
    
    with patch.object(cache, "get", side_effect=RuntimeError("Redis down")):
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            headers = {"Idempotency-Key": "isolated-redis-fail-4004"}
            resp = await client.post("/api/v1/sample-mutation", json={"data": "test"}, headers=headers)
            # Request should proceed normally without 500 error
            assert resp.status_code == 200
            assert resp.json()["call_count"] == 1


@pytest.mark.asyncio
async def test_idempotency_isolated_get_method_bypassed():
    """Verify GET requests ignore Idempotency-Key and are not cached by IdempotencyMiddleware."""
    call_counter["count"] = 0
    transport = httpx.ASGITransport(app=dummy_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/api/v1/sample-get", headers={"Idempotency-Key": "isolated-get-5005"})
        assert resp.status_code == 200
        assert resp.headers.get("X-Cache") != "HIT-IDEMPOTENT"
