"""WhatsApp delivery service for darkstore alerts and briefings using Meta's Cloud API."""

import logging
import os
import httpx

logger = logging.getLogger(__name__)

WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_OWNER_NUMBER = os.getenv("WHATSAPP_OWNER_NUMBER", "919999999999")  # Default placeholder for owner


async def send_whatsapp_message(text: str, to_number: str = None) -> bool:
    """
    Sends a WhatsApp message to the store owner.
    Falls back to a simulated log print if API credentials are not set.
    """
    to_number = to_number or WHATSAPP_OWNER_NUMBER

    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        logger.info(f"\n[WhatsApp Mock API] ─── MESSAGE SENT ───\nTo: {to_number}\nContent: {text}\n─────────────────────────────────")
        return True

    url = f"https://graph.facebook.com/v17.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_number,
        "type": "text",
        "text": {
            "body": text
        }
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                logger.info(f"WhatsApp message successfully delivered to {to_number}")
                return True
            else:
                logger.error(f"WhatsApp API failed with status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Failed to deliver WhatsApp message: {e}")

    return False
