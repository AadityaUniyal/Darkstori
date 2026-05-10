# 🚀 Quick Start: Database Setup

## ✅ What Was Fixed

Your Neon database was missing **5 critical ML tracking tables**. These have now been created:

1. ✅ `ml_predictions` - Logs all model predictions
2. ✅ `ml_performance_metrics` - Tracks model performance over time
3. ✅ `ml_feature_drift` - Monitors feature distribution changes
4. ✅ `ml_training_jobs` - Records training job history
5. ✅ `market_metrics` - Stores daily market aggregations

## 📊 Current Database State

**Database:** neondb  
**Host:** ep-orange-field-amzn4w4x.c-5.us-east-1.aws.neon.tech  
**Status:** ✅ All 12 tables created  
**Connection:** ✅ Working  

### All Tables (12)

| # | Table Name | Purpose | Status |
|---|------------|---------|--------|
| 1 | `competitor_pricing` | Competitor price tracking | ✅ Exists |
| 2 | `dark_stores` | Store locations & details | ✅ Exists |
| 3 | `market_metrics` | Daily market aggregations | ✅ **NEW** |
| 4 | `ml_feature_drift` | Feature drift detection | ✅ **NEW** |
| 5 | `ml_performance_metrics` | Model performance tracking | ✅ **NEW** |
| 6 | `ml_predictions` | Prediction logging | ✅ **NEW** |
| 7 | `ml_training_jobs` | Training job history | ✅ **NEW** |
| 8 | `orders` | Legacy orders (can remove) | ✅ Exists |
| 9 | `orders_synthetic` | Training data orders | ✅ Exists |
| 10 | `pincode_coverage` | PIN code coverage analysis | ✅ Exists |
| 11 | `user_reviews` | User reviews & sentiment | ✅ Exists |
| 12 | `users` | User authentication | ✅ Exists |

---

## 🔧 How to Use

### 1. Verify Database Connection

```bash
python database/scripts/check_and_fix_db.py
```

This script will:
- ✅ Test database connection
- ✅ List all existing tables
- ✅ Check for missing tables
- ✅ Create any missing tables
- ✅ Verify final state

### 2. Run Database Migrations

```bash
# From project root
alembic upgrade head
```

This will apply any pending migrations.

### 3. Initialize MLflow Database

```bash
python backend/scripts/init_mlflow_db.py
```

This sets up MLflow tracking tables.

### 4. Seed Initial Data (Optional)

```bash
# Seed dark stores and PIN code data
python database/scripts/seed_data.py

# Or use enhanced seeding
python database/scripts/seed_enhanced_data.py
```

---

## 🧪 Test the Setup

### Test 1: Check Table Counts

```bash
python -c "
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    for table in ['dark_stores', 'orders_synthetic', 'ml_predictions', 'users']:
        result = conn.execute(text(f'SELECT COUNT(*) FROM {table}'))
        count = result.scalar()
        print(f'{table}: {count} rows')
"
```

### Test 2: Test ML Prediction Logging

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from backend.database.models import MLPrediction
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

# Create a test prediction
with Session(engine) as session:
    prediction = MLPrediction(
        prediction_id="test_001",
        model_name="demand_forecasting_model",
        model_version="1",
        input_data={"pincode": "110001", "date": "2026-05-10"},
        prediction=150.5,
        lower_bound=140.0,
        upper_bound=160.0,
        latency_ms=45.2
    )
    session.add(prediction)
    session.commit()
    print("✓ Test prediction logged successfully!")
```

### Test 3: Check Database Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "mlflow": "running",
  "timestamp": "2026-05-10T..."
}
```

---

## 🎯 What You Can Do Now

### 1. Train Your First Model

```bash
cd backend
python ml/train_model.py
```

This will:
- Load training data from `orders_synthetic`
- Train multiple models (XGBoost, Random Forest, etc.)
- Log experiments to MLflow
- Register best model
- Create entry in `ml_training_jobs` table

### 2. Make Predictions

