"""
Idempotency Handler.

Provides a decorator for FastAPI endpoints to ensure safe retries (GAP 2.4).
"""
import json
import logging
from functools import wraps
from fastapi import Request
from fastapi.responses import JSONResponse
from backend.core.cache import cache

logger = logging.getLogger(__name__)

def idempotent(timeout: int = 3600):
    """
    Decorator to cache responses using an Idempotency-Key header.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request | None = kwargs.get("request")
            if not request:
                # Fallback if request is not in kwargs (it should be injected by FastAPI)
                return await func(*args, **kwargs)
                
            key = request.headers.get("Idempotency-Key")
            if not key:
                return await func(*args, **kwargs)
                
            cache_key = f"idempotency:{key}"
            
            # Check cache
            cached = await cache.get(cache_key)
            if cached:
                logger.info(f"Idempotency hit for key: {key}")
                data = json.loads(cached)
                return JSONResponse(content=data)
                
            # Execute original function
            response = await func(*args, **kwargs)
            
            # Cache the response
            try:
                # If it's a Pydantic model, convert to dict
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
