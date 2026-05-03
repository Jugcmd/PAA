# Smart Environmental Monitoring UI

This package contains the production-style frontend prototype for a smart office environmental monitoring system.

## Current Scope

- Simulated login with role-based UX:
  - Facilities Manager: full access, including Scenario Planner.
  - Occupant: read-only operational views.
- Multi-page app shell:
  - Dashboard
  - Analytics
  - Rooms
  - Reports
  - Scenario Planner (manager only)
- Live telemetry with API-first sync and local fallback mode.
- Data freshness indicators, stale-data warnings, and retry actions.
- CSV export via backend endpoint.
- Session telemetry events for evidence/reporting.

## Run

Start backend API first:

```bash
cd ../../Backend/EnvironmentalMonitoring.Api
dotnet run
```

Then run frontend:

```bash
pnpm install
pnpm dev
```

Optional API base URL override:

```bash
# Frontend/UI/.env.local
VITE_API_BASE_URL=http://localhost:5281/api
```

## Test And Build

```bash
# Frontend tests
pnpm test

# Frontend production build
pnpm build
```

From monorepo root:

```bash
pnpm --filter @programmingandappps/ui test
pnpm --filter @programmingandappps/ui build
```

## Evidence Files

- Performance evidence: `PERFORMANCE.md`
- Demo walk-through: `DEMO_SCRIPT.md`

## API References

- Backend API base: `http://localhost:5281/api`
- Scalar docs: `http://localhost:5281/scalar/v1`
