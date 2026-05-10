# Requirements Document: ML Training & Tracking Enhancement

## Introduction

The Darkstori Quick Commerce Intelligence Platform currently implements machine learning models for demand forecasting and coverage gap analysis using XGBoost, Random Forest, and Gradient Boosting algorithms. While the system claims 85%+ accuracy, there is no systematic tracking, versioning, or validation of model performance. This feature introduces a comprehensive ML training and tracking system using MLflow to provide experiment tracking, model versioning, performance monitoring, and reproducible model development workflows.

## Glossary

- **ML_System**: The complete machine learning training and tracking infrastructure
- **MLflow_Server**: The MLflow tracking server that stores experiments, runs, and artifacts
- **Experiment_Tracker**: Component that logs parameters, metrics, and artifacts to MLflow
- **Model_Registry**: MLflow component that manages model versions and lifecycle stages
- **Training_Pipeline**: The automated workflow that trains, evaluates, and registers models
- **Evaluation_Engine**: Component that calculates and validates model performance metrics
- **Feature_Pipeline**: Component that processes raw data into model-ready features
- **Model_Artifact**: Serialized model file with associated metadata and dependencies
- **Experiment_Run**: A single execution of model training with specific parameters
- **Performance_Metric**: Quantitative measure of model quality (MAE, RMSE, R², MAPE)
- **Model_Version**: A specific iteration of a trained model in the registry
- **Baseline_Model**: The current production model used for comparison
- **Model_Signature**: Schema defining input/output data types for a model
- **Training_Dataset**: The processed data used to train models
- **Validation_Dataset**: The data used to evaluate model performance during training
- **Test_Dataset**: The held-out data used for final model evaluation
- **Hyperparameter**: Configurable parameter that controls model training behavior
- **Feature_Importance**: Ranking of input features by their contribution to predictions
- **Model_Comparison**: Side-by-side evaluation of multiple model versions
- **Production_Stage**: Model lifecycle stage indicating deployment readiness
- **Staging_Stage**: Model lifecycle stage for pre-production testing
- **Archived_Stage**: Model lifecycle stage for deprecated models
- **Experiment_Metadata**: Contextual information about training runs (timestamp, user, environment)
- **Model_Lineage**: Historical record of model development and evolution
- **Prediction_Service**: FastAPI endpoint that serves model predictions
- **Model_Loader**: Component that retrieves models from the registry for inference

## Requirements

### Requirement 1: MLflow Server Infrastructure

**User Story:** As a data scientist, I want a centralized MLflow tracking server, so that all team members can log and compare experiments in one location.

#### Acceptance Criteria

1. THE ML_System SHALL deploy an MLflow_Server with PostgreSQL backend storage
2. THE ML_System SHALL configure the MLflow_Server to store artifacts in a persistent file system
3. THE ML_System SHALL expose the MLflow_Server on a configurable port with authentication
4. THE ML_System SHALL initialize the MLflow_Server with default experiment namespaces for demand forecasting and coverage analysis
5. WHEN the MLflow_Server starts, THE ML_System SHALL verify database connectivity and artifact storage accessibility
6. THE ML_System SHALL provide environment variables for MLflow tracking URI configuration
7. THE ML_System SHALL log MLflow_Server startup status and configuration to application logs

### Requirement 2: Experiment Tracking Integration

**User Story:** As a data scientist, I want to automatically log all training parameters and metrics, so that I can reproduce and compare experiments.

#### Acceptance Criteria

1. WHEN a Training_Pipeline executes, THE Experiment_Tracker SHALL create a new Experiment_Run in MLflow
2. THE Experiment_Tracker SHALL log all Hyperparameters (learning_rate, n_estimators, max_depth, etc.) for each Experiment_Run
3. THE Experiment_Tracker SHALL log all Performance_Metrics (MAE, RMSE, R², MAPE) for each Experiment_Run
4. THE Experiment_Tracker SHALL log the Training_Dataset size, Validation_Dataset size, and Test_Dataset size
5. THE Experiment_Tracker SHALL log the training duration in seconds for each Experiment_Run
6. THE Experiment_Tracker SHALL log the model type (XGBoost, Random Forest, Gradient Boosting) as a tag
7. THE Experiment_Tracker SHALL log the Python version, scikit-learn version, and XGBoost version as Experiment_Metadata
8. THE Experiment_Tracker SHALL log Feature_Importance as a CSV artifact for tree-based models
9. THE Experiment_Tracker SHALL log the feature names list as a JSON artifact
10. THE Experiment_Tracker SHALL log training and validation loss curves as PNG artifacts
11. WHEN an Experiment_Run fails, THE Experiment_Tracker SHALL log the error message and stack trace
12. THE Experiment_Tracker SHALL assign unique run names using timestamp and model type

