# 🏪 Darkstori: Hyperlocal Quick Commerce Intelligence Platform

![CI Pipeline](https://github.com/AadityaUniyal/Darkstori/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)
![React](https://img.shields.io/badge/react-18.2-61dafb.svg?logo=react)
![FastAPI](https://img.shields.io/badge/fastapi-0.109-009688.svg?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/postgresql-15+-336791.svg?logo=postgresql)

Darkstori is an enterprise-grade quick-commerce analytics and prescriptive optimization platform. Built for the high-stakes, sub-10-minute delivery market, it bridges the gap between raw data collection and operational execution. It empowers store operators, regional managers, and B2B enterprises to map competitive landscapes, forecast demand, and automate inventory decisions across major Indian focus metros (Bangalore, Delhi, Mumbai, Hyderabad, and Pune).

---

## 🎯 The Core Problem & The Prescriptive Solution

### The Problem: Descriptive Analytics Are Too Slow
Quick commerce operates on wafer-thin margins and intense local competition. Traditional BI dashboards are strictly *descriptive*—they look backward to show historical performance. If a competitor opens a store 500 meters away, or if 50 kg of fresh tomatoes are two days away from spoiling, descriptive analytics cannot tell an operator exactly what to do *right now* to salvage revenue or defend market share.

### The Solution: Prescriptive Intelligence
Darkstori is *prescriptive*. It utilizes machine learning models and spatial algorithms to actively recommend operational decisions in real-time:
* **Minimize Waste (Sigmoid Decay Markdown):** Automatically schedule dynamic markdown pricing on perishables. Instead of a flat discount, the system simulates decay and runs a revenue-maximization curve to find the perfect discount rate over time.
* **Optimize Placement (Spatial Clustering):** Identify "Greenfield" locations (high population density, low competitor coverage) using in-database PostGIS spatial clustering (`ST_ClusterDBSCAN`).
* **Forecast Accurately (XGBoost):** Predict tomorrow's load using advanced ML models to ensure staff are scheduled efficiently. This is rigorously verified by walk-forward backtesting to prevent data leakage.
* **Serviceability Constraints (OSRM Routing):** Penalize sales projection models based on actual driving road-network distances (via OSRM APIs) rather than naive straight-line coordinates.
* **Prevent Stockouts (ABC Analysis):** Dynamically adjust safety stock levels and Reorder Points (ROP) per neighborhood, incorporating localized delivery SLA constraints.

---

## 🏗️ Deep Dive: Architecture & Engineering

### 1. Real-Time Event-Driven Architecture (Zero-Polling)
To provide a true "live" dashboard, we eliminated heavy frontend REST polling.
* **The Trigger:** PostgreSQL triggers (`pg_notify`) are attached to critical tables (`orders_synthetic`, `dark_stores`, `competitor_stores`). The moment a row is inserted or updated, the database engine emits a JSON payload to a dedicated channel (`darkstori_events`).
* **The Broker:** A background FastAPI task utilizes `asyncpg` to continuously `LISTEN` to this channel. When a payload arrives, it broadcasts the event via `Socket.IO` to all connected clients.
* **The UI Reaction:** The React frontend (`LiveSocketListener.jsx`) catches these WebSocket events, dispatches native browser `CustomEvent`s, and triggers `@tanstack/react-query` to surgically invalidate specific cache keys (e.g., `['dashboard-metrics']`). This results in an instant UI update and a non-blocking `sonner` toast notification—all without overwhelming the database with polling queries.

### 2. Hardware-Accelerated Geospatial Mapping (WebGL)
Because mapping is the core of location intelligence, we replaced primitive HTML5 canvas abstractions with an enterprise mapping stack used by top-tier SaaS products:
* **MapLibre GL JS & OpenFreeMap:** The base layer renders 60fps, 3D-tiltable dark-mode vector street tiles. OpenFreeMap provides gorgeous, API-key-free vector tiles, completely eliminating vendor lock-in.
* **Deck.gl Overlays:** Developed by Uber's visualization team, `deck.gl` handles massive geospatial data volumes. We map active stores, competitors, coverage gaps, and live pulsing delivery orders using hardware-accelerated WebGL layers (`ScatterplotLayer`), ensuring silky-smooth panning and zooming even with thousands of nodes.

### 3. Enterprise-Grade MLOps & Demand Forecasting
The forecasting engine isn't a static script—it is a robust pipeline:
* **Algorithms:** Employs `XGBoost`, `RandomForest`, and `Gradient Boosting Regressors` from `scikit-learn` to predict highly localized demand based on lag features, weather, and holidays.
* **Walk-Forward Validation:** Time-series models are strictly validated using walk-forward testing. By training on expanding windows of past data and testing on strictly future windows, we ensure the metrics reflect true production accuracy.
* **Decoupled MLflow Tracking:** Models are logged and versioned via MLflow. The FastAPI backend utilizes HTTP connection checks to ensure the MLflow server is alive, gracefully falling back to local `pickle`/`ONNX` cached models if the tracking server goes down.
* **Feature Drift Scanning:** Automatically runs Kolmogorov-Smirnov (`scipy.stats.ks_2samp`) tests on incoming data distributions against training distributions, flagging features that have drifted over time.

### 4. Production-Ready Resilience & Object-Oriented Design
* **Circuit Breaker Pattern:** External dependencies (OSRM routing, Open-Meteo) are wrapped in asynchronous state machines. If an API fails repeatedly, the circuit trips to `OPEN`, failing fast and preventing cascading thread starvation.
* **Robust Connection Pooling:** SQLAlchemy is deeply tuned for concurrency (`pool_size`, `max_overflow`, `pool_recycle`), and proven stable via intensive `k6` load testing.
* **Redis Sliding-Window Rate Limiting:** High-throughput API routes are protected by a rolling 1-minute window rate limiter utilizing Redis sorted sets (`ZSET`) and transaction pipelines.
* **Repository & Strategy Patterns:** Database logic is completely isolated into Repository classes (`NeighborhoodRepository`, `OrderRepository`), while business logic (like recommendation fallbacks) utilizes the Strategy Pattern, allowing the `RecommendationEngine` to seamlessly swap between precomputed AI strategies and algorithmic fallbacks.

---

## 💻 Complete Technology Stack

### Backend & Data Tier
* **Framework:** FastAPI (Python 3.11+), Pydantic for validation.
* **Database:** PostgreSQL (via Neon.tech) with PostGIS extensions.
* **ORM:** SQLAlchemy 2.0.
* **Cache & Rate Limiting:** Redis (with automatic in-memory fallback).
* **ML & Analytics:** XGBoost, scikit-learn, MLflow, Pandas, NumPy, SciPy.
* **Real-time:** `asyncpg` (Postgres LISTEN), `python-socketio`.

### Frontend Tier
* **Framework:** React 18 (Vite build system).
* **State Management:** Zustand (global UI state), React Query (server state & caching).
* **Styling & Components:** Tailwind CSS, Shadcn UI (Radix primitives), custom HSL design tokens.
* **Animations:** Framer Motion (micro-interactions, page transitions).
* **Geospatial UI:** MapLibre GL JS, deck.gl, `react-map-gl`.
* **Charts:** Recharts (responsive SVG charts).

### DevOps, CI/CD, & Infrastructure
* **Containerization:** Docker & Docker Compose (Environment parity).
* **Monitoring:** Prometheus (metrics scraping), Grafana (dashboards for p95 latencies and error rates).
* **CI/CD:** GitHub Actions (Automated linting via `flake8`/`eslint`, Testing via `pytest`/`vitest`, Code coverage via Codecov).
* **Load Testing:** k6 (scripted VU concurrency testing).

---

## 🏛️ System Architecture Flow

```mermaid
graph TD
    subgraph Frontend [React SPA Client]
        UI[Shadcn UI / Tailwind Components]
        Map[MapLibre + deck.gl WebGL]
        State[React Query Cache & Zustand]
        Listener[LiveSocketListener]
    end

    subgraph Backend [FastAPI Application]
        API[REST API Routers]
        WS[Socket.IO Server]
        ML[ML Prediction Engine & Strategies]
        Repo[Repository Access Layer]
        Jobs[Async Background Schedulers]
    end

    subgraph Data & Infrastructure
        PG[(PostgreSQL + PostGIS)]
        Redis[(Redis Cache)]
        MLF[MLflow Tracking Server]
        Prom[Prometheus/Grafana]
    end

    %% Flow connections
    State <--> |HTTP/REST| API
    Listener <--> |WebSockets| WS
    Listener --> |Invalidates Cache| State
    State -.-> |Updates State| UI
    State -.-> |Updates State| Map
    
    API <--> Repo
    API <--> |Rate limits & Idempotency| Redis
    API <--> ML
    WS <--- |asyncpg LISTEN/NOTIFY| PG
    
    Repo <--> PG
    ML <--> MLF
    Jobs ---> |Simulates Competitors & Orders| PG
    API ---> |Exposes /metrics| Prom
```

---

## 🚶 The Manager's Journey (Workflow Example)

Here is a practical example of how a Regional Manager utilizes the platform:

1. **Scouting (Geospatial Saturation Check):** The manager wants to open a new Swiggy Instamart hub. They navigate to the *Placement Scoring* tab. The deck.gl map renders all active stores. The PostGIS backend runs DBSCAN clustering, highlighting "Greenfield" zones (high demand, low supply).
2. **Simulation (Huff's Gravity Model):** They click a Greenfield zone. The backend simulates the store's spatial pull against competitors, factoring in real driving distances via OSRM, to predict expected market share.
3. **Forecasting (XGBoost):** The manager approves the location. Fast forward a month: they need to schedule riders for next Monday. The *Forecast* tab hits the ML engine, pulling weather/holiday data, and returns next Monday's exact expected order volume with a 90% confidence interval.
4. **Execution (Sigmoid Markdown):** At the new store, tomatoes are nearing expiry. The *Resilience Cockpit* automatically recommends a specific markdown percentage calculated by the Sigmoid decay model to clear the stock before it ruins, maximizing salvage revenue.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Python 3.11+** installed.
* **Node.js 18+** installed.
* **PostgreSQL** installed locally or a free cloud account on **Neon.tech**.
* **Redis** (Optional: the system will automatically fall back to an in-memory dictionary if Redis is unreachable).

### 1. Repository Setup
```bash
git clone https://github.com/AadityaUniyal/Darkstori.git
cd Darkstori

# Copy the environment file template
cp .env.example .env
```
Open the `.env` file and input your database connection URL under `DATABASE_URL`:
`DATABASE_URL=postgresql://username:password@localhost:5432/darkstori_db`

### 2. Backend Initialization
```bash
# Create and activate a Python virtual environment
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Mac/Linux: source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements/base.txt
pip install -r backend/requirements/ml.txt

# Generate raw datasets
python data/scripts/generate_raw_data.py

# Seed the database tables
python backend/scripts/seed_option_a.py

# Train the Machine Learning models (logs to MLflow)
python backend/scripts/train_ml_models.py
```

### 3. Run the Services
You need two terminals to run the decoupled stack.

**Terminal 1 (Backend API & WebSocket Server):**
```bash
# From the project root, with .venv activated
uvicorn backend.app:app --reload --port 8000
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to view the platform!

---

## 🧪 Testing & Load Benchmarking

Darkstori is built for reliability under load. 

**Run Backend Unit Tests:**
```bash
pytest backend/tests/ -v
```

**Run Load Tests (k6):**
To verify the database connection pooling and asynchronous non-blocking event loops, run the k6 script (requires `k6` installed):
```bash
k6 run scripts/load_test_k6.js
```
*Expected local benchmarks (20 VUs): p50 ~45ms, p95 ~110ms.*

---

## 👥 Authors & License

Developed and engineered by **Aaditya Uniyal**.

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
