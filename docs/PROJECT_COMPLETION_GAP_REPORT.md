# Darkstori Project Completion Gap Report

**Original audit:** 24 October 2026  
**Implementation update:** 26 October 2026  
**Report task:** COMPLETE (repository implementation pass recorded below)  
**Scope:** Current repository state, including frontend, FastAPI backend, database setup, and operational claims.  
**Purpose:** Identify what is demonstrably working, what is simulated or unverified, and the work required before calling the product complete.

## Executive assessment

Darkstori currently behaves like an operations dashboard and prototype/simulator with several useful database-backed paths. It is **not yet a complete live quick-commerce operations product**. The largest blockers are missing or unverified real operating data integrations, remaining simulated behavior and product claims, incomplete end-to-end validation, and a database migration/tenant-isolation plan that needs a full audit.

This report separates “the code path exists and passed a focused local check” from “the service is connected and proven in a real operating environment.” A successful frontend build does not establish that external integrations, production data, or operational actions work.

### Confirmed in this review

- The frontend production build completed. Vite still reports a large map bundle (about **1.39 MB minified / 392 KB gzipped**).
- Changed Python modules compile. `git diff --check` passes. The frontend lint command has no errors, but still reports warnings (187 in the full lint run before the final small edits; targeted lint reports 8 existing warnings in `api.js`).
- A focused in-memory SQLite exercise completed the near-expiry inventory path: recommendation → operator-approved markdown → final sold/waste/remaining outcome → recommendation removed from the active queue.
- A read-only database connectivity check succeeded earlier. No application writes were made to the configured remote Neon database.
- Docker is unavailable in this environment, so the full local stack and a browser-to-real-backend workflow could not be run here.

## 1. Frontend: UI, flows, data presentation, and client behavior

### What is functioning or has been improved

- The React/Vite application builds for production and has route-based page loading.
- Dashboard KPI widgets now distinguish a demo snapshot from database aggregates; physical stores are requested separately from competitor locations for the dashboard's operational store selection.
- The demand forecast view now requests one neighborhood/date estimate. It no longer fabricates a 7/30/90-day curve or displays invented R²/MAPE validation scores. It indicates heuristic fallback output and gives an explicit empty/error state.
- The live-order view no longer invents orders, coordinates, products, or order values while disconnected. It reports connection and empty-feed states and only forwards actual events with coordinates to the map.
- The VRP view is identified as a simulation. Its former local-only “dispatch rider / live GPS” state change was removed.
- City pulse no longer substitutes a fabricated five-city dataset when the API returns no data.
- A failed playbook dry-run no longer manufactures a successful result.
- Simulator neighborhood fallback rows and fabricated ROI fallback results were removed from the selected flows. The simulator requires connected neighborhood records and a backend response before producing a result.
- Inventory batch creation now requires a physical store selection and sends its store ID to the backend.

### What is still lagging

1. **The UI still contains sample, fallback, and simulated content elsewhere.** Examples discovered during the audit include starter notifications in the socket store, demo datasets in shared constants and some analytics/neighborhood views, simulation-oriented SLA and algorithm panels, and remaining random/example behaviors in components or backend routes. Each page needs a source-of-truth audit; sample output must be explicitly marked and must never enable a real-looking operational action.
2. **“Live” presentation is not consistently tied to a real source.** A connected socket, database record, generated simulation, and demo snapshot are different states. Standardize badges and labels around `live`, `database`, `simulation`, `sample`, and `unavailable`, and show timestamps/source on operational metrics.
3. **No complete browser workflow was verified.** The app was not run with its backend, database, socket, and external dependencies together in this environment. Authentication, navigation, responsive layouts, keyboard access, screen-reader behavior, loading/error states, and all mutations need browser/device QA.
4. **Mobile and native-app feel are not yet evidenced as complete.** Review page-level responsive layouts, touch targets, safe areas, scroll behavior, reduced-motion behavior, focus states, and transitions on narrow iOS Safari and Android Chrome. A visual style alone does not establish an iOS-quality experience.
5. **Bundle size is high.** The `map-viz` chunk is approximately 1.39 MB minified, with a Vite warning above 500 KB. Split map/visualization dependencies further, defer map code until needed, and measure Core Web Vitals on target devices and networks.
6. **The design system needs consolidation.** Several screens use large inline style blocks and page-specific visual rules. Consolidate spacing, type, color, responsive breakpoints, component variants, and motion/reduced-motion behavior so that UI changes do not create inconsistent experiences.
7. **Client-side data handling needs a full pass.** Audit query keys, invalidation after writes, stale data on city/store changes, loading and retry policies, optimistic updates, and mutation error messages. Ensure no screen keeps displaying a previous tenant's or city's cached data after a context switch.

