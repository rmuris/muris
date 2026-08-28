#!/usr/bin/env node
/**
 * tms.mjs — read-only query tool over the Muris TMS.
 *
 * Jarvis uses this instead of writing ad-hoc requests or SQL each time, so
 * answers always come from the live system rather than from memory.
 *
 * Data source, in order:
 *   1. the local API at http://localhost:3001 (the running TMS server)
 *   2. the SQLite database directly, when the server is not up
 * Either way the shape of the output is identical.
 *
 * Usage:
 *   node tms.mjs brief
 *   node tms.mjs orders [--status PENDING] [--customer acme] [--limit 20]
 *   node tms.mjs shipments [--status IN_TRANSIT] [--stale 24] [--limit 20]
 *   node tms.mjs shipment <trackingNo | id>
 *   node tms.mjs fleet
 *   node tms.mjs customers
 *   node tms.mjs search <term>
 *   node tms.mjs sql "SELECT ..."        (SQLite only)
 *
 * Global flags:
 *   --json          emit raw JSON instead of formatted text
 *   --api URL       API base URL (default http://localhost:3001, or $MURIS_API)
 *   --db PATH       force the SQLite backend against this file
 *   --sqlite        force the SQLite backend
 *   --limit N
 *
 * Nothing here writes: the API is only ever read with GET, every SQLite handle
 * is opened read-only, and `sql` rejects anything that is not a SELECT/WITH.
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// node:sqlite is flagged experimental and warns on every run; it is stable
// enough for read-only queries and the noise obscures the actual output.
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (!(w.name === 'ExperimentalWarning' && /SQLite/i.test(w.message))) console.error(w.stack ?? w.message);
});

const DEFAULT_API = process.env.MURIS_API || 'http://localhost:3001';
const ACTIVE_SHIPMENT_STATUSES = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

/**
 * The API serves ISO strings; SQLite holds epoch milliseconds (and older rows
 * can hold ISO text). Accept all three.
 */
function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (/^-?\d+$/.test(String(v))) return new Date(Number(v));
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDate(v) {
  const d = toDate(v);
  return d ? d.toISOString().slice(0, 16).replace('T', ' ') : '—';
}

function hoursSince(v) {
  const d = toDate(v);
  return d ? (Date.now() - d.getTime()) / 36e5 : null;
}

