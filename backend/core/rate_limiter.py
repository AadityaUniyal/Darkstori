"""Rate limiting middleware."""
from fastapi import Request, HTTPException, status
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import asyncio

from backend.core.config import settings
from backend.core.logger import logger


class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list] = defaultdict(list)
        self.cleanup_task = None
    
    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request."""
        # Try to get from X-Forwarded-For header first
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # Fall back to client host
        return request.client.host if request.client else "unknown"
    
    def _cleanup_old_requests(self):
        """Remove requests older than 1 minute."""
        cutoff = datetime.now() - timedelta(minutes=1)
        
        for client_id in list(self.requests.keys()):
            self.requests[client_id] = [
                req_time for req_time in self.requests[client_id]
                if req_time > cutoff
            ]
            
            # Remove empty entries
            if not self.requests[client_id]:
                del self.requests[client_id]
    
    async def check_rate_limit(self, request: Request) -> Tuple[bool, int]:
        """
        Check if request is within rate limit.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Tuple of (is_allowed, remaining_requests)
            
        Raises:
            HTTPException: If rate limit exceeded
        """
        client_id = self._get_client_id(request)
        now = datetime.now()
        cutoff = now - timedelta(minutes=1)
        
        # Clean up old requests
        self._cleanup_old_requests()
        
        # Get recent requests for this client
        recent_requests = [
            req_time for req_time in self.requests[client_id]
            if req_time > cutoff
        ]
        
        # Check limit
        if len(recent_requests) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for client: {client_id}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {self.requests_per_minute} requests per minute.",
                headers={"Retry-After": "60"}
            )
        
        # Add current request
        self.requests[client_id].append(now)
        
        remaining = self.requests_per_minute - len(recent_requests) - 1
        return True, remaining


# Global rate limiter instance
rate_limiter = RateLimiter(requests_per_minute=settings.RATE_LIMIT_PER_MINUTE)


async def rate_limit_dependency(request: Request):
    """FastAPI dependency for rate limiting."""
    await rate_limiter.check_rate_limit(request)
