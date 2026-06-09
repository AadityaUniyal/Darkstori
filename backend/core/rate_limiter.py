"""Rate limiting middleware."""

from collections import defaultdict
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, Optional, Tuple

from fastapi import HTTPException, Request, status

from backend.core.config import settings
from backend.core.logger import logger


class RateLimiter:
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
                _endpoint_limiters[key] = RateLimiter(requests_per_minute=limit)
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
