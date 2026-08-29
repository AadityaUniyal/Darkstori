"""Rate limiting middleware."""

import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, Optional, Tuple

from fastapi import HTTPException, Request, status

from backend.core.config import settings
from backend.core.logger import logger

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class InMemoryRateLimiter:
    """Simple in-memory rate limiter."""

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = defaultdict(list)

    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup_old_requests(self):
        """Remove requests older than 1 minute."""
        cutoff = datetime.now() - timedelta(minutes=1)
        for client_id in list(self.requests.keys()):
            self.requests[client_id] = [
                req_time for req_time in self.requests[client_id] if req_time > cutoff
            ]
            if not self.requests[client_id]:
                del self.requests[client_id]

    async def check_rate_limit(self, request: Request) -> Tuple[bool, int]:
        """Check if request is within rate limit."""
        client_id = self._get_client_id(request)
        now = datetime.now()
        cutoff = now - timedelta(minutes=1)

        self._cleanup_old_requests()

        recent_requests = [
            req_time for req_time in self.requests[client_id] if req_time > cutoff
        ]

        if len(recent_requests) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for client: {client_id}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {self.requests_per_minute} requests per minute.",
                headers={"Retry-After": "60"},
            )

        self.requests[client_id].append(now)
        remaining = self.requests_per_minute - len(recent_requests) - 1
        return True, remaining


class RedisRateLimiter:
    """Sliding window rate limiter backed by Redis."""

    def __init__(self, requests_per_minute: int = 60, redis_url: str = "redis://localhost:6379/0"):
        self.requests_per_minute = requests_per_minute
        self.redis_url = redis_url
        self.client = None
        self._connected = False

    async def init_client(self):
        """Lazy initialize Redis client connection."""
        if self.client is None and REDIS_AVAILABLE:
            try:
                self.client = redis.from_url(self.redis_url, decode_responses=True)
                await self.client.ping()
                self._connected = True
                logger.info(f"Connected to Redis for rate limiting at {self.redis_url}")
            except Exception as e:
                logger.warning(
                    f"Failed to connect to Redis at {self.redis_url}: {e}. "
                    "Rate limiter falling back to in-memory mode."
                )
                self.client = None
                self._connected = False

    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def check_rate_limit(self, request: Request, key_prefix: str = "default") -> Tuple[bool, int]:
        """Check if request is within rate limit using Redis sliding window."""
        if not self._connected or self.client is None:
            await self.init_client()

        if not self._connected or self.client is None:
            raise RuntimeError("Redis client is not available")

        client_id = self._get_client_id(request)
        key = f"rate_limit:{client_id}:{key_prefix}"
        now = datetime.now().timestamp()
        cutoff = now - 60

        async with self.client.pipeline(transaction=True) as pipe:
            # Remove elements older than 1 minute
            pipe.zremrangebyscore(key, 0, cutoff)
            # Count elements in the last minute
            pipe.zcard(key)
            # Add current request with a unique member token
            member = f"{now}:{uuid.uuid4()}"
            pipe.zadd(key, {member: now})
            # Set key expiration
            pipe.expire(key, 60)

            results = await pipe.execute()

        recent_requests_count = results[1]

        if recent_requests_count >= self.requests_per_minute:
            logger.warning(f"Redis rate limit exceeded for client: {client_id}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {self.requests_per_minute} requests per minute.",
                headers={"Retry-After": "60"},
            )

        remaining = self.requests_per_minute - recent_requests_count - 1
        return True, remaining


class RateLimiter:
    """Unified rate limiter with Redis backend and InMemory fallback."""

    def __init__(self, requests_per_minute: int = 60, key_prefix: str = "default"):
        self.requests_per_minute = requests_per_minute
        self.key_prefix = key_prefix
        self.in_memory_limiter = InMemoryRateLimiter(requests_per_minute)
        self.redis_limiter = RedisRateLimiter(requests_per_minute, settings.REDIS_URL)

    async def check_rate_limit(self, request: Request) -> Tuple[bool, int]:
        """Check rate limit using Redis, falling back to in-memory on failure or missing dependency."""
        if REDIS_AVAILABLE:
            try:
                return await self.redis_limiter.check_rate_limit(request, self.key_prefix)
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Redis rate limiter check failed, falling back to in-memory: {e}")

        return await self.in_memory_limiter.check_rate_limit(request)


# Global rate limiter instance
rate_limiter = RateLimiter(requests_per_minute=settings.RATE_LIMIT_PER_MINUTE)


async def rate_limit_dependency(request: Request):
    """FastAPI dependency for rate limiting."""
    await rate_limiter.check_rate_limit(request)


# Per-endpoint rate limiters registry
_endpoint_limiters: Dict[str, RateLimiter] = {}


def rate_limit(calls_per_minute: Optional[int] = None):
    """Decorator for per-endpoint rate limiting.

    Args:
        calls_per_minute: Maximum calls per minute (uses global setting if None)
    """

    def decorator(func):
        key = f"{func.__module__}.{func.__name__}"
        limit = calls_per_minute or settings.RATE_LIMIT_PER_MINUTE

        @wraps(func)
        async def wrapper(*args, **kwargs):
            if key not in _endpoint_limiters:
                _endpoint_limiters[key] = RateLimiter(requests_per_minute=limit, key_prefix=key)
            # Try to find a Request in args/kwargs for client identification
            request = next(
                (a for a in args if isinstance(a, Request)),
                kwargs.get("request")
            )
            if request is not None:
                await _endpoint_limiters[key].check_rate_limit(request)
            return await func(*args, **kwargs)

        return wrapper

    return decorator
