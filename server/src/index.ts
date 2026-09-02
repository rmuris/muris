// Loads server/.env before anything reads process.env. Prisma happens to load
// it too, but relying on that side effect makes a missing key look like a bug
// in the assistant rather than a missing line in a file.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import customersRouter from './routes/customers';
import ordersRouter from './routes/orders';
import shipmentsRouter from './routes/shipments';
import fleetRouter from './routes/fleet';
import dashboardRouter from './routes/dashboard';
import { DEFAULT_MODEL, isConfigured } from './ai/client';
import assistantRouter from './routes/assistant';
import agentsRouter from './routes/agents';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/fleet', fleetRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/agents', agentsRouter);

app.listen(PORT, () => {
  console.log(`TMS server running on http://localhost:${PORT}`);
  // State the assistant's mode at boot — otherwise a key that never loaded is
  // only discoverable by asking JARVIS and reading its reply.
  if (isConfigured()) {
    console.log(`JARVIS: reasoning ONLINE (${DEFAULT_MODEL})`);
  } else {
    console.log('JARVIS: OFFLINE CORE — no ANTHROPIC_API_KEY found in server/.env');
    console.log('        Add the key to server/.env, then stop (Ctrl+C) and re-run npm run dev.');
  }
});
