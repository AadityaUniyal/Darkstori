"""Coverage gap analysis module."""

from typing import Tuple

import numpy as np
import pandas as pd

from backend.core.config import PROCESSED_DATA_DIR
from backend.core.logger import logger


class CoverageGapAnalyzer:
    """Analyze coverage gaps in quick commerce delivery."""

    def __init__(self, pincodes_df: pd.DataFrame, coverage_df: pd.DataFrame):
        """
        Initialize analyzer with PIN code and coverage data.

        Args:
            pincodes_df: DataFrame with PIN code details (population, tier, etc.)
            coverage_df: DataFrame with platform coverage by PIN code
        """
        self.pincodes_df = pincodes_df
        self.coverage_df = coverage_df
        self.merged_df = None

    def compute_coverage_score(self) -> pd.DataFrame:
        """
        Calculate coverage score for each PIN code.
        Coverage score = number of platforms serving the PIN code (0-4).
        """
        # Merge PIN code data with coverage data
        self.merged_df = self.pincodes_df.merge(
            self.coverage_df, on="pincode", how="left"
        )

        # Calculate coverage score
        platform_cols = ["blinkit", "zepto", "instamart", "flipkart_min"]
        for col in platform_cols:
            if col not in self.merged_df.columns:
                self.merged_df[col] = False

        self.merged_df["coverage_score"] = (
            self.merged_df["blinkit"].fillna(False).astype(int)
            + self.merged_df["zepto"].fillna(False).astype(int)
            + self.merged_df["instamart"].fillna(False).astype(int)
            + self.merged_df["flipkart_min"].fillna(False).astype(int)
        )

        logger.info("Coverage scores calculated")
        return self.merged_df

    def identify_opportunity_zones(
        self, min_population: int = 100000, max_coverage: int = 0
    ) -> pd.DataFrame:
        """
        Identify high-opportunity zones: high population + low coverage.

        Args:
            min_population: Minimum population threshold
            max_coverage: Maximum coverage score (0 = no coverage)

        Returns:
            DataFrame of opportunity zones sorted by population
        """
        if self.merged_df is None:
            self.compute_coverage_score()

        opportunities = self.merged_df[
            (self.merged_df["population"] >= min_population)
            & (self.merged_df["coverage_score"] <= max_coverage)
        ].copy()

        opportunities = opportunities.sort_values("population", ascending=False)

        logger.info(f"Found {len(opportunities)} opportunity zones")
        return opportunities

    def analyze_by_city_tier(self) -> pd.DataFrame:
        """Analyze coverage distribution by city tier."""
        if self.merged_df is None:
            self.compute_coverage_score()

        tier_analysis = (
            self.merged_df.groupby("city_tier")
            .agg(
                {
                    "pincode": "count",
                    "coverage_score": ["mean", "median"],
                    "population": "sum",
                    "blinkit": "sum",
                    "zepto": "sum",
                    "instamart": "sum",
                }
            )
            .round(2)
        )

        tier_analysis.columns = [
            "total_pincodes",
            "avg_coverage",
            "median_coverage",
            "total_population",
            "blinkit_count",
            "zepto_count",
            "instamart_count",
        ]

        return tier_analysis

    def analyze_by_state(self) -> pd.DataFrame:
        """Analyze coverage distribution by state."""
        if self.merged_df is None:
            self.compute_coverage_score()

        state_analysis = (
            self.merged_df.groupby("state")
            .agg({"pincode": "count", "coverage_score": "mean", "population": "sum"})
            .round(2)
        )

        state_analysis.columns = ["total_pincodes", "avg_coverage", "total_population"]
        state_analysis["coverage_percentage"] = (
            (state_analysis["avg_coverage"] / 4) * 100
        ).round(1)

        return state_analysis.sort_values("avg_coverage", ascending=False)

    def get_coverage_statistics(self) -> dict:
        """Get overall coverage statistics."""
        if self.merged_df is None:
            self.compute_coverage_score()

        total_pincodes = len(self.merged_df)
        zero_coverage = (self.merged_df["coverage_score"] == 0).sum()
        full_coverage = (self.merged_df["coverage_score"] >= 3).sum()

        stats = {
            "total_pincodes": total_pincodes,
            "zero_coverage_count": zero_coverage,
            "zero_coverage_pct": round((zero_coverage / total_pincodes) * 100, 2),
            "full_coverage_count": full_coverage,
            "full_coverage_pct": round((full_coverage / total_pincodes) * 100, 2),
            "avg_coverage_score": round(self.merged_df["coverage_score"].mean(), 2),
            "median_coverage_score": self.merged_df["coverage_score"].median(),
        }

        return stats

    def export_results(self, output_prefix: str = "coverage_analysis"):
        """Export analysis results to CSV files."""
        if self.merged_df is None:
            self.compute_coverage_score()

        # Export full coverage data
        full_path = PROCESSED_DATA_DIR / f"{output_prefix}_full.csv"
        self.merged_df.to_csv(full_path, index=False)
        logger.info(f"Saved full coverage data to {full_path}")

        # Export opportunity zones
        opportunities = self.identify_opportunity_zones()
        opp_path = PROCESSED_DATA_DIR / f"{output_prefix}_opportunities.csv"
        opportunities.to_csv(opp_path, index=False)
        logger.info(f"Saved opportunity zones to {opp_path}")

        # Export tier analysis
        tier_analysis = self.analyze_by_city_tier()
        tier_path = PROCESSED_DATA_DIR / f"{output_prefix}_by_tier.csv"
        tier_analysis.to_csv(tier_path)
        logger.info(f"Saved tier analysis to {tier_path}")


def main():
    """Example usage with sample data."""
    # Create sample data for demonstration
    sample_pincodes = pd.DataFrame(
        {
            "pincode": ["110001", "400001", "560001", "600001", "700001"],
            "city": ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata"],
            "state": ["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "West Bengal"],
            "city_tier": ["Metro", "Metro", "Metro", "Metro", "Metro"],
            "population": [150000, 200000, 180000, 160000, 140000],
        }
    )

    sample_coverage = pd.DataFrame(
        {
            "pincode": ["110001", "400001", "560001", "600001", "700001"],
            "blinkit": [True, True, True, False, True],
            "zepto": [True, True, True, False, False],
            "instamart": [True, True, False, True, True],
            "flipkart_min": [False, True, False, False, False],
        }
    )

    analyzer = CoverageGapAnalyzer(sample_pincodes, sample_coverage)

    # Run analysis
    print("\n=== Coverage Statistics ===")
    stats = analyzer.get_coverage_statistics()
    for key, value in stats.items():
        print(f"{key}: {value}")

    print("\n=== Coverage by City Tier ===")
    print(analyzer.analyze_by_city_tier())

    print("\n=== Opportunity Zones ===")
    opportunities = analyzer.identify_opportunity_zones(min_population=100000)
    print(opportunities[["pincode", "city", "population", "coverage_score"]])


if __name__ == "__main__":
    main()
