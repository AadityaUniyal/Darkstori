"""
Model Explainability Module

Provides feature importance, SHAP values, and prediction explanations
for ML models to enhance interpretability and trust.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

logger = logging.getLogger(__name__)


class ModelExplainer:
    """Provides model explainability features including feature importance and SHAP values."""

    def __init__(self, model: Any, feature_names: List[str]):
        """
        Initialize the explainer.

        Args:
            model: Trained model (tree-based models supported)
            feature_names: List of feature names
        """
        self.model = model
        self.feature_names = feature_names
        self.shap_explainer = None

    def calculate_feature_importance(self) -> Dict[str, float]:
        """
        Calculate feature importance for tree-based models.

        Returns:
            Dictionary mapping feature names to importance scores
        """
        try:
            # Check if model has feature_importances_ attribute (tree-based models)
            if hasattr(self.model, "feature_importances_"):
                importances = self.model.feature_importances_
                importance_dict = dict(zip(self.feature_names, importances))

                # Sort by importance
                importance_dict = dict(
                    sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
                )

                logger.info(
                    f"Calculated feature importance for {len(importance_dict)} features"
                )
                return importance_dict
            else:
                logger.warning("Model does not support feature importance calculation")
                return {}

        except Exception as e:
            logger.error(f"Error calculating feature importance: {e}")
            return {}

    def generate_feature_importance_plot(
        self, output_path: Optional[str] = None, top_n: int = 20
    ) -> str:
        """
        Generate feature importance bar chart.

        Args:
            output_path: Path to save the plot
            top_n: Number of top features to display

        Returns:
            Path to saved plot
        """
        try:
            importance_dict = self.calculate_feature_importance()

            if not importance_dict:
                logger.warning("No feature importance to plot")
                return ""

            # Get top N features
            top_features = dict(list(importance_dict.items())[:top_n])

            # Create plot
            plt.figure(figsize=(10, 8))
            features = list(top_features.keys())
            importances = list(top_features.values())

            plt.barh(range(len(features)), importances)
            plt.yticks(range(len(features)), features)
            plt.xlabel("Importance Score")
            plt.ylabel("Feature")
            plt.title(f"Top {top_n} Feature Importances")
            plt.tight_layout()

            # Save plot
            if output_path is None:
                output_path = "feature_importance.png"

            plt.savefig(output_path, dpi=300, bbox_inches="tight")
            plt.close()

            logger.info(f"Feature importance plot saved to {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Error generating feature importance plot: {e}")
            return ""

    def calculate_shap_values(
        self, X: pd.DataFrame, sample_size: Optional[int] = 100
    ) -> Optional[np.ndarray]:
        """
        Calculate SHAP values for sample predictions.

        Args:
            X: Input features
            sample_size: Number of samples to use for SHAP calculation

        Returns:
            SHAP values array or None if calculation fails
        """
        try:
            import shap

            # Sample data if too large
            if len(X) > sample_size:
                X_sample = X.sample(n=sample_size, random_state=42)
            else:
                X_sample = X

            # Initialize SHAP explainer based on model type
            if hasattr(self.model, "tree_"):
                # Tree-based model
                self.shap_explainer = shap.TreeExplainer(self.model)
            else:
                # Use KernelExplainer as fallback
                self.shap_explainer = shap.KernelExplainer(self.model.predict, X_sample)

            # Calculate SHAP values
            shap_values = self.shap_explainer.shap_values(X_sample)

            logger.info(f"Calculated SHAP values for {len(X_sample)} samples")
            return shap_values

        except ImportError:
            logger.warning("SHAP library not installed. Install with: pip install shap")
            return None
        except Exception as e:
            logger.error(f"Error calculating SHAP values: {e}")
            return None

    def generate_shap_summary_plot(
        self, X: pd.DataFrame, output_path: Optional[str] = None, sample_size: int = 100
    ) -> str:
        """
        Generate SHAP summary plot.

        Args:
            X: Input features
            output_path: Path to save the plot
            sample_size: Number of samples to use

        Returns:
            Path to saved plot
        """
        try:
            import shap

            shap_values = self.calculate_shap_values(X, sample_size)

            if shap_values is None:
                return ""

            # Sample data
            if len(X) > sample_size:
                X_sample = X.sample(n=sample_size, random_state=42)
            else:
                X_sample = X

            # Create summary plot
            plt.figure(figsize=(10, 8))
            shap.summary_plot(
                shap_values, X_sample, feature_names=self.feature_names, show=False
            )

            # Save plot
            if output_path is None:
                output_path = "shap_summary.png"

            plt.savefig(output_path, dpi=300, bbox_inches="tight")
            plt.close()

            logger.info(f"SHAP summary plot saved to {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Error generating SHAP summary plot: {e}")
            return ""

    def generate_shap_dependence_plot(
        self,
        X: pd.DataFrame,
        feature_name: str,
        output_path: Optional[str] = None,
        sample_size: int = 100,
    ) -> str:
        """
        Generate SHAP dependence plot for a specific feature.

        Args:
            X: Input features
            feature_name: Name of feature to analyze
            output_path: Path to save the plot
            sample_size: Number of samples to use

        Returns:
            Path to saved plot
        """
        try:
            import shap

            shap_values = self.calculate_shap_values(X, sample_size)

            if shap_values is None:
                return ""

            # Sample data
            if len(X) > sample_size:
                X_sample = X.sample(n=sample_size, random_state=42)
            else:
                X_sample = X

            # Get feature index
            if feature_name not in self.feature_names:
                logger.warning(f"Feature {feature_name} not found")
                return ""

            feature_idx = self.feature_names.index(feature_name)

            # Create dependence plot
            plt.figure(figsize=(10, 6))
            shap.dependence_plot(
                feature_idx,
                shap_values,
                X_sample,
                feature_names=self.feature_names,
                show=False,
            )

            # Save plot
            if output_path is None:
                output_path = f"shap_dependence_{feature_name}.png"

            plt.savefig(output_path, dpi=300, bbox_inches="tight")
            plt.close()

            logger.info(f"SHAP dependence plot saved to {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Error generating SHAP dependence plot: {e}")
            return ""

    def explain_prediction(
        self, X: pd.DataFrame, prediction: float, top_n: int = 10
    ) -> Dict[str, Any]:
        """
        Explain an individual prediction.

        Args:
            X: Input features for single prediction (1 row)
            prediction: Model prediction value
            top_n: Number of top contributing features to return

        Returns:
            Dictionary with prediction explanation
        """
        try:
            explanation = {
                "prediction": float(prediction),
                "feature_contributions": {},
                "top_positive_contributors": [],
                "top_negative_contributors": [],
            }

            # Try to get SHAP values for this prediction
            shap_values = self.calculate_shap_values(X, sample_size=1)

            if shap_values is not None:
                # Get SHAP values for this prediction
                if len(shap_values.shape) > 1:
                    shap_vals = shap_values[0]
                else:
                    shap_vals = shap_values

                # Create feature contributions dictionary
                contributions = dict(zip(self.feature_names, shap_vals))

                # Sort by absolute contribution
                sorted_contributions = sorted(
                    contributions.items(), key=lambda x: abs(x[1]), reverse=True
                )

                # Get top positive and negative contributors
                positive = [(k, v) for k, v in sorted_contributions if v > 0][:top_n]
                negative = [(k, v) for k, v in sorted_contributions if v < 0][:top_n]

                explanation["feature_contributions"] = dict(
                    sorted_contributions[:top_n]
                )
                explanation["top_positive_contributors"] = [
                    {
                        "feature": k,
                        "contribution": float(v),
                        "value": float(X[k].iloc[0]),
                    }
                    for k, v in positive
                ]
                explanation["top_negative_contributors"] = [
                    {
                        "feature": k,
                        "contribution": float(v),
                        "value": float(X[k].iloc[0]),
                    }
                    for k, v in negative
                ]
            else:
                # Fallback to feature importance if SHAP not available
                importance = self.calculate_feature_importance()
                if importance:
                    top_features = list(importance.keys())[:top_n]
                    explanation["feature_contributions"] = {
                        k: float(X[k].iloc[0]) for k in top_features
                    }

            logger.info(f"Generated explanation for prediction: {prediction}")
            return explanation

        except Exception as e:
            logger.error(f"Error explaining prediction: {e}")
            return {"prediction": float(prediction), "error": str(e)}


def log_explainability_artifacts(
    model: Any,
    X_train: pd.DataFrame,
    feature_names: List[str],
    artifact_path: str = "explainability",
) -> Dict[str, str]:
    """
    Generate and log all explainability artifacts.

    Args:
        model: Trained model
        X_train: Training features
        feature_names: List of feature names
        artifact_path: Base path for artifacts

    Returns:
        Dictionary mapping artifact names to file paths
    """
    try:
        explainer = ModelExplainer(model, feature_names)
        artifacts = {}

        # Create artifact directory
        Path(artifact_path).mkdir(parents=True, exist_ok=True)

        # Generate feature importance plot
        fi_path = f"{artifact_path}/feature_importance.png"
        result = explainer.generate_feature_importance_plot(fi_path)
        if result:
            artifacts["feature_importance_plot"] = result

        # Generate SHAP summary plot
        shap_summary_path = f"{artifact_path}/shap_summary.png"
        result = explainer.generate_shap_summary_plot(X_train, shap_summary_path)
        if result:
            artifacts["shap_summary_plot"] = result

        # Generate SHAP dependence plots for top 3 features
        importance = explainer.calculate_feature_importance()
        if importance:
            top_features = list(importance.keys())[:3]
            for feature in top_features:
                dep_path = f"{artifact_path}/shap_dependence_{feature}.png"
                result = explainer.generate_shap_dependence_plot(
                    X_train, feature, dep_path
                )
                if result:
                    artifacts[f"shap_dependence_{feature}"] = result

        logger.info(f"Generated {len(artifacts)} explainability artifacts")
        return artifacts

    except Exception as e:
        logger.error(f"Error logging explainability artifacts: {e}")
        return {}
