import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { runAgent } from '../ai/runtime';
import { AGENT_ASSIGNABLE_TOOLS, toolByName } from '../ai/tools';

const router = Router();

const AgentSchema = z.object({
  name: z.string().min(1).max(60),
  role: z.string().min(1).max(160),
  systemPrompt: z.string().min(20),
  tools: z.array(z.string()).min(1),
  autonomy: z.enum(['READ_ONLY', 'COMMAND']).optional(),
  status: z.enum(['STANDBY', 'ACTIVE', 'RETIRED']).optional(),
  model: z.string().optional(),
});

const assignable = new Set(AGENT_ASSIGNABLE_TOOLS.map(t => t.name));

function validateTools(tools: string[]) {
  const unknown = tools.filter(t => !toolByName(t));
  if (unknown.length) return `Unknown tools: ${unknown.join(', ')}`;
  const forbidden = tools.filter(t => !assignable.has(t));
  if (forbidden.length) return `Agents may not be given: ${forbidden.join(', ')}`;
  return null;
}

/** The palette the agent builder renders. */
router.get('/tools', (_req, res) => {
  res.json(AGENT_ASSIGNABLE_TOOLS);
});

router.get('/', async (_req, res) => {
  const agents = await prisma.agent.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { runs: true } } },
  });
  res.json(agents);
});

router.get('/:id', async (req, res) => {
  const agent = await prisma.agent.findUnique({
    where: { id: req.params.id },
    include: { runs: { orderBy: { startedAt: 'desc' }, take: 20 } },
  });
  if (!agent) return res.status(404).json({ error: 'Not found' });
  res.json(agent);
});

router.post('/', async (req, res) => {
  const parsed = AgentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const invalid = validateTools(parsed.data.tools);
  if (invalid) return res.status(400).json({ error: invalid });

  const existing = await prisma.agent.findUnique({ where: { name: parsed.data.name } });
  if (existing) return res.status(409).json({ error: `An agent named "${parsed.data.name}" already exists.` });

  const agent = await prisma.agent.create({
    data: { ...parsed.data, tools: JSON.stringify(parsed.data.tools), createdBy: 'OPERATOR' },
  });
  res.status(201).json(agent);
});

router.put('/:id', async (req, res) => {
  const parsed = AgentSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { tools, ...rest } = parsed.data;
  if (tools) {
    const invalid = validateTools(tools);
    if (invalid) return res.status(400).json({ error: invalid });
  }

  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: { ...rest, ...(tools ? { tools: JSON.stringify(tools) } : {}) },
  });
  res.json(agent);
});

router.delete('/:id', async (req, res) => {
  await prisma.agent.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

/** Dispatch an agent against a task and return the completed run. */
router.post('/:id/run', async (req, res) => {
  const parsed = z.object({ task: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent) return res.status(404).json({ error: 'Not found' });
  if (agent.status === 'RETIRED') return res.status(409).json({ error: 'Agent is retired.' });

  const run = await runAgent(agent, parsed.data.task);
  res.json(run);
});

router.get('/:id/runs', async (req, res) => {
  const runs = await prisma.agentRun.findMany({
    where: { agentId: req.params.id },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  res.json(runs);
});

export default router;
