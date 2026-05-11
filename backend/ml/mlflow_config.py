"""MLflow Configuration Module.

This module provides configuration management for MLflow tracking server,
experiments, and model registry. It loads settings from environment variables
and YAML configuration files.
"""

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class MLflowServerConfig:
    """MLflow server configuration."""

    host: str = "0.0.0.0"
    port: int = 5000
    workers: int = 1


@dataclass
class ExperimentConfig:
    """Experiment configuration."""

    name: str
    description: str = ""


@dataclass
class MLflowConfig:
    """Main MLflow configuration."""

    tracking_uri: str
    artifact_location: str = "./mlruns"
    server: MLflowServerConfig = field(default_factory=MLflowServerConfig)
    experiments: List[ExperimentConfig] = field(default_factory=list)
    enable_tracking: bool = True

    def __post_init__(self):
        """Validate and process configuration after initialization."""
        # Ensure artifact location exists
        artifact_path = Path(self.artifact_location)
        artifact_path.mkdir(parents=True, exist_ok=True)

        # Substitute environment variables in tracking_uri
        self.tracking_uri = self._substitute_env_vars(self.tracking_uri)

    @staticmethod
    def _substitute_env_vars(value: str) -> str:
        """Substitute environment variables in configuration values."""
        if isinstance(value, str) and "${" in value:
            # Extract variable name between ${ and }
            import re

            pattern = r"\$\{([^}]+)\}"
            matches = re.findall(pattern, value)
            for var_name in matches:
                env_value = os.getenv(var_name, "")
                value = value.replace(f"${{{var_name}}}", env_value)
        return value

    @classmethod
    def from_yaml(cls, yaml_path: str) -> "MLflowConfig":
        """Load configuration from YAML file."""
        yaml_file = Path(yaml_path)
        if not yaml_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {yaml_path}")

        with open(yaml_file, "r") as f:
            config_dict = yaml.safe_load(f)

        mlflow_config = config_dict.get("mlflow", {})

        # Parse server config
        server_config = mlflow_config.get("server", {})
        server = MLflowServerConfig(
            host=server_config.get("host", "0.0.0.0"),
            port=server_config.get("port", 5000),
            workers=server_config.get("workers", 1),
        )

        # Parse experiments
        experiments = []
        for exp_dict in mlflow_config.get("experiments", []):
            experiments.append(
                ExperimentConfig(
                    name=exp_dict["name"], description=exp_dict.get("description", "")
                )
            )

        # Create main config
        tracking_uri = mlflow_config.get(
            "tracking_uri", os.getenv("MLFLOW_TRACKING_URI", "")
        )
        # Substitute environment variables if present
        tracking_uri = cls._substitute_env_vars(tracking_uri)
        artifact_location = mlflow_config.get("artifact_location", "./mlruns")

        return cls(
            tracking_uri=tracking_uri,
            artifact_location=artifact_location,
            server=server,
            experiments=experiments,
            enable_tracking=mlflow_config.get("enable_tracking", True),
        )

    @classmethod
    def from_env(cls) -> "MLflowConfig":
        """Load configuration from environment variables."""
        tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "")
        artifact_location = os.getenv("MLFLOW_ARTIFACT_LOCATION", "./mlruns")

        server = MLflowServerConfig(
            host=os.getenv("MLFLOW_SERVER_HOST", "0.0.0.0"),
            port=int(os.getenv("MLFLOW_SERVER_PORT", "5000")),
            workers=int(os.getenv("MLFLOW_SERVER_WORKERS", "1")),
        )

        enable_tracking = os.getenv("MLFLOW_ENABLE_TRACKING", "true").lower() == "true"

        return cls(
            tracking_uri=tracking_uri,
            artifact_location=artifact_location,
            server=server,
            experiments=[],
            enable_tracking=enable_tracking,
        )

    def get_backend_store_uri(self) -> str:
        """Get the backend store URI for MLflow server."""
        return self.tracking_uri

    def get_artifact_root(self) -> str:
        """Get the artifact root directory."""
        return str(Path(self.artifact_location).absolute())

    def validate(self) -> bool:
        """Validate configuration."""
        if not self.tracking_uri:
            raise ValueError("MLFLOW_TRACKING_URI is required")

        if not self.artifact_location:
            raise ValueError("MLFLOW_ARTIFACT_LOCATION is required")

        # Validate tracking URI format
        if self.tracking_uri.startswith("postgresql"):
            # Ensure it has the correct format
            if "psycopg2" not in self.tracking_uri:
                logger.warning(
                    "PostgreSQL tracking URI should use psycopg2 driver. "
                    "Example: postgresql+psycopg2://user:pass@host:port/db"
                )

        return True


