"""
Circuit Breaker Implementation.

Provides a lightweight async circuit breaker for external API calls
to prevent cascading failures (GAP 2.1).
"""
import time
import logging
from functools import wraps
from enum import Enum

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreakerOpenException(Exception):
    pass

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_timeout: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        
    def __call__(self, func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    logger.warning(f"CircuitBreaker({func.__name__}): HALF_OPEN - attempting recovery")
                else:
                    raise CircuitBreakerOpenException(f"CircuitBreaker is OPEN. Call to {func.__name__} blocked.")
            
            try:
                result = await func(*args, **kwargs)
                if self.state == CircuitState.HALF_OPEN:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    logger.info(f"CircuitBreaker({func.__name__}): CLOSED - recovered successfully")
                return result
            except Exception:
                self.failure_count += 1
                self.last_failure_time = time.time()
                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                    logger.error(f"CircuitBreaker({func.__name__}): OPEN - threshold reached ({self.failure_count} failures)")
                raise
        return async_wrapper

def circuit_breaker(failure_threshold: int = 3, recovery_timeout: float = 30.0):
    """Decorator to apply circuit breaker pattern to async functions."""
    return CircuitBreaker(failure_threshold, recovery_timeout)
