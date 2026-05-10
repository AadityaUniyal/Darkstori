# Design Document: ML Training & Tracking Enhancement

## Overview

This design document specifies the architecture and implementation approach for integrating MLflow into the Darkstori Quick Commerce Intelligence Platform. The system will provide comprehensive experiment tracking, model versioning, performance monitoring, and reproducible ML workflows for demand forecasting and coverage gap analysis models.

### Current State

The platform currently implements ML models using:
- **Algorithms**: XGBoost, Random Forest, Gradient Boosting
- **Training Pipeline**: `backend/pipelines/training_pipeline.py` with ModelTrainer class
- **Prediction Pipeline**: `backend/pipelines/prediction_pipeline.py` with PredictionPipeline class
- **Data Pipeline**: `backend/pipelines/data_pipeline.py` for feature engineering
- **Storage**: Local filesystem with joblib serialization
- **Versioning**: Timestamp-based directory structure

### Target State

The enhanced system will provide:
- **Centralized Tracking**: MLflow server with PostgreSQL backend
- **Experiment Management**: Automated logging of parameters, metrics, and artifacts
- **Model Registry**: Versioned models with lifecycle management (None → Staging → Production → Archived)
- **Performance Monitoring**: Real-time tracking of model performance and drift detection
- **API Integration**: FastAPI endpoints for model serving with automatic model loading
- **Reproducibility**: Complete lineage tracking from data to deployed models

### Key Design Decisions

1. **MLflow Deployment**: Run MLflow server as a separate process in the same container as FastAPI (shared deployment, separate processes)
2. **Backend Store**: Use existing Neon PostgreSQL database with dedicated MLflow schema
3. **Artifact Store**: Local filesystem at `./mlruns` with future S3 migration path
4. **Model Loading**: In-memory caching with automatic reload on model version changes
5. **Configuration**: YAML-based configuration with environment variable overrides
6. **Integration**: Wrapper classes around existing pipelines to minimize code changes



## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Docker Container                             │
│                                                                       │
│  ┌──────────────────┐                    ┌──────────────────────┐  │
│  │   FastAPI App    │                    │   MLflow Server      │  │
│  │   (Port 8000)    │◄───────────────────┤   (Port 5000)        │  │
│  │                  │   Model Loading    │                      │  │
│  │  - Prediction    │                    │  - Tracking API      │  │
│  │    Endpoints     │                    │  - Model Registry    │  │
│  │  - Model Info    │                    │  - UI Dashboard      │  │
│  │  - Health Check  │                    │                      │  │
│  └────────┬─────────┘                    └──────────┬───────────┘  │
│           │                                         │               │
│           │                                         │               │
│           ▼                                         ▼               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              ML Training & Tracking System                   │  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │  Experiment  │  │    Model     │  │   Evaluation     │  │  │
│  │  │   Tracker    │  │   Registry   │  │     Engine       │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │   Training   │  │  Prediction  │  │   Performance    │  │  │
│  │  │   Pipeline   │  │   Pipeline   │  │    Monitor       │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│           │                                         │               │
│           ▼                                         ▼               │
│  ┌──────────────────┐                    ┌──────────────────────┐  │
│  │  Artifact Store  │                    │   Backend Store      │  │
│  │  (./mlruns)      │                    │   (PostgreSQL)       │  │
│  │                  │                    │                      │  │
│  │  - Models        │                    │  - Experiments       │  │
│  │  - Scalers       │                    │  - Runs              │  │
│  │  - Plots         │                    │  - Metrics           │  │
│  │  - Datasets      │                    │  - Parameters        │  │
│  └──────────────────┘                    │  - Tags              │  │
│                                           └──────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   Neon PostgreSQL      │
                    │   (Existing Database)  │
                    │                        │
                    │  - mlflow schema       │
                    │  - application tables  │
                    └────────────────────────┘
```

### Component Interaction Flow

```
Training Flow:
─────────────
User/Scheduler → Training Pipeline → Experiment Tracker → MLflow Server
                       │                                        │
                       ├─ Feature Pipeline                      │
                       ├─ Model Training                        │
                       ├─ Evaluation Engine                     │
                       └─ Model Registry ◄──────────────────────┘

Prediction Flow:
───────────────
API Request → FastAPI Endpoint → Model Loader → Model Registry
                                      │               │
                                      ├─ Load Model   │
                                      ├─ Load Scaler  │
                                      └─ Predict ◄────┘
                                           │
                                           └─ Performance Monitor → MLflow Server

Monitoring Flow:
───────────────
Performance Monitor → Calculate Metrics → MLflow Server
         │                                      │
         ├─ Drift Detection                    │
         ├─ Performance Degradation            │
         └─ Alert Triggers ◄───────────────────┘
```



## Components and Interfaces

### 1. MLflow Server Component

**Purpose**: Centralized tracking server for experiments, runs, and model registry.

**Configuration**:
```python
# backend/ml/mlflow_config.py
class MLflowConfig:
    tracking_uri: str = "postgresql+psycopg2://..."  # Neon PostgreSQL
    artifact_location: str = "./mlruns"
    default_experiment_name: str = "demand_forecasting"
    server_host: str = "0.0.0.0"
    server_port: int = 5000
    backend_store_uri: str  # PostgreSQL connection string
```

**Startup Process**:
1. Initialize PostgreSQL schema for MLflow tables
2. Create default experiments (demand_forecasting, coverage_analysis)
3. Start MLflow server process
4. Verify connectivity and log status

**Interface**:
```python
class MLflowServerManager:
    def start_server(self) -> None:
        """Start MLflow tracking server as subprocess"""
        
    def stop_server(self) -> None:
        """Gracefully stop MLflow server"""
        
    def health_check(self) -> bool:
        """Verify MLflow server is responsive"""
        
    def get_tracking_uri(self) -> str:
        """Get MLflow tracking URI"""
```

### 2. Experiment Tracker Component

**Purpose**: Automatically log training parameters, metrics, and artifacts to MLflow.

**Interface**:
```python
class ExperimentTracker:
    def __init__(self, experiment_name: str, tracking_uri: str):
        """Initialize tracker with experiment context"""
        
    def start_run(self, run_name: str, tags: Dict[str, str]) -> str:
        """Start new MLflow run, returns run_id"""
        
    def log_params(self, params: Dict[str, Any]) -> None:
        """Log hyperparameters"""
        
    def log_metrics(self, metrics: Dict[str, float], step: int = 0) -> None:
        """Log performance metrics"""
        
    def log_artifact(self, file_path: str, artifact_path: str = None) -> None:
        """Log file artifact (model, plot, dataset)"""
        
    def log_model(self, model: Any, artifact_path: str, 
                  signature: ModelSignature, 
                  input_example: pd.DataFrame) -> None:
        """Log model with signature and example"""
        
    def log_figure(self, figure: plt.Figure, filename: str) -> None:
        """Log matplotlib figure as PNG"""
        
    def log_dataset(self, df: pd.DataFrame, name: str) -> None:
        """Log dataset as CSV artifact"""
        
    def set_tags(self, tags: Dict[str, str]) -> None:
        """Set run tags"""
        
    def end_run(self, status: str = "FINISHED") -> None:
        """End current run"""
        
    def log_exception(self, exception: Exception) -> None:
        """Log exception details and mark run as failed"""
```

**Usage Example**:
```python
tracker = ExperimentTracker("demand_forecasting", mlflow_tracking_uri)
run_id = tracker.start_run("xgboost_v1", tags={"model_type": "xgboost"})

tracker.log_params({
    "n_estimators": 100,
    "max_depth": 6,
    "learning_rate": 0.1
})

tracker.log_metrics({
    "train_r2": 0.89,
    "test_r2": 0.87,
    "rmse": 45.2
})

tracker.log_model(model, "model", signature, input_example)
tracker.end_run()
```

### 3. Model Registry Component

**Purpose**: Manage model versions and lifecycle stages.

**Interface**:
```python
class ModelRegistry:
    def __init__(self, tracking_uri: str):
        """Initialize registry client"""
        
    def register_model(self, model_uri: str, name: str, 
                      tags: Dict[str, str] = None,
                      description: str = None) -> ModelVersion:
        """Register model from run"""
        
    def get_model_version(self, name: str, version: int) -> ModelVersion:
        """Get specific model version"""
        
    def get_latest_model(self, name: str, stage: str = "Production") -> ModelVersion:
        """Get latest model in specified stage"""
        
    def transition_model_stage(self, name: str, version: int, 
                              stage: str, archive_existing: bool = True) -> None:
        """Transition model to new stage"""
        
    def update_model_description(self, name: str, version: int, 
                                 description: str) -> None:
        """Update model version description"""
        
    def search_models(self, filter_string: str = None) -> List[RegisteredModel]:
        """Search registered models"""
        
    def delete_model_version(self, name: str, version: int) -> None:
        """Delete specific model version"""
```

**Model Lifecycle**:
```
None → Staging → Production → Archived
  ↑       ↓          ↓           ↓
  └───────┴──────────┴───────────┘
