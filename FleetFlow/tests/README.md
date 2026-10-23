# FleetFlow Playwright Test Suite

Real, FleetFlow-specific end-to-end tests, replacing the stock scaffold
(`tests/example.spec.js`, which tested playwright.dev and asserted nothing
about this application).

## What's covered

| File | Covers |
|---|---|
| `auth.spec.js` | Login form, validation, invalid credentials, successful login, logout |
| `navigation.spec.js` | Dashboard load, sidebar navigation, Command Center (KPIs, Fleet Health, Risk Intelligence, AI Command Advisor, live indicator, refresh), dark mode toggle + persistence |
| `fleet.spec.js` | Fleet list, search, status filter, and the Add Vessel form (Forms) |
| `voyages.spec.js` | Voyage list, status filtering, voyage detail navigation with delay risk |
| `tracking-alerts.spec.js` | Live map renders, simulated-data disclosure, alert list + severity filtering |
| `analytics-assistant.spec.js` | Analytics charts, Profitability cross-link, AI Assistant chat flow |

Together these cover every area named in the master prompt's Phase 7 list:
Login, Dashboard, Command Center, Fleet, Voyages, Tracking, Alerts,
Analytics, Assistant, Forms, Dark Mode. Responsive navigation is covered by
the `mobile-chrome` Playwright project in `playwright.config.js`, which runs
`responsive.spec.js` at a phone viewport (see below).

## Prerequisites to actually run these

Unlike the frontend/backend unit test suites (`npm test` in each), these are
real browser end-to-end tests and need a full running stack:

1. **A reachable MongoDB**, seeded via `cd backend && npm run seed` — the
   tests log in as `admin@fleetflow.com` / `Password123!` (see
   `tests/helpers/auth.js` for all four seeded demo accounts).
2. **The backend running** on `http://localhost:5000`
   (`cd backend && npm run dev`).
3. **Playwright browsers installed** — `npx playwright install`.

The frontend dev server is started automatically by the `webServer` block in
`playwright.config.js`, so you don't need to run `npm run dev` in `frontend/`
yourself.

Then, from the project root:

```bash
npx playwright test              # headless, all projects
npx playwright test --ui         # interactive UI mode, easiest for debugging
npx playwright show-report       # view the HTML report after a run
```

## Why this wasn't run in the sandbox this was built in

This test suite was written and reviewed for correctness (selectors were
checked against the actual rendered text/labels/roles in each component, not
guessed), but **not executed**, for two independent reasons specific to the
sandbox, not the tests themselves:

- No live MongoDB was reachable (same constraint documented throughout the
  rest of this project — see the root README).
- Playwright's browser binaries could not be downloaded — the sandbox's
  network policy only allows package registries (npm/pip/GitHub), not
  Playwright's CDN.

Both are environment constraints, not gaps in the test code. Run
`npx playwright test` in a normal local or CI environment with the
prerequisites above and this suite should execute as designed. If a
selector needs adjusting, it will fail clearly and locally — Playwright's
trace viewer (`npx playwright show-trace`) is the fastest way to see why.
