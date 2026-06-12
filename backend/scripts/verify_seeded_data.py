import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
BACKEND_DIR = str(Path(__file__).parent.parent)
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.database.connection import get_async_session
from backend.database.models.models import DarkStore, FocusCity
from sqlalchemy import select, func

async def main():
    async with get_async_session() as db:
        stores_count = (await db.execute(select(func.count(DarkStore.id)))).scalar()
        print(f"Total Dark Stores in DB: {stores_count}")
        
        cities = (await db.execute(select(FocusCity.city_name, FocusCity.total_dark_stores))).all()
        print("\nFocus Cities Store Counts:")
        for city_name, total_dark_stores in cities:
            print(f"  {city_name}: {total_dark_stores} stores")

if __name__ == "__main__":
    asyncio.run(main())
