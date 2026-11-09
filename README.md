# Darkstor — The Autonomous Quick-Commerce Operating System

> Sub-10-minute grocery delivery built on mathematical order, spatial physics, and unit profitability.

---

## 1. Overview

**Darkstor** is an enterprise-grade operating system designed for high-velocity quick-commerce dark store networks. It unifies four critical pillars of hyperlocal fulfillment into a single, closed-loop platform:
1. **Strategic Greenfield Expansion:** Huff gravity catchment models, road network friction analysis, and cannibalization scoring.
2. **Inside-The-4-Walls Micro-WMS:** Digital twin store layouts, Golden Zone slotting, and collision-free picker routing (<45s pick-to-bag).
3. **Autonomous Swarm Dispatch:** Dynamic multi-order batching preserving sub-10 minute SLAs while maximizing drops per rider per hour.
4. **Unit Economics & Resilience:** Granular Contribution Margin 1, 2, and 3 waterfalls and automated monsoon/shock containment playbooks.

---

## 2. Professional Monorepo Architecture

The workspace is organized into three clean, production-ready domains:

```
Darkstore/
├── backend/                  # High-Performance FastAPI Application
│   ├── api/                  # Modular API routers (v1)
│   ├── core/                 # Config, security, auth, caching, logging
│   ├── database/             # SQLAlchemy ORM models mapped to Neon DB
│   ├── ml/                   # Machine learning model pipelines & tracking
│   ├── services/             # Domain business logic & mathematical models
│   ├── tests/                # Automated unit, e2e, and feature test suites
│   ├── Dockerfile            # Container configuration for Railway
│   ├── Procfile              # Railway start command
│   └── requirements.txt
│
├── frontend/                 # Enterprise React 18 + Vite SPA
│   ├── src/
│   │   ├── features/         # The 8 Dedicated Flagship Features
│   │   │   ├── expansion/    # Feature 01: Catchment & Greenfield Site Selection
│   │   │   ├── inventory/    # Feature 02: Dynamic Demand Forecasting & Stock Replenishment
│   │   │   ├── floor/        # Feature 03: Micro-Warehouse Floor Twin & Heatmaps
│   │   │   ├── dispatch/     # Feature 04: Order Dispatch & Rider Swarm Batching
│   │   │   ├── competitor/   # Feature 05: Competitor Radar & Price Intelligence
│   │   │   ├── playbooks/    # Feature 06: Automated Incident Playbooks & Disruption
│   │   │   ├── economics/    # Feature 07: Unit Economics & EBITDA Simulator
│   │   │   └── vision/       # Feature 08: Vision Packing & Quality Passport
│   │   ├── components/       # Reusable UI primitives (Navbar, Sidebar, Status Bar)
│   │   ├── context/          # RoleContext, AuthContext, CityContext
│   │   ├── landing/          # Pure narrative landing page (Problem, Story, What We Are)
│   │   └── App.jsx           # Clean route registry
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json           # Vercel deployment rewrites
│
├── database/                 # Database Management Hub
│   ├── connection.py         # Resilient Neon connection pooler (psycopg2 + asyncpg)
│   ├── seeds/                # Seed scripts for Pan-India dark store networks
│   └── verification/         # Live Neon DB schema integrity test scripts
│
├── vercel.json               # Monorepo root Vercel configuration
├── .env.example              # Documented environment template
└── README.md
```

---

## 3. The 8 Dedicated Flagship Features

| # | Feature Name | Tab / Route | Primary Role Focus | Core Problem Solved |
|---|--------------|-------------|--------------------|---------------------|
| **01** | **Catchment & Greenfield Site Selection** | `/expansion` | Executive | Arbitrary lease commitments resulting in cross-store cannibalization. |
| **02** | **Demand Forecasting & Replenishment** | `/inventory` | Store GM | Stockouts during sudden rain/festival surges vs. fresh produce spoilage. |
| **03** | **Micro-Warehouse Floor Digital Twin** | `/floor` | Store GM | Chaotic picker walking paths exceeding 150s pick-to-bag cycles. |
| **04** | **Order Dispatch & Rider Swarm Batching** | `/dispatch` | Fleet Commander | Single-order drops blowing rider delivery costs and SLA breaches. |
| **05** | **Competitor Radar & Price Intelligence** | `/competitor` | Executive | Rivals undercutting key grocery SKUs or capturing whitespace corridors. |
| **06** | **Automated Disruption Playbooks** | `/playbooks` | Fleet Commander / GM | Waterlogged roads, power outages, and sudden surges paralyzing hubs. |
| **07** | **Unit Economics & EBITDA Simulator** | `/economics` | Executive | Negative contribution margin per drop masked by blended reports. |
| **08** | **Vision Packing & Quality Passport** | `/vision` | Store GM | Customer missing-item disputes and unverified dispatch handovers. |

---

## 4. Operational Roles & Chromatic Palettes

Darkstor dynamically reconfigures its navigation, telemetry ribbons, and chromatic themes based on the user's operational lens:

1. **Executive Lens (`#F59E0B` Liquid Amber Gold):**  
   Prioritizes capital allocation, expansion approvals, competitor radar, and network EBITDA.
2. **Store GM Lens (`#8B5CF6` Electric Amethyst):**  
   Prioritizes inside-the-four-walls dark store micro-warehouse physics, shelf slotting, and vision packing QA.
3. **Fleet Commander Lens (`#10B981` Hyper Emerald):**  
   Prioritizes last-mile 2-wheeler swarm dispatch, dynamic batching, and delivery SLA preservation.

---

## 5. Quickstart & Local Development

### Prerequisites
- Python 3.12+
- Node.js 18+
- Neon PostgreSQL connection string

### 1. Database Verification & Seeding
```powershell
# Verify connection to Neon PostgreSQL
python database/verification/test_neon_schema.py

# Seed all 8 features
python database/seeds/seed_all_features.py
```

### 2. Backend Startup
```powershell
cd backend
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Startup
```powershell
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to explore Darkstor!

---

## 6. Production Deployment

- **Database:** Neon Serverless PostgreSQL with auto-scaling and connection pooling.
- **Backend:** Railway deployment via `Dockerfile` and `Procfile`.
- **Frontend:** Vercel deployment configured with SPA routing via `vercel.json`.

---

## 7. License & Credits

Built with precision by the Darkstor Systems Engineering Team. Copyright © 2026 Darkstor. All rights reserved.
