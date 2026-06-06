# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Muris TMS — a Transportation Management System for a logistics company. TypeScript monorepo with a Node.js/Express backend and a React/Vite frontend. No external services; uses SQLite for development.

## Commands

```bash
# Install dependencies (run once)
npm install && npm run install:all

# Run both servers concurrently (frontend :5173, backend :3001)
npm run dev

# Database
npm run db:migrate   # run Prisma migrations
npm run db:seed      # seed sample customers, drivers, vehicles, orders
npm run db:studio    # open Prisma Studio GUI
```

Run only the backend: `cd server && npm run dev`
Run only the frontend: `cd client && npm run dev`

Build the server: `cd server && npm run build` (outputs to `server/dist/`)

## Architecture

```
muris/
├── package.json          root monorepo (concurrently dev, db:* scripts)
├── server/               Express + Prisma (SQLite for dev)
│   ├── src/
│   │   ├── index.ts          entry point, mounts all routers, CORS for :5173
│   │   ├── db.ts             Prisma singleton
│   │   ├── routes/
│   │   │   ├── customers.ts  CRUD
│   │   │   ├── orders.ts     CRUD + status filter
│   │   │   ├── shipments.ts  core logic: assign, status transitions, tracking
│   │   │   ├── fleet.ts      drivers + vehicles CRUD
│   │   │   └── dashboard.ts  aggregate stats
│   │   └── seed.ts           sample data (2 customers, 2 drivers, 3 vehicles, 3 orders)
│   └── prisma/
│       └── schema.prisma     single source of truth for data model
└── client/               React 18 + Vite + TailwindCSS
    └── src/
        ├── main.tsx           React DOM entry
        ├── App.tsx            React Router v6 routes
        ├── index.css          Tailwind base/components/utilities
        ├── api/index.ts       all API calls (axios), one object per resource
        ├── types/index.ts     TypeScript interfaces mirroring Prisma models
        ├── components/
        │   ├── Layout.tsx     sidebar nav (NavLink active highlighting)
        │   └── StatusBadge.tsx status → TailwindCSS color mapping
        └── pages/
            ├── Dashboard.tsx      6 stat cards + 5 recent shipments
            ├── Orders.tsx         list + status filter + create + delete PENDING
            ├── Shipments.tsx      list + status filter + assign form
            ├── ShipmentDetail.tsx timeline, status controls (TRANSITIONS map)
            ├── Fleet.tsx          tabbed: Drivers | Vehicles, full CRUD
            └── Customers.tsx      list + create/edit + delete
```

## Data Model

Core entities and their lifecycle (all IDs are CUIDs):

- **Customer** → has many **Orders**
- **Driver** — AVAILABLE / ON_ROUTE / OFF_DUTY; optional one-to-one with **Vehicle**
- **Vehicle** — AVAILABLE / IN_USE / MAINTENANCE; optional one-to-one with **Driver**
- **Order** (PENDING → ASSIGNED → IN_TRANSIT → DELIVERED | CANCELLED) → has one optional **Shipment**
- **Shipment** (PENDING → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED | FAILED)
  - Created by `POST /api/shipments/assign` — atomically links order + driver + vehicle
  - Stores `routeWaypoints` as an optional JSON string, `estimatedDist` (km), `estimatedTime` (minutes)
  - Timestamps: `pickedUpAt`, `deliveredAt` set on delivery
- **ShipmentEvent** — append-only log; one row per `POST /api/shipments/:id/status` call; powers the timeline UI

### Status transitions (enforced frontend-only via `TRANSITIONS` map in `ShipmentDetail.tsx`)

```
Shipment:  PENDING → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
                                                                 ↘ FAILED
```

The backend accepts any valid enum value — the transition guard lives only in the frontend.

## API Endpoints

All routes are mounted under `/api`.

### `GET /api/dashboard`
Returns `{ stats, recentShipments }`. Stats: totalOrders, pendingOrders, activeShipments, deliveredToday, availableDrivers, availableVehicles. Uses `Promise.all` for parallel queries. Recent shipments: 5 most recent.

### `/api/customers`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | All customers with `_count.orders`, ordered newest-first |
| GET | `/:id` | Customer + all orders |
| POST | `/` | Zod: name, email, phone?, address? |
| PUT | `/:id` | Partial update |
| DELETE | `/:id` | No cascade guard — remove manually if needed |

### `/api/orders`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Filter by `?status=` and/or `?customerId=` |
| GET | `/:id` | Order + customer + shipment (with driver, vehicle, events) |
| POST | `/` | Zod: customerId, origin, destination, weight (>0), description?, totalCost?; auto-generates `orderNo` |
| PUT | `/:id` | Partial update |
| DELETE | `/:id` | — |

### `/api/shipments`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Filter by `?status=`; includes order, driver, vehicle |
| GET | `/:id` | Full relations + events ordered by createdAt asc |
| GET | `/track/:trackingNo` | Public tracking endpoint |
| POST | `/assign` | **Critical**: wraps 4 writes in `prisma.$transaction` (create Shipment, order→ASSIGNED, driver→ON_ROUTE, vehicle→IN_USE) |
| POST | `/:id/status` | Updates status, appends ShipmentEvent; on DELIVERED: sets timestamps, driver→AVAILABLE, vehicle→AVAILABLE, order→DELIVERED |

### `/api/fleet`
| Method | Path | Notes |
|--------|------|-------|
| GET | `/drivers` | All drivers with assigned vehicle |
| POST | `/drivers` | Zod: name, email, phone?, licenseNo |
| PUT | `/drivers/:id` | Partial update |
| DELETE | `/drivers/:id` | — |
| GET | `/vehicles` | All vehicles with assigned driver |
| POST | `/vehicles` | Zod: plate, make, model, year, capacity, mileage?; `lastService` accepted as ISO datetime string |
| PUT | `/vehicles/:id` | Partial update |
| DELETE | `/vehicles/:id` | — |

## Key Conventions

### Backend
- All route-layer validation uses **Zod** schemas before any Prisma call.
- `prisma.$transaction` in `shipments/assign` keeps order/driver/vehicle status consistent.
- No test suite exists — validate logic manually via seed data and Prisma Studio.
- Server runs via `tsx watch` (hot-reload in dev), built with `tsc` for production.

### Frontend
- **All HTTP calls** live in `client/src/api/index.ts` — never call `fetch`/`axios` directly in components.
- **State**: component-level `useState` only; no Redux, Context, or external state library.
- **Types**: all interfaces are in `client/src/types/index.ts` and mirror the Prisma schema.
- Vite proxies `/api` → `http://localhost:3001`, so no CORS handling needed in dev.
- `StatusBadge` color map: yellow=PENDING, blue=ASSIGNED/ON_ROUTE/IN_USE, cyan=PICKED_UP, indigo=IN_TRANSIT, purple=OUT_FOR_DELIVERY, green=DELIVERED/AVAILABLE, red=FAILED/CANCELLED, orange=MAINTENANCE, gray=OFF_DUTY.

### Adding a new resource
1. Add the model to `server/prisma/schema.prisma` and run `npm run db:migrate`.
2. Create `server/src/routes/<resource>.ts` with Zod validation.
3. Mount the router in `server/src/index.ts`.
4. Add the API object to `client/src/api/index.ts`.
5. Add TypeScript interfaces to `client/src/types/index.ts`.
6. Create the page component in `client/src/pages/` and add the route in `App.tsx`.
7. Add a nav entry to `Layout.tsx`.

## Development Branches

AI-driven work uses branches prefixed with `claude/` (e.g., `claude/claude-md-docs-iMVDg`).
