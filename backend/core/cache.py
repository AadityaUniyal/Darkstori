class NoOpCache:
   
    async def init(self):
        return self

    async def close(self):
        return self

    async def get(self, key: str):
        return None

    async def set(self, key: str, value, ttl: int | None = None):
        return None
        
cache = NoOpCache()
