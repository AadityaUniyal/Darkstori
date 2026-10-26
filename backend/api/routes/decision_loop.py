"""Evidence-backed operational recommendations and operator action history."""

from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.routes.resilience import calculate_sigmoid_discount
from backend.core.security import require_roles, verify_token
from backend.database.connection import get_db
from backend.database.models.models import AuditLog, DarkStore, ProductBatch, StockLedger, User
from backend.services.catalog_webhook import dispatch_catalog_price_update
from backend.ml.evaluate_markdown_policy import evaluate_batch_set, generate_benchmark_historical_cohort

router = APIRouter()
ACTION_NAME = "DECISION_LOOP_FEEDBACK"
APPLY_ACTION_NAME = "DECISION_LOOP_APPLY"
OUTCOME_ACTION_NAME = "DECISION_LOOP_OUTCOME"
MAX_ACTION_WINDOW_HOURS = 24


class FeedbackRequest(BaseModel):
    outcome: Literal["dismissed", "deferred"]
    reason: str | None = Field(default=None, max_length=500)


class ApplyRecommendationRequest(BaseModel):
    physical_count: int | None = Field(default=None, ge=0)
    shrinkage_reason: str | None = Field(default=None, max_length=255)


class OutcomeRequest(BaseModel):
    sold_units: int = Field(ge=0)
    wasted_units: int = Field(ge=0)
    remaining_units: int = Field(ge=0)
    realized_avg_price: float = Field(ge=0)


def _recommendation_id(batch: ProductBatch) -> str:
    expiry = int((batch.expiry_time - datetime(1970, 1, 1)).total_seconds()) if batch.expiry_time else 0
    return f"batch-{batch.id}-{expiry}"


def _scope_to_organization(query, payload: dict):
    """Keep unassigned demo rows isolated from organization-owned inventory."""
    organization_id = payload.get("org_id") or payload.get("organization_id")
    if str(organization_id or "").isdigit() and int(organization_id) > 0:
        return query.where(DarkStore.organization_id == int(organization_id))
    return query.where(DarkStore.organization_id.is_(None))


def _recommendation(batch: ProductBatch, store: DarkStore, now: datetime) -> dict:
    hours_left = (batch.expiry_time - now).total_seconds() / 3600
    freshness_is_recorded = batch.freshness_score is not None
    freshness = min(1.0, max(0.0, float(batch.freshness_score))) if freshness_is_recorded else None
    target_discount = calculate_sigmoid_discount(freshness) if freshness is not None else None
    current_discount = min(1.0, max(0.0, float(batch.discount_rate or 0.0)))
    suggested_price = round(float(batch.base_price) * (1.0 - target_discount), 2) if target_discount is not None else None
    current_price = round(float(batch.current_price), 2)
    hours_label = max(0, round(hours_left, 1))

    if hours_left <= 6:
        priority = "critical"
    elif hours_left <= 12:
        priority = "high"
    else:
        priority = "watch"

    can_apply = hours_left > 0 and suggested_price is not None and suggested_price < current_price - 0.009
    return {
        "id": _recommendation_id(batch),
        "type": "short_dated_inventory",
        "priority": priority,
        "title": f"Review {batch.product_name} markdown",
        "store_id": store.id,
        "store_name": store.store_name or store.name or f"Store {store.id}",
        "city": store.city,
        "batch_id": batch.id,
        "product_name": batch.product_name,
        "category": batch.category,
        "hours_to_expiry": hours_label,
        "quantity": int(batch.quantity or 0),
        "freshness_score": round(freshness, 3) if freshness is not None else None,
        "requires_freshness_measurement": not freshness_is_recorded,
        "current_price": current_price,
        "base_price": round(float(batch.base_price), 2),
        "current_discount_pct": round(current_discount * 100, 1),
        "suggested_discount_pct": round(target_discount * 100, 1) if target_discount is not None else None,
        "suggested_price": suggested_price,
        "inventory_value_inr": round(int(batch.quantity or 0) * current_price, 2),
        "can_apply": can_apply,
        "method": "Transparent sigmoid freshness rule; operator approval required",
        "evidence_source": "product_batches",
        "evidence_timestamp": now.isoformat(),
        "disclaimer": "Rule-based review from recorded batch freshness and expiry; no sales or waste outcome is inferred.",
    }


