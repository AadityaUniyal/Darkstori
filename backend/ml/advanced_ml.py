"""Advanced machine learning models for dark store intelligence."""

import logging
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.cluster import DBSCAN
from sklearn.ensemble import GradientBoostingClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


class DemandPredictor:
    """Advanced demand prediction using ensemble methods."""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare features for demand prediction.

        Args:
            df: DataFrame with order data

        Returns:
            DataFrame with engineered features
        """
        features = df.copy()

        # Time-based features
        if "order_date" in features.columns:
            features["order_date"] = pd.to_datetime(features["order_date"])
            features["day_of_week"] = features["order_date"].dt.dayofweek
            features["day_of_month"] = features["order_date"].dt.day
            features["month"] = features["order_date"].dt.month
            features["is_weekend"] = features["day_of_week"].isin([5, 6]).astype(int)
            features["hour"] = features["order_date"].dt.hour
            features["is_peak_hour"] = (
                features["hour"].isin([12, 13, 19, 20, 21]).astype(int)
            )

        # Location-based features
        if "population" in features.columns:
            features["population_density"] = features["population"] / 1000

        # Platform features
        if "platform" in features.columns:
            features = pd.get_dummies(features, columns=["platform"], prefix="platform")

        # City tier features
        if "city_tier" in features.columns:
            tier_mapping = {"Metro": 4, "Tier1": 3, "Tier2": 2, "Tier3": 1}
            features["tier_score"] = features["city_tier"].map(tier_mapping)

        # Lag features (if time series)
        if "order_count" in features.columns:
            features["order_count_lag1"] = features["order_count"].shift(1)
            features["order_count_lag7"] = features["order_count"].shift(7)
            features["order_count_rolling_7"] = (
                features["order_count"].rolling(7).mean()
            )

        return features

    def train(self, X: pd.DataFrame, y: pd.Series, model_type: str = "xgboost") -> Dict:
        """
        Train demand prediction model.

        Args:
            X: Feature matrix
            y: Target variable (order count or revenue)
            model_type: Type of model ('xgboost', 'random_forest', 'gradient_boosting')

        Returns:
            Dictionary with training metrics
        """
        # Store feature names
        self.feature_names = X.columns.tolist()

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train model
        if model_type == "xgboost":
            self.model = xgb.XGBRegressor(
                n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42
            )
        elif model_type == "random_forest":
            self.model = RandomForestRegressor(
                n_estimators=100, max_depth=10, random_state=42
            )
        elif model_type == "gradient_boosting":
            from sklearn.ensemble import GradientBoostingRegressor

            self.model = GradientBoostingRegressor(
                n_estimators=100, max_depth=6, learning_rate=0.1, random_state=42
            )

        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        # Cross-validation
        cv_scores = cross_val_score(
            self.model, X_train_scaled, y_train, cv=5, scoring="r2"
        )

        metrics = {
            "mse": mse,
            "rmse": np.sqrt(mse),
            "r2": r2,
            "cv_mean": cv_scores.mean(),
            "cv_std": cv_scores.std(),
        }

        logger.info(f"Model trained: {model_type}")
        logger.info(f"R² Score: {r2:.4f}")
        logger.info(f"RMSE: {np.sqrt(mse):.4f}")

        return metrics

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Make predictions."""
        if self.model is None:
            raise ValueError("Model not trained yet")

        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)

    def get_feature_importance(self) -> pd.DataFrame:
        """Get feature importance."""
        if self.model is None:
            raise ValueError("Model not trained yet")

        if hasattr(self.model, "feature_importances_"):
            importance = pd.DataFrame(
                {
                    "feature": self.feature_names,
                    "importance": self.model.feature_importances_,
                }
            ).sort_values("importance", ascending=False)

            return importance
        else:
            return None

    def save_model(self, filepath: str):
        """Save model to disk."""
        joblib.dump(
            {
                "model": self.model,
                "scaler": self.scaler,
                "feature_names": self.feature_names,
            },
            filepath,
        )
        logger.info(f"Model saved to {filepath}")

    def load_model(self, filepath: str):
        """Load model from disk."""
        data = joblib.load(filepath)
        self.model = data["model"]
        self.scaler = data["scaler"]
        self.feature_names = data["feature_names"]
        logger.info(f"Model loaded from {filepath}")


