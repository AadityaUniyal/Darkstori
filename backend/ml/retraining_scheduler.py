"""
Model Retraining Scheduler

Automates model retraining based on data growth, performance degradation,
or scheduled intervals.
"""

import logging
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database.models import MLPerformanceMetric, MLTrainingJob
from backend.ml.performance_monitor import PerformanceMonitor
from backend.ml.model_registry import ModelRegistry
from backend.pipelines.mlflow_training_pipeline import MLflowTrainingPipeline
from backend.ml.alert_manager import AlertManager
from backend.core.config import settings

logger = logging.getLogger(__name__)


class RetrainingScheduler:
    """Manages automated model retraining workflows."""
    
    def __init__(
        self,
        db_session: AsyncSession,
        model_registry: ModelRegistry,
        alert_manager: Optional[AlertManager] = None
    ):
        """
        Initialize retraining scheduler.
        
        Args:
            db_session: Database session
            model_registry: Model registry instance
            alert_manager: Alert manager for notifications
        """
        self.db_session = db_session
        self.model_registry = model_registry
        self.alert_manager = alert_manager
        self.monitor = PerformanceMonitor(db_session)
        
        # Configuration
        self.min_improvement_threshold = 0.03  # 3% improvement required
        self.min_data_growth_pct = 0.10  # 10% data growth required
        self.retraining_frequency_days = 7  # Weekly retraining
        
        logger.info("RetrainingScheduler initialized")
    
    async def should_retrain(
        self,
        model_name: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Determine if model should be retrained.
        
        Args:
            model_name: Name of the model
            reason: Specific reason to check (data_growth, performance, schedule)
            
        Returns:
            Dictionary with decision and reasoning
        """
        try:
            decision = {
                'should_retrain': False,
                'reasons': [],
                'metrics': {}
            }
            
            # Check data growth
            if reason is None or reason == 'data_growth':
                data_growth = await self._check_data_growth(model_name)
                decision['metrics']['data_growth_pct'] = data_growth
                
                if data_growth >= self.min_data_growth_pct:
                    decision['should_retrain'] = True
                    decision['reasons'].append(
                        f"Data growth: {data_growth*100:.1f}% (threshold: {self.min_data_growth_pct*100:.1f}%)"
                    )
            
            # Check performance degradation
            if reason is None or reason == 'performance':
                degradation = await self._check_performance_degradation(model_name)
                decision['metrics']['performance_degradation'] = degradation
                
                if degradation:
                    decision['should_retrain'] = True
                    decision['reasons'].append(
                        f"Performance degradation detected: {degradation}"
                    )
            
            # Check schedule
            if reason is None or reason == 'schedule':
                days_since_training = await self._days_since_last_training(model_name)
                decision['metrics']['days_since_training'] = days_since_training
                
                if days_since_training >= self.retraining_frequency_days:
                    decision['should_retrain'] = True
                    decision['reasons'].append(
                        f"Scheduled retraining: {days_since_training} days since last training"
                    )
            
            logger.info(
                f"Retraining decision for {model_name}: "
                f"{'RETRAIN' if decision['should_retrain'] else 'SKIP'} - "
                f"{', '.join(decision['reasons']) if decision['reasons'] else 'No triggers'}"
            )
            
            return decision
            
        except Exception as e:
            logger.error(f"Error checking retraining criteria: {e}")
            return {
                'should_retrain': False,
                'reasons': [],
                'error': str(e)
            }
    
    async def trigger_retraining(
        self,
        model_name: str,
        experiment_name: str = "automated_retraining",
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Trigger automated model retraining.
        
        Args:
            model_name: Name of the model
            experiment_name: MLflow experiment name
            config: Training configuration
            
        Returns:
            Dictionary with retraining results
        """
        try:
            logger.info(f"Starting automated retraining for {model_name}")
            
            # Create training job record
            job_id = await self._create_training_job(
                model_name=model_name,
                trigger='automated',
                config=config
            )
            
            # Initialize training pipeline
            pipeline = MLflowTrainingPipeline(
                experiment_name=experiment_name,
                db_session=self.db_session
            )
            
            # Run training
            try:
                results = await pipeline.run(
                    model_types=['random_forest', 'gradient_boosting', 'xgboost'],
                    tags={
                        'automated': 'true',
                        'job_id': job_id,
                        'trigger': 'scheduled_retraining'
                    }
                )
                
                # Update job status
                await self._update_training_job(
                    job_id=job_id,
                    status='completed',
                    results=results
                )
                
                # Check if new model should be promoted
                promotion_decision = await self._evaluate_promotion(
                    model_name=model_name,
                    new_model_metrics=results.get('best_model', {}).get('metrics', {})
                )
                
                # Promote model if criteria met
                if promotion_decision['should_promote']:
                    await self._promote_model(
                        model_name=model_name,
                        new_version=results.get('best_model', {}).get('version'),
                        reason=promotion_decision['reason']
                    )
                
                # Send notification
                if self.alert_manager:
                    await self._send_retraining_notification(
                        model_name=model_name,
                        results=results,
                        promoted=promotion_decision['should_promote']
                    )
                
                logger.info(f"Automated retraining completed for {model_name}")
                
                return {
                    'job_id': job_id,
                    'status': 'completed',
                    'results': results,
                    'promotion': promotion_decision
                }
                
            except Exception as e:
                # Update job status to failed
                await self._update_training_job(
                    job_id=job_id,
                    status='failed',
                    error=str(e)
                )
                raise
                
        except Exception as e:
            logger.error(f"Automated retraining failed: {e}", exc_info=True)
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    async def _check_data_growth(self, model_name: str) -> float:
        """
        Check data growth since last training.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Data growth percentage (0.0 to 1.0)
        """
        try:
            # Get last training job
            query = select(MLTrainingJob).where(
                MLTrainingJob.model_name == model_name,
                MLTrainingJob.status == 'completed'
            ).order_by(MLTrainingJob.created_at.desc()).limit(1)
            
            result = await self.db_session.execute(query)
            last_job = result.scalar_one_or_none()
            
            if not last_job:
                logger.warning(f"No previous training job found for {model_name}")
                return 1.0  # Assume 100% growth if no previous training
            
            # Get training dataset size from last job
            last_dataset_size = last_job.config.get('dataset_size', 0)
            
            if last_dataset_size == 0:
                return 1.0
            
            # Get current dataset size (would query actual data source)
            # For now, simulate by checking prediction count growth
            query = select(func.count()).select_from(MLPerformanceMetric).where(
                MLPerformanceMetric.model_name == model_name,
                MLPerformanceMetric.created_at > last_job.created_at
            )
            
            result = await self.db_session.execute(query)
            new_predictions = result.scalar()
            
            # Estimate growth (simplified)
            growth_pct = new_predictions / last_dataset_size if last_dataset_size > 0 else 0
            
            return min(growth_pct, 1.0)  # Cap at 100%
            
        except Exception as e:
            logger.error(f"Error checking data growth: {e}")
            return 0.0
    
    async def _check_performance_degradation(self, model_name: str) -> Optional[str]:
        """
        Check for performance degradation.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Degradation description or None
        """
        try:
            # Check recent performance metrics
            degradation = await self.monitor.check_performance_degradation(
                model_name=model_name,
                window_days=7
            )
            
            if degradation.get('degraded', False):
                return degradation.get('message', 'Performance degraded')
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking performance degradation: {e}")
            return None
    
    async def _days_since_last_training(self, model_name: str) -> int:
        """
        Get days since last training.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Number of days since last training
        """
        try:
            query = select(MLTrainingJob).where(
                MLTrainingJob.model_name == model_name,
                MLTrainingJob.status == 'completed'
            ).order_by(MLTrainingJob.created_at.desc()).limit(1)
            
            result = await self.db_session.execute(query)
            last_job = result.scalar_one_or_none()
            
            if not last_job:
                return 999  # Large number to trigger retraining
            
            days_since = (datetime.utcnow() - last_job.created_at).days
            return days_since
            
        except Exception as e:
            logger.error(f"Error getting last training date: {e}")
            return 0
    
    async def _create_training_job(
        self,
        model_name: str,
        trigger: str,
        config: Optional[Dict[str, Any]]
    ) -> str:
        """Create training job record."""
        try:
            job = MLTrainingJob(
                model_name=model_name,
                status='running',
                trigger=trigger,
                config=config or {},
                created_at=datetime.utcnow()
            )
            
            self.db_session.add(job)
            await self.db_session.commit()
            await self.db_session.refresh(job)
            
            return str(job.id)
            
        except Exception as e:
            logger.error(f"Error creating training job: {e}")
            await self.db_session.rollback()
            raise
    
    async def _update_training_job(
        self,
        job_id: str,
        status: str,
        results: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> None:
        """Update training job record."""
        try:
            query = select(MLTrainingJob).where(MLTrainingJob.id == job_id)
            result = await self.db_session.execute(query)
            job = result.scalar_one_or_none()
            
            if job:
                job.status = status
                job.updated_at = datetime.utcnow()
                
                if results:
                    job.results = results
                
                if error:
                    job.error = error
                
                await self.db_session.commit()
                
        except Exception as e:
            logger.error(f"Error updating training job: {e}")
            await self.db_session.rollback()
    
    async def _evaluate_promotion(
        self,
        model_name: str,
        new_model_metrics: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Evaluate if new model should be promoted to production.
        
        Args:
            model_name: Name of the model
            new_model_metrics: Metrics from new model
            
        Returns:
            Dictionary with promotion decision
        """
        try:
            # Get current production model metrics
            current_model = self.model_registry.get_latest_model(
                model_name=model_name,
                stage='Production'
            )
            
            if not current_model:
                # No production model, promote by default
                return {
                    'should_promote': True,
                    'reason': 'No existing production model'
                }
            
            # Get current model metrics (from MLflow or database)
            current_metrics = current_model.get('metrics', {})
            current_r2 = current_metrics.get('r2_score', 0)
            new_r2 = new_model_metrics.get('r2_score', 0)
            
            # Calculate improvement
            improvement = new_r2 - current_r2
            improvement_pct = (improvement / current_r2) if current_r2 > 0 else 0
            
            # Check if improvement meets threshold
            if improvement_pct >= self.min_improvement_threshold:
                return {
                    'should_promote': True,
                    'reason': f'Performance improved by {improvement_pct*100:.2f}% (R²: {current_r2:.4f} → {new_r2:.4f})',
                    'improvement_pct': improvement_pct,
                    'current_r2': current_r2,
                    'new_r2': new_r2
                }
            else:
                return {
                    'should_promote': False,
                    'reason': f'Improvement {improvement_pct*100:.2f}% below threshold {self.min_improvement_threshold*100:.2f}%',
                    'improvement_pct': improvement_pct,
                    'current_r2': current_r2,
                    'new_r2': new_r2
                }
                
        except Exception as e:
            logger.error(f"Error evaluating promotion: {e}")
            return {
                'should_promote': False,
                'reason': f'Error: {str(e)}'
            }
    
    async def _promote_model(
        self,
        model_name: str,
        new_version: Optional[str],
        reason: str
    ) -> None:
        """
        Promote new model to production.
        
        Args:
            model_name: Name of the model
            new_version: Version of new model
            reason: Reason for promotion
        """
        try:
            if not new_version:
                logger.warning("No model version provided for promotion")
                return
            
            # Transition new model to Production
            self.model_registry.transition_model_stage(
                model_name=model_name,
                version=new_version,
                stage='Production',
                archive_existing=True
            )
            
            logger.info(
                f"Model promoted to production: {model_name} v{new_version} - {reason}"
            )
            
        except Exception as e:
            logger.error(f"Error promoting model: {e}")
    
    async def _send_retraining_notification(
        self,
        model_name: str,
        results: Dict[str, Any],
        promoted: bool
    ) -> None:
        """Send notification about retraining results."""
        try:
            if not self.alert_manager:
                return
            
            best_model = results.get('best_model', {})
            metrics = best_model.get('metrics', {})
            
            message = f"""
Automated Model Retraining Completed

Model: {model_name}
Status: {'Promoted to Production' if promoted else 'Not Promoted'}

Best Model: {best_model.get('model_type', 'Unknown')}
R² Score: {metrics.get('r2_score', 0):.4f}
RMSE: {metrics.get('rmse', 0):.2f}
MAE: {metrics.get('mae', 0):.2f}

Version: {best_model.get('version', 'Unknown')}
Run ID: {best_model.get('run_id', 'Unknown')}
"""
            
            await self.alert_manager.send_alert(
                title=f"Model Retraining: {model_name}",
                message=message,
                severity='info' if promoted else 'low',
                alert_type='model_retraining'
            )
            
        except Exception as e:
            logger.error(f"Error sending retraining notification: {e}")


async def run_scheduled_retraining(
    model_names: list[str],
    db_session: AsyncSession,
    check_interval_hours: int = 24
) -> None:
    """
    Run scheduled retraining checks.
    
    Args:
        model_names: List of model names to check
        db_session: Database session
        check_interval_hours: Hours between checks
    """
    model_registry = ModelRegistry()
    alert_manager = AlertManager()
    scheduler = RetrainingScheduler(db_session, model_registry, alert_manager)
    
    while True:
        try:
            logger.info("Running scheduled retraining checks")
            
            for model_name in model_names:
                # Check if retraining needed
                decision = await scheduler.should_retrain(model_name)
                
                if decision['should_retrain']:
                    # Trigger retraining
                    await scheduler.trigger_retraining(model_name)
            
            # Wait for next check
            await asyncio.sleep(check_interval_hours * 3600)
            
        except Exception as e:
            logger.error(f"Error in scheduled retraining: {e}")
            await asyncio.sleep(3600)  # Wait 1 hour on error