class TrainingConfig(BaseModel):
    """Training pipeline configuration."""

    class DataConfig(BaseModel):
        """Data configuration."""

        test_size: float = Field(default=0.2, ge=0.0, le=1.0)
        validation_size: float = Field(default=0.1, ge=0.0, le=1.0)
        random_seed: int = Field(default=42)
        time_series_split: bool = Field(default=False)

    class FeatureEngineeringConfig(BaseModel):
        """Feature engineering configuration."""

        scaling_method: str = Field(default="standard")
        missing_value_strategy: str = Field(default="median")
        lag_periods: List[int] = Field(default=[1, 7, 14, 30])
        rolling_windows: List[int] = Field(default=[7, 14, 30])

        @field_validator("scaling_method")
        @classmethod
        def validate_scaling_method(cls, v):
            allowed = ["standard", "robust", "none"]
            if v not in allowed:
                raise ValueError(f"scaling_method must be one of {allowed}")
            return v

        @field_validator("missing_value_strategy")
        @classmethod
        def validate_missing_strategy(cls, v):
            allowed = ["median", "mean", "forward_fill"]
            if v not in allowed:
                raise ValueError(f"missing_value_strategy must be one of {allowed}")
            return v

    class EvaluationConfig(BaseModel):
        """Evaluation configuration."""

        cv_folds: int = Field(default=5, ge=2)
        metrics: List[str] = Field(default=["mae", "rmse", "r2", "mape", "mse"])
        thresholds: Dict[str, float] = Field(
            default={"min_r2": 0.80, "max_mape": 15.0, "max_latency_ms": 100.0}
        )

    class ModelSelectionConfig(BaseModel):
        """Model selection configuration."""

        primary_metric: str = Field(default="r2")
        improvement_threshold: float = Field(default=0.02)

    data: DataConfig = Field(default_factory=DataConfig)
    feature_engineering: FeatureEngineeringConfig = Field(
        default_factory=FeatureEngineeringConfig
    )
    models: Dict[str, Dict[str, List[Any]]] = Field(default_factory=dict)
    evaluation: EvaluationConfig = Field(default_factory=EvaluationConfig)
    model_selection: ModelSelectionConfig = Field(default_factory=ModelSelectionConfig)


class MonitoringConfig(BaseModel):
    """Monitoring configuration."""

    class DriftDetectionConfig(BaseModel):
        """Drift detection configuration."""

        enabled: bool = Field(default=True)
        check_frequency_days: int = Field(default=7)
        ks_test_threshold: float = Field(default=0.05)
        drift_threshold: float = Field(default=0.20)

    class PerformanceDegradationConfig(BaseModel):
        """Performance degradation configuration."""

        r2_warning_threshold: float = Field(default=0.80)
        r2_alert_threshold: float = Field(default=0.75)

    class AlertsConfig(BaseModel):
        """Alerts configuration."""

        email_enabled: bool = Field(default=True)
        slack_enabled: bool = Field(default=False)

    enabled: bool = Field(default=True)
    rolling_windows: List[int] = Field(default=[7, 30, 90])
    drift_detection: DriftDetectionConfig = Field(default_factory=DriftDetectionConfig)
    performance_degradation: PerformanceDegradationConfig = Field(
        default_factory=PerformanceDegradationConfig
    )
    alerts: AlertsConfig = Field(default_factory=AlertsConfig)


