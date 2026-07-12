"""
Coverage Gap Diff Analysis
Calculates the before/after difference of placement opportunity scores in
neighborhoods as competitor stores open or close over time.
"""

import asyncio
import logging
from sqlalchemy import select, and_, func
from datetime import datetime, timedelta

from backend.database.connection import get_async_session
from backend.database.models.models import PlacementScore, CompetitorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def analyze_coverage_diff():
    """Analyze coverage differences over the last 30 days."""
    logger.info("Starting Coverage Gap Diff Analysis...")
    
    async with get_async_session() as db:
        # Fetch the most recent placement scores
        recent_q = select(PlacementScore).order_by(PlacementScore.scored_at.desc()).limit(10)
        res = await db.execute(recent_q)
        recent_scores = res.scalars().all()
        
        if not recent_scores:
            logger.warning("No placement scores found to analyze.")
            return

        logger.info(f"Found {len(recent_scores)} recent placement scores. Analyzing historical diffs...")

        for score in recent_scores:
            # Look for an older score for the same neighborhood
            thirty_days_ago = datetime.now() - timedelta(days=30)
            historical_q = select(PlacementScore).where(
                and_(
                    PlacementScore.neighborhood_name == score.neighborhood_name,
                    PlacementScore.city == score.city,
                    PlacementScore.scored_at <= thirty_days_ago
                )
            ).order_by(PlacementScore.scored_at.desc()).limit(1)
            
            hist_res = await db.execute(historical_q)
            hist_score = hist_res.scalar_one_or_none()
            
            if hist_score:
                diff = score.opportunity_score - hist_score.opportunity_score
                
                # Check for new competitors in that time window
                comp_q = select(func.count(CompetitorStore.id)).where(
                    and_(
                        CompetitorStore.city == score.city,
                        CompetitorStore.created_at >= thirty_days_ago
                    )
                )
                comp_res = await db.execute(comp_q)
                new_comps = comp_res.scalar_one_or_none() or 0
                
                logger.info(
                    f"Neighborhood: {score.neighborhood_name} ({score.city}) | "
                    f"Current Score: {score.opportunity_score:.2f} | "
                    f"Historical Score: {hist_score.opportunity_score:.2f} | "
                    f"Diff: {diff:+.2f} | "
                    f"New Competitors in City: {new_comps}"
                )
            else:
                logger.info(f"Neighborhood: {score.neighborhood_name} ({score.city}) - No historical data for comparison.")
                
    logger.info("Analysis Complete.")

if __name__ == "__main__":
    asyncio.run(analyze_coverage_diff())
