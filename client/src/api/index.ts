import axios, { type AxiosResponse } from 'axios';

const api = axios.create({ baseURL: '/api' });
const d = (r: AxiosResponse) => r.data;

export const dashboard = {
  get: () => api.get('/dashboard').then(d),
};

export const customers = {
  list: () => api.get('/customers').then(d),
  get: (id: string) => api.get(`/customers/${id}`).then(d),
  create: (data: object) => api.post('/customers', data).then(d),
  update: (id: string, data: object) => api.put(`/customers/${id}`, data).then(d),
  delete: (id: string) => api.delete(`/customers/${id}`).then(d),
};

export const carriers = {
  list: () => api.get('/carriers').then(d),
  get: (id: string) => api.get(`/carriers/${id}`).then(d),
  create: (data: object) => api.post('/carriers', data).then(d),
  update: (id: string, data: object) => api.put(`/carriers/${id}`, data).then(d),
  delete: (id: string) => api.delete(`/carriers/${id}`).then(d),
};

export const orders = {
  list: (params?: { status?: string; customerId?: string }) => api.get('/orders', { params }).then(d),
  get: (id: string) => api.get(`/orders/${id}`).then(d),
  create: (data: object) => api.post('/orders', data).then(d),
  update: (id: string, data: object) => api.put(`/orders/${id}`, data).then(d),
  delete: (id: string) => api.delete(`/orders/${id}`).then(d),
};

export const fleet = {
  drivers: () => api.get('/fleet/drivers').then(d),
  createDriver: (data: object) => api.post('/fleet/drivers', data).then(d),
  updateDriver: (id: string, data: object) => api.put(`/fleet/drivers/${id}`, data).then(d),
  deleteDriver: (id: string) => api.delete(`/fleet/drivers/${id}`).then(d),
  vehicles: () => api.get('/fleet/vehicles').then(d),
  createVehicle: (data: object) => api.post('/fleet/vehicles', data).then(d),
  updateVehicle: (id: string, data: object) => api.put(`/fleet/vehicles/${id}`, data).then(d),
  deleteVehicle: (id: string) => api.delete(`/fleet/vehicles/${id}`).then(d),
};

export const shipments = {
  list: (params?: { status?: string }) => api.get('/shipments', { params }).then(d),
  get: (id: string) => api.get(`/shipments/${id}`).then(d),
  track: (trackingNo: string) => api.get(`/shipments/track/${trackingNo}`).then(d),
  assign: (data: object) => api.post('/shipments/assign', data).then(d),
  updateStatus: (id: string, data: object) => api.post(`/shipments/${id}/status`, data).then(d),
};

export const quotes = {
  list: () => api.get('/quotes').then(d),
  create: (data: object) => api.post('/quotes', data).then(d),
  update: (id: string, data: object) => api.put(`/quotes/${id}`, data).then(d),
  delete: (id: string) => api.delete(`/quotes/${id}`).then(d),
};

export const invoices = {
  list: (type?: string) => api.get('/invoices', { params: type ? { type } : undefined }).then(d),
  summary: () => api.get('/invoices/summary').then(d),
  create: (data: object) => api.post('/invoices', data).then(d),
  update: (id: string, data: object) => api.put(`/invoices/${id}`, data).then(d),
  addPayment: (id: string, data: object) => api.post(`/invoices/${id}/payment`, data).then(d),
};

export const customs = {
  entries: () => api.get('/customs/entries').then(d),
  entry: (id: string) => api.get(`/customs/entries/${id}`).then(d),
  createEntry: (data: object) => api.post('/customs/entries', data).then(d),
  updateEntry: (id: string, data: object) => api.put(`/customs/entries/${id}`, data).then(d),
  cartaPorteList: () => api.get('/customs/carta-porte').then(d),
  createCartaPorte: (data: object) => api.post('/customs/carta-porte', data).then(d),
  validateCartaPorte: (id: string) => api.post(`/customs/carta-porte/${id}/validate`, {}).then(d),
  borderCrossings: () => api.get('/customs/border-crossings').then(d),
};

export const warehouse = {
  list: () => api.get('/warehouse').then(d),
  get: (id: string) => api.get(`/warehouse/${id}`).then(d),
  create: (data: object) => api.post('/warehouse', data).then(d),
  inventory: () => api.get('/warehouse/inventory/all').then(d),
  createInventory: (data: object) => api.post('/warehouse/inventory', data).then(d),
  updateInventory: (id: string, data: object) => api.put(`/warehouse/inventory/${id}`, data).then(d),
  deleteInventory: (id: string) => api.delete(`/warehouse/inventory/${id}`).then(d),
};

export const risk = {
  events: () => api.get('/risk/events').then(d),
  score: () => api.get('/risk/score').then(d),
  createEvent: (data: object) => api.post('/risk/events', data).then(d),
  resolveEvent: (id: string) => api.put(`/risk/events/${id}/resolve`, {}).then(d),
};

export const compliance = {
  list: () => api.get('/compliance').then(d),
  score: () => api.get('/compliance/score').then(d),
  create: (data: object) => api.post('/compliance', data).then(d),
};

export const border = {
  list: () => api.get('/border').then(d),
};

export const analytics = {
  kpi: () => api.get('/analytics/kpi').then(d),
  revenue: () => api.get('/analytics/revenue').then(d),
  lanes: () => api.get('/analytics/lanes').then(d),
};

export const ai = {
  priorities: () => api.get('/ai/priorities').then(d),
  agentLogs: () => api.get('/ai/agents/log').then(d),
  runAgent: (data: object) => api.post('/ai/agents/run', data).then(d),
  automations: () => api.get('/ai/automations').then(d),
  createAutomation: (data: object) => api.post('/ai/automations', data).then(d),
};

export const notifications = {
  list: () => api.get('/notifications').then(d),
  markRead: (id: string) => api.put(`/notifications/${id}/read`, {}).then(d),
  create: (data: object) => api.post('/notifications', data).then(d),
};
