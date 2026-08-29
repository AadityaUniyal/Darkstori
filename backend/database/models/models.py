"""SQLAlchemy ORM models for Darkstori 3.0 — complete schema.

Contains all database models including core business tables,
ML tracking tables, hyperlocal intelligence tables, and auth tables.
"""

import os

from sqlalchemy import JSON, Boolean, Column, Date, DateTime
from sqlalchemy import (
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    """Compile PostgreSQL JSONB column type to JSON for SQLite dialect."""
    return "JSON"

from sqlalchemy.orm import declarative_base, relationship, synonym
from sqlalchemy.sql import func
from backend.core.encryption import EncryptedString

Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL", "")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), unique=True, nullable=False)
    subscription_tier = Column(String(50), default="Growth")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="organization")
    dark_stores = relationship("DarkStore", back_populates="organization")


class DarkStore(Base):
    __tablename__ = "dark_stores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    platform = Column(String(50), nullable=False, default="Darkstori")
    store_name = Column(String(200))
    name = synonym("store_name")
    store_code = Column(String(50))

    def __init__(self, **kwargs):
        if "name" in kwargs and "store_name" not in kwargs:
            kwargs["store_name"] = kwargs.pop("name")
        if "lat" in kwargs and "latitude" not in kwargs:
            kwargs["latitude"] = kwargs.pop("lat")
        if "lng" in kwargs and "longitude" not in kwargs:
            kwargs["longitude"] = kwargs.pop("lng")
        if "platform" not in kwargs:
            kwargs["platform"] = "Darkstori"
        super().__init__(**kwargs)
    city = Column(String(100), nullable=False)
    pincode = Column(String(10))
    address = Column(Text)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    city_tier = Column(String(20))
    is_active = Column(Boolean, default=True)
    opening_time = Column(Time)
    closing_time = Column(Time)
    is_24x7 = Column(Boolean, default=False)
    delivery_radius_km = Column(Float)
    storage_capacity_sqft = Column(Integer)
    daily_order_capacity = Column(Integer)
    staff_count = Column(Integer)
    avg_delivery_time_mins = Column(Float)
    avg_rating = Column(Float)
    total_orders_served = Column(Integer)
    date_opened = Column(Date)
    date_added = Column(Date)
    source = Column(String(50))
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"))
    estimated_daily_orders = Column(Integer)
    store_type = Column(String(50))
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="dark_stores")
    orders = relationship("OrderSynthetic", back_populates="store")

    __table_args__ = (
        Index("idx_store_location", "latitude", "longitude"),
        Index("idx_store_active_platform", "is_active", "platform"),
        Index("idx_dark_stores_neighborhood", "neighborhood_id"),
        Index("idx_dark_stores_city_pincode", "city", "pincode"),
    )


class PincodeCoverage(Base):
    __tablename__ = "pincode_coverage"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pincode = Column(String(10), unique=True, nullable=False)
    city = Column(String(100))
    state = Column(String(100))
    district = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    city_tier = Column(String(20))
    population = Column(Integer)
    households = Column(Integer)
    avg_household_income = Column(Integer)
    literacy_rate = Column(Float)
    internet_penetration = Column(Float)
    smartphone_penetration = Column(Float)
    blinkit = Column(Boolean, default=False)
    zepto = Column(Boolean, default=False)
    instamart = Column(Boolean, default=False)
    flipkart_min = Column(Boolean, default=False)
    coverage_score = Column(Float)
    nearest_store_distance_km = Column(Float)
    estimated_daily_orders = Column(Integer)
    market_potential_score = Column(Float)
    competition_intensity = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_pincode_coverage", "coverage_score", "population"),
        Index("idx_pincode_location", "latitude", "longitude"),
    )


