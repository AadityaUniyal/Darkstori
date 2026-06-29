from abc import ABC, abstractmethod
from typing import Any, List, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.repositories import (
    NeighborhoodRepository,
    RecommendationRepository,
    OrderRepository,
)


class InventoryRec(BaseModel):
    category: str
    investment_amount: float
    space_allocation_pct: float
    top_skus: Optional[list] = None
    confidence_level: float

    model_config = {"from_attributes": True}


class PricingRec(BaseModel):
    segment: str
    avg_order_value_target: float
    price_range_low: float
    price_range_high: float
    discount_strategy: str
    peak_hour_pricing: Optional[dict] = None

    model_config = {"from_attributes": True}


class LayoutRec(BaseModel):
    store_size_sqft: int
    layout_zones: Optional[dict] = None
    based_on_orders: int

    model_config = {"from_attributes": True}


class RecommendationStrategy(ABC):
    """Base interface for all recommendation strategies (Strategy pattern)."""

    @abstractmethod
    async def generate(self, neighborhood_id: int, context: dict, db: AsyncSession) -> Any:
        """Generate a recommendation list or object."""
        pass


class InventoryStrategy(RecommendationStrategy):
    """Concrete strategy for calculating inventory category allocations."""

    async def generate(self, neighborhood_id: int, context: dict, db: AsyncSession) -> List[InventoryRec]:
        budget = context.get("budget", 1600000.0)
        rec_repo = RecommendationRepository(db)
        order_repo = OrderRepository(db)

        # 1. Attempt precomputed recommendations
        recs = await rec_repo.get_inventory_recommendations(neighborhood_id)
        if recs:
            return [
                InventoryRec(
                    category=r.category,
                    investment_amount=r.investment_amount or (r.space_allocation_pct * budget / 100),
                    space_allocation_pct=r.space_allocation_pct,
                    top_skus=r.top_skus,
                    confidence_level=r.confidence_level or 0.85,
                )
                for r in recs
            ]

        # 2. Fallback to historical order aggregation
        rows = await order_repo.get_category_order_distribution(neighborhood_id)
        if not rows:
            # 3. Final default fallback distribution
            defaults = [
                ("Fruits & Vegetables", 25.0),
                ("Dairy & Bread", 20.0),
                ("Snacks & Beverages", 18.0),
                ("Personal Care", 12.0),
                ("Household", 10.0),
                ("Baby & Kids", 8.0),
                ("Instant Food", 7.0),
            ]
            return [
                InventoryRec(
                    category=cat,
                    investment_amount=(pct / 100) * budget,
                    space_allocation_pct=pct,
                    top_skus=None,
                    confidence_level=0.75,
                )
                for cat, pct in defaults
            ]

        total_orders = sum(r[1] for r in rows) or 1
        return [
            InventoryRec(
                category=r[0] or "Other",
                investment_amount=round((r[1] / total_orders) * budget, 2),
                space_allocation_pct=round(r[1] / total_orders * 100, 1),
                top_skus=None,
                confidence_level=min(0.95, 0.5 + r[1] / total_orders),
            )
            for r in rows
        ]


class PricingStrategyContext(RecommendationStrategy):
    """Concrete strategy for calculating pricing and discounting strategies."""

    async def generate(self, neighborhood_id: int, context: dict, db: AsyncSession) -> List[PricingRec]:
        rec_repo = RecommendationRepository(db)
        nbhd_repo = NeighborhoodRepository(db)

        # 1. Attempt precomputed recommendations
        recs = await rec_repo.get_pricing_strategies(neighborhood_id)
        if recs:
            return [
                PricingRec(
                    segment=r.segment,
                    avg_order_value_target=r.avg_order_value_target,
                    price_range_low=r.price_range_low,
                    price_range_high=r.price_range_high,
                    discount_strategy=r.discount_strategy,
                    peak_hour_pricing=r.peak_hour_pricing,
                )
                for r in recs
            ]

        # 2. Fallback to demographic profiling based on household income
        nbhd = await nbhd_repo.get_by_id(neighborhood_id)
        income = (nbhd.avg_household_income if nbhd else 600_000) or 600_000

        if income > 1_000_000:
            segments = [
                ("Premium", 550.0, 200.0, 1200.0, "Minimal — focus on convenience"),
                ("Regular", 350.0, 100.0, 600.0, "10-15% on bundles"),
            ]
        elif income > 600_000:
            segments = [
                ("Value", 280.0, 80.0, 500.0, "15-20% first-order + combo packs"),
                ("Budget", 180.0, 40.0, 300.0, "Heavy discounts on staples"),
            ]
        else:
            segments = [
                ("Budget", 150.0, 30.0, 250.0, "Deep discounts, loss-leader staples"),
                ("Essentials", 100.0, 20.0, 180.0, "Everyday-low-price strategy"),
            ]

        return [
            PricingRec(
                segment=seg,
                avg_order_value_target=aov,
                price_range_low=lo,
                price_range_high=hi,
                discount_strategy=strat,
                peak_hour_pricing={"18-21": "+5%", "11-14": "-3%"},
            )
            for seg, aov, lo, hi, strat in segments
        ]


class LayoutStrategy(RecommendationStrategy):
    """Concrete strategy for calculating warehouse spatial layout zones."""

    async def generate(self, neighborhood_id: int, context: dict, db: AsyncSession) -> List[LayoutRec]:
        store_size = context.get("store_size", 1500)
        rec_repo = RecommendationRepository(db)

        # 1. Attempt precomputed recommendations
        recs = await rec_repo.get_store_layouts(neighborhood_id, store_size)
        if recs:
            return [
                LayoutRec(
                    store_size_sqft=r.store_size_sqft,
                    layout_zones=r.layout_zones,
                    based_on_orders=r.based_on_orders,
                )
                for r in recs
            ]

        # 2. Fallback to standard warehouse sizing calculations
        return [
            LayoutRec(
                store_size_sqft=store_size,
                layout_zones={
                    "cold_storage": {"pct": 20, "items": "Dairy, Frozen, Meat"},
                    "ambient_shelves": {"pct": 35, "items": "Snacks, Staples, Beverages"},
                    "fresh_produce": {"pct": 20, "items": "Fruits, Vegetables"},
                    "personal_care": {"pct": 10, "items": "Personal Care, Baby"},
                    "packing_station": {"pct": 10, "items": "Order assembly"},
                    "loading_bay": {"pct": 5, "items": "Inbound/outbound"},
                },
                based_on_orders=0,
            )
        ]


class RecommendationEngine:
    """Context coordinator that runs recommendation strategies."""

    def __init__(self, strategy: RecommendationStrategy):
        self.strategy = strategy

    async def execute(self, neighborhood_id: int, context: dict, db: AsyncSession) -> Any:
        return await self.strategy.generate(neighborhood_id, context, db)
