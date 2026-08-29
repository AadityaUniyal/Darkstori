"""
Empirical Stress Test Suite for Milestone M2 Iteration 2 (Backend R1 & R2).
Written by Challenger 2 (challenger_m2_r2_2).

Validates:
1. CircuitBreaker.call() sync/async execution, awaitables, thread safety, and full state transitions.
2. IdempotencyMiddleware concurrency locking, SHA-256 hashing, header injection, GET passthrough, non-2xx bypass, and Redis error degradation.
"""
import asyncio
import time
import pytest
import httpx
from unittest.mock import patch, MagicMock

from fastapi import FastAPI, Response, Header
from backend.core.circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    CircuitBreakerOpenException,
    circuit_breaker
)
from backend.core.cache import cache
from backend.core.idempotency import IdempotencyMiddleware

# ---------------------------------------------------------------------------
# Setup Isolated FastAPI Application for Middleware Testing
# ---------------------------------------------------------------------------
stress_app = FastAPI()
stress_app.add_middleware(IdempotencyMiddleware)

state_counter = {
    "mutation_calls": 0,
    "slow_calls": 0,
    "error_calls": 0,
    "get_calls": 0
}

@stress_app.post("/api/v1/stress-mutation")
async def stress_mutation_endpoint(payload: dict):
    state_counter["mutation_calls"] += 1
    return {
        "status": "success",
        "call_count": state_counter["mutation_calls"],
        "received": payload
    }

@stress_app.post("/api/v1/stress-slow")
async def stress_slow_endpoint(payload: dict):
    state_counter["slow_calls"] += 1
    # Sleep to keep lock active for concurrent callers
    await asyncio.sleep(0.2)
    return {
        "status": "slow_done",
        "call_count": state_counter["slow_calls"],
        "received": payload
    }

@stress_app.post("/api/v1/stress-error")
async def stress_error_endpoint(response: Response):
    state_counter["error_calls"] += 1
    response.status_code = 422
    return {"error": "unprocessable_entity", "call_count": state_counter["error_calls"]}

@stress_app.get("/api/v1/stress-get")
async def stress_get_endpoint():
    state_counter["get_calls"] += 1
    return {"status": "get_ok", "call_count": state_counter["get_calls"]}

@stress_app.head("/api/v1/stress-head")
async def stress_head_endpoint(response: Response):
    response.headers["X-Custom-Head"] = "test-value"
    return {"status": "head_ok"}


# ===========================================================================
# 1. CircuitBreaker Verification & Stress Tests
# ===========================================================================

