# Implementation Plan: ML Training & Tracking Enhancement

## Overview

This implementation plan breaks down the MLflow integration feature into discrete, sequential coding tasks. The feature adds comprehensive experiment tracking, model versioning, performance monitoring, and reproducible ML workflows to the Darkstori Quick Commerce Intelligence Platform.

**Implementation Language**: Python  
**Key Technologies**: MLflow, FastAPI, PostgreSQL, SQLAlchemy, Pydantic  
**Integration Strategy**: Wrapper pattern to preserve existing code while adding MLflow capabilities

## Tasks

- [x] 1. Set up MLflow infrastructure and configuration
  - Create MLflow configuration module with connection settings
  - Implement MLflow server manager for process lifecycle
  - Add MLflow settings to core configuration
  - Create initialization script for MLflow database schema
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 2. Create database schema extensions for ML tracking
  - [x] 2.1 Create Alembic migration for ML tables
    - Add ml_predictions table with indexes
    - Add ml_performance_metrics table with indexes
    - Add ml_feature_drift table with indexes
    - Add ml_training_jobs table with indexes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [x] 2.2 Create SQLAlchemy models for ML tables
    - Implement MLPrediction model
    - Implement MLPerformanceMetric model
    - Implement MLFeatureDrift model
    - Implement MLTrainingJob model
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [x]* 2.3 Write unit tests for database models
    - Test model creation and validation
    - Test relationships and constraints
    - Test index usage
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

- [x] 3. Implement core MLflow wrapper components
  - [x] 3.1 Create ExperimentTracker wrapper class
    - Implement start_run, end_run methods
    - Implement log_params, log_metrics methods
    - Implement log_artifact, log_model, log_figure methods
    - Implement log_exception with error handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  
  - [x] 3.2 Create ModelRegistry wrapper class
    - Implement register_model method
    - Implement get_model_version, get_latest_model methods
    - Implement transition_model_stage with auto-archiving
    - Implement search_models and delete_model_version methods
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_
  
  - [x] 3.3 Create EvaluationEngine class
    - Implement evaluate_regression with all metrics (MAE, RMSE, R², MAPE, MSE)
    - Implement cross_validate with k-fold validation
    - Implement evaluate_by_tier for city tier metrics
    - Implement calculate_residuals and generate_plots methods
    - Implement validate_model with threshold checking
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_
  
  - [ ]* 3.4 Write unit tests for core MLflow components
    - Test ExperimentTracker logging methods
    - Test ModelRegistry lifecycle management
    - Test EvaluationEngine metric calculations
    - Test error handling and edge cases
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

- [ ] 4. Checkpoint - Verify core components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement feature engineering pipeline documentation
  - [x] 5.1 Create FeaturePipeline logging wrapper
    - Log raw input columns and engineered features as JSON
    - Log feature transformations and scaling methods
    - Log missing value handling strategies
    - Log train-test split configuration
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [x] 5.2 Add feature statistics and correlation logging
    - Calculate and log feature correlation matrix as CSV
    - Generate correlation heatmap as PNG artifact
    - Log feature statistics (mean, std, min, max, quartiles)
    - Log outlier detection and removal counts
    - Serialize and log fitted scaler as artifact
    - _Requirements: 6.8, 6.9, 6.10, 6.11, 6.12_

- [x] 6. Create MLflow-integrated training pipeline
  - [x] 6.1 Implement MLflowTrainingPipeline wrapper class
    - Wrap existing TrainingPipeline with MLflow tracking
    - Implement run method with experiment tracking
    - Add hyperparameter logging for all model types
    - Add dataset metadata logging (size, features, date range)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_
  
  - [x] 6.2 Integrate evaluation and model registration
    - Call EvaluationEngine for comprehensive metrics
    - Generate and log evaluation plots (residuals, predictions, feature importance)
    - Register best model to ModelRegistry with signature
    - Log training duration and system metadata
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_
  
  - [x] 6.3 Add model comparison and selection logic
    - Implement compare_models function for side-by-side comparison
    - Implement automatic best model selection based on R² score
    - Log model selection decision and rationale
    - Add recommendation logic for model promotion
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_
  
  - [ ]* 6.4 Write integration tests for training pipeline
    - Test full training workflow with sample data
    - Test model registration and versioning
    - Test experiment logging completeness
    - Test error handling and recovery
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

