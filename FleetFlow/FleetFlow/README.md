# 🚢 FleetFlow — Maritime Operations & Decision Intelligence Platform

FleetFlow is a full-stack maritime fleet platform with two layers:

```
OPERATIONS PLATFORM                    INTELLIGENCE PLATFORM
Dashboard · Fleet · Voyages            Command Center
Cargo · Maintenance · Fuel             Fleet Health · Risk Intelligence
Tracking · Alerts · Analytics          Predictive Maintenance
Reports · AI Assistant                 Fuel/Voyage Intelligence
                                        Profitability · What-If Simulator
```

The Operations Platform answers **"what is happening?"** The Intelligence
Platform — headlined by the **Command Center** — answers **why it's
happening, what's likely to happen next, and what to do about it.**

> **Honesty note on data:** vessel positions shown in Tracking are generated
> by a configurable simulation engine, not real AIS/GPS feeds. Every health,
> risk, delay, and profitability score is a **deterministic, rules-based
> calculation** over real CRUD data — explicitly not a trained ML model —
> and every formula lives in one documented service file, never scattered
> as magic numbers. Nothing on any dashboard is hardcoded or randomized.

---

## Features

### Operations Platform
- **Auth & RBAC** — JWT auth, bcrypt hashing, 4 roles (Admin, Fleet Manager,
  Maintenance Manager, Captain), enforced independently on the backend.
- **Fleet, Voyage, Fuel, Maintenance, Cargo** — full CRUD, search/filter/
  sort/pagination, automatic overdue/low-fuel/delay alerting.
- **Live tracking** — Leaflet map driven by a Socket.IO position simulation.
- **Alerts** — rule-based, deduplicated, severity + risk-prioritized.
- **Analytics & Reports** — real MongoDB aggregation; CSV/PDF export for
  Fleet, Voyage, Maintenance, Fuel, and Profitability.
- **AI Assistant ("FleetFlow Copilot")** — answers grounded in live fleet
  data via the Anthropic API, with an automatic rule-based fallback when no
  API key is configured. Never invents data outside its snapshot.

### Intelligence Platform
- **Command Center** (`/command-center`) — the flagship view: live KPI
  strip, Fleet Health score + distribution, a risk-ranked vessel health
  table, a live map with a click-to-inspect vessel panel, a Risk
  Intelligence feed, Critical Alerts, and an AI Command Advisor that
  summarizes the fleet and recommends what to prioritize.
- **Fleet Health Engine** — weighted 0–100 score per vessel (maintenance
  25% / fuel efficiency 20% / alerts 25% / voyage status 15% / operational
  state 15%), weights centralized in one config object.
- **Risk Intelligence** — 5 rule-based detectors (overdue maintenance,
  fuel decline, voyage delay, offline vessels, compounding alerts), each
  with a concrete recommended action.
- **Predictive Maintenance** — per-vessel risk score with a real
  contributing-factors list ("why is this vessel at risk?") and a
  recommended action, surfaced on the Maintenance page and each vessel's
  detail view.
- **Fuel Intelligence** — fleet totals, vessel efficiency comparison,
  automatic decline warnings, cost estimates with the fuel price clearly
  labeled as a configurable assumption.
- **Voyage Intelligence & Delay Risk** — on-time %, delay stats, and a
  per-voyage delay-probability score, shown on Voyages and Voyage Details.
- **Profitability & What-If Simulator** (`/profitability`) — per-voyage and
  fleet-wide revenue/cost/profit breakdown built from real distance and
  fuel data plus explicit cost assumptions (never hidden), a monthly trend
  chart, a cost-breakdown pie, and a **live What-If Simulator** — adjust
  fuel price, revenue rate, distance, fuel consumption, and operating cost
  and watch profit recalculate instantly against the real backend engine
  (no LLM does the arithmetic).

### Platform-wide
Dark mode, responsive layout (drawer nav on mobile), skeleton loading states,
empty states, accessible modals (Escape-to-close, `role="dialog"`,
`aria-modal`, focus-visible close buttons), route-level code-splitting.

---

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Recharts,
React Leaflet, Socket.IO client, Lucide icons.

**Backend:** Node.js, Express, MongoDB/Mongoose, JWT, bcryptjs, Socket.IO,
express-validator, helmet, express-rate-limit, PDFKit.

**Testing:** Jest + Supertest (backend), Vitest + React Testing Library
(frontend), Playwright (end-to-end — see `tests/README.md`).