class OrderSynthetic(Base):
    __tablename__ = "orders_synthetic"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_number = Column(String(50))
    store_id = Column(Integer, ForeignKey("dark_stores.id"))
    pincode = Column(String(10))
    delivery_latitude = Column(Float)
    delivery_longitude = Column(Float)
    customer_id = Column(String(50))
    is_first_order = Column(Boolean, default=False)
    platform = Column(String(50))
    order_date = Column(Date)
    order_time = Column(Time)
    order_datetime = Column(DateTime)
    total_items = Column(Integer)
    category = Column(String(50))
    subcategory = Column(String(100))
    subtotal = Column(Float)
    delivery_fee = Column(Float)
    discount = Column(Float)
    tax = Column(Float)
    order_value = Column(Float)
    payment_method = Column(String(50))
    is_paid = Column(Boolean, default=False)
    status = Column(String(50))
    estimated_delivery_mins = Column(Integer)
    delivery_mins = Column(Integer)
    delivery_distance_km = Column(Float)
    customer_rating = Column(Float)
    delivery_rating = Column(Float)
    day_of_week = Column(String(10))
    is_weekend = Column(Boolean, default=False)
    is_holiday = Column(Boolean, default=False)
    hour_of_day = Column(Integer)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"))
    weather = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    store = relationship("DarkStore", back_populates="orders")

    __table_args__ = (
        Index("idx_order_date_platform", "order_date", "platform"),
        Index("idx_order_status_date", "status", "order_date"),
        Index("idx_orders_neighborhood", "neighborhood_id"),
        Index("idx_orders_customer_date", "customer_id", "order_date"),
    )


class CompetitorPricing(Base):
    __tablename__ = "competitor_pricing"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sku_name = Column(String(200))
    category = Column(String(50))
    brand = Column(String(100))
    blinkit_price = Column(Float)
    zepto_price = Column(Float)
    instamart_price = Column(Float)
    flipkart_price = Column(Float)
    scraped_date = Column(Date)
    city = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_pricing_sku_date", "sku_name", "scraped_date"),
        Index("idx_pricing_city_date", "city", "scraped_date"),
        Index("idx_competitor_pricing_category", "category"),
        UniqueConstraint("sku_name", "city", "scraped_date", name="uq_competitor_pricing_sku_city_date"),
    )


class UserReview(Base):
    __tablename__ = "user_reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    platform = Column(String(50))
    review_text = Column(Text)
    rating = Column(Integer)
    sentiment_score = Column(Float)
    sentiment_label = Column(String(20))
    review_category = Column(String(50))
    mentions_delivery = Column(Boolean, default=False)
    mentions_quality = Column(Boolean, default=False)
    mentions_price = Column(Boolean, default=False)
    mentions_app = Column(Boolean, default=False)
    city = Column(String(100))
    pincode = Column(String(10))
    review_date = Column(Date)
    source = Column(String(50))
    is_verified = Column(Boolean, default=False)
    helpful_count = Column(Integer, default=0)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"))
    issue_category = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_review_platform_date", "platform", "review_date"),
        Index("idx_review_rating_city", "rating", "city"),
        Index("idx_reviews_issue_category", "issue_category"),
    )


class MarketMetrics(Base):
    __tablename__ = "market_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_date = Column(Date, nullable=False)
    city = Column(String(100), nullable=False)
    pincode = Column(String(10))
    total_orders = Column(Integer)
    total_revenue = Column(Float)
    avg_order_value = Column(Float)
    avg_delivery_time = Column(Float)
    blinkit_orders = Column(Integer)
    zepto_orders = Column(Integer)
    instamart_orders = Column(Integer)
    flipkart_orders = Column(Integer)
    new_customers = Column(Integer)
    repeat_customers = Column(Integer)
    customer_retention_rate = Column(Float)
    avg_preparation_time = Column(Float)
    order_cancellation_rate = Column(Float)
    on_time_delivery_rate = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("metric_date", "city", "pincode", name="uq_daily_metrics"),
        Index("idx_market_metrics_city_date", "city", "metric_date"),
        Index("idx_market_metrics_retention", "customer_retention_rate"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(EncryptedString(200))
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)

    organization = relationship("Organization", back_populates="users")

    __table_args__ = (Index("idx_users_last_login", "last_login"),)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    key_prefix = Column(String(8), nullable=False)
    key_hash = Column(String(128), nullable=False)
    name = Column(String(100), server_default="default")
    is_active = Column(Boolean, server_default=func.text("true"))
    last_used_at = Column(DateTime)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (Index("idx_apikey_user", "user_id", "is_active"),)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_jti = Column(String(64), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, server_default=func.text("false"))
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_refresh_user_revoked", "user_id", "revoked"),
        Index("idx_refresh_expires", "expires_at"),
        Index("idx_refresh_jti", "token_jti"),
    )