```

### 4. Evaluation Engine Component

**Purpose**: Calculate comprehensive model performance metrics.

**Interface**:
```python
class EvaluationEngine:
    def __init__(self, tracker: ExperimentTracker):
        """Initialize with experiment tracker"""
        
    def evaluate_regression(self, y_true: np.ndarray, y_pred: np.ndarray,
                           dataset_name: str = "test") -> Dict[str, float]:
        """Calculate regression metrics (MAE, RMSE, R², MAPE, MSE)"""
        
    def cross_validate(self, model: Any, X: np.ndarray, y: np.ndarray,
                      cv: int = 5) -> Dict[str, float]:
        """Perform k-fold cross-validation"""
        
    def evaluate_by_tier(self, y_true: pd.Series, y_pred: np.ndarray,
                        tiers: pd.Series) -> Dict[str, Dict[str, float]]:
        """Calculate metrics per city tier"""
        
    def calculate_residuals(self, y_true: np.ndarray, 
                           y_pred: np.ndarray) -> Dict[str, float]:
        """Calculate residual statistics"""
        
    def generate_plots(self, y_true: np.ndarray, y_pred: np.ndarray,
                      feature_importance: pd.DataFrame = None) -> None:
        """Generate and log evaluation plots"""
        
    def validate_model(self, model: Any, X_test: np.ndarray, 
                      y_test: np.ndarray,
                      thresholds: Dict[str, float]) -> Tuple[bool, Dict]:
        """Validate model meets minimum thresholds"""
```

**Metrics Calculated**:
- Mean Absolute Error (MAE)
- Root Mean Squared Error (RMSE)
- R² Score
- Mean Absolute Percentage Error (MAPE)
- Mean Squared Error (MSE)
- Cross-validation scores (mean, std)
- Residual statistics (mean, median, std)
- Per-tier metrics

### 5. Training Pipeline Integration

**Purpose**: Wrap existing training pipeline with MLflow tracking.

**Enhanced Interface**:
```python
class MLflowTrainingPipeline:
    def __init__(self, config: TrainingConfig):
        """Initialize with configuration"""
        self.tracker = ExperimentTracker(config.experiment_name, config.tracking_uri)
        self.registry = ModelRegistry(config.tracking_uri)
        self.evaluator = EvaluationEngine(self.tracker)
        self.base_pipeline = TrainingPipeline()  # Existing pipeline
        
    def run(self, target_col: str = 'order_count', 
            test_size: float = 0.2) -> Dict[str, Any]:
        """Run training with MLflow tracking"""
        
    def train_model(self, model_type: str, hyperparams: Dict) -> Any:
        """Train single model with tracking"""
        
    def train_all_models(self, hyperparams_config: Dict) -> Dict[str, Any]:
        """Train multiple models and select best"""
        
    def register_best_model(self, model: Any, metrics: Dict, 
                           model_name: str) -> ModelVersion:
        """Register best model to registry"""
```

**Training Workflow**:
1. Start MLflow run with unique name
2. Log configuration and hyperparameters
3. Log dataset metadata (size, features, date range)
4. Train model(s)
5. Evaluate on test set
6. Log metrics, plots, and artifacts
7. Register model if validation passes
8. End run with status

### 6. Prediction Service Component

**Purpose**: Serve predictions via FastAPI with automatic model loading.

**Interface**:
```python
class ModelLoader:
    def __init__(self, registry: ModelRegistry):
        """Initialize model loader"""
        self._cache: Dict[str, Tuple[Any, Any, datetime]] = {}
        self._registry = registry
        
    def load_production_model(self, model_name: str, 
                             force_reload: bool = False) -> Tuple[Any, Any]:
        """Load production model and scaler with caching"""
        
    def reload_if_changed(self, model_name: str) -> bool:
        """Check and reload if production model changed"""
        
    def get_model_info(self, model_name: str) -> Dict:
        """Get current model metadata"""

class PredictionService:
    def __init__(self, model_loader: ModelLoader):
        """Initialize prediction service"""
        
    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        """Make prediction with current production model"""
        
    async def predict_batch(self, file: UploadFile) -> BatchPredictionResponse:
        """Process batch predictions"""
        
    async def get_model_info(self) -> ModelInfoResponse:
        """Get current model information"""
        
    async def reload_model(self) -> ReloadResponse:
        """Force reload production model"""
```

### 7. Performance Monitor Component

**Purpose**: Track model performance over time and detect degradation.

**Interface**:
```python
class PerformanceMonitor:
    def __init__(self, tracker: ExperimentTracker, db_session: AsyncSession):
        """Initialize monitor"""
        
    async def log_prediction(self, input_data: Dict, prediction: float,
                            model_version: str, latency_ms: float) -> None:
        """Log prediction for monitoring"""
        
    async def log_actual(self, prediction_id: str, actual_value: float) -> None:
        """Log actual outcome for prediction"""
        
    async def calculate_rolling_metrics(self, days: int = 7) -> Dict[str, float]:
        """Calculate rolling window metrics"""
        
    async def detect_drift(self, recent_inputs: pd.DataFrame,
                          training_inputs: pd.DataFrame) -> Dict[str, float]:
        """Detect input distribution drift"""
        
    async def check_performance_degradation(self, threshold: float = 0.80) -> bool:
        """Check if performance dropped below threshold"""
        
    async def trigger_alert(self, alert_type: str, message: str) -> None:
        """Send alert notification"""
```



## Data Models

### Database Schema Extensions

**MLflow Tables** (created automatically by MLflow):
- `mlflow.experiments` - Experiment metadata
- `mlflow.runs` - Run information
- `mlflow.metrics` - Logged metrics
- `mlflow.params` - Logged parameters
- `mlflow.tags` - Run tags
- `mlflow.model_versions` - Model registry versions
- `mlflow.registered_models` - Registered model metadata

**Application Tables** (new):

```sql
-- Prediction monitoring table
CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    prediction_id VARCHAR(50) UNIQUE NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    prediction FLOAT NOT NULL,
    lower_bound FLOAT,
    upper_bound FLOAT,
    actual_value FLOAT,
    prediction_error FLOAT,
    latency_ms FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_predictions_model (model_name, model_version),
    INDEX idx_predictions_created (created_at),
    INDEX idx_predictions_error (prediction_error)
);

-- Model performance metrics table
CREATE TABLE ml_performance_metrics (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    metric_date DATE NOT NULL,
    window_days INTEGER NOT NULL,
    r2_score FLOAT,
    rmse FLOAT,
    mae FLOAT,
    mape FLOAT,
    prediction_count INTEGER,
    avg_latency_ms FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (model_name, model_version, metric_date, window_days),
    INDEX idx_perf_model_date (model_name, metric_date)
);

-- Feature drift detection table
CREATE TABLE ml_feature_drift (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    feature_name VARCHAR(100) NOT NULL,
    check_date DATE NOT NULL,
    ks_statistic FLOAT,
    p_value FLOAT,
    drift_detected BOOLEAN,
    training_mean FLOAT,
    current_mean FLOAT,
    training_std FLOAT,
    current_std FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_drift_model_date (model_name, check_date),
    INDEX idx_drift_detected (drift_detected, check_date)
);

-- Training job history table
CREATE TABLE ml_training_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(50) UNIQUE NOT NULL,
    job_type VARCHAR(50) NOT NULL,  -- 'manual', 'scheduled', 'triggered'
    experiment_name VARCHAR(100) NOT NULL,
    run_id VARCHAR(100),
    status VARCHAR(50) NOT NULL,  -- 'running', 'completed', 'failed'
    config JSONB,
    dataset_version VARCHAR(50),
    dataset_size INTEGER,
    best_model_type VARCHAR(50),
    best_r2_score FLOAT,
    training_duration_seconds INTEGER,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_by VARCHAR(100),
    INDEX idx_jobs_status (status, started_at),
    INDEX idx_jobs_experiment (experiment_name, started_at)
);
```

### SQLAlchemy Models

```python
# backend/database/models.py (additions)

