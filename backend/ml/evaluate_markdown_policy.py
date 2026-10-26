"""Empirical evaluation and backtesting framework for expiry-aware markdown policies.

Compares:
1. Baseline A: FIFO / Status Quo (Static late fire-sale at T <= 4 hours)
2. Baseline B: Linear Step Markdown (Fixed 15% / 30% / 50% stair-step)
3. Darkstori Dynamic Sigmoid Policy: Freshness-aware velocity optimization
"""

import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import numpy as np


@dataclass
class BatchSimulationInput:
    batch_id: int
    product_name: str
    category: str
    quantity: int
    base_price: float
    total_shelf_life_hours: float
    base_hourly_velocity: float  # normal sales velocity at full price (units/hour)
    price_elasticity: float = 1.6  # typical grocery price elasticity


@dataclass
class PolicyResult:
    policy_name: str
    total_units: int
    units_sold: int
    units_wasted: int
    waste_rate_pct: float
    revenue_inr: float
    waste_loss_inr: float
    net_recovery_pct: float


def _simulate_batch_lifecycle(
    batch: BatchSimulationInput,
    policy_type: str,
    time_step_hours: float = 1.0,
) -> Dict[str, float]:
    """Simulate single batch across hourly intervals from arrival to expiry."""
    qty_remaining = float(batch.quantity)
    total_revenue = 0.0
    steps = int(batch.total_shelf_life_hours / time_step_hours)

    for step in range(steps):
        if qty_remaining <= 0.001:
            break

        elapsed_hours = step * time_step_hours
        hours_remaining = max(0.0, batch.total_shelf_life_hours - elapsed_hours)
        freshness = max(0.0, min(1.0, hours_remaining / max(1.0, batch.total_shelf_life_hours)))

        # Determine discount based on policy
        if policy_type == "fifo_status_quo":
            # Status quo: Full price until 4 hours left, then flat 30% markdown
            discount = 0.30 if hours_remaining <= 4.0 else 0.0
        elif policy_type == "linear_step":
            if hours_remaining <= 6.0:
                discount = 0.50
            elif hours_remaining <= 12.0:
                discount = 0.30
            elif hours_remaining <= 24.0:
                discount = 0.15
            else:
                discount = 0.0
        elif policy_type == "darkstori_dynamic":
            # Smooth sigmoid discount targeting early velocity lift
            # k=10.0, x0=0.45: starts ramping around 45% remaining shelf life
            sigmoid = 1.0 / (1.0 + math.exp(10.0 * (freshness - 0.45)))
            discount = min(0.65, max(0.0, sigmoid * 0.70))
        else:
            discount = 0.0

        effective_price = batch.base_price * (1.0 - discount)

        # Demand stimulation via price elasticity:
        # velocity_multiplier = (1 + discount * elasticity)
        velocity_multiplier = 1.0 + (discount * batch.price_elasticity)
        current_velocity = batch.base_hourly_velocity * velocity_multiplier

        # Add minor natural freshness resistance as freshness drops below 0.3
        if freshness < 0.3:
            current_velocity *= max(0.4, freshness / 0.3)

        units_demanded = current_velocity * time_step_hours
        units_sold = min(qty_remaining, units_demanded)

        qty_remaining -= units_sold
        total_revenue += units_sold * effective_price

    # When time is up, whatever is left is wasted
    units_wasted = max(0.0, qty_remaining)
    units_sold_total = batch.quantity - units_wasted
    waste_loss_inr = units_wasted * batch.base_price

    return {
        "units_sold": round(units_sold_total, 2),
        "units_wasted": round(units_wasted, 2),
        "revenue_inr": round(total_revenue, 2),
        "waste_loss_inr": round(waste_loss_inr, 2),
    }


