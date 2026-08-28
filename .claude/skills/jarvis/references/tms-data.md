# TMS data model

Everything Jarvis reads comes from `scripts/tms.mjs`, which talks to the TMS on
`http://localhost:3001` and falls back to the SQLite file when that server is
down. This file explains what the values mean, so answers interpret them
correctly instead of just echoing them.

## Entities

```
Customer ──< Order ──1:1── Shipment ──< ShipmentEvent
                              │
                        Driver + Vehicle
```

| Entity | Key fields |
|---|---|
| `Customer` | `name`, `email`, `phone`, `address` |
| `Order` | `orderNo` (`ORD-…`), `origin`, `destination`, `weight` (tons), `totalCost`, `status` |
| `Shipment` | `trackingNo` (`TRK-…`), `status`, `estimatedDist` (km), `estimatedTime` (minutes), `pickedUpAt`, `deliveredAt`, `notes` |
| `ShipmentEvent` | `status`, `note`, `location`, `createdAt` — append-only |
| `Driver` | `name`, `licenseNo`, `phone`, `status` |
| `Vehicle` | `plate`, `make`, `model`, `year`, `capacity` (tons), `mileage`, `lastService`, `status` |

An order has at most one shipment. A shipment always has an order.

## Status lifecycles

**Order** — `PENDING` → `ASSIGNED` → `IN_TRANSIT` → `DELIVERED`, or `CANCELLED`.

**Shipment** — `PENDING` → `PICKED_UP` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`, or `FAILED`.

**Driver** — `AVAILABLE` / `ON_ROUTE` / `OFF_DUTY`.
**Vehicle** — `AVAILABLE` / `IN_USE` / `MAINTENANCE`.

"Active" in the brief means a shipment in `PICKED_UP`, `IN_TRANSIT`, or
`OUT_FOR_DELIVERY`.

## What to know before interpreting a status

- **Status transitions are only enforced in the UI.** The `TRANSITIONS` map in
  `client/src/pages/ShipmentDetail.tsx` decides what a user can click; the
  backend accepts any valid enum value. So an out-of-order history (delivered
  without a pickup, back-to-`PENDING`) is possible and means someone corrected a
  record by hand — worth flagging, not worth trusting silently.
- **Assignment is atomic.** `POST /api/shipments/assign` creates the shipment
  and flips order → `ASSIGNED`, driver → `ON_ROUTE`, vehicle → `IN_USE` in one
  transaction. A shipment with no driver or no vehicle therefore did *not* come
  from that endpoint — treat it as a data problem worth surfacing.
- **Delivery frees the resources.** Marking a shipment `DELIVERED` sets
  `deliveredAt`, flips the order to `DELIVERED`, and returns driver and vehicle
  to `AVAILABLE`. A driver stuck on `ON_ROUTE` with no active shipment means a
  delivery was never recorded.
- **`FAILED` frees nothing.** A failed shipment leaves the driver `ON_ROUTE` and
  the unit `IN_USE`. Every `FAILED` load is holding capacity hostage — that is
  why the brief lists it first.
- **`updatedAt` is the movement signal.** There is no GPS. The only evidence a
  load is progressing is a status change, so `updatedAt` age is the proxy for
  "has anyone touched this". Over 24h on an active load is the stale threshold.
- **`estimatedDist` and `estimatedTime` are placeholders.** `estimateRoute()` in
  `server/src/routes/shipments.ts` returns random values — it is a stub for a
  real routing API. **Never quote them to a customer as an ETA.** They are only
  useful as rough ordering.

## `sql` recipes

The command uses the SQLite backend and refuses anything that isn't a single
`SELECT`/`WITH`. Table names match the Prisma models; `Order` is a SQL reserved
word and must be quoted.

Dates are stored as epoch milliseconds, so compare against
`strftime('%s','now') * 1000`.

```sql
-- Revenue by customer, delivered loads only
SELECT c.name, COUNT(*) AS loads, SUM(o.totalCost) AS revenue
  FROM "Order" o JOIN Customer c ON c.id = o.customerId
 WHERE o.status = 'DELIVERED'
 GROUP BY c.id ORDER BY revenue DESC;

-- Average hours from pickup to delivery, by customer
SELECT c.name, ROUND(AVG((s.deliveredAt - s.pickedUpAt) / 3600000.0), 1) AS avgHours
  FROM Shipment s
  JOIN "Order" o ON o.id = s.orderId
  JOIN Customer c ON c.id = o.customerId
 WHERE s.deliveredAt IS NOT NULL AND s.pickedUpAt IS NOT NULL
 GROUP BY c.id;

-- Loads delivered in the last 7 days
SELECT s.trackingNo, c.name, s.destination, s.deliveredAt
  FROM Shipment s
  JOIN "Order" o ON o.id = s.orderId
  JOIN Customer c ON c.id = o.customerId
 WHERE s.deliveredAt >= (strftime('%s','now') - 7*86400) * 1000
 ORDER BY s.deliveredAt DESC;

-- Drivers marked ON_ROUTE with no active shipment (stuck records)
SELECT d.name, d.status FROM Driver d
 WHERE d.status = 'ON_ROUTE'
   AND NOT EXISTS (
     SELECT 1 FROM Shipment s
      WHERE s.driverId = d.id
        AND s.status IN ('PENDING','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY'));

-- Utilization: shipments per unit
SELECT v.plate, v.status, COUNT(s.id) AS loads
  FROM Vehicle v LEFT JOIN Shipment s ON s.vehicleId = v.id
 GROUP BY v.id ORDER BY loads DESC;
```

## Making a change

Jarvis never writes. When a change is needed, hand Rogelio the exact action:

| Change | How |
|---|---|
| Assign a load | Shipments page → Assign, or `POST /api/shipments/assign` with `{orderId, driverId, vehicleId}` |
| Move a shipment's status | Shipment detail page → status buttons, or `POST /api/shipments/:id/status` with `{status, note?, location?}` |
| Create or edit an order | Orders page, or `POST`/`PUT /api/orders` |
| Driver or unit status | Fleet page, or `PUT /api/fleet/drivers/:id` / `PUT /api/fleet/vehicles/:id` |
