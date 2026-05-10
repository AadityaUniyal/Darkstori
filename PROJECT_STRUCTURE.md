# 📁 Project Structure

## Overview

Darkstori is organized as a monorepo with clear separation between backend, frontend, database, and documentation.

```
darkstori/
├── .github/              # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml       # Continuous Integration
│       ├── cd.yml       # Continuous Deployment
│       └── codeql.yml   # Security scanning
│
├── alembic/             # Database migrations
│   ├── versions/        # Migration scripts
│   │   ├── 001_add_ml_tracking_tables.py
│   │   └── 002_add_live_feed_tables.py
│   └── env.py          # Alembic environment
│
├── backend/             # FastAPI backend application
│   ├── api/            # API routes and endpoints
│   │   └── routes/
│   │       ├── analytics.py
│   │       ├── auth.py
│   │       ├── live_data.py
│   │       ├── live_feed.py      # NEW: Live delivery feed
│   │       ├── ml_models.py
│   │       ├── ml_monitoring.py
│   │       ├── ml_predictions.py
│   │       ├── ml_training.py
│   │       ├── predictions.py
│   │       └── stores.py
│   │
│   ├── core/           # Core functionality
│   │   ├── config.py
│   │   ├── logger.py
│   │   ├── metrics.py
│   │   ├── monitoring.py
│   │   ├── rate_limiter.py
│   │   ├── security.py
│   │   └── validation.py
│   │
│   ├── database/       # Database connection
│   │   ├── connection.py
│   │   └── models.py
│   │
│   ├── data_sources/   # Data source integrations
│   │   ├── kaggle_integration.py
│   │   ├── live_delivery_feed.py  # NEW: Live feed engine
│   │   ├── live_map_data.py
│   │   └── realtime_analytics.py
│   │
│   ├── external_apis/  # External API integrations
│   │   ├── distance_matrix.py
│   │   ├── google_geocoding.py
│   │   └── google_places.py
│   │
│   ├── ml/            # Machine learning system
│   │   ├── advanced_ml.py
│   │   ├── alert_manager.py
│   │   ├── baseline_models.py
│   │   ├── coverage_gap.py
│   │   ├── data_versioning.py
│   │   ├── evaluation_engine.py
│   │   ├── experiment_tracker.py
│   │   ├── explainability.py
│   │   ├── feature_pipeline.py
│   │   ├── mlflow_config.py
│   │   ├── mlflow_server.py
│   │   ├── model_loader.py
│   │   ├── model_registry.py
│   │   ├── performance_monitor.py
│   │   ├── prediction_service.py
│   │   ├── retraining_scheduler.py
│   │   ├── schemas.py
│   │   └── train_model.py
│   │
│   ├── pipelines/     # Data and ML pipelines
│   │   ├── data_pipeline.py
│   │   ├── mlflow_training_pipeline.py
│   │   ├── prediction_pipeline.py
│   │   └── training_pipeline.py
│   │
│   ├── scrapers/      # Web scrapers
│   │   └── blinkit_scraper.py
│   │
│   ├── scripts/       # Backend utility scripts
│   │   ├── collect_training_data.py
│   │   ├── deploy_init.py
│   │   └── init_mlflow_db.py
│   │
│   ├── security/      # Security and authentication
│   │   ├── auth.py
│   │   ├── encryption.py
│   │   └── input_validator.py
│   │
│   ├── utils/         # Utility functions
│   │   └── helpers.py
│   │
│   ├── app.py         # Main FastAPI application
│   └── requirements.txt
│
├── config/            # Configuration files
│   └── ml_config.yaml
│
├── database/          # Database models and scripts
│   ├── models/
│   │   └── models.py  # SQLAlchemy models (includes live feed tables)
│   │
│   ├── scripts/
│   │   ├── check_and_fix_db.py
│   │   ├── init_neon_db.py
│   │   ├── seed_data.py
│   │   └── seed_enhanced_data.py
│   │
│   ├── connection.py
│   ├── db_connect.py
│   └── requirements.txt
│
├── docs/              # Documentation
│   ├── DATABASE_SCHEMA.md
│   ├── EXECUTIVE_SUMMARY.md
│   ├── IMPLEMENTATION_CHECKLIST.md
│   ├── LIVE_FEED_STRATEGY.md
│   ├── PITCH_DECK_OUTLINE.md
│   ├── QUICK_START_DATABASE.md
│   └── QUICK_START_LIVE_FEED.md
│
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Navbar.css
│   │   │   ├── Sidebar.jsx
│   │   │   └── Sidebar.css
│   │   │
│   │   ├── pages/
│   │   │   ├── Analytics.jsx
│   │   │   ├── Analytics.css
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Dashboard.css
│   │   │   ├── LiveFeed.jsx      # NEW: Live feed dashboard
│   │   │   ├── LiveFeed.css
│   │   │   ├── LiveMap.jsx
│   │   │   ├── LiveMap.css
│   │   │   ├── Login.jsx
│   │   │   ├── Login.css
│   │   │   ├── Predictions.jsx
│   │   │   └── Predictions.css
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── nginx/             # Nginx configuration
│   ├── default.conf
│   └── nginx.conf
│
├── requirements/      # Python dependencies
│   ├── base.txt      # Core dependencies
│   ├── dev.txt       # Development dependencies
│   ├── ml.txt        # ML dependencies
│   └── prod.txt      # Production dependencies
│
├── scripts/           # Utility scripts
│   ├── run_migrations.sh
│   ├── run_migrations.bat
│   ├── setup_live_feed.sh
│   ├── setup_live_feed.bat
│   └── README.md
│
├── .dockerignore
├── .env.example       # Environment variables template
├── .gitattributes
├── .gitignore
├── .pre-commit-config.yaml
├── .secrets.baseline
├── alembic.ini
├── CHANGELOG.md       # Version history
├── CONTRIBUTING.md    # Contribution guidelines
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── LICENSE
├── PROJECT_STRUCTURE.md  # This file
└── README.md          # Main documentation
```