class MLPrediction(Base):
    """Model prediction logging for monitoring."""
    __tablename__ = 'ml_predictions'
    
    id = Column(Integer, primary_key=True)
    prediction_id = Column(String(50), unique=True, nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    input_data = Column(JSON, nullable=False)
    prediction = Column(Float, nullable=False)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    actual_value = Column(Float)
    prediction_error = Column(Float)
    latency_ms = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class MLPerformanceMetric(Base):
    """Rolling performance metrics."""
    __tablename__ = 'ml_performance_metrics'
    
    id = Column(Integer, primary_key=True)
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    metric_date = Column(Date, nullable=False, index=True)
    window_days = Column(Integer, nullable=False)
    r2_score = Column(Float)
    rmse = Column(Float)
    mae = Column(Float)
    mape = Column(Float)
    prediction_count = Column(Integer)
    avg_latency_ms = Column(Float)
    created_at = Column(DateTime, server_default=func.now())

class MLFeatureDrift(Base):
    """Feature distribution drift detection."""
    __tablename__ = 'ml_feature_drift'
    
    id = Column(Integer, primary_key=True)
    model_name = Column(String(100), nullable=False, index=True)
    feature_name = Column(String(100), nullable=False)
    check_date = Column(Date, nullable=False, index=True)
    ks_statistic = Column(Float)
    p_value = Column(Float)
    drift_detected = Column(Boolean)
    training_mean = Column(Float)
    current_mean = Column(Float)
    training_std = Column(Float)
    current_std = Column(Float)
    created_at = Column(DateTime, server_default=func.now())

class MLTrainingJob(Base):
    """Training job execution history."""
    __tablename__ = 'ml_training_jobs'
    
    id = Column(Integer, primary_key=True)
    job_id = Column(String(50), unique=True, nullable=False, index=True)
    job_type = Column(String(50), nullable=False)
    experiment_name = Column(String(100), nullable=False, index=True)
    run_id = Column(String(100))
    status = Column(String(50), nullable=False, index=True)
    config = Column(JSON)
    dataset_version = Column(String(50))
    dataset_size = Column(Integer)
    best_model_type = Column(String(50))
    best_r2_score = Column(Float)
    training_duration_seconds = Column(Integer)
    error_message = Column(Text)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    created_by = Column(String(100))
```

### Configuration Schema

**YAML Configuration** (`config/ml_config.yaml`):

```yaml
mlflow:
  tracking_uri: ${MLFLOW_TRACKING_URI}
  artifact_location: ./mlruns
  server:
    host: 0.0.0.0
    port: 5000
  experiments:
    - name: demand_forecasting
      description: "Demand forecasting models for order prediction"
    - name: coverage_analysis
      description: "Coverage gap analysis models"

training:
  data:
    test_size: 0.2
    validation_size: 0.1
    random_seed: 42
    time_series_split: false
    
  feature_engineering:
    scaling_method: standard  # standard, robust, none
    missing_value_strategy: median  # median, mean, forward_fill
    lag_periods: [1, 7, 14, 30]
    rolling_windows: [7, 14, 30]
    
  models:
    xgboost:
      n_estimators: [100, 200, 300]
      max_depth: [4, 6, 8]
      learning_rate: [0.01, 0.1, 0.3]
      subsample: [0.8, 1.0]
      colsample_bytree: [0.8, 1.0]
      
    random_forest:
      n_estimators: [100, 200]
      max_depth: [10, 20, null]
      min_samples_split: [2, 5, 10]
      min_samples_leaf: [1, 2, 4]
      
    gradient_boosting:
      n_estimators: [100, 200]
      max_depth: [3, 5, 7]
      learning_rate: [0.01, 0.1]
      subsample: [0.8, 1.0]
      
  evaluation:
    cv_folds: 5
    metrics:
      - mae
      - rmse
      - r2
      - mape
      - mse
    thresholds:
      min_r2: 0.80
      max_mape: 15.0
      max_latency_ms: 100
      
  model_selection:
    primary_metric: r2
    improvement_threshold: 0.02  # 2% improvement required
    
monitoring:
  enabled: true
  rolling_windows: [7, 30, 90]
  drift_detection:
    enabled: true
    check_frequency_days: 7
    ks_test_threshold: 0.05
    drift_threshold: 0.20
  performance_degradation:
    r2_warning_threshold: 0.80
    r2_alert_threshold: 0.75
  alerts:
    email_enabled: true
    slack_enabled: false
    
retraining:
  enabled: true
  schedule: "0 2 * * 0"  # Weekly at 2 AM Sunday
  triggers:
    min_data_growth_pct: 10
    performance_drop_threshold: 0.75
  auto_promote:
    enabled: false
    min_improvement_pct: 3
```

### Pydantic Models for API

```python
# backend/ml/schemas.py

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime

class PredictionRequest(BaseModel):
    """Request for single prediction."""
    pincode: str
    order_date: str
    population: int
    coverage_score: int = Field(ge=0, le=4)
    city_tier: str
    city: str
    state: str
    
class PredictionResponse(BaseModel):
    """Response with prediction and confidence."""
    prediction: float
    lower_bound: float
    upper_bound: float
    model_name: str
    model_version: str
    latency_ms: float
    prediction_id: str

class BatchPredictionRequest(BaseModel):
    """Request for batch predictions."""
    file_path: str
    output_path: Optional[str] = None

class ModelInfoResponse(BaseModel):
    """Current model information."""
    model_name: str
    model_version: str
    stage: str
    created_at: datetime
    metrics: Dict[str, float]
    tags: Dict[str, str]
    description: Optional[str]

class TrainingJobRequest(BaseModel):
    """Request to start training job."""
    experiment_name: str
    config_override: Optional[Dict] = None
    dataset_version: Optional[str] = None

class TrainingJobResponse(BaseModel):
    """Training job status."""
    job_id: str
    status: str
    run_id: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]
    best_model_type: Optional[str]
    best_r2_score: Optional[float]
```



## API Endpoint Design

### FastAPI Routes

**Base Path**: `/api/v1/ml`

#### 1. Prediction Endpoints

```python
# POST /api/v1/ml/predict
@router.post("/predict", response_model=PredictionResponse)
async def predict(
    request: PredictionRequest,
    service: PredictionService = Depends(get_prediction_service)
) -> PredictionResponse:
    """
    Make a single prediction using the production model.
    
    - Validates input against model signature
    - Applies feature engineering pipeline
    - Returns prediction with confidence intervals
    - Logs prediction for monitoring
    """

# POST /api/v1/ml/predict/batch
@router.post("/predict/batch")
async def predict_batch(
    file: UploadFile = File(...),
    service: PredictionService = Depends(get_prediction_service)
) -> Dict:
    """
    Process batch predictions from CSV file.
    
    - Accepts CSV with required columns
    - Processes in chunks for memory efficiency
    - Returns download link for results
    """

# POST /api/v1/ml/forecast
@router.post("/forecast")
async def forecast_future(
    request: ForecastRequest,
    service: PredictionService = Depends(get_prediction_service)
) -> ForecastResponse:
    """
    Generate multi-period forecast.
    
    - Accepts base data and forecast horizon
    - Returns predictions with confidence intervals
    """
```

#### 2. Model Management Endpoints

```python
# GET /api/v1/ml/model/info
@router.get("/model/info", response_model=ModelInfoResponse)
async def get_model_info(
    model_name: str = "demand_forecasting_model",
    loader: ModelLoader = Depends(get_model_loader)
) -> ModelInfoResponse:
    """
    Get current production model information.
    
    - Returns model version, metrics, tags
    - Shows when model was last updated
    """

# POST /api/v1/ml/model/reload
@router.post("/model/reload")
async def reload_model(
    model_name: str = "demand_forecasting_model",
    loader: ModelLoader = Depends(get_model_loader)
) -> Dict:
    """
    Force reload production model from registry.
    
    - Clears cache and reloads latest production model
    - Returns new model version info
    """

# GET /api/v1/ml/models
@router.get("/models")
async def list_models(
    registry: ModelRegistry = Depends(get_registry)
) -> List[Dict]:
    """
    List all registered models.
    
    - Returns model names, versions, stages
    - Includes latest metrics for each version
    """

# POST /api/v1/ml/model/transition
@router.post("/model/transition")
async def transition_model_stage(
    request: ModelTransitionRequest,
    registry: ModelRegistry = Depends(get_registry)
) -> Dict:
    """
    Transition model to new lifecycle stage.
    
    - Moves model between None/Staging/Production/Archived
    - Automatically archives previous production model
    - Requires admin role
    """
