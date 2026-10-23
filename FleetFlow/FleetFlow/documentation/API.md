# FleetFlow API Reference

Base URL: `http://localhost:5000/api` (or your deployed backend URL).

All responses: `{ "success": boolean, "data"?: ..., "message"?: string, "pagination"?: {...} }`.

Authenticated routes require `Authorization: Bearer <token>`.

## Auth

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | Self-registration is forced to `CAPTAIN` role |
| POST | `/auth/login` | Public | |
| POST | `/auth/logout` | Authenticated | Stateless — client discards the token |
| GET | `/auth/me` | Authenticated | |

## Vessels

| Method | Path | Access |
|---|---|---|
| GET | `/vessels` | Authenticated — query: `search, status, type, flag, sort, page, limit` |
| GET | `/vessels/:id` | Authenticated |
| POST | `/vessels` | ADMIN, FLEET_MANAGER |
| PUT | `/vessels/:id` | ADMIN, FLEET_MANAGER |
| DELETE | `/vessels/:id` | ADMIN |
| GET | `/vessels/:id/locations` | Authenticated |
| POST | `/vessels/:id/location` | ADMIN, FLEET_MANAGER, CAPTAIN |

## Voyages

| Method | Path | Access |
|---|---|---|
| GET | `/voyages` | Authenticated — query: `search, status, vessel, sort, page, limit` |
| GET | `/voyages/:id` | Authenticated |
| POST | `/voyages` | ADMIN, FLEET_MANAGER |
| PUT | `/voyages/:id` | ADMIN, FLEET_MANAGER, CAPTAIN |
| DELETE | `/voyages/:id` | ADMIN, FLEET_MANAGER |

## Fuel

| Method | Path | Access |
|---|---|---|
| GET | `/fuel` | Authenticated — query: `vessel, voyage, page, limit` |
| GET | `/fuel/:vesselId` | Authenticated — history + efficiency summary |
| POST | `/fuel` | ADMIN, FLEET_MANAGER, CAPTAIN |

## Maintenance

| Method | Path | Access |
|---|---|---|
| GET | `/maintenance` | Authenticated — query: `vessel, status, priority, page, limit` |
| GET | `/maintenance/:id` | Authenticated |
| POST | `/maintenance` | ADMIN, MAINTENANCE_MANAGER, FLEET_MANAGER |
| PUT | `/maintenance/:id` | ADMIN, MAINTENANCE_MANAGER, FLEET_MANAGER |
| DELETE | `/maintenance/:id` | ADMIN, MAINTENANCE_MANAGER |

## Cargo

| Method | Path | Access |
|---|---|---|
| GET | `/cargo` | Authenticated — query: `voyage, status, page, limit` |
| GET | `/cargo/:id` | Authenticated |
| POST | `/cargo` | ADMIN, FLEET_MANAGER |
| PUT | `/cargo/:id` | ADMIN, FLEET_MANAGER |
| DELETE | `/cargo/:id` | ADMIN, FLEET_MANAGER |

## Alerts

| Method | Path | Access |
|---|---|---|
| GET | `/alerts` | Authenticated — query: `severity, vessel, status, page, limit` |
| PUT | `/alerts/:id/read` | Authenticated |
| PUT | `/alerts/:id/resolve` | Authenticated |

## Analytics

| Method | Path | Notes |
|---|---|---|
| GET | `/analytics/dashboard` | Fleet/voyage/maintenance KPIs |
| GET | `/analytics/fuel` | History + per-vessel efficiency — optional `vessel` query |
| GET | `/analytics/voyages` | Status breakdown + completion rate |
| GET | `/analytics/maintenance` | By category, by status, total cost |
| GET | `/analytics/performance` | Requires `voyageId` query — 0–100 score breakdown |

## Reports (CSV / PDF export)

| Method | Path | Query |
|---|---|---|
| GET | `/reports/fleet` | `?format=csv\|pdf` (default csv) |
| GET | `/reports/voyages` | `?format=csv\|pdf` |
| GET | `/reports/maintenance` | `?format=csv\|pdf` |
| GET | `/reports/fuel` | `?format=csv\|pdf` |
| GET | `/reports/profitability` | `?format=csv\|pdf` — reuses the same profitability engine as `/intelligence/profitability`, so it can never disagree with what's shown on screen |

CSV returns `Content-Type: text/csv`; PDF returns `Content-Type: application/pdf`. Both set `Content-Disposition: attachment`.

## Users (admin only)

| Method | Path |
|---|---|
| GET | `/users` |
| PUT | `/users/:id` | body: `{ role?, isActive? }` |

## Intelligence

All deterministic, rules-based calculations — see `backend/README.md` for
which service powers each one. None of these are trained ML models.

| Method | Path | Notes |
|---|---|---|
| GET | `/intelligence/fleet-health` | Fleet average + distribution + per-vessel score/breakdown |
| GET | `/intelligence/risks` | Fleet-wide risk list, ranked highest-first, each with a recommended action |
| GET | `/intelligence/command-center` | Combined payload for the Command Center: KPIs, fleet status, health, top risks, voyage summary — one call instead of many |
| GET | `/intelligence/maintenance` | Fleet-wide predictive maintenance risk, ranked |
| GET | `/intelligence/maintenance/:vesselId` | Single-vessel risk with contributing factors + recommended action |
| GET | `/intelligence/fuel` | `?fuelPricePerTon=` optional override. Fleet totals, vessel comparison, efficiency trend, warnings |
| GET | `/intelligence/voyages` | Voyage performance summary + per-voyage delay risk |
| GET | `/intelligence/profitability` | Fleet-wide profitability, ranked by profit. Accepts assumption overrides as query params (see below) |
| GET | `/intelligence/profitability/:voyageId` | Single voyage breakdown — also the endpoint the What-If Simulator calls |

**Profitability query overrides** (used by the What-If Simulator, all optional):
`revenuePerNauticalMile`, `fuelPricePerTon`, `crewCostPerDay`,
`portChargePerCall`, `maintenanceAllocationRate`, `otherCostRate`,
`distance`, `fuelConsumed`, `operatingCostMultiplier`. Every response
includes the `assumptions` actually used — never hidden.

## AI Assistant

| Method | Path | Notes |
|---|---|---|
| POST | `/assistant/ask` | body: `{ question: string }`. Returns `{ answer, mode }` where `mode` is `"ai"`, `"rule-based"`, or `"rule-based-fallback"` (AI call failed, degraded gracefully). Uses `ANTHROPIC_API_KEY` if set on the backend; otherwise pattern-matches the question against live fleet data. |
| GET | `/assistant/insights` | Returns a short list of auto-generated, clearly-labeled-as-estimate observations (fuel outliers, overdue maintenance, delays) derived from real DB data. |
| GET | `/assistant/command-summary` | Powers the Command Center's AI Command Advisor. Same `mode` semantics as `/ask`, grounded in a richer snapshot that includes Fleet Health and Risk Intelligence scores. |

## Socket.IO Events

Connect to the backend's base URL (not `/api`). Events emitted by the server:

- `vessel:position` — `{ vesselId, name, latitude, longitude, speed, heading, simulated: true, timestamp }`, emitted by the simulation engine tick and by `POST /vessels/:id/location`.
- `alert:new` — the full `Alert` document, emitted whenever `alertService.raiseAlert` creates a new (non-duplicate) alert.
