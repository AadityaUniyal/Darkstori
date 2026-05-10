"""Add live feed tables

Revision ID: 002
Revises: 001
Create Date: 2026-05-10 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    """Create live feed tables."""
    
    # 1. Live Delivery Events
    op.create_table(
        'live_delivery_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_id', sa.String(length=50), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('pincode', sa.String(length=10), nullable=False),
        sa.Column('delivery_time_mins', sa.Integer(), nullable=True),
        sa.Column('order_value', sa.Float(), nullable=True),
        sa.Column('items_count', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('event_timestamp', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('user_id', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id')
    )
    op.create_index('idx_live_event_platform_time', 'live_delivery_events', ['platform', 'event_timestamp'])
    op.create_index('idx_live_event_pincode_time', 'live_delivery_events', ['pincode', 'event_timestamp'])
    op.create_index('idx_live_event_timestamp', 'live_delivery_events', ['event_timestamp'])
    op.create_index(op.f('ix_live_delivery_events_city'), 'live_delivery_events', ['city'])
    op.create_index(op.f('ix_live_delivery_events_event_id'), 'live_delivery_events', ['event_id'])
    op.create_index(op.f('ix_live_delivery_events_pincode'), 'live_delivery_events', ['pincode'])
    op.create_index(op.f('ix_live_delivery_events_platform'), 'live_delivery_events', ['platform'])
    
    # 2. Platform Availability
    op.create_table(
        'platform_availability',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('pincode', sa.String(length=10), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False),
        sa.Column('estimated_delivery_mins', sa.Integer(), nullable=True),
        sa.Column('checked_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_availability_pincode_platform', 'platform_availability', ['pincode', 'platform', 'checked_at'])
    op.create_index('idx_availability_checked', 'platform_availability', ['checked_at'])
    op.create_index(op.f('ix_platform_availability_city'), 'platform_availability', ['city'])
    op.create_index(op.f('ix_platform_availability_pincode'), 'platform_availability', ['pincode'])
    op.create_index(op.f('ix_platform_availability_platform'), 'platform_availability', ['platform'])
    
    # 3. Daily Market Reports
    op.create_table(
        'daily_market_reports',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('report_id', sa.String(length=50), nullable=False),
        sa.Column('report_date', sa.Date(), nullable=False),
        sa.Column('total_deliveries', sa.Integer(), nullable=True),
        sa.Column('avg_delivery_time', sa.Float(), nullable=True),
        sa.Column('total_revenue', sa.Float(), nullable=True),
        sa.Column('platform_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('top_pincodes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('coverage_changes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('peak_hours', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('fastest_platform', sa.String(length=50), nullable=True),
        sa.Column('slowest_platform', sa.String(length=50), nullable=True),
        sa.Column('insights', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('opportunities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('alerts', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('report_id'),
        sa.UniqueConstraint('report_date')
    )
    op.create_index('idx_report_date', 'daily_market_reports', ['report_date'])
    op.create_index(op.f('ix_daily_market_reports_report_id'), 'daily_market_reports', ['report_id'])
    
    # 4. Social Sentiment
    op.create_table(
        'social_sentiment',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('sentiment_score', sa.Float(), nullable=True),
        sa.Column('mention_count', sa.Integer(), nullable=True),
        sa.Column('complaint_count', sa.Integer(), nullable=True),
        sa.Column('praise_count', sa.Integer(), nullable=True),
        sa.Column('trending_issues', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('trending_hashtags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('analysis_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_sentiment_platform_date', 'social_sentiment', ['platform', 'analysis_date'])
    op.create_index('idx_sentiment_score', 'social_sentiment', ['sentiment_score', 'analysis_date'])
    op.create_index(op.f('ix_social_sentiment_analysis_date'), 'social_sentiment', ['analysis_date'])
    op.create_index(op.f('ix_social_sentiment_city'), 'social_sentiment', ['city'])
    op.create_index(op.f('ix_social_sentiment_platform'), 'social_sentiment', ['platform'])
    
    # 5. Live Feed Metrics (Hourly Snapshots)
    op.create_table(
        'live_feed_metrics',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('snapshot_time', sa.DateTime(), nullable=False),
        sa.Column('window_minutes', sa.Integer(), nullable=True),
        sa.Column('total_deliveries', sa.Integer(), nullable=True),
        sa.Column('avg_delivery_time', sa.Float(), nullable=True),
        sa.Column('total_order_value', sa.Float(), nullable=True),
        sa.Column('platform_breakdown', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('top_pincodes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('top_cities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('fastest_delivery_time', sa.Integer(), nullable=True),
        sa.Column('slowest_delivery_time', sa.Integer(), nullable=True),
        sa.Column('success_rate', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('snapshot_time')
    )
    op.create_index('idx_metrics_snapshot', 'live_feed_metrics', ['snapshot_time'])


def downgrade():
    """Drop live feed tables."""
    
    # Drop tables in reverse order
    op.drop_index('idx_metrics_snapshot', table_name='live_feed_metrics')
    op.drop_table('live_feed_metrics')
    
    op.drop_index(op.f('ix_social_sentiment_platform'), table_name='social_sentiment')
    op.drop_index(op.f('ix_social_sentiment_city'), table_name='social_sentiment')
    op.drop_index(op.f('ix_social_sentiment_analysis_date'), table_name='social_sentiment')
    op.drop_index('idx_sentiment_score', table_name='social_sentiment')
    op.drop_index('idx_sentiment_platform_date', table_name='social_sentiment')
    op.drop_table('social_sentiment')
    
    op.drop_index(op.f('ix_daily_market_reports_report_id'), table_name='daily_market_reports')
    op.drop_index('idx_report_date', table_name='daily_market_reports')
    op.drop_table('daily_market_reports')
    
    op.drop_index(op.f('ix_platform_availability_platform'), table_name='platform_availability')
    op.drop_index(op.f('ix_platform_availability_pincode'), table_name='platform_availability')
    op.drop_index(op.f('ix_platform_availability_city'), table_name='platform_availability')
    op.drop_index('idx_availability_checked', table_name='platform_availability')
    op.drop_index('idx_availability_pincode_platform', table_name='platform_availability')
    op.drop_table('platform_availability')
    
    op.drop_index(op.f('ix_live_delivery_events_platform'), table_name='live_delivery_events')
    op.drop_index(op.f('ix_live_delivery_events_pincode'), table_name='live_delivery_events')
    op.drop_index(op.f('ix_live_delivery_events_event_id'), table_name='live_delivery_events')
    op.drop_index(op.f('ix_live_delivery_events_city'), table_name='live_delivery_events')
    op.drop_index('idx_live_event_timestamp', table_name='live_delivery_events')
    op.drop_index('idx_live_event_pincode_time', table_name='live_delivery_events')
    op.drop_index('idx_live_event_platform_time', table_name='live_delivery_events')
    op.drop_table('live_delivery_events')