class FocusCity(Base):
    __tablename__ = "focus_cities"

    city_id = Column(Integer, primary_key=True)
    city_name = Column(String(100), nullable=False)
    state = Column(String(100))
    analysis_depth = Column(String(20))
    total_dark_stores = Column(Integer)
    total_neighborhoods = Column(Integer)
    market_maturity = Column(String(20))
    total_population = Column(Integer)
    total_area_km2 = Column(Float)
    num_pincodes = Column(Integer)
    last_updated = Column(DateTime, server_default=func.now())

    neighborhoods = relationship("Neighborhood", back_populates="city")


class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    neighborhood_id = Column(Integer, primary_key=True, autoincrement=True)
    id = synonym("neighborhood_id")
    city_id = Column(Integer, ForeignKey("focus_cities.city_id"), nullable=True)
    neighborhood_name = Column(String(200))
    name = synonym("neighborhood_name")

    def __init__(self, **kwargs):
        if "name" in kwargs and "neighborhood_name" not in kwargs:
            kwargs["neighborhood_name"] = kwargs.pop("name")
        if "id" in kwargs and "neighborhood_id" not in kwargs:
            kwargs["neighborhood_id"] = kwargs.pop("id")
        if "density_score" in kwargs and "population_density" not in kwargs:
            kwargs["population_density"] = kwargs.pop("density_score")
        if "polygon_geojson" in kwargs:
            kwargs.pop("polygon_geojson")
        if "city" in kwargs and isinstance(kwargs["city"], str):
            kwargs.pop("city")
        super().__init__(**kwargs)
    pincode = Column(String(10))
    population = Column(Integer)
    avg_age = Column(Float)
    avg_household_income = Column(Float)
    working_professionals_pct = Column(Float)
    peak_order_hours = Column(JSONB)
    preferred_categories = Column(JSONB)
    price_sensitivity = Column(String(20))
    total_stores = Column(Integer)
    competition_intensity = Column(String(20))
    market_potential_score = Column(Float)
    opportunity_rank = Column(Integer)
    area_sqkm = Column(Float)
    population_density = Column(Float)
    last_updated = Column(DateTime, server_default=func.now())

    city = relationship("FocusCity", back_populates="neighborhoods")

    __table_args__ = (
        Index("idx_neighborhoods_city", "city_id"),
        Index("idx_neighborhoods_opportunity", "opportunity_rank"),
    )


class NeighborhoodDNA(Base):
    __tablename__ = "neighborhood_dna"

    dna_id = Column(Integer, primary_key=True)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"))
    dominant_demographic = Column(String(100))
    lifestyle_profile = Column(String(200))
    order_triggers = Column(JSONB)
    peak_times = Column(JSONB)
    preferred_categories = Column(JSONB)
    loyalty_pattern = Column(String(100))
    growth_trajectory = Column(String(50))
    opportunity_score = Column(Float)
    primary_order_hours = Column(JSONB)
    last_updated = Column(DateTime, server_default=func.now())


class StoreSimulation(Base):
    __tablename__ = "store_simulations"

    simulation_id = Column(Integer, primary_key=True, autoincrement=True)
    id = synonym("simulation_id")
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"), nullable=True)
    name = Column(String(200), nullable=True)
    target_city = Column(String(100), nullable=True)
    proposed_lat = Column(Float, nullable=True)
    proposed_lng = Column(Float, nullable=True)
    parameters = Column(JSONB, nullable=True)
    investment_amount = Column(Float, nullable=True)
    store_size_sqft = Column(Integer, nullable=True)
    operating_hours = Column(String(100), nullable=True)
    predicted_daily_orders = Column(Integer, nullable=True)
    predicted_monthly_revenue = Column(Float, nullable=True)
    break_even_month = Column(Integer, nullable=True)
    roi_months = Column(Integer, nullable=True)
    confidence_level = Column(Float, nullable=True)
    status = Column(String(50), server_default="proposed")
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    def __init__(self, **kwargs):
        if "id" in kwargs and "simulation_id" not in kwargs:
            kwargs["simulation_id"] = kwargs.pop("id")
        super().__init__(**kwargs)


