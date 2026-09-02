import express from 'express';
import cors from 'cors';
import customersRouter from './routes/customers';
import ordersRouter from './routes/orders';
import shipmentsRouter from './routes/shipments';
import fleetRouter from './routes/fleet';
import dashboardRouter from './routes/dashboard';
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
});