class ChurnPredictor:
    """Predict customer churn using classification."""

    def __init__(self):
        self.model = GradientBoostingClassifier(
            n_estimators=100, max_depth=5, random_state=42
        )
        self.scaler = StandardScaler()

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for churn prediction."""
        features = df.copy()

        # RFM features
        if "last_order_days" in features.columns:
            features["recency_score"] = pd.cut(
                features["last_order_days"],
                bins=[0, 7, 30, 90, 365],
                labels=[4, 3, 2, 1],
            ).astype(int)

        if "order_count" in features.columns:
            features["frequency_score"] = pd.cut(
                features["order_count"], bins=[0, 5, 10, 20, 100], labels=[1, 2, 3, 4]
            ).astype(int)

        if "total_revenue" in features.columns:
            features["monetary_score"] = pd.cut(
                features["total_revenue"],
                bins=[0, 1000, 5000, 10000, 100000],
                labels=[1, 2, 3, 4],
            ).astype(int)

        # Behavioral features
        if "avg_order_value" in features.columns:
            features["aov_trend"] = features.groupby("customer_id")[
                "avg_order_value"
            ].pct_change()

        return features

    def train(self, X: pd.DataFrame, y: pd.Series) -> Dict:
        """Train churn prediction model."""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        self.model.fit(X_train_scaled, y_train)

        y_pred = self.model.predict(X_test_scaled)

        report = classification_report(y_test, y_pred, output_dict=True)

        return report

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Predict churn probability."""
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)[:, 1]


class GeospatialClustering:
    """Advanced geospatial clustering for optimal store placement."""

    def __init__(self, eps_km: float = 5.0, min_samples: int = 3):
        """
        Initialize DBSCAN clustering.

        Args:
            eps_km: Maximum distance between points in km
            min_samples: Minimum samples in a cluster
        """
        # Convert km to degrees (approximate)
        self.eps = eps_km / 111.0  # 1 degree ≈ 111 km
        self.min_samples = min_samples
        self.model = DBSCAN(eps=self.eps, min_samples=min_samples)

    def fit_predict(self, coordinates: np.ndarray) -> np.ndarray:
        """
        Cluster geographic coordinates.

        Args:
            coordinates: Array of [latitude, longitude] pairs

        Returns:
            Cluster labels
        """
        labels = self.model.fit_predict(coordinates)
        return labels

    def identify_optimal_locations(
        self,
        demand_points: pd.DataFrame,
        existing_stores: pd.DataFrame,
        n_new_stores: int = 10,
    ) -> pd.DataFrame:
        """
        Identify optimal locations for new stores.

        Args:
            demand_points: DataFrame with demand data (lat, lng, demand)
            existing_stores: DataFrame with existing store locations
            n_new_stores: Number of new stores to recommend

        Returns:
            DataFrame with recommended locations
        """
        # Cluster demand points
        coords = demand_points[["latitude", "longitude"]].values
        labels = self.fit_predict(coords)

        demand_points["cluster"] = labels

        # Calculate cluster centroids and demand
        cluster_stats = (
            demand_points.groupby("cluster")
            .agg(
                {
                    "latitude": "mean",
                    "longitude": "mean",
                    "demand": "sum",
                    "population": "sum",
                }
            )
            .reset_index()
        )

        # Filter out noise (-1 label)
        cluster_stats = cluster_stats[cluster_stats["cluster"] != -1]

        # Calculate distance to nearest existing store
        def min_distance_to_store(row):
            distances = []
            for _, store in existing_stores.iterrows():
                dist = self._haversine_distance(
                    row["latitude"],
                    row["longitude"],
                    store["latitude"],
                    store["longitude"],
                )
                distances.append(dist)
            return min(distances) if distances else float("inf")

        cluster_stats["distance_to_nearest_store"] = cluster_stats.apply(
            min_distance_to_store, axis=1
        )

        # Score clusters
        cluster_stats["opportunity_score"] = (
            cluster_stats["demand"] * 0.4
            + cluster_stats["population"] / 1000 * 0.3
            + cluster_stats["distance_to_nearest_store"] * 0.3
        )

        # Get top recommendations
        recommendations = cluster_stats.nlargest(n_new_stores, "opportunity_score")

        return recommendations

    @staticmethod
    def _haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two points using Haversine formula."""
        from math import atan2, cos, radians, sin, sqrt

        R = 6371  # Earth radius in km

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c