class InventoryRecommendation(Base):
    __tablename__ = "inventory_recommendations"

    recommendation_id = Column(Integer, primary_key=True)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"))
    category = Column(String(50))
    investment_amount = Column(Float)
    space_allocation_pct = Column(Float)
    top_skus = Column(JSONB)
    based_on_orders = Column(Integer)
    confidence_level = Column(Float)
    created_at = Column(DateTime, server_default=func.now())


class PricingStrategy(Base):
    __tablename__ = "pricing_strategies"

    strategy_id = Column(Integer, primary_key=True)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"))
    segment = Column(String(50))
    avg_order_value_target = Column(Float)
    price_range_low = Column(Float)
    price_range_high = Column(Float)
    discount_strategy = Column(String(200))
    peak_hour_pricing = Column(JSONB)
    created_at = Column(DateTime, server_default=func.now())


class StoreLayout(Base):
    __tablename__ = "store_layouts"

    layout_id = Column(Integer, primary_key=True)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"))
    store_size_sqft = Column(Integer)
    layout_zones = Column(JSONB)
    based_on_orders = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())


class CompetitiveMove(Base):
    __tablename__ = "competitive_moves"

    move_id = Column(Integer, primary_key=True)
    city_id = Column(Integer, ForeignKey("focus_cities.city_id"))
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"))
    city = Column(String(100))
    pincode = Column(String(10))
    platform = Column(String(50))
    move_type = Column(String(50))
    move_description = Column(Text)
    description = Column(Text)
    impact_level = Column(String(20))
    detected_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (Index("idx_competitive_moves_city", "city_id"),)


class MLPrediction(Base):
    __tablename__ = "ml_predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prediction_id = Column(String(50), unique=True, nullable=False, index=True)
    model_name = Column(String(100), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    input_data = Column(JSONB, nullable=False)
    prediction = Column(Float, nullable=False)
    lower_bound = Column(Float)
    upper_bound = Column(Float)
    actual_value = Column(Float)
    prediction_error = Column(Float)
    latency_ms = Column(Float)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_predictions_model", "model_name", "model_version"),
        Index("idx_predictions_created", "created_at"),
        Index("idx_predictions_error", "prediction_error"),
    )


class MLPerformanceMetric(Base):
    __tablename__ = "ml_performance_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
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

    __table_args__ = (
        UniqueConstraint(
            "model_name", "model_version", "metric_date", "window_days", name="uq_perf_metrics"
        ),
        Index("idx_perf_model_date", "model_name", "metric_date"),
    )


class MLFeatureDrift(Base):
    __tablename__ = "ml_feature_drift"

    id = Column(Integer, primary_key=True, autoincrement=True)
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

    __table_args__ = (
        Index("idx_drift_model_date", "model_name", "check_date"),
        Index("idx_drift_detected", "drift_detected", "check_date"),
    )


class MLTrainingJob(Base):
    __tablename__ = "ml_training_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(50), unique=True, nullable=False, index=True)
    job_type = Column(String(50), nullable=False)
    experiment_name = Column(String(100), nullable=False, index=True)
    run_id = Column(String(100))
    status = Column(String(50), nullable=False, index=True)
    config = Column(JSONB)
    dataset_version = Column(String(50))
    dataset_size = Column(Integer)
    best_model_type = Column(String(50))
    best_r2_score = Column(Float)
    training_duration_seconds = Column(Integer)
    error_message = Column(Text)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime)
    created_by = Column(String(100))

    __table_args__ = (
        Index("idx_jobs_status", "status", "started_at"),
        Index("idx_jobs_experiment", "experiment_name", "started_at"),
    )


class PlacementScore(Base):
    __tablename__ = "placement_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    neighborhood_name = Column(String(200), nullable=False)
    city = Column(String(100), nullable=False)
    lat = Column(Float)
    lng = Column(Float)
    opportunity_score = Column(Float, nullable=False)
    demand_score = Column(Float)
    competition_gap = Column(Float)
    logistics_viability = Column(Float)
    recommended_store_size_sqft = Column(Integer)
    estimated_breakeven_months = Column(Integer)
    confidence = Column(Float)
    factors = Column(JSONB)
    city_tier = Column(String(20))
    scored_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("neighborhood_name", "city", name="uq_placement_nb_city"),
        Index("idx_placement_city_score", "city", "opportunity_score"),
    )


