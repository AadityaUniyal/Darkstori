"""ML Training Job Management API Endpoints.

This module provides FastAPI endpoints for managing training jobs,
experiments, and runs in MLflow.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from mlflow.tracking import MlflowClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.database.connection import get_db
from backend.ml.mlflow_config import get_mlflow_tracking_uri
from backend.ml.schemas import (
    ExperimentListResponse,
    RunListResponse,
    TrainingJobRequest,
    TrainingJobResponse,
)
from database.models.models import MLTrainingJob

router = APIRouter()


def get_mlflow_client() -> MlflowClient:
    """Get MLflow client."""
    return MlflowClient(tracking_uri=get_mlflow_tracking_uri())


async def get_training_job(job_id: str, db: AsyncSession) -> Optional[MLTrainingJob]:
    """Get training job by ID.

    Args:
        job_id: Training job ID
        db: Database session

    Returns:
        MLTrainingJob or None
    """
    result = await db.execute(
        select(MLTrainingJob).where(MLTrainingJob.job_id == job_id)
    )
    return result.scalar_one_or_none()


async def create_training_job(
    job_id: str,
    experiment_name: str,
    config: Dict[str, Any],
    created_by: str,
    db: AsyncSession,
) -> MLTrainingJob:
    """Create training job record.

    Args:
        job_id: Unique job ID
        experiment_name: Experiment name
        config: Training configuration
        created_by: User who created the job
        db: Database session

    Returns:
        Created MLTrainingJob
    """
    job = MLTrainingJob(
        job_id=job_id,
        job_type="manual",
        experiment_name=experiment_name,
        status="running",
        config=config,
        started_at=datetime.now(),
        created_by=created_by,
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)

    return job


async def update_training_job(
    job_id: str,
    status: str,
    run_id: Optional[str] = None,
    best_model_type: Optional[str] = None,
    best_r2_score: Optional[float] = None,
    error_message: Optional[str] = None,
    db: AsyncSession = None,
) -> None:
    """Update training job status.

    Args:
        job_id: Training job ID
        status: New status
        run_id: MLflow run ID
        best_model_type: Best model type
        best_r2_score: Best R² score
        error_message: Error message if failed
        db: Database session
    """
    if db is None:
        return

    try:
        job = await get_training_job(job_id, db)

        if job:
            job.status = status

            if run_id:
                job.run_id = run_id

            if best_model_type:
                job.best_model_type = best_model_type

            if best_r2_score is not None:
                job.best_r2_score = best_r2_score

            if error_message:
                job.error_message = error_message

            if status in ["completed", "failed"]:
                job.completed_at = datetime.now()

                if job.started_at:
                    duration = (job.completed_at - job.started_at).total_seconds()
                    job.training_duration_seconds = int(duration)

            await db.commit()

    except Exception as e:
        logger.error(f"Failed to update training job: {e}")
        await db.rollback()


async def run_training_job(
    job_id: str, experiment_name: str, config: Dict[str, Any], db: AsyncSession
) -> None:
    """Run training job in background.

    Args:
        job_id: Training job ID
        experiment_name: Experiment name
        config: Training configuration
        db: Database session
    """
    try:
        logger.info(f"Starting training job: {job_id}")

        # Import here to avoid circular imports
        from backend.pipelines.mlflow_training_pipeline import MLflowTrainingPipeline

        # Create training pipeline
        pipeline = MLflowTrainingPipeline(experiment_name=experiment_name)

        # Run training
        results = await asyncio.to_thread(
            pipeline.run,
            target_col=config.get("target_col", "order_count"),
            test_size=config.get("test_size", 0.2),
        )

        # Update job with results
        await update_training_job(
            job_id=job_id,
            status="completed",
            run_id=results.get("run_id"),
            best_model_type=results.get("best_model_type"),
            best_r2_score=results.get("best_r2_score"),
            db=db,
        )

        logger.info(f"Training job completed: {job_id}")

    except Exception as e:
        logger.error(f"Training job failed: {e}", exc_info=True)

        await update_training_job(
            job_id=job_id, status="failed", error_message=str(e), db=db
        )


@router.post("/train", response_model=TrainingJobResponse)
async def start_training(
    request: TrainingJobRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> TrainingJobResponse:
    """
    Start model training job.

    - Runs training in background
    - Returns job_id for status tracking
    - Logs all experiments to MLflow
    """
    try:
        # Generate job ID
        job_id = f"job_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"

        # Prepare config
        config = {
            "experiment_name": request.experiment_name,
            "model_types": request.model_types,
            "target_col": "order_count",
            "test_size": 0.2,
        }

        if request.config_override:
            config.update(request.config_override)

        # Create job record
        job = await create_training_job(
            job_id=job_id,
            experiment_name=request.experiment_name,
            config=config,
            created_by="api_user",  # TODO: Get from auth
            db=db,
        )

        # Start training in background
        background_tasks.add_task(
            run_training_job,
            job_id=job_id,
            experiment_name=request.experiment_name,
            config=config,
            db=db,
        )

        logger.info(f"Training job started: {job_id}")

        return TrainingJobResponse(
            job_id=job.job_id,
            status=job.status,
            experiment_name=job.experiment_name,
            run_id=job.run_id,
            started_at=job.started_at.isoformat(),
            completed_at=None,
            best_model_type=None,
            best_r2_score=None,
            training_duration_seconds=None,
            error_message=None,
        )

    except Exception as e:
        logger.error(f"Failed to start training: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to start training job: {str(e)}"
        )


@router.get("/train/{job_id}", response_model=TrainingJobResponse)
async def get_training_status(
    job_id: str, db: AsyncSession = Depends(get_db)
) -> TrainingJobResponse:
    """
    Get training job status.

    - Returns current status and progress
    - Shows metrics if completed
    """
    try:
        job = await get_training_job(job_id, db)

        if not job:
            raise HTTPException(
                status_code=404, detail=f"Training job not found: {job_id}"
            )

        return TrainingJobResponse(
            job_id=job.job_id,
            status=job.status,
            experiment_name=job.experiment_name,
            run_id=job.run_id,
            started_at=job.started_at.isoformat(),
            completed_at=job.completed_at.isoformat() if job.completed_at else None,
            best_model_type=job.best_model_type,
            best_r2_score=job.best_r2_score,
            training_duration_seconds=job.training_duration_seconds,
            error_message=job.error_message,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get training status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to retrieve training status"
        )


@router.get("/train")
async def list_training_jobs(
    limit: int = 50, status: Optional[str] = None, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    List training jobs.

    - Returns recent training jobs
    - Supports filtering by status
    """
    try:
        query = (
            select(MLTrainingJob).order_by(MLTrainingJob.started_at.desc()).limit(limit)
        )

        if status:
            query = query.where(MLTrainingJob.status == status)

        result = await db.execute(query)
        jobs = result.scalars().all()

        job_list = []
        for job in jobs:
            job_list.append(
                {
                    "job_id": job.job_id,
                    "status": job.status,
                    "experiment_name": job.experiment_name,
                    "started_at": job.started_at.isoformat(),
                    "completed_at": (
                        job.completed_at.isoformat() if job.completed_at else None
                    ),
                    "best_model_type": job.best_model_type,
                    "best_r2_score": job.best_r2_score,
                    "training_duration_seconds": job.training_duration_seconds,
                }
            )

        return {"jobs": job_list, "total_count": len(job_list)}

    except Exception as e:
        logger.error(f"Failed to list training jobs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list training jobs")


