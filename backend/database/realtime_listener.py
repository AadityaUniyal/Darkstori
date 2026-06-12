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
            break
        except Exception as e:
            logger.error(f"PostgreSQL listener error: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)
