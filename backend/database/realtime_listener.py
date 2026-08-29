import asyncio
import json
import asyncpg
from backend.core.config import settings
from backend.core.logger import logger

async def start_realtime_listener(sio):
    """Listens for pg_notify events on 'darkstori_events' channel and forwards to Socket.IO."""
    logger.info("Starting real-time PostgreSQL database listener...")
    
    # Extract database URL
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    
    # Check if Neon PostgreSQL SSL is required
    ssl = "require" if "neon.tech" in db_url else False

    while True:
        conn = None
        try:
            logger.info("Connecting to PostgreSQL for notifications...")
            conn = await asyncpg.connect(db_url, ssl=ssl)
            
            async def handle_notification(connection, pid, channel, payload):
                try:
                    event_data = json.loads(payload)
                    logger.debug(f"Received real-time event: {event_data}")
                    await sio.emit("db_event", event_data)
                except Exception as e:
                    logger.error(f"Error handling notification payload: {e}")

            await conn.add_listener("darkstori_events", handle_notification)
            logger.info("Real-time PostgreSQL listener connected and listening to 'darkstori_events'")
            
            # Keep connection alive with periodic healthcheck pings
            while True:
                await asyncio.sleep(30)
                await conn.execute("SELECT 1;")
                
        except asyncio.CancelledError:
            logger.info("Real-time listener task cancelled")
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass
            break
        except Exception as e:
            logger.error(f"PostgreSQL listener error: {e}. Retrying in 5 seconds...")
            if conn:
                try:
                    await conn.close()
                except Exception:
                    pass
            await asyncio.sleep(5)


async def start_sqlite_polling_listener(sio, poll_interval=5):
    """Fallback polling-based listener for SQLite (development mode)."""
    logger.info("Starting SQLite polling-based listener (development fallback)...")
    from backend.database.connection import get_async_session
    from sqlalchemy import text
    import time
    
    last_check = time.time()
    
    while True:
        try:
            async with get_async_session() as session:
                # Check for recent orders (last poll_interval seconds)
                result = await session.execute(
                    text("SELECT COUNT(*) as cnt FROM orders_synthetic WHERE created_at > datetime('now', :interval)")
                    .bindparams(interval=f'-{poll_interval} seconds')
                )
                row = result.first()
                if row and row[0] > 0:
                    await sio.emit('db_event', {
                        'table': 'orders_synthetic',
                        'operation': 'INSERT',
                        'data': {'message': f'{row[0]} new order(s) detected'},
                        'type': 'success'
                    })
        except asyncio.CancelledError:
            logger.info("SQLite polling listener cancelled")
            break
        except Exception as e:
            logger.debug(f"SQLite polling check: {e}")
        
        await asyncio.sleep(poll_interval)
