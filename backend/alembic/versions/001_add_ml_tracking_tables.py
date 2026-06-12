"""add ml tracking tables

Revision ID: 001_ml_tracking
Revises: 
Create Date: 2026-05-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_ml_tracking'
down_revision = None
branch_labels = None
depends_on = None


def get_json_type():
    """Return JSONB for postgresql, standard JSON for other dialects like SQLite."""
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        return sa.JSON()
    else:
        from sqlalchemy.dialects import postgresql
        return postgresql.JSONB()


def upgrade() -> None:
    """Create ML tracking tables."""
    
    # Create ml_predictions table
    op.create_table(
        'ml_predictions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('prediction_id', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('model_name', sa.String(100), nullable=False, index=True),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('input_data', get_json_type(), nullable=False),
        sa.Column('prediction', sa.Float(), nullable=False),
        sa.Column('lower_bound', sa.Float(), nullable=True),
        sa.Column('upper_bound', sa.Float(), nullable=True),
        sa.Column('actual_value', sa.Float(), nullable=True),
        sa.Column('prediction_error', sa.Float(), nullable=True),
        sa.Column('latency_ms', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), onupdate=sa.text('NOW()'), nullable=False),
    )
    
    # Create indexes for ml_predictions
    op.create_index('idx_predictions_model', 'ml_predictions', ['model_name', 'model_version'])
    op.create_index('idx_predictions_created', 'ml_predictions', ['created_at'])
    op.create_index('idx_predictions_error', 'ml_predictions', ['prediction_error'])
    
    # Create ml_performance_metrics table
    op.create_table(
        'ml_performance_metrics',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('model_name', sa.String(100), nullable=False, index=True),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('metric_date', sa.Date(), nullable=False, index=True),
        sa.Column('window_days', sa.Integer(), nullable=False),
        sa.Column('r2_score', sa.Float(), nullable=True),
        sa.Column('rmse', sa.Float(), nullable=True),
        sa.Column('mae', sa.Float(), nullable=True),
        sa.Column('mape', sa.Float(), nullable=True),
        sa.Column('prediction_count', sa.Integer(), nullable=True),
        sa.Column('avg_latency_ms', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
    )
    
    # Create unique constraint for ml_performance_metrics
    op.create_index(
        'idx_perf_unique',
        'ml_performance_metrics',
        ['model_name', 'model_version', 'metric_date', 'window_days'],
        unique=True
    )
    op.create_index('idx_perf_model_date', 'ml_performance_metrics', ['model_name', 'metric_date'])
    
    # Create ml_feature_drift table
    op.create_table(
        'ml_feature_drift',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('model_name', sa.String(100), nullable=False, index=True),
        sa.Column('feature_name', sa.String(100), nullable=False),
        sa.Column('check_date', sa.Date(), nullable=False, index=True),
        sa.Column('ks_statistic', sa.Float(), nullable=True),
        sa.Column('p_value', sa.Float(), nullable=True),
        sa.Column('drift_detected', sa.Boolean(), nullable=True),
        sa.Column('training_mean', sa.Float(), nullable=True),
        sa.Column('current_mean', sa.Float(), nullable=True),
        sa.Column('training_std', sa.Float(), nullable=True),
        sa.Column('current_std', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
    )
    
    # Create indexes for ml_feature_drift
    op.create_index('idx_drift_model_date', 'ml_feature_drift', ['model_name', 'check_date'])
    op.create_index('idx_drift_detected', 'ml_feature_drift', ['drift_detected', 'check_date'])
    
    # Create ml_training_jobs table
    op.create_table(
        'ml_training_jobs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('job_id', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('job_type', sa.String(50), nullable=False),  # 'manual', 'scheduled', 'triggered'
        sa.Column('experiment_name', sa.String(100), nullable=False, index=True),
        sa.Column('run_id', sa.String(100), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, index=True),  # 'running', 'completed', 'failed'
        sa.Column('config', get_json_type(), nullable=True),
        sa.Column('dataset_version', sa.String(50), nullable=True),
        sa.Column('dataset_size', sa.Integer(), nullable=True),
        sa.Column('best_model_type', sa.String(50), nullable=True),
        sa.Column('best_r2_score', sa.Float(), nullable=True),
        sa.Column('training_duration_seconds', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.String(100), nullable=True),
    )
    
    # Create indexes for ml_training_jobs
    op.create_index('idx_jobs_status', 'ml_training_jobs', ['status', 'started_at'])
    op.create_index('idx_jobs_experiment', 'ml_training_jobs', ['experiment_name', 'started_at'])


def downgrade() -> None:
    """Drop ML tracking tables."""
    
    # Drop tables in reverse order
    op.drop_table('ml_training_jobs')
    op.drop_table('ml_feature_drift')
    op.drop_table('ml_performance_metrics')
    op.drop_table('ml_predictions')
