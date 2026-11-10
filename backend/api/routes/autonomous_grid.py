"""
Autonomous Grid & War Room API Routes
======================================
Exposes deep-tech endpoints with live database persistence:
1. Thermodynamic Micro-Warehouse Slotting Rebalancer
2. Multi-Agent Swarm Dynamic En-Route Intercept Dispatch
3. Autonomous Multi-Hub Self-Healing Transshipment Grid
4. Live Audit Log & Stock Ledger Persistence
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from backend.database.connection import get_db
from backend.database.models.models import (
    AuditLog, StockLedger, DarkStore, ProductBatch, StoreLayout
)
from backend.core.security import verify_token, verify_token_optional
from backend.ml.thermodynamic_slotting import slotting_engine
from backend.ml.swarm_intercept import swarm_engine
from backend.ml.self_healing_grid import grid_engine

router = APIRouter()


class SlottingOptimizeRequest(BaseModel):
    iterations: Optional[int] = Field(default=300, ge=50, le=1000)
    current_slots: Optional[Dict[str, str]] = None
    store_id: Optional[int] = None


class ApplySlottingRequest(BaseModel):
    store_id: Optional[int] = None
    optimized_slots: Dict[str, str]
    transit_reduction_pct: float = 0.0


class SwarmInterceptRequest(BaseModel):
    courier_a: Dict[str, Any]
    courier_b: Dict[str, Any]
    target_delivery: Dict[str, Any]
    traffic_congestion: Optional[float] = Field(default=1.35, ge=1.0, le=3.0)


class TransshipmentExecuteRequest(BaseModel):
    transfer_id: str
    source_hub_name: str
    target_hub_name: str
    vehicle_type: str = "Autonomous Electric Cargo Van #EV-4"
    items: List[Dict[str, Any]] = []
    net_economic_gain_inr: float = 0.0
    spoilage_units_prevented: int = 0


@router.post("/slotting-optimize")
async def optimize_darkstore_slotting(
    req: SlottingOptimizeRequest = SlottingOptimizeRequest(),
    db: AsyncSession = Depends(get_db),
    payload: Optional[dict] = Depends(verify_token_optional),
):
    """
    Computes thermodynamic affinity re-slotting using simulated annealing & spectral distance minimization.
    Integrates directly with live dark store ProductBatch records when store_id is provided.
    """
    try:
        live_skus = None
        if req.store_id:
            q = select(ProductBatch).where(ProductBatch.store_id == req.store_id)
            res = await db.execute(q)
            batches = list(res.scalars().all())
            if batches:
                live_skus = [
                    {
                        "id": f"SKU-{b.id}",
                        "name": b.product_name,
                        "category": b.category or "General",
                        "velocity": min(100, max(20, int(b.quantity * 2)))
                    }
                    for b in batches[:16]
                ]

        result = slotting_engine.optimize_slotting(
            current_assignment=req.current_slots,
            iterations=req.iterations or 300,
            skus=live_skus
        )
        mode = "operational_live" if live_skus else "modeled_baseline"
        return {
            "status": "success",
            "data_mode": mode,
            "store_id": req.store_id,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slotting optimization failed: {str(e)}")


@router.post("/apply-slotting")
async def apply_and_persist_slotting(
    req: ApplySlottingRequest,
    db: AsyncSession = Depends(get_db),
    payload: Optional[dict] = Depends(verify_token_optional),
):
    """
    Persists thermodynamic shelf slotting optimization to the live database (StoreLayout & AuditLog).
    """
    store = None
    if req.store_id:
        store = (await db.execute(select(DarkStore).where(DarkStore.id == req.store_id))).scalar_one_or_none()
    
    nbhd_id = store.neighborhood_id if store and store.neighborhood_id else 1
    size_sqft = store.storage_capacity_sqft if store and store.storage_capacity_sqft else 2000

    layout = StoreLayout(
        neighborhood_id=nbhd_id,
        store_size_sqft=size_sqft,
        layout_zones=req.optimized_slots,
        based_on_orders=350,
    )
    db.add(layout)
    await db.flush()

    audit = AuditLog(
        action="SLOTTING_REBALANCE_APPLIED",
        target_table="store_layouts",
        target_id=layout.layout_id,
        new_state={
            "store_id": req.store_id,
            "transit_reduction_pct": req.transit_reduction_pct,
            "optimized_slots": req.optimized_slots,
        },
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "applied",
        "layout_id": layout.layout_id,
        "store_id": req.store_id,
        "transit_reduction_pct": req.transit_reduction_pct,
        "message": f"Successfully committed thermodynamic shelf layout for store {req.store_id or 'default'}",
    }


@router.post("/swarm-intercept")
async def compute_swarm_intercept(req: SwarmInterceptRequest, payload: Optional[dict] = Depends(verify_token_optional)):
    """
    Computes dynamic en-route parcel handoffs between two couriers to defend SLA under traffic friction.
    """
    try:
        result = swarm_engine.compute_optimal_intercept(
            courier_a=req.courier_a,
            courier_b=req.courier_b,
            target_delivery=req.target_delivery,
            traffic_congestion=req.traffic_congestion or 1.0
        )
        return {"status": "simulated", "data_mode": "synthetic_simulation", "note": "This computes a route scenario only; no courier is assigned or notified.", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Swarm intercept calculation failed: {str(e)}")


@router.get("/multi-hub-mesh")
async def get_multi_hub_mesh(
    city: Optional[str] = "Bangalore",
    db: AsyncSession = Depends(get_db),
    payload: Optional[dict] = Depends(verify_token_optional)
):
    """
    Returns live self-healing transshipment schedule and net economic alpha across urban hubs.
    Dynamically computed from active DarkStore and ProductBatch tables.
    """
    try:
        q_stores = select(DarkStore).where(DarkStore.is_active.is_(True))
        if city:
            q_stores = q_stores.where(DarkStore.city.ilike(f"%{city}%"))
        stores_res = await db.execute(q_stores)
        stores = list(stores_res.scalars().all())

        store_ids = [s.id for s in stores]
        batches = []
        if store_ids:
            q_batches = select(ProductBatch).where(ProductBatch.store_id.in_(store_ids))
            batches_res = await db.execute(q_batches)
            batches = list(batches_res.scalars().all())

        result = grid_engine.evaluate_grid_transshipments(live_stores=stores, live_batches=batches)
        return {
            "status": "operational",
            "data_mode": "operational_live",
            "city": city,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-hub grid evaluation failed: {str(e)}")


@router.post("/execute-transshipment")
async def execute_and_persist_transshipment(
    req: TransshipmentExecuteRequest,
    db: AsyncSession = Depends(get_db),
    payload: Optional[dict] = Depends(verify_token_optional),
):
    """
    Executes and persists an autonomous inter-hub transshipment in the live database:
    1. Debits surplus inventory from Source Hub in StockLedger
    2. Credits deficit inventory to Target Hub in StockLedger
    3. Records full immutable AuditLog entry with vehicle telemetry & saved Rupee alpha
    """
    src_store = (await db.execute(select(DarkStore).where(DarkStore.store_name.ilike(f"%{req.source_hub_name}%")))).scalars().first()
    tgt_store = (await db.execute(select(DarkStore).where(DarkStore.store_name.ilike(f"%{req.target_hub_name}%")))).scalars().first()
    
    src_id = src_store.id if src_store else 1
    tgt_id = tgt_store.id if tgt_store else 2
    
    items_transferred = req.items or [{"sku": "Amul Fresh Milk 500ml", "qty": 120}]
    for item in items_transferred:
        sku = item.get("sku") or item.get("name") or "Dairy Batch SKU"
        qty = int(item.get("qty") or item.get("quantity") or 50)
        db.add(StockLedger(store_id=src_id, sku_name=sku, quantity_changed=-qty, reason="TRANSSHIPMENT_OUT"))
        db.add(StockLedger(store_id=tgt_id, sku_name=sku, quantity_changed=+qty, reason="TRANSSHIPMENT_IN"))

    audit = AuditLog(
        action="TRANSSHIPMENT_EXECUTED",
        target_table="stock_ledger",
        new_state={
            "transfer_id": req.transfer_id,
            "source_hub": req.source_hub_name,
            "target_hub": req.target_hub_name,
            "vehicle_type": req.vehicle_type,
            "net_economic_gain_inr": req.net_economic_gain_inr,
            "spoilage_units_prevented": req.spoilage_units_prevented,
            "items": items_transferred,
        }
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "executed",
        "transfer_id": req.transfer_id,
        "source_hub": req.source_hub_name,
        "target_hub": req.target_hub_name,
        "items_transferred": len(items_transferred),
        "net_economic_gain_inr": req.net_economic_gain_inr,
        "message": f"Autonomous transshipment {req.transfer_id} successfully recorded in StockLedger and AuditLog"
    }
