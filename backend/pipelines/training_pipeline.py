"""Complete ML training pipeline with model selection and evaluation."""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from prophet import Prophet
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit, cross_val_score, train_test_split
from sklearn.preprocessing import RobustScaler, StandardScaler

from backend.core.config import PROCESSED_DATA_DIR
from backend.pipelines.data_pipeline import DataPipeline

logger = logging.getLogger(__name__)


class ModelTrainer:
    """Train and evaluate multiple ML models."""

    def __init__(self, model_dir: str = "models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

        self.models = {}
        self.scalers = {}
        self.feature_names = []
        self.best_model = None
        self.best_model_name = None
        self.metrics = {}

    def prepare_data(
        self,
        df: pd.DataFrame,
        target_col: str,
        test_size: float = 0.2,
        time_series: bool = False,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Prepare data for training.

        Args:
            df: Input DataFrame
            target_col: Target column name
            test_size: Test set size
            time_series: Use time series split

        Returns:
            X_train, X_test, y_train, y_test
        """
        logger.info("Preparing data for training...")

        # Separate features and target
        y = df[target_col]
        X = df.drop(columns=[target_col])

        # Remove non-numeric columns
        numeric_cols = X.select_dtypes(include=[np.number]).columns
        X = X[numeric_cols]

        # Handle missing values
        X = X.fillna(X.median())

        # Store feature names
        self.feature_names = X.columns.tolist()

        # Split data
        if time_series:
            # Use time series split for temporal data
            split_idx = int(len(X) * (1 - test_size))
            X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
            y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        else:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )

        logger.info(f"Training set: {X_train.shape}, Test set: {X_test.shape}")

        return X_train, X_test, y_train, y_test

    def scale_features(
        self, X_train: pd.DataFrame, X_test: pd.DataFrame, scaler_type: str = "standard"
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Scale features.

        Args:
            X_train: Training features
            X_test: Test features
            scaler_type: Type of scaler ('standard' or 'robust')

        Returns:
            Scaled X_train, X_test
        """
        if scaler_type == "standard":
            scaler = StandardScaler()
        elif scaler_type == "robust":
            scaler = RobustScaler()
        else:
            raise ValueError(f"Unknown scaler type: {scaler_type}")

        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        self.scalers[scaler_type] = scaler

        return X_train_scaled, X_test_scaled

    def train_random_forest(
        self, X_train: np.ndarray, y_train: pd.Series, **kwargs
    ) -> RandomForestRegressor:
        """Train Random Forest model."""
        logger.info("Training Random Forest...")

        model = RandomForestRegressor(
            n_estimators=kwargs.get("n_estimators", 100),
            max_depth=kwargs.get("max_depth", 10),
            min_samples_split=kwargs.get("min_samples_split", 5),
            random_state=42,
            n_jobs=-1,
        )

        model.fit(X_train, y_train)
        self.models["random_forest"] = model

        return model

    def train_xgboost(
        self, X_train: np.ndarray, y_train: pd.Series, **kwargs
    ) -> xgb.XGBRegressor:
        """Train XGBoost model."""
        logger.info("Training XGBoost...")

        model = xgb.XGBRegressor(
            n_estimators=kwargs.get("n_estimators", 100),
            max_depth=kwargs.get("max_depth", 6),
            learning_rate=kwargs.get("learning_rate", 0.1),
            random_state=42,
            n_jobs=-1,
        )

        model.fit(X_train, y_train)
        self.models["xgboost"] = model

        return model

    def train_gradient_boosting(
        self, X_train: np.ndarray, y_train: pd.Series, **kwargs
    ) -> GradientBoostingRegressor:
        """Train Gradient Boosting model."""
        logger.info("Training Gradient Boosting...")

        model = GradientBoostingRegressor(
            n_estimators=kwargs.get("n_estimators", 100),
            max_depth=kwargs.get("max_depth", 5),
            learning_rate=kwargs.get("learning_rate", 0.1),
            random_state=42,
        )

        model.fit(X_train, y_train)
        self.models["gradient_boosting"] = model

        return model

    def evaluate_model(
        self, model: Any, X_test: np.ndarray, y_test: pd.Series, model_name: str
    ) -> Dict[str, float]:
        """
        Evaluate model performance.

        Args:
            model: Trained model
            X_test: Test features
            y_test: Test target
            model_name: Name of the model

        Returns:
            Dictionary of metrics
        """
        logger.info(f"Evaluating {model_name}...")

        # Make predictions
        y_pred = model.predict(X_test)

        # Calculate metrics
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        # Calculate MAPE (Mean Absolute Percentage Error)
        mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

        metrics = {"mse": mse, "rmse": rmse, "mae": mae, "r2": r2, "mape": mape}

        self.metrics[model_name] = metrics

        logger.info(f"{model_name} - R²: {r2:.4f}, RMSE: {rmse:.4f}, MAE: {mae:.4f}")

        return metrics

    def train_all_models(
        self,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: pd.Series,
        y_test: pd.Series,
    ) -> Dict[str, Dict[str, float]]:
        """
        Train and evaluate all models.

        Returns:
            Dictionary of all metrics
        """
        logger.info("Training all models...")

        all_metrics = {}

        # Train Random Forest
        rf_model = self.train_random_forest(X_train, y_train)
        all_metrics["random_forest"] = self.evaluate_model(
            rf_model, X_test, y_test, "random_forest"
        )

        # Train XGBoost
        xgb_model = self.train_xgboost(X_train, y_train)
        all_metrics["xgboost"] = self.evaluate_model(
            xgb_model, X_test, y_test, "xgboost"
        )

        # Train Gradient Boosting
        gb_model = self.train_gradient_boosting(X_train, y_train)
        all_metrics["gradient_boosting"] = self.evaluate_model(
            gb_model, X_test, y_test, "gradient_boosting"
        )

        # Select best model based on R²
        best_model_name = max(all_metrics, key=lambda k: all_metrics[k]["r2"])
        self.best_model_name = best_model_name
        self.best_model = self.models[best_model_name]

        logger.info(
            f"Best model: {best_model_name} (R² = {all_metrics[best_model_name]['r2']:.4f})"
        )

        return all_metrics

    def get_feature_importance(self, top_n: int = 20) -> pd.DataFrame:
        """Get feature importance from best model."""
        if self.best_model is None:
            raise ValueError("No model trained yet")

        if hasattr(self.best_model, "feature_importances_"):
            importance_df = (
                pd.DataFrame(
                    {
                        "feature": self.feature_names,
                        "importance": self.best_model.feature_importances_,
                    }
                )
                .sort_values("importance", ascending=False)
                .head(top_n)
            )

            return importance_df
        else:
            return None

    def save_models(self, version: str = None):
        """Save all trained models."""
        if version is None:
            version = datetime.now().strftime("%Y%m%d_%H%M%S")

        version_dir = self.model_dir / version
        version_dir.mkdir(parents=True, exist_ok=True)

        # Save all models
        for name, model in self.models.items():
            model_path = version_dir / f"{name}.joblib"
            joblib.dump(model, model_path)
            logger.info(f"Saved {name} to {model_path}")

        # Save scalers
        for name, scaler in self.scalers.items():
            scaler_path = version_dir / f"scaler_{name}.joblib"
            joblib.dump(scaler, scaler_path)

        # Save metadata
        metadata = {
            "version": version,
            "timestamp": datetime.now().isoformat(),
            "best_model": self.best_model_name,
            "feature_names": self.feature_names,
            "metrics": self.metrics,
        }

        metadata_path = version_dir / "metadata.json"
        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Saved metadata to {metadata_path}")

    def load_models(self, version: str):
        """Load trained models."""
        version_dir = self.model_dir / version

        if not version_dir.exists():
            raise ValueError(f"Version {version} not found")

        # Load metadata
        metadata_path = version_dir / "metadata.json"
        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        self.best_model_name = metadata["best_model"]
        self.feature_names = metadata["feature_names"]
        self.metrics = metadata["metrics"]

        # Load models
        for model_file in version_dir.glob("*.joblib"):
            if "scaler" in model_file.name:
                scaler_name = model_file.stem.replace("scaler_", "")
                self.scalers[scaler_name] = joblib.load(model_file)
            else:
                model_name = model_file.stem
                self.models[model_name] = joblib.load(model_file)

        self.best_model = self.models[self.best_model_name]

        logger.info(f"Loaded models from version {version}")


class TrainingPipeline:
    """Complete training pipeline."""

    def __init__(self):
        self.data_pipeline = DataPipeline()
        self.model_trainer = ModelTrainer()

    def run(
        self,
        target_col: str = "order_count",
        test_size: float = 0.2,
        time_series: bool = False,
    ) -> Dict[str, Any]:
        """
        Run complete training pipeline.

        Args:
            target_col: Target column to predict
            test_size: Test set size
            time_series: Use time series split

        Returns:
            Dictionary with results
        """
        logger.info("Starting training pipeline...")

        # Step 1: Run data pipeline
        training_data = self.data_pipeline.run_pipeline()

        # Step 2: Prepare data
        X_train, X_test, y_train, y_test = self.model_trainer.prepare_data(
            training_data, target_col, test_size, time_series
        )

        # Step 3: Scale features
        X_train_scaled, X_test_scaled = self.model_trainer.scale_features(
            X_train, X_test
        )

        # Step 4: Train all models
        metrics = self.model_trainer.train_all_models(
            X_train_scaled, X_test_scaled, y_train, y_test
        )

        # Step 5: Get feature importance
        feature_importance = self.model_trainer.get_feature_importance()

        # Step 6: Save models
        self.model_trainer.save_models()

        logger.info("Training pipeline completed!")

        return {
            "metrics": metrics,
            "feature_importance": feature_importance,
            "best_model": self.model_trainer.best_model_name,
        }


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run training pipeline
    pipeline = TrainingPipeline()
    results = pipeline.run()

    print("\n" + "=" * 50)
    print("TRAINING RESULTS")
    print("=" * 50)
    print(f"\nBest Model: {results['best_model']}")
    print("\nMetrics:")
    for model, metrics in results["metrics"].items():
        print(f"\n{model}:")
        for metric, value in metrics.items():
            print(f"  {metric}: {value:.4f}")

    if results["feature_importance"] is not None:
        print("\nTop 10 Features:")
        print(results["feature_importance"].head(10))
