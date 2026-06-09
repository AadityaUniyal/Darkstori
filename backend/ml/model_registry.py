"""Model Registry Wrapper for MLflow.

This module provides a wrapper around MLflow Model Registry functionality
for managing model versions and lifecycle stages.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import mlflow
from mlflow.entities.model_registry import ModelVersion, RegisteredModel
from mlflow.tracking import MlflowClient

from backend.core.config import settings
from backend.ml.mlflow_config import get_mlflow_config

logger = logging.getLogger(__name__)


class ModelRegistry:
    """Wrapper for MLflow Model Registry.

    Provides simplified interface for registering models, managing versions,
    and transitioning models through lifecycle stages.
    """

    def __init__(self, tracking_uri: Optional[str] = None):
        """Initialize model registry.

        Args:
            tracking_uri: MLflow tracking URI (uses config if not provided)
        """
        self.enable_tracking = settings.MLFLOW_ENABLE_TRACKING
        if os.getenv("MLFLOW_ENABLE_TRACKING", "true").lower() != "true":
            self.enable_tracking = False

        if not self.enable_tracking:
            self.tracking_uri = ""
            self.client = None
            logger.info("ModelRegistry initialized in offline/fallback mode (tracking disabled)")
            return

        if tracking_uri:
            self.tracking_uri = tracking_uri
        else:
            config = get_mlflow_config()
            self.tracking_uri = config.get_backend_store_uri()

        mlflow.set_tracking_uri(self.tracking_uri)
        self.client = MlflowClient(tracking_uri=self.tracking_uri)

        logger.info("ModelRegistry initialized")

    def register_model(
        self,
        model_uri: str,
        name: str,
        tags: Optional[Dict[str, str]] = None,
        description: Optional[str] = None,
    ) -> ModelVersion:
        """Register a model from a run.

        Args:
            model_uri: URI of the model (e.g., "runs:/<run_id>/model")
            name: Name for the registered model
            tags: Dictionary of tags to add to the model version
            description: Description for the model version

        Returns:
            ModelVersion object
        """
        if not self.enable_tracking:
            raise RuntimeError("MLflow tracking is disabled")

        try:
            # Register the model
            model_version = mlflow.register_model(model_uri, name)

            logger.info(f"Registered model: {name} version {model_version.version}")

            # Add tags if provided
            if tags:
                for key, value in tags.items():
                    self.client.set_model_version_tag(
                        name=name, version=model_version.version, key=key, value=value
                    )

            # Update description if provided
            if description:
                self.client.update_model_version(
                    name=name, version=model_version.version, description=description
                )

            return model_version

        except Exception as e:
            logger.error(f"Failed to register model: {e}")
            raise

    def get_model_version(self, name: str, version: int) -> ModelVersion:
        """Get a specific model version.

        Args:
            name: Registered model name
            version: Model version number

        Returns:
            ModelVersion object
        """
        try:
            model_version = self.client.get_model_version(name, str(version))
            return model_version
        except Exception as e:
            logger.error(f"Failed to get model version: {e}")
            raise

    def get_latest_model(
        self, name: str, stage: Optional[str] = None
    ) -> Optional[ModelVersion]:
        """Get the latest model version, optionally filtered by stage.

        Args:
            name: Registered model name
            stage: Lifecycle stage (None, Staging, Production, Archived)

        Returns:
            ModelVersion object or None if not found
        """
        try:
            if stage:
                versions = self.client.get_latest_versions(name, stages=[stage])
            else:
                # Get all versions and return the latest
                versions = self.client.search_model_versions(f"name='{name}'")
                if not versions:
                    return None
                versions = sorted(versions, key=lambda v: int(v.version), reverse=True)

            return versions[0] if versions else None

        except Exception as e:
            logger.error(f"Failed to get latest model: {e}")
            raise

    def transition_model_stage(
        self, name: str, version: int, stage: str, archive_existing: bool = True
    ) -> ModelVersion:
        """Transition a model version to a new stage.

        Args:
            name: Registered model name
            version: Model version number
            stage: Target stage (None, Staging, Production, Archived)
            archive_existing: If True, archive existing models in target stage

        Returns:
            Updated ModelVersion object
        """
        try:
            # Archive existing models in the target stage if requested
            if archive_existing and stage in ["Staging", "Production"]:
                existing_versions = self.client.get_latest_versions(
                    name, stages=[stage]
                )
                for existing in existing_versions:
                    if int(existing.version) != version:
                        logger.info(f"Archiving {name} version {existing.version}")
                        self.client.transition_model_version_stage(
                            name=name, version=existing.version, stage="Archived"
                        )

            # Transition the specified version
            model_version = self.client.transition_model_version_stage(
                name=name, version=str(version), stage=stage
            )

            logger.info(f"Transitioned {name} version {version} to {stage}")

            return model_version

        except Exception as e:
            logger.error(f"Failed to transition model stage: {e}")
            raise

    def update_model_description(
        self, name: str, version: int, description: str
    ) -> ModelVersion:
        """Update the description of a model version.

        Args:
            name: Registered model name
            version: Model version number
            description: New description

        Returns:
            Updated ModelVersion object
        """
        try:
            model_version = self.client.update_model_version(
                name=name, version=str(version), description=description
            )

            logger.info(f"Updated description for {name} version {version}")

            return model_version

        except Exception as e:
            logger.error(f"Failed to update model description: {e}")
            raise

    def set_model_version_tag(
        self, name: str, version: int, key: str, value: str
    ) -> None:
        """Set a tag on a model version.

        Args:
            name: Registered model name
            version: Model version number
            key: Tag key
            value: Tag value
        """
        try:
            self.client.set_model_version_tag(
                name=name, version=str(version), key=key, value=value
            )

            logger.debug(f"Set tag {key}={value} on {name} version {version}")

        except Exception as e:
            logger.error(f"Failed to set model version tag: {e}")
            raise

    def search_models(
        self, filter_string: Optional[str] = None
    ) -> List[RegisteredModel]:
        """Search for registered models.

        Args:
            filter_string: Filter query string (e.g., "name LIKE 'demand%'")

        Returns:
            List of RegisteredModel objects
        """
        try:
            models = self.client.search_registered_models(filter_string=filter_string)
            return list(models)
        except Exception as e:
            logger.error(f"Failed to search models: {e}")
            raise

    def search_model_versions(
        self, filter_string: Optional[str] = None
    ) -> List[ModelVersion]:
        """Search for model versions.

        Args:
            filter_string: Filter query string (e.g., "name='model1' AND tags.stage='Production'")

        Returns:
            List of ModelVersion objects
        """
        try:
            versions = self.client.search_model_versions(filter_string=filter_string)
            return list(versions)
        except Exception as e:
            logger.error(f"Failed to search model versions: {e}")
            raise

    def delete_model_version(self, name: str, version: int) -> None:
        """Delete a specific model version.

        Args:
            name: Registered model name
            version: Model version number
        """
        try:
            self.client.delete_model_version(name=name, version=str(version))
            logger.info(f"Deleted {name} version {version}")
        except Exception as e:
            logger.error(f"Failed to delete model version: {e}")
            raise

    def delete_registered_model(self, name: str) -> None:
        """Delete a registered model and all its versions.

        Args:
            name: Registered model name
        """
        try:
            self.client.delete_registered_model(name=name)
            logger.info(f"Deleted registered model: {name}")
        except Exception as e:
            logger.error(f"Failed to delete registered model: {e}")
            raise

    def get_model_info(
        self, name: str, version: Optional[int] = None, stage: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get detailed information about a model.

        Args:
            name: Registered model name
            version: Specific version number (optional)
            stage: Stage to get latest version from (optional)

        Returns:
            Dictionary with model information
        """
        try:
            if version:
                model_version = self.get_model_version(name, version)
            elif stage:
                model_version = self.get_latest_model(name, stage)
            else:
                model_version = self.get_latest_model(name)

            if not model_version:
                return {"error": "Model not found"}

            # Get tags
            tags = {}
            if hasattr(model_version, "tags") and model_version.tags:
                tags = model_version.tags

            return {
                "name": model_version.name,
                "version": model_version.version,
                "stage": model_version.current_stage,
                "description": model_version.description,
                "creation_timestamp": datetime.fromtimestamp(
                    model_version.creation_timestamp / 1000
                ).isoformat(),
                "last_updated_timestamp": datetime.fromtimestamp(
                    model_version.last_updated_timestamp / 1000
                ).isoformat(),
                "run_id": model_version.run_id,
                "source": model_version.source,
                "tags": tags,
                "status": model_version.status,
            }

        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
            raise

    def list_models(self) -> List[Dict[str, Any]]:
        """List all registered models with their latest versions.

        Returns:
            List of dictionaries with model information
        """
        try:
            models = self.search_models()

            model_list = []
            for model in models:
                # Get latest versions for each stage
                production = self.get_latest_model(model.name, "Production")
                staging = self.get_latest_model(model.name, "Staging")

                model_info = {
                    "name": model.name,
                    "creation_timestamp": datetime.fromtimestamp(
                        model.creation_timestamp / 1000
                    ).isoformat(),
                    "last_updated_timestamp": datetime.fromtimestamp(
                        model.last_updated_timestamp / 1000
                    ).isoformat(),
                    "description": model.description,
                    "production_version": production.version if production else None,
                    "staging_version": staging.version if staging else None,
                    "latest_version": (
                        model.latest_versions[0].version
                        if model.latest_versions
                        else None
                    ),
                }

                model_list.append(model_info)

            return model_list

        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            raise

    def promote_model(
        self,
        name: str,
        version: int,
        from_stage: str = "Staging",
        to_stage: str = "Production",
    ) -> ModelVersion:
        """Promote a model from one stage to another.

        Args:
            name: Registered model name
            version: Model version number
            from_stage: Current stage
            to_stage: Target stage

        Returns:
            Updated ModelVersion object
        """
        try:
            # Verify model is in the from_stage
            model_version = self.get_model_version(name, version)
            if model_version.current_stage != from_stage:
                raise ValueError(
                    f"Model version {version} is in {model_version.current_stage}, not {from_stage}"
                )

            # Transition to new stage
            return self.transition_model_stage(
                name, version, to_stage, archive_existing=True
            )

        except Exception as e:
            logger.error(f"Failed to promote model: {e}")
            raise

    def load_model(
        self,
        name: str,
        version: Optional[int] = None,
        stage: Optional[str] = "Production",
    ) -> Any:
        """Load a model from the registry.

        Args:
            name: Registered model name
            version: Specific version number (optional)
            stage: Stage to load from if version not specified

        Returns:
            Loaded model object
        """
        if not self.enable_tracking:
            raise RuntimeError("MLflow tracking is disabled")

        try:
            if version:
                model_uri = f"models:/{name}/{version}"
            else:
                model_uri = f"models:/{name}/{stage}"

            model = mlflow.pyfunc.load_model(model_uri)

            logger.info(f"Loaded model: {model_uri}")

            return model

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def list_model_versions(self, name: str) -> List[ModelVersion]:
        """List all versions of a registered model.

        Args:
            name: Registered model name

        Returns:
            List of ModelVersion objects sorted by version (descending)
        """
        try:
            versions = self.client.search_model_versions(f"name='{name}'")
            # Sort by version number (descending)
            versions = sorted(versions, key=lambda v: int(v.version), reverse=True)
            return versions
        except Exception as e:
            logger.error(f"Failed to list model versions: {e}")
            raise

    def compare_models(
        self, name: str, version1: int, version2: int
    ) -> Optional[Dict[str, Any]]:
        """Compare two model versions.

        Args:
            name: Registered model name
            version1: First version number
            version2: Second version number

        Returns:
            Dictionary with comparison results or None if versions not found
        """
        try:
            # Get model info for both versions
            info1 = self.get_model_info(name, version1)
            info2 = self.get_model_info(name, version2)

            if "error" in info1 or "error" in info2:
                return None

            # Get metrics from run data
            run1 = self.client.get_run(info1["run_id"])
            run2 = self.client.get_run(info2["run_id"])

            metrics1 = run1.data.metrics
            metrics2 = run2.data.metrics

            # Calculate differences
            metric_comparison = {}
            all_metrics = set(metrics1.keys()) | set(metrics2.keys())

            for metric in all_metrics:
                val1 = metrics1.get(metric, 0)
                val2 = metrics2.get(metric, 0)
                diff = val2 - val1
                pct_change = (diff / val1 * 100) if val1 != 0 else 0

                metric_comparison[metric] = {
                    f"version_{version1}": val1,
                    f"version_{version2}": val2,
                    "difference": diff,
                    "percent_change": pct_change,
                }

            return {
                "model_name": name,
                "version1": {
                    "version": version1,
                    "stage": info1["stage"],
                    "created_at": info1["creation_timestamp"],
                },
                "version2": {
                    "version": version2,
                    "stage": info2["stage"],
                    "created_at": info2["creation_timestamp"],
                },
                "metrics": metric_comparison,
            }

        except Exception as e:
            logger.error(f"Failed to compare models: {e}")
            raise
