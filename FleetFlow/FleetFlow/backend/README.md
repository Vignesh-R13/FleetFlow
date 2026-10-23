# FleetFlow Backend

Express + MongoDB API for FleetFlow.

## Setup

```bash
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev             # nodemon, http://localhost:5000
```

## Environment Variables

See `.env.example`. Notably:

- `MONGO_URI` — must point at a reachable MongoDB (local `mongod` or Atlas).
  Without it, the server still boots (so routes can be inspected / frontend
  can be developed against validation-only behavior) but every DB-backed
  request will fail with a connection error.
- `SIMULATION_ENABLED` / `SIMULATION_INTERVAL` — control the vessel position
  simulation engine (`services/simulationEngine.js`). Disable it by setting
  `SIMULATION_ENABLED=false` if you want static vessel positions.

## Scripts

- `npm run dev` — start with nodemon
- `npm start` — start in production mode
- `npm run seed` — clear and repopulate the database with demo data
  (`seed/seed.js`) — **requires a reachable MongoDB**
- `npm test` — run the Jest/Supertest suite

## Architecture

```
config/         MongoDB connection
controllers/    Request handlers — one per resource, plus intelligenceController.js
middleware/     JWT auth (protect), role authorization (authorize), error handler
models/         Mongoose schemas
routes/         Express routers — auth-gated via middleware
services/       Cross-cutting logic and the intelligence engines (see below)
sockets/        Socket.IO connection handling
utils/          asyncHandler, JWT generation
validators/     express-validator rule sets
seed/           Demo data generator
tests/          Jest/Supertest suite (39 tests across 3 files)
```

Every route module calls `router.use(protect)` (and `authorize(...roles)`
where relevant) before its handlers — authorization is enforced at the
Express layer, not left to controllers to remember.

## Intelligence Engines

All deterministic and rules-based — explicitly **not** trained ML models.
Each lives in its own service file under `services/`, with configuration
(weights, thresholds, cost assumptions) centralized in that file rather than
scattered as magic numbers elsewhere:

| Service | Powers | Notes |
|---|---|---|
| `fleetHealthService.js` | Command Center Fleet Health, Fleet page Health column | Weighted 0–100 score; weights in `HEALTH_WEIGHTS` |
| `riskScoringService.js` | Command Center Risk Intelligence | 5 rule-based detectors, each with a recommended action |
| `predictiveMaintenanceService.js` | Maintenance page, vessel detail Maintenance tab | Per-vessel risk + explicit contributing-factors list |
| `fuelIntelligenceService.js` | Fuel page | Fleet/vessel comparison, decline-trend warnings, cost estimate |
| `voyageIntelligenceService.js` | Voyages, Voyage Details | On-time stats + per-voyage delay-risk score |
| `profitabilityService.js` | Profitability page, What-If Simulator, Reports | Revenue/cost/profit breakdown; every assumption is a named, overridable constant in `DEFAULT_ASSUMPTIONS` |

`aiAssistant.js` composes several of the above (`buildIntelligenceSnapshot`)
to ground the Command Center's AI Command Advisor — see the Assistant
section below.

## API Reference

See `../documentation/API.md` for the full endpoint list, including the
`/api/intelligence/*` routes these engines power. Every response follows
`{ success: boolean, data?, message?, pagination? }`.

## Automatic Alert Rules

Implemented in `services/alertService.js` and called from the relevant
controllers:

| Rule | Where | Trigger |
|---|---|---|
| Fuel over-consumption | `fuelController.createFuelRecord` | `fuelConsumed > expectedFuelConsumed × 1.15` |
| Low fuel | `fuelController.createFuelRecord` | `fuelRemaining < 20%` of `fuelCapacity` |
| Maintenance overdue | `maintenanceController.syncOverdueStatuses` (runs on every list fetch) | `scheduledDate < now` and status not terminal |
| Voyage delay | `voyageController.updateVoyage` | `status === 'Delayed'` |
| Vessel offline | `simulationEngine.js` tick | No location update within a configurable window |

Alerts are deduplicated via a `dedupeKey` on the `Alert` model — a new alert
for the same condition is only created if no unresolved alert with that key
already exists, and is auto-resolved when the underlying condition clears.

## AI Assistant

`services/aiAssistant.js` powers both the standalone Assistant page and the
Command Center's AI Command Advisor. If `ANTHROPIC_API_KEY` is set, it calls
the real Anthropic API with a snapshot of live fleet data as strict context;
otherwise (or if the API call fails) it falls back to pattern-matching
against that same snapshot. The Command Advisor uses a richer snapshot
(`buildIntelligenceSnapshot`) that includes the Fleet Health and Risk
Intelligence engine output, so its summary is grounded in the same scores
shown in the UI — never separately guessed.

## Known Gaps

- Route-deviation alerts are not implemented (would need a planned-route
  polyline to compare simulated positions against).
- Cargo and Tracking pages don't surface vessel health/risk directly.
