import express from 'express';
import cors from 'cors';
import path from 'path';
import customersRouter from './routes/customers';
import ordersRouter from './routes/orders';
import shipmentsRouter from './routes/shipments';
import fleetRouter from './routes/fleet';
import dashboardRouter from './routes/dashboard';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import companiesRouter from './routes/companies';
import updatesRouter from './routes/updates';
import tasksRouter from './routes/tasks';
import documentsRouter from './routes/documents';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/updates', updatesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/fleet', fleetRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(PORT, () => {
  console.log(`TMS server running on http://localhost:${PORT}`);
});
