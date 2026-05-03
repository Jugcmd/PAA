# Performance Evidence

This file captures lightweight, reproducible performance evidence for the prototype.

## Build Artifact Snapshot

Latest production build output:

| Asset                     |      Size |     Gzip |
| ------------------------- | --------: | -------: |
| `dist/index.html`         |   0.45 kB |  0.29 kB |
| `dist/assets/index-*.css` |  23.38 kB |  4.76 kB |
| `dist/assets/index-*.js`  | 274.26 kB | 84.93 kB |

## UX Performance Checks

- First paint: fast on local dev hardware (single-page shell + route-level rendering).
- Route navigation: instant (client-side routing, no full page reload).
- Telemetry updates: continuous while stream is live; stale-data indicator appears when freshness threshold is exceeded.

## How To Reproduce

1. Build UI package:
   - `pnpm --filter @programmingandappps/ui build`
2. Capture final bundle sizes from the Vite output.
3. Run dev mode and validate route transitions:
   - `pnpm --filter @programmingandappps/ui dev`

## Interpretation

The current bundle profile supports near real-time dashboard UX for this assignment scope. Further production optimization could include route-level code splitting and chart virtualization for very large histories.
