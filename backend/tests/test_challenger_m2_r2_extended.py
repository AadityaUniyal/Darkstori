"""
Extended Empirical Verification Tests for M2 Iteration 2 (Backend R1 & R2).
Written by Challenger 1.
"""
import asyncio
import time
import pytest
import httpx
from unittest.mock import patch

from fastapi import FastAPI, Response
from backend.core.circuit_breaker import CircuitBreaker, CircuitState, CircuitBreakerOpenException, circuit_breaker
from backend.core.cache import cache
from backend.core.idempotency import IdempotencyMiddleware

# Dummy FastAPI app for empirical testing
ext_app = FastAPI()
ext_app.add_middleware(IdempotencyMiddleware)

slow_route_counter = {"count": 0}

@ext_app.post("/api/v1/slow-mutation")
async def slow_mutation_route(payload: dict):
    slow_route_counter["count"] += 1
    # Sleep to simulate in-flight request processing
    await asyncio.sleep(0.3)
    return {"status": "done", "counter": slow_route_counter["count"], "payload": payload}

@ext_app.post("/api/v1/unicode-mutation")
async def unicode_mutation_route(payload: dict):
    return {"result": "success", "echo": payload}


@pytest.mark.asyncio
async def test_cb_call_sync_in_running_event_loop():
    """Verify CircuitBreaker.call() executes synchronous function inside a running asyncio event loop."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=10.0)

    def sync_add(a, b):
        return a + b

    result = cb.call(sync_add, 10, 20)
    assert result == 30
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0


def test_cb_call_sync_outside_event_loop():
    """Verify CircuitBreaker.call() executes synchronous function outside any event loop."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=10.0)

    def sync_multiply(a, b):
        return a * b

    result = cb.call(sync_multiply, 6, 7)
    assert result == 42
    assert cb.state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_cb_call_async_in_running_event_loop():
    """Verify CircuitBreaker.call() executes async coroutine function inside a running asyncio event loop."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=10.0)

    async def async_concat(s1, s2):
        await asyncio.sleep(0.01)
        return s1 + s2

    result = cb.call(async_concat, "hello ", "world")
    assert result == "hello world"
    assert cb.state == CircuitState.CLOSED


def test_cb_call_async_outside_event_loop():
    """Verify CircuitBreaker.call() executes async coroutine function outside any running event loop."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=10.0)

    async def async_square(n):
        await asyncio.sleep(0.01)
        return n * n

    result = cb.call(async_square, 9)
    assert result == 81
    assert cb.state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_cb_call_sync_returning_awaitable_in_running_loop():
    """Verify CircuitBreaker.call() executes sync function returning an awaitable (coroutine object)."""
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=10.0)

    async def _inner_coro(val):
        return val * 3

    def sync_returning_coro(val):
        return _inner_coro(val)

    result = cb.call(sync_returning_coro, 11)
    assert result == 33
    assert cb.state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_idempotency_unicode_special_char_key_hashing():
    """Verify IdempotencyMiddleware handles special characters in key hash safely."""
    transport = httpx.ASGITransport(app=ext_app)
    special_key = "key-special-!@#$%^&*()_+~`-123-darkstore-pune"
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1st request
        r1 = await client.post("/api/v1/unicode-mutation", json={"city": "Pune"}, headers={"Idempotency-Key": special_key})
        assert r1.status_code == 200
        assert r1.headers.get("X-Cache") != "HIT-IDEMPOTENT"

        # 2nd request with identical special key
        r2 = await client.post("/api/v1/unicode-mutation", json={"city": "Pune"}, headers={"Idempotency-Key": special_key})
        assert r2.status_code == 200
        assert r2.headers.get("X-Cache") == "HIT-IDEMPOTENT"
        assert r2.json() == r1.json()


@pytest.mark.asyncio
async def test_idempotency_concurrent_request_locking():
    """Verify concurrent requests with same key wait on lock and receive cached response."""
    slow_route_counter["count"] = 0
    transport = httpx.ASGITransport(app=ext_app)

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        key = "concurrent-lock-key-777"
        payload = {"data": "concurrency_test"}

        # Launch two requests concurrently
        t1 = asyncio.create_task(client.post("/api/v1/slow-mutation", json=payload, headers={"Idempotency-Key": key}))
        await asyncio.sleep(0.05) # slight offset so request 1 sets the lock
        t2 = asyncio.create_task(client.post("/api/v1/slow-mutation", json=payload, headers={"Idempotency-Key": key}))

        res1, res2 = await asyncio.gather(t1, t2)

        assert res1.status_code == 200
        assert res2.status_code == 200

        # One of them is the primary run (call_count=1), the other gets HIT-IDEMPOTENT
        hit_headers = [res1.headers.get("X-Cache"), res2.headers.get("X-Cache")]
        assert "HIT-IDEMPOTENT" in hit_headers
        assert slow_route_counter["count"] == 1