- [x] 7. Implement model loading and caching
  - [x] 7.1 Create ModelLoader class with caching
    - Implement load_production_model with in-memory cache
    - Add TTL-based cache expiration (1 hour default)
    - Implement reload_if_changed for automatic updates
    - Add thread-safe model access with asyncio locks
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_
  
  - [x] 7.2 Implement model artifact retrieval
    - Load model from MLflow registry by name and version
    - Load model by name and stage (Production, Staging)
    - Load associated scaler and feature names
    - Add artifact integrity verification with checksums
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_
  
  - [ ]* 7.3 Write unit tests for model loader
    - Test model caching behavior
    - Test automatic reload on version changes
    - Test error handling for missing models
    - Test concurrent access safety
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_

- [ ] 8. Checkpoint - Verify training and loading components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create Pydantic schemas for API requests/responses
  - Create PredictionRequest and PredictionResponse schemas
  - Create BatchPredictionRequest and ModelInfoResponse schemas
  - Create TrainingJobRequest and TrainingJobResponse schemas
  - Add input validation with Field constraints and custom validators
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_

- [x] 10. Implement prediction service and FastAPI endpoints
  - [x] 10.1 Create PredictionService class
    - Implement predict method with input validation
    - Implement predict_batch for CSV file processing
    - Add confidence interval calculation
    - Integrate with ModelLoader for production model access
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_
  
  - [x] 10.2 Create FastAPI prediction endpoints
    - Implement POST /api/v1/ml/predict endpoint
    - Implement POST /api/v1/ml/predict/batch endpoint
    - Implement POST /api/v1/ml/forecast endpoint
    - Add request validation and error handling
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_
  
  - [x] 10.3 Create model management endpoints
    - Implement GET /api/v1/ml/model/info endpoint
    - Implement POST /api/v1/ml/model/reload endpoint
    - Implement GET /api/v1/ml/models endpoint
    - Implement POST /api/v1/ml/model/transition endpoint
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_
  
  - [ ]* 10.4 Write API tests for prediction endpoints
    - Test prediction endpoint with valid input
    - Test prediction endpoint with invalid input (422 errors)
    - Test model info and reload endpoints
    - Test model transition authorization
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_

- [x] 11. Implement performance monitoring system
  - [x] 11.1 Create PerformanceMonitor class
    - Implement log_prediction for tracking predictions
    - Implement log_actual for recording outcomes
    - Implement calculate_rolling_metrics for 7/30/90 day windows
    - Add database queries for metric aggregation
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [x] 11.2 Implement drift detection
    - Implement detect_drift using Kolmogorov-Smirnov test
    - Calculate feature distribution statistics
    - Compare training vs current distributions
    - Log drift results to ml_feature_drift table
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [x] 11.3 Add performance degradation detection
    - Implement check_performance_degradation method
    - Compare current metrics against baseline model
    - Add threshold-based warning and alert triggers
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [x] 11.4 Create monitoring endpoints
    - Implement GET /api/v1/ml/performance endpoint
    - Implement GET /api/v1/ml/drift endpoint
    - Implement GET /api/v1/ml/health endpoint
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [ ]* 11.5 Write unit tests for performance monitoring
    - Test rolling metric calculations
    - Test drift detection logic
    - Test alert triggering conditions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

- [x] 12. Implement alert system
  - Create AlertManager class for email and Slack notifications
  - Implement send_alert method with severity levels
  - Add alert triggers for performance degradation
  - Add alert triggers for feature drift detection
  - _Requirements: 8.4, 8.5, 8.6, 8.7_

