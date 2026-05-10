# 🗄️ Darkstori Database Schema Documentation

## Overview

Your Neon PostgreSQL database now contains **12 tables** organized into 4 main categories:

1. **Core Business Tables** (5 tables) - Store locations, coverage, orders, pricing, reviews
2. **ML Tracking Tables** (4 tables) - Model predictions, performance, drift, training jobs
3. **Analytics Tables** (1 table) - Market metrics aggregations
4. **User Management** (1 table) - Authentication and authorization
5. **Legacy** (1 table) - Old orders table (can be removed)

---

## ✅ Database Status

**Connection:** ✓ Connected to Neon PostgreSQL  
**Version:** PostgreSQL 17.8  
**Database:** neondb  
**Schema:** public  
**Total Tables:** 12  

---

## 📊 Table Details

### 1. Core Business Tables

#### `dark_stores`
**Purpose:** Store all dark store locations with operational details

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| platform | String(50) | Platform name (Blinkit, Zepto, etc.) |
| store_name | String(200) | Store name |
| store_code | String(50) | Unique store code |
| city | String(100) | City name |
| pincode | String(10) | PIN code |
| address | Text | Full address |
| latitude | Float | Latitude coordinate |
| longitude | Float | Longitude coordinate |
| city_tier | String(20) | City tier (Metro, Tier1, etc.) |
| is_active | Boolean | Store active status |
| opening_time | Time | Opening time |
| closing_time | Time | Closing time |
| is_24x7 | Boolean | 24/7 operation flag |
| delivery_radius_km | Float | Delivery radius |
| storage_capacity_sqft | Integer | Storage capacity |
| daily_order_capacity | Integer | Daily order capacity |
| staff_count | Integer | Number of staff |
| avg_delivery_time_mins | Float | Average delivery time |
| avg_rating | Float | Average rating (0-5) |
| total_orders_served | Integer | Total orders served |
| date_opened | Date | Store opening date |
| date_added | Date | Date added to system |
| source | String(50) | Data source |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Record update timestamp |

**Indexes:**
- `idx_store_location` (latitude, longitude)
- `idx_store_active_platform` (is_active, platform)
- Platform, city, pincode, is_active

**Relationships:**
- One-to-many with `orders_synthetic`

---

#### `pincode_coverage`
**Purpose:** PIN code coverage analysis with demographics

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| pincode | String(10) | PIN code (unique) |
| city | String(100) | City name |
| state | String(100) | State name |
| district | String(100) | District name |
| latitude | Float | Latitude coordinate |
| longitude | Float | Longitude coordinate |
| city_tier | String(20) | City tier |
| population | Integer | Population count |
| households | Integer | Number of households |
| avg_household_income | Integer | Average household income |
| literacy_rate | Float | Literacy rate (%) |
| internet_penetration | Float | Internet penetration (%) |
| smartphone_penetration | Float | Smartphone penetration (%) |
| blinkit | Boolean | Blinkit coverage |
| zepto | Boolean | Zepto coverage |
| instamart | Boolean | Instamart coverage |
| flipkart_min | Boolean | Flipkart Minutes coverage |
| coverage_score | Float | Coverage score (0-4) |
| nearest_store_distance_km | Float | Distance to nearest store |
| estimated_daily_orders | Integer | Estimated daily orders |
| market_potential_score | Float | Market potential score |
| competition_intensity | Float | Competition intensity |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Record update timestamp |

**Indexes:**
- `idx_pincode_coverage` (coverage_score, population)
- `idx_pincode_location` (latitude, longitude)
- Pincode, city, state

---