function ago(v) {
  const h = hoursSince(v);
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

function money(v) {
  if (v === null || v === undefined) return '—';
  return `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const has = (haystack, needle) => String(haystack ?? '').toLowerCase().includes(needle);

// ---------------------------------------------------------------------------
// Backend: the local API
// ---------------------------------------------------------------------------

async function getJson(base, path, timeoutMs = 8000) {
  const res = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

async function apiReachable(base) {
  try {
    await getJson(base, '/api/dashboard', 1500);
    return true;
  } catch {
    return false;
  }
}

/** Flatten the API's nested payloads into the shapes the commands expect. */
function flattenShipment(s) {
  const o = s.order ?? {};
  const c = o.customer ?? {};
  const d = s.driver ?? {};
  const v = s.vehicle ?? {};
  return {
    id: s.id,
    trackingNo: s.trackingNo,
    orderId: s.orderId,
    driverId: s.driverId,
    vehicleId: s.vehicleId,
    status: s.status,
    origin: s.origin,
    destination: s.destination,
    estimatedDist: s.estimatedDist,
    estimatedTime: s.estimatedTime,
    pickedUpAt: s.pickedUpAt,
    deliveredAt: s.deliveredAt,
    notes: s.notes,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    orderNo: o.orderNo ?? null,
    orderStatus: o.status ?? null,
    weight: o.weight ?? null,
    totalCost: o.totalCost ?? null,
    description: o.description ?? null,
    customerName: c.name ?? null,
    customerEmail: c.email ?? null,
    customerPhone: c.phone ?? null,
    driverName: d.name ?? null,
    driverPhone: d.phone ?? null,
    driverEmail: d.email ?? null,
    plate: v.plate ?? null,
    make: v.make ?? null,
    model: v.model ?? null,
    capacity: v.capacity ?? null,
  };
}

function flattenOrder(o) {
  const c = o.customer ?? {};
  const s = o.shipment ?? {};
  return {
    id: o.id,
    orderNo: o.orderNo,
    customerId: o.customerId,
    origin: o.origin,
    destination: o.destination,
    weight: o.weight,
    description: o.description,
    status: o.status,
    totalCost: o.totalCost,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    customerName: c.name ?? null,
    customerEmail: c.email ?? null,
    trackingNo: s.trackingNo ?? null,
    shipmentStatus: s.status ?? null,
  };
}

function apiBackend(base) {
  return {
    label: base,
    orders: () => getJson(base, '/api/orders').then((rows) => rows.map(flattenOrder)),
    shipments: () => getJson(base, '/api/shipments').then((rows) => rows.map(flattenShipment)),
    drivers: () =>
      getJson(base, '/api/fleet/drivers').then((rows) =>
        rows.map((d) => ({ ...d, plate: d.vehicle?.plate ?? null, vehicle: undefined }))
      ),
    vehicles: () =>
      getJson(base, '/api/fleet/vehicles').then((rows) =>
        rows.map((v) => ({ ...v, driverName: v.driver?.name ?? null, driver: undefined }))
      ),
    customers: () => getJson(base, '/api/customers'),
    async shipmentDetail(key) {
      const list = await getJson(base, '/api/shipments');
      const match = list.find((s) => s.trackingNo === key || s.id === key);
      if (!match) return null;
      // The by-id route is the one that carries the event timeline.
      const full = await getJson(base, `/api/shipments/${match.id}`);
      return { ...flattenShipment(full), events: full.events ?? [] };
    },
    sql: () => fail('The `sql` command needs the SQLite backend. Re-run with --sqlite.'),
  };
}

// ---------------------------------------------------------------------------
// Backend: SQLite
// ---------------------------------------------------------------------------

/** Walk up from `start` looking for the directory that holds server/prisma/schema.prisma. */
function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, 'server', 'prisma', 'schema.prisma'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function dbUrlFromEnvFile(root) {
  const envPath = join(root, 'server', '.env');
  if (!existsSync(envPath)) return null;
  const match = readFileSync(envPath, 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

function resolveDbPath(override) {
  if (override) return resolve(override);
  if (process.env.MURIS_DB) return resolve(process.env.MURIS_DB);

  const scriptDir = dirname(realpathSync(fileURLToPath(import.meta.url)));
  const root = findRepoRoot(process.cwd()) ?? findRepoRoot(scriptDir);
  if (!root) {
    fail(
      'Could not locate the Muris repo (no server/prisma/schema.prisma found).\n' +
        'Run this from inside the repo, or pass --db /path/to/dev.db.'
    );
  }

  const candidates = [];
  const url = dbUrlFromEnvFile(root);
  if (url && url.startsWith('file:')) {
    const raw = url.slice('file:'.length);
    // Prisma resolves relative SQLite paths against the schema's directory.
    candidates.push(isAbsolute(raw) ? raw : resolve(join(root, 'server', 'prisma'), raw));
  }
  candidates.push(join(root, 'server', 'prisma', 'dev.db'), join(root, 'server', 'dev.db'));

  const found = candidates.find((p) => existsSync(p));
  if (found) return found;

  fail(
    `The TMS server is not running on ${DEFAULT_API} and no local database was found. Looked in:\n` +
      candidates.map((c) => `  - ${c}`).join('\n') +
      '\n\nStart the TMS with `npm run dev`, or create the database with `npm run db:migrate && npm run db:seed`.'
  );
}

/**
 * Returns a `query(sql, params) -> rows` function.
 *
 * node:sqlite needs --experimental-sqlite on Node 22.5–23.3, so if the import
 * fails we re-exec ourselves once with the flag before falling back to the CLI.
 */
async function makeQuery(dbPath) {
  try {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(dbPath, { readOnly: true });
    return (sql, params = []) => db.prepare(sql).all(...params);
  } catch {
    // fall through
  }

  if (!process.env.JARVIS_SQLITE_RETRY) {
    const self = fileURLToPath(import.meta.url);
    const retry = spawnSync(process.execPath, ['--experimental-sqlite', self, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, JARVIS_SQLITE_RETRY: '1', NODE_NO_WARNINGS: '1' },
    });
    if (retry.status === 0) process.exit(0);
  }

  if (spawnSync('sqlite3', ['--version'], { encoding: 'utf8' }).status === 0) {
    return (sql, params = []) => {
      const res = spawnSync('sqlite3', ['-readonly', '-json', dbPath, inlineParams(sql, params)], { encoding: 'utf8' });
      if (res.status !== 0) fail(`sqlite3 failed: ${(res.stderr || '').trim()}`);
      const out = (res.stdout || '').trim();
      return out ? JSON.parse(out) : [];
    };
  }

  fail(
    'No SQLite backend available.\n' +
      `  Node ${process.versions.node} cannot load node:sqlite, and the sqlite3 CLI is not on PATH.\n` +
      '  Fix: start the TMS server (`npm run dev`) so the API can be used instead, or install sqlite3.'
  );
}

/** Substitute ? placeholders for the sqlite3 CLI, which takes no bound params. */
function inlineParams(sql, params) {
  let i = 0;
  return sql.replace(/\?/g, () => {
    const v = params[i++];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

const SHIPMENT_SELECT = `
  SELECT s.*, o.orderNo, o.weight, o.totalCost, o.description, o.status AS orderStatus,
         c.name AS customerName, c.email AS customerEmail, c.phone AS customerPhone,
         d.name AS driverName, d.phone AS driverPhone, d.email AS driverEmail,
         v.plate, v.make, v.model, v.capacity
    FROM Shipment s
    JOIN "Order" o   ON o.id = s.orderId
    JOIN Customer c  ON c.id = o.customerId
    LEFT JOIN Driver d  ON d.id = s.driverId
    LEFT JOIN Vehicle v ON v.id = s.vehicleId`;

async function sqliteBackend(dbPath) {
  const q = await makeQuery(dbPath);
  return {
    label: `sqlite ${dbPath}`,
    orders: async () =>
      q(`SELECT o.*, c.name AS customerName, c.email AS customerEmail,
                s.trackingNo, s.status AS shipmentStatus
           FROM "Order" o
           JOIN Customer c ON c.id = o.customerId
           LEFT JOIN Shipment s ON s.orderId = o.id
          ORDER BY o.createdAt DESC`),
    shipments: async () => q(`${SHIPMENT_SELECT} ORDER BY s.updatedAt DESC`),
    drivers: async () =>
      q(`SELECT d.*, v.plate FROM Driver d LEFT JOIN Vehicle v ON v.driverId = d.id ORDER BY d.name ASC`),
    vehicles: async () =>
      q(`SELECT v.*, d.name AS driverName FROM Vehicle v LEFT JOIN Driver d ON d.id = v.driverId ORDER BY v.plate ASC`),
    customers: async () => q('SELECT * FROM Customer ORDER BY createdAt DESC'),
    async shipmentDetail(key) {
      const rows = q(`${SHIPMENT_SELECT} WHERE s.trackingNo = ? OR s.id = ?`, [key, key]);
      if (!rows.length) return null;
      const events = q('SELECT * FROM ShipmentEvent WHERE shipmentId = ? ORDER BY createdAt ASC', [rows[0].id]);
      return { ...rows[0], events };
    },
    sql: (statement) => q(statement),
  };
}

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------

async function pickBackend(flags, command) {
  const forceSqlite = flags.sqlite || flags.db || process.env.MURIS_DB || command === 'sql';
  if (forceSqlite) return sqliteBackend(resolveDbPath(flags.db));

  const base = (flags.api || DEFAULT_API).replace(/\/$/, '');
  if (await apiReachable(base)) return apiBackend(base);
  return sqliteBackend(resolveDbPath(null));
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdBrief(be) {
  const [orders, shipments, drivers, vehicles] = await Promise.all([
    be.orders(),
    be.shipments(),
    be.drivers(),
    be.vehicles(),
  ]);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const active = shipments.filter((s) => ACTIVE_SHIPMENT_STATUSES.includes(s.status));
  const deliveredToday = shipments.filter((s) => {
    const d = toDate(s.deliveredAt);
    return s.status === 'DELIVERED' && d && d >= startOfDay;
  });
  const failed = shipments.filter((s) => s.status === 'FAILED');
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const unassigned = shipments.filter((s) => !s.driverId || !s.vehicleId);
  const maintenance = vehicles.filter((v) => v.status === 'MAINTENANCE');

  // A load that has not moved in over a day is the thing worth surfacing first.
  const stale = active
    .filter((s) => (hoursSince(s.updatedAt) ?? 0) > 24)
    .sort((a, b) => (hoursSince(b.updatedAt) ?? 0) - (hoursSince(a.updatedAt) ?? 0));

  const availDrivers = drivers.filter((d) => d.status === 'AVAILABLE').length;
  const availVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;

  return {
    data: {
      stats: {
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        activeShipments: active.length,
        deliveredToday: deliveredToday.length,
        failedShipments: failed.length,
        availableDrivers: availDrivers,
        totalDrivers: drivers.length,
        availableVehicles: availVehicles,
        totalVehicles: vehicles.length,
        vehiclesInMaintenance: maintenance.length,
      },
      needsAttention: { stale, failed, unassigned, pendingOrders, maintenance },
      active,
    },
    text: () => {
      const L = [`MURIS TMS — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, ''];
      L.push(
        `  Orders ${orders.length} total · ${pendingOrders.length} pending` +
          `   |   Shipments ${active.length} active · ${deliveredToday.length} delivered today` +
          (failed.length ? ` · ${failed.length} FAILED` : '')
      );
      L.push(
        `  Drivers ${availDrivers}/${drivers.length} available` +
          `   |   Vehicles ${availVehicles}/${vehicles.length} available` +
          (maintenance.length ? ` · ${maintenance.length} in maintenance` : '')
      );

      const flag = (title, rows, render) => {
        if (!rows.length) return;
        L.push('', `${title} (${rows.length})`);
        rows.slice(0, 10).forEach((r) => L.push(`  ${render(r)}`));
        if (rows.length > 10) L.push(`  … and ${rows.length - 10} more`);
      };

      flag('NEEDS ATTENTION — failed', failed, (s) =>
        `${s.trackingNo}  ${s.customerName}  ${s.origin} → ${s.destination}  (${ago(s.updatedAt)} ago)`
      );
      flag('NEEDS ATTENTION — no movement in 24h+', stale, (s) =>
        `${s.trackingNo}  ${s.status.padEnd(16)} ${s.customerName}  ${s.driverName ?? 'no driver'}  last update ${ago(s.updatedAt)} ago`
      );
      flag('NEEDS ATTENTION — shipments missing driver or vehicle', unassigned, (s) =>
        `${s.trackingNo}  ${s.customerName}  driver=${s.driverName ?? '—'} vehicle=${s.plate ?? '—'}`
      );
      flag('Pending orders — not yet assigned', pendingOrders, (o) =>
        `${o.orderNo}  ${o.origin} → ${o.destination}  ${o.weight}t  ${money(o.totalCost)}  (created ${ago(o.createdAt)} ago)`
      );
      flag('Vehicles in maintenance', maintenance, (v) =>
        `${v.plate}  ${v.make} ${v.model} ${v.year}  ${v.mileage} km  last service ${fmtDate(v.lastService)}`
      );

      if (!failed.length && !stale.length && !unassigned.length && !pendingOrders.length) {
        L.push('', 'Nothing flagged. Every order is assigned and every active load moved in the last 24h.');
      }
      return L.join('\n');
    },
  };
}

