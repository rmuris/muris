#!/usr/bin/env node
/**
 * First-run setup: creates server/.env from the checked-in example.
 *
 * .env is gitignored, so a fresh clone has no DATABASE_URL and every Prisma
 * command fails with P1012 before the server can even start. This makes that
 * step automatic rather than a thing you have to know.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = join(root, 'server', '.env');
const example = join(root, 'server', '.env.example');

if (existsSync(env)) {
  console.log('server/.env already exists — leaving it alone.');
} else {
  copyFileSync(example, env);
  console.log('Created server/.env from .env.example.');
  console.log('Add your ANTHROPIC_API_KEY there to enable the full JARVIS assistant.');
}