```bash
# Start the backend server
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Then make a prediction:

```bash
curl -X POST "http://localhost:8000/api/v1/ml/predict" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pincode": "110001",
    "order_date": "2026-05-10",
    "population": 150000,
    "coverage_score": 2,
    "city_tier": "Metro",
    "city": "Delhi",
    "state": "Delhi"
  }'
```

Prediction will be logged to `ml_predictions` table.

### 3. Monitor Model Performance

```bash
# View performance metrics
curl "http://localhost:8000/api/v1/ml/performance?model_name=demand_forecasting_model&window_days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Metrics are stored in `ml_performance_metrics` table.

### 4. Check for Feature Drift

```bash
# Check drift detection
curl "http://localhost:8000/api/v1/ml/drift?model_name=demand_forecasting_model" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Drift results are stored in `ml_feature_drift` table.

### 5. View Training History

```bash
# Get training job history
curl "http://localhost:8000/api/v1/ml/training/jobs?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Jobs are tracked in `ml_training_jobs` table.

---

## 📈 Database Growth Estimates

Based on typical usage:

| Table | Growth Rate | Retention | Storage/Month |
|-------|-------------|-----------|---------------|
| `ml_predictions` | 10K/day | 90 days | ~50 MB |
| `ml_performance_metrics` | 30/day | 1 year | ~1 MB |
| `ml_feature_drift` | 100/week | 1 year | ~5 MB |
| `ml_training_jobs` | 10/week | Forever | ~1 MB |
| `orders_synthetic` | 50K/month | Forever | ~100 MB |

**Total estimated growth:** ~150 MB/month

Neon free tier: 512 MB storage (sufficient for 3+ months)

---

## 🔄 Maintenance Commands

### Check Database Size

```sql
SELECT 
    pg_size_pretty(pg_database_size('neondb')) as database_size;
```

### Check Table Sizes

```sql
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
```

### Clean Old Predictions (90+ days)

```sql
DELETE FROM ml_predictions
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Archive Failed Training Jobs (30+ days)

```sql
DELETE FROM ml_training_jobs
WHERE status = 'failed' 
AND started_at < NOW() - INTERVAL '30 days';
```

---

## 🐛 Troubleshooting

### Issue: "relation does not exist"

**Solution:** Run the database checker:
```bash
python database/scripts/check_and_fix_db.py
```

### Issue: "connection refused"

**Solution:** Check your DATABASE_URL in .env:
```bash
echo $DATABASE_URL
```

Should be:
```
postgresql://neondb_owner:npg_roH2CA1qBcIU@ep-orange-field-amzn4w4x-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Issue: "too many connections"

**Solution:** Neon free tier has connection limits. Use connection pooling:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True
)
```

### Issue: "disk quota exceeded"

**Solution:** Clean old data or upgrade Neon plan:
```bash
# Check current size
python -c "
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    result = conn.execute(text(\"SELECT pg_size_pretty(pg_database_size('neondb'))\"))
    print(f'Database size: {result.scalar()}')
"
```

---

## 📚 Additional Resources

- **Full Schema Documentation:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **API Documentation:** http://localhost:8000/api/docs
- **MLflow UI:** http://localhost:5000
- **Neon Console:** https://console.neon.tech

---

## ✅ Checklist

- [x] Database connection verified
- [x] All 12 tables created
- [x] ML tracking tables added
- [x] Schema documented
- [ ] Initial data seeded
- [ ] First model trained
- [ ] Predictions tested
- [ ] Monitoring verified

---

## 🎉 You're All Set!

Your database is now fully configured and ready for:
- ✅ ML model training
- ✅ Prediction logging
- ✅ Performance monitoring
- ✅ Drift detection
- ✅ Training job tracking

**Next Steps:**
1. Seed some initial data: `python database/scripts/seed_data.py`
2. Train your first model: `python backend/ml/train_model.py`
3. Start the backend: `uvicorn backend.app:app --reload`
4. Make your first prediction via API

---

**Need Help?**
- Check [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed table documentation
- Check [README.md](../README.md) for full project documentation
- Run `python database/scripts/check_and_fix_db.py` to verify setup

---

**Last Updated:** 2026-05-10  
**Status:** ✅ Database Ready