```

#### 3. Training Endpoints

```python
# POST /api/v1/ml/train
@router.post("/train")
async def start_training(
    request: TrainingJobRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> TrainingJobResponse:
    """
    Start model training job.
    
    - Runs training in background
    - Returns job_id for status tracking
    - Logs all experiments to MLflow
    """

# GET /api/v1/ml/train/{job_id}
@router.get("/train/{job_id}")
async def get_training_status(
    job_id: str,
    db: AsyncSession = Depends(get_db)
) -> TrainingJobResponse:
    """
    Get training job status.
    
    - Returns current status and progress
    - Shows metrics if completed
    """

# GET /api/v1/ml/experiments
@router.get("/experiments")
async def list_experiments(
    tracker: ExperimentTracker = Depends(get_tracker)
) -> List[Dict]:
    """
    List all MLflow experiments.
    
    - Returns experiment names and run counts
    """

# GET /api/v1/ml/runs
@router.get("/runs")
async def list_runs(
    experiment_name: str,
    limit: int = 50,
    tracker: ExperimentTracker = Depends(get_tracker)
) -> List[Dict]:
    """
    List runs for an experiment.
    
    - Returns run metadata, metrics, parameters
    - Supports filtering and sorting
    """
```

#### 4. Monitoring Endpoints

```python
# GET /api/v1/ml/performance
@router.get("/performance")
async def get_performance_metrics(
    model_name: str,
    days: int = 30,
    monitor: PerformanceMonitor = Depends(get_monitor)
) -> Dict:
    """
    Get model performance metrics over time.
    
    - Returns rolling metrics for specified window
    - Shows trend analysis
    """

# GET /api/v1/ml/drift
@router.get("/drift")
async def get_drift_status(
    model_name: str,
    monitor: PerformanceMonitor = Depends(get_monitor)
) -> Dict:
    """
    Get feature drift detection results.
    
    - Returns drift statistics per feature
    - Highlights features with significant drift
    """

# GET /api/v1/ml/health
@router.get("/health")
async def ml_health_check(
    mlflow_manager: MLflowServerManager = Depends(get_mlflow_manager)
) -> Dict:
    """
    Health check for ML system.
    
    - Verifies MLflow server connectivity
    - Checks database access
    - Returns system status
    """
```

### Request/Response Examples

**Prediction Request**:
```json
{
  "pincode": "560034",
  "order_date": "2026-05-15",
  "population": 150000,
  "coverage_score": 2,
  "city_tier": "Metro",
  "city": "Bangalore",
  "state": "Karnataka"
}
```

**Prediction Response**:
```json
{
  "prediction": 1250.5,
  "lower_bound": 1180.2,
  "upper_bound": 1320.8,
  "model_name": "demand_forecasting_model",
  "model_version": "3",
  "latency_ms": 45.2,
  "prediction_id": "pred_20260515_abc123"
}
```

**Model Info Response**:
```json
{
  "model_name": "demand_forecasting_model",
  "model_version": "3",
  "stage": "Production",
  "created_at": "2026-05-10T10:30:00Z",
  "metrics": {
    "r2": 0.87,
    "rmse": 42.5,
    "mae": 35.2,
    "mape": 8.5
  },
  "tags": {
    "model_type": "xgboost",
    "training_date": "2026-05-10",
    "dataset_version": "v2.1"
  },
  "description": "XGBoost model trained on 6 months of data"
}
```



## File Structure and Module Organization

### Directory Structure

```
backend/
├── ml/
│   ├── __init__.py
│   ├── mlflow_config.py          # MLflow configuration
│   ├── mlflow_server.py           # Server management
│   ├── experiment_tracker.py      # Experiment tracking wrapper
│   ├── model_registry.py          # Model registry wrapper
│   ├── evaluation_engine.py       # Model evaluation
│   ├── model_loader.py            # Model loading and caching
│   ├── performance_monitor.py     # Performance monitoring
│   ├── schemas.py                 # Pydantic models
│   ├── train_model.py             # Existing training script (updated)
│   ├── advanced_ml.py             # Existing (unchanged)
│   └── coverage_gap.py            # Existing (unchanged)
│
├── pipelines/
│   ├── __init__.py
│   ├── training_pipeline.py       # Enhanced with MLflow
│   ├── prediction_pipeline.py     # Enhanced with MLflow
│   ├── data_pipeline.py           # Existing (minimal changes)
│   └── mlflow_training_pipeline.py  # New MLflow-integrated pipeline
│
├── api/
│   └── routes/
│       ├── __init__.py
│       ├── ml_predictions.py      # Prediction endpoints
│       ├── ml_models.py           # Model management endpoints
│       ├── ml_training.py         # Training endpoints
│       └── ml_monitoring.py       # Monitoring endpoints
│
├── database/
│   ├── models.py                  # Enhanced with ML tables
│   └── connection.py              # Existing (unchanged)
│
├── core/
│   ├── config.py                  # Enhanced with ML config
│   └── ...
│
└── scripts/
    ├── start_mlflow_server.py     # MLflow server startup script
    ├── init_mlflow_db.py          # Initialize MLflow schema
    └── retrain_models.py          # Scheduled retraining script

config/
├── ml_config.yaml                 # ML configuration
├── ml_config.dev.yaml             # Development overrides
└── ml_config.prod.yaml            # Production overrides

mlruns/                            # MLflow artifact store
├── 0/                             # Default experiment
├── 1/                             # Demand forecasting
├── 2/                             # Coverage analysis
└── models/                        # Registered models

logs/
├── mlflow_server.log              # MLflow server logs
├── training.log                   # Training logs
└── ml_monitoring.log              # Monitoring logs

tests/
├── ml/
│   ├── test_experiment_tracker.py
│   ├── test_model_registry.py
│   ├── test_evaluation_engine.py
│   ├── test_model_loader.py
│   └── test_performance_monitor.py
│
└── api/
    └── test_ml_endpoints.py
```

### Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Application                     │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Prediction  │  │   Model     │  │  Training   │
│  Service    │  │ Management  │  │   Service   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────┐
│              ML Core Components                  │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Model Loader │  │   Registry   │            │
│  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                     │
│         └────────┬────────┘                     │
│                  │                              │
│         ┌────────▼────────┐                     │
│         │  Experiment     │                     │
│         │   Tracker       │                     │
│         └────────┬────────┘                     │
│                  │                              │
│         ┌────────▼────────┐                     │
│         │   Evaluation    │                     │
│         │     Engine      │                     │
│         └────────┬────────┘                     │
│                  │                              │
│         ┌────────▼────────┐                     │
│         │  Performance    │                     │
│         │    Monitor      │                     │
│         └─────────────────┘                     │
└─────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│              MLflow Server                       │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │   Tracking   │  │    Model     │            │
│  │     API      │  │   Registry   │            │
│  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                     │
│         └────────┬────────┘                     │
│                  │                              │
│         ┌────────▼────────┐                     │
│         │   PostgreSQL    │                     │
│         │  Backend Store  │                     │
│         └─────────────────┘                     │
└─────────────────────────────────────────────────┘
```

### Key Files and Responsibilities

**backend/ml/mlflow_server.py**:
- Start/stop MLflow server process
- Health checks and monitoring
- Server configuration management

**backend/ml/experiment_tracker.py**:
- Wrapper around MLflow tracking API
- Simplified logging interface
- Error handling and retry logic

**backend/ml/model_registry.py**:
- Wrapper around MLflow model registry
- Model lifecycle management
- Version comparison utilities

**backend/ml/evaluation_engine.py**:
- Comprehensive metric calculation
- Plot generation
- Validation logic

**backend/ml/model_loader.py**:
- Model loading with caching
- Automatic reload on version changes
- Thread-safe model access

**backend/ml/performance_monitor.py**:
- Prediction logging
- Rolling metric calculation
- Drift detection
- Alert triggering

**backend/pipelines/mlflow_training_pipeline.py**:
- Orchestrates training with MLflow
- Integrates all ML components
- Handles hyperparameter tuning
- Model registration logic



## Integration with Existing Code

### Strategy

The integration follows a **wrapper pattern** to minimize changes to existing code while adding MLflow capabilities:

1. **Preserve existing interfaces**: Keep current `TrainingPipeline` and `PredictionPipeline` classes
2. **Add MLflow wrappers**: Create new classes that wrap existing functionality
3. **Gradual migration**: Support both old and new workflows during transition
4. **Backward compatibility**: Ensure existing scripts continue to work

### Training Pipeline Integration

**Current Code** (`backend/pipelines/training_pipeline.py`):
```python
class TrainingPipeline:
    def run(self, target_col: str, test_size: float) -> Dict:
        # Existing training logic
        pass
```

**Enhanced Code** (new `backend/pipelines/mlflow_training_pipeline.py`):
```python
class MLflowTrainingPipeline:
    def __init__(self, config: TrainingConfig):
        self.base_pipeline = TrainingPipeline()  # Wrap existing
        self.tracker = ExperimentTracker(...)
        self.registry = ModelRegistry(...)
        self.evaluator = EvaluationEngine(...)
        
    def run(self, target_col: str, test_size: float) -> Dict:
        # Start MLflow run
        run_id = self.tracker.start_run(...)
        
        try:
            # Call existing pipeline
            results = self.base_pipeline.run(target_col, test_size)
            
            # Add MLflow logging
            self.tracker.log_params(...)
            self.tracker.log_metrics(results['metrics'])
            self.tracker.log_model(results['best_model'], ...)
            
            # Register model
            self.registry.register_model(...)
            
            self.tracker.end_run("FINISHED")
            return results
            
        except Exception as e:
            self.tracker.log_exception(e)
            self.tracker.end_run("FAILED")
            raise
```

**Migration Path**:
1. Keep existing `TrainingPipeline` unchanged
2. Add `MLflowTrainingPipeline` as new option
3. Update `train_model.py` to use new pipeline
4. Deprecate old pipeline after validation

### Prediction Pipeline Integration

**Current Code** (`backend/pipelines/prediction_pipeline.py`):
```python
class PredictionPipeline:
    def __init__(self, model_version: str = None):
        # Load from local filesystem
        self.model_trainer.load_models(model_version)
        
    def predict(self, input_data: pd.DataFrame) -> np.ndarray:
        # Existing prediction logic
        pass
```

**Enhanced Code** (modify in place):
```python
class PredictionPipeline:
    def __init__(self, model_version: str = None, use_mlflow: bool = True):
        if use_mlflow:
            # Load from MLflow registry
            self.model_loader = ModelLoader(registry)
            self.model, self.scaler = self.model_loader.load_production_model(...)
        else:
            # Fallback to existing logic
            self.model_trainer.load_models(model_version)
            
    def predict(self, input_data: pd.DataFrame) -> np.ndarray:
        # Existing prediction logic (unchanged)
        pass
```

**Changes Required**:
- Add `use_mlflow` parameter (default `True`)
- Add model loading from MLflow registry
- Keep existing logic as fallback
- No changes to prediction logic

### FastAPI Integration

**New Routes** (`backend/api/routes/ml_predictions.py`):
```python
from backend.ml.model_loader import ModelLoader
from backend.ml.model_registry import ModelRegistry
from backend.pipelines.prediction_pipeline import PredictionPipeline

# Dependency injection
def get_prediction_service():
    registry = ModelRegistry(mlflow_tracking_uri)
    loader = ModelLoader(registry)
    pipeline = PredictionPipeline(use_mlflow=True)
    return PredictionService(pipeline, loader)

@router.post("/predict")
async def predict(
    request: PredictionRequest,
    service: PredictionService = Depends(get_prediction_service)
):
    return await service.predict(request)
```

**App Initialization** (`backend/app.py`):
```python
from backend.ml.mlflow_server import MLflowServerManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Dark Store Intelligence API...")
    await init_db()
    
    # Start MLflow server
    mlflow_manager = MLflowServerManager()
    mlflow_manager.start_server()
    logger.info("✓ MLflow server started")
    
    yield
    
    # Shutdown
    mlflow_manager.stop_server()
    await close_db()
```

### Database Integration

**Schema Migration** (Alembic):
```python
# alembic/versions/xxx_add_ml_tables.py

def upgrade():
    # Create ML prediction tracking table
    op.create_table(
        'ml_predictions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('prediction_id', sa.String(50), unique=True),
        # ... other columns
    )
    
    # Create ML performance metrics table
    op.create_table('ml_performance_metrics', ...)
    
    # Create ML feature drift table
    op.create_table('ml_feature_drift', ...)
    
    # Create ML training jobs table
    op.create_table('ml_training_jobs', ...)

def downgrade():
    op.drop_table('ml_training_jobs')
    op.drop_table('ml_feature_drift')
    op.drop_table('ml_performance_metrics')
    op.drop_table('ml_predictions')
```

### Configuration Integration

**Enhanced Config** (`backend/core/config.py`):
```python
class Settings(BaseSettings):
    # Existing settings...
    
    # MLflow settings
    MLFLOW_TRACKING_URI: str = os.getenv(
        "MLFLOW_TRACKING_URI",
        "postgresql+psycopg2://..."
    )
    MLFLOW_ARTIFACT_LOCATION: str = os.getenv(
        "MLFLOW_ARTIFACT_LOCATION",
        "./mlruns"
    )
    MLFLOW_SERVER_HOST: str = "0.0.0.0"
    MLFLOW_SERVER_PORT: int = 5000
    MLFLOW_ENABLE_TRACKING: bool = True
    
    # Model serving settings
    MODEL_CACHE_TTL_SECONDS: int = 3600
    MODEL_RELOAD_CHECK_INTERVAL: int = 60
    
    # Monitoring settings
    ENABLE_PERFORMANCE_MONITORING: bool = True
    ENABLE_DRIFT_DETECTION: bool = True
    DRIFT_CHECK_FREQUENCY_DAYS: int = 7
```

### Minimal Changes to Existing Files

**backend/pipelines/training_pipeline.py**:
- No changes required initially
- Can be enhanced later to use MLflow directly

**backend/pipelines/data_pipeline.py**:
- No changes required
- Feature engineering logic remains unchanged

**backend/ml/train_model.py**:
- Update to use `MLflowTrainingPipeline` instead of `TrainingPipeline`
- Add MLflow configuration loading
- Add model registration after training

**backend/ml/advanced_ml.py**:
- No changes required
- Can be integrated with MLflow later if needed

**backend/ml/coverage_gap.py**:
- No changes required
- Can be integrated with MLflow later if needed



## Deployment Architecture

### Container Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container (Backend)                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Supervisor Process                       │ │
│  │                                                             │ │
│  │  ┌──────────────────┐         ┌──────────────────────┐    │ │
│  │  │  FastAPI App     │         │  MLflow Server       │    │ │
│  │  │  (Uvicorn)       │         │  (Gunicorn)          │    │ │
│  │  │  Port: 8000      │         │  Port: 5000          │    │ │
│  │  │                  │         │                      │    │ │
│  │  │  Workers: 4      │         │  Workers: 2          │    │ │
│  │  └──────────────────┘         └──────────────────────┘    │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    File System                              │ │
│  │                                                             │ │
│  │  /app/mlruns/          - MLflow artifacts                  │ │
│  │  /app/logs/            - Application logs                  │ │
│  │  /app/config/          - Configuration files               │ │
│  │  /app/models/          - Legacy model storage (backup)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                              │
                              │ Network
                              ▼
                ┌──────────────────────────┐
                │   Neon PostgreSQL        │
                │   (External Service)     │
                │                          │
                │  - Application DB        │
                │  - MLflow Backend Store  │
                └──────────────────────────┘
```

### Dockerfile Configuration

**Dockerfile.backend** (enhanced):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    supervisor \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements/base.txt requirements/ml.txt ./
RUN pip install --no-cache-dir -r base.txt -r ml.txt

# Copy application code
COPY backend/ ./backend/
COPY database/ ./database/
COPY config/ ./config/

# Create directories
RUN mkdir -p /app/mlruns /app/logs /app/models

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 8000 5000

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

**docker/supervisord.conf**:
```ini
[supervisord]
nodaemon=true
logfile=/app/logs/supervisord.log
pidfile=/var/run/supervisord.pid

[program:fastapi]
command=uvicorn backend.app:app --host 0.0.0.0 --port 8000 --workers 4
directory=/app
autostart=true
autorestart=true
stderr_logfile=/app/logs/fastapi.err.log
stdout_logfile=/app/logs/fastapi.out.log

[program:mlflow]
command=mlflow server \
    --backend-store-uri %(ENV_MLFLOW_TRACKING_URI)s \
    --default-artifact-root /app/mlruns \
    --host 0.0.0.0 \
    --port 5000 \
    --workers 2
directory=/app
autostart=true
autorestart=true
stderr_logfile=/app/logs/mlflow.err.log
stdout_logfile=/app/logs/mlflow.out.log
```

### Docker Compose Configuration

**docker-compose.yml** (enhanced):
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"  # FastAPI
      - "5000:5000"  # MLflow UI
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - MLFLOW_TRACKING_URI=${MLFLOW_TRACKING_URI}
      - MLFLOW_ARTIFACT_LOCATION=/app/mlruns
      - ENVIRONMENT=production
    volumes:
      - ./mlruns:/app/mlruns
      - ./logs:/app/logs
      - ./config:/app/config
    depends_on:
      - postgres  # If using local PostgreSQL
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

### Environment Variables

**.env** (enhanced):
```bash
# Existing variables...

# MLflow Configuration
MLFLOW_TRACKING_URI=postgresql+psycopg2://user:pass@host:5432/dbname
MLFLOW_ARTIFACT_LOCATION=./mlruns
MLFLOW_SERVER_HOST=0.0.0.0
MLFLOW_SERVER_PORT=5000
MLFLOW_ENABLE_TRACKING=true

# Model Serving
MODEL_CACHE_TTL_SECONDS=3600
MODEL_RELOAD_CHECK_INTERVAL=60

# Monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_DRIFT_DETECTION=true
DRIFT_CHECK_FREQUENCY_DAYS=7

# Alerts
ALERT_EMAIL=alerts@darkstori.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Deployment Process

**1. Initial Deployment**:
```bash
# Build containers
docker-compose build

# Initialize database schema
docker-compose run backend python -m alembic upgrade head

# Initialize MLflow
docker-compose run backend python backend/scripts/init_mlflow_db.py

# Start services
docker-compose up -d

# Verify health
curl http://localhost:8000/health
curl http://localhost:5000/health
```

**2. Model Training and Registration**:
```bash
# Run initial training
docker-compose exec backend python backend/ml/train_model.py

# Verify models in registry
curl http://localhost:8000/api/v1/ml/models

# Promote model to production
curl -X POST http://localhost:8000/api/v1/ml/model/transition \
  -H "Content-Type: application/json" \
  -d '{"model_name": "demand_forecasting_model", "version": 1, "stage": "Production"}'
```

**3. Monitoring Setup**:
```bash
# Start performance monitoring
docker-compose exec backend python backend/scripts/start_monitoring.py

# Setup scheduled retraining
docker-compose exec backend python backend/scripts/setup_cron.py
```

### Scaling Considerations

**Horizontal Scaling**:
- FastAPI: Scale to multiple containers with load balancer
- MLflow Server: Single instance (shared state in PostgreSQL)
- Artifact Store: Migrate to S3 for distributed access

**Vertical Scaling**:
- Increase worker count for FastAPI (CPU-bound predictions)
- Increase memory for model caching
- Optimize PostgreSQL for MLflow queries

**Future Migration to S3**:
```python
# Update MLflow configuration
MLFLOW_ARTIFACT_LOCATION=s3://bucket-name/mlruns
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```



## Error Handling and Logging Strategy

### Error Handling Patterns

#### 1. Training Pipeline Errors

```python
class MLflowTrainingPipeline:
    def run(self, target_col: str, test_size: float) -> Dict:
        run_id = None
        try:
            # Start MLflow run
            run_id = self.tracker.start_run(...)
            
            # Data loading
            try:
                data = self.load_data()
            except DataLoadError as e:
                logger.error(f"Data loading failed: {e}")
                self.tracker.log_exception(e)
                raise
            
            # Feature engineering
            try:
                X_train, X_test, y_train, y_test = self.prepare_data(data)
            except FeatureEngineeringError as e:
                logger.error(f"Feature engineering failed: {e}")
                self.tracker.log_exception(e)
                raise
            
            # Model training
            try:
                results = self.train_models(X_train, y_train)
            except ModelTrainingError as e:
                logger.error(f"Model training failed: {e}")
                self.tracker.log_exception(e)
                raise
            
            # Model validation
            try:
                validation_passed, validation_report = self.validate_model(
                    results['best_model'], X_test, y_test
                )
                if not validation_passed:
                    raise ModelValidationError(validation_report)
            except ModelValidationError as e:
                logger.warning(f"Model validation failed: {e}")
                self.tracker.log_exception(e)
                # Don't raise - log and continue
            
            # Model registration
            try:
                model_version = self.register_model(results['best_model'])
                logger.info(f"Model registered: version {model_version}")
            except RegistrationError as e:
                logger.error(f"Model registration failed: {e}")
                # Don't fail the run - model is trained successfully
            
            self.tracker.end_run("FINISHED")
            return results
            
        except Exception as e:
            logger.error(f"Training pipeline failed: {e}", exc_info=True)
            if run_id:
                self.tracker.log_exception(e)
                self.tracker.end_run("FAILED")
            raise
```

#### 2. Prediction Service Errors

```python
class PredictionService:
    async def predict(self, request: PredictionRequest) -> PredictionResponse:
        try:
            # Input validation
            try:
                validated_input = self.validate_input(request)
            except ValidationError as e:
                logger.warning(f"Invalid input: {e}")
                raise HTTPException(status_code=422, detail=str(e))
            
            # Model loading
            try:
                model, scaler = self.model_loader.load_production_model(
                    "demand_forecasting_model"
                )
            except ModelLoadError as e:
                logger.error(f"Model loading failed: {e}")
                raise HTTPException(
                    status_code=503,
                    detail="Model service unavailable"
                )
            
            # Feature engineering
            try:
                features = self.engineer_features(validated_input)
            except FeatureEngineeringError as e:
                logger.error(f"Feature engineering failed: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Feature processing error"
                )
            
            # Prediction
            try:
                prediction = model.predict(features)
                confidence = self.calculate_confidence(prediction)
            except PredictionError as e:
                logger.error(f"Prediction failed: {e}")
                raise HTTPException(
                    status_code=500,
                    detail="Prediction error"
                )
            
            # Monitoring
            try:
                await self.monitor.log_prediction(
                    validated_input, prediction, model.version
                )
            except MonitoringError as e:
                # Don't fail request if monitoring fails
                logger.warning(f"Monitoring failed: {e}")
            
            return PredictionResponse(
                prediction=prediction,
                lower_bound=confidence['lower'],
                upper_bound=confidence['upper'],
                model_version=model.version
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in prediction: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error")
```

#### 3. MLflow Server Errors

```python
class MLflowServerManager:
    def start_server(self) -> None:
        try:
            # Check if already running
            if self.is_running():
                logger.info("MLflow server already running")
                return
            
            # Verify database connectivity
            try:
                self.verify_database()
            except DatabaseError as e:
                logger.error(f"Database verification failed: {e}")
                raise MLflowStartupError("Cannot connect to backend store")
            
            # Create artifact directory
            try:
                Path(self.artifact_location).mkdir(parents=True, exist_ok=True)
            except OSError as e:
                logger.error(f"Cannot create artifact directory: {e}")
                raise MLflowStartupError("Artifact storage unavailable")
            
            # Start server process
            try:
                self.process = subprocess.Popen(
                    self.get_server_command(),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                # Wait for server to be ready
                if not self.wait_for_ready(timeout=30):
                    raise MLflowStartupError("Server failed to start")
                    
                logger.info("MLflow server started successfully")
                
            except subprocess.SubprocessError as e:
                logger.error(f"Failed to start MLflow server: {e}")
                raise MLflowStartupError(str(e))
                
        except Exception as e:
            logger.error(f"MLflow server startup failed: {e}", exc_info=True)
            raise
```

### Logging Configuration

**backend/core/logger.py** (enhanced):
```python
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from backend.core.config import settings

# Create logs directory
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# Configure root logger
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        RotatingFileHandler(
            LOG_DIR / "app.log",
            maxBytes=100 * 1024 * 1024,  # 100MB
            backupCount=5
        )
    ]
)

# Create specialized loggers
ml_logger = logging.getLogger("ml")
ml_logger.addHandler(
    RotatingFileHandler(
        LOG_DIR / "ml_training.log",
        maxBytes=100 * 1024 * 1024,
        backupCount=5
    )
)

monitoring_logger = logging.getLogger("monitoring")
monitoring_logger.addHandler(
    RotatingFileHandler(
        LOG_DIR / "ml_monitoring.log",
        maxBytes=50 * 1024 * 1024,
        backupCount=3
    )
)

mlflow_logger = logging.getLogger("mlflow")
mlflow_logger.addHandler(
    RotatingFileHandler(
        LOG_DIR / "mlflow_server.log",
        maxBytes=50 * 1024 * 1024,
        backupCount=3
    )
)

# Structured logging helper
class StructuredLogger:
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def log_training_start(self, experiment_name: str, config: Dict):
        self.logger.info(
            "Training started",
            extra={
                "event": "training_start",
                "experiment": experiment_name,
                "config": config
            }
        )
    
    def log_training_complete(self, run_id: str, metrics: Dict):
        self.logger.info(
            "Training completed",
            extra={
                "event": "training_complete",
                "run_id": run_id,
                "metrics": metrics
            }
        )
    
    def log_prediction(self, model_version: str, latency_ms: float):
        self.logger.info(
            "Prediction made",
            extra={
                "event": "prediction",
                "model_version": model_version,
                "latency_ms": latency_ms
            }
        )
    
    def log_drift_detected(self, feature: str, ks_statistic: float):
        self.logger.warning(
            "Feature drift detected",
            extra={
                "event": "drift_detected",
                "feature": feature,
                "ks_statistic": ks_statistic
            }
        )
```

### Alert System

**backend/ml/alerts.py**:
```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
from backend.core.config import settings
from backend.core.logger import logger

class AlertManager:
    def __init__(self):
        self.email_enabled = settings.SMTP_USER and settings.ALERT_EMAIL
        self.slack_enabled = bool(settings.get("SLACK_WEBHOOK_URL"))
    
    async def send_alert(self, alert_type: str, message: str, 
                        severity: str = "warning"):
        """Send alert via configured channels."""
        
        if self.email_enabled:
            try:
                await self.send_email_alert(alert_type, message, severity)
            except Exception as e:
                logger.error(f"Email alert failed: {e}")
        
        if self.slack_enabled:
            try:
                await self.send_slack_alert(alert_type, message, severity)
            except Exception as e:
                logger.error(f"Slack alert failed: {e}")
    
    async def send_email_alert(self, alert_type: str, message: str, 
                               severity: str):
        """Send email alert."""
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_USER
        msg['To'] = settings.ALERT_EMAIL
        msg['Subject'] = f"[{severity.upper()}] ML System Alert: {alert_type}"
        
        body = f"""
        Alert Type: {alert_type}
        Severity: {severity}
        Time: {datetime.now().isoformat()}
        
        Message:
        {message}
        
        ---
        Dark Store Intelligence ML System
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    
    async def send_slack_alert(self, alert_type: str, message: str, 
                               severity: str):
        """Send Slack alert."""
        color = {
            "info": "#36a64f",
            "warning": "#ff9900",
            "error": "#ff0000"
        }.get(severity, "#808080")
        
        payload = {
            "attachments": [{
                "color": color,
                "title": f"ML System Alert: {alert_type}",
                "text": message,
                "footer": "Dark Store Intelligence",
                "ts": int(datetime.now().timestamp())
            }]
        }
        
        response = requests.post(
            settings.SLACK_WEBHOOK_URL,
            json=payload,
            timeout=10
        )
        response.raise_for_status()

# Alert triggers
async def check_performance_degradation(monitor: PerformanceMonitor):
    """Check for performance degradation and alert."""
    metrics = await monitor.calculate_rolling_metrics(days=7)
    
    if metrics['r2_score'] < 0.75:
        await AlertManager().send_alert(
            "Performance Degradation",
            f"Model R² score dropped to {metrics['r2_score']:.3f} (threshold: 0.75)",
            severity="error"
        )
    elif metrics['r2_score'] < 0.80:
        await AlertManager().send_alert(
            "Performance Warning",
            f"Model R² score at {metrics['r2_score']:.3f} (warning threshold: 0.80)",
            severity="warning"
        )

async def check_drift(monitor: PerformanceMonitor):
    """Check for feature drift and alert."""
    drift_results = await monitor.detect_drift()
    
    drifted_features = [
        f for f, result in drift_results.items()
        if result['drift_detected']
    ]
    
    if drifted_features:
        await AlertManager().send_alert(
            "Feature Drift Detected",
            f"Drift detected in features: {', '.join(drifted_features)}",
            severity="warning"
        )
```



## Testing Strategy

### Unit Tests

**Test Coverage Areas**:
1. Experiment Tracker
2. Model Registry
3. Evaluation Engine
4. Model Loader
5. Performance Monitor
6. Prediction Service
7. Training Pipeline

**Example Test** (`tests/ml/test_experiment_tracker.py`):
```python
import pytest
from unittest.mock import Mock, patch
from backend.ml.experiment_tracker import ExperimentTracker

@pytest.fixture
def tracker():
    return ExperimentTracker("test_experiment", "sqlite:///test.db")

def test_start_run(tracker):
    """Test starting a new MLflow run."""
    run_id = tracker.start_run("test_run", tags={"model": "xgboost"})
    
    assert run_id is not None
    assert len(run_id) > 0

def test_log_params(tracker):
    """Test logging parameters."""
    tracker.start_run("test_run")
    
    params = {
        "n_estimators": 100,
        "max_depth": 6,
        "learning_rate": 0.1
    }
    
    tracker.log_params(params)
    # Verify params were logged (check MLflow backend)

def test_log_metrics(tracker):
    """Test logging metrics."""
    tracker.start_run("test_run")
    
    metrics = {
        "r2": 0.87,
        "rmse": 42.5,
        "mae": 35.2
    }
    
    tracker.log_metrics(metrics)
    # Verify metrics were logged

def test_log_exception(tracker):
    """Test exception logging."""
    tracker.start_run("test_run")
    
    try:
        raise ValueError("Test error")
    except Exception as e:
        tracker.log_exception(e)
    
    # Verify exception was logged and run marked as failed

@patch('mlflow.start_run')
def test_start_run_failure(mock_start_run, tracker):
    """Test handling of MLflow connection failure."""
    mock_start_run.side_effect = Exception("Connection failed")
    
    with pytest.raises(Exception):
        tracker.start_run("test_run")
```

**Example Test** (`tests/ml/test_model_loader.py`):
```python
import pytest
from unittest.mock import Mock, MagicMock
from backend.ml.model_loader import ModelLoader
from backend.ml.model_registry import ModelRegistry

@pytest.fixture
def mock_registry():
    registry = Mock(spec=ModelRegistry)
    return registry

@pytest.fixture
def loader(mock_registry):
    return ModelLoader(mock_registry)

def test_load_production_model(loader, mock_registry):
    """Test loading production model."""
    # Mock model version
    mock_version = MagicMock()
    mock_version.version = "1"
    mock_version.run_id = "test_run_id"
    
    mock_registry.get_latest_model.return_value = mock_version
    
    model, scaler = loader.load_production_model("test_model")
    
    assert model is not None
    assert scaler is not None
    mock_registry.get_latest_model.assert_called_once()

def test_model_caching(loader, mock_registry):
    """Test model caching behavior."""
    mock_version = MagicMock()
    mock_version.version = "1"
    mock_registry.get_latest_model.return_value = mock_version
    
    # First load
    model1, _ = loader.load_production_model("test_model")
    
    # Second load (should use cache)
    model2, _ = loader.load_production_model("test_model")
    
    # Registry should only be called once
    assert mock_registry.get_latest_model.call_count == 1
    assert model1 is model2

def test_reload_if_changed(loader, mock_registry):
    """Test automatic reload when model version changes."""
    # Initial load
    mock_version1 = MagicMock()
    mock_version1.version = "1"
    mock_registry.get_latest_model.return_value = mock_version1
    
    loader.load_production_model("test_model")
    
    # Model version changes
    mock_version2 = MagicMock()
    mock_version2.version = "2"
    mock_registry.get_latest_model.return_value = mock_version2
    
    # Check and reload
    reloaded = loader.reload_if_changed("test_model")
    
    assert reloaded is True
```

### Integration Tests

**Example Test** (`tests/ml/test_training_integration.py`):
```python
import pytest
import pandas as pd
from backend.pipelines.mlflow_training_pipeline import MLflowTrainingPipeline
from backend.ml.mlflow_config import TrainingConfig

@pytest.fixture
def sample_data():
    """Create sample training data."""
    return pd.DataFrame({
        'pincode': ['560034'] * 100,
        'population': [150000] * 100,
        'coverage_score': [2] * 100,
        'city_tier': ['Metro'] * 100,
        'order_count': range(100, 200)
    })

@pytest.fixture
def config():
    """Create test configuration."""
    return TrainingConfig(
        experiment_name="test_experiment",
        tracking_uri="sqlite:///test_mlflow.db"
    )

def test_full_training_pipeline(sample_data, config):
    """Test complete training pipeline with MLflow."""
    pipeline = MLflowTrainingPipeline(config)
    
    results = pipeline.run(target_col='order_count', test_size=0.2)
    
    # Verify results
    assert 'metrics' in results
    assert 'best_model' in results
    assert results['metrics']['r2'] > 0
    
    # Verify MLflow logging
    # Check that run was created
    # Check that metrics were logged
    # Check that model was registered

def test_model_registration(sample_data, config):
    """Test model registration after training."""
    pipeline = MLflowTrainingPipeline(config)
    results = pipeline.run(target_col='order_count', test_size=0.2)
    
    # Verify model was registered
    registry = pipeline.registry
    models = registry.search_models()
    
    assert len(models) > 0
    assert any(m.name == "test_model" for m in models)
```

### API Tests

**Example Test** (`tests/api/test_ml_endpoints.py`):
```python
import pytest
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

def test_predict_endpoint():
    """Test prediction endpoint."""
    request_data = {
        "pincode": "560034",
        "order_date": "2026-05-15",
        "population": 150000,
        "coverage_score": 2,
        "city_tier": "Metro",
        "city": "Bangalore",
        "state": "Karnataka"
    }
    
    response = client.post("/api/v1/ml/predict", json=request_data)
    
    assert response.status_code == 200
    data = response.json()
    
    assert "prediction" in data
    assert "lower_bound" in data
    assert "upper_bound" in data
    assert "model_version" in data
    assert data["prediction"] > 0

def test_predict_invalid_input():
    """Test prediction with invalid input."""
    request_data = {
        "pincode": "invalid",
        "population": -1000  # Invalid
    }
    
    response = client.post("/api/v1/ml/predict", json=request_data)
    
    assert response.status_code == 422

def test_model_info_endpoint():
    """Test model info endpoint."""
    response = client.get("/api/v1/ml/model/info")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "model_name" in data
    assert "model_version" in data
    assert "metrics" in data

def test_list_models_endpoint():
    """Test list models endpoint."""
    response = client.get("/api/v1/ml/models")
    
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)

def test_health_check():
    """Test ML system health check."""
    response = client.get("/api/v1/ml/health")
    
    assert response.status_code == 200
    data = response.json()
    
    assert "mlflow_status" in data
    assert "database_status" in data
```

### Performance Tests

**Example Test** (`tests/ml/test_performance.py`):
```python
import pytest
import time
import numpy as np
from backend.ml.model_loader import ModelLoader

def test_prediction_latency(loader):
    """Test prediction latency meets requirements."""
    model, scaler = loader.load_production_model("test_model")
    
    # Generate test data
    X = np.random.rand(1, 10)
    
    # Measure latency
    start = time.time()
    prediction = model.predict(X)
    latency_ms = (time.time() - start) * 1000
    
    # Verify latency < 100ms
    assert latency_ms < 100

def test_batch_prediction_throughput(loader):
    """Test batch prediction throughput."""
    model, scaler = loader.load_production_model("test_model")
    
    # Generate batch data
    X = np.random.rand(1000, 10)
    
    # Measure throughput
    start = time.time()
    predictions = model.predict(X)
    duration = time.time() - start
    
    throughput = len(predictions) / duration
    
    # Verify throughput > 100 predictions/second
    assert throughput > 100

def test_model_loading_time(loader):
    """Test model loading time."""
    # Clear cache
    loader._cache.clear()
    
    # Measure loading time
    start = time.time()
    model, scaler = loader.load_production_model("test_model")
    loading_time = time.time() - start
    
    # Verify loading < 5 seconds
    assert loading_time < 5.0
```

### Test Configuration

**pytest.ini**:
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    -v
    --cov=backend/ml
    --cov=backend/pipelines
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
markers =
    unit: Unit tests
    integration: Integration tests
    api: API tests
    performance: Performance tests
    slow: Slow running tests
```

**Running Tests**:
```bash
# Run all tests
pytest

# Run specific test category
pytest -m unit
pytest -m integration
pytest -m api

# Run with coverage
pytest --cov=backend/ml --cov-report=html

# Run performance tests
pytest -m performance

# Run specific test file
pytest tests/ml/test_experiment_tracker.py
```



## Property-Based Testing Applicability Assessment

This feature involves:
1. **Infrastructure Integration**: MLflow server deployment, PostgreSQL schema setup
2. **API Endpoints**: FastAPI routes for predictions and model management
3. **External Service Interaction**: MLflow tracking server, database operations
4. **Configuration Management**: YAML files, environment variables
5. **Model Serving**: Loading and caching models from registry

**Assessment**: Property-based testing is **NOT appropriate** for this feature because:

- **Infrastructure as Code**: MLflow server configuration and deployment are declarative, not functional transformations
- **External Service Behavior**: Testing MLflow API behavior (already tested by MLflow maintainers)
- **Side-Effect Operations**: Model registration, experiment logging, database writes have no return values to assert properties on
- **Integration-Heavy**: Most functionality involves coordinating between external systems (MLflow, PostgreSQL, filesystem)
- **Configuration Validation**: Schema validation is better suited for example-based tests

**Recommended Testing Approach**:
- **Unit Tests**: Test individual components with mocks (experiment tracker, model loader, registry wrapper)
- **Integration Tests**: Test MLflow integration with test database (1-3 examples per workflow)
- **API Tests**: Test FastAPI endpoints with example requests
- **Smoke Tests**: Verify MLflow server starts, database connectivity, model loading

**No Correctness Properties section will be included** as property-based testing does not apply to this infrastructure and integration-focused feature.



## Security Considerations

### Authentication and Authorization

**MLflow UI Access**:
```python
# backend/ml/mlflow_auth.py
from fastapi import Depends, HTTPException
from backend.security.auth import verify_token

def verify_mlflow_access(token: str = Depends(verify_token)):
    """Verify user has access to MLflow UI."""
    if token.role not in ['admin', 'data_scientist']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return token

# Nginx proxy configuration for MLflow UI
location /mlflow/ {
    auth_request /api/auth/verify;
    proxy_pass http://localhost:5000/;
}
```

**Model Transition Authorization**:
```python
@router.post("/model/transition")
async def transition_model_stage(
    request: ModelTransitionRequest,
    current_user: User = Depends(get_current_user)
):
    """Only admins can transition models to production."""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Transition model
    registry.transition_model_stage(...)
```

### Data Security

**Sensitive Data Handling**:
- Never log raw customer data in MLflow artifacts
- Anonymize or aggregate data before logging
- Use feature names without exposing PII
- Encrypt database connections (SSL/TLS)

**Model Artifact Security**:
```python
# Restrict artifact directory permissions
os.chmod('./mlruns', 0o750)

# Use secure artifact storage (S3 with encryption)
MLFLOW_ARTIFACT_LOCATION=s3://bucket/mlruns
AWS_S3_SERVER_SIDE_ENCRYPTION=AES256
```

**Database Security**:
```python
# Use connection pooling with SSL
DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/db?sslmode=require

# Separate MLflow schema with restricted permissions
GRANT SELECT, INSERT, UPDATE ON mlflow.* TO mlflow_user;
```

### Input Validation

**Prediction Request Validation**:
```python
class PredictionRequest(BaseModel):
    pincode: str = Field(regex=r'^\d{6}$')
    population: int = Field(gt=0, lt=10000000)
    coverage_score: int = Field(ge=0, le=4)
    city_tier: str = Field(regex=r'^(Metro|Tier1|Tier2|Tier3)$')
    
    @validator('order_date')
    def validate_date(cls, v):
        date = pd.to_datetime(v)
        if date > datetime.now() + timedelta(days=365):
            raise ValueError("Date too far in future")
        return v
```

**Configuration Validation**:
```python
class MLflowConfig(BaseSettings):
    tracking_uri: str = Field(regex=r'^(postgresql|sqlite|file)://')
    artifact_location: str
    
    @validator('artifact_location')
    def validate_artifact_path(cls, v):
        if v.startswith('s3://'):
            # Validate S3 bucket access
            pass
        else:
            # Validate local path is writable
            path = Path(v)
            if not path.parent.exists():
                raise ValueError(f"Parent directory does not exist: {path.parent}")
        return v
```

## Performance Optimization

### Model Caching Strategy

```python
class ModelLoader:
    def __init__(self, registry: ModelRegistry):
        self._cache: Dict[str, Tuple[Any, Any, datetime]] = {}
        self._cache_ttl = timedelta(hours=1)
        self._lock = asyncio.Lock()
    
    async def load_production_model(self, model_name: str, 
                                    force_reload: bool = False):
        """Load model with caching and TTL."""
        async with self._lock:
            cache_key = f"{model_name}:production"
            
            # Check cache
            if not force_reload and cache_key in self._cache:
                model, scaler, cached_at = self._cache[cache_key]
                
                # Check TTL
                if datetime.now() - cached_at < self._cache_ttl:
                    return model, scaler
            
            # Load from registry
            model_version = self.registry.get_latest_model(
                model_name, stage="Production"
            )
            
            model = mlflow.pyfunc.load_model(model_version.source)
            scaler = self._load_scaler(model_version.run_id)
            
            # Update cache
            self._cache[cache_key] = (model, scaler, datetime.now())
            
            return model, scaler
```

### Database Query Optimization

```python
# Index on frequently queried columns
CREATE INDEX idx_predictions_model_created 
ON ml_predictions(model_name, model_version, created_at);

CREATE INDEX idx_perf_metrics_model_date 
ON ml_performance_metrics(model_name, metric_date DESC);

# Partition large tables by date
CREATE TABLE ml_predictions_2026_05 PARTITION OF ml_predictions
FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

### Batch Processing Optimization

```python
class PredictionService:
    async def predict_batch(self, file: UploadFile, 
                           chunk_size: int = 1000):
        """Process batch predictions efficiently."""
        results = []
        
        # Read in chunks
        async for chunk in self.read_csv_chunks(file, chunk_size):
            # Vectorized feature engineering
            features = self.engineer_features_batch(chunk)
            
            # Batch prediction
            predictions = self.model.predict(features)
            
            # Async database writes
            await self.save_predictions_batch(chunk, predictions)
            
            results.extend(predictions)
        
        return results
```

### MLflow Query Optimization

```python
# Use MLflow search with filters instead of loading all runs
runs = mlflow.search_runs(
    experiment_ids=[experiment_id],
    filter_string="metrics.r2 > 0.85",
    order_by=["metrics.r2 DESC"],
    max_results=10
)

# Use MLflow's built-in pagination
for page in mlflow.search_runs(..., max_results=100):
    process_runs(page)
```

## Monitoring and Observability

### Metrics to Track

**System Metrics**:
- MLflow server uptime and response time
- Database connection pool utilization
- Artifact storage usage
- API endpoint latency (p50, p95, p99)
- Request rate and error rate

**ML Metrics**:
- Model prediction latency
- Model accuracy over time (rolling windows)
- Feature drift scores
- Model version distribution (which versions are serving traffic)
- Prediction volume per model

**Business Metrics**:
- Training job success rate
- Model promotion frequency
- Time from training to production
- Model retraining triggers

### Prometheus Integration

```python
# backend/core/monitoring.py
from prometheus_client import Counter, Histogram, Gauge

# Prediction metrics
prediction_counter = Counter(
    'ml_predictions_total',
    'Total predictions made',
    ['model_name', 'model_version']
)

prediction_latency = Histogram(
    'ml_prediction_latency_seconds',
    'Prediction latency',
    ['model_name']
)

model_accuracy = Gauge(
    'ml_model_accuracy',
    'Current model accuracy',
    ['model_name', 'metric']
)

# Training metrics
training_duration = Histogram(
    'ml_training_duration_seconds',
    'Training job duration',
    ['experiment_name']
)

training_counter = Counter(
    'ml_training_jobs_total',
    'Total training jobs',
    ['status']
)

# Usage in code
@prediction_latency.time()
async def predict(request: PredictionRequest):
    prediction = model.predict(...)
    prediction_counter.labels(
        model_name=model.name,
        model_version=model.version
    ).inc()
    return prediction
```

### Health Check Endpoint

```python
@router.get("/health")
async def ml_health_check():
    """Comprehensive ML system health check."""
    health = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {}
    }
    
    # Check MLflow server
    try:
        response = requests.get(f"{mlflow_uri}/health", timeout=5)
        health["components"]["mlflow"] = {
            "status": "healthy" if response.ok else "unhealthy",
            "response_time_ms": response.elapsed.total_seconds() * 1000
        }
    except Exception as e:
        health["components"]["mlflow"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health["status"] = "degraded"
    
    # Check database
    try:
        async with get_db() as db:
            await db.execute("SELECT 1")
        health["components"]["database"] = {"status": "healthy"}
    except Exception as e:
        health["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health["status"] = "degraded"
    
    # Check model availability
    try:
        model, _ = model_loader.load_production_model("demand_forecasting_model")
        health["components"]["model"] = {
            "status": "healthy",
            "version": model.version
        }
    except Exception as e:
        health["components"]["model"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health["status"] = "degraded"
    
    # Check artifact storage
    try:
        artifact_path = Path(settings.MLFLOW_ARTIFACT_LOCATION)
        disk_usage = shutil.disk_usage(artifact_path)
        health["components"]["artifact_storage"] = {
            "status": "healthy",
            "free_gb": disk_usage.free / (1024**3),
            "used_pct": (disk_usage.used / disk_usage.total) * 100
        }
    except Exception as e:
        health["components"]["artifact_storage"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    return health
```

## Migration and Rollout Plan

### Phase 1: Infrastructure Setup (Week 1)
1. Deploy MLflow server with PostgreSQL backend
2. Create database schema and tables
3. Configure artifact storage
4. Set up monitoring and logging
5. Verify MLflow UI access

### Phase 2: Training Integration (Week 2)
1. Implement MLflow wrapper classes
2. Update training pipeline with MLflow tracking
3. Test experiment logging and model registration
4. Train initial models and register to MLflow
5. Validate model artifacts and metadata

### Phase 3: Prediction Service (Week 3)
1. Implement model loader with caching
2. Create FastAPI prediction endpoints
3. Integrate with existing prediction pipeline
4. Test model loading and predictions
5. Deploy to staging environment

### Phase 4: Monitoring and Alerts (Week 4)
1. Implement performance monitoring
2. Set up drift detection
3. Configure alert system
4. Create monitoring dashboards
5. Test alert triggers

### Phase 5: Production Rollout (Week 5)
1. Deploy to production with feature flag
2. Run parallel predictions (old + new)
3. Compare results and validate
4. Gradually increase traffic to new system
5. Deprecate old model loading

### Rollback Plan
- Keep existing model loading as fallback
- Feature flag to switch between old/new systems
- Database migrations are reversible
- MLflow can be disabled without breaking predictions



## Summary

This design document specifies a comprehensive ML training and tracking system using MLflow for the Darkstori Quick Commerce Intelligence Platform. The system provides:

### Key Features
1. **Centralized Experiment Tracking**: All training runs logged to MLflow with parameters, metrics, and artifacts
2. **Model Registry**: Versioned models with lifecycle management (Staging → Production → Archived)
3. **Performance Monitoring**: Real-time tracking of model performance with drift detection and alerting
4. **API Integration**: FastAPI endpoints for predictions, model management, and monitoring
5. **Automated Workflows**: Scheduled retraining, automatic model promotion, and alert notifications

### Architecture Highlights
- **Deployment**: MLflow server and FastAPI in same container, managed by Supervisor
- **Storage**: PostgreSQL backend store (Neon), local filesystem artifacts (future S3 migration)
- **Integration**: Wrapper pattern preserves existing code while adding MLflow capabilities
- **Scalability**: Horizontal scaling for FastAPI, vertical scaling for model serving

### Implementation Approach
- **Minimal Code Changes**: Wrapper classes around existing pipelines
- **Backward Compatibility**: Existing workflows continue to function
- **Gradual Migration**: Feature flags enable phased rollout
- **Comprehensive Testing**: Unit, integration, API, and performance tests

### Success Criteria
- ✓ All training runs tracked in MLflow with complete metadata
- ✓ Models versioned and registered with lifecycle stages
- ✓ Prediction latency < 100ms (p95)
- ✓ Model loading time < 5 seconds
- ✓ Performance monitoring with 7/30/90 day rolling windows
- ✓ Drift detection with automatic alerts
- ✓ 80%+ test coverage for ML components

### Next Steps
1. Review and approve design document
2. Set up development environment with MLflow
3. Implement core components (tracker, registry, loader)
4. Integrate with training pipeline
5. Create API endpoints
6. Deploy to staging and validate
7. Roll out to production

