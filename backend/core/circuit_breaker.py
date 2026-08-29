"""
Circuit Breaker Implementation.

Provides a lightweight async circuit breaker for external API calls
to prevent cascading failures (GAP 2.1).
"""
import time
import logging
import inspect
import asyncio
import concurrent.futures
from functools import wraps
from enum import Enum

logger = logging.getLogger(__name__)

class CircuitState(str, Enum):
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

    def call(self, func, *args, **kwargs):
        """Execute callable (sync or async) with circuit breaker state management."""
        func_name = getattr(func, "__name__", str(func))
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                logger.warning(f"CircuitBreaker({func_name}): HALF_OPEN - attempting recovery")
            else:
                raise CircuitBreakerOpenException(
                    f"CircuitBreaker is OPEN. Call to {func_name} blocked."
                )

        try:
            if inspect.iscoroutinefunction(func):
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = None

                if loop is not None and loop.is_running():
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        def run_in_thread():
                            new_loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(new_loop)
                            try:
                                return new_loop.run_until_complete(func(*args, **kwargs))
                            finally:
                                new_loop.close()
                        result = executor.submit(run_in_thread).result()
                else:
                    try:
                        loop = asyncio.get_event_loop()
                    except RuntimeError:
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                    result = loop.run_until_complete(func(*args, **kwargs))
            else:
                result = func(*args, **kwargs)
                if inspect.isawaitable(result):
                    try:
                        loop = asyncio.get_running_loop()
                    except RuntimeError:
                        loop = None

                    if loop is not None and loop.is_running():
                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            def run_in_thread():
                                new_loop = asyncio.new_event_loop()
                                asyncio.set_event_loop(new_loop)
                                try:
                                    return new_loop.run_until_complete(result)
                                finally:
                                    new_loop.close()
                            result = executor.submit(run_in_thread).result()
                    else:
                        try:
                            loop = asyncio.get_event_loop()
                        except RuntimeError:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                        result = loop.run_until_complete(result)

            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                logger.info(f"CircuitBreaker({func_name}): CLOSED - recovered successfully")
            return result
        except Exception:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.state == CircuitState.HALF_OPEN or self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.error(
                    f"CircuitBreaker({func_name}): OPEN - threshold reached ({self.failure_count} failures)"
                )
            raise

    def __call__(self, func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time >= self.recovery_timeout:
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
                if self.state == CircuitState.HALF_OPEN or self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                    logger.error(f"CircuitBreaker({func.__name__}): OPEN - threshold reached ({self.failure_count} failures)")
                raise
        return async_wrapper

def circuit_breaker(failure_threshold: int = 3, recovery_timeout: float = 30.0):
    """Decorator to apply circuit breaker pattern to async functions."""
    return CircuitBreaker(failure_threshold, recovery_timeout)
