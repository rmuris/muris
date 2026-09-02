import type Anthropic from '@anthropic-ai/sdk';
import AnthropicSDK from '@anthropic-ai/sdk';
import prisma from '../db';
import { DEFAULT_MODEL, getClient, isConfigured } from './client';
import { SYSTEM_PROMPT, agentSystemPrompt } from './prompt';
import { allTools, executeTool, toAnthropicTools, toolByName, type ToolContext, type TmsTool } from './tools';
import { offlineReply } from './offline';

/** Events streamed to the HUD while a turn runs. */
export type RuntimeEvent =
  | { type: 'status'; text: string }
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; input: unknown }
  | { type: 'tool_result'; name: string; ok: boolean; preview: string }
  | { type: 'done'; text: string; toolCalls: ToolCallLog[]; offline: boolean }
  | { type: 'error'; message: string };

export interface ToolCallLog {
  name: string;
  input: unknown;
  ok: boolean;
}

/** Ceiling on tool round-trips so a confused turn cannot loop forever. */
const MAX_ITERATIONS = 12;

function textOf(message: Anthropic.Message) {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim();
}

function describeError(err: unknown) {
  if (err instanceof AnthropicSDK.AuthenticationError) return 'Claude API key rejected. Check ANTHROPIC_API_KEY.';
  if (err instanceof AnthropicSDK.RateLimitError) return 'Rate limited by the Claude API. Try again shortly.';
  if (err instanceof AnthropicSDK.APIError) return `Claude API error ${err.status}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

/**
 * The agentic loop, shared by the assistant and by agents. Streams text deltas
 * and tool activity through `emit` as they happen.
 */
async function runLoop(opts: {
  system: string;
  messages: Anthropic.MessageParam[];
  tools: TmsTool[];
  model: string;
  ctx: ToolContext;
  emit: (event: RuntimeEvent) => void;
}): Promise<{ text: string; toolCalls: ToolCallLog[]; usage: { input: number; output: number } }> {
  const { system, tools, model, ctx, emit } = opts;
  const client = getClient();
  const messages = [...opts.messages];
  const wireTools = toAnthropicTools(tools);
  const toolCalls: ToolCallLog[] = [];
  const usage = { input: 0, output: 0 };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = client.messages.stream({
      model,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      tools: wireTools,
      messages,
    });

    stream.on('text', delta => emit({ type: 'text', text: delta }));

    const message = await stream.finalMessage();
    usage.input += message.usage.input_tokens ?? 0;
    usage.output += message.usage.output_tokens ?? 0;

    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content });
      continue;
    }

    if (message.stop_reason !== 'tool_use') {
      return { text: textOf(message), toolCalls, usage };
    }

    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: message.content });

    // Parallel tool calls come back in one turn; run them together and return
    // every result in a single user message.
    const results = await Promise.all(
      toolUses.map(async block => {
        emit({ type: 'tool', name: block.name, input: block.input });
        const { ok, result } = await executeTool(block.name, block.input, ctx);
        toolCalls.push({ name: block.name, input: block.input, ok });
        emit({
          type: 'tool_result',
          name: block.name,
          ok,
          preview: result.length > 200 ? `${result.slice(0, 200)}…` : result,
        });
        return { type: 'tool_result' as const, tool_use_id: block.id, content: result, is_error: !ok };
      }),
    );

    messages.push({ role: 'user', content: results });
  }

  return {
    text: 'I reached my limit on tool calls for this turn without settling on an answer. Narrow the request and I will try again.',
    toolCalls,
    usage,
  };
}

/**
 * One assistant turn. Falls back to the offline core when no API key is set so
 * the HUD stays usable without credentials.
 */
export async function streamAssistant(opts: {
  history: { role: string; content: string }[];
  input: string;
  allowWrites: boolean;
  emit: (event: RuntimeEvent) => void;
}) {
  const { history, input, allowWrites, emit } = opts;

  if (!isConfigured()) {
    const reply = await offlineReply(input);
    emit({ type: 'text', text: reply });
    emit({ type: 'done', text: reply, toolCalls: [], offline: true });
    return { text: reply, toolCalls: [] as ToolCallLog[], offline: true };
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role === 'user' ? ('user' as const) : ('assistant' as const), content: m.content })),
    { role: 'user' as const, content: input },
  ];

  try {
    const { text, toolCalls } = await runLoop({
      system: SYSTEM_PROMPT,
      messages,
      tools: allTools,
      model: DEFAULT_MODEL,
      ctx: { allowWrites, depth: 0 },
      emit,
    });
    emit({ type: 'done', text, toolCalls, offline: false });
    return { text, toolCalls, offline: false };
  } catch (err) {
    const message = describeError(err);
    emit({ type: 'error', message });
    throw err;
  }
}

/**
 * Runs a stored agent against a task and records the run. Agents get only the
 * tools they were created with, and only write access if they hold COMMAND.
 */
export async function runAgent(
  agent: { id: string; name: string; role: string; systemPrompt: string; tools: string; model: string; autonomy: string },
  task: string,
  options: { depth?: number; emit?: (event: RuntimeEvent) => void } = {},
) {
  const emit = options.emit ?? (() => {});
  const depth = options.depth ?? 0;

  const run = await prisma.agentRun.create({
    data: { agentId: agent.id, input: task, status: 'RUNNING' },
  });

  if (!isConfigured()) {
    const output = await offlineReply(task);
    return prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETE', output, finishedAt: new Date() },
    });
  }

  let names: string[] = [];
  try {
    names = JSON.parse(agent.tools);
  } catch {
    names = [];
  }
  const tools = names.map(toolByName).filter((t): t is TmsTool => Boolean(t));

  try {
    if (tools.length === 0) throw new Error(`Agent "${agent.name}" has no valid tools assigned.`);

    const { text, toolCalls, usage } = await runLoop({
      system: agentSystemPrompt(agent),
      messages: [{ role: 'user', content: task }],
      tools,
      model: agent.model || DEFAULT_MODEL,
      ctx: { allowWrites: agent.autonomy === 'COMMAND', depth },
      emit,
    });

    return await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETE',
        output: text,
        toolCalls: JSON.stringify(toolCalls),
        tokensIn: usage.input,
        tokensOut: usage.output,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    const message = describeError(err);
    emit({ type: 'error', message });
    return prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error: message, finishedAt: new Date() },
    });
  }
}
