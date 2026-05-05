"""Prediction pipeline for making forecasts on new data."""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Union
import logging
from datetime import datetime, timedelta
import joblib

from src.pipeline.training_pipeline import ModelTrainer
from src.pipeline.data_pipeline import DataPipeline

logger = logging.getLogger(__name__)


class PredictionPipeline:
    """Make predictions using trained models."""
    
    def __init__(self, model_version: str = None):
        """
        Initialize prediction pipeline.
        
        Args:
            model_version: Version of model to load (latest if None)
        """
        self.model_trainer = ModelTrainer()
        self.data_pipeline = DataPipeline()
        
        # Load trained model
        if model_version:
            self.model_trainer.load_models(model_version)
        else:
            # Load latest version
            model_dir = Path("models")
            if model_dir.exists():
                versions = sorted([d.name for d in model_dir.iterdir() if d.is_dir()])
                if versions:
                    latest_version = versions[-1]
                    self.model_trainer.load_models(latest_version)
                    logger.info(f"Loaded latest model version: {latest_version}")
                else:
                    raise ValueError("No trained models found")
            else:
                raise ValueError("Models directory not found")
    
    def prepare_input_data(self, input_data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare input data for prediction.
        
        Args:
            input_data: Raw input DataFrame
            
        Returns:
            Processed DataFrame ready for prediction
        """
        logger.info("Preparing input data...")
        
        # Apply same feature engineering as training
        processed_data = self.data_pipeline.engineer_features(input_data)
        
        # Select only features used in training
        available_features = [f for f in self.model_trainer.feature_names if f in processed_data.columns]
        
        # Add missing features with default values
        for feature in self.model_trainer.feature_names:
            if feature not in processed_data.columns:
                processed_data[feature] = 0
        
        # Select features in correct order
        X = processed_data[self.model_trainer.feature_names]
        
        # Handle missing values
        X = X.fillna(X.median())
        
        return X
    
    def predict(
        self,
        input_data: pd.DataFrame,
        model_name: str = None
    ) -> np.ndarray:
        """
        Make predictions.
        
        Args:
            input_data: Input DataFrame
            model_name: Specific model to use (best model if None)
            
        Returns:
            Array of predictions
        """
        logger.info("Making predictions...")
        
        # Prepare data
        X = self.prepare_input_data(input_data)
        
        # Scale features
        scaler = self.model_trainer.scalers.get('standard')
        if scaler:
            X_scaled = scaler.transform(X)
        else:
            X_scaled = X.values
        
        # Select model
        if model_name and model_name in self.model_trainer.models:
            model = self.model_trainer.models[model_name]
        else:
            model = self.model_trainer.best_model
        
        # Make predictions
        predictions = model.predict(X_scaled)
        
        logger.info(f"Generated {len(predictions)} predictions")
        
        return predictions
    
    def predict_with_confidence(
        self,
        input_data: pd.DataFrame,
        confidence_level: float = 0.95
    ) -> pd.DataFrame:
        """
        Make predictions with confidence intervals.
        
        Args:
            input_data: Input DataFrame
            confidence_level: Confidence level for intervals
            
        Returns:
            DataFrame with predictions and confidence intervals
        """
        logger.info("Making predictions with confidence intervals...")
        
        # Get predictions from all models
        all_predictions = []
        
        for model_name, model in self.model_trainer.models.items():
            preds = self.predict(input_data, model_name)
            all_predictions.append(preds)
        
        # Calculate ensemble statistics
        predictions_array = np.array(all_predictions)
        mean_pred = predictions_array.mean(axis=0)
        std_pred = predictions_array.std(axis=0)
        
        # Calculate confidence intervals
        z_score = 1.96 if confidence_level == 0.95 else 2.576  # 95% or 99%
        margin = z_score * std_pred
        
        results = pd.DataFrame({
            'prediction': mean_pred,
            'lower_bound': mean_pred - margin,
            'upper_bound': mean_pred + margin,
            'std_dev': std_pred
        })
        
        return results
    
    def forecast_future(
        self,
        base_data: pd.DataFrame,
        periods: int = 30,
        freq: str = 'D'
    ) -> pd.DataFrame:
        """
        Forecast future values.
        
        Args:
            base_data: Historical data
            periods: Number of periods to forecast
            freq: Frequency ('D' for daily, 'W' for weekly, 'M' for monthly)
            
        Returns:
            DataFrame with forecasts
        """
        logger.info(f"Forecasting {periods} periods into the future...")
        
        # Get last date from base data
        if 'order_date' in base_data.columns:
            last_date = pd.to_datetime(base_data['order_date']).max()
        else:
            last_date = datetime.now()
        
        # Generate future dates
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=periods,
            freq=freq
        )
        
        # Create future data template
        future_data = pd.DataFrame({
            'order_date': future_dates
        })
        
        # Add features from last known values
        for col in base_data.columns:
            if col != 'order_date' and col not in future_data.columns:
                # Use last known value or median
                if base_data[col].dtype in [np.float64, np.int64]:
                    future_data[col] = base_data[col].median()
                else:
                    future_data[col] = base_data[col].mode()[0] if len(base_data[col].mode()) > 0 else None
        
        # Make predictions
        predictions = self.predict_with_confidence(future_data)
        
        # Combine with dates
        forecast_df = pd.DataFrame({
            'date': future_dates,
            'forecast': predictions['prediction'],
            'lower_bound': predictions['lower_bound'],
            'upper_bound': predictions['upper_bound']
        })
        
        logger.info("Forecast completed")
        
        return forecast_df
    
    def batch_predict(
        self,
        input_file: str,
        output_file: str,
        batch_size: int = 1000
    ):
        """
        Make predictions on large dataset in batches.
        
        Args:
            input_file: Path to input CSV file
            output_file: Path to output CSV file
            batch_size: Number of rows per batch
        """
        logger.info(f"Starting batch prediction from {input_file}...")
        
        # Read input file in chunks
        chunks = pd.read_csv(input_file, chunksize=batch_size)
        
        all_predictions = []
        
        for i, chunk in enumerate(chunks):
            logger.info(f"Processing batch {i+1}...")
            
            # Make predictions
            predictions = self.predict(chunk)
            
            # Add predictions to chunk
            chunk['prediction'] = predictions
            all_predictions.append(chunk)
        
        # Combine all results
        results = pd.concat(all_predictions, ignore_index=True)
        
        # Save to file
        results.to_csv(output_file, index=False)
        logger.info(f"Saved predictions to {output_file}")
    
    def explain_prediction(
        self,
        input_data: pd.DataFrame,
        index: int = 0
    ) -> Dict:
        """
        Explain a single prediction using feature importance.
        
        Args:
            input_data: Input DataFrame
            index: Index of row to explain
            
        Returns:
            Dictionary with explanation
        """
        # Get prediction
        prediction = self.predict(input_data.iloc[[index]])[0]
        
        # Get feature values
        X = self.prepare_input_data(input_data.iloc[[index]])
        feature_values = X.iloc[0].to_dict()
        
        # Get feature importance
        if hasattr(self.model_trainer.best_model, 'feature_importances_'):
            importance = self.model_trainer.best_model.feature_importances_
            
            # Create explanation
            feature_contributions = []
            for feature, value in feature_values.items():
                idx = self.model_trainer.feature_names.index(feature)
                contribution = importance[idx] * value
                feature_contributions.append({
                    'feature': feature,
                    'value': value,
                    'importance': importance[idx],
                    'contribution': contribution
                })
            
            # Sort by contribution
            feature_contributions.sort(key=lambda x: abs(x['contribution']), reverse=True)
            
            return {
                'prediction': prediction,
                'top_features': feature_contributions[:10]
            }
        else:
            return {
                'prediction': prediction,
                'top_features': []
            }


if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Example usage
    try:
        # Initialize prediction pipeline
        pipeline = PredictionPipeline()
        
        # Load sample data
        sample_data = pd.DataFrame({
            'pincode': ['560034', '400001', '110001'],
            'order_date': pd.date_range('2026-05-01', periods=3),
            'population': [150000, 200000, 180000],
            'coverage_score': [2, 3, 1],
            'city_tier': ['Metro', 'Metro', 'Metro']
        })
        
        # Make predictions
        predictions = pipeline.predict(sample_data)
        print("\nPredictions:", predictions)
        
        # Forecast future
        forecast = pipeline.forecast_future(sample_data, periods=7)
        print("\n7-Day Forecast:")
        print(forecast)
        
    except Exception as e:
        logger.error(f"Error: {e}")
        print("\nNote: Train models first using training_pipeline.py")