### Work required before frontend completion

- Inventory every page/component and classify each displayed value by source; delete or visibly label data that is illustrative.
- Remove local-only fake action outcomes. Every action that claims an operational effect must call a backend mutation and reflect the returned state, or be labelled a dry-run/simulation.
- Complete the responsive/accessibility review and interaction QA on supported browsers/devices; cover empty, offline, permission-denied, slow, and partial-data states.
- Add frontend workflow checks for the critical user journeys (sign-in, store selection, inventory creation, recommendation review/apply/outcome, and simulator dry-run). Keep generated examples separate from production-like records.
- Split the map/analytics bundle and record performance budgets (initial JS, largest chunk, LCP, INP, CLS) on mobile.
- Reconcile homepage and product copy with implemented, measurable capabilities; remove unverified performance, autonomy, and accuracy claims.

## 2. Backend/API: features, integrations, behavior, and output quality

### What is functioning or has been improved

- FastAPI route modules compile, and the frontend production build passes against the current source.
- The decision-loop API reads near-expiry batches from the database, calculates a transparent sigmoid freshness markdown recommendation, records operator approval, stores operator-reported disposition, and removes completed recommendations from the active queue. This path passed the focused in-memory route-level check described above.
- Organization identity is now included in issued JWTs when present. Middleware sets a tenant context for authenticated tokens, and ORM loader criteria scope `DarkStore` and `User` selects. Store, analytics, resilience, and decision-loop routes also have explicit scoping in the reviewed paths.
- Benchmark seeding is restricted to development and an empty set of target tables; API error handling preserves intended HTTP status codes.
- Empty/unavailable forecast, coverage, event, and expansion data is no longer systematically replaced by actionable-looking records in the reviewed flows.
- Cannibalization analysis no longer reports a fabricated market when no nearby stores exist; it reports that recorded market data is required.
- Image OCR/quality results are not randomly fabricated in the reviewed resilience route; unavailable OCR is reported as not configured.

### What is still lagging

1. **Real quick-commerce event integrations are not demonstrated.** The codebase has Socket.IO and order-related routes/models, but this review did not verify an authenticated production order stream, rider/GPS feed, inventory/POS sync, dispatch provider, or stable event delivery and replay. “Live operations” depend on those integrations, not on a UI component or websocket package existing.
2. **Many algorithm pages are prototype/simulation paths.** VRP uses generated sample customer stops; conformal SLA fallback data and several algorithmic scenarios are illustrative. These are useful for exploration but not verified dispatch or SLA decisions. Mark simulation outputs and keep their actions non-operational until connected to approved data and systems.
3. **Forecasting is not production-validated.** A heuristic fallback may return an estimate, but there is no evidence in this review of a trained, versioned model evaluated on representative Indian dark-store history, calibrated uncertainty, temporal backtesting, drift monitoring, or a safe model rollout. A model name or algorithm file is not evidence of predictive performance.
4. **Simulator assumptions need validation.** ROI and cannibalization outputs need traceable input provenance, uncertainty/sensitivity ranges, calibration against actual store economics, and explicit separation between recorded values and assumptions. A numerical result should not be interpreted as a business recommendation without this.
5. **Tenant isolation requires route-by-route verification.** Middleware-level filters currently target `DarkStore` and `User`; those filters alone do not scope every table. Review every endpoint that reads or mutates a tenant-owned child record, audit log, simulation, neighborhood, inventory batch, proposal, and ledger. Enforce ownership in mutations as well as reads. Add cross-tenant negative checks for each route.
6. **Authorization needs a capability audit.** Confirm that role/permission checks are enforced server-side for sensitive actions (discount approval, store creation, proposal review/approval, exports, seed routines, and operational controls). Hiding a button in React is not authorization.
7. **Mutation reliability and audit semantics need completion.** Define idempotency and retry behavior for each write, transaction boundaries, concurrent edits, audit retention, actor identity, and rollback behavior. Confirm that audit events cannot be altered by tenant users and that failure leaves no partial state.
8. **API contracts and failure behavior need a systematic review.** Standardize request/response schemas, pagination, timestamps/timezones, currency/units, error payloads, rate limits, timeouts, and external-provider outage handling. Some frontend fallback catch blocks and warning-level lint issues remain.
9. **Marketing documentation overstates implementation.** The existing architecture deep-dive describes autonomous pre-picking, courier intercepts, live GPS, double-entry stock flows, finite-sample SLA guarantees, and outcome improvements as though deployed and measured. These claims need code/data evidence or must be rewritten as planned or simulated capabilities.

