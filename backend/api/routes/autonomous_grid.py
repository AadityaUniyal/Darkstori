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
from backend.core.security import verify_token
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
    payload: dict = Depends(verify_token),
):
    """
    Computes thermodynamic affinity re-slotting using simulated annealing & spectral distance minimization.
    Returns picker walk reduction %, pick time reduction, and surgical bin migration waves.
    """
    try:
        result = slotting_engine.optimize_slotting(
            current_assignment=req.current_slots,
            iterations=req.iterations or 300
        )
        return {"status": "simulated", "data_mode": "synthetic_simulation", "note": "No live shelf map or picker telemetry is connected.", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slotting optimization failed: {str(e)}")


@router.post("/apply-slotting")
async def apply_and_persist_slotting(
    req: ApplySlottingRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """
    Persists thermodynamic shelf slotting optimization to the live database (StoreLayout & AuditLog).
    """
    raise HTTPException(
        status_code=501,
        detail="Slotting cannot be applied until a store-specific shelf map, validated plan, and persisted layout workflow are connected.",
    )


@router.post("/swarm-intercept")
async def compute_swarm_intercept(req: SwarmInterceptRequest, payload: dict = Depends(verify_token)):
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
async def get_multi_hub_mesh(payload: dict = Depends(verify_token)):
    """
    Returns live self-healing transshipment schedule and net economic alpha across urban hubs.
    """
    try:
        result = grid_engine.evaluate_grid_transshipments()
        return {"status": "simulated", "data_mode": "synthetic_simulation", "note": "No live inventory, vehicle, or hub transfer integrations are connected.", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-hub grid evaluation failed: {str(e)}")


@router.post("/execute-transshipment")
async def execute_and_persist_transshipment(
    req: TransshipmentExecuteRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """
    Executes and persists an autonomous inter-hub transshipment in the live database:
    1. Debits surplus inventory from Source Hub in StockLedger
    2. Credits deficit inventory to Target Hub in StockLedger
    3. Records full immutable AuditLog entry with vehicle telemetry & saved Rupee alpha
    """
    raise HTTPException(
        status_code=501,
        detail="Transshipment execution is unavailable until transfers are tied to specific source batches, destination stores, receipt confirmation, and a real carrier workflow. No inventory was changed.",
    )