async function cmdOrders(be, flags) {
  let rows = await be.orders();
  if (flags.status) {
    const want = String(flags.status).toUpperCase();
    rows = rows.filter((o) => String(o.status).toUpperCase() === want);
  }
  if (flags.customer) {
    const needle = String(flags.customer).toLowerCase();
    rows = rows.filter((o) => has(o.customerName, needle));
  }
  rows = rows.slice(0, Number(flags.limit ?? 50));

  return {
    data: rows,
    text: () =>
      rows.length
        ? [
            `${rows.length} order(s)`,
            ...rows.map(
              (o) =>
                `  ${String(o.orderNo).padEnd(14)} ${String(o.status).padEnd(10)} ${o.customerName}\n` +
                `      ${o.origin} → ${o.destination}  ${o.weight}t  ${money(o.totalCost)}` +
                `  ${o.trackingNo ? `[${o.trackingNo} ${o.shipmentStatus}]` : '[no shipment]'}  created ${ago(o.createdAt)} ago`
            ),
          ].join('\n')
        : 'No orders matched.',
  };
}

async function cmdShipments(be, flags) {
  let rows = await be.shipments();
  if (flags.status) {
    const want = String(flags.status).toUpperCase();
    rows = rows.filter((s) => String(s.status).toUpperCase() === want);
  }
  if (flags.stale) {
    const minHours = Number(flags.stale);
    rows = rows.filter((s) => (hoursSince(s.updatedAt) ?? 0) >= minHours);
  }
  rows = rows.slice(0, Number(flags.limit ?? 50));

  return {
    data: rows,
    text: () =>
      rows.length
        ? [
            `${rows.length} shipment(s)`,
            ...rows.map(
              (s) =>
                `  ${String(s.trackingNo).padEnd(16)} ${String(s.status).padEnd(16)} ${s.customerName} (${s.orderNo})\n` +
                `      ${s.origin} → ${s.destination}  ${s.weight}t  ${money(s.totalCost)}\n` +
                `      driver ${s.driverName ?? '—'}${s.driverPhone ? ` (${s.driverPhone})` : ''}  unit ${s.plate ?? '—'}` +
                `  last update ${ago(s.updatedAt)} ago`
            ),
          ].join('\n')
        : 'No shipments matched.',
  };
}

