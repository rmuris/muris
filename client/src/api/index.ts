import axios from 'axios';
import type { Customer, Driver, Vehicle, Order, Shipment, DashboardStats } from '../types';

const api = axios.create({ baseURL: '/api' });

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

export const shipments = {
  list: (params?: { status?: string }) => api.get<Shipment[]>('/shipments', { params }).then(r => r.data),
  get: (id: string) => api.get<Shipment>(`/shipments/${id}`).then(r => r.data),
  track: (trackingNo: string) => api.get<Shipment>(`/shipments/track/${trackingNo}`).then(r => r.data),
  assign: (data: { orderId: string; driverId: string; vehicleId: string; notes?: string }) =>
    api.post<Shipment>('/shipments/assign', data).then(r => r.data),
  updateStatus: (id: string, data: { status: string; note?: string; location?: string }) =>
    api.post<Shipment>(`/shipments/${id}/status`, data).then(r => r.data),
};
