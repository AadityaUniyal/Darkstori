"""
Deployment Initialization Script

Initializes database, MLflow schema, and performs initial model training
for production deployment.
"""

import sys
import asyncio
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.database.connection import get_async_session, init_db
from backend.ml.mlflow_config import mlflow_config
from backend.scripts.init_mlflow_db import init_mlflow_database
from alembic import command
from alembic.config import Config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def run_database_migrations():
    """Run Alembic database migrations."""
    try:
        logger.info("Running database migrations...")
        
        # Get Alembic config
        alembic_cfg = Config("alembic.ini")
        
        # Run migrations
        command.upgrade(alembic_cfg, "head")
        
        logger.info("✓ Database migrations completed")
        return True
        
    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        return False


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
        
        mlflow.set_tracking_uri(mlflow_config.MLFLOW_TRACKING_URI)
        
        # Create default experiment
        experiment_name = "demand_forecasting"
        experiment = mlflow.get_experiment_by_name(experiment_name)
        
        if experiment is None:
            experiment_id = mlflow.create_experiment(
                experiment_name,
                artifact_location=f"{mlflow_config.MLFLOW_ARTIFACT_ROOT}/{experiment_name}"
            )
            logger.info(f"✓ Created experiment: {experiment_name} (ID: {experiment_id})")
        else:
            logger.info(f"✓ Experiment already exists: {experiment_name}")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to create default experiment: {e}")
        return False


async def run_initial_training():
    """Run initial model training."""
    try:
        logger.info("Running initial model training...")
        
        from backend.pipelines.mlflow_training_pipeline import MLflowTrainingPipeline
        
        async with get_async_session() as db_session:
            pipeline = MLflowTrainingPipeline(
                experiment_name="demand_forecasting",
                db_session=db_session
            )
            
            results = await pipeline.run(
                model_types=['random_forest', 'gradient_boosting', 'xgboost'],
                tags={
                    'environment': 'production',
                    'trigger': 'initial_deployment',
                    'version': '1.0'
                }
            )
            
            best_model = results.get('best_model', {})
            logger.info(
                f"✓ Initial training completed - "
                f"Best model: {best_model.get('model_type', 'Unknown')} "
                f"(R²: {best_model.get('metrics', {}).get('r2_score', 0):.4f})"
            )
        
        return True
        
    except Exception as e:
        logger.error(f"Initial training failed: {e}")
        logger.warning("Deployment can continue without initial model")
        return False


async def main():
    """Main deployment initialization workflow."""
    
    print("\n" + "="*70)
    print("  DEPLOYMENT INITIALIZATION")
    print("="*70)
    
    success_count = 0
    total_steps = 5
    
    # Step 1: Verify database connection
    print("\n[1/5] Verifying database connection...")
    if await verify_database_connection():
        success_count += 1
    else:
        print("✗ Database connection failed - cannot continue")
        sys.exit(1)
    
    # Step 2: Run database migrations
    print("\n[2/5] Running database migrations...")
    if await run_database_migrations():
        success_count += 1
    else:
        print("✗ Database migrations failed - cannot continue")
        sys.exit(1)
    
    # Step 3: Initialize MLflow
    print("\n[3/5] Initializing MLflow...")
    if await initialize_mlflow():
        success_count += 1
    else:
        print("⚠ MLflow initialization failed - continuing anyway")
    
    # Step 4: Create default experiment
    print("\n[4/5] Creating default MLflow experiment...")
    if await create_default_experiment():
        success_count += 1
    else:
        print("⚠ Experiment creation failed - continuing anyway")
    
    # Step 5: Run initial training (optional)
    print("\n[5/5] Running initial model training...")
    print("(This may take several minutes...)")
    if await run_initial_training():
        success_count += 1
    else:
        print("⚠ Initial training failed - can train models later")
    
    # Summary
    print("\n" + "="*70)
    print(f"  DEPLOYMENT INITIALIZATION COMPLETE ({success_count}/{total_steps} steps)")
    print("="*70)
    
    if success_count >= 3:  # At least database and migrations must succeed
        print("\n✓ Deployment ready!")
        print("\nNext steps:")
        print("  1. Start the application: docker-compose up -d")
        print("  2. Access API docs: http://localhost:8000/api/docs")
        print("  3. Access MLflow UI: http://localhost:5000")
        sys.exit(0)
    else:
        print("\n✗ Deployment initialization failed")
        print("Please check the logs and fix any errors")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