async function cmdShipment(be, positional) {
  const key = positional[0];
  if (!key) fail('usage: tms.mjs shipment <trackingNo | id>');

  const s = await be.shipmentDetail(key);
  if (!s) fail(`No shipment found for "${key}".`);
  const events = s.events ?? [];

  return {
    data: s,
    text: () =>
      [
        `${s.trackingNo} — ${s.status}`,
        `  Order      ${s.orderNo} (${s.orderStatus})  ${s.weight}t  ${money(s.totalCost)}${s.description ? `  — ${s.description}` : ''}`,
        `  Customer   ${s.customerName}  ${s.customerEmail}${s.customerPhone ? `  ${s.customerPhone}` : ''}`,
        `  Route      ${s.origin} → ${s.destination}` +
          (s.estimatedDist ? `  (~${s.estimatedDist} km${s.estimatedTime ? `, ~${Math.round(s.estimatedTime / 60)}h` : ''})` : ''),
        `  Driver     ${s.driverName ?? '—'}${s.driverPhone ? `  ${s.driverPhone}` : ''}`,
        `  Vehicle    ${s.plate ?? '—'}${s.make ? `  ${s.make} ${s.model} (${s.capacity}t)` : ''}`,
        `  Picked up  ${fmtDate(s.pickedUpAt)}      Delivered  ${fmtDate(s.deliveredAt)}`,
        s.notes ? `  Notes      ${s.notes}` : null,
        '',
        `  Timeline (${events.length} event${events.length === 1 ? '' : 's'})`,
        ...(events.length
          ? events.map(
              (e) =>
                `    ${fmtDate(e.createdAt)}  ${String(e.status).padEnd(16)}${e.location ? ` @ ${e.location}` : ''}${e.note ? ` — ${e.note}` : ''}`
            )
          : ['    (no events logged)']),
      ]
        .filter((l) => l !== null)
        .join('\n'),
  };
}

