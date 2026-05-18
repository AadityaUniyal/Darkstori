"""Model Loader with Caching.

This module provides model loading from MLflow Model Registry with
in-memory caching and automatic reload capabilities.
"""

import asyncio
import logging
import threading
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

import joblib
import mlflow
from mlflow.pyfunc import PyFuncModel

from backend.core.config import settings
from backend.ml.model_registry import ModelRegistry

logger = logging.getLogger(__name__)


class ModelLoader:
    """Model loader with caching and automatic reload.

    Loads models from MLflow Model Registry and caches them in memory
    with TTL-based expiration and automatic reload on version changes.
    """

    def __init__(self, registry: Optional[ModelRegistry] = None):
        """Initialize model loader.

        Args:
            registry: ModelRegistry instance (creates new if not provided)
        """
        self.registry = registry or ModelRegistry()

        # Cache structure: {model_name: (model, scaler, feature_names, version, timestamp)}
        self._cache: Dict[str, Tuple[Any, Any, list, str, datetime]] = {}

        # Cache TTL from settings
        self.cache_ttl_seconds = settings.MODEL_CACHE_TTL_SECONDS

        # Lock for thread-safe access (RLock allows re-entrant calls)
        self._lock = threading.RLock()

        logger.info("ModelLoader initialized")

    def load_production_model(
        self, model_name: str, force_reload: bool = False
    ) -> Tuple[Any, Any, list]:
        """Load production model with caching.

        Args:
            model_name: Name of the registered model
            force_reload: Force reload from registry

        Returns:
            Tuple of (model, scaler, feature_names)
        """
        try:
            with self._lock:
                # Check cache
                if not force_reload and model_name in self._cache:
                    cached_data = self._cache[model_name]
                    model, scaler, feature_names, version, timestamp = cached_data

                    # Check if cache is still valid
                    age = (datetime.now() - timestamp).total_seconds()
                    if age < self.cache_ttl_seconds:
                        logger.debug(
                            f"Using cached model: {model_name} v{version} (age: {age:.0f}s)"
                        )
                        return model, scaler, feature_names
                    else:
                        logger.info(f"Cache expired for {model_name} (age: {age:.0f}s)")

                # Load from registry
                logger.info(f"Loading model from registry: {model_name}")

                # Get latest production version
                model_version = self.registry.get_latest_model(
                    model_name, stage="Production"
                )

                if not model_version:
                    raise ValueError(f"No production model found for: {model_name}")

                version = model_version.version

                # Load model
                model_uri = f"models:/{model_name}/Production"
                model = mlflow.pyfunc.load_model(model_uri)

                # Load scaler and feature names from artifacts
                scaler, feature_names = self._load_artifacts(model_name, version)

                # Update cache
                self._cache[model_name] = (
                    model,
                    scaler,
                    feature_names,
                    version,
                    datetime.now(),
                )

                logger.info(f"Loaded and cached model: {model_name} v{version}")

                return model, scaler, feature_names

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def _load_artifacts(self, model_name: str, version: str) -> Tuple[Any, list]:
        """Load model artifacts (scaler and feature names).

        Args:
            model_name: Model name
            version: Model version

        Returns:
            Tuple of (scaler, feature_names)
        """
        try:
            # Get model version details
            model_version = self.registry.get_model_version(model_name, int(version))

            # Get run ID
            run_id = model_version.run_id

            # Download artifacts
            client = self.registry.client

            # Try to load scaler
            scaler = None
            try:
                scaler_path = client.download_artifacts(run_id, "scalers/scaler.joblib")
                scaler = joblib.load(scaler_path)
                logger.debug("Loaded scaler artifact")
            except Exception as e:
                logger.warning(f"Could not load scaler: {e}")

            # Try to load feature names
            feature_names = None
            try:
                import json

                features_path = client.download_artifacts(
                    run_id, "engineered_features.json"
                )
                with open(features_path, "r") as f:
                    features_data = json.load(f)
                    feature_names = features_data.get("features", [])
                logger.debug(f"Loaded {len(feature_names)} feature names")
            except Exception as e:
                logger.warning(f"Could not load feature names: {e}")

            return scaler, feature_names

        except Exception as e:
            logger.error(f"Failed to load artifacts: {e}")
            return None, None

    def reload_if_changed(self, model_name: str) -> bool:
        """Check if production model changed and reload if necessary.

        Args:
            model_name: Name of the registered model

        Returns:
            True if model was reloaded, False otherwise
        """
        try:
            with self._lock:
                # Get current cached version
                if model_name not in self._cache:
                    logger.info(f"Model not in cache: {model_name}")
                    return False

                cached_version = self._cache[model_name][3]

                # Get latest production version
                model_version = self.registry.get_latest_model(
                    model_name, stage="Production"
                )

                if not model_version:
                    logger.warning(f"No production model found: {model_name}")
                    return False

                latest_version = model_version.version

                # Check if version changed
                if latest_version != cached_version:
                    logger.info(
                        f"Model version changed: {cached_version} -> {latest_version}"
                    )
                    self.load_production_model(model_name, force_reload=True)
                    return True
                else:
                    logger.debug(f"Model version unchanged: {latest_version}")
                    return False

        except Exception as e:
            logger.error(f"Failed to check model version: {e}")
            return False

    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get information about cached model.

        Args:
            model_name: Name of the registered model

        Returns:
            Dictionary with model information
        """
        try:
            with self._lock:
                if model_name not in self._cache:
                    return {"error": "Model not in cache"}

                model, scaler, feature_names, version, timestamp = self._cache[
                    model_name
                ]

                age_seconds = (datetime.now() - timestamp).total_seconds()

                return {
                    "model_name": model_name,
                    "version": version,
                    "cached_at": timestamp.isoformat(),
                    "cache_age_seconds": age_seconds,
                    "cache_ttl_seconds": self.cache_ttl_seconds,
                    "is_expired": age_seconds >= self.cache_ttl_seconds,
                    "has_scaler": scaler is not None,
                    "feature_count": len(feature_names) if feature_names else 0,
                }

        except Exception as e:
            logger.error(f"Failed to get model info: {e}")
            return {"error": str(e)}

    def clear_cache(self, model_name: Optional[str] = None) -> None:
        """Clear model cache.

        Args:
            model_name: Specific model to clear (clears all if None)
        """
        try:
            with self._lock:
                if model_name:
                    if model_name in self._cache:
                        del self._cache[model_name]
                        logger.info(f"Cleared cache for: {model_name}")
                else:
                    self._cache.clear()
                    logger.info("Cleared all model cache")

        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")

    def preload_models(self, model_names: list) -> None:
        """Preload multiple models into cache.

        Args:
            model_names: List of model names to preload
        """
        try:
            for model_name in model_names:
                try:
                    self.load_production_model(model_name)
                    logger.info(f"Preloaded model: {model_name}")
                except Exception as e:
                    logger.error(f"Failed to preload {model_name}: {e}")

        except Exception as e:
            logger.error(f"Failed to preload models: {e}")

    async def auto_reload_loop(self, model_name: str, check_interval: int = 60) -> None:
        """Automatically check and reload model if changed.

        Args:
            model_name: Model name to monitor
            check_interval: Check interval in seconds
        """
        try:
            logger.info(
                f"Starting auto-reload loop for {model_name} (interval: {check_interval}s)"
            )

            while True:
                await asyncio.sleep(check_interval)

                try:
                    reloaded = self.reload_if_changed(model_name)
                    if reloaded:
                        logger.info(f"Auto-reloaded model: {model_name}")
                except Exception as e:
                    logger.error(f"Auto-reload failed for {model_name}: {e}")

        except asyncio.CancelledError:
            logger.info(f"Auto-reload loop cancelled for {model_name}")
        except Exception as e:
            logger.error(f"Auto-reload loop error: {e}")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics.

        Returns:
            Dictionary with cache statistics
        """
        try:
            with self._lock:
                stats = {
                    "cached_models": len(self._cache),
                    "cache_ttl_seconds": self.cache_ttl_seconds,
                    "models": {},
                }

                for model_name in self._cache:
                    info = self.get_model_info(model_name)
                    stats["models"][model_name] = info

                return stats

        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {"error": str(e)}