@pytest.mark.asyncio
async def test_cb_sync_and_async_functions_execution():
    """Verify CircuitBreaker.call() executes sync functions, async coroutines, and sync functions returning awaitables."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=10.0)

    # Sync function
    def sync_calc(a, b):
        return a * b + 10

    # Async function
    async def async_calc(a, b):
        await asyncio.sleep(0.01)
        return a + b + 20

    # Sync function returning coroutine object
    def sync_returning_async(a, b):
        async def inner():
            await asyncio.sleep(0.01)
            return a + b + 30
        return inner()

    res_sync = cb.call(sync_calc, 5, 4)
    assert res_sync == 30
    assert cb.state == CircuitState.CLOSED

    res_async = cb.call(async_calc, 5, 4)
    assert res_async == 29
    assert cb.state == CircuitState.CLOSED

    res_awaitable = cb.call(sync_returning_async, 5, 4)
    assert res_awaitable == 39
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0


@pytest.mark.asyncio
async def test_cb_state_transitions_full_cycle():
    """Verify CLOSED -> OPEN (on threshold) -> HALF_OPEN (after timeout) -> CLOSED (on success)."""
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.15)

    def failing_fn():
        raise RuntimeError("External service failed")

    def succeeding_fn():
        return "Service restored"

    # Initial state: CLOSED
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0

    # 1st Failure
    with pytest.raises(RuntimeError):
        cb.call(failing_fn)
    assert cb.failure_count == 1
    assert cb.state == CircuitState.CLOSED

    # 2nd Failure -> Tripped to OPEN
    with pytest.raises(RuntimeError):
        cb.call(failing_fn)
    assert cb.failure_count == 2
    assert cb.state == CircuitState.OPEN

    # Call while OPEN (before recovery timeout) -> Immediately blocked by CircuitBreakerOpenException
    with pytest.raises(CircuitBreakerOpenException) as exc_info:
        cb.call(succeeding_fn)
    assert "CircuitBreaker is OPEN" in str(exc_info.value)

    # Wait for recovery timeout
    await asyncio.sleep(0.2)

    # Call while recovery timeout expired -> Transitions to HALF_OPEN and succeeds -> CLOSED
    res = cb.call(succeeding_fn)
    assert res == "Service restored"
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0


@pytest.mark.asyncio
async def test_cb_half_open_failure_reopens_immediately():
    """Verify failed attempt in HALF_OPEN state immediately re-trips breaker to OPEN."""
    cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)

    def failing_fn():
        raise ValueError("Failure in half-open")

    # Trip breaker
    for _ in range(2):
        with pytest.raises(ValueError):
            cb.call(failing_fn)
    assert cb.state == CircuitState.OPEN

    # Wait for recovery timeout
    await asyncio.sleep(0.15)

    # Failing call in HALF_OPEN -> Re-trips to OPEN immediately
    with pytest.raises(ValueError):
        cb.call(failing_fn)
    assert cb.state == CircuitState.OPEN

    # Next call blocked without calling fn
    with pytest.raises(CircuitBreakerOpenException):
        cb.call(failing_fn)


@pytest.mark.asyncio
async def test_cb_high_concurrency_execution():
    """Stress test CircuitBreaker with 50 concurrent async calls."""
    cb = CircuitBreaker(failure_threshold=100, recovery_timeout=10.0)

    async def concurrent_task(task_id: int):
        await asyncio.sleep(0.01)
        return task_id * 2

    tasks = [asyncio.create_task(asyncio.to_thread(cb.call, concurrent_task, i)) for i in range(50)]
    results = await asyncio.gather(*tasks)
    
    assert len(results) == 50
    assert results == [i * 2 for i in range(50)]
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0


@pytest.mark.asyncio
async def test_cb_decorator_and_call_parity():
    """Verify @circuit_breaker decorator and CircuitBreaker.call() produce identical state transitions."""
    cb_dec = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)

    @cb_dec
    async def dec_failing():
        raise KeyError("Decorator failure")

    # 1st & 2nd Failure via decorator
    with pytest.raises(KeyError):
        await dec_failing()
    with pytest.raises(KeyError):
        await dec_failing()
    assert cb_dec.state == CircuitState.OPEN

    # 3rd Call via decorator blocked
    with pytest.raises(CircuitBreakerOpenException):
        await dec_failing()


# ===========================================================================
# 2. IdempotencyMiddleware Verification & Stress Tests
# ===========================================================================

@pytest.mark.asyncio
async def test_idempotency_concurrency_lock_stress():
    """Stress test in-flight concurrency lock with 10 concurrent requests using the same Idempotency-Key."""
    state_counter["slow_calls"] = 0
    transport = httpx.ASGITransport(app=stress_app)
    
    key = "stress-lock-key-9999"
    payload = {"order_id": "ORD-STRESS-101", "qty": 5}

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Launch 10 requests concurrently
        tasks = [
            client.post("/api/v1/stress-slow", json=payload, headers={"Idempotency-Key": key})
            for _ in range(10)
        ]
        responses = await asyncio.gather(*tasks)

    # 1. All 10 requests must succeed with HTTP 200
    for resp in responses:
        assert resp.status_code == 200
        assert resp.json()["status"] == "slow_done"
        assert resp.json()["received"] == payload

    # 2. Handler must have executed exactly ONCE
    assert state_counter["slow_calls"] == 1

    # 3. 9 out of 10 responses must have header X-Cache: HIT-IDEMPOTENT
    hit_count = sum(1 for r in responses if r.headers.get("X-Cache") == "HIT-IDEMPOTENT")
    assert hit_count == 9


@pytest.mark.asyncio
async def test_idempotency_sha256_extreme_and_unicode_keys():
    """Verify SHA-256 hashing supports percent-encoded unicode, special characters, and long keys safely."""
    state_counter["mutation_calls"] = 0
    transport = httpx.ASGITransport(app=stress_app)

    encoded_unicode_key = "key-%F0%9F%95%91-%E2%9A%A1-darkstore-utf8-12345"
    long_key = "K" * 5000  # 5000 character string
    special_key = "key-!@#$%^&*()_+-=[]{}|;':,./<>?~"

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Encoded unicode key test
        r1 = await client.post("/api/v1/stress-mutation", json={"type": "unicode"}, headers={"Idempotency-Key": encoded_unicode_key})
        assert r1.status_code == 200
        r1_dup = await client.post("/api/v1/stress-mutation", json={"type": "unicode"}, headers={"Idempotency-Key": encoded_unicode_key})
        assert r1_dup.status_code == 200
        assert r1_dup.headers.get("X-Cache") == "HIT-IDEMPOTENT"

        # 2. Long key test
        r2 = await client.post("/api/v1/stress-mutation", json={"type": "long"}, headers={"Idempotency-Key": long_key})
        assert r2.status_code == 200
        r2_dup = await client.post("/api/v1/stress-mutation", json={"type": "long"}, headers={"Idempotency-Key": long_key})
        assert r2_dup.status_code == 200
        assert r2_dup.headers.get("X-Cache") == "HIT-IDEMPOTENT"

        # 3. Special characters key test
        r3 = await client.post("/api/v1/stress-mutation", json={"type": "special"}, headers={"Idempotency-Key": special_key})
        assert r3.status_code == 200
        r3_dup = await client.post("/api/v1/stress-mutation", json={"type": "special"}, headers={"Idempotency-Key": special_key})
        assert r3_dup.status_code == 200
        assert r3_dup.headers.get("X-Cache") == "HIT-IDEMPOTENT"

    # Only 3 distinct executions took place
    assert state_counter["mutation_calls"] == 3


@pytest.mark.asyncio
async def test_idempotency_get_head_methods_passthrough():
    """Verify GET and HEAD requests bypass idempotency middleware without modifying cache or headers."""
    state_counter["get_calls"] = 0
    transport = httpx.ASGITransport(app=stress_app)

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # GET request with Idempotency-Key header
        g1 = await client.get("/api/v1/stress-get", headers={"Idempotency-Key": "get-key-101"})
        assert g1.status_code == 200
        assert g1.headers.get("X-Cache") != "HIT-IDEMPOTENT"
        assert state_counter["get_calls"] == 1

        # Second GET request with same key
        g2 = await client.get("/api/v1/stress-get", headers={"Idempotency-Key": "get-key-101"})
        assert g2.status_code == 200
        assert g2.headers.get("X-Cache") != "HIT-IDEMPOTENT"
        assert state_counter["get_calls"] == 2

        # HEAD request
        h1 = await client.head("/api/v1/stress-head", headers={"Idempotency-Key": "head-key-202"})
        assert h1.status_code == 200
        assert h1.headers.get("X-Cache") != "HIT-IDEMPOTENT"
        assert h1.headers.get("X-Custom-Head") == "test-value"



@pytest.mark.asyncio
async def test_idempotency_non_2xx_bypass():
    """Verify 4xx/5xx error responses are not stored in cache and subsequent requests re-execute endpoint."""
    state_counter["error_calls"] = 0
    transport = httpx.ASGITransport(app=stress_app)

    key = "error-key-422"
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1st request -> returns 422
        e1 = await client.post("/api/v1/stress-error", headers={"Idempotency-Key": key})
        assert e1.status_code == 422
        assert e1.headers.get("X-Cache") != "HIT-IDEMPOTENT"
        assert state_counter["error_calls"] == 1

        # 2nd request with same key -> does NOT hit cache, handler runs again
        e2 = await client.post("/api/v1/stress-error", headers={"Idempotency-Key": key})
        assert e2.status_code == 422
        assert e2.headers.get("X-Cache") != "HIT-IDEMPOTENT"
        assert state_counter["error_calls"] == 2


@pytest.mark.asyncio
async def test_idempotency_redis_error_graceful_degradation():
    """Verify middleware degrades gracefully when Redis operations raise exceptions."""
    state_counter["mutation_calls"] = 0
    transport = httpx.ASGITransport(app=stress_app)

    # Patch cache.get to throw Redis connection error
    with patch.object(cache, "get", side_effect=ConnectionError("Redis connection lost")):
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            res = await client.post(
                "/api/v1/stress-mutation",
                json={"item": "failover"},
                headers={"Idempotency-Key": "redis-down-key-505"}
            )
            # Request completes normally with 200 OK
            assert res.status_code == 200
            assert res.json()["status"] == "success"
            assert state_counter["mutation_calls"] == 1