class RetrainingConfig(BaseModel):
    """Retraining configuration."""

    class TriggersConfig(BaseModel):
        """Retraining triggers configuration."""

        min_data_growth_pct: float = Field(default=10.0)
        performance_drop_threshold: float = Field(default=0.75)

    class AutoPromoteConfig(BaseModel):
        """Auto-promotion configuration."""

        enabled: bool = Field(default=False)
        min_improvement_pct: float = Field(default=3.0)

    enabled: bool = Field(default=True)
    schedule: str = Field(default="0 2 * * 0")  # Cron format
    triggers: TriggersConfig = Field(default_factory=TriggersConfig)
    auto_promote: AutoPromoteConfig = Field(default_factory=AutoPromoteConfig)


class MLConfig(BaseModel):
    """Complete ML system configuration."""

    mlflow: Optional[MLflowConfig] = None
    training: TrainingConfig = Field(default_factory=TrainingConfig)
    monitoring: MonitoringConfig = Field(default_factory=MonitoringConfig)
    retraining: RetrainingConfig = Field(default_factory=RetrainingConfig)

    @classmethod
    def from_yaml(cls, yaml_path: str) -> "MLConfig":
        """Load complete configuration from YAML file."""
        yaml_file = Path(yaml_path)
        if not yaml_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {yaml_path}")

        with open(yaml_file, "r") as f:
            config_dict = yaml.safe_load(f)

        # Load MLflow config
        mlflow_config = MLflowConfig.from_yaml(yaml_path)

        # Parse other configs using Pydantic
        training_config = TrainingConfig(**config_dict.get("training", {}))
        monitoring_config = MonitoringConfig(**config_dict.get("monitoring", {}))
        retraining_config = RetrainingConfig(**config_dict.get("retraining", {}))

        return cls(
            mlflow=mlflow_config,
            training=training_config,
            monitoring=monitoring_config,
            retraining=retraining_config,
        )


# Global configuration instance
_config: Optional[MLConfig] = None

# Global MLflow config instance for easy access
mlflow_config = MLflowConfig.from_env()


def get_mlflow_config(config_path: Optional[str] = None) -> MLflowConfig:
    """Get MLflow configuration.

    Args:
        config_path: Path to YAML configuration file. If None, loads from environment.

    Returns:
        MLflowConfig instance
    """
    if config_path:
        return MLflowConfig.from_yaml(config_path)
    else:
        return MLflowConfig.from_env()


def get_ml_config(config_path: Optional[str] = None) -> MLConfig:
    """Get complete ML configuration.

    Args:
        config_path: Path to YAML configuration file. If None, uses default.

    Returns:
        MLConfig instance
    """
    global _config

    if _config is None:
        if config_path is None:
            # Use default config path
            config_path = (
                Path(__file__).parent.parent.parent / "config" / "ml_config.yaml"
            )

        if Path(config_path).exists():
            _config = MLConfig.from_yaml(str(config_path))
        else:
            logger.warning(f"Config file not found: {config_path}. Using defaults.")
            _config = MLConfig(
                mlflow=MLflowConfig.from_env(),
                training=TrainingConfig(),
                monitoring=MonitoringConfig(),
                retraining=RetrainingConfig(),
            )

    return _config


def reload_config(config_path: Optional[str] = None) -> MLConfig:
    """Reload configuration from file.

    Args:
        config_path: Path to YAML configuration file.

    Returns:
        MLConfig instance
    """
    global _config
    _config = None
    return get_ml_config(config_path)


def get_mlflow_tracking_uri() -> str:
    """Get MLflow tracking URI from configuration.

    Returns:
        MLflow tracking URI string
    """
    config = get_mlflow_config()
    return config.tracking_uri


if __name__ == "__main__":
    # Test configuration loading
    import sys

    logging.basicConfig(level=logging.INFO)

    try:
        # Test loading from YAML
        config = get_ml_config()
        print("✓ Configuration loaded successfully")
        print(f"  Tracking URI: {config.mlflow.tracking_uri}")
        print(f"  Artifact Location: {config.mlflow.artifact_location}")
        print(f"  Server: {config.mlflow.server.host}:{config.mlflow.server.port}")
        print(f"  Experiments: {len(config.mlflow.experiments)}")
        for exp in config.mlflow.experiments:
            print(f"    - {exp.name}: {exp.description}")

        # Validate
        config.mlflow.validate()
        print("✓ Configuration validation passed")

    except Exception as e:
        print(f"✗ Configuration loading failed: {e}")
        sys.exit(1)
