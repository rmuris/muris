import axios from 'axios';
import type { Customer, Driver, Vehicle, Order, Shipment, DashboardStats, AppUser, Company, Task, OperationUpdate, Document, CustomFieldDef } from '../types';

const api = axios.create({ baseURL: '/api' });

// Attach JWT from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('tms_token');
      localStorage.removeItem('tms_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: AppUser }>('/auth/login', { email, password }).then(r => r.data),
  me: () => api.get<AppUser>('/auth/me').then(r => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }).then(r => r.data),
};

export const users = {
  list: () => api.get<AppUser[]>('/users').then(r => r.data),
  get: (id: string) => api.get<AppUser>(`/users/${id}`).then(r => r.data),
  create: (data: any) => api.post<AppUser>('/users', data).then(r => r.data),
  update: (id: string, data: any) => api.put<AppUser>(`/users/${id}`, data).then(r => r.data),
  updatePermissions: (id: string, data: any) => api.put(`/users/${id}/permissions`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const companies = {
  list: (params?: { type?: string }) => api.get<Company[]>('/companies', { params }).then(r => r.data),
  get: (id: string) => api.get<Company>(`/companies/${id}`).then(r => r.data),
  create: (data: any) => api.post<Company>('/companies', data).then(r => r.data),
  update: (id: string, data: any) => api.put<Company>(`/companies/${id}`, data).then(r => r.data),
  submitOnboarding: (id: string, data: any) => api.put(`/companies/${id}/onboarding`, data).then(r => r.data),
};

export const updates = {
  list: (params?: { shipmentId?: string; orderId?: string }) =>
    api.get<OperationUpdate[]>('/updates', { params }).then(r => r.data),
  create: (data: any) => api.post<OperationUpdate>('/updates', data).then(r => r.data),
  delete: (id: string) => api.delete(`/updates/${id}`),
};

export const tasks = {
  list: (params?: { shipmentId?: string; orderId?: string; companyId?: string; status?: string }) =>
    api.get<Task[]>('/tasks', { params }).then(r => r.data),
  get: (id: string) => api.get<Task>(`/tasks/${id}`).then(r => r.data),
  create: (data: any) => api.post<Task>('/tasks', data).then(r => r.data),
  update: (id: string, data: any) => api.put<Task>(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  addChecklistItem: (taskId: string, text: string) =>
    api.post(`/tasks/${taskId}/checklist`, { text }).then(r => r.data),
  toggleChecklistItem: (taskId: string, itemId: string, isCompleted: boolean) =>
    api.put(`/tasks/${taskId}/checklist/${itemId}`, { isCompleted }).then(r => r.data),
  deleteChecklistItem: (taskId: string, itemId: string) =>
    api.delete(`/tasks/${taskId}/checklist/${itemId}`),
};

export const documents = {
  list: (params?: { shipmentId?: string; orderId?: string; companyId?: string; type?: string }) =>
    api.get<Document[]>('/documents', { params }).then(r => r.data),
  upload: (formData: FormData) =>
    api.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  download: (id: string, filename: string) => {
    api.get(`/documents/${id}/download`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export const dashboard = {
  get: () => api.get<{ stats: DashboardStats; recentShipments: Shipment[] }>('/dashboard').then(r => r.data),
};

export const customers = {
  list: () => api.get<Customer[]>('/customers').then(r => r.data),
  get: (id: string) => api.get<Customer>(`/customers/${id}`).then(r => r.data),
  create: (data: Partial<Customer>) => api.post<Customer>('/customers', data).then(r => r.data),
  update: (id: string, data: Partial<Customer>) => api.put<Customer>(`/customers/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const orders = {
  list: (params?: { status?: string; customerId?: string }) => api.get<Order[]>('/orders', { params }).then(r => r.data),
  get: (id: string) => api.get<Order>(`/orders/${id}`).then(r => r.data),
  create: (data: Partial<Order>) => api.post<Order>('/orders', data).then(r => r.data),
  update: (id: string, data: Partial<Order>) => api.put<Order>(`/orders/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/orders/${id}`),
};

export const fleet = {
  drivers: () => api.get<Driver[]>('/fleet/drivers').then(r => r.data),
  createDriver: (data: Partial<Driver>) => api.post<Driver>('/fleet/drivers', data).then(r => r.data),
  updateDriver: (id: string, data: Partial<Driver>) => api.put<Driver>(`/fleet/drivers/${id}`, data).then(r => r.data),
  deleteDriver: (id: string) => api.delete(`/fleet/drivers/${id}`),
  vehicles: () => api.get<Vehicle[]>('/fleet/vehicles').then(r => r.data),
  createVehicle: (data: Partial<Vehicle>) => api.post<Vehicle>('/fleet/vehicles', data).then(r => r.data),
  updateVehicle: (id: string, data: Partial<Vehicle>) => api.put<Vehicle>(`/fleet/vehicles/${id}`, data).then(r => r.data),
  deleteVehicle: (id: string) => api.delete(`/fleet/vehicles/${id}`),
};

export const customFields = {
  list: (entityType?: string) =>
    api.get<CustomFieldDef[]>('/custom-fields', { params: entityType ? { entityType } : undefined }).then(r => r.data),
  create: (data: any) => api.post<CustomFieldDef>('/custom-fields', data).then(r => r.data),
  update: (id: string, data: any) => api.put<CustomFieldDef>(`/custom-fields/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/custom-fields/${id}`),
  saveValues: (entityType: string, entityId: string, values: Record<string, any>) =>
    api.put(`/custom-fields/values/${entityType}/${entityId}`, values).then(r => r.data),
};

export const shipments = {
  list: (params?: { status?: string }) => api.get<Shipment[]>('/shipments', { params }).then(r => r.data),
  get: (id: string) => api.get<Shipment>(`/shipments/${id}`).then(r => r.data),
  track: (trackingNo: string) => api.get<Shipment>(`/shipments/track/${trackingNo}`).then(r => r.data),
  assign: (data: { orderId: string; driverId: string; vehicleId: string; notes?: string }) =>
    api.post<Shipment>('/shipments/assign', data).then(r => r.data),
  updateStatus: (id: string, data: { status: string; note?: string; location?: string }) =>
    api.post<Shipment>(`/shipments/${id}/status`, data).then(r => r.data),
};
