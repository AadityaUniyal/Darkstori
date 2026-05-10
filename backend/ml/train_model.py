"""Complete automated training script with MLflow integration."""
import sys
from pathlib import Path
import logging
import asyncio
import yaml

# Add paths
sys.path.append(str(Path(__file__).parent.parent))

from backend.pipelines.mlflow_training_pipeline import MLflowTrainingPipeline
from backend.ml.model_registry import ModelRegistry
from backend.database.connection import get_async_session
from backend.core.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


def load_config(config_path: str = "config/ml_config.yaml") -> dict:
    """Load training configuration from YAML file."""
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        logger.info(f"Loaded configuration from {config_path}")
        return config
    except FileNotFoundError:
        logger.warning(f"Config file not found: {config_path}, using defaults")
        return {}
    except Exception as e:
        logger.error(f"Error loading config: {e}")
        return {}


async def main():
    """Main training workflow with MLflow integration."""
    
    # Create logs directory
    Path('logs').mkdir(exist_ok=True)
    
    print("\n" + "="*70)
    print("  DARK STORE INTELLIGENCE - ML TRAINING WITH MLFLOW")
    print("="*70)
    
    try:
        # Load configuration
        config = load_config()
        
        # STEP 1: Initialize MLflow Training Pipeline
        print("\n[MLFLOW] STEP 1: Initializing MLflow Training Pipeline...")
        print("-" * 70)
        
        experiment_name = config.get('mlflow', {}).get('experiment_name', 'demand_forecasting')
        
        async with get_async_session() as db_session:
            pipeline = MLflowTrainingPipeline(
                experiment_name=experiment_name,
                db_session=db_session
            )
            
            # STEP 2: Train Models with MLflow Tracking
            print("\n[TRAIN] STEP 2: Training Models with Experiment Tracking...")
            print("-" * 70)
            
            model_types = config.get('training', {}).get('model_types', [
                'random_forest',
                'gradient_boosting',
                'xgboost'
            ])
            
            tags = {
                'environment': 'production',
                'trigger': 'manual',
                'version': '1.0'
            }
            
            results = await pipeline.run(
                model_types=model_types,
                tags=tags
            )
            
            # STEP 3: Display Results
            print("\n[RESULTS] STEP 3: Model Performance Results")
            print("=" * 70)
            
            best_model = results.get('best_model', {})
            print(f"\n[BEST] Best Model: {best_model.get('model_type', 'Unknown').upper()}")
            print(f"[VERSION] Model Version: {best_model.get('version', 'Unknown')}")
            print(f"[RUN] MLflow Run ID: {best_model.get('run_id', 'Unknown')}")
            
            print("\n" + "-" * 70)
            print(f"{'Model':<20} {'R² Score':<12} {'RMSE':<12} {'MAE':<12} {'MAPE':<12}")
            print("-" * 70)
            
            for model_result in results.get('models', []):
                metrics = model_result.get('metrics', {})
                print(f"{model_result.get('model_type', 'Unknown'):<20} "
                      f"{metrics.get('r2_score', 0):<12.4f} "
                      f"{metrics.get('rmse', 0):<12.2f} "
                      f"{metrics.get('mae', 0):<12.2f} "
                      f"{metrics.get('mape', 0):<12.2f}%")
            
            # STEP 4: Model Registration
            print("\n[REGISTRY] STEP 4: Model Registration")
            print("-" * 70)
            
            if best_model.get('registered', False):
                print(f"[OK] Model registered: {best_model.get('model_name', 'Unknown')}")
                print(f"     Version: {best_model.get('version', 'Unknown')}")
                print(f"     Stage: {best_model.get('stage', 'None')}")
            else:
                print("[SKIP] Model registration skipped")
            
            # STEP 5: MLflow UI Information
            print("\n[MLFLOW] STEP 5: MLflow Tracking Information")
            print("-" * 70)
            
            mlflow_uri = config.get('mlflow', {}).get('tracking_uri', 'http://localhost:5000')
            print(f"MLflow UI: {mlflow_uri}")
            print(f"Experiment: {experiment_name}")
            print(f"Run ID: {best_model.get('run_id', 'Unknown')}")
            
            # STEP 6: Summary
            print("\n" + "=" * 70)
            print("[SUCCESS] TRAINING COMPLETED SUCCESSFULLY!")
            print("=" * 70)
            
            print("\n[ARTIFACTS] Generated Artifacts:")
            print(f"  - Model: Registered in MLflow Model Registry")
            print(f"  - Metrics: Logged to MLflow Tracking Server")
            print(f"  - Plots: Feature importance, residuals, predictions")
            print(f"  - Logs: logs/training.log")
            
            print("\n[NEXT] Next Steps:")
            print(f"  1. View MLflow UI: {mlflow_uri}")
            print(f"  2. Start backend: uvicorn backend.app:app --reload")
            print(f"  3. Make predictions via API: POST /api/v1/ml/predict")
            print(f"  4. Monitor performance: GET /api/v1/ml/performance")
            
            print("\n" + "=" * 70)
            
            return results
        
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        print(f"\n[ERROR] Error: {e}")
        print("\nCheck logs/training.log for details")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
