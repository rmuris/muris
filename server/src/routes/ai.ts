import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';

const router = Router();

const AgentActionSchema = z.object({
  agentType: z.string(),
  action: z.string(),
  input: z.any().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

router.get('/agents/log', async (req, res) => {
  const logs = await prisma.aIAgentLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(logs);
});

router.post('/agents/run', async (req, res) => {
  const data = AgentActionSchema.parse(req.body);
  const start = Date.now();

  // Simulate AI agent execution
  const agentResponses: Record<string, string> = {
    DISPATCH:
      'Analyzed 12 pending loads. Optimized 3 routes saving 15% fuel. 2 loads at risk of delay due to border wait times at Laredo.',
    CUSTOMS:
      'Reviewed 5 customs entries. Found 2 Carta Porte validation errors. 1 pedimento missing HS code. Recommend immediate correction.',
    ACCOUNTING:
      'AR aging: $45,200 outstanding. 3 invoices 30+ days overdue. Cash flow positive for next 30 days. Recommend collecting from Acme Corp.',
    COMPLIANCE:
      'CTPAT score: 87/100. OEA score: 92/100. 2 driver medical cards expiring within 30 days. 1 vehicle registration expiring.',
    CUSTOMER_SUCCESS:
      'Identified 3 upsell opportunities. Customer ABC Corp showing 40% volume increase. Recommend capacity agreement.',
    FLEET:
      'Truck Unit-7 due for oil change at 250,350 miles. Trailer T-023 tire wear detected. Schedule maintenance within 7 days.',
    WAREHOUSE:
      'Inventory alert: SKU-4521 below reorder point. 3 items expiring within 14 days. Warehouse B at 87% capacity.',
    SECURITY:
      'All CTPAT requirements current. 2 carrier insurance certificates expiring next month. Background check pending for 1 new driver.',
    COLLECTIONS:
      '$12,400 overdue AR. Recommend sending final notice to Global Imports Inc. Payment plan option available.',
    EXECUTIVE:
      'Revenue on track. Top risk: Laredo border delays impacting 4 loads. Recommend rerouting via El Paso. Profit margin at 22%.',
  };

  const output =
    agentResponses[data.agentType] ?? 'Agent analysis complete. No critical issues detected.';

  const log = await prisma.aIAgentLog.create({
    data: {
      agentType: data.agentType,
      action: data.action,
      input: data.input ? JSON.stringify(data.input) : null,
      output: JSON.stringify({ message: output, timestamp: new Date().toISOString() }),
      status: 'COMPLETED',
      duration: Date.now() - start,
      entityType: data.entityType,
      entityId: data.entityId,
    },
  });

  res.json({ log, output, recommendations: output });
});

router.get('/priorities', async (req, res) => {
  const [openRisk, overdueInvoices, expiredDocs, activeShipments, pendingOrders] =
    await Promise.all([
      prisma.riskEvent.count({
        where: { status: 'OPEN', severity: { in: ['HIGH', 'CRITICAL'] } },
      }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.document.count({ where: { expiresAt: { lt: new Date() }, status: 'ACTIVE' } }),
      prisma.shipment.count({ where: { status: { in: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'] } } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
    ]);

  const priorities = [];
  if (openRisk > 0)
    priorities.push({
      rank: 1,
      priority: 'CRITICAL',
      title: `${openRisk} High/Critical Risk Events Open`,
      action: 'Review and resolve open risk events immediately',
      module: 'risk',
    });
  if (overdueInvoices > 0)
    priorities.push({
      rank: 2,
      priority: 'HIGH',
      title: `${overdueInvoices} Overdue Invoices`,
      action: 'Contact customers with overdue balances',
      module: 'accounting',
    });
  if (expiredDocs > 0)
    priorities.push({
      rank: 3,
      priority: 'HIGH',
      title: `${expiredDocs} Expired Documents`,
      action: 'Request updated documents from carriers/customers',
      module: 'compliance',
    });
  if (activeShipments > 0)
    priorities.push({
      rank: 4,
      priority: 'MEDIUM',
      title: `${activeShipments} Active Shipments In Transit`,
      action: 'Monitor and update ETA for in-transit shipments',
      module: 'shipments',
    });
  if (pendingOrders > 0)
    priorities.push({
      rank: 5,
      priority: 'LOW',
      title: `${pendingOrders} Orders Pending Assignment`,
      action: 'Assign drivers and vehicles to pending orders',
      module: 'orders',
    });

  if (priorities.length === 0)
    priorities.push({
      rank: 1,
      priority: 'LOW',
      title: 'All systems operational',
      action: 'No immediate actions required',
      module: 'dashboard',
    });

  res.json({ priorities, generatedAt: new Date().toISOString() });
});

router.get('/automations', async (req, res) => {
  const automations = await prisma.automation.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(automations);
});

router.post('/automations', async (req, res) => {
  const { name, description, trigger, condition, action } = req.body;
  const automation = await prisma.automation.create({
    data: { name, description, trigger, condition, action },
  });
  res.status(201).json(automation);
});

export default router;