async def _user_id_if_present(db: AsyncSession, payload: dict) -> int | None:
    raw_user_id = payload.get("user_id")
    if not str(raw_user_id or "").isdigit():
        return None
    user_id = int(raw_user_id)
    exists = await db.scalar(select(User.id).where(User.id == user_id))
    return user_id if exists is not None else None


@router.get("", include_in_schema=False)
@router.get("/")
async def get_decision_queue(
    city: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """List near-expiry batches with transparent, non-autonomous markdown guidance."""
    now = datetime.now()
    applied_rows = await db.execute(
        select(AuditLog.target_id, AuditLog.new_state)
        .where(
            AuditLog.action == APPLY_ACTION_NAME,
            AuditLog.target_table == "product_batches",
            AuditLog.created_at >= now - timedelta(days=30),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(2000)
    )
    outcome_rows = await db.execute(
        select(AuditLog.target_id, AuditLog.new_state)
        .where(
            AuditLog.action == OUTCOME_ACTION_NAME,
            AuditLog.target_table == "product_batches",
            AuditLog.created_at >= now - timedelta(days=30),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(2000)
    )
    completed_outcome_keys = {
        state.get("recommendation_id")
        for _, state in outcome_rows.all()
        if isinstance(state, dict) and state.get("recommendation_id")
    }

    pending_outcome_batch_ids = {
        target_id
        for target_id, state in applied_rows.all()
        if isinstance(state, dict)
        and state.get("city") == city
        and state.get("recommendation_id") not in completed_outcome_keys
    }
    query = (
        select(ProductBatch, DarkStore)
        .join(DarkStore, ProductBatch.store_id == DarkStore.id)
        .where(
            DarkStore.city == city,
            or_(
                and_(
                    ProductBatch.quantity > 0,
                    ProductBatch.expiry_time <= now + timedelta(hours=MAX_ACTION_WINDOW_HOURS),
                ),
                ProductBatch.id.in_(pending_outcome_batch_ids) if pending_outcome_batch_ids else False,
            ),
        )
    )
    query = _scope_to_organization(query, payload)
    rows = await db.execute(query)

    batches = []
    for batch, store in rows.all():
        if not batch.expiry_time:
            continue
        hours_left = (batch.expiry_time - now).total_seconds() / 3600
        batches.append((batch, store, _recommendation(batch, store, now)))

    batch_ids = [batch.id for batch, _, _ in batches]
    history_by_batch = {}
    if batch_ids:
        history_rows = await db.execute(
            select(AuditLog.target_id, AuditLog.action, AuditLog.new_state)
            .where(
                AuditLog.target_table == "product_batches",
                AuditLog.target_id.in_(batch_ids),
                AuditLog.action.in_([ACTION_NAME, APPLY_ACTION_NAME, OUTCOME_ACTION_NAME]),
            )
            .order_by(AuditLog.created_at.desc())
            .limit(2000)
        )
        for target_id, action, state in history_rows.all():
            if isinstance(state, dict):
                history_by_batch.setdefault(target_id, {}).setdefault(action, []).append(state)

    active = []
    for batch, _, recommendation in batches:
        history = history_by_batch.get(batch.id, {})
        recommendation_id = recommendation["id"]
        applied_state = next(
            (state for state in history.get(APPLY_ACTION_NAME, []) if state.get("recommendation_id") == recommendation_id),
            None,
        )
        outcome_state = next(
            (state for state in history.get(OUTCOME_ACTION_NAME, []) if state.get("recommendation_id") == recommendation_id),
            None,
        )
        feedback = next(
            (state for state in history.get(ACTION_NAME, []) if state.get("recommendation_id") == recommendation_id),
            None,
        )
        if feedback and feedback.get("outcome") == "dismissed":
            continue
        applied_quantity = (
            applied_state.get("applied_quantity")
            if applied_state
            else None
        )
        if applied_state and applied_quantity is None:
            applied_quantity = applied_state.get("quantity")
        recommendation["is_applied"] = bool(applied_state)
        recommendation["applied_quantity"] = applied_quantity
        recommendation["needs_outcome"] = bool(applied_state and not outcome_state)
        recommendation["outcome_recorded"] = bool(outcome_state)
        recommendation["feedback"] = feedback.get("outcome") if feedback else None
        if recommendation["can_apply"] or recommendation["needs_outcome"] or recommendation["requires_freshness_measurement"]:
            active.append(recommendation)

    active.sort(key=lambda item: (item["hours_to_expiry"], -item["inventory_value_inr"]))
    return {
        "city": city,
        "generated_at": now.isoformat(),
        "data_mode": "live_database",
        "method": "Rules + sigmoid markdown; operator approval required",
        "recommendations": active[:50],
        "total_near_expiry_batches": len(active),
    }


@router.get("/impact")
async def get_recorded_markdown_impact(
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Summarize only completed, operator-reported batch dispositions."""
    since = datetime.now() - timedelta(days=days)
    rows = await db.execute(
        select(AuditLog.new_state)
        .where(
            AuditLog.action == OUTCOME_ACTION_NAME,
            AuditLog.target_table == "product_batches",
            AuditLog.created_at >= since,
        )
        .order_by(AuditLog.created_at.desc())
        .limit(5000)
    )
    outcomes = [state for (state,) in rows.all() if isinstance(state, dict)]
    sold = sum(int(item.get("sold_units") or 0) for item in outcomes)
    wasted = sum(int(item.get("wasted_units") or 0) for item in outcomes)
    remaining = sum(int(item.get("remaining_units") or 0) for item in outcomes)
    total = sold + wasted + remaining
    revenue = sum(float(item.get("sold_revenue_inr") or 0) for item in outcomes)
    return {
        "window_days": days,
        "completed_batches": len(outcomes),
        "reported_units": total,
        "sold_units": sold,
        "wasted_units": wasted,
        "remaining_units": remaining,
        "reported_waste_pct": round(wasted / total * 100, 1) if total else None,
        "sold_revenue_inr": round(revenue, 2),
        "source": "operator-reported final dispositions after an applied markdown",
        "comparison": None,
        "note": "This is observed performance for completed markdown batches. It does not estimate avoided waste or causal improvement.",
    }


@router.post("/{recommendation_id}/apply")
async def apply_recommendation(
    recommendation_id: str,
    body: ApplyRecommendationRequest | None = None,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "store-gm", "store_gm", "gm")),
):
    """Apply one suggested markdown after explicit operator approval and audit it."""
    try:
        prefix, raw_batch_id, _expiry = recommendation_id.split("-", 2)
        batch_id = int(raw_batch_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid recommendation id")
    if prefix != "batch":
        raise HTTPException(status_code=400, detail="Unsupported recommendation type")

    row = await db.execute(
        select(ProductBatch, DarkStore)
        .join(DarkStore, ProductBatch.store_id == DarkStore.id)
        .where(ProductBatch.id == batch_id)
    )
    record = row.first()
    if not record:
        raise HTTPException(status_code=404, detail="Inventory batch not found")
    batch, store = record
    organization_id = payload.get("org_id") or payload.get("organization_id")
    visible = str(organization_id or "").isdigit() and int(organization_id) > 0
    if (visible and store.organization_id != int(organization_id)) or (not visible and store.organization_id is not None):
        raise HTTPException(status_code=404, detail="Inventory batch not found")
    if _recommendation_id(batch) != recommendation_id:
        raise HTTPException(status_code=409, detail="This recommendation has changed; refresh the queue")
    now = datetime.now()
    if batch.expiry_time <= now or batch.quantity <= 0:
        raise HTTPException(status_code=409, detail="Batch is expired or has no remaining quantity")
    if (batch.expiry_time - now).total_seconds() > MAX_ACTION_WINDOW_HOURS * 3600:
        raise HTTPException(status_code=409, detail="This batch is outside the near-expiry action window")
    if batch.freshness_score is None:
        raise HTTPException(status_code=409, detail="A recorded freshness measurement is required before applying a markdown")

    before = {
        "current_price": float(batch.current_price),
        "discount_rate": float(batch.discount_rate or 0.0),
        "freshness_score": float(batch.freshness_score or 0.0),
        "quantity": int(batch.quantity or 0),
    }
    variance = 0
    if body and body.physical_count is not None:
        variance = int(body.physical_count) - int(batch.quantity or 0)
        if variance != 0:
            db.add(StockLedger(
                organization_id=store.organization_id,
                store_id=store.id,
                sku_name=batch.product_name,
                quantity_changed=variance,
                reason=f"SHRINKAGE_DAMAGE_ADJUSTMENT: {body.shrinkage_reason or 'Floor count discrepancy'}",
            ))
            batch.quantity = body.physical_count

    if batch.quantity <= 0:
        raise HTTPException(status_code=409, detail="Batch has zero remaining units after physical count adjustment")

    discount = calculate_sigmoid_discount(float(batch.freshness_score or 0.0))
    next_price = round(float(batch.base_price) * (1.0 - discount), 2)
    if next_price >= float(batch.current_price) - 0.009:
        raise HTTPException(status_code=409, detail="No additional markdown is recommended for this batch")

    batch.discount_rate = discount
    batch.current_price = next_price
    after = {
        "current_price": next_price,
        "discount_rate": discount,
        "quantity": int(batch.quantity or 0),
        "physical_variance": variance,
    }

    # Dispatch outbound catalog / OMS price update event
    webhook_res = await dispatch_catalog_price_update(
        organization_id=store.organization_id or 1,
        store_id=store.id,
        store_code=getattr(store, "store_code", None),
        batch_id=batch.id,
        batch_code=getattr(batch, "qr_code_hash", None),
        product_name=batch.product_name,
        old_price=before["current_price"],
        new_price=next_price,
        discount_pct=discount * 100,
    )

    db.add(AuditLog(
        user_id=await _user_id_if_present(db, payload),
        action=APPLY_ACTION_NAME,
        target_table="product_batches",
        target_id=batch.id,
        previous_state=before,
        new_state={
            "recommendation_id": recommendation_id,
            "city": store.city if store else None,
            "product_name": batch.product_name,
            "method": "Sigmoid freshness markdown rule",
            "applied_at": now.isoformat(),
            "applied_quantity": int(batch.quantity or 0),
            "shrinkage_reason": body.shrinkage_reason if body else None,
            "catalog_sync": webhook_res,
            **after,
        },
    ))
    await db.commit()
    return {
        "recommendation_id": recommendation_id,
        "status": "applied",
        "before": before,
        "after": after,
        "catalog_sync": webhook_res,
    }


@router.get("/backtest")
@router.post("/backtest")
async def run_policy_backtest(
    sample_size: int = Query(25, ge=5, le=100),
    payload: dict = Depends(verify_token),
):
    """Benchmark the dynamic decision engine against historical baselines (FIFO and linear)."""
    cohort = generate_benchmark_historical_cohort(count=sample_size)
    report = evaluate_batch_set(cohort)
    return report


@router.post("/{recommendation_id}/feedback")
async def record_recommendation_feedback(
    recommendation_id: str,
    request: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Record a dismiss/defer choice so the operator's queue stays relevant."""
    try:
        prefix, raw_batch_id, _expiry = recommendation_id.split("-", 2)
        batch_id = int(raw_batch_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid recommendation id")
    if prefix != "batch":
        raise HTTPException(status_code=400, detail="Unsupported recommendation type")

    row = await db.execute(
        select(ProductBatch, DarkStore)
        .join(DarkStore, ProductBatch.store_id == DarkStore.id)
        .where(ProductBatch.id == batch_id)
    )
    record = row.first()
    if not record:
        raise HTTPException(status_code=404, detail="Inventory batch not found")
    batch, store = record
    organization_id = payload.get("org_id") or payload.get("organization_id")
    visible = str(organization_id or "").isdigit() and int(organization_id) > 0
    if (visible and store.organization_id != int(organization_id)) or (not visible and store.organization_id is not None):
        raise HTTPException(status_code=404, detail="Inventory batch not found")
    if _recommendation_id(batch) != recommendation_id:
        raise HTTPException(status_code=409, detail="This recommendation has changed; refresh the queue")
    db.add(AuditLog(
        user_id=await _user_id_if_present(db, payload),
        action=ACTION_NAME,
        target_table="product_batches",
        target_id=batch.id,
        new_state={
            "recommendation_id": recommendation_id,
            "outcome": request.outcome,
            "reason": request.reason,
            "city": store.city if store else None,
            "recorded_at": datetime.now().isoformat(),
        },
    ))
    await db.commit()
    return {"recommendation_id": recommendation_id, "outcome": request.outcome}


@router.post("/{recommendation_id}/outcome")
async def record_batch_outcome(
    recommendation_id: str,
    request: OutcomeRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_roles("admin", "store-gm", "store_gm", "gm")),
):
    """Capture an operator-reported final disposition for a markdown batch."""
    try:
        prefix, raw_batch_id, _expiry = recommendation_id.split("-", 2)
        batch_id = int(raw_batch_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid recommendation id")
    if prefix != "batch":
        raise HTTPException(status_code=400, detail="Unsupported recommendation type")

    query = _scope_to_organization(
        select(ProductBatch, DarkStore)
        .join(DarkStore, ProductBatch.store_id == DarkStore.id)
        .where(ProductBatch.id == batch_id),
        payload,
    )
    record = (await db.execute(query)).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inventory batch not found")
    batch, store = record
    if _recommendation_id(batch) != recommendation_id:
        raise HTTPException(status_code=409, detail="This recommendation has changed; refresh the queue")

    audit_rows = await db.execute(
        select(AuditLog.action, AuditLog.new_state)
        .where(AuditLog.target_table == "product_batches", AuditLog.target_id == batch.id)
        .where(AuditLog.action.in_([APPLY_ACTION_NAME, OUTCOME_ACTION_NAME]))
        .order_by(AuditLog.created_at.desc())
        .limit(20)
    )
    applied_state = None
    outcome_exists = False
    for action, state in audit_rows.all():
        if not isinstance(state, dict) or state.get("recommendation_id") != recommendation_id:
            continue
        if action == OUTCOME_ACTION_NAME:
            outcome_exists = True
        elif action == APPLY_ACTION_NAME and applied_state is None:
            applied_state = state
    if not applied_state:
        raise HTTPException(status_code=409, detail="Apply the markdown before recording its final outcome")
    if outcome_exists:
        raise HTTPException(status_code=409, detail="The final outcome has already been recorded")

    applied_quantity = int(applied_state.get("applied_quantity", applied_state.get("quantity", 0)))
    reported_quantity = request.sold_units + request.wasted_units + request.remaining_units
    if reported_quantity != applied_quantity:
        raise HTTPException(
            status_code=422,
            detail=f"Sold, wasted, and remaining units must total {applied_quantity}",
        )

    sold_revenue = round(request.sold_units * request.realized_avg_price, 2)
    base_value = round(applied_quantity * float(batch.base_price), 2)
    db.add(AuditLog(
        user_id=await _user_id_if_present(db, payload),
        action=OUTCOME_ACTION_NAME,
        target_table="product_batches",
        target_id=batch.id,
        previous_state=None,
        new_state={
            "recommendation_id": recommendation_id,
            "city": store.city,
            "store_id": store.id,
            "product_name": batch.product_name,
            "recorded_at": datetime.now().isoformat(),
            "source": "operator_reported_final_disposition",
            "applied_quantity": applied_quantity,
            "sold_units": request.sold_units,
            "wasted_units": request.wasted_units,
            "remaining_units": request.remaining_units,
            "realized_avg_price": request.realized_avg_price,
            "sold_revenue_inr": sold_revenue,
            "base_value_inr": base_value,
        },
    ))
    await db.commit()
    return {
        "recommendation_id": recommendation_id,
        "status": "recorded",
        "sold_revenue_inr": sold_revenue,
        "waste_units": request.wasted_units,
        "source": "operator_reported_final_disposition",
    }