#### `orders_synthetic`
**Purpose:** Synthetic order data for training and analysis

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| order_number | String(50) | Unique order number |
| store_id | Integer (FK) | Reference to dark_stores |
| pincode | String(10) | Delivery PIN code |
| delivery_latitude | Float | Delivery latitude |
| delivery_longitude | Float | Delivery longitude |
| customer_id | String(50) | Customer identifier |
| is_first_order | Boolean | First order flag |
| platform | String(50) | Platform name |
| order_date | Date | Order date |
| order_time | Time | Order time |
| order_datetime | DateTime | Order datetime |
| total_items | Integer | Total items in order |
| category | String(50) | Order category |
| subcategory | String(100) | Order subcategory |
| subtotal | Float | Subtotal amount |
| delivery_fee | Float | Delivery fee |
| discount | Float | Discount amount |
| tax | Float | Tax amount |
| order_value | Float | Total order value |
| payment_method | String(50) | Payment method |
| is_paid | Boolean | Payment status |
| status | String(50) | Order status |
| estimated_delivery_mins | Integer | Estimated delivery time |
| delivery_mins | Integer | Actual delivery time |
| delivery_distance_km | Float | Delivery distance |
| customer_rating | Float | Customer rating (0-5) |
| delivery_rating | Float | Delivery rating (0-5) |
| day_of_week | String(10) | Day of week |
| is_weekend | Boolean | Weekend flag |
| is_holiday | Boolean | Holiday flag |
| hour_of_day | Integer | Hour of day (0-23) |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Record update timestamp |

**Indexes:**
- `idx_order_date_platform` (order_date, platform)
- `idx_order_status_date` (status, order_date)
- Store_id, pincode, customer_id, platform, order_date, status, is_weekend, order_datetime

**Relationships:**
- Many-to-one with `dark_stores`

---

#### `competitor_pricing`
**Purpose:** Competitor pricing data for market analysis

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| sku_name | String(200) | Product SKU name |
| category | String(50) | Product category |
| brand | String(100) | Product brand |
| blinkit_price | Float | Blinkit price |
| zepto_price | Float | Zepto price |
| instamart_price | Float | Instamart price |
| flipkart_price | Float | Flipkart price |
| scraped_date | Date | Date scraped |
| city | String(100) | City name |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Record update timestamp |

**Indexes:**
- `idx_pricing_sku_date` (sku_name, scraped_date)
- `idx_pricing_city_date` (city, scraped_date)
- Sku_name, category, scraped_date, city

---

#### `user_reviews`
**Purpose:** User reviews with sentiment analysis

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| platform | String(50) | Platform name |
| review_text | Text | Review text |
| rating | Integer | Rating (1-5) |
| sentiment_score | Float | VADER sentiment score |
| sentiment_label | String(20) | Sentiment label |
| review_category | String(50) | Review category |
| mentions_delivery | Boolean | Mentions delivery |
| mentions_quality | Boolean | Mentions quality |
| mentions_price | Boolean | Mentions price |
| mentions_app | Boolean | Mentions app |
| city | String(100) | City name |
| pincode | String(10) | PIN code |
| review_date | Date | Review date |
| source | String(50) | Review source |
| is_verified | Boolean | Verified review flag |
| helpful_count | Integer | Helpful count |
| created_at | DateTime | Record creation timestamp |

**Indexes:**
- `idx_review_platform_date` (platform, review_date)
- `idx_review_rating_city` (rating, city)
- Platform, city, review_date

---

### 2. ML Tracking Tables

#### `ml_predictions`
**Purpose:** Model prediction logging for monitoring

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| prediction_id | String(50) | Unique prediction ID |
| model_name | String(100) | Model name |
| model_version | String(50) | Model version |
| input_data | JSONB | Input features (JSON) |
| prediction | Float | Predicted value |
| lower_bound | Float | Prediction lower bound |
| upper_bound | Float | Prediction upper bound |
| actual_value | Float | Actual outcome value |
| prediction_error | Float | Prediction error |
| latency_ms | Float | Prediction latency (ms) |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Record update timestamp |

**Indexes:**
- `idx_predictions_model` (model_name, model_version)
- `idx_predictions_created` (created_at)
- `idx_predictions_error` (prediction_error)
- Prediction_id, model_name

**Usage:** Logs every prediction made by ML models for performance tracking

---