### Requirement 3: Model Performance Evaluation

**User Story:** As a data scientist, I want comprehensive model evaluation metrics, so that I can validate the claimed 85%+ accuracy and compare model quality.

#### Acceptance Criteria

1. THE Evaluation_Engine SHALL calculate Mean Absolute Error (MAE) on the Test_Dataset
2. THE Evaluation_Engine SHALL calculate Root Mean Squared Error (RMSE) on the Test_Dataset
3. THE Evaluation_Engine SHALL calculate R² Score on the Test_Dataset
4. THE Evaluation_Engine SHALL calculate Mean Absolute Percentage Error (MAPE) on the Test_Dataset
5. THE Evaluation_Engine SHALL calculate Mean Squared Error (MSE) on the Test_Dataset
6. THE Evaluation_Engine SHALL perform 5-fold cross-validation and log mean and standard deviation of scores
7. THE Evaluation_Engine SHALL calculate residual statistics (mean, median, std) and log them as metrics
8. THE Evaluation_Engine SHALL generate a residual plot and log it as a PNG artifact
9. THE Evaluation_Engine SHALL generate a predicted vs actual scatter plot and log it as a PNG artifact
10. THE Evaluation_Engine SHALL generate a feature importance bar chart and log it as a PNG artifact
11. WHEN R² Score is greater than or equal to 0.85, THE Evaluation_Engine SHALL tag the run as "high_accuracy"
12. THE Evaluation_Engine SHALL calculate evaluation metrics separately for each city tier (Metro, Tier1, Tier2, Tier3)
13. THE Evaluation_Engine SHALL log per-tier metrics as nested JSON artifacts

### Requirement 4: Model Versioning and Registry

**User Story:** As a data scientist, I want to version and register trained models, so that I can track model evolution and manage deployments.

#### Acceptance Criteria

1. WHEN a Training_Pipeline completes successfully, THE ML_System SHALL register the trained model in the Model_Registry
2. THE ML_System SHALL assign a sequential Model_Version number to each registered model
3. THE ML_System SHALL store the Model_Artifact with the model's serialized weights
4. THE ML_System SHALL store the scaler artifact (StandardScaler or RobustScaler) with the model
5. THE ML_System SHALL define a Model_Signature specifying input feature names and types
6. THE ML_System SHALL define a Model_Signature specifying output prediction type (float)
7. THE ML_System SHALL tag each Model_Version with the training date, model type, and best metric value
8. THE ML_System SHALL allow transitioning Model_Versions between None, Staging_Stage, Production_Stage, and Archived_Stage
9. WHEN a model is promoted to Production_Stage, THE ML_System SHALL automatically archive the previous Production_Stage model
10. THE ML_System SHALL store model dependencies (Python packages and versions) with each Model_Version
11. THE ML_System SHALL provide a model description field for documentation
12. THE Model_Registry SHALL support querying models by name, version, stage, and tags

### Requirement 5: Model Comparison and Selection

**User Story:** As a data scientist, I want to compare multiple models side-by-side, so that I can select the best performing model for production.

#### Acceptance Criteria

1. THE ML_System SHALL provide a Model_Comparison function that accepts multiple Experiment_Run IDs
2. THE Model_Comparison SHALL display all Performance_Metrics for the specified runs in a comparison table
3. THE Model_Comparison SHALL display all Hyperparameters for the specified runs in a comparison table
4. THE Model_Comparison SHALL calculate the percentage difference in metrics between runs
5. THE Model_Comparison SHALL highlight the best performing run for each metric
6. WHEN comparing models, THE ML_System SHALL retrieve and display the Baseline_Model metrics for reference
7. THE ML_System SHALL provide a function to automatically select the best model based on a primary metric (default: R²)
8. THE ML_System SHALL support custom model selection criteria using weighted combinations of metrics
9. THE ML_System SHALL log the model selection decision and rationale as an artifact
10. WHEN a new model outperforms the Baseline_Model by at least 2% on R², THE ML_System SHALL recommend promotion to Staging_Stage

