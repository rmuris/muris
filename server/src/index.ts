import express from 'express';
import cors from 'cors';
import customersRouter from './routes/customers';
import ordersRouter from './routes/orders';
import shipmentsRouter from './routes/shipments';
import fleetRouter from './routes/fleet';
import dashboardRouter from './routes/dashboard';
import carriersRouter from './routes/carriers';
import customsRouter from './routes/customs';
import warehouseRouter from './routes/warehouse';
import quotesRouter from './routes/quotes';
import invoicesRouter from './routes/invoices';
import riskRouter from './routes/risk';
import complianceRouter from './routes/compliance';
import borderRouter from './routes/border';
import analyticsRouter from './routes/analytics';
import notificationsRouter from './routes/notifications';
import aiRouter from './routes/ai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/fleet', fleetRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/carriers', carriersRouter);
app.use('/api/customs', customsRouter);
app.use('/api/warehouse', warehouseRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/risk', riskRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/border', borderRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/ai', aiRouter);

app.listen(PORT, () => {
  console.log(`AI Logistics OS running on http://localhost:${PORT}`);
});