@router.get("/experiments", response_model=ExperimentListResponse)
async def list_experiments(
    client: MlflowClient = Depends(get_mlflow_client),
) -> ExperimentListResponse:
    """
    List all MLflow experiments.

    - Returns experiment names and run counts
    """
    try:
        experiments = client.search_experiments()

        experiment_list = []
        for exp in experiments:
            # Get run count
            runs = client.search_runs(experiment_ids=[exp.experiment_id], max_results=1)

            experiment_list.append(
                {
                    "experiment_id": exp.experiment_id,
                    "name": exp.name,
                    "artifact_location": exp.artifact_location,
                    "lifecycle_stage": exp.lifecycle_stage,
                    "creation_time": (
                        datetime.fromtimestamp(exp.creation_time / 1000).isoformat()
                        if exp.creation_time
                        else None
                    ),
                }
            )

        return ExperimentListResponse(
            experiments=experiment_list, total_count=len(experiment_list)
        )

    except Exception as e:
        logger.error(f"Failed to list experiments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list experiments")


@router.get("/runs", response_model=RunListResponse)
async def list_runs(
    experiment_name: Optional[str] = None,
    limit: int = 50,
    client: MlflowClient = Depends(get_mlflow_client),
) -> RunListResponse:
    """
    List runs for an experiment.

    - Returns run metadata, metrics, parameters
    - Supports filtering and sorting
    """
    try:
        # Get experiment ID if name provided
        experiment_ids = None
        if experiment_name:
            try:
                experiment = client.get_experiment_by_name(experiment_name)
                if experiment:
                    experiment_ids = [experiment.experiment_id]
            except Exception as e:
                logger.warning(f"Experiment not found: {experiment_name}")

        # Search runs
        runs = client.search_runs(
            experiment_ids=experiment_ids,
            max_results=limit,
            order_by=["start_time DESC"],
        )

        run_list = []
        for run in runs:
            run_data = {
                "run_id": run.info.run_id,
                "experiment_id": run.info.experiment_id,
                "status": run.info.status,
                "start_time": (
                    datetime.fromtimestamp(run.info.start_time / 1000).isoformat()
                    if run.info.start_time
                    else None
                ),
                "end_time": (
                    datetime.fromtimestamp(run.info.end_time / 1000).isoformat()
                    if run.info.end_time
                    else None
                ),
                "metrics": run.data.metrics,
                "params": run.data.params,
                "tags": run.data.tags,
            }
            run_list.append(run_data)

        return RunListResponse(runs=run_list, total_count=len(run_list))

    except Exception as e:
        logger.error(f"Failed to list runs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list runs")