### Requirement 6: Feature Engineering Pipeline Documentation

**User Story:** As a data scientist, I want to document the feature engineering pipeline, so that I can ensure consistency between training and inference.

#### Acceptance Criteria

1. THE Feature_Pipeline SHALL log the list of raw input columns as a JSON artifact
2. THE Feature_Pipeline SHALL log the list of engineered features as a JSON artifact
3. THE Feature_Pipeline SHALL log the feature engineering transformations applied (lag features, rolling windows, encodings)
4. THE Feature_Pipeline SHALL log the feature scaling method (StandardScaler, RobustScaler, None)
5. THE Feature_Pipeline SHALL log the handling strategy for missing values (median imputation, forward fill, etc.)
6. THE Feature_Pipeline SHALL log the train-test split ratio and random seed
7. THE Feature_Pipeline SHALL log whether time series splitting was used
8. THE Feature_Pipeline SHALL calculate and log feature correlation matrix as a CSV artifact
9. THE Feature_Pipeline SHALL generate a correlation heatmap and log it as a PNG artifact
10. THE Feature_Pipeline SHALL log feature statistics (mean, std, min, max, quartiles) for the Training_Dataset
11. THE Feature_Pipeline SHALL detect and log the number of outliers removed per feature
12. THE Feature_Pipeline SHALL serialize the fitted scaler and log it as an artifact

### Requirement 7: Automated Model Training Workflow

**User Story:** As a data scientist, I want an automated training workflow, so that I can train multiple models with different configurations efficiently.

#### Acceptance Criteria

1. THE Training_Pipeline SHALL support training XGBoost, Random Forest, and Gradient Boosting models in a single run
2. THE Training_Pipeline SHALL accept a configuration file specifying Hyperparameters for each model type
3. THE Training_Pipeline SHALL train each model type with the specified Hyperparameters
4. THE Training_Pipeline SHALL evaluate each trained model on the Test_Dataset
5. THE Training_Pipeline SHALL log each model as a separate Experiment_Run under the same parent experiment
6. THE Training_Pipeline SHALL automatically select the best model based on R² Score
7. THE Training_Pipeline SHALL register the best model in the Model_Registry
8. WHEN the Training_Pipeline completes, THE ML_System SHALL generate a summary report comparing all trained models
9. THE Training_Pipeline SHALL support hyperparameter grid search with cross-validation
10. WHEN hyperparameter search is enabled, THE Training_Pipeline SHALL log each hyperparameter combination as a child run
11. THE Training_Pipeline SHALL save the final Training_Dataset, Validation_Dataset, and Test_Dataset as CSV artifacts
12. THE Training_Pipeline SHALL be executable via CLI with configurable parameters

### Requirement 8: Model Performance Monitoring

**User Story:** As a data scientist, I want to monitor model performance over time, so that I can detect model degradation and trigger retraining.

#### Acceptance Criteria

1. THE ML_System SHALL log prediction requests and actual outcomes to a monitoring database
2. THE ML_System SHALL calculate rolling Performance_Metrics over the last 7 days, 30 days, and 90 days
3. WHEN rolling R² Score drops below 0.80, THE ML_System SHALL log a warning message
4. WHEN rolling R² Score drops below 0.75, THE ML_System SHALL trigger an alert notification
5. THE ML_System SHALL compare current performance against the Baseline_Model performance
6. THE ML_System SHALL detect prediction drift by comparing input feature distributions
7. WHEN feature distribution drift exceeds 20% (Kolmogorov-Smirnov test), THE ML_System SHALL log a warning
8. THE ML_System SHALL generate a performance monitoring dashboard showing metric trends over time
9. THE ML_System SHALL log the number of predictions made per day as a metric
10. THE ML_System SHALL calculate and log prediction latency percentiles (p50, p95, p99)

### Requirement 9: FastAPI Integration for Model Serving

**User Story:** As a backend developer, I want to serve models via FastAPI endpoints, so that the application can make predictions using the latest production model.

#### Acceptance Criteria