def evaluate_batch_set(
    batches: List[BatchSimulationInput],
) -> Dict[str, Any]:
    """Benchmark all 3 policies across a historical/empirical cohort of batches."""
    policies = ["fifo_status_quo", "linear_step", "darkstori_dynamic"]
    policy_labels = {
        "fifo_status_quo": "Baseline: FIFO / Status Quo",
        "linear_step": "Baseline: Linear Stair-Step",
        "darkstori_dynamic": "Darkstori Dynamic Sigmoid Policy",
    }

    results: Dict[str, PolicyResult] = {}
    total_batch_units = sum(b.quantity for b in batches)
    total_potential_value = sum(b.quantity * b.base_price for b in batches)

    for p in policies:
        tot_sold = 0.0
        tot_wasted = 0.0
        tot_rev = 0.0
        tot_waste_loss = 0.0

        for b in batches:
            sim = _simulate_batch_lifecycle(b, policy_type=p)
            tot_sold += sim["units_sold"]
            tot_wasted += sim["units_wasted"]
            tot_rev += sim["revenue_inr"]
            tot_waste_loss += sim["waste_loss_inr"]

        waste_pct = round((tot_wasted / total_batch_units) * 100, 2) if total_batch_units > 0 else 0.0
        net_recovery_pct = round((tot_rev / total_potential_value) * 100, 2) if total_potential_value > 0 else 0.0

        results[p] = PolicyResult(
            policy_name=policy_labels[p],
            total_units=total_batch_units,
            units_sold=int(round(tot_sold)),
            units_wasted=int(round(tot_wasted)),
            waste_rate_pct=waste_pct,
            revenue_inr=round(tot_rev, 2),
            waste_loss_inr=round(tot_waste_loss, 2),
            net_recovery_pct=net_recovery_pct,
        )

    fifo = results["fifo_status_quo"]
    darkstori = results["darkstori_dynamic"]

    waste_reduction_units = fifo.units_wasted - darkstori.units_wasted
    waste_reduction_pct = (
        round(((fifo.units_wasted - darkstori.units_wasted) / max(1, fifo.units_wasted)) * 100, 1)
        if fifo.units_wasted > 0
        else 0.0
    )
    margin_uplift_inr = round(darkstori.revenue_inr - fifo.revenue_inr, 2)

    return {
        "batch_count": len(batches),
        "total_units_evaluated": total_batch_units,
        "total_inventory_value_inr": round(total_potential_value, 2),
        "policies": {k: v.__dict__ for k, v in results.items()},
        "measured_uplift": {
            "waste_reduction_units": waste_reduction_units,
            "waste_reduction_pct": waste_reduction_pct,
            "margin_uplift_inr": margin_uplift_inr,
            "net_recovery_delta_pct": round(darkstori.net_recovery_pct - fifo.net_recovery_pct, 2),
        },
        "conclusion": (
            f"Darkstori Dynamic Policy reduced expiry waste by {waste_reduction_pct}% "
            f"and generated INR {margin_uplift_inr:,.2f} in incremental recovered revenue vs. FIFO baseline."
        ),
    }


def generate_benchmark_historical_cohort(count: int = 20) -> List[BatchSimulationInput]:
    """Synthesize representative quick-commerce perishable batches (dairy, produce, bakery)."""
    templates = [
        {"product": "Fresh Full Cream Milk 1L", "cat": "Dairy", "price": 68.0, "life": 48.0, "velocity": 1.4},
        {"product": "Farm Fresh Tomatoes 1kg", "cat": "Produce", "price": 45.0, "life": 72.0, "velocity": 0.9},
        {"product": "Whole Wheat Bread 400g", "cat": "Bakery", "price": 50.0, "life": 48.0, "velocity": 0.8},
        {"product": "Paneer Fresh 200g", "cat": "Dairy", "price": 95.0, "life": 36.0, "velocity": 0.7},
        {"product": "Fresh Coriander 100g", "cat": "Produce", "price": 20.0, "life": 24.0, "velocity": 0.6},
        {"product": "Greek Yogurt Plain 100g", "cat": "Dairy", "price": 60.0, "life": 60.0, "velocity": 0.5},
        {"product": "Organic Spinach 250g", "cat": "Produce", "price": 35.0, "life": 24.0, "velocity": 0.7},
        {"product": "Alphonso Mangoes 500g", "cat": "Produce", "price": 240.0, "life": 48.0, "velocity": 0.4},
    ]

    rng = np.random.default_rng(42)
    cohort = []
    for i in range(count):
        t = templates[i % len(templates)]
        qty = int(rng.integers(20, 60))
        # Slight variance on velocity and base shelf-life
        life = float(t["life"] * rng.uniform(0.85, 1.15))
        velocity = float(t["velocity"] * rng.uniform(0.75, 1.25))

        cohort.append(
            BatchSimulationInput(
                batch_id=1000 + i,
                product_name=t["product"],
                category=t["cat"],
                quantity=qty,
                base_price=t["price"],
                total_shelf_life_hours=round(life, 1),
                base_hourly_velocity=round(velocity, 3),
                price_elasticity=1.65,
            )
        )
    return cohort


if __name__ == "__main__":
    test_cohort = generate_benchmark_historical_cohort(25)
    report = evaluate_batch_set(test_cohort)
    import pprint
    pprint.pprint(report)