- [x] 13. Checkpoint - Verify prediction and monitoring systems
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Create training job management endpoints
  - Implement POST /api/v1/ml/train endpoint with background tasks
  - Implement GET /api/v1/ml/train/{job_id} for status tracking
  - Implement GET /api/v1/ml/experiments endpoint
  - Implement GET /api/v1/ml/runs endpoint with filtering
  - Add training job logging to ml_training_jobs table
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_

- [x] 15. Implement model explainability features
  - Calculate and log feature importance for tree-based models
  - Generate feature importance bar charts
  - Calculate SHAP values for sample predictions
  - Generate SHAP summary and dependence plots
  - Create explain_prediction function for individual predictions
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10_

- [x] 16. Implement batch prediction functionality
  - Add batch_predict method to PredictionService
  - Implement chunked processing for memory efficiency
  - Add progress logging for large batches
  - Generate batch evaluation reports when actuals provided
  - Log batch prediction jobs to MLflow
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

- [x] 17. Create model retraining automation
  - [x] 17.1 Implement retraining scheduler
    - Create scheduled retraining script with configurable frequency
    - Fetch latest training data from database
    - Compare dataset size against previous version
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [x] 17.2 Add automatic model promotion logic
    - Compare new model against current production model
    - Implement promotion criteria (3% improvement threshold)
    - Send notifications on model promotion
    - Tag automated retraining runs
    - _Requirements: 17.6, 17.7, 17.8, 17.9, 17.10_

- [x] 18. Implement data versioning and lineage tracking
  - Assign unique version identifiers to training datasets
  - Calculate and log dataset hash for integrity verification
  - Store training dataset as artifact for each run
  - Log data collection date range and sources
  - Detect and log data schema changes between versions
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_

- [x] 19. Add model benchmarking against baselines
  - Train simple baseline models (mean predictor, linear regression)
  - Evaluate baselines on same test dataset
  - Calculate percentage improvement over baselines
  - Generate benchmark comparison table and charts
  - Log baseline metrics with "baseline" tag
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10_

- [ ] 20. Checkpoint - Verify advanced features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Implement comprehensive error handling and logging
  - [x] 21.1 Add error handling to training pipeline
    - Wrap data loading, feature engineering, training steps
    - Log exceptions to MLflow with context
    - Mark failed runs with FAILED status
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 20.11, 20.12_
  
  - [x] 21.2 Add error handling to prediction service
    - Validate inputs with detailed error messages
    - Handle model loading failures gracefully
    - Return appropriate HTTP status codes (422, 503, 500)
    - Log errors without failing monitoring
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 20.11, 20.12_
  
  - [x] 21.3 Configure structured logging
    - Set up rotating file handlers for different log types
    - Create specialized loggers (ml, monitoring, mlflow)
    - Implement StructuredLogger for event tracking
    - Configure log levels and formats
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8, 20.9, 20.10, 20.11, 20.12_

- [x] 22. Create configuration management system
  - [x] 22.1 Create YAML configuration files
    - Create ml_config.yaml with all MLflow settings
    - Add training configuration (hyperparameters, data pipeline)
    - Add evaluation configuration (metrics, thresholds)
    - Add monitoring configuration (drift detection, alerts)
    - Add retraining configuration (schedule, triggers)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12_
  
  - [x] 22.2 Implement configuration loading and validation
    - Create Pydantic models for configuration schema
    - Implement YAML file loading with validation
    - Add environment variable substitution
    - Provide default values for optional parameters
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12_

- [x] 23. Update existing training script to use MLflow
  - Modify backend/ml/train_model.py to use MLflowTrainingPipeline
  - Add configuration loading from YAML file
  - Add model registration after training
  - Update output to show MLflow run information
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12_