### Work required before backend/API completion

- Define and connect the source systems: order lifecycle, catalog, inventory/POS, store master, rider/vehicle telemetry, ETA/traffic/weather, and competitor observations. Document ownership, update frequency, outage behavior, and data retention for each.
- Publish a capability matrix for each endpoint: live read, database aggregate, heuristic, simulation, or external integration. Ensure responses include source/mode and generated/observed timestamps where useful.
- Complete server-side RBAC and tenant ownership validation for all routes; add automated positive and negative tenant/permission cases.
- Turn each user-visible action into a transactionally safe API workflow with idempotency where retries are possible, clear status transitions, audit rows, and actionable errors.
- For ML: define target/outcome, feature provenance, data quality checks, time-based train/validation/test splits, baselines, backtests by city/store/category, calibration, monitoring, and rollback. Do not display accuracy/confidence claims without those results.
- For optimization: validate the algorithm against recorded constraints and operational outcomes; return assumptions and input coverage; keep synthetic scenarios in a distinct simulation API/mode.
- Run the backend API and integration suite with an isolated test database, then a staging environment with representative, non-sensitive data and real integration credentials. Verify all critical user journeys end to end.
- Update architecture/product documentation so implemented, simulated, and planned work are not conflated.

## 3. Database, migrations, infrastructure, and operations

### What is functioning or has been improved

- The project has SQLAlchemy async models, SQLite support for local/test use, PostgreSQL/asyncpg support, and a configured Neon database path. A read-only connectivity query succeeded earlier in this work; no data was changed.
- The schema includes core entities such as organizations, users, dark stores, neighborhoods, synthetic orders, product batches, audit logs, and stock ledger records.
- The repository includes two Alembic revision files and development compose files. The current environment could not run Docker Compose because Docker is unavailable.
- The empty-development-only seed guard reduces the risk of the benchmark routine deleting existing data.
- The decision-loop outcome was verified using a temporary in-memory SQLite database, not the configured remote database.

### What is still lagging

1. **Migration history is incomplete or at least unproven.** Only two Alembic revision files were observed. Startup also invokes SQLAlchemy `metadata.create_all`, which can make schema evolution implicit and drift from migration history. There is no evidence here that a fresh database and an existing production-like database both migrate to the current schema cleanly.
2. **Tenant ownership is not uniformly represented.** Some records are organization-owned through their store relationship, while shared/public records (such as competitor data and neighborhoods) have different visibility rules. Document these rules and enforce them with constraints and query filters consistently.
3. **Inventory ledger invariants need enforcement.** The architecture document claims double-entry/immutable ledger behavior, but this review did not verify every inventory write goes through a transactionally enforced stock ledger. Confirm schema constraints, balance derivation, audit immutability, and reconciliation jobs before treating stock as reliable.
4. **Production database safety and operations need evidence.** Verify least-privilege credentials, secret rotation, TLS, backups/PITR, restore drills, connection pool sizing, query timeouts, migration locks, data retention, PII handling, and incident response. Secrets must remain outside committed files and logs.
5. **Operational dependencies are not proven together.** Redis/cache, Socket.IO, background scheduler, database listener, MLflow, monitoring, and deployment configuration exist in parts, but the combined deployment, health checks, graceful degradation, and alerting were not exercised here.
6. **Environment split is not yet evidenced.** Development, test, staging, and production should have distinct databases, signing keys, integrations, seed behavior, and observability. Production must never fall back to demo/sample data or use development credentials.
7. **Data quality and provenance are not fully tracked.** Add source, ingestion time, freshness, transformation/version, and quality status to records/signals used for analytics and decisions. Flag synthetic seed records as synthetic in storage and in every downstream response.

### Work required before database/platform completion

- Establish Alembic as the authoritative schema path: baseline the current schema, add revisions for all current models, test upgrade from an empty database and supported previous revisions, and define rollback/forward-fix procedures. Avoid relying on `create_all` for production migrations.
- Create a tenant/data ownership matrix for every table; add foreign keys, uniqueness/check constraints, indexes, and cascading/deletion policies that match the actual product lifecycle.
- Verify inventory accounting with transactional ledger writes, reconciliation queries, concurrency protection, idempotency keys, and audit access controls.
- Add safe seed fixtures exclusively to isolated test/demo databases; mark their provenance and prevent them from being mistaken for operational records.
- Configure staging and production secrets, database roles, backups/restores, monitoring, alerting, connection limits, deployment checks, and documented recovery steps.
- Run migrations and read/write smoke checks only against an approved isolated staging database, followed by a verified backup/restore exercise. Do not use the current remote database as a test target.