1. THE Prediction_Service SHALL provide a POST endpoint `/api/v1/predict` that accepts prediction requests
2. THE Prediction_Service SHALL load the current Production_Stage model from the Model_Registry on startup
3. THE Prediction_Service SHALL validate input data against the Model_Signature before making predictions
4. WHEN input data is invalid, THE Prediction_Service SHALL return a 422 error with validation details
5. THE Prediction_Service SHALL apply the same Feature_Pipeline transformations used during training
6. THE Prediction_Service SHALL return predictions with confidence intervals (lower_bound, upper_bound)
7. THE Prediction_Service SHALL log each prediction request to MLflow for monitoring
8. THE Prediction_Service SHALL provide a GET endpoint `/api/v1/model/info` that returns current model metadata
9. THE Prediction_Service SHALL provide a POST endpoint `/api/v1/model/reload` that reloads the Production_Stage model
10. THE Prediction_Service SHALL cache the loaded model in memory for performance
11. WHEN the Production_Stage model changes, THE Prediction_Service SHALL automatically reload the new model within 60 seconds
12. THE Prediction_Service SHALL return prediction latency in the response headers

### Requirement 10: Model Artifact Storage and Retrieval

**User Story:** As a data scientist, I want reliable artifact storage, so that I can retrieve models and associated files for analysis and deployment.

#### Acceptance Criteria

1. THE ML_System SHALL store all Model_Artifacts in a persistent file system directory
2. THE ML_System SHALL organize artifacts by experiment name, run ID, and artifact type
3. THE ML_System SHALL store models in MLflow's native format with pickle serialization as fallback
4. THE ML_System SHALL store scaler objects as joblib files
5. THE ML_System SHALL store plots and visualizations as PNG files with 300 DPI resolution
6. THE ML_System SHALL store tabular data (metrics, feature importance) as CSV files
7. THE ML_System SHALL store configuration and metadata as JSON files
8. THE Model_Loader SHALL retrieve Model_Artifacts by model name and version
9. THE Model_Loader SHALL retrieve Model_Artifacts by model name and stage (Production_Stage, Staging_Stage)
10. WHEN retrieving a model, THE Model_Loader SHALL also load the associated scaler and feature names
11. THE ML_System SHALL verify artifact integrity using checksums
12. WHEN an artifact is corrupted, THE ML_System SHALL log an error and raise an exception

### Requirement 11: Training Configuration Management

**User Story:** As a data scientist, I want to manage training configurations, so that I can reproduce experiments and maintain consistent training settings.

#### Acceptance Criteria

1. THE ML_System SHALL support loading training configuration from a YAML file
2. THE configuration file SHALL specify Hyperparameters for each model type (XGBoost, Random Forest, Gradient Boosting)
3. THE configuration file SHALL specify data pipeline parameters (test_size, random_seed, scaling_method)
4. THE configuration file SHALL specify feature engineering parameters (lag_periods, rolling_windows)
5. THE configuration file SHALL specify evaluation parameters (cv_folds, metrics_to_calculate)
6. THE configuration file SHALL specify MLflow parameters (experiment_name, tracking_uri)
7. THE ML_System SHALL validate the configuration file schema on load
8. WHEN configuration validation fails, THE ML_System SHALL raise an exception with specific validation errors
9. THE ML_System SHALL log the complete configuration as a JSON artifact for each Experiment_Run
10. THE ML_System SHALL support environment variable substitution in configuration files
11. THE ML_System SHALL provide default configuration values for all optional parameters
12. THE ML_System SHALL support configuration inheritance for hyperparameter tuning experiments

### Requirement 12: Model Explainability and Interpretation

**User Story:** As a data scientist, I want to understand model predictions, so that I can validate model behavior and build trust with stakeholders.

#### Acceptance Criteria

1. THE ML_System SHALL calculate and log Feature_Importance for all tree-based models
2. THE ML_System SHALL generate a Feature_Importance bar chart showing the top 20 features
3. THE ML_System SHALL calculate SHAP values for a sample of 100 predictions from the Test_Dataset
4. THE ML_System SHALL generate a SHAP summary plot and log it as a PNG artifact
5. THE ML_System SHALL generate a SHAP dependence plot for the top 5 most important features
6. THE ML_System SHALL provide a function to explain individual predictions with feature contributions
7. WHEN explaining a prediction, THE ML_System SHALL return the top 10 features with their contribution values
8. THE ML_System SHALL calculate and log partial dependence plots for the top 5 features
9. THE ML_System SHALL detect and log feature interactions using SHAP interaction values
10. THE ML_System SHALL generate a model interpretation report as a PDF artifact

### Requirement 13: Experiment Organization and Tagging

**User Story:** As a data scientist, I want to organize experiments with tags and descriptions, so that I can easily find and filter relevant runs.

