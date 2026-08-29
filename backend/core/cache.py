import asyncio
import logging
from typing import Any, Dict, Optional
import redis.asyncio as redis
from backend.core.config import settings

logger = logging.getLogger(__name__)

class FeatureCache:
    """Redis-backed feature caching layer with local dictionary fallback."""
    
    def __init__(self):
        self.redis_client = None
        self._local_cache: Dict[str, Dict[str, Any]] = {}
        self._is_connected = False
        
    async def init(self):
        """Initialize the Redis connection."""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL, 
                encoding="utf-8", 
                decode_responses=True
            )
            # Ping to verify connection
            await self.redis_client.ping()
            self._is_connected = True
            logger.info(f"Connected to Redis at {settings.REDIS_URL}")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis. Falling back to local dict cache. Error: {e}")
            self._is_connected = False
            self.redis_client = None
            
        return self

    async def close(self):
        """Close the Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            
    async def get(self, key: str) -> Optional[str]:
        """Get value from cache."""
        if self._is_connected and self.redis_client:
            try:
                return await self.redis_client.get(key)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
                # Fall through to local cache if Redis fails
                
        # Local fallback
        import time
        if key in self._local_cache:
            entry = self._local_cache[key]
            if entry["expire_at"] is None or entry["expire_at"] > time.time():
                return entry["value"]
            else:
                del self._local_cache[key]
        return None

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        """Set value in cache with optional TTL in seconds."""
        if self._is_connected and self.redis_client:
            try:
                await self.redis_client.set(key, value, ex=ttl)
                return
            except Exception as e:
                logger.error(f"Redis set error: {e}")
                # Fall through to local cache if Redis fails
                
        # Local fallback
        import time
        expire_at = time.time() + ttl if ttl else None
        self._local_cache[key] = {
            "value": value,
            "expire_at": expire_at
        }

    async def delete(self, key: str) -> None:
        """Delete key from cache."""
        if self._is_connected and self.redis_client:
            try:
                await self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        self._local_cache.pop(key, None)

# Global cache instance
cache = FeatureCache()


def cached_json(key_prefix: str, ttl: int = 30):
    """Decorator to cache async function results as JSON with given TTL in seconds."""
    import json
    from functools import wraps

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key from prefix and stringified kwargs
            sorted_kwargs = sorted([(k, str(v)) for k, v in kwargs.items() if k not in ("db", "payload", "request")])
            args_repr = "_".join(str(a) for a in args if not hasattr(a, "execute"))
            cache_key = f"api_cache:{key_prefix}:{args_repr}:{sorted_kwargs}"
            
            try:
                cached_data = await cache.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception as e:
                logger.debug(f"Cache get error for {cache_key}: {e}")

            result = await func(*args, **kwargs)

            try:
                if result is not None:
                    await cache.set(cache_key, json.dumps(result, default=str), ttl=ttl)
            except Exception as e:
                logger.debug(f"Cache set error for {cache_key}: {e}")

            return result
        return wrapper
    return decorator
