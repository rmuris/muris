import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import prisma from '../db';
import { assignShipment, setShipmentStatus, ShipmentError } from '../services/shipments';

/**
 * The tool surface the assistant and its agents act through. Every tool
 * validates its input with Zod before touching Prisma, matching the route
 * layer convention.
 *
 * Tools flagged `mutates` are refused unless the caller holds write authority
 * (the HUD's COMMAND toggle, or an agent created with autonomy COMMAND).
 */

export interface ToolContext {
  /** Whether mutating tools may run. */
  allowWrites: boolean;
  /** Guards against agents recursively invoking other agents. */
  depth: number;
}

export interface TmsTool {
  name: string;
  description: string;
  mutates: boolean;
  inputSchema: Anthropic.Tool['input_schema'];
  schema: z.ZodTypeAny;
  run: (input: any, ctx: ToolContext) => Promise<unknown>;
}

/** JSON-schema shorthand so tool definitions stay readable. */
const str = (description: string) => ({ type: 'string' as const, description });
const num = (description: string) => ({ type: 'number' as const, description });
const enums = (values: string[], description: string) => ({
  type: 'string' as const,
  enum: values,
  description,
});

const SHIPMENT_STATUSES = [
  'PENDING',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
] as const;

export class ToolError extends Error {}

// ── Lookup helpers ──────────────────────────────────────────────────────────
// The model reasons in human terms ("Maria", "ABC-123"), not cuids. These
// resolve those to records and fail loudly when ambiguous.

async function resolveCustomer(idOrName: string) {
  const byId = await prisma.customer.findUnique({ where: { id: idOrName } });
  if (byId) return byId;
  const matches = await prisma.customer.findMany({
    where: { name: { contains: idOrName } },
    take: 5,
  });
  if (matches.length === 0) throw new ToolError(`No customer matching "${idOrName}"`);
  if (matches.length > 1)
    throw new ToolError(
      `"${idOrName}" matches ${matches.length} customers: ${matches.map(c => c.name).join(', ')}. Be more specific.`,
    );
  return matches[0];
}

async function resolveOrder(idOrNo: string) {
  const order =
    (await prisma.order.findUnique({ where: { id: idOrNo } })) ??
    (await prisma.order.findUnique({ where: { orderNo: idOrNo } }));
  if (!order) throw new ToolError(`No order matching "${idOrNo}"`);
  return order;
}

async function resolveShipment(idOrTracking: string) {
  const shipment =
    (await prisma.shipment.findUnique({ where: { id: idOrTracking } })) ??
    (await prisma.shipment.findUnique({ where: { trackingNo: idOrTracking } }));
  if (!shipment) throw new ToolError(`No shipment matching "${idOrTracking}"`);
  return shipment;
}

async function resolveDriver(idOrName: string) {
  const byId = await prisma.driver.findUnique({ where: { id: idOrName } });
  if (byId) return byId;
  const matches = await prisma.driver.findMany({ where: { name: { contains: idOrName } }, take: 5 });
  if (matches.length === 0) throw new ToolError(`No driver matching "${idOrName}"`);
  if (matches.length > 1)
    throw new ToolError(
      `"${idOrName}" matches ${matches.length} drivers: ${matches.map(d => d.name).join(', ')}. Be more specific.`,
    );
  return matches[0];
}

async function resolveVehicle(idOrPlate: string) {
  const vehicle =
    (await prisma.vehicle.findUnique({ where: { id: idOrPlate } })) ??
    (await prisma.vehicle.findUnique({ where: { plate: idOrPlate } }));
  if (!vehicle) throw new ToolError(`No vehicle matching "${idOrPlate}"`);
  return vehicle;
}

// ── Read tools ──────────────────────────────────────────────────────────────

