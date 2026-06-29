# 🏪 Darkstori — Hyperlocal Quick Commerce Analytics & Prescriptive Intelligence Platform

Darkstori is an enterprise-grade quick-commerce analytics and prescriptive optimization platform. It bridges the gap between raw data collection and operational execution, allowing store operators, regional managers, and B2B enterprises to map competitive landscapes, forecast demand, and automate inventory decisions across five major Indian focus metros: **Bangalore, Delhi, Mumbai, Hyderabad, and Pune**.

---

## 📋 Table of Contents
1. [🎯 Project Aim & Why It Matters](#1-project-aim--why-it-matters)
2. [💻 Technology Stack](#2-technology-stack)
3. [🚶 User Journey: How the Platform Works](#3-user-journey-how-the-platform-works)
4. [🧠 Algorithmic Core (Simplified)](#4-algorithmic-core-simplified)
5. [🚀 Step-by-Step Onboarding Guide (For New Users)](#5-step-by-step-onboarding-guide-for-new-users)
6. [🧪 Running the Backend Test Suite](#6-running-the-backend-test-suite)
7. [👥 Authors & License](#7-authors--license)

---

## 1. 🎯 Project Aim & Why It Matters

Quick commerce platforms (delivering groceries and household goods in under 10 minutes) operate on wafer-thin margins and intense local competition. Traditional analytics tools only show historical performance. 

**Darkstori is prescriptive.** It uses machine learning models and spatial algorithms to actively recommend decisions for dark store operators to:
* **Minimize Waste:** Automatically mark down perishables (fruits, vegetables, dairy) dynamically before they spoil.
* **Optimize Placement:** Find the best location to open a new dark store where customer demand is high but competitor coverage is weak.
* **Prescriptive Recommendations:** Allocate space zones (ambient vs cold storage) dynamically using the **Interactive Layout Optimizer** which calculates fulfillment bottleneck ratings on the fly.
* **OSRM Serviceability Constraints:** Penalize sales projection models based on actual driving road-network distances, instead of straight-line coordinates.
* **MLOps Background Job Scheduler:** Periodically update demand predictions, competitor scraping, and drift models in the background with manual check controls.
* **Governance Audit Ledger:** Run multi-role workflows (Propose → Review → Approve) and log the model version and capex parameters snapshot for absolute provenance.
* **Prevent Stockouts:** Dynamically adjust safety stock levels per neighborhood, incorporating localized delivery SLA constraints.
* **Forecast Orders:** Predict tomorrow's load to ensure staff are scheduled efficiently.

---

## 2. 💻 Technology Stack

Darkstori is built using a modern, scalable, and decoupled stack:

### Backend (API & Analytics Engine)
* **FastAPI:** High-performance Python web framework used to build RESTful API endpoints.
* **SQLAlchemy:** SQL Toolkit and Object-Relational Mapper (ORM) used to manage complex database queries asynchronously.
* **PostgreSQL:** Primary relational database (Neon Postgres) for storing dark store mappings, pincodes, and transaction records.
* **XGBoost, RandomForest, & Gradient Boosting (scikit-learn):** Core Machine Learning models used for demand forecasting.
* **MLflow:** Used to register, version, track, and serve production-ready ML models.
* **Socket.io:** Powers real-time, bi-directional events to update the dashboard maps and activity feeds.

### Frontend (User Interface)
* **React (Vite):** Core framework for building a fast, responsive, and animated Single Page Application.
* **Vanilla CSS:** Custom stylesheets tailored for high-quality visuals, responsive grids, and animations.
* **Leaflet & React-Leaflet:** Geospatial mapping layers to display dark store coordinates and coverage gap heatmaps.
* **Recharts:** Responsive charting library to display SLA compliance and customer cohort metrics.
* **Framer Motion:** Micro-animations for page transitions, KPI counters, and card entrances.

---

## 3. 🚶 User Journey: How the Platform Works

Here is how a new operator or manager interacts with the Darkstori dashboard:

### Step 1: Geospatial Saturation Check (Scouting Locations)
A regional manager wants to open a new Swiggy Instamart or Zepto store in Bangalore. 
* **The Action:** The user navigates to the **Placement Scoring** page. The Leaflet map displays all active dark stores colored by platform.
* **The Insight:** The system runs a DBSCAN clustering algorithm to identify:
  * **Greenfield Zones:** Underserved areas with high population densities but few competing dark stores.
  * **Saturated Zones:** Over-served areas where local rivalry is extremely high.
* **The Recommendation:** The user is presented with a list of recommended PIN codes ranked by expansion viability.

### Step 2: Running a Store Simulation
Before signing a warehouse lease, the manager wants to predict the impact of the new store.
* **The Action:** The user inputs the proposed coordinates and square footage into the **Store Placement Simulator**.
* **The Insight:** The simulator runs **Huff's Gravity Model** to simulate consumer spatial pull, showing how many orders the new store is expected to capture from competitor stores in a 2km radius.

### Step 3: Zero-Waste Perishables Markdown (Sigmoid Pricing)
At a local store, a picker notices that a batch of tomatoes has a freshness score of 50%.
* **The Action:** The picker logs into the **Resilience Cockpit** and uploads a quality photo or inputs the freshness score. They can also use the **OCR Expiry Scanner** to capture printed packaging dates from a photo.
* **The Insight:** Instead of throwing the tomatoes away or selling them at full price (where nobody will buy them), the system simulates decay and runs a revenue-maximization curve.
* **The Recommendation:** It automatically schedules a markdown schedule (e.g., reduce price by 40% immediately) to clear the stock before expiration.

### Step 4: Hyperlocal Demand Forecasting
A store manager needs to schedule delivery riders for next Monday.
* **The Action:** The manager navigates to the **Forecast** page, selects their store's PIN code, and inputs the target date.
* **The Insight:** The backend calls the ML prediction service, pulling historical daily orders (lag features), weather conditions, and holiday data.
* **The Recommendation:** The system returns next Monday's forecasted order volume along with a statistically verified 90% confidence interval, allowing the manager to schedule the exact number of riders needed.

---

## 4. 🧠 Algorithmic Core (Simplified)

For developers and advanced users, Darkstori's intelligence relies on three main mathematical models:

* **Spatial Pull (Huff's Gravity Model):** Evaluates the probability of a customer ordering from a store by balancing the size of the store (attractiveness) against the customer's distance (deterrence) relative to all competitors.
* **Perishables Decay (Sigmoid markdown):** Models food decay over time and runs an optimization grid search to find the discount rate that maximizes expected revenue before freshness drops to zero.
* **Safety Stock & Reorder Point (ROP):** Performs inventory ABC analysis. It calculates the safety stock buffer and the exact reorder point by combining replenishment lead times with standard deviations in local demand.

---

## 5. 🚀 Step-by-Step Onboarding Guide (For New Users)

Follow these steps to get Darkstori up and running on your local machine:

### Prerequisites
* **Python 3.11+** installed.
* **Node.js 18+** installed.
* **PostgreSQL** installed locally or a free cloud account on **Neon.tech**.

---

### Step-by-Step Setup

#### 1. Clone the Code and Setup Environment Variables
```bash
git clone https://github.com/AadityaUniyal/Darkstori.git
cd Darkstori

# Copy the environment file template
cp .env.example .env
```
Open the `.env` file in your editor and input your database connection URL under `DATABASE_URL`:
`DATABASE_URL=postgresql://username:password@localhost:5432/darkstori_db`

#### 2. Install and Start the Backend API
```bash
# Create and activate a Python virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements/base.txt
pip install -r backend/requirements/ml.txt

# Run the seeding script to populate database tables with metro cities, store coordinates, and order lists
python backend/scripts/seed_option_a.py

# Start the FastAPI web server
uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```
* **Interactive API Documentation (Swagger):** Visit http://127.0.0.1:8000/api/docs
* **API Health check status:** Visit http://127.0.0.1:8000/health

#### 3. Install and Start the Frontend UI
Open a new terminal window:
```bash
cd frontend

# Install package dependencies
npm install

# Start the Vite development server
npm run dev
```
* **Open the Web App:** Visit http://localhost:5173 to view the dashboard!

---

## 6. 🧪 Running the Backend Test Suite

Darkstori includes a complete backend test harness. Running tests automatically disables online MLflow tracking to run instantly without external server dependencies:

```bash
# Set PYTHONPATH and execute pytest
$env:PYTHONPATH="."; .venv\Scripts\pytest backend/tests
```

---

## 7. 👥 Authors & License
* **Aaditya Uniyal** - Lead Developer - [@AadityaUniyal](https://github.com/AadityaUniyal) (aaditya.uniyal22@gmail.com)
* Distributed under the **MIT License**.