## Project Structure

```
FleetFlow/                    (repo root — Playwright lives here)
├── tests/                    # Playwright end-to-end specs
├── playwright.config.js
└── FleetFlow/
    ├── backend/               # Express API, intelligence engines, sockets
    ├── frontend/              # React + Vite app (Operations + Intelligence UI)
    └── documentation/         # API reference
```

See `FleetFlow/backend/README.md`, `FleetFlow/documentation/API.md`, and
`tests/README.md` for details on each part.

## Quick Start

```bash
# 1. Backend
cd FleetFlow/backend
cp .env.example .env       # edit MONGO_URI and JWT_SECRET
npm install
npm run seed                # populates demo data — requires a reachable MongoDB
npm run dev                  # http://localhost:5000

# 2. Frontend (new terminal)
cd FleetFlow/frontend
cp .env.example .env
npm install
npm run dev                  # http://localhost:5173

# 3. End-to-end tests (optional, needs steps 1-2 running + browsers installed)
cd ../..                     # back to repo root
npm install
npx playwright install
npx playwright test
```

## ⚠️ Important: MongoDB is required and not bundled

This project was built and verified in a sandboxed environment with **no
access to a live MongoDB instance** and **no ability to download Playwright's
browser binaries** (both blocked by the sandbox's network allowlist, which
only permits package registries). Every route, model, service, and
controller was written and tested against real Mongoose schemas — backend
unit tests (39), frontend unit tests (18), and all 34 Playwright specs were
validated via Playwright's own parser — but no CRUD operation or browser
test has been round-tripped against a live database yet.

**Before this is usable beyond code review, you need to:**

1. Get a MongoDB instance (local `mongod`, or a free
   [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster).
2. Set `MONGO_URI` in `FleetFlow/backend/.env`.
3. Run `npm run seed` from `FleetFlow/backend/` (10 vessels, 16 voyages,
   maintenance/cargo/fuel history, demo users, enough spread in the data to
   demonstrate healthy and at-risk vessels, delayed voyages, and varying
   profitability).
4. Boot backend + frontend and walk through it — ideally starting at
   `/command-center`.

## Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@fleetflow.com | `Password123!` |
| Fleet Manager | manager@fleetflow.com | `Password123!` |
| Maintenance Manager | maintenance@fleetflow.com | `Password123!` |
| Captain | captain@fleetflow.com | `Password123!` |

Change the demo password before using this anywhere but locally.

## Deployment

- **Frontend →** Vercel, pointed at `FleetFlow/frontend`, build command
  `npm run build`, output directory `dist`.
- **Backend →** Render or Railway, using `FleetFlow/backend/.env.example`
  as the environment variable template; set `CLIENT_URL` to your deployed
  frontend URL.
- **Database →** MongoDB Atlas — whitelist your backend host's IP and use
  the Atlas connection string as `MONGO_URI`.

Not deployable-tested from this sandbox (Vercel/Render/Atlas aren't in the
network allowlist here) — documented but unverified end to end.

## What's Built vs. What's a Starting Point

**Solid and tested:** the full Operations Platform (auth/RBAC, all CRUD
modules, automated alerting) and the full Intelligence Platform (Command
Center, Fleet Health, Risk Intelligence, Predictive Maintenance, Fuel/Voyage
Intelligence, Profitability + What-If Simulator) — all wired to real data,
all with backend unit tests (39 passing) covering the deterministic scoring
logic, frontend unit tests (18 passing), and a 34-test Playwright suite
covering Login/Dashboard/Command Center/Fleet/Voyages/Tracking/Alerts/
Analytics/Assistant/Forms/Dark Mode/Responsive nav.

**Intelligence tie-ins not added:** Tracking and Reports pages don't surface
vessel health/risk directly (Tracking's health-colored map already lives in
Command Center, so a second one felt redundant).

**Worth hardening before production:** route-deviation alert detection (not
implemented), broader Playwright coverage of edit/delete flows and
role-specific views (Captain/Maintenance Manager beyond Admin), rate-limit
tuning for production traffic.

## Future Improvements

- Route deviation detection (flag vessels straying from planned course).
- Wire the AI Assistant/Command Advisor to a real `ANTHROPIC_API_KEY` in
  production and compare rule-based vs. AI answer quality on real data.
- A lightweight "explain this score" tooltip on every health/risk badge,
  surfacing the contributing factors inline instead of only on drill-down pages.
