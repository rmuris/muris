# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Muris TMS — a Transportation Management System for a logistics company. TypeScript monorepo with a Node.js/Express backend and a React/Vite frontend.

## Commands

```bash
# First run: installs deps, creates server/.env, syncs the DB, seeds it
npm install && npm run setup

# Run both servers (frontend on :5173, backend on :3001)
npm run dev

# Database
npm run db:push      # sync schema.prisma -> SQLite (no migration history)
npm run db:migrate   # create a named migration instead
npm run db:seed      # seed sample customers, drivers, vehicles, orders
npm run db:studio    # open Prisma Studio GUI
```

`server/.env` is gitignored, so a fresh clone has no `DATABASE_URL` and every
Prisma command fails with P1012 until `npm run setup` creates it from
`server/.env.example`. `migrations/` is gitignored too, which is why `db:push`
is the default — plain `prisma migrate dev` would block on an interactive
prompt for a migration name.

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
│   │   │   ├── shipments.ts  assign, status transitions (thin — see services/)
│   │   │   ├── fleet.ts      drivers + vehicles
│   │   │   ├── dashboard.ts  aggregate stats
│   │   │   ├── assistant.ts  JARVIS chat (SSE stream) + session history
│   │   │   └── agents.ts     agent CRUD + dispatch
│   │   ├── services/
│   │   │   └── shipments.ts  lifecycle logic shared by routes and AI tools
│   │   ├── ai/
│   │   │   ├── client.ts     Anthropic SDK singleton, model id
│   │   │   ├── prompt.ts     JARVIS persona + per-agent prompt wrapper
│   │   │   ├── tools.ts      the tool surface (schemas, guards, executors)
│   │   │   ├── runtime.ts    streaming agentic loop; runs assistant + agents
│   │   │   └── offline.ts    keyword fallback core when no API key is set
│   │   └── seed.ts
│   └── prisma/schema.prisma  single source of truth for data model
└── client/          React 18 + Vite + TailwindCSS
    └── src/
        ├── App.tsx            React Router routes
        ├── api/index.ts       all API calls (axios), one object per resource
        ├── types/index.ts     shared TypeScript types mirroring Prisma models
        ├── hooks/useVoice.ts  Web Speech API dictation + synthesis
        ├── components/        Layout (sidebar nav), StatusBadge,
        │                      jarvis/ (ArcReactor, HudBits)
        └── pages/             Dashboard, Orders, Shipments, ShipmentDetail,
                               Fleet (drivers+vehicles tabs), Customers,
                               Jarvis (HUD), Agents (roster + forge)
```

## Data Model

Core entities and their lifecycle:

- **Customer** → has many **Orders**
- **Order** (PENDING → ASSIGNED → IN_TRANSIT → DELIVERED) → has one **Shipment**
- **Shipment** (PENDING → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED/FAILED) — created by `POST /api/shipments/assign`, which atomically links order + driver + vehicle and marks them IN_USE
- **ShipmentEvent** — append-only log written on every `POST /api/shipments/:id/status` call; powers the timeline UI
- **Driver** (AVAILABLE / ON_ROUTE / OFF_DUTY) and **Vehicle** (AVAILABLE / IN_USE / MAINTENANCE) — status toggled automatically by shipment assignment and delivery

AI layer:

- **Agent** — a saved standing order: role, system prompt, an allowed tool list, and an autonomy level (READ_ONLY / COMMAND). Created by the operator on the Agents page or by JARVIS itself via the `create_agent` tool.
- **AgentRun** — one dispatch of an agent, with its output, tool calls and token counts
- **ChatSession** / **ChatMessage** — JARVIS conversation history, so a thread survives a reload

## Key Conventions

- All validation at the route layer via **Zod** schemas before touching Prisma.
- Status transitions are enforced only on the frontend (`TRANSITIONS` map in `ShipmentDetail.tsx`); the backend accepts any valid enum value.
- The `shipments/assign` endpoint wraps four writes in a `prisma.$transaction` to keep order/driver/vehicle status consistent.
- Frontend API calls all live in `client/src/api/index.ts` — no fetch/axios calls scattered in components.
- The Vite dev server proxies `/api` to `localhost:3001`, so no CORS issues in development.

## AI Layer

JARVIS is an Iron Man–style HUD at `/jarvis` that reads and acts on live TMS data, and can build specialist agents on request.

- **Model**: `claude-opus-5` with adaptive thinking, via the official `@anthropic-ai/sdk`. Set `ANTHROPIC_API_KEY` in `server/.env` (see `.env.example`).
- **No key set?** The server falls back to `ai/offline.ts`, a keyword-matched core that still reports live TMS data but cannot reason, dispatch, or author agents. The HUD says so plainly rather than pretending.
- **Tools** live only in `ai/tools.ts`. Each declares a Zod schema, a JSON schema for the wire, and a `mutates` flag. Add tools there and they appear automatically in JARVIS, in the agent builder's palette, and on `/api/assistant/status`.
- **Write gating is enforced server-side** in `executeTool`, never in the UI. Mutating tools are refused unless the caller holds authority — the HUD's COMMAND toggle for JARVIS, or `autonomy: 'COMMAND'` for an agent. A refusal is returned to the model as a tool result so it can explain itself rather than crash.
- **Tools that change records call `services/shipments.ts`**, the same code path the REST routes use, so the AI and the API cannot drift apart.
- Agents may not be assigned `create_agent` or `run_agent`, and `run_agent` refuses at `depth > 0` — only JARVIS forges and delegates, and agents cannot recurse.
- The chat endpoint streams **server-sent events** (`text`, `tool`, `tool_result`, `done`, `error`), which is why `assistant.chat()` uses `fetch` rather than axios.
- HUD styling is scoped under the `.hud` class in `index.css` so it never leaks into the standard TMS pages.

## Development Branches

AI-driven work uses branches prefixed with `claude/` (e.g., `claude/claude-md-docs-MLOi1`).
