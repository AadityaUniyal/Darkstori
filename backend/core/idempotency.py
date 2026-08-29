"""
Idempotency Handler & Middleware.

Provides Redis-backed IdempotencyMiddleware for FastAPI mutation requests
and optional endpoint decorator for safe retries (GAP 2.4 / R2).
"""
import hashlib
import json
import logging
import asyncio
from functools import wraps
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from backend.core.cache import cache

logger = logging.getLogger(__name__)

MUTATION_METHODS = {"POST", "PUT", "DELETE", "PATCH"}
DEFAULT_IDEMPOTENCY_TTL = 3600  # 1 hour in seconds


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """
    ASGI HTTP Middleware to guarantee idempotent execution for mutation requests
    carrying an Idempotency-Key header.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        # 1. Skip non-mutation HTTP methods (GET, HEAD, OPTIONS)
        if request.method not in MUTATION_METHODS:
            return await call_next(request)

        # 2. Extract Idempotency-Key header (case-insensitive check)
        key = request.headers.get("Idempotency-Key") or request.headers.get("idempotency-key")
        if not key or not key.strip():
            return await call_next(request)

        # 3. Hash key with SHA-256 to handle special/unicode characters safely
        key_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
        cache_key = f"idempotency:{key_hash}"
        lock_key = f"idempotency_lock:{key_hash}"

        # 4. Check Redis cache for completed response
        try:
            cached_raw = await cache.get(cache_key)
            if cached_raw:
                logger.info(f"Idempotency cache HIT for hash: {key_hash[:8]}")
                cached_data = json.loads(cached_raw)
                headers = dict(cached_data.get("headers", {}))
                headers["X-Cache"] = "HIT-IDEMPOTENT"
                body = cached_data.get("body", "")
                if isinstance(body, str):
                    body = body.encode("utf-8")
                return Response(
                    content=body,
                    status_code=cached_data.get("status_code", 200),
                    headers=headers,
                    media_type=cached_data.get("media_type", "application/json"),
                )
        except Exception as cache_err:
            logger.warning(f"Idempotency cache lookup error (continuing request): {cache_err}")

        # 5. Handle In-Flight Request Locking (Concurrency Protection)
        lock_acquired = False
        try:
            lock_val = await cache.get(lock_key)
            if lock_val:
                # Concurrent request in progress - wait for result
                for _ in range(30):
                    await asyncio.sleep(0.1)
                    cached_raw = await cache.get(cache_key)
                    if cached_raw:
                        cached_data = json.loads(cached_raw)
                        headers = dict(cached_data.get("headers", {}))
                        headers["X-Cache"] = "HIT-IDEMPOTENT"
                        body = cached_data.get("body", "")
                        if isinstance(body, str):
                            body = body.encode("utf-8")
                        return Response(
                            content=body,
                            status_code=cached_data.get("status_code", 200),
                            headers=headers,
                            media_type=cached_data.get("media_type", "application/json"),
                        )
            else:
                await cache.set(lock_key, "LOCKED", ttl=30)
                lock_acquired = True
        except Exception as lock_err:
            logger.warning(f"Idempotency lock error (continuing request): {lock_err}")

        # 6. Execute actual route handler
        try:
            response = await call_next(request)

            # Read response body for caching
            resp_body_chunks = []
            async for chunk in response.body_iterator:
                resp_body_chunks.append(chunk)
            body_bytes = b"".join(resp_body_chunks)

            # 7. Cache successful (2xx) responses in Redis (TTL=3600)
            if 200 <= response.status_code < 300:
                try:
                    headers_to_cache = {
                        k: v for k, v in response.headers.items()
                        if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")
                    }
                    cache_payload = {
                        "status_code": response.status_code,
                        "media_type": response.media_type or "application/json",
                        "headers": headers_to_cache,
                        "body": body_bytes.decode("utf-8", errors="replace"),
                    }
                    await cache.set(cache_key, json.dumps(cache_payload), ttl=DEFAULT_IDEMPOTENCY_TTL)
                    logger.info(f"Cached idempotent response for hash: {key_hash[:8]} (status: {response.status_code})")
                except Exception as save_err:
                    logger.warning(f"Failed to save idempotent response to Redis: {save_err}")

            return Response(
                content=body_bytes,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )
        finally:
            if lock_acquired:
                try:
                    await cache.delete(lock_key)
                except Exception:
                    pass


def idempotent(timeout: int = 3600):
    """
    Decorator to cache responses using an Idempotency-Key header.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request | None = None
            for value in kwargs.values():
                if isinstance(value, Request):
                    request = value
                    break
            if request is None:
                for value in args:
                    if isinstance(value, Request):
                        request = value
                        break
            if not request:
                return await func(*args, **kwargs)
                
            key = request.headers.get("Idempotency-Key") or request.headers.get("idempotency-key")
            if not key:
                return await func(*args, **kwargs)
                
            key_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
            cache_key = f"idempotency:{key_hash}"
            
            try:
                cached = await cache.get(cache_key)
                if cached:
                    logger.info(f"Idempotency hit for key: {key}")
                    data = json.loads(cached)
                    return JSONResponse(content=data, headers={"X-Cache": "HIT-IDEMPOTENT"})
            except Exception:
                pass
                
            response = await func(*args, **kwargs)
            
            try:
                if hasattr(response, "model_dump"):
                    response_data = response.model_dump()
                elif hasattr(response, "dict"):
                    response_data = response.dict()
                else:
                    response_data = response
                    
                await cache.set(cache_key, json.dumps(response_data), ttl=timeout)
            except Exception as e:
                logger.error(f"Failed to cache idempotency response: {e}")
                
            return response
        return wrapper
    return decorator