class DeliverySLAMetric(Base):
    __tablename__ = "delivery_sla_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pincode = Column(String(10), nullable=False)
    neighborhood_name = Column(String(200))
    city = Column(String(100), nullable=False)
    avg_eta_min = Column(Float)
    sla_breach_pct = Column(Float)
    peak_eta_min = Column(Float)
    orders_7d = Column(Integer, server_default=func.text("0"))
    recorded_date = Column(Date, server_default=func.text("CURRENT_DATE"))
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("pincode", "recorded_date", name="uq_sla_pincode_date"),
        Index("idx_sla_city_breach", "city", "sla_breach_pct"),
        Index("idx_sla_pincode", "pincode"),
    )


class CustomerCohort(Base):
    __tablename__ = "customer_cohorts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cohort_month = Column(String(20), unique=True, nullable=False)
    user_count = Column(Integer, nullable=False)
    m1_retention = Column(Float)
    m2_retention = Column(Float)
    m3_retention = Column(Float)
    m4_retention = Column(Float)
    m5_retention = Column(Float)
    m6_retention = Column(Float)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (Index("idx_cohort_month", "cohort_month"),)


class EconomicProjection(Base):
    __tablename__ = "economic_projections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), server_default="Untitled")
    input_params = Column(JSONB, nullable=False)
    results = Column(JSONB, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (Index("idx_econ_user", "user_id", "created_at"),)


class PilotCustomer(Base):
    __tablename__ = "pilot_customers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(200))
    contact_name = Column(String(200))
    contact_email = Column(String(255))
    city = Column(String(100))
    status = Column(String(50))
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (Index("idx_pilot_customers_email", "contact_email"),)


class ProductBatch(Base):
    __tablename__ = "product_batches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)  # e.g. Fruits, Vegetables, Dairy
    store_id = Column(Integer, ForeignKey("dark_stores.id"))
    quantity = Column(Integer, default=10)  # in kg or units
    base_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    discount_rate = Column(Float, default=0.0)
    freshness_score = Column(Float, default=1.0)  # 1.0 = super fresh, 0.0 = decayed
    arrival_time = Column(DateTime, default=func.now())
    expiry_time = Column(DateTime, nullable=False)
    decay_rate_per_hour = Column(Float, default=0.02)
    qr_code_hash = Column(String(100), unique=True, nullable=True)
    last_verified_photo = Column(String(300), nullable=True)
    bruising_percent = Column(Float, default=0.0)
    color_state = Column(String(50), default="Greenish/Fresh")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    target_table = Column(String(100))
    target_id = Column(Integer)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    ip_address = Column(String(45))
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")


class StockLedger(Base):
    __tablename__ = "stock_ledger"

    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(Integer, ForeignKey("dark_stores.id"), nullable=False)
    sku_name = Column(String(200), nullable=False)
    quantity_changed = Column(Integer, nullable=False)
    reason = Column(String(50))  # e.g., RESTOCK, SALE, DAMAGED, WASTE
    created_at = Column(DateTime, server_default=func.now())

    store = relationship("DarkStore")

    __table_args__ = (
        Index("idx_stock_ledger_store_sku", "store_id", "sku_name"),
        Index("idx_stock_ledger_created", "created_at"),
    )


class CompetitorStore(Base):
    __tablename__ = "competitor_stores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    platform = Column(String(50), nullable=False)  # Blinkit, Zepto, Swiggy, etc.
    store_name = Column(String(200))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    city = Column(String(100), nullable=False)
    estimated_size_sqft = Column(Integer, default=2000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_competitor_store_location", "latitude", "longitude"),
        Index("idx_competitor_store_city_platform", "city", "platform"),
    )


class LocalEvent(Base):
    __tablename__ = "local_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    city = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=True)
    event_date = Column(Date, nullable=False)
    event_time = Column(Time, nullable=True)
    event_type = Column(String(50), default="Other")  # concert, match, exam, festival
    expected_impact_pct = Column(Float, default=10.0)  # expected percentage change in orders
    created_at = Column(DateTime, server_default=func.now())


# ── Competitive Moat Features ──────────────────────────────────────────────


class Playbook(Base):
    """Automated rule: trigger → condition → action.

    Example: 'When a competitor opens a store within 2 km,
    auto-run cannibalization simulation and alert the regional manager.'
    """
    __tablename__ = "playbooks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    # Trigger: which event type fires this playbook
    trigger_type = Column(String(50), nullable=False)
    # e.g. "competitor_store_opened", "drift_detected", "sla_breach",
    #      "temp_breach", "demand_spike", "price_war"

    # Condition: JSON rules that must match the event payload
    # e.g. {"field": "city", "op": "eq", "value": "Bangalore"}
    conditions = Column(JSONB, default=list)

    # Action: what to do when triggered
    action_type = Column(String(50), nullable=False)
    # e.g. "send_alert", "run_cannibalization", "accelerate_markdown",
    #      "trigger_retraining", "adjust_safety_stock"
    action_config = Column(JSONB, default=dict)
    # e.g. {"channel": "email", "recipients": ["mgr@co.in"]}
    #   or {"markdown_multiplier": 1.5}

    cooldown_minutes = Column(Integer, default=60)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_playbook_trigger", "trigger_type", "is_active"),
    )


