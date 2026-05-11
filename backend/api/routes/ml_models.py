"""ML Model Management API Endpoints.

This module provides FastAPI endpoints for managing models
in the MLflow Model Registry.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException

from backend.core.logger import logger
from backend.core.security import verify_admin
from backend.ml.mlflow_config import get_mlflow_tracking_uri
from backend.ml.model_loader import ModelLoader
from backend.ml.model_registry import ModelRegistry
from backend.ml.schemas import (
    ModelInfoResponse,
    ModelListResponse,
    ModelReloadResponse,
    ModelTransitionRequest,
    ModelTransitionResponse,
)

router = APIRouter()


# Global instances
_model_loader: Optional[ModelLoader] = None
_model_registry: Optional[ModelRegistry] = None


def get_registry() -> ModelRegistry:
    """Dependency to get model registry."""
    global _model_registry

    if _model_registry is None:
        _model_registry = ModelRegistry(tracking_uri=get_mlflow_tracking_uri())

    return _model_registry


def get_loader() -> ModelLoader:
    """Dependency to get model loader."""
    global _model_loader, _model_registry

    if _model_loader is None:
        if _model_registry is None:
            _model_registry = ModelRegistry(tracking_uri=get_mlflow_tracking_uri())
        _model_loader = ModelLoader(registry=_model_registry)

    return _model_loader


@router.get("/model/info", response_model=ModelInfoResponse)
async def get_model_info(
    model_name: str = "demand_forecasting_model",
    stage: str = "Production",
    registry: ModelRegistry = Depends(get_registry),
) -> ModelInfoResponse:
    """
    Get current production model information.

    - Returns model version, metrics, tags
    - Shows when model was last updated
    """
    try:
        # Get latest model in specified stage
        model_version = registry.get_latest_model(model_name, stage=stage)

        if not model_version:
            raise HTTPException(
                status_code=404, detail=f"No {stage} model found for: {model_name}"
            )

        # Get detailed model info
        model_info = registry.get_model_info(model_name, int(model_version.version))

        if not model_info:
            raise HTTPException(
                status_code=404,
                detail=f"Model info not found for: {model_name} v{model_version.version}",
            )

        return ModelInfoResponse(
            model_name=model_name,
            model_version=str(model_version.version),
            stage=model_version.current_stage,
            created_at=datetime.fromtimestamp(
                model_version.creation_timestamp / 1000
            ).isoformat(),
            metrics=model_info.get("metrics", {}),
            tags=model_info.get("tags", {}),
            description=model_version.description,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get model info: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to retrieve model information"
        )


@router.post("/model/reload", response_model=ModelReloadResponse)
async def reload_model(
    model_name: str = "demand_forecasting_model",
    loader: ModelLoader = Depends(get_loader),
) -> ModelReloadResponse:
    """
    Force reload production model from registry.

    - Clears cache and reloads latest production model
    - Returns new model version info
    """
    try:
        # Get current cached version
        old_info = loader.get_model_info(model_name)
        old_version = old_info.get("version", "unknown") if old_info else "unknown"

        # Clear cache for this model
        loader.clear_cache(model_name)

        # Reload model
        model, scaler, feature_names = loader.load_production_model(
            model_name, force_reload=True
        )

        # Get new model info
        new_info = loader.get_model_info(model_name)
        new_version = new_info.get("version", "unknown") if new_info else "unknown"

        message = f"Model {model_name} reloaded: v{old_version} -> v{new_version}"
        logger.info(message)

        return ModelReloadResponse(
            success=True,
            message=message,
            model_name=model_name,
            model_version=str(new_version),
        )

    except Exception as e:
        logger.error(f"Failed to reload model: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to reload model: {str(e)}")


@router.get("/models", response_model=ModelListResponse)
async def list_models(
    registry: ModelRegistry = Depends(get_registry),
) -> ModelListResponse:
    """
    List all registered models.

    - Returns model names, versions, stages
    - Includes latest metrics for each version
    """
    try:
        models = registry.search_models()

        result = []
        for model in models:
            # Get latest versions
            try:
                production_version = registry.get_latest_model(
                    model.name, stage="Production"
                )
                staging_version = registry.get_latest_model(model.name, stage="Staging")

                model_data = {
                    "name": model.name,
                    "creation_timestamp": model.creation_timestamp,
                    "last_updated_timestamp": model.last_updated_timestamp,
                    "description": model.description,
                    "production_version": (
                        production_version.version if production_version else None
                    ),
                    "staging_version": (
                        staging_version.version if staging_version else None
                    ),
                    "latest_version": (
                        model.latest_versions[0].version
                        if model.latest_versions
                        else None
                    ),
                }

                result.append(model_data)
            except Exception as e:
                logger.warning(f"Failed to get versions for {model.name}: {e}")
                continue

        return ModelListResponse(models=result, total_count=len(result))

    except Exception as e:
        logger.error(f"Failed to list models: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list models")


@router.post("/model/transition", response_model=ModelTransitionResponse)
async def transition_model_stage(
    request: ModelTransitionRequest,
    registry: ModelRegistry = Depends(get_registry),
    admin: Dict = Depends(verify_admin),
) -> ModelTransitionResponse:
    """
    Transition model to new lifecycle stage.

    - Moves model between None/Staging/Production/Archived
    - Automatically archives previous production model
    - Requires admin role for authentication
    """
    try:
        # Log admin action
        logger.info(
            f"Admin {admin.get('sub', 'unknown')} transitioning model {request.model_name}"
        )

        # Validate stage
        valid_stages = ["Staging", "Production", "Archived"]
        if request.stage not in valid_stages:
            raise HTTPException(
                status_code=422, detail=f"Invalid stage. Must be one of: {valid_stages}"
            )

        # Transition model
        success = registry.transition_model_stage(
            name=request.model_name,
            version=request.version,
            stage=request.stage,
            archive_existing=request.archive_existing,
        )

        if not success:
            raise HTTPException(
                status_code=500, detail="Failed to transition model stage"
            )

        message = f"Model {request.model_name} v{request.version} transitioned to {request.stage}"
        logger.info(message)

        return ModelTransitionResponse(
            success=True,
            message=message,
            model_name=request.model_name,
            version=request.version,
            new_stage=request.stage,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to transition model: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to transition model: {str(e)}"
        )


@router.get("/model/versions/{model_name}")
async def get_model_versions(
    model_name: str, registry: ModelRegistry = Depends(get_registry)
) -> List[Dict[str, Any]]:
    """
    Get all versions of a specific model.

    - Returns version history with metrics
    - Shows lifecycle stage for each version
    """
    try:
        versions = registry.list_model_versions(model_name)

        result = []
        for version in versions:
            # Get detailed info
            info = registry.get_model_info(model_name, int(version.version))

            if info:
                result.append(
                    {
                        "version": version.version,
                        "stage": version.current_stage,
                        "status": version.status,
                        "created_at": datetime.fromtimestamp(
                            version.creation_timestamp / 1000
                        ).isoformat(),
                        "description": version.description,
                        "metrics": info.get("metrics", {}),
                        "tags": info.get("tags", {}),
                    }
                )

        return result

    except Exception as e:
        logger.error(f"Failed to get model versions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve model versions")


@router.get("/model/compare")
async def compare_models(
    model_name: str,
    version1: int,
    version2: int,
    registry: ModelRegistry = Depends(get_registry),
) -> Dict[str, Any]:
    """
    Compare two model versions.

    - Shows metric differences
    - Highlights improvements/regressions
    """
    try:
        comparison = registry.compare_models(model_name, version1, version2)

        if comparison is None:
            raise HTTPException(
                status_code=404, detail="One or both model versions not found"
            )

        return comparison

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to compare models: {e}")
        raise HTTPException(status_code=500, detail="Failed to compare models")
