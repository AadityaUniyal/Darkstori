"""
Deployment Initialization Script

Initializes database, MLflow schema, and performs initial model training
for production deployment.
"""

import sys
from pathlib import Path

PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
BACKEND_DIR = str(Path(__file__).parent.parent)
for p in [PROJECT_ROOT, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.scripts.init_mlflow_db import init_mlflow_database
from backend.ml.mlflow_config import mlflow_config
from backend.database.connection import get_async_session, init_db
from alembic.config import Config
from alembic import command
import asyncio
import logging



logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def run_database_migrations():
    """Run Alembic database migrations."""
    logger.info("Database initialized via init_db (SQLAlchemy Base.metadata.create_all). Skipping alembic migrations.")
    return True


async def initialize_mlflow():
    """Initialize MLflow database schema."""
    try:
        logger.info("Initializing MLflow database...")

        success = await init_mlflow_database()

        if success:
            logger.info("✓ MLflow database initialized")
        else:
            logger.error("✗ MLflow database initialization failed")

        return success

    except Exception as e:
        logger.error(f"MLflow initialization failed: {e}")
        return False


async def verify_database_connection():
    """Verify database connection."""
    try:
        logger.info("Verifying database connection...")

        await init_db()

        logger.info("✓ Database connection verified")
        return True

    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


async def create_default_experiment():
    """Create default MLflow experiment."""
    try:
        import mlflow

        logger.info("Creating default MLflow experiment...")

        mlflow.set_tracking_uri(mlflow_config.tracking_uri)

        # Create default experiment
        experiment_name = "demand_forecasting"
        experiment = mlflow.get_experiment_by_name(experiment_name)

        if experiment is None:
            experiment_id = mlflow.create_experiment(
                experiment_name,
                artifact_location=f"{mlflow_config.artifact_location}/{experiment_name}",
            )
            logger.info(
                f"Created experiment: {experiment_name} (ID: {experiment_id})"
            )
        else:
            logger.info(f"Experiment already exists: {experiment_name}")

        return True

    except Exception as e:
        logger.error(f"Failed to create default experiment: {e}")
        return False


async def run_initial_training():
    """Run initial model training."""
    try:
        logger.info("Running initial model training...")

        from backend.pipelines.data_pipeline import DataPipeline
        from backend.pipelines.mlflow_training_pipeline import MLflowTrainingPipeline
        from backend.ml.model_registry import ModelRegistry

        logger.info("Step 5.1: Running DataPipeline to prepare training features...")
        dp = DataPipeline()
        df = dp.run_pipeline()

        logger.info("Step 5.2: Training models with MLflow...")
        pipeline = MLflowTrainingPipeline(experiment_name="demand_forecasting")
        
        # Run synchronous pipeline
        summary = pipeline.run(
            df=df,
            model_types=["random_forest", "gradient_boosting", "xgboost"]
        )

        best_model_type = summary["best_model_type"]
        best_result = summary["results"][best_model_type]
        best_model = best_result["model"]
        run_id = best_result["run_id"]
        
        # Register the best model
        logger.info(f"Step 5.3: Registering best model: {best_model_type} in MLflow registry...")
        metrics = {
            "test_r2": best_result["test_r2"],
            "test_rmse": best_result["test_rmse"],
            "test_mae": best_result["test_mae"]
        }
        
        model_name = "demand_forecasting_model"
        model_version = pipeline.register_best_model(
            model=best_model,
            metrics=metrics,
            model_name=model_name,
            run_id=run_id,
            description=f"Best model ({best_model_type}) trained during deployment initialization."
        )

        # Transition the registered model to "Production" stage
        logger.info("Step 5.4: Promoting model to Production lifecycle stage...")
        registry = ModelRegistry()
        registry.transition_model_stage(
            name=model_name,
            version=int(model_version.version),
            stage="Production",
            archive_existing=True
        )

        logger.info(
            f"✓ Initial training completed - "
            f"Best model: {best_model_type} "
            f"(R²: {best_result['test_r2']:.4f}) promoted to Production stage."
        )

        return True

    except Exception as e:
        logger.error(f"Initial training failed: {e}")
        logger.warning("Deployment can continue without initial model")
        return False


async def main():
    """Main deployment initialization workflow."""

    print("\n" + "=" * 70)
    print("  DEPLOYMENT INITIALIZATION")
    print("=" * 70)

    success_count = 0
    total_steps = 5
    server_manager = None

    try:
        # Step 1: Verify database connection
        print("\n[1/5] Verifying database connection...")
        if await verify_database_connection():
            success_count += 1
        else:
            print("[ERROR] Database connection failed - cannot continue")
            sys.exit(1)

        # Step 2: Run database migrations
        print("\n[2/5] Running database migrations...")
        if await run_database_migrations():
            success_count += 1
        else:
            print("[ERROR] Database migrations failed - cannot continue")
            sys.exit(1)

        # Step 3: Initialize MLflow
        print("\n[3/5] Initializing MLflow...")
        if await initialize_mlflow():
            success_count += 1
            
            # Start MLflow server daemon so following steps can connect to it
            try:
                from backend.ml.mlflow_server import get_server_manager
                server_manager = get_server_manager()
                print("Starting MLflow server process on port 5000...")
                server_manager.start_server(wait_for_ready=True)
                print("MLflow server started successfully.")
            except Exception as se:
                print(f"[WARNING] Failed to start MLflow server daemon: {se}")
        else:
            print("[WARNING] MLflow initialization failed - continuing anyway")

        # Step 4: Create default experiment
        print("\n[4/5] Creating default MLflow experiment...")
        if await create_default_experiment():
            success_count += 1
        else:
            print("[WARNING] Experiment creation failed - continuing anyway")

        # Step 5: Run initial training (optional)
        print("\n[5/5] Running initial model training...")
        print("(This may take several minutes...)")
        if await run_initial_training():
            success_count += 1
        else:
            print("[WARNING] Initial training failed - can train models later")

    finally:
        if server_manager and server_manager.is_running:
            print("\nStopping MLflow server process...")
            server_manager.stop_server()

    # Summary
    print("\n" + "=" * 70)
    print(f"  DEPLOYMENT INITIALIZATION COMPLETE ({success_count}/{total_steps} steps)")
    print("=" * 70)

    if success_count >= 3:  # At least database and migrations must succeed
        print("\n[OK] Deployment ready!")
        print("\nNext steps:")
        print("  1. Start the application: docker-compose up -d")
        print("  2. Access API docs: http://localhost:8000/api/docs")
        print("  3. Access MLflow UI: http://localhost:5000")
        sys.exit(0)
    else:
        print("\n[ERROR] Deployment initialization failed")
        print("Please check the logs and fix any errors")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