async function cmdFleet(be) {
  const [drivers, vehicles, shipments] = await Promise.all([be.drivers(), be.vehicles(), be.shipments()]);
  const counts = new Map();
  shipments.forEach((s) => s.driverId && counts.set(s.driverId, (counts.get(s.driverId) ?? 0) + 1));

  const sortByStatusThen = (key) => (a, b) =>
    a.status.localeCompare(b.status) || String(a[key]).localeCompare(String(b[key]));
  const ds = [...drivers].sort(sortByStatusThen('name'));
  const vs = [...vehicles].sort(sortByStatusThen('plate'));

  return {
    data: { drivers: ds.map((d) => ({ ...d, shipmentCount: counts.get(d.id) ?? 0 })), vehicles: vs },
    text: () =>
      [
        `Drivers (${ds.length})`,
        ...ds.map(
          (d) =>
            `  ${d.name.padEnd(20)} ${d.status.padEnd(10)} ${d.licenseNo}  unit ${d.plate ?? '—'}` +
            `${d.phone ? `  ${d.phone}` : ''}  ${counts.get(d.id) ?? 0} shipment(s)`
        ),
        '',
        `Vehicles (${vs.length})`,
        ...vs.map(
          (v) =>
            `  ${v.plate.padEnd(12)} ${v.status.padEnd(12)} ${v.make} ${v.model} ${v.year}  ${v.capacity}t` +
            `  ${v.mileage} km  last service ${fmtDate(v.lastService)}  driver ${v.driverName ?? '—'}`
        ),
      ].join('\n'),
  };
}

