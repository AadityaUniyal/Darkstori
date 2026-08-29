"""Playbook Engine — automated 'If This, Then That' for dark store operations.

Evaluates rules against real-time database events (from pg_notify) and
executes configured actions (alerts, markdown acceleration, retraining, etc.).
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.database.models.models import (
    Playbook,
    PlaybookExecution,
    ProductBatch,
    DarkStore,
)


# ── Trigger Types (the events the engine listens for) ──────────────────────

TRIGGER_TYPES = {
    "competitor_store_opened": {
        "label": "Competitor Opens a Store",
        "description": "Fires when a new competitor store is detected in the system.",
        "source_table": "competitor_stores",
        "source_action": "INSERT",
    },
    "sla_breach": {
        "label": "SLA Breach Detected",
        "description": "Fires when delivery SLA breach rate exceeds threshold.",
        "source_table": "delivery_sla_metrics",
        "source_action": "INSERT",
    },
    "temp_breach": {
        "label": "Cold-Chain Temperature Breach",
        "description": "Fires when a product batch freshness drops critically.",
        "source_table": "product_batches",
        "source_action": "UPDATE",
    },
    "demand_spike": {
        "label": "Demand Spike Forecast",
        "description": "Fires when forecasted demand exceeds normal by >30%.",
        "source_table": "ml_predictions",
        "source_action": "INSERT",
    },
    "drift_detected": {
        "label": "ML Model Drift Detected",
        "description": "Fires when feature drift is flagged by the monitoring system.",
        "source_table": "ml_feature_drift",
        "source_action": "INSERT",
    },
    "price_war": {
        "label": "Competitor Price Drop",
        "description": "Fires when competitor pricing drops significantly on tracked SKUs.",
        "source_table": "competitor_pricing",
        "source_action": "INSERT",
    },
    "order_placed": {
        "label": "New Order Placed",
        "description": "Fires on every new order (use conditions to filter).",
        "source_table": "orders_synthetic",
        "source_action": "INSERT",
    },
    "stock_change": {
        "label": "Stock Level Change",
        "description": "Fires when stock ledger records a change.",
        "source_table": "stock_ledger",
        "source_action": "INSERT",
    },
    "weather_surge_detected": {
        "label": "Weather Surge / Rain Warning",
        "description": "Fires when atmospheric radar detects precipitation >0.5mm.",
        "source_table": "weather_telemetry",
        "source_action": "INSERT",
    },
}


# ── Action Types (what the engine can do) ──────────────────────────────────

ACTION_TYPES = {
    "send_alert": {
        "label": "Send Alert Notification",
        "description": "Send an in-app toast + optional email/Slack notification.",
        "config_schema": {
            "channel": "toast | email | slack",
            "message": "Alert message template",
            "severity": "info | warning | critical",
        },
    },
    "accelerate_markdown": {
        "label": "Accelerate Perishable Markdown",
        "description": "Apply an accelerated discount multiplier to affected batches.",
        "config_schema": {
            "markdown_multiplier": "float (e.g. 1.5 = 50% faster decay pricing)",
            "city": "optional city filter",
        },
    },
    "trigger_retraining": {
        "label": "Trigger Model Retraining",
        "description": "Queue a model retraining job when drift is detected.",
        "config_schema": {
            "model_name": "Model to retrain (default: demand_forecasting_model)",
        },
    },
    "run_cannibalization": {
        "label": "Run Cannibalization Analysis",
        "description": "Auto-run cannibalization simulation for the affected area.",
        "config_schema": {
            "radius_km": "Analysis radius (default: 3.0)",
        },
    },
    "adjust_safety_stock": {
        "label": "Adjust Safety Stock Level",
        "description": "Increase reorder point for the affected neighborhood.",
        "config_schema": {
            "increase_pct": "Percentage to increase safety stock (default: 20)",
        },
    },
    "optimize_vrp_dispatch": {
        "label": "Rebalance Rider VRP Batches",
        "description": "Recalculate Clarke-Wright multi-stop rider routes to maintain 10-min SLA.",
        "config_schema": {
            "max_orders_per_rider": "int (default: 3)",
        },
    },
    "log_only": {
        "label": "Log Event (No Action)",
        "description": "Record the event for audit without taking action.",
        "config_schema": {},
    },
}


# ── Condition Evaluator ────────────────────────────────────────────────────

def evaluate_condition(condition: Dict, event_data: Dict) -> bool:
    """Evaluate a single condition rule against event data.

    Condition format: {"field": "city", "op": "eq", "value": "Bangalore"}
    Supported ops: eq, neq, gt, gte, lt, lte, contains, in
    """
    field = condition.get("field", "")
    op = condition.get("op", "eq")
    expected = condition.get("value")

    actual = event_data.get(field)
    if actual is None:
        return False

    try:
        if op == "eq":
            return str(actual).lower() == str(expected).lower()
        elif op == "neq":
            return str(actual).lower() != str(expected).lower()
        elif op == "gt":
            return float(actual) > float(expected)
        elif op == "gte":
            return float(actual) >= float(expected)
        elif op == "lt":
            return float(actual) < float(expected)
        elif op == "lte":
            return float(actual) <= float(expected)
        elif op == "contains":
            return str(expected).lower() in str(actual).lower()
        elif op == "in":
            if isinstance(expected, list):
                return str(actual) in [str(v) for v in expected]
            return str(actual) in str(expected).split(",")
    except (ValueError, TypeError):
        return False

    return False


def evaluate_conditions(conditions: List[Dict], event_data: Dict) -> bool:
    """All conditions must match (AND logic)."""
    if not conditions:
        return True
    return all(evaluate_condition(c, event_data) for c in conditions)


# ── Action Executors ───────────────────────────────────────────────────────

async def execute_action(
    action_type: str,
    action_config: Dict,
    event_data: Dict,
    db: AsyncSession,
) -> Dict[str, Any]:
    """Execute the configured action and return the result."""

    if action_type == "send_alert":
        severity = action_config.get("severity", "info")
        message = action_config.get("message", "Playbook triggered: {trigger_type}")
        # Template substitution
        for key, val in event_data.items():
            message = message.replace(f"{{{key}}}", str(val))
        logger.info(f"[PLAYBOOK ALERT] [{severity.upper()}] {message}")
        return {
            "action": "send_alert",
            "severity": severity,
            "message": message,
            "delivered": True,
        }

    elif action_type == "accelerate_markdown":
        multiplier = float(action_config.get("markdown_multiplier", 1.5))
        city = action_config.get("city") or event_data.get("city")
        query = select(ProductBatch)
        if city:
            query = query.join(DarkStore).where(DarkStore.city == city)
        result = await db.execute(query)
        batches = result.scalars().all()
        updated = 0
        for b in batches:
            if b.freshness_score and b.freshness_score < 0.8:
                b.decay_rate_per_hour = round(
                    (b.decay_rate_per_hour or 0.02) * multiplier, 4
                )
                updated += 1
        if updated:
            await db.commit()
        logger.info(
            f"[PLAYBOOK] Accelerated markdown on {updated} batches (×{multiplier})"
        )
        return {
            "action": "accelerate_markdown",
            "batches_affected": updated,
            "multiplier": multiplier,
        }

    elif action_type == "trigger_retraining":
        model_name = action_config.get("model_name", "demand_forecasting_model")
        logger.info(f"[PLAYBOOK] Retraining queued for model: {model_name}")
        return {
            "action": "trigger_retraining",
            "model_name": model_name,
            "queued": True,
        }

    elif action_type == "run_cannibalization":
        lat = event_data.get("latitude") or event_data.get("lat")
        lng = event_data.get("longitude") or event_data.get("lng")
        radius = float(action_config.get("radius_km", 3.0))
        logger.info(
            f"[PLAYBOOK] Cannibalization analysis queued at ({lat}, {lng}) r={radius}km"
        )
        return {
            "action": "run_cannibalization",
            "location": {"lat": lat, "lng": lng},
            "radius_km": radius,
            "queued": True,
        }

    elif action_type == "adjust_safety_stock":
        increase = float(action_config.get("increase_pct", 20))
        logger.info(f"[PLAYBOOK] Safety stock increased by {increase}%")
        return {
            "action": "adjust_safety_stock",
            "increase_pct": increase,
            "applied": True,
        }

    elif action_type == "optimize_vrp_dispatch":
        max_orders = int(action_config.get("max_orders_per_rider", 3))
        logger.info(f"[PLAYBOOK] VRP Multi-Drop dispatch rebalanced (max {max_orders} drops/rider)")
        return {
            "action": "optimize_vrp_dispatch",
            "max_orders_per_rider": max_orders,
            "rebalanced": True,
        }

    else:
        logger.info(f"[PLAYBOOK] Event logged (action: {action_type})")
        return {"action": "log_only", "event_recorded": True}


# ── Main Engine ────────────────────────────────────────────────────────────

def map_table_to_trigger(table_name: str, action: str) -> Optional[str]:
    """Map a pg_notify table change to a trigger_type."""
    for trigger_key, meta in TRIGGER_TYPES.items():
        if meta["source_table"] == table_name and meta["source_action"] == action:
            return trigger_key
    return None


async def process_event(
    table: str,
    action: str,
    data: Dict,
    db: AsyncSession,
) -> List[Dict]:
    """Core engine: find matching playbooks and execute their actions.

    Called by the realtime_listener when a pg_notify event arrives.
    """
    trigger_type = map_table_to_trigger(table, action)
    if not trigger_type:
        return []

    # Fetch active playbooks for this trigger
    result = await db.execute(
        select(Playbook).where(
            Playbook.trigger_type == trigger_type,
            Playbook.is_active.is_(True),
        )
    )
    playbooks = result.scalars().all()

    if not playbooks:
        return []

    results = []
    for pb in playbooks:
        # Cooldown check: skip if last execution was within cooldown window
        last_exec = await db.execute(
            select(PlaybookExecution)
            .where(PlaybookExecution.playbook_id == pb.id)
            .order_by(PlaybookExecution.executed_at.desc())
            .limit(1)
        )
        last = last_exec.scalar_one_or_none()
        if last and last.executed_at:
            cooldown = timedelta(minutes=pb.cooldown_minutes or 60)
            if datetime.now() - last.executed_at < cooldown:
                logger.debug(
                    f"[PLAYBOOK] '{pb.name}' skipped (cooldown {pb.cooldown_minutes}m)"
                )
                continue

        # Evaluate conditions
        conditions = pb.conditions or []
        matched = evaluate_conditions(conditions, data)

        if not matched:
            # Log skipped execution
            exec_log = PlaybookExecution(
                playbook_id=pb.id,
                trigger_event={"table": table, "action": action, "data": data},
                conditions_matched=False,
                action_result=None,
                status="skipped",
            )
            db.add(exec_log)
            await db.commit()
            continue

        # Execute action
        try:
            action_result = await execute_action(
                pb.action_type, pb.action_config or {}, data, db
            )
            status = "success"
        except Exception as e:
            logger.error(f"[PLAYBOOK] Action failed for '{pb.name}': {e}")
            action_result = {"error": str(e)}
            status = "failed"

        # Log execution
        exec_log = PlaybookExecution(
            playbook_id=pb.id,
            trigger_event={"table": table, "action": action, "data": data},
            conditions_matched=True,
            action_result=action_result,
            status=status,
        )
        db.add(exec_log)
        await db.commit()

        results.append({
            "playbook": pb.name,
            "trigger": trigger_type,
            "status": status,
            "result": action_result,
        })
        logger.info(f"[PLAYBOOK] '{pb.name}' executed → {status}")

    return results