#### `ml_performance_metrics`
**Purpose:** Rolling performance metrics

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| model_name | String(100) | Model name |
| model_version | String(50) | Model version |
| metric_date | Date | Metric date |
| window_days | Integer | Rolling window (days) |
| r2_score | Float | R² score |
| rmse | Float | Root mean squared error |
| mae | Float | Mean absolute error |
| mape | Float | Mean absolute percentage error |
| prediction_count | Integer | Number of predictions |
| avg_latency_ms | Float | Average latency (ms) |
| created_at | DateTime | Record creation timestamp |

**Indexes:**
- `uq_perf_metrics` (model_name, model_version, metric_date, window_days) - UNIQUE
- `idx_perf_model_date` (model_name, metric_date)
- Model_name, metric_date

**Usage:** Stores aggregated performance metrics over rolling time windows

---

#### `ml_feature_drift`
**Purpose:** Feature distribution drift detection

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| model_name | String(100) | Model name |
| feature_name | String(100) | Feature name |
| check_date | Date | Check date |
| ks_statistic | Float | Kolmogorov-Smirnov statistic |
| p_value | Float | Statistical p-value |
| drift_detected | Boolean | Drift detected flag |
| training_mean | Float | Training data mean |
| current_mean | Float | Current data mean |
| training_std | Float | Training data std dev |
| current_std | Float | Current data std dev |
| created_at | DateTime | Record creation timestamp |

**Indexes:**
- `idx_drift_model_date` (model_name, check_date)
- `idx_drift_detected` (drift_detected, check_date)
- Model_name, check_date

**Usage:** Monitors changes in input feature distributions over time

---

#### `ml_training_jobs`
**Purpose:** Training job execution history

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| job_id | String(50) | Unique job ID |
| job_type | String(50) | Job type (manual/scheduled/triggered) |
| experiment_name | String(100) | MLflow experiment name |
| run_id | String(100) | MLflow run ID |
| status | String(50) | Job status |
| config | JSONB | Training configuration (JSON) |
| dataset_version | String(50) | Dataset version |
| dataset_size | Integer | Dataset size |
| best_model_type | String(50) | Best model type |
| best_r2_score | Float | Best R² score |
| training_duration_seconds | Integer | Training duration |
| error_message | Text | Error message (if failed) |
| started_at | DateTime | Job start time |
| completed_at | DateTime | Job completion time |
| created_by | String(100) | User who created job |

**Indexes:**
- `idx_jobs_status` (status, started_at)
- `idx_jobs_experiment` (experiment_name, started_at)
- Job_id, experiment_name, status

**Usage:** Tracks all training job executions with results and errors

---

### 3. Analytics Tables

#### `market_metrics`
**Purpose:** Daily market-level aggregated metrics

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| metric_date | Date | Metric date |
| city | String(100) | City name |
| pincode | String(10) | PIN code |
| total_orders | Integer | Total orders |
| total_revenue | Float | Total revenue |
| avg_order_value | Float | Average order value |
| avg_delivery_time | Float | Average delivery time |
| blinkit_orders | Integer | Blinkit orders |
| zepto_orders | Integer | Zepto orders |
| instamart_orders | Integer | Instamart orders |
| flipkart_orders | Integer | Flipkart orders |
| new_customers | Integer | New customers |
| repeat_customers | Integer | Repeat customers |
| customer_retention_rate | Float | Retention rate (%) |
| avg_preparation_time | Float | Average prep time |
| order_cancellation_rate | Float | Cancellation rate (%) |
| on_time_delivery_rate | Float | On-time delivery rate (%) |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Record update timestamp |

**Indexes:**
- `uq_daily_metrics` (metric_date, city, pincode) - UNIQUE
- `idx_metrics_date_city` (metric_date, city)
- Metric_date, city

**Usage:** Stores daily aggregated metrics for analytics dashboards

---

### 4. User Management Tables

#### `users`
**Purpose:** User accounts for authentication

| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique identifier |
| email | String(255) | Email address (unique) |
| username | String(100) | Username (unique) |
| hashed_password | String(255) | Hashed password |
| full_name | String(200) | Full name |
| role | String(50) | User role (admin/analyst/user) |
| is_active | Boolean | Active status |
| is_verified | Boolean | Verified status |
| created_at | DateTime | Record creation timestamp |
| updated_at | DateTime | Record update timestamp |
| last_login | DateTime | Last login timestamp |

