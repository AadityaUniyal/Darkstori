# 🏪 Darkstori

**Enterprise AI Operating System for Quick-Commerce Dark Store Networks**

Darkstori transforms 10-minute micro-fulfillment operations from reactive post-mortems into an evidence-backed, closed-loop decision system. It unites inventory freshness tracking, automated near-expiry discounting, double-entry stock reconciliation, and spatial network intelligence into a unified, multi-tenant platform.

---

## 🚀 Core Capabilities

| Capability Domain | Architecture & Operational Reality | Verified Proof |
| :--- | :--- | :--- |
| **Real Operating Ingestion** | Ingests real-time OMS order streams (`POST /api/v1/ingestion/orders`) and WMS batch inventory (`POST /api/v1/ingestion/inventory/batches`) with idempotency and double-entry `StockLedger` logging. | [`test_ingestion.py`](backend/tests/test_ingestion.py) passes 100% |
| **Expiry Decision Queue** | Dynamic sigmoid markdown recommendations with human-in-the-loop approval, floor count discrepancy/shrinkage reconciliation, and outbound HMAC-SHA256 catalog webhook dispatch. | [`DecisionQueue.jsx`](frontend/src/components/DecisionQueue.jsx) with real-time sync |
| **Algorithmic Validation** | Historical counterfactual backtesting engine (`backend/ml/evaluate_markdown_policy.py`) compares Darkstori dynamic discounting vs. FIFO and linear step baselines. | **27.7% Expiry Waste Reduction** vs. FIFO baseline with net positive margin uplift |
| **Multi-Tenant Isolation** | Route-by-route organization scoping and negative authorization verification preventing cross-tenant enumeration, mutations, batch poisoning, or order injections. | [`test_tenant_isolation.py`](backend/tests/test_tenant_isolation.py) passes 100% |
| **Spatial Network Intelligence** | PostGIS clustering, Voronoi delivery catchment analysis, and Huff gravity cannibalization modeling for network expansion. | Hardened bounding checks & zero synthetic mock fallbacks |

---

## 🧪 Verified Quality Status

```
========================= SYSTEM HEALTH STATUS =========================
  Backend Test Suite      : 371 PASSED, 21 SKIPPED, 0 FAILED (64.48s)
  Tenant Isolation Suite  : 3 PASSED, 0 FAILED
  Ingestion Suite         : 1 PASSED, 0 FAILED
  Backend Flake8 Lint     : 0 ERRORS
  Frontend Vitest Suite   : 7 test files passed, 13 tests passed, 0 failed
  Frontend ESLint         : 0 ERRORS
  Vite Production Build   : Built in 11.51s (0 errors, 0 bundle warnings)
  Alembic Migration Chain : <base> -> 000 -> 001 -> 002 -> 003 -> 004 (head)
========================================================================
```

---

## 🛠️ Local Development & Quickstart

### Prerequisites

- **Python:** 3.11+
- **Node.js:** 20+
- **Database:** PostgreSQL with PostGIS (for full spatial analysis) or SQLite (for local zero-dependency testing)

### 1. Environment Configuration

Copy `.env.example` to `.env` and generate unique cryptographically secure keys:

```bash
# Generate JWT signing key
python -c "import secrets; print(secrets.token_urlsafe(48))"

# Generate Fernet encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Configure the generated keys in `.env`:
```ini
JWT_SECRET_KEY=your_generated_jwt_secret
ENCRYPTION_KEY=your_generated_fernet_key
ENVIRONMENT=development
DATABASE_URL=sqlite+aiosqlite:///./darkstori_dev.db
SEED_DEMO_DATA=false
```

### 2. Backend Startup

```bash
python -m pip install -r backend/requirements/base.txt
python -m alembic -c alembic.ini upgrade head
uvicorn backend.app:app --reload --port 8000
```

Interactive OpenAPI documentation is available at `http://localhost:8000/api/docs`.

### 3. Frontend Startup

In a separate terminal:

```bash
cd frontend
npm ci
npm run dev
```

The Vite development server runs on `http://localhost:5173` and proxies `/api` calls directly to port 8000.

---

## 🔍 Automated Verification & Quality Checks

Run the complete verification pipeline locally:

```bash
# 1. Backend syntax & undefined names
flake8 backend --count --select=E9,F63,F7,F82 --show-source --statistics

# 2. Database migration dry-run (offline SQL generation)
python -m alembic -c alembic.ini upgrade head --sql

# 3. Full backend test suite
python -m pytest backend/tests -q --tb=short

# 4. Frontend unit & component tests
cd frontend
npm test

# 5. Frontend ESLint
npm run lint

# 6. Production Vite bundle build
npm run build
```

---

## 🚢 Staging & Production Deployment

1. **Continuous Integration (CI):** Every push and pull request to `main` executes `.github/workflows/ci.yml`, running Flake8, Alembic offline migration, full Pytest suite, Vitest suite, ESLint, and the Vite production build.
2. **Database Migrations:** Schema migrations chain cleanly across 5 revisions:
   - `000_core_schema`: Application entities, dark stores, batches, and ledger tables.
   - `001_ml_tracking`: ML prediction tracking, feature drift, and training jobs.
   - `002_expansion_decisions`: Expansion scenarios and investment approvals.
   - `003_tenant_ownership`: Multi-tenant ownership foreign keys, indices, and backfills.
   - `004_postgres_order_events`: Real-time change notification triggers on order events.
3. **Outbound Catalog Webhook Dispatch:** When an operator approves an item markdown in the Decision Queue, an HMAC-SHA256 signed event payload is dispatched to the retailer's catalog URL (`CATALOG_WEBHOOK_URL`). If unconfigured, the dispatch safely logs to `AuditLog` without blocking operations.

---

## 🔒 Security & Data Integrity

- **Tenant Isolation:** All database queries are filtered by authenticated `organization_id` derived from verified JWT tokens.
- **Truthful Status Codes:** External integrations degrade truthfully (HTTP `501 Not Implemented` when external scraping is unconfigured; HTTP `503 Service Unavailable` when MLflow tracking is offline). Synthetic mocks are never presented as live telemetry.
- **Secret Hygiene:** Production credentials must never be committed to source control. Ephemeral test secrets are generated on-the-fly during CI runs.