## 📦 Key Directories

### `/backend`
FastAPI backend application with API routes, ML models, and business logic.

**Key files:**
- `app.py` - Main application entry point
- `api/routes/` - API endpoint definitions
- `ml/` - Machine learning system
- `core/` - Core functionality (config, logging, security)

### `/frontend`
React frontend application with Vite build tool.

**Key files:**
- `src/App.jsx` - Root component
- `src/pages/` - Page components
- `src/components/` - Reusable components
- `src/services/api.js` - API client

### `/database`
Database models, migrations, and utility scripts.

**Key files:**
- `models/models.py` - SQLAlchemy ORM models
- `scripts/` - Database initialization and seeding

### `/alembic`
Database migration management with Alembic.

**Key files:**
- `versions/` - Migration scripts
- `env.py` - Alembic environment configuration

### `/docs`
Project documentation including guides, strategies, and API docs.

### `/scripts`
Utility scripts for setup, migrations, and maintenance.

### `/requirements`
Python dependency management split by environment.

## 🔑 Important Files

### Configuration
- `.env.example` - Environment variables template
- `alembic.ini` - Alembic configuration
- `config/ml_config.yaml` - ML system configuration
- `docker-compose.yml` - Docker services

### Documentation
- `README.md` - Main project documentation
- `CONTRIBUTING.md` - Contribution guidelines
- `CHANGELOG.md` - Version history
- `LICENSE` - MIT License

### CI/CD
- `.github/workflows/ci.yml` - Continuous Integration
- `.github/workflows/cd.yml` - Continuous Deployment
- `.pre-commit-config.yaml` - Pre-commit hooks

## 🚫 Ignored Files

The following are ignored by Git (see `.gitignore`):

- `__pycache__/` - Python bytecode
- `node_modules/` - Node.js dependencies
- `.env` - Environment variables (sensitive)
- `venv/` - Python virtual environment
- `*.log` - Log files
- `mlruns/` - MLflow artifacts
- `models/` - Trained models
- `data/` - Large datasets

## 📝 File Naming Conventions

### Python
- **Modules**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions**: `snake_case()`
- **Constants**: `UPPER_SNAKE_CASE`

### JavaScript/React
- **Components**: `PascalCase.jsx`
- **Utilities**: `camelCase.js`
- **Styles**: `PascalCase.css` (matching component)

### SQL
- **Tables**: `snake_case`
- **Columns**: `snake_case`
- **Indexes**: `idx_table_column`

### Documentation
- **Guides**: `UPPER_SNAKE_CASE.md`
- **Technical**: `snake_case.md`

## 🔄 Data Flow

```
User Request
    ↓
Frontend (React)
    ↓
API Routes (FastAPI)
    ↓
Business Logic
    ↓
Database (PostgreSQL)
    ↓
Response
```

## 🧪 Testing Structure

```
backend/tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── fixtures/       # Test fixtures

frontend/src/
└── __tests__/      # Frontend tests
```

## 📊 Database Schema

See [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for detailed schema documentation.

**Key tables:**
- `dark_stores` - Store locations
- `pincode_coverage` - Coverage analysis
- `orders_synthetic` - Order data
- `live_delivery_events` - Real-time deliveries (NEW)
- `platform_availability` - Platform status (NEW)
- `daily_market_reports` - Daily briefings (NEW)

## 🚀 Deployment Structure

```
Production
├── Backend (Railway/Render)
├── Frontend (Vercel)
├── Database (Neon PostgreSQL)
├── Redis (Upstash)
└── MLflow (Self-hosted)
```

## 📚 Related Documentation

- [README.md](README.md) - Getting started
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [docs/](docs/) - Detailed guides

---

**Last Updated**: May 10, 2026  
**Version**: 2.0.0
