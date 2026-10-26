# Darkstori

Darkstori is a web-based decision-support workspace for dark-store and quick-commerce operators. It brings recorded store, neighborhood, inventory, and market data into one interface, with explicit scenario tools where live inputs or validated models are not connected.

## Capability status

| Area | Current behavior |
| --- | --- |
| City and place search | Operating markets come from the database. Place/PIN lookup uses the configured geocoder; India-wide completeness is not guaranteed. |
| Map | Opens at an India overview; selecting a search result or tapping the map marks that coordinate. Store and competitor layers require coordinates in their source records. |
| Expansion | Displays persisted placement scores joined to known neighborhoods. No score is invented for an unranked place. |
| Economics | The expansion and simulator flows are heuristic what-if scenarios. Their outputs are not a validated demand forecast, investment recommendation, or realized operating result. |
| Near-expiry workflow | The recommendation-to-operator-action-to-reported-outcome path is database-backed; savings and causal impact are not claimed from operator-reported outcomes. |
| Orders, dispatch, and inventory | Production OMS/POS, rider telemetry, and dispatch integrations are not configured in this repository environment. Synthetic order fixtures are not a live feed. |
| Forecasts, SLA, and ML | A route or model is not considered production-ready without connected source data, versioned evaluation, and monitoring. Missing inputs should display as unavailable. |

The evidence, completed repository work, and remaining launch gates are tracked in [the project completion and gap report](docs/PROJECT_COMPLETION_GAP_REPORT.md). The architecture document is a concept design, not a claim that every described component is deployed.

## Local development

### Requirements

- Python 3.11+
- Node.js 20+
- A PostgreSQL/PostGIS service for spatial workflows, or SQLite for local non-spatial development

### Configure secrets

Copy .env.example to .env. Generate a unique JWT signing key and Fernet encryption key for each environment:

    python -c "import secrets; print(secrets.token_urlsafe(48))"
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Put the generated values in JWT_SECRET_KEY and ENCRYPTION_KEY. Set a local DATABASE_URL, and keep SEED_DEMO_DATA=false unless you explicitly want synthetic benchmark fixtures in an empty development database. Never copy production credentials into source control.

### Run the app

    python -m pip install -r backend/requirements/base.txt
    python -m alembic -c alembic.ini upgrade head
    uvicorn backend.app:app --reload --port 8000

In a second terminal:

    cd frontend
    npm ci
    npm run dev

The local frontend runs on port 5173 and proxies /api to port 8000. API documentation is available at http://localhost:8000/api/docs.

## Quality checks

    python -m compileall -q backend
    python -m alembic -c alembic.ini upgrade head
    cd frontend
    npm test
    npm run lint
    npm run build

The repository full backend suite currently has known failures in legacy tests that expect seeded/demo results and old API behavior. CI now surfaces those failures instead of swallowing them. Use a disposable test database and never point test commands at a production database.

## Integrations and deployment

Geocoding/POI lookup has configurable provider URLs. Public Nominatim is intended for modest, user-triggered searches, not high-volume autocomplete or national-scale service. Production map coverage and lookup throughput require a suitable commercial or self-hosted provider.

The repository does not currently include configured OMS, POS, inventory, dispatch, rider telemetry, or weather/traffic credentials. GitHub Actions can validate and publish container images after checks pass; it does not deploy the application to Vercel or Railway. Production deployment requires configured provider accounts, environment variables, schema ownership reconciliation, staged migration, and a device/browser release review.

## Security note

The serverless entrypoint previously contained production-looking connection and key material in source. Source fallbacks have been removed. Treat any credentials that were ever committed as exposed and rotate them in the owning provider consoles before using this repository for a new deployment. The current local Neon connection was inspected read-only; no schema or application data was modified.