**Indexes:**
- Email (unique)
- Username (unique)

**Usage:** Manages user authentication and authorization

---

### 5. Legacy Tables

#### `orders`
**Purpose:** Old orders table (deprecated)

**Status:** ⚠️ This table appears to be a legacy table. Consider migrating data to `orders_synthetic` and removing this table.

---

## 🔗 Relationships

```
dark_stores (1) ──────< (many) orders_synthetic
```

---

## 📈 Data Flow

### Training Pipeline
```
orders_synthetic + pincode_coverage + dark_stores
    ↓
Feature Engineering
    ↓
Model Training (MLflow)
    ↓
ml_training_jobs (log job)
    ↓
Model Registry
```

### Prediction Pipeline
```
User Request
    ↓
Load Model from Registry
    ↓
Make Prediction
    ↓
ml_predictions (log prediction)
    ↓
Return Result
```

### Monitoring Pipeline
```
ml_predictions (collect predictions)
    ↓
Calculate Metrics
    ↓
ml_performance_metrics (store metrics)
    ↓
Check Drift
    ↓
ml_feature_drift (store drift results)
    ↓
Alert if needed
```

---

## 🛠️ Maintenance Tasks

### Regular Tasks

1. **Monitor Table Sizes**
   ```sql
   SELECT 
       schemaname,
       tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

2. **Check ML Predictions Growth**
   ```sql
   SELECT 
       DATE(created_at) as date,
       COUNT(*) as predictions
   FROM ml_predictions
   GROUP BY DATE(created_at)
   ORDER BY date DESC
   LIMIT 30;
   ```

3. **Monitor Training Jobs**
   ```sql
   SELECT 
       status,
       COUNT(*) as count,
       AVG(training_duration_seconds) as avg_duration
   FROM ml_training_jobs
   GROUP BY status;
   ```

### Cleanup Tasks

1. **Archive Old Predictions** (older than 90 days)
   ```sql
   DELETE FROM ml_predictions
   WHERE created_at < NOW() - INTERVAL '90 days';
   ```

2. **Remove Failed Training Jobs** (older than 30 days)
   ```sql
   DELETE FROM ml_training_jobs
   WHERE status = 'failed' 
   AND started_at < NOW() - INTERVAL '30 days';
   ```

---

## 🔒 Security Considerations

1. **Sensitive Data**
   - User passwords are hashed using bcrypt
   - Database connection uses SSL (sslmode=require)
   - API keys stored in environment variables

2. **Access Control**
   - Admin role required for model transitions
   - JWT authentication for all API endpoints
   - Rate limiting: 60 requests/minute per user

3. **Data Privacy**
   - Synthetic order data (no real customer data)
   - Review data anonymized
   - No PII stored in prediction logs

---

## 📊 Current Database Statistics

- **Total Tables:** 12
- **Core Business Tables:** 5
- **ML Tracking Tables:** 4
- **Analytics Tables:** 1
- **User Management:** 1
- **Legacy Tables:** 1

---

## ✅ Next Steps

1. **Verify Data**
   ```bash
   python database/scripts/check_and_fix_db.py
   ```

2. **Seed Initial Data** (if needed)
   ```bash
   python database/scripts/seed_data.py
   ```

3. **Run Migrations**
   ```bash
   alembic upgrade head
   ```

4. **Test ML Pipeline**
   ```bash
   python backend/ml/train_model.py
   ```

5. **Start Services**
   ```bash
   docker-compose up -d
   ```

---

## 📝 Notes

- Database is hosted on **Neon** (serverless PostgreSQL)
- Connection pooling enabled for better performance
- All timestamps use UTC timezone
- JSONB columns for flexible schema (input_data, config)
- Indexes optimized for common query patterns

---

**Last Updated:** 2026-05-10  
**Database Version:** PostgreSQL 17.8  
**Schema Version:** 1.0