@router.get("/experiments/{experiment_name}/runs")
async def get_experiment_runs(
    experiment_name: str,
    limit: int = 50,
    client: MlflowClient = Depends(get_mlflow_client),
) -> Dict[str, Any]:
    """
    Get runs for a specific experiment.

    - Returns detailed run information
    - Includes metrics and parameters
    """
    try:
        # Get experiment
        experiment = client.get_experiment_by_name(experiment_name)

        if not experiment:
            raise HTTPException(
                status_code=404, detail=f"Experiment not found: {experiment_name}"
            )

        # Get runs
        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            max_results=limit,
            order_by=["start_time DESC"],
        )

        run_list = []
        for run in runs:
            run_list.append(
                {
                    "run_id": run.info.run_id,
                    "status": run.info.status,
                    "start_time": (
                        datetime.fromtimestamp(run.info.start_time / 1000).isoformat()
                        if run.info.start_time
                        else None
                    ),
                    "metrics": run.data.metrics,
                    "params": run.data.params,
                }
            )

        return {
            "experiment_name": experiment_name,
            "experiment_id": experiment.experiment_id,
            "runs": run_list,
            "total_count": len(run_list),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get experiment runs: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to retrieve experiment runs"
        )


@router.delete("/train/{job_id}")
async def cancel_training_job(
    job_id: str, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Cancel a running training job.

    - Marks job as cancelled
    - Note: Cannot stop already running background task
    """
    try:
        job = await get_training_job(job_id, db)

        if not job:
            raise HTTPException(
                status_code=404, detail=f"Training job not found: {job_id}"
            )

        if job.status not in ["running", "pending"]:
            raise HTTPException(
                status_code=400, detail=f"Cannot cancel job with status: {job.status}"
            )

        # Update status
        job.status = "cancelled"
        job.completed_at = datetime.now()

        await db.commit()

        logger.info(f"Training job cancelled: {job_id}")

        return {
            "job_id": job_id,
            "status": "cancelled",
            "message": "Training job marked as cancelled",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel training job: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to cancel training job")
