"""Experiment Tracker Wrapper for MLflow.

This module provides a wrapper around MLflow tracking functionality to
automatically log parameters, metrics, and artifacts during model training.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

import matplotlib.pyplot as plt
import mlflow
import pandas as pd
from mlflow.models.signature import ModelSignature
from mlflow.tracking import MlflowClient

from backend.ml.mlflow_config import get_mlflow_config

logger = logging.getLogger(__name__)


class ExperimentTracker:
    """Wrapper for MLflow experiment tracking.

    Provides simplified interface for logging parameters, metrics, and artifacts
    to MLflow tracking server.
    """

    def __init__(self, experiment_name: str, tracking_uri: Optional[str] = None):
        """Initialize experiment tracker.

        Args:
            experiment_name: Name of the MLflow experiment
            tracking_uri: MLflow tracking URI (uses config if not provided)
        """
        self.experiment_name = experiment_name

        # Set tracking URI
        if tracking_uri:
            self.tracking_uri = tracking_uri
        else:
            config = get_mlflow_config()
            self.tracking_uri = config.get_backend_store_uri()

        mlflow.set_tracking_uri(self.tracking_uri)

        # Create or get experiment
        try:
            self.experiment = mlflow.get_experiment_by_name(experiment_name)
            if self.experiment is None:
                self.experiment_id = mlflow.create_experiment(experiment_name)
                self.experiment = mlflow.get_experiment(self.experiment_id)
            else:
                self.experiment_id = self.experiment.experiment_id
        except Exception as e:
            logger.error(f"Failed to create/get experiment: {e}")
            raise

        self.client = MlflowClient(tracking_uri=self.tracking_uri)
        self.active_run = None
        self.run_id = None

        logger.info(f"ExperimentTracker initialized for experiment: {experiment_name}")

    def start_run(
        self, run_name: Optional[str] = None, tags: Optional[Dict[str, str]] = None
    ) -> str:
        """Start a new MLflow run.

        Args:
            run_name: Name for the run
            tags: Dictionary of tags to add to the run

        Returns:
            Run ID
        """
        try:
            self.active_run = mlflow.start_run(
                experiment_id=self.experiment_id, run_name=run_name, tags=tags
            )
            self.run_id = self.active_run.info.run_id

            logger.info(f"Started run: {run_name} (ID: {self.run_id})")
            return self.run_id

        except Exception as e:
            logger.error(f"Failed to start run: {e}")
            raise

    def end_run(self, status: str = "FINISHED") -> None:
        """End the current MLflow run.

        Args:
            status: Run status (FINISHED, FAILED, KILLED)
        """
        try:
            if self.active_run:
                mlflow.end_run(status=status)
                logger.info(f"Ended run: {self.run_id} with status: {status}")
                self.active_run = None
                self.run_id = None
        except Exception as e:
            logger.error(f"Failed to end run: {e}")
            raise

    def log_params(self, params: Dict[str, Any]) -> None:
        """Log parameters to the current run.

        Args:
            params: Dictionary of parameters to log
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            # MLflow params must be strings
            str_params = {k: str(v) for k, v in params.items()}
            mlflow.log_params(str_params)

            logger.debug(f"Logged {len(params)} parameters")

        except Exception as e:
            logger.error(f"Failed to log parameters: {e}")
            raise

    def log_param(self, key: str, value: Any) -> None:
        """Log a single parameter.

        Args:
            key: Parameter name
            value: Parameter value
        """
        self.log_params({key: value})

    def log_metrics(self, metrics: Dict[str, float], step: int = 0) -> None:
        """Log metrics to the current run.

        Args:
            metrics: Dictionary of metrics to log
            step: Step number for the metrics
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            mlflow.log_metrics(metrics, step=step)

            logger.debug(f"Logged {len(metrics)} metrics at step {step}")

        except Exception as e:
            logger.error(f"Failed to log metrics: {e}")
            raise

    def log_metric(self, key: str, value: float, step: int = 0) -> None:
        """Log a single metric.

        Args:
            key: Metric name
            value: Metric value
            step: Step number
        """
        self.log_metrics({key: value}, step=step)

    def log_artifact(self, file_path: str, artifact_path: Optional[str] = None) -> None:
        """Log a file artifact.

        Args:
            file_path: Path to the file to log
            artifact_path: Subdirectory within the run's artifact directory
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Artifact file not found: {file_path}")

            mlflow.log_artifact(file_path, artifact_path=artifact_path)

            logger.debug(f"Logged artifact: {file_path}")

        except Exception as e:
            logger.error(f"Failed to log artifact: {e}")
            raise

    def log_artifacts(self, dir_path: str, artifact_path: Optional[str] = None) -> None:
        """Log all files in a directory as artifacts.

        Args:
            dir_path: Path to directory containing artifacts
            artifact_path: Subdirectory within the run's artifact directory
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            if not os.path.exists(dir_path):
                raise FileNotFoundError(f"Artifact directory not found: {dir_path}")

            mlflow.log_artifacts(dir_path, artifact_path=artifact_path)

            logger.debug(f"Logged artifacts from: {dir_path}")

        except Exception as e:
            logger.error(f"Failed to log artifacts: {e}")
            raise

    def log_model(
        self,
        model: Any,
        artifact_path: str,
        signature: Optional[ModelSignature] = None,
        input_example: Optional[pd.DataFrame] = None,
        registered_model_name: Optional[str] = None,
    ) -> None:
        """Log a model to MLflow.

        Args:
            model: The model object to log
            artifact_path: Path within the run's artifact directory
            signature: Model signature defining input/output schema
            input_example: Example input for the model
            registered_model_name: If provided, register model with this name
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            # Determine model flavor based on type
            model_type = type(model).__name__

            if "XGB" in model_type:
                import mlflow.xgboost

                mlflow.xgboost.log_model(
                    model,
                    artifact_path=artifact_path,
                    signature=signature,
                    input_example=input_example,
                    registered_model_name=registered_model_name,
                )
            elif "RandomForest" in model_type or "GradientBoosting" in model_type:
                import mlflow.sklearn

                mlflow.sklearn.log_model(
                    model,
                    artifact_path=artifact_path,
                    signature=signature,
                    input_example=input_example,
                    registered_model_name=registered_model_name,
                )
            else:
                # Default to sklearn
                import mlflow.sklearn

                mlflow.sklearn.log_model(
                    model,
                    artifact_path=artifact_path,
                    signature=signature,
                    input_example=input_example,
                    registered_model_name=registered_model_name,
                )

            logger.info(f"Logged model: {artifact_path}")

        except Exception as e:
            logger.error(f"Failed to log model: {e}")
            raise

    def log_figure(
        self, figure: plt.Figure, filename: str, artifact_path: Optional[str] = None
    ) -> None:
        """Log a matplotlib figure as a PNG artifact.

        Args:
            figure: Matplotlib figure object
            filename: Name for the saved figure (should end with .png)
            artifact_path: Subdirectory within the run's artifact directory
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            # Ensure filename ends with .png
            if not filename.endswith(".png"):
                filename += ".png"

            # Save figure temporarily
            temp_path = Path(f"/tmp/{filename}")
            figure.savefig(temp_path, dpi=300, bbox_inches="tight")

            # Log as artifact
            self.log_artifact(str(temp_path), artifact_path=artifact_path)

            # Clean up
            temp_path.unlink()

            logger.debug(f"Logged figure: {filename}")

        except Exception as e:
            logger.error(f"Failed to log figure: {e}")
            raise

    def log_dataset(
        self, df: pd.DataFrame, name: str, artifact_path: Optional[str] = None
    ) -> None:
        """Log a pandas DataFrame as a CSV artifact.

        Args:
            df: DataFrame to log
            name: Name for the CSV file (should end with .csv)
            artifact_path: Subdirectory within the run's artifact directory
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            # Ensure name ends with .csv
            if not name.endswith(".csv"):
                name += ".csv"

            # Save DataFrame temporarily
            temp_path = Path(f"/tmp/{name}")
            df.to_csv(temp_path, index=False)

            # Log as artifact
            self.log_artifact(str(temp_path), artifact_path=artifact_path)

            # Clean up
            temp_path.unlink()

            logger.debug(f"Logged dataset: {name} ({len(df)} rows)")

        except Exception as e:
            logger.error(f"Failed to log dataset: {e}")
            raise

    def log_dict(
        self, data: Dict, name: str, artifact_path: Optional[str] = None
    ) -> None:
        """Log a dictionary as a JSON artifact.

        Args:
            data: Dictionary to log
            name: Name for the JSON file (should end with .json)
            artifact_path: Subdirectory within the run's artifact directory
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            # Ensure name ends with .json
            if not name.endswith(".json"):
                name += ".json"

            # Save dict temporarily
            temp_path = Path(f"/tmp/{name}")
            with open(temp_path, "w") as f:
                json.dump(data, f, indent=2)

            # Log as artifact
            self.log_artifact(str(temp_path), artifact_path=artifact_path)

            # Clean up
            temp_path.unlink()

            logger.debug(f"Logged dict: {name}")

        except Exception as e:
            logger.error(f"Failed to log dict: {e}")
            raise

    def set_tags(self, tags: Dict[str, str]) -> None:
        """Set tags on the current run.

        Args:
            tags: Dictionary of tags to set
        """
        try:
            if not self.active_run:
                raise RuntimeError("No active run. Call start_run() first.")

            mlflow.set_tags(tags)

            logger.debug(f"Set {len(tags)} tags")

        except Exception as e:
            logger.error(f"Failed to set tags: {e}")
            raise

    def set_tag(self, key: str, value: str) -> None:
        """Set a single tag.

        Args:
            key: Tag name
            value: Tag value
        """
        self.set_tags({key: value})

    def log_exception(self, exception: Exception) -> None:
        """Log exception details and mark run as failed.

        Args:
            exception: Exception to log
        """
        try:
            if not self.active_run:
                logger.warning("No active run to log exception to")
                return

            # Log exception details as tags
            self.set_tags(
                {
                    "exception_type": type(exception).__name__,
                    "exception_message": str(exception),
                }
            )

            # Log full traceback as text artifact
            import traceback

            tb_str = traceback.format_exc()

            temp_path = Path("/tmp/exception_traceback.txt")
            with open(temp_path, "w") as f:
                f.write(tb_str)

            self.log_artifact(str(temp_path), artifact_path="errors")
            temp_path.unlink()

            # End run with failed status
            self.end_run(status="FAILED")

            logger.error(f"Logged exception: {type(exception).__name__}")

        except Exception as e:
            logger.error(f"Failed to log exception: {e}")

    def get_run_info(self) -> Optional[Dict]:
        """Get information about the current run.

        Returns:
            Dictionary with run information or None if no active run
        """
        if not self.active_run:
            return None

        return {
            "run_id": self.run_id,
            "experiment_id": self.experiment_id,
            "experiment_name": self.experiment_name,
            "status": self.active_run.info.status,
            "start_time": self.active_run.info.start_time,
            "artifact_uri": self.active_run.info.artifact_uri,
        }

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if exc_type is not None:
            # Exception occurred, log it
            self.log_exception(exc_val)
        elif self.active_run:
            # Normal exit, end run
            self.end_run()