- [x] 24. Integrate MLflow server with FastAPI application
  - [x] 24.1 Create MLflow server startup script
    - Implement MLflowServerManager class
    - Add start_server and stop_server methods
    - Add health_check and verify_database methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [x] 24.2 Update FastAPI app lifecycle
    - Add MLflow server startup to app lifespan
    - Add MLflow server shutdown to app cleanup
    - Verify MLflow connectivity on startup
    - Log MLflow server status
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 25. Create Docker and deployment configuration
  - [x] 25.1 Update Dockerfile for MLflow
    - Install supervisor for process management
    - Add MLflow server to supervisor configuration
    - Expose MLflow UI port (5000)
    - Create mlruns directory for artifacts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [x] 25.2 Update docker-compose configuration
    - Add MLflow environment variables
    - Add volume mounts for artifacts and logs
    - Configure health checks for both services
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [x] 25.3 Create deployment scripts
    - Create database initialization script
    - Create MLflow schema initialization script
    - Create initial model training and registration script
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 26. Add security and authentication
  - Add authentication to MLflow UI access via nginx proxy
  - Add authorization checks for model transition endpoints
  - Implement input validation for all API endpoints
  - Add SSL/TLS configuration for database connections
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_

- [ ] 27. Checkpoint - Verify deployment configuration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 28. Create monitoring and observability setup
  - [x] 28.1 Add Prometheus metrics
    - Create prediction counter and latency histogram
    - Create model accuracy gauge
    - Create training duration histogram
    - Add metrics to prediction and training endpoints
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_
  
  - [x] 28.2 Enhance health check endpoint
    - Check MLflow server connectivity
    - Check database connectivity
    - Check model availability
    - Check artifact storage status
    - _Requirements: 20.11, 20.12_

- [ ] 29. Create documentation and examples
  - Create README for ML system setup and usage
  - Document API endpoints with request/response examples
  - Create training configuration examples
  - Document model promotion workflow
  - Create troubleshooting guide

- [ ] 30. Final integration and testing
  - [ ]* 30.1 Run end-to-end integration tests
    - Test complete training workflow from data to registered model
    - Test prediction workflow from request to response
    - Test monitoring and alerting workflows
    - Test model retraining and promotion workflows
    - _Requirements: All requirements_
  
  - [ ]* 30.2 Run performance tests
    - Test prediction latency meets <100ms requirement
    - Test batch prediction throughput
    - Test model loading time
    - Test concurrent request handling
    - _Requirements: 14.4, 16.2, 16.3_
  
  - [ ] 30.3 Verify all requirements are met
    - Review requirements document and check coverage
    - Verify all acceptance criteria are satisfied
    - Test error handling and edge cases
    - Validate logging and monitoring completeness

- [ ] 31. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breakpoints
- The implementation follows a wrapper pattern to preserve existing code
- MLflow server runs as a separate process managed by Supervisor in the same container
- Database migrations are reversible for safe rollback
- Feature flags support gradual rollout and A/B testing
- All ML components include comprehensive error handling and logging
- Security is built-in with authentication, authorization, and input validation
- Monitoring and alerting enable proactive issue detection
- The system supports both manual and automated model retraining workflows

## Implementation Strategy

1. **Phase 1 (Tasks 1-4)**: Core infrastructure and MLflow integration
2. **Phase 2 (Tasks 5-8)**: Training pipeline enhancement with experiment tracking
3. **Phase 3 (Tasks 9-13)**: Prediction service and API endpoints
4. **Phase 4 (Tasks 14-20)**: Advanced features (monitoring, explainability, automation)
5. **Phase 5 (Tasks 21-27)**: Production readiness (error handling, deployment, security)
6. **Phase 6 (Tasks 28-31)**: Observability, documentation, and final validation

## Success Criteria

- MLflow server runs successfully alongside FastAPI
- All experiments, runs, and models are tracked in MLflow
- Models can be registered, versioned, and promoted through lifecycle stages
- Prediction API serves models from MLflow registry with <100ms latency
- Performance monitoring detects degradation and drift
- Automated retraining triggers based on data growth or performance drops
- All database migrations apply successfully
- Comprehensive logging captures all ML operations
- Health checks verify system status
- Documentation enables team members to use the system effectively
