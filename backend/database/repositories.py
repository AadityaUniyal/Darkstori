from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.models.models import (
    InventoryRecommendation,
    Neighborhood,
    OrderSynthetic,
    PricingStrategy,
    StoreLayout,
)


class BaseRepository:
    """Base repository class with DB session injection."""

    def __init__(self, db: AsyncSession):
        self.db = db


class NeighborhoodRepository(BaseRepository):
    """Repository handling Neighborhood queries."""

    async def get_by_id(self, neighborhood_id: int) -> Optional[Neighborhood]:
        """Fetch a neighborhood by its ID."""
        result = await self.db.execute(
            select(Neighborhood).where(Neighborhood.neighborhood_id == neighborhood_id)
        )
        return result.scalar_one_or_none()


class RecommendationRepository(BaseRepository):
    """Repository handling precomputed recommendations."""

    async def get_inventory_recommendations(self, neighborhood_id: int) -> List[InventoryRecommendation]:
        """Fetch precomputed inventory recommendations for a neighborhood."""
        result = await self.db.execute(
            select(InventoryRecommendation)
            .where(InventoryRecommendation.neighborhood_id == neighborhood_id)
            .order_by(InventoryRecommendation.space_allocation_pct.desc())
        )
        return list(result.scalars().all())

    async def get_pricing_strategies(self, neighborhood_id: int) -> List[PricingStrategy]:
        """Fetch precomputed pricing strategies for a neighborhood."""
        result = await self.db.execute(
            select(PricingStrategy)
            .where(PricingStrategy.neighborhood_id == neighborhood_id)
        )
        return list(result.scalars().all())

    async def get_store_layouts(self, neighborhood_id: int, store_size_sqft: int) -> List[StoreLayout]:
        """Fetch precomputed layouts for a neighborhood and store size."""
        result = await self.db.execute(
            select(StoreLayout)
            .where(StoreLayout.neighborhood_id == neighborhood_id)
            .where(StoreLayout.store_size_sqft == store_size_sqft)
        )
        return list(result.scalars().all())


class OrderRepository(BaseRepository):
    """Repository handling Order queries."""

    async def get_category_order_distribution(self, neighborhood_id: int, limit: int = 10) -> List[Tuple[str, int, float]]:
        """Fetch order count and total revenue aggregated by category for fallback calculations."""
        query = (
            select(
                OrderSynthetic.category,
                func.count(OrderSynthetic.id).label("order_count"),
                func.sum(OrderSynthetic.order_value).label("total_revenue"),
            )
            .where(OrderSynthetic.neighborhood_id == neighborhood_id)
            .group_by(OrderSynthetic.category)
            .order_by(func.count(OrderSynthetic.id).desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        # Return as list of (category, count, revenue) tuples
        return [(row[0], row[1], row[2]) for row in result.all()]