#### Acceptance Criteria

1. THE Experiment_Tracker SHALL support adding custom tags to Experiment_Runs
2. THE Experiment_Tracker SHALL automatically tag runs with model_type (xgboost, random_forest, gradient_boosting)
3. THE Experiment_Tracker SHALL automatically tag runs with dataset_version
4. THE Experiment_Tracker SHALL automatically tag runs with feature_set_version
5. THE Experiment_Tracker SHALL automatically tag runs with training_date in ISO 8601 format
6. THE Experiment_Tracker SHALL support adding a text description to each Experiment_Run
7. THE ML_System SHALL provide a search function to filter runs by tags
8. THE ML_System SHALL provide a search function to filter runs by metric ranges (e.g., R² > 0.85)
9. THE ML_System SHALL support organizing runs into nested experiments (parent-child relationships)
10. THE ML_System SHALL automatically tag hyperparameter tuning child runs with their parent run ID

### Requirement 14: Model Validation and Testing

**User Story:** As a data scientist, I want to validate models before deployment, so that I can ensure they meet quality standards and business requirements.

#### Acceptance Criteria

1. THE ML_System SHALL define minimum acceptable thresholds for each Performance_Metric (R² >= 0.80, MAPE <= 15%)
2. WHEN a model fails to meet minimum thresholds, THE ML_System SHALL reject model registration
3. THE ML_System SHALL validate that model predictions are within reasonable bounds (non-negative for order counts)
4. THE ML_System SHALL test model inference latency and reject models exceeding 100ms per prediction
5. THE ML_System SHALL validate that the model produces consistent predictions for identical inputs
6. THE ML_System SHALL test model behavior on edge cases (zero population, missing features)
7. THE ML_System SHALL validate that Feature_Importance values sum to approximately 1.0 for normalized importance
8. THE ML_System SHALL compare new model performance against Baseline_Model on a holdout validation set
9. WHEN a new model underperforms the Baseline_Model, THE ML_System SHALL log a warning and prevent automatic promotion
10. THE ML_System SHALL generate a validation report summarizing all validation checks and results

### Requirement 15: MLflow UI Access and Visualization

**User Story:** As a data scientist, I want to access the MLflow UI, so that I can visually explore experiments, compare runs, and analyze results.

#### Acceptance Criteria

1. THE ML_System SHALL expose the MLflow UI on a configurable port (default: 5000)
2. THE MLflow UI SHALL display all experiments with run counts and creation dates
3. THE MLflow UI SHALL allow filtering and sorting runs by metrics, parameters, and tags
4. THE MLflow UI SHALL display metric plots showing training progress over time
5. THE MLflow UI SHALL allow comparing multiple runs side-by-side with metric differences
6. THE MLflow UI SHALL display all logged artifacts with download links
7. THE MLflow UI SHALL display the Model_Registry with all registered models and versions
8. THE MLflow UI SHALL allow transitioning Model_Versions between lifecycle stages via the UI
9. THE MLflow UI SHALL display model lineage showing which runs produced which model versions
10. THE ML_System SHALL configure MLflow UI authentication using environment variables

### Requirement 16: Batch Prediction and Evaluation

**User Story:** As a data scientist, I want to make batch predictions on large datasets, so that I can evaluate model performance on historical data.

#### Acceptance Criteria

1. THE Prediction_Service SHALL provide a batch prediction function that accepts a CSV file path
2. THE Prediction_Service SHALL process batch predictions in chunks of 1000 rows for memory efficiency
3. THE Prediction_Service SHALL log batch prediction progress every 10,000 rows
4. THE Prediction_Service SHALL save batch predictions to a CSV file with prediction, lower_bound, and upper_bound columns
5. WHEN actual values are provided, THE Prediction_Service SHALL calculate and log Performance_Metrics for the batch
6. THE Prediction_Service SHALL generate a batch evaluation report with metric breakdowns by city tier
7. THE Prediction_Service SHALL log the batch prediction job as an MLflow run with input/output file paths
8. THE Prediction_Service SHALL handle missing features by applying the same imputation strategy used during training
9. THE Prediction_Service SHALL validate that batch input data matches the expected Model_Signature
10. WHEN batch prediction fails, THE Prediction_Service SHALL log the error and save successfully processed rows

### Requirement 17: Model Retraining Automation

**User Story:** As a data scientist, I want to automate model retraining, so that models stay current with new data without manual intervention.

