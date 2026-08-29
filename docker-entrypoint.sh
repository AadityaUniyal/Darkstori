#!/bin/bash
set -e

echo "Running database initialization..."
cd /app
python -c "
import asyncio
from backend.database.connection import init_db
asyncio.run(init_db())
print('Database initialized.')
"

echo "Stamping database schema with Alembic..."
alembic upgrade head || echo 'Alembic upgrade failed or no migrations pending — continuing...'

if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "Seeding demo data..."
  python -c "
import asyncio
from backend.database.connection import AsyncSessionLocal
from backend.api.routes.seed_data import seed_database
async def run():
    async with AsyncSessionLocal() as db:
        await seed_database(db)
asyncio.run(run())
"
fi

echo "Starting Darkstori API..."
exec uvicorn backend.app:app --host 0.0.0.0 --port 8000 --workers 2