## Completion gate

Darkstori should only be called complete for live operations after all of the following are evidenced:

- Every visible operational figure has a known source, timestamp, and mode; simulations and samples cannot masquerade as live data.
- Every operational mutation is authorized on the server, tenant-scoped, idempotent where needed, audited, and verified against persistent state.
- The critical workflows pass in a staging deployment connected to representative real integrations and an isolated database.
- Forecasts, SLA estimates, and ROI outputs have measured evaluation and clearly stated limits; unavailable inputs fail safely.
- Migrations, tenant boundaries, backups, recovery, monitoring, mobile usability, accessibility, and performance budgets pass their documented checks.
- Product and architecture docs describe current, simulated, and planned capabilities accurately.

Until those gates are met, the accurate product description is **an operations dashboard and decision-support prototype with a few verified database-backed workflows and several simulations**, rather than a fully autonomous quick-commerce operating system.

## Implementation pass — 26 October 2026

This update supersedes earlier findings where it explicitly records a fix. The report task is complete; the product itself is not represented as production complete.

### Repository changes completed

- City selection is loaded from the configured API rather than a baked-in metro list. The map opens at an India overview; a geocoded search result or map tap selects and marks the actual coordinate. Coordinates without valid geometry are not drawn at map center. Map attribution and unavailable-data states are visible.
- Place and PIN searches use the backend geocoder endpoint, with configured provider URLs, caching/throttling, and attribution. The current public Nominatim provider is appropriate only for modest, user-triggered lookup volume; it is not a national autocomplete or commercial-scale geocoding service. A production deployment should configure a contracted or self-hosted provider.
- Reviewed no-data paths no longer substitute fabricated cities, opportunity rankings, operational orders, moods, coverage totals, model run identifiers, offline JWTs, or successful API mutation results. Production demo login is disabled. Missing production order/weather inputs return unavailable responses where a result would otherwise be misleading.
- The placement list now uses persisted placement scores joined to real neighborhoods. Demand, coverage uplift, cannibalization, and ROI are not inferred for those records. Expansion scenario results and ledger entries are explicitly identified as heuristic scenario output; approving a scenario does not create or provision a physical store.
- The decision loop requires a recorded freshness measurement before application and reports operator-entered 90-day outcomes separately from causal or avoided-waste claims. Outcomes require an authorized operator role.
- Dashboard and map no-data states, API failure propagation, search controls, city context compatibility, analytics export feedback, neighborhood empty states, and scenario approval wording were corrected in the reviewed flows. Demo-session errors now show the backend's actionable response.
- A baseline and follow-on Alembic revisions are present in the repository. This does not establish a successful production migration path; an isolated fresh-database migration and staging upgrade still need to be run before deployment.
- The full Alembic chain was subsequently run against a fresh in-memory SQLite database and reached revision `004_order_events`. Existing-database upgrades, PostgreSQL/PostGIS behavior, and staging deployment remain unverified.
- Map rendering dependencies are split into MapLibre, deck.gl, luma.gl, loaders, and React bindings. No single map chunk now exceeds the 500 KB warning threshold; MapLibre itself is still about 762 KB minified / 208 KB gzipped and loads with the lazy map page.
- Architecture documentation is now labeled as a concept/target design and directs readers to this evidence-based report for verified status.

### Verification performed

- Python backend modules compile with `python -m compileall -q backend`.
- Frontend production compilation with `npm run build` succeeds. The map visualization chunk remains oversized (about 1.39 MB minified / 392 KB gzipped in the last successful build); split/defer it and measure mobile Core Web Vitals.
- `git diff --check` passes. No test suite was added or run.
- The full browser-to-backend journey, responsive iOS/Android interaction, live provider connectivity, and deployment behavior were not verified in this environment.

### Remaining launch gates (not marked complete)

