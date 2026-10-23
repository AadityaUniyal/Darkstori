"""
Autonomous Grid & War Room API Routes
======================================
Exposes deep-tech endpoints for:
1. Thermodynamic Micro-Warehouse Slotting Rebalancer
2. Multi-Agent Swarm Dynamic En-Route Intercept Dispatch
3. Autonomous Multi-Hub Self-Healing Transshipment Grid
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from backend.ml.thermodynamic_slotting import slotting_engine
from backend.ml.swarm_intercept import swarm_engine
from backend.ml.self_healing_grid import grid_engine

router = APIRouter()


class SlottingOptimizeRequest(BaseModel):
    iterations: Optional[int] = Field(default=300, ge=50, le=1000)
    current_slots: Optional[Dict[str, str]] = None


class SwarmInterceptRequest(BaseModel):
    courier_a: Optional[Dict[str, Any]] = None
    courier_b: Optional[Dict[str, Any]] = None
    target_delivery: Optional[Dict[str, Any]] = None
    traffic_congestion: Optional[float] = Field(default=1.35, ge=1.0, le=3.0)


@router.post("/slotting-optimize")
async def optimize_darkstore_slotting(req: SlottingOptimizeRequest = SlottingOptimizeRequest()):
    """
    Computes thermodynamic affinity re-slotting using simulated annealing & spectral distance minimization.
    Returns picker walk reduction %, pick time reduction, and surgical bin migration waves.
    """
    try:
        result = slotting_engine.optimize_slotting(
            current_assignment=req.current_slots,
            iterations=req.iterations or 300
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slotting optimization failed: {str(e)}")


@router.post("/swarm-intercept")
async def compute_swarm_intercept(req: SwarmInterceptRequest = SwarmInterceptRequest()):
    """
    Computes dynamic en-route parcel handoffs between two couriers to defend SLA under traffic friction.
    """
    try:
        courier_a = req.courier_a or {"id": "RIDER-01", "lat": 12.9360, "lon": 77.6250}
        courier_b = req.courier_b or {"id": "RIDER-07", "lat": 12.9290, "lon": 77.6320}
        target_delivery = req.target_delivery or {"lat": 12.9240, "lon": 77.6380}
        traffic = req.traffic_congestion or 1.35

        result = swarm_engine.compute_optimal_intercept(
            courier_a=courier_a,
            courier_b=courier_b,
            target_delivery=target_delivery,
            traffic_congestion=traffic
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Swarm intercept calculation failed: {str(e)}")


@router.get("/multi-hub-mesh")
async def get_multi_hub_mesh():
    """
    Returns live self-healing transshipment schedule and net economic alpha across urban hubs.
    """
    try:
        result = grid_engine.evaluate_grid_transshipments()
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-hub grid evaluation failed: {str(e)}")
