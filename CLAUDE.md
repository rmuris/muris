# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Muris TMS — a Transportation Management System for a logistics company. TypeScript monorepo with a Node.js/Express backend and a React/Vite frontend.

## Commands

```bash
# Install dependencies (run once)
npm install && npm run install:all

# Run both servers (frontend on :5173, backend on :3001)
npm run dev

# Database
npm run db:migrate   # run Prisma migrations
npm run db:seed      # seed sample customers, drivers, vehicles, orders
npm run db:studio    # open Prisma Studio GUI
```

Run only the backend: `cd server && npm run dev`
Run only the frontend: `cd client && npm run dev`

## Architecture

```
muris/
├── server/          Express + Prisma (SQLite for dev)
│   ├── src/
│   │   ├── index.ts          entry point, mounts all routers
│   │   ├── db.ts             Prisma singleton
│   │   ├── routes/           one file per resource
│   │   │   ├── customers.ts
│   │   │   ├── orders.ts
│   │   │   ├── shipments.ts  core logic: assign, status transitions
│   │   │   ├── fleet.ts      drivers + vehicles
│   │   │   └── dashboard.ts  aggregate stats
│   │   └── seed.ts
│   └── prisma/schema.prisma  single source of truth for data model
└── client/          React 18 + Vite + TailwindCSS
    └── src/
        ├── App.tsx            React Router routes
        ├── api/index.ts       all API calls (axios), one object per resource
        ├── types/index.ts     shared TypeScript types mirroring Prisma models
        ├── components/        Layout (sidebar nav), StatusBadge
        └── pages/             Dashboard, Orders, Shipments, ShipmentDetail,
                               Fleet (drivers+vehicles tabs), Customers
```

## Data Model

Core entities and their lifecycle:

- **Customer** → has many **Orders**
- **Order** (PENDING → ASSIGNED → IN_TRANSIT → DELIVERED) → has one **Shipment**
- **Shipment** (PENDING → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED/FAILED) — created by `POST /api/shipments/assign`, which atomically links order + driver + vehicle and marks them IN_USE
- **ShipmentEvent** — append-only log written on every `POST /api/shipments/:id/status` call; powers the timeline UI
- **Driver** (AVAILABLE / ON_ROUTE / OFF_DUTY) and **Vehicle** (AVAILABLE / IN_USE / MAINTENANCE) — status toggled automatically by shipment assignment and delivery

## Key Conventions

- All validation at the route layer via **Zod** schemas before touching Prisma.
- Status transitions are enforced only on the frontend (`TRANSITIONS` map in `ShipmentDetail.tsx`); the backend accepts any valid enum value.
- The `shipments/assign` endpoint wraps four writes in a `prisma.$transaction` to keep order/driver/vehicle status consistent.
- Frontend API calls all live in `client/src/api/index.ts` — no fetch/axios calls scattered in components.
- The Vite dev server proxies `/api` to `localhost:3001`, so no CORS issues in development.

## Development Branches

AI-driven work uses branches prefixed with `claude/` (e.g., `claude/claude-md-docs-MLOi1`).
