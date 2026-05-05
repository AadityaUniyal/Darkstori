"""Complete automated training script - collects data and trains models."""
import sys
from pathlib import Path
import logging

# Add paths
sys.path.append(str(Path(__file__).parent))

from scripts.collect_training_data import DataCollector
from src.pipeline.training_pipeline import TrainingPipeline
from src.pipeline.prediction_pipeline import PredictionPipeline
import pandas as pd

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


def main():
    """Main training workflow."""
    
    # Create logs directory
    Path('logs').mkdir(exist_ok=True)
    
    print("\n" + "="*70)
    print("  DARK STORE INTELLIGENCE - AUTOMATED MODEL TRAINING")
    print("="*70)
    
    try:
        # STEP 1: Collect Training Data
        print("\n[DATA] STEP 1: Collecting Training Data from Internet Sources...")
        print("-" * 70)
        
        collector = DataCollector()
        data = collector.collect_all_data()
        
        print(f"\n[OK] Data Collection Summary:")
        print(f"  - PIN Codes: {len(data['pincodes']):,}")
        print(f"  - Dark Stores: {len(data['stores']):,}")
        print(f"  - Order Records: {len(data['orders']):,}")
        print(f"  - Coverage Data: {len(data['coverage']):,}")
        
        # STEP 2: Train Models
        print("\n[TRAIN] STEP 2: Training Machine Learning Models...")
        print("-" * 70)
        
        pipeline = TrainingPipeline()
        results = pipeline.run(target_col='order_count', test_size=0.2)
        
        # STEP 3: Display Results
        print("\n[RESULTS] STEP 3: Model Performance Results")
        print("=" * 70)
        
        print(f"\n[BEST] Best Model: {results['best_model'].upper()}")
        print("\n" + "-" * 70)
        print(f"{'Model':<20} {'R2 Score':<12} {'RMSE':<12} {'MAE':<12} {'MAPE':<12}")
        print("-" * 70)
        
        for model_name, metrics in results['metrics'].items():
            print(f"{model_name:<20} {metrics['r2']:<12.4f} {metrics['rmse']:<12.2f} "
                  f"{metrics['mae']:<12.2f} {metrics['mape']:<12.2f}%")
        
        # Feature Importance
        if results['feature_importance'] is not None:
            print("\n" + "=" * 70)
            print("[FEATURES] TOP 10 MOST IMPORTANT FEATURES")
            print("=" * 70)
            
            for idx, row in results['feature_importance'].head(10).iterrows():
                bar_length = int(row['importance'] * 50)
                bar = "#" * bar_length
                print(f"{row['feature']:<30} {bar} {row['importance']:.4f}")
        
        # STEP 4: Generate Sample Predictions
        print("\n[PREDICT] STEP 4: Generating Sample Predictions...")
        print("-" * 70)
        
        try:
            pred_pipeline = PredictionPipeline()
            
            # Create sample data for prediction
            sample_data = pd.DataFrame({
                'pincode': ['560034', '400001', '110001'],
                'order_date': pd.date_range('2026-05-05', periods=3),
                'population': [150000, 200000, 180000],
                'coverage_score': [2, 3, 1],
                'city_tier': ['Metro', 'Metro', 'Metro'],
                'city': ['Bangalore', 'Mumbai', 'Delhi'],
                'state': ['Karnataka', 'Maharashtra', 'Delhi']
            })
            
            predictions = pred_pipeline.predict(sample_data)
            
            print("\nSample Predictions:")
            print("-" * 70)
            for i, (_, row) in enumerate(sample_data.iterrows()):
                print(f"{row['city']:<15} (PIN: {row['pincode']}) -> "
                      f"Predicted Orders: {int(predictions[i]):,}")
            
            # Generate 7-day forecast
            forecast = pred_pipeline.forecast_future(sample_data.iloc[[0]], periods=7)
            
            print("\n7-Day Forecast for Bangalore (560034):")
            print("-" * 70)
            print(f"{'Date':<12} {'Forecast':<15} {'Lower Bound':<15} {'Upper Bound':<15}")
            print("-" * 70)
            
            for _, row in forecast.iterrows():
                print(f"{row['date'].strftime('%Y-%m-%d'):<12} "
                      f"{int(row['forecast']):<15,} "
                      f"{int(row['lower_bound']):<15,} "
                      f"{int(row['upper_bound']):<15,}")
            
            # Save forecast
            forecast_file = Path('data/processed/forecast_results.csv')
            forecast.to_csv(forecast_file, index=False)
            print(f"\n[OK] Forecast saved to: {forecast_file}")
            
        except Exception as e:
            logger.warning(f"Prediction step skipped: {e}")
        
        # STEP 5: Summary
        print("\n" + "=" * 70)
        print("[SUCCESS] TRAINING COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        
        print("\n[FILES] Generated Files:")
        print(f"  - Training Data: data/processed/training_data.csv")
        print(f"  - Models: models/[timestamp]/")
        print(f"  - Logs: logs/training.log")
        print(f"  - Forecast: data/processed/forecast_results.csv")
        
        print("\n[NEXT] Next Steps:")
        print("  1. View dashboard: streamlit run dashboard/app.py")
        print("  2. Start backend: uvicorn backend.app:app --reload")
        print("  3. Make predictions: python -m src.pipeline.prediction_pipeline")
        
        print("\n" + "=" * 70)
        
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        print(f"\n[ERROR] Error: {e}")
        print("\nCheck logs/training.log for details")
        sys.exit(1)


if __name__ == "__main__":
    main()