class PlaybookExecution(Base):
    """Audit log of every time a playbook fires."""
    __tablename__ = "playbook_executions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    playbook_id = Column(Integer, ForeignKey("playbooks.id"), nullable=False)
    trigger_event = Column(JSONB, nullable=False)  # the raw event payload
    conditions_matched = Column(Boolean, default=True)
    action_result = Column(JSONB)  # outcome / response
    status = Column(String(30), default="success")  # success, failed, skipped
    executed_at = Column(DateTime, server_default=func.now())

    playbook = relationship("Playbook")

    __table_args__ = (
        Index("idx_exec_playbook", "playbook_id", "executed_at"),
        Index("idx_exec_status", "status", "executed_at"),
    )


class CannibalizationSimulation(Base):
    """Records the impact of opening a new store on existing stores."""
    __tablename__ = "cannibalization_simulations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    proposed_lat = Column(Float, nullable=False)
    proposed_lng = Column(Float, nullable=False)
    proposed_city = Column(String(100), nullable=False)
    radius_km = Column(Float, default=3.0)

    # Results
    total_new_orders = Column(Integer)         # orders the new store would get
    total_cannibalized_orders = Column(Integer)  # orders stolen from existing
    net_incremental_orders = Column(Integer)    # true new demand
    cannibalization_rate_pct = Column(Float)    # cannibalized / new × 100
    affected_stores = Column(JSONB)            # [{store_id, name, lost_orders, lost_pct}]
    portfolio_impact = Column(JSONB)           # {revenue_change, cost_change, net_pnl}

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("idx_cannibal_city", "proposed_city", "created_at"),
    )


class ExpansionDecision(Base):
    """Auditable decision record for the expansion workflow."""
    __tablename__ = "expansion_decisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    city = Column(String(100), nullable=False)
    neighborhood_id = Column(Integer, ForeignKey("neighborhoods.neighborhood_id"), nullable=True)
    neighborhood_name = Column(String(200), nullable=False)
    status = Column(String(30), nullable=False, default="draft")
    opportunity_score = Column(Float, nullable=False, default=0.0)
    demand_estimate = Column(Integer, nullable=False, default=0)
    coverage_gain_pct = Column(Float, nullable=False, default=0.0)
    cannibalization_risk_pct = Column(Float, nullable=False, default=0.0)
    roi_12_months_pct = Column(Float, nullable=False, default=0.0)
    breakeven_months = Column(Integer, nullable=False, default=0)
    capex = Column(Float, nullable=False, default=0.0)
    store_size_sqft = Column(Integer, nullable=False, default=1500)
    logistics_constraint_mins = Column(Float, nullable=False, default=15.0)
    simulation_id = Column(Integer, ForeignKey("store_simulations.simulation_id"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_notes = Column(Text)
    decision_payload = Column(JSONB, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_expansion_decision_city_status", "city", "status"),
        Index("idx_expansion_decision_created", "created_at"),
    )