1. Connect production OMS/order, inventory/POS, store master, dispatch/rider telemetry, weather/traffic, and competitor data sources. Add freshness monitoring, retries/replay, outage behavior, and provenance for each.
2. Replace public Nominatim for commercial national coverage with a provider whose India coverage, PIN/address quality, throughput, caching rights, availability, and price are contractually suitable. OSM data coverage does not guarantee every Indian place or PIN resolves; a selected point is only as accurate as the geocoder result.
3. Replace heuristic scenario economics with an evaluated model grounded in the operator's historical orders, costs, capacity, constraints, and outcomes. Until then, keep results labeled scenario-only and do not use them as investment advice.
4. Finish route-by-route tenant and RBAC review, transaction/idempotency checks, migration-from-supported-version verification, PostgreSQL migration validation, backup/restore, and staging smoke checks. Fresh SQLite migration through revision 004 has now passed locally.
5. Complete mobile/accessibility/browser QA, design-system cleanup, responsive layout review, and measure map performance budgets on target devices. Map libraries are now split by package and lazy-loaded, though MapLibre remains a large deferred dependency.
6. Configure production credentials, deployment, monitoring, alerting, and operational support. These external resources cannot be completed by source edits alone.

**Completion statement:** the requested audit/reporting and repository fixes are recorded as complete. Darkstori's production launch criteria remain open until the gates above have evidence from a staging/production-like environment.

## Implementation follow-up — 26 October 2026

This follow-up supersedes stale verification statements above where they differ.

### Additional repository work

- Registration now creates a dedicated Organization and associates the new user with it. The workspace value already submitted by the sign-up UI is now accepted and used. If omitted by older clients, registration creates a private personal workspace. Duplicate workspace names return a conflict instead of silently joining another tenant. A focused route test checks that the created user receives the new organization ID.
- The app startup path now refuses a non-test database whose Alembic revision is missing or behind the repository head; it no longer silently calls `metadata.create_all` for a shared database.
- CI no longer masks backend test failures; deployment placeholders were removed from CD. CI now reports frontend/backend gates, while image/release workflows remain separately configured.
- Production Vercel entrypoint secret fallbacks were removed. Production must supply database, JWT and encryption secrets via environment configuration. Compose configurations now require secrets instead of shipping a default database password.
- Map dependency splitting is complete. The latest verified frontend build has separately loaded MapLibre (~762 KB minified / 208 KB gzipped), deck.gl, luma.gl, loaders and React bindings; the map page remains deferred. This is a reduction from the previous combined ~1.39 MB chunk, not a claim that mobile performance is within budget.

### Updated verification

- Backend compile: passed (`python -m compileall -q backend`).
- Backend focused unit group: 55 passed. Registration route check: 1 passed.
- Fresh SQLite Alembic chain: passed through `004_order_events` using an explicit in-memory SQLite URL.
- Frontend tests: 13 passed across 7 files in the previous run. Frontend production build passed. Lint had zero errors and 160 warnings in the previous run.
- Full backend suite remains red: the last complete run had 81 failures, 285 passes, and 21 skips; many legacy tests assume seeded/sample data and old simulated outputs. CI now exposes those failures rather than reporting success.
- `git diff --check` passes (Git reports line-ending normalization warnings only).

### Database verification incident and current limit

An Alembic verification command was initially launched without overriding the repository's configured Neon URL. It connected to PostgreSQL and logged the start of `000_core_schema`; the command was interrupted immediately. A subsequent read-only check found no `alembic_version` table, consistent with the transactional migration having rolled back. No app-level row writes were issued. Because the original schema was not captured immediately before that invocation, this report does not claim a verified zero-DDL side effect; Neon must be checked against its backup/change history before any further migration attempt. All subsequent migration checks explicitly used in-memory SQLite. The Neon migration was not completed or marked applied.

The configured Neon database still has no verified Alembic revision and does not match the current model ownership schema. Existing historic rows have ambiguous tenant ownership; do not migrate/backfill them until the operator confirms ownership and a recoverable backup is available. Remote DB work remains a launch gate.

### Open launch gates

- Provider configuration: verify/rotate credentials exposed by the former public source fallback, configure Vercel environment values, and confirm the current production revision. This repository workspace cannot rotate Neon/Vercel secrets or deploy without provider-console access.
- Live source systems: OMS/orders, POS/inventory, store master, rider/dispatch telemetry and contracted India-wide geocoding/places data are not connected and validated end to end.
- Product proof: algorithm output still requires representative historical data, holdout evaluation, freshness/provenance, drift checks and operator outcome measurement. Scenario estimates remain clearly labelled and are not operational predictions.
- Platform proof: tenant/RBAC coverage by route, supported PostgreSQL migration path, backup/restore, staging smoke tests, browser/device accessibility and mobile performance budget remain unverified.

**Report task status:** complete and updated with evidence. **Product/production status:** not complete; the launch gates above remain open.
