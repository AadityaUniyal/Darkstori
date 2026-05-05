"""Rate limiting to prevent API abuse and DDoS attacks."""
from collections import defaultdict
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, Tuple
from src.utils.helpers import logger


class RateLimiter:
    """Token bucket rate limiter for API endpoints."""
    
    def __init__(self):
        # Store: {identifier: (tokens, last_update)}
        self.buckets: Dict[str, Tuple[int, datetime]] = defaultdict(
            lambda: (0, datetime.now())
        )
        self.blocked_ips = set()
    
    def is_allowed(self, identifier: str, max_requests: int = 100, 
                   window_seconds: int = 3600) -> bool:
        """
        Check if request is allowed based on rate limit.
        
        Args:
            identifier: User ID, IP address, or API key
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            
        Returns:
            True if request is allowed, False otherwise
        """
        # Check if blocked
        if identifier in self.blocked_ips:
            logger.warning(f"Blocked identifier attempted access: {identifier}")
            return False
        
        now = datetime.now()
        tokens, last_update = self.buckets[identifier]
        
        # Calculate time elapsed
        elapsed = (now - last_update).total_seconds()
        
        # Refill tokens based on elapsed time
        refill_rate = max_requests / window_seconds
        tokens = min(max_requests, tokens + elapsed * refill_rate)
        
        # Check if request can be made
        if tokens >= 1:
            self.buckets[identifier] = (tokens - 1, now)
            return True
        else:
            logger.warning(f"Rate limit exceeded for: {identifier}")
            return False
    
    def block_identifier(self, identifier: str):
        """Permanently block an identifier."""
        self.blocked_ips.add(identifier)
        logger.warning(f"Blocked identifier: {identifier}")
    
    def unblock_identifier(self, identifier: str):
        """Unblock an identifier."""
        self.blocked_ips.discard(identifier)
        logger.info(f"Unblocked identifier: {identifier}")
    
    def reset_limit(self, identifier: str):
        """Reset rate limit for an identifier."""
        if identifier in self.buckets:
            del self.buckets[identifier]


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_requests: int = 100, window_seconds: int = 3600):
    """
    Decorator to apply rate limiting to functions.
    
    Args:
        max_requests: Maximum requests allowed
        window_seconds: Time window in seconds
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract identifier (IP, user_id, etc.)
            identifier = kwargs.get('user_id') or kwargs.get('ip_address') or 'anonymous'
            
            if not rate_limiter.is_allowed(identifier, max_requests, window_seconds):
                raise PermissionError(
                    f"Rate limit exceeded. Max {max_requests} requests per "
                    f"{window_seconds} seconds."
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator
