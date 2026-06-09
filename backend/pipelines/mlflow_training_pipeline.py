"""MLflow-Integrated Training Pipeline.

This module wraps the existing training pipeline with comprehensive MLflow
tracking for experiment management, model versioning, and reproducibility.
"""

import logging
import platform
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from mlflow.models.signature import infer_signature
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from xgboost import XGBRegressor

from backend.ml.evaluation_engine import EvaluationEngine
from backend.ml.experiment_tracker import ExperimentTracker
from backend.ml.feature_pipeline import FeaturePipeline
from backend.ml.mlflow_config import get_ml_config
from backend.ml.model_registry import ModelRegistry

logger = logging.getLogger(__name__)


class MLflowTrainingPipeline:
    """Training pipeline with MLflow integration.

    Wraps model training with comprehensive experiment tracking, evaluation,
    and model registration.
    """

    def __init__(self, experiment_name: str = "demand_forecasting"):
        """Initialize MLflow training pipeline.

        Args:
            experiment_name: Name of the MLflow experiment
        """
        self.experiment_name = experiment_name
        self.tracker = ExperimentTracker(experiment_name)
        self.registry = ModelRegistry()
        self.evaluator = EvaluationEngine(self.tracker)
        self.feature_pipeline = FeaturePipeline(self.tracker)

        # Load configuration
        self.config = get_ml_config()

        logger.info(
            f"MLflowTrainingPipeline initialized for experiment: {experiment_name}"
        )

    def run(
        self,
        df: pd.DataFrame,
        target_col: str = "order_count",
        test_size: float = 0.2,
        model_types: Optional[List[str]] = None,
        time_series_split: bool = False,
    ) -> Dict[str, Any]:
        """Run complete training pipeline with MLflow tracking.

        Args:
            df: Input DataFrame
            target_col: Target column name
            test_size: Test set proportion
            model_types: List of model types to train (default: all)

        Returns:
            Dictionary with training results
        """
        try:
            start_time = time.time()

            # Default to all model types
            if model_types is None:
                model_types = ["xgboost", "random_forest", "gradient_boosting"]

            # Start a parent run so FeaturePipeline logging has an active run
            self.tracker.start_run(
                run_name="feature_engineering",
                tags={"stage": "feature_preparation"},
            )

            # Prepare features
            logger.info("Preparing features...")
            X_train, X_test, y_train, y_test, feature_names = (
                self.feature_pipeline.prepare_features(
                    df=df,
                    target_col=target_col,
                    test_size=test_size,
                    random_seed=self.config.training.data.random_seed,
                    scaling_method=self.config.training.feature_engineering.scaling_method,
                    handle_missing=self.config.training.feature_engineering.missing_value_strategy,
                    time_series_split=time_series_split,
                )
            )

            # End feature engineering run before model training runs
            self.tracker.end_run()

            # Train all models
            results = {}
            for model_type in model_types:
                logger.info(f"Training {model_type}...")
                result = self.train_model(
                    model_type=model_type,
                    X_train=X_train,
                    X_test=X_test,
                    y_train=y_train,
                    y_test=y_test,
                    feature_names=feature_names,
                )
                results[model_type] = result

            # Select best model
            best_model_type = max(results.keys(), key=lambda k: results[k]["test_r2"])
            best_result = results[best_model_type]

            # Training duration
            training_duration = time.time() - start_time

            # Summary
            summary = {
                "best_model_type": best_model_type,
                "best_r2_score": best_result["test_r2"],
                "run_id": best_result.get("run_id"),
                "training_duration_seconds": training_duration,
                "models_trained": len(results),
                "results": results,
            }

            logger.info(
                f"Training completed. Best model: {best_model_type} (R²={best_result['test_r2']:.4f})"
            )

            return summary

        except Exception as e:
            logger.error(f"Training pipeline failed: {e}")
            raise

    def train_model(
        self,
        model_type: str,
        X_train: np.ndarray,
        X_test: np.ndarray,
        y_train: np.ndarray,
        y_test: np.ndarray,
        feature_names: List[str],
        hyperparams: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Train a single model with MLflow tracking.

        Args:
            model_type: Type of model (xgboost, random_forest, gradient_boosting)
            X_train: Training features
            X_test: Test features
            y_train: Training targets
            y_test: Test targets
            feature_names: List of feature names
            hyperparams: Hyperparameters (uses config if not provided)

        Returns:
            Dictionary with training results
        """
        try:
            # Start MLflow run
            run_name = f"{model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            self.tracker.start_run(
                run_name=run_name,
                tags={
                    "model_type": model_type,
                    "training_date": datetime.now().isoformat(),
                },
            )

            # Get hyperparameters
            if hyperparams is None:
                hyperparams = self._get_default_hyperparams(model_type)

            # Log hyperparameters
            self.tracker.log_params(hyperparams)

            # Log dataset metadata
            self.tracker.log_params(
                {
                    "train_samples": len(X_train),
                    "test_samples": len(X_test),
                    "feature_count": len(feature_names),
                    "target_column": "order_count",
                }
            )

            # Log system metadata
            self.tracker.log_params(
                {
                    "python_version": platform.python_version(),
                    "platform": platform.system(),
                }
            )

            # Create and train model
            start_time = time.time()
            model = self._create_model(model_type, hyperparams)
            model.fit(X_train, y_train)
            training_time = time.time() - start_time

            self.tracker.log_metric("training_duration_seconds", training_time)

            # Make predictions
            y_train_pred = model.predict(X_train)
            y_test_pred = model.predict(X_test)

            # Evaluate on training set
            train_metrics = self.evaluator.evaluate_regression(
                y_train, y_train_pred, "train"
            )

            # Evaluate on test set
            test_metrics = self.evaluator.evaluate_regression(
                y_test, y_test_pred, "test"
            )

            # Calculate residuals
            self.evaluator.calculate_residuals(y_test, y_test_pred)

            # Generate plots
            feature_importance = self._get_feature_importance(model, feature_names)
            self.evaluator.generate_plots(y_test, y_test_pred, feature_importance)

            # Log feature importance
            if feature_importance is not None:
                self.tracker.log_dataset(feature_importance, "feature_importance.csv")

            # Create model signature
            X_train_df = pd.DataFrame(X_train, columns=feature_names)
            signature = infer_signature(X_train_df, y_train_pred)

            # Log model
            self.tracker.log_model(
                model=model,
                artifact_path="model",
                signature=signature,
                input_example=X_train_df.head(5),
            )

            # Tag if high accuracy
            if test_metrics["test_r2"] >= 0.85:
                self.tracker.set_tag("high_accuracy", "true")

            # Capture run_id before end_run() clears it
            run_id = self.tracker.run_id

            # End run
            self.tracker.end_run()

            # Return results
            result = {
                "model_type": model_type,
                "run_id": run_id,
                "train_r2": train_metrics["train_r2"],
                "test_r2": test_metrics["test_r2"],
                "train_rmse": train_metrics["train_rmse"],
                "test_rmse": test_metrics["test_rmse"],
                "train_mae": train_metrics["train_mae"],
                "test_mae": test_metrics["test_mae"],
                "training_duration": training_time,
                "model": model,
            }

            return result

        except Exception as e:
            logger.error(f"Model training failed: {e}")
            if self.tracker.active_run:
                self.tracker.log_exception(e)
            raise

    def _create_model(self, model_type: str, hyperparams: Dict) -> Any:
        """Create model instance.

        Args:
            model_type: Type of model
            hyperparams: Hyperparameters

        Returns:
            Model instance
        """
        if model_type == "xgboost":
            return XGBRegressor(**hyperparams)
        elif model_type == "random_forest":
            return RandomForestRegressor(**hyperparams)
        elif model_type == "gradient_boosting":
            return GradientBoostingRegressor(**hyperparams)
        else:
            raise ValueError(f"Unknown model type: {model_type}")

    def _get_default_hyperparams(self, model_type: str) -> Dict:
        """Get default hyperparameters from config.

        Args:
            model_type: Type of model

        Returns:
            Dictionary of hyperparameters
        """
        model_config = self.config.training.models.get(model_type, {})

        # Take first value from lists (for grid search, use first value as default)
        hyperparams = {}
        for key, value in model_config.items():
            if isinstance(value, list) and len(value) > 0:
                hyperparams[key] = value[0]
            else:
                hyperparams[key] = value

        # Add random_state
        hyperparams["random_state"] = self.config.training.data.random_seed

        return hyperparams

    def _get_feature_importance(
        self, model: Any, feature_names: List[str]
    ) -> Optional[pd.DataFrame]:
        """Extract feature importance from model.

        Args:
            model: Trained model
            feature_names: List of feature names

        Returns:
            DataFrame with feature importance or None
        """
        try:
            if hasattr(model, "feature_importances_"):
                importance = model.feature_importances_
                fi_df = pd.DataFrame(
                    {"feature": feature_names, "importance": importance}
                ).sort_values("importance", ascending=False)
                return fi_df
            else:
                return None
        except Exception as e:
            logger.warning(f"Could not extract feature importance: {e}")
            return None

    def register_best_model(
        self,
        model: Any,
        metrics: Dict[str, float],
        model_name: str,
        run_id: str,
        description: Optional[str] = None,
    ) -> Any:
        """Register best model to MLflow Model Registry.

        Args:
            model: Trained model
            metrics: Model metrics
            model_name: Name for registered model
            run_id: MLflow run ID
            description: Model description

        Returns:
            ModelVersion object
        """
        try:
            # Create model URI
            model_uri = f"runs:/{run_id}/model"

            # Create tags
            tags = {
                "r2_score": str(metrics.get("test_r2", 0)),
                "rmse": str(metrics.get("test_rmse", 0)),
                "mae": str(metrics.get("test_mae", 0)),
                "training_date": datetime.now().isoformat(),
            }

            # Register model
            model_version = self.registry.register_model(
                model_uri=model_uri, name=model_name, tags=tags, description=description
            )

            logger.info(
                f"Registered model: {model_name} version {model_version.version}"
            )

            return model_version

        except Exception as e:
            logger.error(f"Failed to register model: {e}")
            raise

    def compare_and_select_best(self, results: Dict[str, Dict]) -> Tuple[str, Dict]:
        """Compare models and select the best one.

        Args:
            results: Dictionary of training results by model type

        Returns:
            Tuple of (best_model_type, best_result)
        """
        try:
            # Create comparison DataFrame
            comparison_data = []
            for model_type, result in results.items():
                comparison_data.append(
                    {
                        "model_type": model_type,
                        "train_r2": result["train_r2"],
                        "test_r2": result["test_r2"],
                        "train_rmse": result["train_rmse"],
                        "test_rmse": result["test_rmse"],
                        "training_duration": result["training_duration"],
                    }
                )

            comparison_df = pd.DataFrame(comparison_data)
            comparison_df = comparison_df.sort_values("test_r2", ascending=False)

            # Log comparison
            logger.info("\nModel Comparison:")
            logger.info(comparison_df.to_string())

            # Select best model (highest test R²)
            best_model_type = comparison_df.iloc[0]["model_type"]
            best_result = results[best_model_type]

            logger.info(
                f"\nBest model: {best_model_type} (R²={best_result['test_r2']:.4f})"
            )

            return best_model_type, best_result

        except Exception as e:
            logger.error(f"Failed to compare models: {e}")
            raise
