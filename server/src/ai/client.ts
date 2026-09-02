import Anthropic from '@anthropic-ai/sdk';

/**
 * The model every part of the AI layer runs on. Kept here so agents that don't
 * pin their own model, and the assistant itself, stay on one identifier.
 */
export const DEFAULT_MODEL = 'claude-opus-5';

let client: Anthropic | null = null;

/** Whether a credential is present. When false the AI layer falls back to the offline core. */
export function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Lazily built so the server still boots (and the offline core still answers)
 * when no key is configured.
 */
export function getClient(): Anthropic {
  if (!isConfigured()) throw new Error('ANTHROPIC_API_KEY is not set');
  if (!client) client = new Anthropic();
  return client;
}
