import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db';
import { DEFAULT_MODEL, isConfigured } from '../ai/client';
import { streamAssistant, type RuntimeEvent } from '../ai/runtime';
import { allTools } from '../ai/tools';

const router = Router();

const ChatSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  allowWrites: z.boolean().optional(),
});

/** What the HUD reads on boot to render its own capability state. */
router.get('/status', (_req, res) => {
  res.json({
    online: isConfigured(),
    model: DEFAULT_MODEL,
    tools: allTools.map(t => ({ name: t.name, description: t.description, mutates: t.mutates })),
  });
});

router.get('/sessions', async (_req, res) => {
  const sessions = await prisma.chatSession.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 20,
    include: { _count: { select: { messages: true } } },
  });
  res.json(sessions);
});

router.get('/sessions/:id', async (req, res) => {
  const session = await prisma.chatSession.findUnique({
    where: { id: req.params.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
});

router.delete('/sessions/:id', async (req, res) => {
  await prisma.chatSession.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

/**
 * One assistant turn, streamed as server-sent events so the HUD can render
 * text and tool activity as they happen rather than after the fact.
 */
router.post('/chat', async (req, res) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { message, sessionId, allowWrites } = parsed.data;

  const session = sessionId
    ? await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 40 } },
      })
    : null;

  const active =
    session ??
    (await prisma.chatSession.create({
      data: { title: message.slice(0, 60) },
      include: { messages: true },
    }));

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event: RuntimeEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  send({ type: 'status', text: 'Session open' });
  res.write(`data: ${JSON.stringify({ type: 'session', id: active.id })}\n\n`);

  try {
    const { text, toolCalls } = await streamAssistant({
      history: active.messages.map(m => ({ role: m.role, content: m.content })),
      input: message,
      allowWrites: allowWrites ?? false,
      emit: send,
    });

    await prisma.$transaction([
      prisma.chatMessage.create({ data: { sessionId: active.id, role: 'user', content: message } }),
      prisma.chatMessage.create({
        data: {
          sessionId: active.id,
          role: 'assistant',
          content: text,
          toolCalls: JSON.stringify(toolCalls),
        },
      }),
      prisma.chatSession.update({ where: { id: active.id }, data: { updatedAt: new Date() } }),
    ]);
  } catch (err) {
    // streamAssistant already emitted the error event; the stream still needs closing.
    console.error('assistant turn failed:', err);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

export default router;