const readTools: TmsTool[] = [
  {
    name: 'get_dashboard',
    description:
      'Live operational snapshot: order counts, active shipments, deliveries today, and idle drivers/vehicles. Call this first when asked how the operation is doing.',
    mutates: false,
    schema: z.object({}),
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      const [totalOrders, pendingOrders, activeShipments, deliveredToday, availableDrivers, availableVehicles] =
        await Promise.all([
          prisma.order.count(),
          prisma.order.count({ where: { status: 'PENDING' } }),
          prisma.shipment.count({
            where: { status: { in: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
          }),
          prisma.shipment.count({
            where: { status: 'DELIVERED', deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          }),
          prisma.driver.count({ where: { status: 'AVAILABLE' } }),
          prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
        ]);
      return { totalOrders, pendingOrders, activeShipments, deliveredToday, availableDrivers, availableVehicles };
    },
  },
  {
    name: 'list_orders',
    description: 'List orders, newest first. Filter by status to find unassigned work.',
    mutates: false,
    schema: z.object({
      status: z.enum(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    inputSchema: {
      type: 'object',
      properties: {
        status: enums(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'], 'Filter by order status'),
        limit: num('Max rows to return (default 20)'),
      },
    },
    run: async ({ status, limit }) =>
      prisma.order.findMany({
        where: status ? { status } : {},
        take: limit ?? 20,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } }, shipment: { select: { trackingNo: true, status: true } } },
      }),
  },
  {
    name: 'list_shipments',
    description: 'List shipments with driver, vehicle and route. Filter by status to see what is in motion.',
    mutates: false,
    schema: z.object({
      status: z.enum(SHIPMENT_STATUSES).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    inputSchema: {
      type: 'object',
      properties: {
        status: enums([...SHIPMENT_STATUSES], 'Filter by shipment status'),
        limit: num('Max rows to return (default 20)'),
      },
    },
    run: async ({ status, limit }) =>
      prisma.shipment.findMany({
        where: status ? { status } : {},
        take: limit ?? 20,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { include: { customer: { select: { name: true } } } },
          driver: { select: { name: true } },
          vehicle: { select: { plate: true } },
        },
      }),
  },
  {
    name: 'track_shipment',
    description: 'Full detail plus the event timeline for one shipment, by tracking number or id.',
    mutates: false,
    schema: z.object({ trackingNo: z.string().min(1) }),
    inputSchema: {
      type: 'object',
      properties: { trackingNo: str('Tracking number (e.g. TRK-ABC123) or shipment id') },
      required: ['trackingNo'],
    },
    run: async ({ trackingNo }) => {
      const found = await resolveShipment(trackingNo);
      return prisma.shipment.findUnique({
        where: { id: found.id },
        include: {
          order: { include: { customer: true } },
          driver: true,
          vehicle: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });
    },
  },
  {
    name: 'list_drivers',
    description: 'The driver roster and who is free right now.',
    mutates: false,
    schema: z.object({ status: z.enum(['AVAILABLE', 'ON_ROUTE', 'OFF_DUTY']).optional() }),
    inputSchema: {
      type: 'object',
      properties: { status: enums(['AVAILABLE', 'ON_ROUTE', 'OFF_DUTY'], 'Filter by driver status') },
    },
    run: async ({ status }) =>
      prisma.driver.findMany({
        where: status ? { status } : {},
        orderBy: { name: 'asc' },
        include: { vehicle: { select: { plate: true } } },
      }),
  },
  {
    name: 'list_vehicles',
    description: 'The fleet, with capacity, mileage and availability.',
    mutates: false,
    schema: z.object({ status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE']).optional() }),
    inputSchema: {
      type: 'object',
      properties: { status: enums(['AVAILABLE', 'IN_USE', 'MAINTENANCE'], 'Filter by vehicle status') },
    },
    run: async ({ status }) =>
      prisma.vehicle.findMany({
        where: status ? { status } : {},
        orderBy: { plate: 'asc' },
        include: { driver: { select: { name: true } } },
      }),
  },
  {
    name: 'list_customers',
    description: 'Customer accounts with their order counts.',
    mutates: false,
    schema: z.object({}),
    inputSchema: { type: 'object', properties: {} },
    run: async () =>
      prisma.customer.findMany({
        include: { _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
      }),
  },
  {
    name: 'list_agents',
    description: 'The agents currently on the roster, with their roles and run counts.',
    mutates: false,
    schema: z.object({}),
    inputSchema: { type: 'object', properties: {} },
    run: async () =>
      prisma.agent.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { runs: true } } },
      }),
  },
];

// ── Write tools ─────────────────────────────────────────────────────────────

const writeTools: TmsTool[] = [
  {
    name: 'create_order',
    description: 'Book a new order for a customer. Returns the generated order number.',
    mutates: true,
    schema: z.object({
      customer: z.string().min(1),
      origin: z.string().min(1),
      destination: z.string().min(1),
      weight: z.number().positive(),
      description: z.string().optional(),
      totalCost: z.number().optional(),
    }),
    inputSchema: {
      type: 'object',
      properties: {
        customer: str('Customer name or id'),
        origin: str('Pickup location'),
        destination: str('Delivery location'),
        weight: num('Load weight in tons'),
        description: str('What is being shipped'),
        totalCost: num('Quoted price'),
      },
      required: ['customer', 'origin', 'destination', 'weight'],
    },
    run: async ({ customer, ...rest }) => {
      const found = await resolveCustomer(customer);
      return prisma.order.create({
        data: { ...rest, customerId: found.id, orderNo: `ORD-${Date.now().toString(36).toUpperCase()}` },
        include: { customer: { select: { name: true } } },
      });
    },
  },
  {
    name: 'assign_shipment',
    description:
      'Dispatch an order: create its shipment and lock in a driver and vehicle. Marks the driver ON_ROUTE and the vehicle IN_USE. Check availability first.',
    mutates: true,
    schema: z.object({
      order: z.string().min(1),
      driver: z.string().min(1),
      vehicle: z.string().min(1),
      notes: z.string().optional(),
    }),
    inputSchema: {
      type: 'object',
      properties: {
        order: str('Order number (e.g. ORD-ABC123) or id'),
        driver: str('Driver name or id'),
        vehicle: str('Vehicle plate or id'),
        notes: str('Dispatch notes for the driver'),
      },
      required: ['order', 'driver', 'vehicle'],
    },
    run: async ({ order, driver, vehicle, notes }) => {
      const [o, d, v] = await Promise.all([resolveOrder(order), resolveDriver(driver), resolveVehicle(vehicle)]);
      if (d.status !== 'AVAILABLE') throw new ToolError(`Driver ${d.name} is ${d.status}, not available.`);
      if (v.status !== 'AVAILABLE') throw new ToolError(`Vehicle ${v.plate} is ${v.status}, not available.`);
      try {
        return await assignShipment({ orderId: o.id, driverId: d.id, vehicleId: v.id, notes });
      } catch (err) {
        throw err instanceof ShipmentError ? new ToolError(err.message) : err;
      }
    },
  },
  {
    name: 'update_shipment_status',
    description:
      'Advance a shipment along its lifecycle and log a timeline event. Marking DELIVERED frees the driver and vehicle and closes the order.',
    mutates: true,
    schema: z.object({
      shipment: z.string().min(1),
      status: z.enum(SHIPMENT_STATUSES),
      note: z.string().optional(),
      location: z.string().optional(),
    }),
    inputSchema: {
      type: 'object',
      properties: {
        shipment: str('Tracking number or shipment id'),
        status: enums([...SHIPMENT_STATUSES], 'The new status'),
        note: str('What happened'),
        location: str('Where it happened'),
      },
      required: ['shipment', 'status'],
    },
    run: async ({ shipment, status, note, location }) => {
      const found = await resolveShipment(shipment);
      try {
        return await setShipmentStatus(found.id, { status, note, location });
      } catch (err) {
        throw err instanceof ShipmentError ? new ToolError(err.message) : err;
      }
    },
  },
];

// ── Agent-authoring tools ───────────────────────────────────────────────────
// These are what let the assistant build its own staff.

const agentTools: TmsTool[] = [
  {
    name: 'create_agent',
    description:
      'Forge a new specialist agent and add it to the roster. Give it a focused role and standing orders written in the second person ("You monitor..."), and only the tools that role needs. Grant COMMAND autonomy only when the operator asked for an agent that acts, not just reports.',
    mutates: true,
    schema: z.object({
      name: z.string().min(1).max(60),
      role: z.string().min(1).max(160),
      systemPrompt: z.string().min(20),
      tools: z.array(z.string()).min(1),
      autonomy: z.enum(['READ_ONLY', 'COMMAND']).optional(),
    }),
    inputSchema: {
      type: 'object',
      properties: {
        name: str('Short distinctive name, e.g. "Dispatch Watch"'),
        role: str('One line describing what this agent is for'),
        systemPrompt: str('The standing orders for this agent, written in the second person'),
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tool names this agent may call. Must be a subset of the tools you have.',
        },
        autonomy: enums(['READ_ONLY', 'COMMAND'], 'READ_ONLY reports only; COMMAND may also change TMS records'),
      },
      required: ['name', 'role', 'systemPrompt', 'tools'],
    },
    run: async ({ name, role, systemPrompt, tools, autonomy }) => {
      const known = new Set(allTools.map(t => t.name));
      const unknown = tools.filter((t: string) => !known.has(t));
      if (unknown.length)
        throw new ToolError(
          `Unknown tools: ${unknown.join(', ')}. Available: ${[...known].filter(n => n !== 'create_agent' && n !== 'run_agent').join(', ')}`,
        );

      const existing = await prisma.agent.findUnique({ where: { name } });
      if (existing) throw new ToolError(`An agent named "${name}" already exists.`);

      return prisma.agent.create({
        data: {
          name,
          role,
          systemPrompt,
          tools: JSON.stringify(tools),
          autonomy: autonomy ?? 'READ_ONLY',
          createdBy: 'JARVIS',
          status: 'STANDBY',
        },
      });
    },
  },
  {
    name: 'run_agent',
    description:
      'Task an existing agent with a job and return its report. Use this to delegate focused work rather than doing it inline.',
    mutates: false,
    schema: z.object({ name: z.string().min(1), task: z.string().min(1) }),
    inputSchema: {
      type: 'object',
      properties: {
        name: str('The agent name or id'),
        task: str('What you want the agent to do'),
      },
      required: ['name', 'task'],
    },
    run: async ({ name, task }, ctx) => {
      if (ctx.depth > 0) throw new ToolError('Agents cannot dispatch other agents.');
      const agent =
        (await prisma.agent.findUnique({ where: { id: name } })) ??
        (await prisma.agent.findUnique({ where: { name } }));
      if (!agent) throw new ToolError(`No agent named "${name}"`);
      if (agent.status === 'RETIRED') throw new ToolError(`Agent "${agent.name}" is retired.`);

      // Imported lazily: runtime imports this module, so a top-level import
      // here would be a require cycle.
      const { runAgent } = await import('./runtime');
      const run = await runAgent(agent, task, { depth: ctx.depth + 1 });
      return { agent: agent.name, status: run.status, report: run.output ?? run.error };
    },
  },
];

export const allTools: TmsTool[] = [...readTools, ...writeTools, ...agentTools];

/** Tool names an agent is allowed to be given — it may not forge more agents. */
export const AGENT_ASSIGNABLE_TOOLS = allTools
  .filter(t => t.name !== 'create_agent' && t.name !== 'run_agent')
  .map(t => ({ name: t.name, description: t.description, mutates: t.mutates }));

export function toolByName(name: string) {
  return allTools.find(t => t.name === name);
}

/** Converts our tool records into the wire format the Messages API expects. */
export function toAnthropicTools(tools: TmsTool[]): Anthropic.Tool[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));
}

/**
 * Validates and runs one tool call. Never throws: the model needs to see the
 * failure as a result so it can correct course.
 */
export async function executeTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<{ ok: boolean; result: string }> {
  const tool = toolByName(name);
  if (!tool) return { ok: false, result: `Unknown tool "${name}".` };

  if (tool.mutates && !ctx.allowWrites) {
    return {
      ok: false,
      result:
        'Refused: this changes live TMS records and command authority is not enabled. Tell the operator what you would do and ask them to enable COMMAND mode.',
    };
  }

  const parsed = tool.schema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, result: `Invalid input: ${JSON.stringify(parsed.error.flatten().fieldErrors)}` };
  }

  try {
    const result = await tool.run(parsed.data, ctx);
    return { ok: true, result: JSON.stringify(result, null, 2) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, result: `Failed: ${message}` };
  }
}
