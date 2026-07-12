"""End-to-end data pipeline for training and prediction."""

import logging
from pathlib import Path
from typing import Dict

import numpy as np
import pandas as pd

from backend.core.config import EXTERNAL_DATA_DIR, PROCESSED_DATA_DIR, RAW_DATA_DIR
from backend.utils.helpers import clean_platform_name, validate_coordinates

logger = logging.getLogger(__name__)


class DataPipeline:
    """Complete data pipeline from raw data to model-ready features."""

    def __init__(self):
        self.raw_dir = Path(RAW_DATA_DIR)
        self.processed_dir = Path(PROCESSED_DATA_DIR)
        self.external_dir = Path(EXTERNAL_DATA_DIR)

        # Ensure directories exist
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self.external_dir.mkdir(parents=True, exist_ok=True)

    def load_raw_data(self) -> Dict[str, pd.DataFrame]:
        """
        Load all raw data files.

        Returns:
            Dictionary of DataFrames
        """
        logger.info("Loading raw data...")

        data = {}

        # Load PIN codes
        pincode_file = self.raw_dir / "india_pincodes.csv"
        if pincode_file.exists():
            data["pincodes"] = pd.read_csv(pincode_file)
            logger.info(f"Loaded {len(data['pincodes'])} PIN codes")

        # Load orders data
        orders_file = self.raw_dir / "orders_data.csv"
        if orders_file.exists():
            data["orders"] = pd.read_csv(orders_file)
            data["orders"]["order_date"] = pd.to_datetime(data["orders"]["order_date"])
            logger.info(f"Loaded {len(data['orders'])} orders")

        # Load population data
        population_file = self.raw_dir / "population_data.csv"
        if population_file.exists():
            data["population"] = pd.read_csv(population_file)
            logger.info(f"Loaded population data")

        return data

    def load_external_data(self) -> Dict[str, pd.DataFrame]:
        """
        Load external API and scraped data.

        Returns:
            Dictionary of DataFrames
        """
        logger.info("Loading external data...")

        data = {}

        # Load Google Places stores
        stores_file = self.external_dir / "google_places_stores.csv"
        if stores_file.exists():
            data["stores"] = pd.read_csv(stores_file)
            logger.info(f"Loaded {len(data['stores'])} stores")

        # Load coverage data
        coverage_file = self.external_dir / "coverage_data.csv"
        if coverage_file.exists():
            data["coverage"] = pd.read_csv(coverage_file)
            logger.info(f"Loaded coverage data")

        return data

    def clean_data(self, data: Dict[str, pd.DataFrame]) -> Dict[str, pd.DataFrame]:
        """
        Clean and validate all datasets.

        Args:
            data: Dictionary of raw DataFrames

        Returns:
            Dictionary of cleaned DataFrames
        """
        logger.info("Cleaning data...")

        cleaned = {}

        # Clean stores data
        if "stores" in data:
            df = data["stores"].copy()

            # Remove duplicates
            df = df.drop_duplicates(subset=["name", "latitude", "longitude"])

            # Validate coordinates
            df = df[
                df.apply(
                    lambda row: validate_coordinates(row["latitude"], row["longitude"]),
                    axis=1,
                )
            ]

            # Clean platform names
            df["platform"] = df["platform"].apply(clean_platform_name)

            # Remove invalid entries
            df = df[df["latitude"] != 0]
            df = df[df["longitude"] != 0]

            cleaned["stores"] = df
            logger.info(f"Cleaned stores: {len(df)} records")

        # Clean orders data
        if "orders" in data:
            df = data["orders"].copy()

            # Remove invalid orders
            if "order_count" in df.columns:
                df = df[df["order_count"] > 0]
            if "order_date" in df.columns:
                df = df[df["order_date"].notna()]

            # Remove outliers in revenue if column exists
            if "total_revenue" in df.columns:
                df = df[df["total_revenue"] > 0]

            cleaned["orders"] = df
            logger.info(f"Cleaned orders: {len(df)} records")

        # Clean PIN codes
        if "pincodes" in data:
            df = data["pincodes"].copy()

            # Validate PIN code format
            df["pincode"] = df["pincode"].astype(str).str.zfill(6)
            df = df[df["pincode"].str.match(r"^\d{6}$")]

            # Remove duplicates
            df = df.drop_duplicates(subset=["pincode"])

            cleaned["pincodes"] = df
            logger.info(f"Cleaned PIN codes: {len(df)} records")

        # Ensure pincode is string in all datasets
        for key in cleaned:
            if "pincode" in cleaned[key].columns:
                cleaned[key]["pincode"] = (
                    cleaned[key]["pincode"].astype(str).str.zfill(6)
                )

        return cleaned

    def merge_datasets(self, data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """
        Merge all datasets into a single training dataset.

        Args:
            data: Dictionary of cleaned DataFrames

        Returns:
            Merged DataFrame
        """
        logger.info("Merging datasets...")

        # Start with orders as base
        if "orders" not in data:
            raise ValueError("Orders data is required for training")

        df = data["orders"].copy()

        # Add PIN code information
        if "pincodes" in data:
            df = df.merge(
                data["pincodes"][["pincode", "city", "state", "latitude", "longitude"]],
                on="pincode",
                how="left",
            )

        # Add population data
        if "population" in data:
            df = df.merge(
                data["population"][["pincode", "population"]], on="pincode", how="left"
            )

        # Add store coverage information
        if "coverage" in data:
            df = df.merge(
                data["coverage"][["pincode", "coverage_score", "nearest_store_km"]],
                on="pincode",
                how="left",
            )

        logger.info(f"Merged dataset: {len(df)} records")
        return df

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create features for machine learning.

        Args:
            df: Merged DataFrame

        Returns:
            DataFrame with engineered features
        """
        logger.info("Engineering features...")

        features = df.copy()

        # Time-based features
        if "order_date" in features.columns:
            order_dates = pd.to_datetime(features["order_date"])
            features["year"] = order_dates.dt.year
            features["month"] = order_dates.dt.month
            features["day"] = order_dates.dt.day
            features["day_of_week"] = order_dates.dt.dayofweek
            features["day_of_year"] = order_dates.dt.dayofyear
            features["week_of_year"] = order_dates.dt.isocalendar().week  # type: ignore
            features["quarter"] = order_dates.dt.quarter

            # Is weekend
            features["is_weekend"] = features["day_of_week"].isin([5, 6]).astype(int)

            # Is month end
            features["is_month_end"] = (features["day"] >= 25).astype(int)

            # Hour of day (if timestamp available)
            if order_dates.dt.hour.notna().any():
                features["hour"] = order_dates.dt.hour
                features["is_peak_hour"] = (
                    features["hour"].isin([12, 13, 19, 20, 21]).astype(int)
                )

        # Location-based features
        if "population" in features.columns:
            features["population_density"] = features["population"] / 1000
            features["log_population"] = np.log1p(features["population"])

        # City tier encoding
        if "city_tier" in features.columns:
            tier_mapping = {"Metro": 4, "Tier1": 3, "Tier2": 2, "Tier3": 1}
            features["tier_score"] = features["city_tier"].map(tier_mapping)

        # Platform encoding
        if "platform" in features.columns:
            features = pd.get_dummies(features, columns=["platform"], prefix="platform")

        # Lag features (for time series)
        if "order_count" in features.columns:
            features = features.sort_values("order_date")
            features["order_count_lag1"] = features.groupby("pincode")[
                "order_count"
            ].shift(1)
            features["order_count_lag7"] = features.groupby("pincode")[
                "order_count"
            ].shift(7)
            features["order_count_lag30"] = features.groupby("pincode")[
                "order_count"
            ].shift(30)

            # Rolling statistics
            features["order_count_rolling_7"] = (
                features.groupby("pincode")["order_count"]
                .rolling(7)
                .mean()
                .reset_index(0, drop=True)
            )
            features["order_count_rolling_30"] = (
                features.groupby("pincode")["order_count"]
                .rolling(30)
                .mean()
                .reset_index(0, drop=True)
            )

        # Coverage features
        if "coverage_score" in features.columns:
            features["has_coverage"] = (features["coverage_score"] > 0).astype(int)
            features["coverage_squared"] = features["coverage_score"] ** 2

        if "nearest_store_km" in features.columns:
            features["is_near_store"] = (features["nearest_store_km"] < 5).astype(int)
            features["log_distance"] = np.log1p(features["nearest_store_km"])

        # Interaction features
        if "population" in features.columns and "coverage_score" in features.columns:
            features["pop_coverage_interaction"] = (
                features["population"] * features["coverage_score"]
            )

        logger.info(f"Engineered features: {features.shape[1]} columns")
        return features

    def save_processed_data(self, df: pd.DataFrame, filename: str):
        """Save processed data to disk."""
        filepath = self.processed_dir / filename
        df.to_csv(filepath, index=False)
        logger.info(f"Saved processed data to {filepath}")

    def validate_data(self, df: pd.DataFrame) -> bool:
        """
        Validate the final dataset before training.
        Fulfills GAP 1.4: Data validation between pipeline stages.
        """
        from pydantic import BaseModel, Field, ValidationError
        
        class RowSchema(BaseModel):
            pincode: str = Field(..., pattern=r"^\d{6}$")
            order_count: float = Field(..., ge=0)
            population: float = Field(..., ge=0)
            nearest_store_km: float = Field(..., ge=0)
            
        logger.info("Validating data schema and constraints...")
        
        # Check for missing critical columns
        required_cols = ["pincode", "order_count", "population", "nearest_store_km"]
        missing = [col for col in required_cols if col not in df.columns]
        if missing:
            logger.error(f"Validation failed: missing columns {missing}")
            return False
            
        # Check for nulls in critical columns
        nulls = df[required_cols].isnull().sum()
        if nulls.any():
            logger.error(f"Validation failed: null values found\n{nulls[nulls > 0]}")
            return False
            
        # Sample check using Pydantic for schema validation
        sample_records = df[required_cols].sample(min(100, len(df))).to_dict("records")
        try:
            for record in sample_records:
                record_dict = {str(k): v for k, v in record.items()}
                RowSchema(**record_dict)
            logger.info("Data validation passed successfully.")
            return True
        except ValidationError as e:
            logger.error(f"Data validation failed on schema check: {e}")
            return False

    def run_pipeline(self) -> pd.DataFrame:
        """
        Run complete data pipeline.

        Returns:
            Model-ready DataFrame
        """
        logger.info("Starting data pipeline...")

        # Load data
        raw_data = self.load_raw_data()
        external_data = self.load_external_data()

        # Combine all data
        all_data = {**raw_data, **external_data}

        # Clean data
        cleaned_data = self.clean_data(all_data)

        # Merge datasets
        merged_df = self.merge_datasets(cleaned_data)

        # Engineer features
        final_df = self.engineer_features(merged_df)

        # Validate data
        if not self.validate_data(final_df):
            raise ValueError("Data validation failed. Halting pipeline to prevent model corruption.")

        # Save processed data
        self.save_processed_data(final_df, "training_data.csv")

        logger.info("Data pipeline completed successfully!")
        return final_df


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(level=logging.INFO)

    # Run pipeline
    pipeline = DataPipeline()
    training_data = pipeline.run_pipeline()

    print(f"\nTraining data shape: {training_data.shape}")
    print(f"\nColumns: {list(training_data.columns)}")
    print(f"\nFirst few rows:\n{training_data.head()}")
