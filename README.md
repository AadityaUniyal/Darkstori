# 🏪 Darkstori - Quick Commerce Intelligence Platform

> AI-powered analytics platform for dark store optimization, coverage gap analysis, and demand forecasting in India's quick commerce market.

[![CI](https://github.com/AadityaUniyal/Darkstori/actions/workflows/ci.yml/badge.svg)](https://github.com/AadityaUniyal/Darkstori/actions/workflows/ci.yml)
[![CD](https://github.com/AadityaUniyal/Darkstori/actions/workflows/cd.yml/badge.svg)](https://github.com/AadityaUniyal/Darkstori/actions/workflows/cd.yml)
[![codecov](https://codecov.io/gh/AadityaUniyal/Darkstori/branch/main/graph/badge.svg)](https://codecov.io/gh/AadityaUniyal/Darkstori)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<!-- 
🚀 **Live Demo**: [Coming Soon]
-->
📖 **Documentation**: 
- [API Docs](http://localhost:8000/api/docs) 
- [Database Setup](docs/QUICK_START_DATABASE.md)
- [Live Feed Strategy](docs/LIVE_FEED_STRATEGY.md)
- [Live Feed Quick Start](docs/QUICK_START_LIVE_FEED.md)
- [Executive Summary](docs/EXECUTIVE_SUMMARY.md)
- [Pitch Deck](docs/PITCH_DECK_OUTLINE.md)

---

## 📋 Table of Contents
- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [🆕 Live Delivery Feed](#-live-delivery-feed-new)
- [Key Features](#-key-features)
- [Target Audience](#-target-audience)
- [Project Structure](#-project-structure)
- [Tech Stack](#️-tech-stack)
- [Workflow Overview](#-workflow-overview)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)

---

## 🎯 Problem Statement

India's quick commerce market is experiencing explosive growth, but faces critical challenges:

### The Challenge
- **Market Fragmentation**: 4,400+ dark stores scattered across India with no centralized intelligence
- **Coverage Gaps**: 78% of PIN codes remain unserved, representing massive untapped potential
- **Inefficient Expansion**: Companies lack data-driven insights for strategic dark store placement
- **Demand Uncertainty**: No reliable forecasting for inventory and capacity planning
- **Competitive Blindness**: Limited visibility into competitor strategies and market dynamics

### The Impact
- Lost revenue opportunities in underserved markets
- Inefficient capital allocation in dark store expansion
- Poor inventory management leading to waste
- Inability to predict and respond to demand spikes
- Lack of competitive intelligence for strategic planning

---

## 💡 Our Solution

**Darkstori** is an enterprise-grade intelligence platform that transforms quick commerce operations through:

### 🎯 Intelligent Coverage Analysis
- **Real-time mapping** of 4,400+ dark stores across India
- **Gap identification** in 300+ underserved PIN codes
- **Coverage scoring** algorithm to quantify market penetration
- **Geospatial clustering** to identify optimal expansion zones

### 📊 AI-Powered Demand Forecasting
- **Machine Learning models** (XGBoost, Random Forest, Gradient Boosting) for 90-day demand prediction
- **Time-series analysis** using Prophet for seasonal pattern detection
- **Multi-factor forecasting** incorporating demographics, competition, and historical data
- **Accuracy metrics** with 85%+ prediction reliability

### 🗺️ Strategic Expansion Planning
- **Opportunity zone identification** using DBSCAN clustering
- **ROI-based prioritization** for new dark store locations
- **Competitive analysis** across platforms (Blinkit, Zepto, Swiggy Instamart)
- **Market saturation indicators** to prevent over-expansion

### 📈 Real-Time Business Intelligence
- **Live dashboards** with interactive visualizations
- **Performance metrics** tracking across all stores
- **Predictive analytics** for inventory optimization
- **Automated reporting** for stakeholder updates

### 📡 Live Delivery Feed (NEW!)
- **Real-time delivery tracking** across all platforms
- **Platform availability monitoring** for 300+ PIN codes
- **Delivery time estimation** with traffic & demand factors
- **Daily intelligence briefings** with actionable insights
- **Social sentiment monitoring** for customer satisfaction
- **Competitive intelligence** dashboard with market share tracking
- **Crowdsourced data collection** for enhanced accuracy

---

## ✨ Key Features

### 1. 🗺️ Geospatial Intelligence
- Interactive map visualization with 4,400+ dark store locations
- Heat maps showing demand density and coverage gaps
- PIN code-level analysis with demographic overlays
- Distance matrix calculations for delivery optimization

### 2. 🤖 Machine Learning & MLflow Integration
- **MLflow Experiment Tracking**: Complete experiment lifecycle management
- **Model Registry**: Version control and stage transitions (Staging → Production → Archived)
- **Demand Forecasting**: 90-day predictions with 85%+ accuracy using ensemble models
- **Model Explainability**: SHAP values and feature importance for interpretability
- **Automated Retraining**: Scheduled retraining with performance monitoring
- **Baseline Benchmarking**: Compare models against simple baselines
- **Data Versioning**: Track dataset versions with integrity verification
- **Performance Monitoring**: Real-time drift detection and degradation alerts
- **Batch Predictions**: Process large datasets efficiently with chunking

### 3. 📊 Business Intelligence Dashboard
- Real-time KPI tracking (coverage %, demand trends, ROI)
- Platform comparison (Blinkit vs Zepto vs Swiggy Instamart)
- Predictive insights for inventory and capacity planning
- Export capabilities for reports and presentations
- MLflow UI integration for model monitoring

### 4. 🔒 Enterprise-Grade Security
- JWT-based authentication and authorization
- Admin-only access for model transitions
- Rate limiting (60 requests/minute per user)
- Input validation and SQL injection protection
- Encrypted data storage and transmission

### 5. 🚀 High Performance & Observability
- Sub-100ms prediction latency
- Redis caching for frequently accessed data
- Async operations for concurrent request handling
- Database connection pooling for scalability
- Prometheus metrics for monitoring
- Enhanced health checks for all components

---

## 📁 Project Structure

```
darkstori/
│
├── .github/                   # GitHub Actions CI/CD
│   └── workflows/            # Workflow definitions
│
├── .kiro/                     # Kiro AI configuration
│   └── specs/                # Project specifications
│
├── alembic/                   # Database Migrations
│   ├── versions/             # Migration scripts
│   │   └── 001_add_ml_tracking_tables.py
│   └── env.py               # Alembic environment
│
├── backend/                   # FastAPI Backend Application
│   ├── api/                  # API Routes & Endpoints
│   │   ├── routes/          # Route handlers
│   │   │   ├── stores.py   # Store management
│   │   │   ├── analytics.py # Analytics endpoints
│   │   │   ├── predictions.py # Legacy predictions
│   │   │   ├── ml_predictions.py # ML predictions
│   │   │   ├── ml_models.py # Model management
│   │   │   ├── ml_monitoring.py # Performance monitoring
│   │   │   └── ml_training.py # Training jobs
│   │   └── __init__.py
│   │
│   ├── core/                 # Core Functionality
│   │   ├── config.py        # Configuration management
│   │   ├── logger.py        # Logging setup
│   │   ├── metrics.py       # Prometheus metrics
│   │   ├── monitoring.py    # System monitoring
│   │   ├── rate_limiter.py  # Rate limiting
│   │   ├── security.py      # Security utilities
│   │   └── validation.py    # Input validation
│   │
│   ├── database/             # Database Connection
│   │   ├── connection.py    # Async connection manager
│   │   └── models.py        # ML tracking models
│   │
│   ├── ml/                   # Machine Learning System
│   │   ├── mlflow_config.py # MLflow configuration
│   │   ├── mlflow_server.py # MLflow server manager
│   │   ├── experiment_tracker.py # Experiment tracking
│   │   ├── model_registry.py # Model registry wrapper
│   │   ├── model_loader.py  # Model loading & caching
│   │   ├── evaluation_engine.py # Model evaluation
│   │   ├── feature_pipeline.py # Feature engineering
│   │   ├── prediction_service.py # Prediction service
│   │   ├── performance_monitor.py # Performance tracking
│   │   ├── alert_manager.py # Alert system
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── explainability.py # Model explainability
│   │   ├── baseline_models.py # Baseline benchmarking
│   │   ├── data_versioning.py # Data versioning
│   │   ├── retraining_scheduler.py # Auto retraining
│   │   ├── advanced_ml.py   # Advanced ML models
│   │   ├── coverage_gap.py  # Coverage analysis
│   │   └── train_model.py   # Training script
│   │
│   ├── pipelines/            # Data & ML Pipelines
│   │   ├── data_pipeline.py # Data processing
│   │   ├── training_pipeline.py # Legacy training
│   │   ├── mlflow_training_pipeline.py # MLflow training
│   │   └── prediction_pipeline.py # Prediction pipeline
│   │
│   ├── security/             # Security & Authentication
│   │   ├── auth.py          # JWT authentication
│   │   ├── encryption.py    # Data encryption
│   │   └── input_validator.py # Input sanitization
│   │
│   ├── external_apis/        # External API Integrations
│   │   ├── google_places.py # Google Places API
│   │   ├── google_geocoding.py # Geocoding API
│   │   └── distance_matrix.py # Distance Matrix API
│   │
│   ├── data_sources/         # Data Source Integrations
│   │   ├── kaggle_integration.py # Kaggle datasets
│   │   ├── live_map_data.py # Real-time map data
│   │   └── realtime_analytics.py # Live analytics
│   │
│   ├── scrapers/             # Web Scrapers
│   │   └── blinkit_scraper.py # Blinkit data scraper
│   │
│   ├── scripts/              # Utility Scripts
│   │   ├── collect_training_data.py # Data collection
│   │   ├── init_mlflow_db.py # MLflow initialization
│   │   └── deploy_init.py   # Deployment setup
│   │
│   ├── utils/                # Utility Functions
│   │   └── helpers.py       # General utilities
│   │
│   ├── app.py                # Main FastAPI application
│   └── requirements.txt      # Python dependencies
│
├── config/                    # Configuration Files
│   └── ml_config.yaml        # ML system configuration
│
├── database/                  # Database Models
│   ├── models/               # SQLAlchemy Models
│   │   └── models.py        # All database models
│   │
│   ├── scripts/              # Database Scripts
│   │   ├── init_neon_db.py  # Database initialization
│   │   ├── seed_data.py     # Data seeding
│   │   └── seed_enhanced_data.py # Enhanced data seeding
│   │
│   ├── connection.py         # Legacy connection (deprecated)
│   ├── db_connect.py         # Connection utilities
│   └── requirements.txt      # Database dependencies
│
├── frontend/                  # React Frontend Application
│   ├── src/
│   │   ├── components/      # Reusable UI Components
│   │   │   ├── Navbar.jsx  # Navigation bar
│   │   │   └── Sidebar.jsx # Sidebar navigation
│   │   │
│   │   ├── pages/           # Page Components
│   │   │   ├── Dashboard.jsx   # Main dashboard
│   │   │   ├── Analytics.jsx   # Analytics page
│   │   │   ├── Predictions.jsx # Predictions page
│   │   │   ├── LiveMap.jsx     # Live map view
│   │   │   └── Login.jsx       # Authentication
│   │   │
│   │   ├── services/        # API Services
│   │   │   └── api.js      # API client
│   │   │
│   │   ├── App.jsx          # Root component
│   │   └── main.jsx         # Entry point
│   │
│   ├── index.html           # HTML template
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite configuration
│
├── nginx/                     # Nginx Configuration
│   ├── default.conf          # Default site config
│   └── nginx.conf            # Main nginx config
│
├── requirements/              # Python Requirements
│   ├── base.txt              # Base dependencies
│   ├── dev.txt               # Development dependencies
│   ├── ml.txt                # ML dependencies
│   └── prod.txt              # Production dependencies
│
├── .dockerignore             # Docker ignore rules
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── .pre-commit-config.yaml   # Pre-commit hooks
├── alembic.ini               # Alembic configuration
├── docker-compose.yml        # Docker Compose config
├── docker-compose.prod.yml   # Production Docker config
├── Dockerfile.backend        # Backend Docker image
├── Dockerfile.frontend       # Frontend Docker image
├── LICENSE                   # MIT License
└── README.md                 # This file

# Runtime Directories (Created Automatically)
├── data/                     # Data storage (gitignored)
│   ├── raw/                 # Raw data files
│   ├── processed/           # Processed data
│   └── external/            # External datasets
│
├── logs/                     # Application logs (gitignored)
├── mlruns/                   # MLflow artifacts (gitignored)
├── models/                   # Trained models (gitignored)
└── data_versions/            # Data versions (gitignored)
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| **FastAPI** | High-performance web framework | 0.109+ |
| **SQLAlchemy** | ORM for database operations | 2.0+ |
| **PostgreSQL/Neon** | Primary database | 15+ |
| **Redis** | Caching layer | 7+ |
| **Celery** | Async task queue | 5.3+ |
| **MLflow** | ML lifecycle management | 2.9+ |
| **Prometheus** | Metrics & monitoring | Latest |

### Machine Learning
| Technology | Purpose |
|------------|---------|
| **MLflow** | Experiment tracking & model registry |
| **Scikit-learn** | ML model training |
| **XGBoost** | Gradient boosting |
| **SHAP** | Model explainability |
| **Pandas** | Data manipulation |
| **NumPy** | Numerical computing |
| **Joblib** | Model serialization |

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI framework | 18.2+ |
| **Vite** | Build tool | 5.0+ |
| **React Router** | Routing | 6.21+ |
| **Axios** | HTTP client | 1.6+ |
| **React Query** | Data fetching | 5.14+ |
| **Recharts** | Data visualization | 2.10+ |
| **Leaflet** | Interactive maps | 1.9+ |
| **Framer Motion** | Animations | 10.16+ |
| **Zustand** | State management | 4.4+ |

### DevOps & Infrastructure
- **Docker** & **Docker Compose** for containerization
- **GitHub Actions** for CI/CD
- **Nginx** as reverse proxy
- **Prometheus** & **Grafana** for monitoring

---

## 🔄 Workflow Overview

### 1. Data Collection Pipeline
```
External APIs → Web Scrapers → Raw Data Storage
     ↓              ↓                ↓
Google Places   Blinkit      Kaggle Datasets
Distance API    Scraper      Order Data
Geocoding API                PIN Codes
```

### 2. Data Processing Pipeline
```
Raw Data → Cleaning → Feature Engineering → Database Storage
    ↓         ↓              ↓                    ↓
Validation  Dedup    Demographics         PostgreSQL
Formatting  Merge    Competition          (Neon DB)
            Filter   Seasonality
```

### 3. Machine Learning Pipeline
```
Training Data → MLflow Tracking → Model Training → Evaluation → Model Registry
      ↓              ↓                 ↓              ↓              ↓
  Features      Experiment        XGBoost        Metrics      Version Control
  Labels        Logging           Random Forest  SHAP         Stage Transition
  Split         Parameters        Gradient Boost Baselines    Production Deploy
                Artifacts         Ensemble       Validation   Auto-Archive
```

### 4. Prediction Pipeline
```
User Request → Model Loading → Feature Prep → Inference → Monitoring → Response
     ↓             ↓               ↓             ↓            ↓           ↓
  API Call    Cache Check    Normalization  Ensemble    Log Metrics   JSON
  Validation  Registry       Scaling        Prediction  Drift Check   Cache
  Auth        Version        Engineering    Confidence  Performance   Format
```

### 5. MLflow Workflow
```
Experiment → Run Tracking → Model Registry → Deployment → Monitoring
     ↓            ↓               ↓              ↓            ↓
  Create      Log Params      Register       Load Model   Performance
  Configure   Log Metrics     Version        Cache        Drift Detection
  Tag         Log Artifacts   Transition     Serve        Alerts
              Log Model       Promote        Predict      Retraining
```

### 5. API Request Flow
```
Client Request → Authentication → Rate Limiting → Business Logic → Database Query → Response
      ↓              ↓                ↓                ↓                ↓            ↓
   Frontend      JWT Verify      60 req/min      Controllers      SQLAlchemy    JSON
   Mobile App    Token Check     Redis Cache     Services         Queries       Cache
   MLflow UI     Admin Role      Prometheus      ML Pipeline      Async         Metrics
```

### 6. Frontend Data Flow
```
User Action → API Call → State Update → UI Re-render → User Feedback
     ↓           ↓            ↓             ↓              ↓
  Click       Axios      Zustand       React          Toast
  Input       Query      Context       Components     Notification
  Navigate    Cache      Redux         Charts         Loading
```

### 7. Monitoring & Observability
```
Application → Metrics Collection → Prometheus → Grafana → Alerts
     ↓              ↓                    ↓           ↓         ↓
  Predictions   Counters           Time Series   Dashboard  Email
  Training      Histograms         Storage       Queries    Slack
  Errors        Gauges             Scraping      Viz        PagerDuty
  Performance   Custom Metrics     Retention     Analysis   Webhooks
```

---

## 🚀 Getting Started

### Prerequisites
- **Python** 3.11 or higher
- **Node.js** 18 or higher
- **PostgreSQL** 15+ (or Neon DB account)
- **Redis** 7+ (optional, for caching)
- **Git** for version control

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/AadityaUniyal/Darkstori.git
cd Darkstori
```

#### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements/base.txt
pip install -r requirements/ml.txt
pip install -r requirements/prod.txt

# Set up environment variables
cp ../.env.example ../.env
# Edit .env with your credentials

# Check and fix database schema (IMPORTANT!)
cd ..
python database/scripts/check_and_fix_db.py

# Run database migrations
alembic upgrade head

# Initialize MLflow database
python backend/scripts/init_mlflow_db.py

# Start backend server
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at http://localhost:8000
MLflow UI will be available at http://localhost:5000

#### 3. Frontend Setup
```bash
# Open new terminal
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 4. Database Setup
```bash
# Open new terminal
cd database

# Install dependencies
pip install -r requirements.txt

# Check database schema (automated)
python scripts/check_and_fix_db.py

# Seed data (optional)
python scripts/seed_data.py
```

**📚 Database Documentation:**
- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete table documentation
- [Quick Start Guide](docs/QUICK_START_DATABASE.md) - Setup and usage guide
- [Fix Summary](DATABASE_FIX_SUMMARY.md) - Recent database updates

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname
NEON_DATABASE_URL=your_neon_connection_string

# MLflow
MLFLOW_TRACKING_URI=http://localhost:5000
MLFLOW_BACKEND_STORE_URI=postgresql://user:password@host:port/dbname
MLFLOW_ARTIFACT_ROOT=./mlruns
MLFLOW_ENABLE_TRACKING=true

# API Keys
GOOGLE_MAPS_API_KEY=your_google_maps_key
GOOGLE_PLACES_API_KEY=your_places_key

# Security
JWT_SECRET_KEY=your_secret_key_here_min_32_chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Backend
HOST=0.0.0.0
PORT=8000
DEBUG=True
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Frontend
VITE_API_URL=http://localhost:8000
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React dashboard |
| **Backend API** | http://localhost:8000 | FastAPI backend |
| **API Docs** | http://localhost:8000/api/docs | Swagger UI |
| **MLflow UI** | http://localhost:5000 | MLflow tracking server |
| **Metrics** | http://localhost:8000/metrics | Prometheus metrics |
| **Health Check** | http://localhost:8000/health | System status |

---

## 📚 API Documentation

### Authentication
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}
```

### ML Predictions
```http
POST /api/v1/ml/predict
Authorization: Bearer <token>
Content-Type: application/json

{
  "pincode": "110001",
  "order_date": "2026-05-10",
  "population": 150000,
  "coverage_score": 2,
  "city_tier": "Metro",
  "city": "Delhi",
  "state": "Delhi"
}
```

### Batch Predictions
```http
POST /api/v1/ml/predict/batch
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: predictions.csv
```

### Model Information
```http
GET /api/v1/ml/model/info?model_name=demand_forecasting_model&stage=Production
Authorization: Bearer <token>
```

### Model Transition (Admin Only)
```http
POST /api/v1/ml/model/transition
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "model_name": "demand_forecasting_model",
  "version": "3",
  "stage": "Production",
  "archive_existing": true
}
```

### Performance Monitoring
```http
GET /api/v1/ml/performance?model_name=demand_forecasting_model&window_days=30
Authorization: Bearer <token>
```

### Drift Detection
```http
GET /api/v1/ml/drift?model_name=demand_forecasting_model
Authorization: Bearer <token>
```

### Training Job
```http
POST /api/v1/ml/train
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "model_types": ["random_forest", "xgboost", "gradient_boosting"],
  "experiment_name": "demand_forecasting"
}
```

### Get Stores
```http
GET /api/stores?limit=100&offset=0
Authorization: Bearer <token>
```

### Coverage Analysis
```http
GET /api/analytics/coverage?pincode=110001
Authorization: Bearer <token>
```

### Opportunity Zones
```http
GET /api/analytics/opportunity-zones?min_score=0.7
Authorization: Bearer <token>
```

**Full API documentation available at:** http://localhost:8000/api/docs

---

## 🧪 Testing

```bash
# Run database migrations
alembic upgrade head

# Initialize MLflow
python backend/scripts/init_mlflow_db.py

# Train initial model
python backend/ml/train_model.py

# Start services
docker-compose up -d

# Check health
curl http://localhost:8000/health

# View MLflow UI
open http://localhost:5000

# View API docs
open http://localhost:8000/api/docs
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Coding Standards
- Follow PEP 8 for Python code
- Use ESLint configuration for JavaScript/React
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

**Aaditya Uniyal**
- Email: aaditya.uniyal22@gmail.com
- GitHub: [@AadityaUniyal](https://github.com/AadityaUniyal)

---

## 🙏 Acknowledgments

- **Google Maps Platform** for geospatial APIs
- **Kaggle** for quick commerce datasets
- **Neon** for serverless PostgreSQL
- **FastAPI** community for excellent documentation
- **React** ecosystem for powerful frontend tools

---

## 📞 Support

For support, email aaditya.uniyal22@gmail.com or open an issue on GitHub.

---

## 🗺️ Roadmap

### Completed ✅
- [x] Core API with FastAPI
- [x] Database integration with PostgreSQL/Neon
- [x] MLflow experiment tracking and model registry
- [x] Automated model retraining
- [x] Performance monitoring and drift detection
- [x] Model explainability with SHAP
- [x] Baseline benchmarking
- [x] Data versioning and lineage tracking
- [x] Prometheus metrics and observability
- [x] Docker containerization
- [x] Admin authentication for model management

### In Progress 🚧
- [ ] Frontend dashboard enhancements
- [ ] Real-time notifications
- [ ] Advanced visualization charts

### Planned 📋
- [ ] Live delivery feed with real-time tracking
- [ ] Daily intelligence briefings (email/WhatsApp)
- [ ] Crowdsourced data collection app
- [ ] Social media sentiment analysis
- [ ] Mobile app (React Native)
- [ ] Deep Learning models (LSTM, Transformers)
- [ ] Multi-city expansion analysis
- [ ] Integration with more platforms (Dunzo, BigBasket)
- [ ] Automated report generation (PDF/Excel)
- [ ] WhatsApp/Telegram bot integration
- [ ] A/B testing framework
- [ ] Multi-language support

---

## 🎯 Target Audience

### **Primary Customers (B2B)**

#### Quick Commerce Companies 💰
- **Who**: Blinkit, Zepto, Swiggy Instamart, Dunzo, BigBasket
- **Value**: Real-time competitive intelligence, expansion planning, demand forecasting
- **Pricing**: ₹2-5 Lakhs/month

#### Dark Store Operators 💼
- **Who**: Individual store managers, franchise owners
- **Value**: Daily performance metrics, local demand predictions, inventory optimization
- **Pricing**: ₹5,000-15,000/month

#### Investors & VCs 📊
- **Who**: Investment firms tracking quick commerce sector
- **Value**: Market intelligence, growth trends, platform comparison
- **Pricing**: ₹50,000-2 Lakhs/month

#### FMCG Brands 🏭
- **Who**: Brands selling through quick commerce
- **Value**: Product performance tracking, demand forecasting, pricing intelligence
- **Pricing**: ₹25,000-1 Lakh/month

### **Market Opportunity**
- **Total Addressable Market**: ₹60-216 Cr/year
- **Target**: 4,400+ dark stores, 6-8 major platforms, 100+ brands
- **Unique Value**: Daily intelligence briefings + Real-time competitive insights

---

**⭐ If you find this project useful, please consider giving it a star!**

---

*Built with ❤️ for India's quick commerce revolution*
