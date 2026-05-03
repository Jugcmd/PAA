# Demo Script (3 minutes)

## 1. Occupant Journey (about 75 seconds)

1. Sign in with `occupant@greenoffice.io / Occupant2026`.
2. Show Dashboard KPIs, room status cards, and alert dismissal behavior.
3. Navigate to Analytics and switch:
   - room tabs,
   - metric selector,
   - time range controls.
4. Open Reports and point out read-only role notice + disabled export in local mode when backend is unavailable.

## 2. Manager Journey (about 90 seconds)

1. Sign out, then sign in with `facilities@greenoffice.io / GreenOffice2026`.
2. Open Scenario Planner.
3. Apply `Summer Heatwave` preset and explain expected impact.
4. Modify one variable manually (e.g., occupancy pressure), then inject a reading.
5. Return to Dashboard and show changed room metrics and alert levels.

## 3. Operational Evidence (about 45 seconds)

1. Open Reports.
2. Trigger CSV export in API mode.
3. Show telemetry event counters and latest event timestamp.
4. Mention API docs are available at `http://localhost:5281/scalar/v1`.

## Notes

- Keep each step focused on user value and role separation.
- Avoid implementation detail until Q&A.
- If API is down, demonstrate retry controls and local fallback messaging.
