import json
from typing import Optional, Any
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.models.models import AuditLog
from backend.core.logger import logger

async def log_audit_action(
    db: AsyncSession,
    action: str,
    request: Optional[Request] = None,
    user_id: Optional[int] = None,
    target_table: Optional[str] = None,
    target_id: Optional[int] = None,
    previous_state: Optional[Any] = None,
    new_state: Optional[Any] = None
) -> None:
    """
    Log an action to the database audit_logs table and standard logger.
    """
    ip_address = None
    if request and request.client:
        ip_address = request.client.host

    try:
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            target_table=target_table,
            target_id=target_id,
            previous_state=previous_state,
            new_state=new_state,
            ip_address=ip_address
        )
        db.add(audit_entry)
        await db.commit()
        
        log_data = {
            "action": action,
            "user_id": user_id,
            "ip": ip_address,
            "target": f"{target_table}:{target_id}" if target_table else None
        }
        logger.info(f"AUDIT LOG: {json.dumps(log_data)}")
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")
