# 🏪 Darkstori - Quick Commerce Intelligence Platform

> AI-powered analytics platform for dark store optimization, coverage gap analysis, and demand forecasting in India's quick commerce market.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents
- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
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

---

## ✨ Key Features

### 1. 🗺️ Geospatial Intelligence
- Interactive map visualization with 4,400+ dark store locations
- Heat maps showing demand density and coverage gaps
- PIN code-level analysis with demographic overlays
- Distance matrix calculations for delivery optimization

### 2. 🤖 Machine Learning Analytics
- **Demand Forecasting**: 90-day predictions with 85%+ accuracy
- **Coverage Gap Analysis**: Identify underserved markets
- **Clustering Algorithms**: DBSCAN for opportunity zone detection
- **Feature Engineering**: 20+ features including demographics, competition, seasonality

### 3. 📊 Business Intelligence Dashboard
- Real-time KPI tracking (coverage %, demand trends, ROI)
- Platform comparison (Blinkit vs Zepto vs Swiggy Instamart)
- Predictive insights for inventory and capacity planning
- Export capabilities for reports and presentations

### 4. 🔒 Enterprise-Grade Security
- JWT-based authentication and authorization
- Rate limiting (60 requests/minute per user)
- Input validation and SQL injection protection
- Encrypted data storage and transmission

### 5. 🚀 High Performance
- Sub-200ms average API response time
- Redis caching for frequently accessed data
- Async operations for concurrent request handling
- Database connection pooling for scalability

---

## 📁 Project Structure

```
darkstori/
│
├── backend/                    # FastAPI Backend Application
│   ├── api/                   # API Routes & Endpoints
│   │   ├── routes/           # Route handlers (stores, analytics, predictions)
│   │   └── __init__.py
│   │
│   ├── core/                  # Core Functionality
│   │   ├── config.py         # Configuration management
│   │   ├── logger.py         # Logging setup
│   │   ├── monitoring.py     # Prometheus metrics
│   │   ├── rate_limiter.py   # Rate limiting
│   │   ├── security.py       # Security utilities
│   │   └── validation.py     # Input validation
│   │
│   ├── ml/                    # Machine Learning Models
│   │   ├── advanced_ml.py    # ML model training & prediction
│   │   ├── coverage_gap.py   # Coverage analysis algorithms
│   │   └── train_model.py    # Model training scripts
│   │
│   ├── pipelines/             # Data & ML Pipelines
│   │   ├── data_pipeline.py      # Data processing pipeline
│   │   ├── training_pipeline.py  # ML training pipeline
│   │   └── prediction_pipeline.py # Prediction pipeline
│   │
│   ├── security/              # Security & Authentication
│   │   ├── auth.py           # JWT authentication
│   │   ├── encryption.py     # Data encryption
│   │   ├── input_validator.py # Input sanitization
│   │   └── rate_limiter.py   # Rate limiting logic
│   │
│   ├── external_apis/         # External API Integrations
│   │   ├── google_places.py  # Google Places API
│   │   ├── google_geocoding.py # Geocoding API
│   │   └── distance_matrix.py # Distance Matrix API
│   │
│   ├── data_sources/          # Data Source Integrations
│   │   ├── kaggle_integration.py # Kaggle datasets
│   │   ├── live_map_data.py     # Real-time map data
│   │   └── realtime_analytics.py # Live analytics
│   │
│   ├── scrapers/              # Web Scrapers
│   │   └── blinkit_scraper.py # Blinkit data scraper
│   │
│   ├── scripts/               # Utility Scripts
│   │   └── collect_training_data.py # Data collection
│   │
│   ├── utils/                 # Utility Functions
│   │   ├── config.py         # Config helpers
│   │   └── helpers.py        # General utilities
│   │
│   ├── app.py                 # Main FastAPI application
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # React Frontend Application
│   ├── src/
│   │   ├── components/       # Reusable UI Components
│   │   │   ├── Navbar.jsx   # Navigation bar
│   │   │   └── Sidebar.jsx  # Sidebar navigation
│   │   │
│   │   ├── pages/            # Page Components
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   ├── Analytics.jsx    # Analytics page
│   │   │   ├── Predictions.jsx  # Predictions page
│   │   │   ├── LiveMap.jsx      # Live map view
│   │   │   └── Login.jsx        # Authentication
│   │   │
│   │   ├── services/         # API Services
│   │   │   └── api.js       # API client
│   │   │
│   │   ├── App.jsx           # Root component
│   │   └── main.jsx          # Entry point
│   │
│   ├── index.html            # HTML template
│   ├── package.json          # Node dependencies
│   └── vite.config.js        # Vite configuration
│
├── database/                   # Database Layer
│   ├── models/               # Database Models
│   │   ├── models.py        # Core SQLAlchemy models
│   │   ├── enhanced_models.py # Extended models
│   │   └── backend_models.py  # Backend-specific models
│   │
│   ├── scripts/              # Database Scripts
│   │   ├── init_neon_db.py  # Database initialization
│   │   ├── seed_data.py     # Data seeding
│   │   └── seed_enhanced_data.py # Enhanced data seeding
│   │
│   ├── connection.py         # Database connection
│   ├── db_connect.py         # Connection utilities
│   ├── test_connection.py    # Connection testing
│   └── requirements.txt      # Database dependencies
│
├── .env.example               # Environment variables template
├── .gitignore                # Git ignore rules
├── LICENSE                   # MIT License
└── README.md                 # This file
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
| **Prometheus** | Metrics & monitoring | Latest |

### Machine Learning
| Technology | Purpose |
|------------|---------|
| **Scikit-learn** | ML model training |
| **XGBoost** | Gradient boosting |
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
Training Data → Model Training → Model Evaluation → Model Deployment
      ↓              ↓                 ↓                  ↓
  Features      XGBoost          Cross-Val          Joblib
  Labels        Random Forest    Metrics            Serialization
  Split         Gradient Boost   Tuning             API Integration
```

