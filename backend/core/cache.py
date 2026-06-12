class NoOpCache:
    """A minimal no‑op cache that satisfies the existing import contract.

    The original code expected a ``cache`` object with ``init`` and ``close``
    coroutine methods.  This implementation simply provides those methods and does
    nothing else, allowing the application to start without the Redis package.
    """

    async def init(self):
        """Placeholder for cache initialization – does nothing."""
        return self

    async def close(self):
        """Placeholder for cache teardown – does nothing."""
        return self

    async def get(self, key: str):
        return None

    async def set(self, key: str, value, ttl: int | None = None):
        return None

# Export a singleton instance with the same name used throughout the codebase.
cache = NoOpCache()
