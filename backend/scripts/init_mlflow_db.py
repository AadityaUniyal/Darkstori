"""Initialize MLflow Database Schema.

This script initializes the MLflow database schema by creating all necessary
tables for experiment tracking, model registry, and metadata storage.
"""

from backend.ml.mlflow_config import get_mlflow_config
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import create_engine, inspect, text
import logging
import sys
from pathlib import Path

# Add project root and backend dir to path
project_root = Path(__file__).parent.parent.parent
backend_dir = Path(__file__).parent.parent
for p in [str(project_root), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def check_mlflow_tables(engine) -> bool:
    """Check if MLflow tables exist in the database.

    Args:
        engine: SQLAlchemy engine

    Returns:
        True if MLflow tables exist, False otherwise
    """
    inspector = inspect(engine)

    # Core MLflow tables
    required_tables = [
        "experiments",
        "runs",
        "metrics",
        "params",
        "tags",
        "registered_models",
        "model_versions",
    ]

    existing_tables = inspector.get_table_names()

    # Check if tables exist (they might be in a schema)
    mlflow_tables_found = []
    for table in required_tables:
        if table in existing_tables:
            mlflow_tables_found.append(table)

    logger.info(
        f"Found {len(mlflow_tables_found)}/{len(required_tables)} MLflow tables"
    )

    return len(mlflow_tables_found) == len(required_tables)


def initialize_mlflow_schema(backend_store_uri: str) -> bool:
    """Initialize MLflow database schema.

    This function uses MLflow's built-in schema initialization to create
    all necessary tables for experiment tracking and model registry.

    Args:
        backend_store_uri: Database connection URI

    Returns:
        True if initialization successful, False otherwise
    """
    try:
        logger.info("Initializing MLflow database schema...")

        # If file URI, skip SQLAlchemy database engine initialization
        if backend_store_uri.startswith("file://") or backend_store_uri.startswith("file:"):
            logger.info("MLflow configured with filesystem backend. Skipping database schema initialization.")
            return True

        # Create SQLAlchemy engine
        engine = create_engine(backend_store_uri)

        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")

        # Check if MLflow tables already exist
        if check_mlflow_tables(engine):
            logger.info("MLflow tables already exist, skipping initialization")
            return True

        # Initialize MLflow schema using mlflow's built-in functionality
        # MLflow will automatically create tables on first use
        import mlflow
        from mlflow.tracking import MlflowClient

        # Set tracking URI
        mlflow.set_tracking_uri(backend_store_uri)

        # Create a client - this will initialize the schema
        client = MlflowClient(tracking_uri=backend_store_uri)

        # Try to list experiments - this triggers schema creation
        try:
            experiments = client.search_experiments()
            logger.info(f"Found {len(experiments)} existing experiments")
        except Exception as e:
            logger.warning(f"Error listing experiments: {e}")

        # Verify tables were created
        if check_mlflow_tables(engine):
            logger.info("✓ MLflow schema initialized successfully")
            return True
        else:
            logger.error("✗ MLflow schema initialization incomplete")
            return False

    except SQLAlchemyError as e:
        logger.error(f"Database error during initialization: {e}")
        return False
    except Exception as e:
        logger.error(f"Error initializing MLflow schema: {e}")
        return False


def create_default_experiments(backend_store_uri: str, experiments: list) -> bool:
    """Create default experiments in MLflow.

    Args:
        backend_store_uri: Database connection URI
        experiments: List of experiment configurations

    Returns:
        True if experiments created successfully, False otherwise
    """
    try:
        import mlflow
        from mlflow.tracking import MlflowClient

        mlflow.set_tracking_uri(backend_store_uri)
        client = MlflowClient(tracking_uri=backend_store_uri)

        logger.info("Creating default experiments...")

        for exp_config in experiments:
            exp_name = exp_config.name
            exp_description = exp_config.description

            try:
                # Check if experiment already exists
                experiment = client.get_experiment_by_name(exp_name)

                if experiment:
                    logger.info(
                        f"  Experiment '{exp_name}' already exists (ID: {experiment.experiment_id})"
                    )
                else:
                    # Create new experiment
                    exp_id = client.create_experiment(
                        name=exp_name, tags={"description": exp_description}
                    )
                    logger.info(f"  ✓ Created experiment '{exp_name}' (ID: {exp_id})")

            except Exception as e:
                logger.error(f"  ✗ Failed to create experiment '{exp_name}': {e}")
                return False

        logger.info("✓ Default experiments created successfully")
        return True

    except Exception as e:
        logger.error(f"Error creating default experiments: {e}")
        return False


def verify_mlflow_setup(backend_store_uri: str) -> bool:
    """Verify MLflow setup is complete and functional.

    Args:
        backend_store_uri: Database connection URI

    Returns:
        True if setup is valid, False otherwise
    """
    try:
        import mlflow
        from mlflow.tracking import MlflowClient

        logger.info("Verifying MLflow setup...")

        mlflow.set_tracking_uri(backend_store_uri)
        client = MlflowClient(tracking_uri=backend_store_uri)

        # Test 1: List experiments
        experiments = client.search_experiments()
        logger.info(f"  ✓ Can list experiments (found {len(experiments)})")

        # Test 2: Create a test run
        test_exp_name = "_mlflow_setup_test"
        try:
            exp = client.get_experiment_by_name(test_exp_name)
            if not exp:
                exp_id = client.create_experiment(test_exp_name)
            elif exp.lifecycle_stage == "deleted":
                client.restore_experiment(exp.experiment_id)
                exp_id = exp.experiment_id
            else:
                exp_id = exp.experiment_id

            # Create a test run
            run = client.create_run(exp_id)
            run_id = run.info.run_id

            # Log a test parameter and metric
            client.log_param(run_id, "test_param", "test_value")
            client.log_metric(run_id, "test_metric", 1.0)

            # End the run
            client.set_terminated(run_id)

            # Delete the test experiment
            client.delete_experiment(exp_id)

            logger.info("  ✓ Can create and manage runs")

        except Exception as e:
            logger.error(f"  ✗ Failed to create test run: {e}")
            return False

        # Test 3: Check database tables
        if backend_store_uri.startswith("file://") or backend_store_uri.startswith("file:"):
            logger.info("  ✓ Skipping database tables check (filesystem backend)")
        else:
            engine = create_engine(backend_store_uri)
            if check_mlflow_tables(engine):
                logger.info("  ✓ All required tables exist")
            else:
                logger.error("  ✗ Some required tables are missing")
                return False

        logger.info("✓ MLflow setup verification passed")
        return True

    except Exception as e:
        logger.error(f"Error verifying MLflow setup: {e}")
        return False


async def init_mlflow_database() -> bool:
    """Wrapper function to initialize and verify the MLflow database."""
    try:
        config = get_mlflow_config()
        backend_store_uri = config.get_backend_store_uri()
        
        # Initialize schema
        if not initialize_mlflow_schema(backend_store_uri):
            return False
            
        # Create default experiments
        if config.experiments:
            create_default_experiments(backend_store_uri, config.experiments)
            
        # Verify setup
        return verify_mlflow_setup(backend_store_uri)
    except Exception as e:
        logger.error(f"init_mlflow_database failed: {e}")
        return False


def main():
    """Main initialization function."""
    import argparse

    parser = argparse.ArgumentParser(description="Initialize MLflow database schema")
    parser.add_argument("--config", type=str, help="Path to ML configuration file")
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify existing setup without initialization",
    )
    parser.add_argument(
        "--skip-experiments",
        action="store_true",
        help="Skip creating default experiments",
    )

    args = parser.parse_args()

    try:
        # Load configuration
        if args.config:
            config = get_mlflow_config(args.config)
        else:
            config = get_mlflow_config()

        backend_store_uri = config.get_backend_store_uri()

        logger.info("=" * 60)
        logger.info("MLflow Database Initialization")
        logger.info("=" * 60)
        logger.info(f"Backend Store URI: {backend_store_uri.split('@')[0]}@***")
        logger.info(f"Artifact Location: {config.artifact_location}")
        logger.info("=" * 60)

        if args.verify_only:
            # Only verify existing setup
            if verify_mlflow_setup(backend_store_uri):
                logger.info("\n✓ MLflow setup is valid and functional")
                return 0
            else:
                logger.error("\n✗ MLflow setup verification failed")
                return 1

        # Initialize schema
        if not initialize_mlflow_schema(backend_store_uri):
            logger.error("\n✗ Failed to initialize MLflow schema")
            return 1

        # Create default experiments
        if not args.skip_experiments and config.experiments:
            if not create_default_experiments(backend_store_uri, config.experiments):
                logger.warning("\n⚠ Failed to create some default experiments")

        # Verify setup
        if verify_mlflow_setup(backend_store_uri):
            logger.info("\n" + "=" * 60)
            logger.info("✓ MLflow database initialization completed successfully")
            logger.info("=" * 60)
            return 0
        else:
            logger.error("\n✗ MLflow setup verification failed")
            return 1

    except Exception as e:
        logger.error(f"\n✗ Initialization failed: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