async function cmdCustomers(be) {
  const [customers, orders] = await Promise.all([be.customers(), be.orders()]);
  const rows = customers
    .map((c) => {
      const mine = orders.filter((o) => o.customerId === c.id);
      return {
        ...c,
        orderCount: mine.length,
        openCount: mine.filter((o) => ['PENDING', 'ASSIGNED', 'IN_TRANSIT'].includes(o.status)).length,
        deliveredCount: mine.filter((o) => o.status === 'DELIVERED').length,
        totalBilled: mine.reduce((sum, o) => sum + (o.totalCost ?? 0), 0),
      };
    })
    .sort((a, b) => b.totalBilled - a.totalBilled);

  return {
    data: rows,
    text: () =>
      [
        `Customers (${rows.length})`,
        ...rows.map(
          (c) =>
            `  ${c.name.padEnd(24)} ${c.email.padEnd(28)} ${c.orderCount} orders ` +
            `(${c.openCount} open, ${c.deliveredCount} delivered)  ${money(c.totalBilled)} total`
        ),
      ].join('\n'),
  };
}

async function cmdSearch(be, positional) {
  const term = positional.join(' ').trim();
  if (!term) fail('usage: tms.mjs search <term>');
  const n = term.toLowerCase();

  const [orders, shipments, customers, drivers] = await Promise.all([
    be.orders(),
    be.shipments(),
    be.customers(),
    be.drivers(),
  ]);

  const matchedOrders = orders.filter(
    (o) =>
      has(o.orderNo, n) || has(o.origin, n) || has(o.destination, n) || has(o.description, n) || has(o.customerName, n)
  );
  const matchedShipments = shipments.filter(
    (s) =>
      has(s.trackingNo, n) ||
      has(s.origin, n) ||
      has(s.destination, n) ||
      has(s.notes, n) ||
      has(s.customerName, n) ||
      has(s.driverName, n)
  );
  const matchedCustomers = customers.filter((c) => has(c.name, n) || has(c.email, n));
  const matchedDrivers = drivers.filter((d) => has(d.name, n) || has(d.email, n) || has(d.licenseNo, n));

  return {
    data: {
      orders: matchedOrders,
      shipments: matchedShipments,
      customers: matchedCustomers,
      drivers: matchedDrivers,
    },
    text: () => {
      const L = [`Search "${term}"`];
      const section = (title, rows, render) => {
        if (!rows.length) return;
        L.push('', `${title} (${rows.length})`);
        rows.slice(0, 25).forEach((r) => L.push(`  ${render(r)}`));
      };
      section('Orders', matchedOrders, (o) =>
        `${o.orderNo}  ${o.status}  ${o.customerName}  ${o.origin} → ${o.destination}  ${money(o.totalCost)}`
      );
      section('Shipments', matchedShipments, (s) =>
        `${s.trackingNo}  ${s.status}  ${s.customerName}  ${s.origin} → ${s.destination}  driver ${s.driverName ?? '—'}`
      );
      section('Customers', matchedCustomers, (c) => `${c.name}  ${c.email}${c.phone ? `  ${c.phone}` : ''}`);
      section('Drivers', matchedDrivers, (d) => `${d.name}  ${d.status}  ${d.licenseNo}${d.phone ? `  ${d.phone}` : ''}`);
      if (L.length === 1) L.push('', 'No matches.');
      return L.join('\n');
    },
  };
}