### 4. Prediction Pipeline
```
User Request → Feature Prep → Model Inference → Post-Processing → Response
     ↓             ↓               ↓                  ↓              ↓
  API Call    Normalization   Ensemble Pred      Formatting      JSON
  Validation  Scaling         Confidence         Insights        Cache
```

### 5. API Request Flow
```
Client Request → Authentication → Rate Limiting → Business Logic → Database Query → Response
      ↓              ↓                ↓                ↓                ↓            ↓
   Frontend      JWT Verify      60 req/min      Controllers      SQLAlchemy    JSON
   Mobile App    Token Check     Redis Cache     Services         Queries       Cache
```

### 6. Frontend Data Flow
```
User Action → API Call → State Update → UI Re-render → User Feedback
     ↓           ↓            ↓             ↓              ↓
  Click       Axios      Zustand       React          Toast
  Input       Query      Context       Components     Notification
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
pip install -r requirements.txt

# Set up environment variables
cp ../.env.example ../.env
# Edit .env with your credentials

# Run database migrations
cd ../database
python scripts/init_neon_db.py

# Start backend server
cd ../backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

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

# Initialize database
python scripts/init_neon_db.py

# Seed data (optional)
python scripts/seed_data.py
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname
NEON_DATABASE_URL=your_neon_connection_string

# API Keys
GOOGLE_MAPS_API_KEY=your_google_maps_key
GOOGLE_PLACES_API_KEY=your_places_key

# Security
JWT_SECRET_KEY=your_secret_key_here
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

### Demand Prediction
```http
POST /api/predictions/demand
Authorization: Bearer <token>
Content-Type: application/json

{
  "pincode": "110001",
  "days": 90
}
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
# Backend tests
cd backend
pytest tests/ -v --cov

# Frontend tests
cd frontend
npm run test

# Linting
cd backend
black . && flake8 .

cd frontend
npm run lint
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

- [ ] Mobile app (React Native)
- [ ] Real-time notifications
- [ ] Advanced ML models (Deep Learning)
- [ ] Multi-city expansion analysis
- [ ] Integration with more platforms
- [ ] Automated report generation
- [ ] WhatsApp/Telegram bot integration

---

**⭐ If you find this project useful, please consider giving it a star!**

---

*Built with ❤️ for India's quick commerce revolution*