#### Acceptance Criteria

1. THE ML_System SHALL provide a retraining scheduler that triggers training on a configurable schedule (daily, weekly, monthly)
2. THE ML_System SHALL fetch the latest training data from the database before retraining
3. THE ML_System SHALL compare the new Training_Dataset size against the previous version
4. WHEN the Training_Dataset has grown by at least 10%, THE ML_System SHALL proceed with retraining
5. WHEN the Training_Dataset has not changed significantly, THE ML_System SHALL skip retraining and log the decision
6. THE ML_System SHALL train all model types (XGBoost, Random Forest, Gradient Boosting) during automated retraining
7. THE ML_System SHALL compare the new best model against the current Production_Stage model
8. WHEN the new model outperforms the Production_Stage model by at least 3% on R², THE ML_System SHALL promote it to Staging_Stage
9. THE ML_System SHALL send a notification (email or Slack) when a new model is promoted to Staging_Stage
10. THE ML_System SHALL log all retraining runs with a "automated_retraining" tag

### Requirement 18: Data Versioning and Lineage

**User Story:** As a data scientist, I want to track data versions used for training, so that I can reproduce experiments and understand model lineage.

#### Acceptance Criteria

1. THE ML_System SHALL assign a unique version identifier to each Training_Dataset
2. THE ML_System SHALL calculate and log a hash of the Training_Dataset for integrity verification
3. THE ML_System SHALL log the Training_Dataset version with each Experiment_Run
4. THE ML_System SHALL store a copy of the Training_Dataset as an artifact for each Experiment_Run
5. THE ML_System SHALL log the data collection date range (start_date, end_date) for the Training_Dataset
6. THE ML_System SHALL log the number of rows and columns in the Training_Dataset
7. THE ML_System SHALL log the data sources used to create the Training_Dataset (database tables, API endpoints)
8. THE ML_System SHALL detect and log data schema changes between Training_Dataset versions
9. WHEN data schema changes, THE ML_System SHALL log a warning and require explicit confirmation to proceed
10. THE ML_System SHALL provide a function to retrieve the Training_Dataset used for a specific Model_Version

### Requirement 19: Model Performance Benchmarking

**User Story:** As a data scientist, I want to benchmark models against baseline algorithms, so that I can demonstrate the value of advanced models.

#### Acceptance Criteria

1. THE ML_System SHALL train a simple baseline model (mean predictor) for comparison
2. THE ML_System SHALL train a linear regression baseline model for comparison
3. THE ML_System SHALL evaluate all baseline models on the same Test_Dataset as advanced models
4. THE ML_System SHALL log baseline model metrics with a "baseline" tag
5. THE ML_System SHALL calculate the percentage improvement of each advanced model over the best baseline
6. THE ML_System SHALL generate a benchmark comparison table showing all models and their relative performance
7. THE ML_System SHALL log the benchmark comparison table as a CSV artifact
8. THE ML_System SHALL generate a bar chart comparing all models and log it as a PNG artifact
9. WHEN an advanced model fails to outperform the baseline by at least 10%, THE ML_System SHALL log a warning
10. THE ML_System SHALL include baseline model metrics in the model selection decision process

### Requirement 20: Error Handling and Logging

**User Story:** As a data scientist, I want comprehensive error handling and logging, so that I can diagnose and fix issues quickly.

#### Acceptance Criteria

1. WHEN an Experiment_Run fails, THE ML_System SHALL log the exception type, message, and full stack trace
2. WHEN an Experiment_Run fails, THE ML_System SHALL mark the run status as "FAILED" in MLflow
3. THE ML_System SHALL log all data pipeline errors with context (file path, row number, column name)
4. THE ML_System SHALL log all model training errors with context (model type, hyperparameters, iteration number)
5. THE ML_System SHALL log all prediction errors with context (input data, model version)
6. THE ML_System SHALL provide structured logging with log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
7. THE ML_System SHALL log to both console and file (logs/ml_training.log)
8. THE ML_System SHALL rotate log files when they exceed 100MB
9. THE ML_System SHALL include timestamps, log level, module name, and message in each log entry
10. WHEN MLflow tracking server is unreachable, THE ML_System SHALL log an error and continue training without tracking
11. THE ML_System SHALL provide a health check endpoint that verifies MLflow connectivity and database access
12. THE ML_System SHALL log system resource usage (CPU, memory, disk) at the start and end of each training run