async function cmdSql(be, positional) {
  const statement = positional.join(' ').trim();
  if (!statement) fail('usage: tms.mjs sql "SELECT ..."');

  const normalized = statement.replace(/;\s*$/, '');
  if (!/^\s*(select|with)\b/i.test(normalized)) fail('Only SELECT and WITH queries are allowed.');
  if (/;/.test(normalized)) fail('Only a single statement is allowed.');
  if (/\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma|vacuum)\b/i.test(normalized)) {
    fail('Write and schema statements are not allowed — this tool is read-only.');
  }

  const rows = be.sql(normalized);
  return {
    data: rows,
    text: () => {
      if (!rows.length) return '(0 rows)';
      const cols = Object.keys(rows[0]);
      const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
      const line = (cells) => '  ' + cells.map((v, i) => String(v ?? '').padEnd(widths[i])).join('  ');
      return [
        line(cols),
        line(widths.map((w) => '-'.repeat(w))),
        ...rows.map((r) => line(cols.map((c) => r[c]))),
        '',
        `(${rows.length} rows)`,
      ].join('\n');
    },
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const USAGE = `tms.mjs — read-only queries against the Muris TMS

  brief                                    operational snapshot + what needs attention
  orders [--status S] [--customer NAME]    list orders
  shipments [--status S] [--stale HOURS]   list shipments
  shipment <trackingNo | id>               full detail with event timeline
  fleet                                    drivers and vehicles
  customers                                customers with order counts and billing
  search <term>                            match across orders, shipments, customers, drivers
  sql "SELECT ..."                         read-only escape hatch (SQLite backend)

Reads http://localhost:3001 when the TMS server is up, else the SQLite file.

Flags: --json  --limit N  --api URL  --db PATH  --sqlite`;

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  const boolean = new Set(['json', 'sqlite']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (boolean.has(key)) flags[key] = true;
      else flags[key] = argv[++i];
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const command = positional.shift();
  if (!command || command === 'help' || command === '--help') {
    console.log(USAGE);
    return;
  }

  const handlers = {
    brief: (be) => cmdBrief(be),
    orders: (be) => cmdOrders(be, flags),
    shipments: (be) => cmdShipments(be, flags),
    shipment: (be) => cmdShipment(be, positional),
    fleet: (be) => cmdFleet(be),
    customers: (be) => cmdCustomers(be),
    search: (be) => cmdSearch(be, positional),
    sql: (be) => cmdSql(be, positional),
  };
  const handler = handlers[command];
  if (!handler) fail(`Unknown command "${command}".\n\n${USAGE}`);

  const backend = await pickBackend(flags, command);
  const result = await handler(backend);

  if (flags.json) {
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log(result.text());
    console.log(`\nsource: ${backend.label}`);
  }
}

main().catch((err) => fail(err.stack || err.message));
