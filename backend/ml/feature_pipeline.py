"""Feature Pipeline with MLflow Logging.

This module wraps feature engineering with comprehensive logging to MLflow
for reproducibility and documentation.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import RobustScaler, StandardScaler

from backend.ml.experiment_tracker import ExperimentTracker

logger = logging.getLogger(__name__)


class FeaturePipeline:
    """Feature engineering pipeline with MLflow logging.

    Wraps feature engineering operations and logs all transformations,
    statistics, and artifacts to MLflow for reproducibility.
    """

    def __init__(self, tracker: Optional[ExperimentTracker] = None):
        """Initialize feature pipeline.

        Args:
            tracker: ExperimentTracker for logging (optional)
        """
        self.tracker = tracker
        self.scaler = None
        self.feature_names = None
        self.raw_columns = None
        self.engineered_features = None
        self.transformations = []

        logger.info("FeaturePipeline initialized")

    def log_raw_features(self, df: pd.DataFrame) -> None:
        """Log raw input columns.

        Args:
            df: Input DataFrame
        """
        try:
            self.raw_columns = list(df.columns)

            raw_features_info = {
                "columns": self.raw_columns,
                "count": len(self.raw_columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            }

            if self.tracker:
                self.tracker.log_dict(raw_features_info, "raw_features.json")
                self.tracker.log_param("raw_feature_count", len(self.raw_columns))

            logger.info(f"Logged {len(self.raw_columns)} raw features")

        except Exception as e:
            logger.error(f"Failed to log raw features: {e}")
            raise

    def log_engineered_features(self, df: pd.DataFrame) -> None:
        """Log engineered features.

        Args:
            df: DataFrame with engineered features
        """
        try:
            self.engineered_features = [
                col for col in df.columns if col not in self.raw_columns
            ]

            engineered_info = {
                "features": self.engineered_features,
                "count": len(self.engineered_features),
            }

            if self.tracker:
                self.tracker.log_dict(engineered_info, "engineered_features.json")
                self.tracker.log_param(
                    "engineered_feature_count", len(self.engineered_features)
                )

            logger.info(f"Logged {len(self.engineered_features)} engineered features")

        except Exception as e:
            logger.error(f"Failed to log engineered features: {e}")
            raise

    def log_transformations(self, transformation: str, details: Dict[str, Any]) -> None:
        """Log a feature transformation.

        Args:
            transformation: Name of the transformation
            details: Dictionary with transformation details
        """
        try:
            transform_record = {"transformation": transformation, "details": details}

            self.transformations.append(transform_record)

            if self.tracker:
                self.tracker.log_dict(
                    {"transformations": self.transformations},
                    "feature_transformations.json",
                )

            logger.debug(f"Logged transformation: {transformation}")

        except Exception as e:
            logger.error(f"Failed to log transformation: {e}")
            raise

    def log_scaling_method(self, method: str, scaler: Any) -> None:
        """Log feature scaling method and fitted scaler.

        Args:
            method: Scaling method name
            scaler: Fitted scaler object
        """
        try:
            self.scaler = scaler

            if self.tracker:
                self.tracker.log_param("scaling_method", method)

                # Save scaler as artifact
                import joblib

                temp_path = Path("/tmp/scaler.joblib")
                joblib.dump(scaler, temp_path)
                self.tracker.log_artifact(str(temp_path), artifact_path="scalers")
                temp_path.unlink()

            logger.info(f"Logged scaling method: {method}")

        except Exception as e:
            logger.error(f"Failed to log scaling method: {e}")
            raise

    def log_missing_value_strategy(
        self, strategy: str, details: Dict[str, Any]
    ) -> None:
        """Log missing value handling strategy.

        Args:
            strategy: Strategy name (median, mean, forward_fill, etc.)
            details: Dictionary with strategy details
        """
        try:
            if self.tracker:
                self.tracker.log_param("missing_value_strategy", strategy)
                self.tracker.log_dict(details, "missing_value_handling.json")

            logger.info(f"Logged missing value strategy: {strategy}")

        except Exception as e:
            logger.error(f"Failed to log missing value strategy: {e}")
            raise

    def log_train_test_split(
        self, test_size: float, random_seed: int, time_series_split: bool = False
    ) -> None:
        """Log train-test split configuration.

        Args:
            test_size: Proportion of test set
            random_seed: Random seed for reproducibility
            time_series_split: Whether time series splitting was used
        """
        try:
            split_config = {
                "test_size": test_size,
                "train_size": 1 - test_size,
                "random_seed": random_seed,
                "time_series_split": time_series_split,
            }

            if self.tracker:
                self.tracker.log_params(split_config)

            logger.info(f"Logged train-test split: test_size={test_size}")

        except Exception as e:
            logger.error(f"Failed to log train-test split: {e}")
            raise

    def calculate_and_log_statistics(
        self, df: pd.DataFrame, dataset_name: str = "train"
    ) -> None:
        """Calculate and log feature statistics.

        Args:
            df: DataFrame with features
            dataset_name: Name of the dataset
        """
        try:
            # Select numeric columns
            numeric_cols = df.select_dtypes(include=[np.number]).columns

            stats = {}
            for col in numeric_cols:
                stats[col] = {
                    "mean": float(df[col].mean()),
                    "std": float(df[col].std()),
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "q25": float(df[col].quantile(0.25)),
                    "q50": float(df[col].quantile(0.50)),
                    "q75": float(df[col].quantile(0.75)),
                    "missing_count": int(df[col].isna().sum()),
                    "missing_pct": float(df[col].isna().sum() / len(df) * 100),
                }

            if self.tracker:
                self.tracker.log_dict(stats, f"{dataset_name}_feature_statistics.json")

            logger.info(f"Logged statistics for {len(numeric_cols)} features")

        except Exception as e:
            logger.error(f"Failed to log statistics: {e}")
            raise

    def calculate_and_log_correlation(
        self, df: pd.DataFrame, target_col: Optional[str] = None
    ) -> None:
        """Calculate and log feature correlation matrix.

        Args:
            df: DataFrame with features
            target_col: Target column name (optional)
        """
        try:
            # Select numeric columns
            numeric_cols = df.select_dtypes(include=[np.number]).columns

            if len(numeric_cols) == 0:
                logger.warning("No numeric columns for correlation calculation")
                return

            # Calculate correlation matrix
            corr_matrix = df[numeric_cols].corr()

            # Save as CSV
            if self.tracker:
                self.tracker.log_dataset(corr_matrix, "correlation_matrix.csv")

            # Generate heatmap
            self._plot_correlation_heatmap(corr_matrix)

            # Log top correlations with target if provided
            if target_col and target_col in corr_matrix.columns:
                target_corr = corr_matrix[target_col].sort_values(ascending=False)
                target_corr_dict = target_corr.to_dict()

                if self.tracker:
                    self.tracker.log_dict(
                        {"target_correlations": target_corr_dict},
                        "target_correlations.json",
                    )

            logger.info("Logged correlation matrix and heatmap")

        except Exception as e:
            logger.error(f"Failed to log correlation: {e}")
            raise

    def _plot_correlation_heatmap(
        self, corr_matrix: pd.DataFrame, top_n: int = 30
    ) -> None:
        """Generate correlation heatmap.

        Args:
            corr_matrix: Correlation matrix
            top_n: Number of top features to show
        """
        try:
            # Select top N features by variance
            if len(corr_matrix) > top_n:
                variances = corr_matrix.var().sort_values(ascending=False)
                top_features = variances.head(top_n).index
                corr_subset = corr_matrix.loc[top_features, top_features]
            else:
                corr_subset = corr_matrix

            # Create heatmap
            fig, ax = plt.subplots(figsize=(12, 10))
            sns.heatmap(
                corr_subset,
                annot=False,
                cmap="coolwarm",
                center=0,
                square=True,
                linewidths=0.5,
                cbar_kws={"shrink": 0.8},
                ax=ax,
            )
            ax.set_title("Feature Correlation Heatmap")
            plt.tight_layout()

            if self.tracker:
                self.tracker.log_figure(fig, "correlation_heatmap.png")

            plt.close(fig)

        except Exception as e:
            logger.error(f"Failed to plot correlation heatmap: {e}")
            raise

    def log_outlier_removal(
        self, before_count: int, after_count: int, method: str
    ) -> None:
        """Log outlier detection and removal.

        Args:
            before_count: Number of samples before removal
            after_count: Number of samples after removal
            method: Outlier detection method
        """
        try:
            outlier_info = {
                "method": method,
                "before_count": before_count,
                "after_count": after_count,
                "removed_count": before_count - after_count,
                "removed_pct": (before_count - after_count) / before_count * 100,
            }

            if self.tracker:
                self.tracker.log_dict(outlier_info, "outlier_removal.json")
                self.tracker.log_metric("outliers_removed", before_count - after_count)

            logger.info(
                f"Logged outlier removal: {before_count - after_count} samples removed"
            )

        except Exception as e:
            logger.error(f"Failed to log outlier removal: {e}")
            raise

    def prepare_features(
        self,
        df: pd.DataFrame,
        target_col: str,
        test_size: float = 0.2,
        random_seed: int = 42,
        scaling_method: str = "standard",
        handle_missing: str = "median",
        time_series_split: bool = False,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str]]:
        """Prepare features for training with logging.

        Args:
            df: Input DataFrame
            target_col: Target column name
            test_size: Test set proportion
            random_seed: Random seed
            scaling_method: Scaling method (standard, robust, none)
            handle_missing: Missing value strategy
            time_series_split: Use chronological split instead of random

        Returns:
            Tuple of (X_train, X_test, y_train, y_test, feature_names)
        """
        try:
            # Log raw features
            self.log_raw_features(df)

            # Separate features and target
            X = df.drop(columns=[target_col])
            y = df[target_col]

            # Handle missing values
            if handle_missing == "median":
                X = X.fillna(X.median())
                self.log_missing_value_strategy("median", {"columns": list(X.columns)})
            elif handle_missing == "mean":
                X = X.fillna(X.mean())
                self.log_missing_value_strategy("mean", {"columns": list(X.columns)})
            elif handle_missing == "forward_fill":
                X = X.fillna(method="ffill")
                self.log_missing_value_strategy(
                    "forward_fill", {"columns": list(X.columns)}
                )

            # Store feature names
            self.feature_names = list(X.columns)

            # Train-test split (chronological for time series)
            if time_series_split and "order_date" in X.columns:
                sort_idx = X["order_date"].argsort()
                X = X.iloc[sort_idx]
                y = y.iloc[sort_idx]
                split_idx = int(len(X) * (1 - test_size))
                X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
                y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
                self.log_train_test_split(test_size, random_seed, time_series_split=True)
            else:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=test_size, random_state=random_seed
                )
                self.log_train_test_split(test_size, random_seed)

            # Log dataset sizes
            if self.tracker:
                self.tracker.log_params(
                    {
                        "train_samples": len(X_train),
                        "test_samples": len(X_test),
                        "total_samples": len(X),
                        "feature_count": len(self.feature_names),
                    }
                )

            # Calculate and log statistics
            train_df = pd.DataFrame(X_train, columns=self.feature_names)
            self.calculate_and_log_statistics(train_df, "train")

            # Calculate and log correlation
            train_with_target = train_df.copy()
            train_with_target[target_col] = y_train.values
            self.calculate_and_log_correlation(train_with_target, target_col)

            # Apply scaling
            if scaling_method == "standard":
                scaler = StandardScaler()
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                self.log_scaling_method("standard", scaler)
            elif scaling_method == "robust":
                scaler = RobustScaler()
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                self.log_scaling_method("robust", scaler)
            else:
                X_train_scaled = X_train.values
                X_test_scaled = X_test.values
                self.log_scaling_method("none", None)

            logger.info("Feature preparation completed")

            return (
                X_train_scaled,
                X_test_scaled,
                y_train.values,
                y_test.values,
                self.feature_names,
            )

        except Exception as e:
            logger.error(f"Failed to prepare features: {e}")
            raise
