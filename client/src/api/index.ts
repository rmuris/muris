import axios from 'axios';
import type {
  Customer, Driver, Vehicle, Order, Shipment, DashboardStats,
  Agent, AgentRun, AgentStatus, AssistantStatus, Autonomy, ChatSession, RuntimeEvent, ToolSpec,
} from '../types';

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

export const agents = {
  list: () => api.get<Agent[]>('/agents').then(r => r.data),
  get: (id: string) => api.get<Agent>(`/agents/${id}`).then(r => r.data),
  tools: () => api.get<ToolSpec[]>('/agents/tools').then(r => r.data),
  create: (data: {
    name: string;
    role: string;
    systemPrompt: string;
    tools: string[];
    autonomy?: Autonomy;
  }) => api.post<Agent>('/agents', data).then(r => r.data),
  update: (id: string, data: Partial<{ name: string; role: string; systemPrompt: string; tools: string[]; autonomy: Autonomy; status: AgentStatus }>) =>
    api.put<Agent>(`/agents/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  run: (id: string, task: string) => api.post<AgentRun>(`/agents/${id}/run`, { task }).then(r => r.data),
  runs: (id: string) => api.get<AgentRun[]>(`/agents/${id}/runs`).then(r => r.data),
};

export const assistant = {
  status: () => api.get<AssistantStatus>('/assistant/status').then(r => r.data),
  sessions: () => api.get<ChatSession[]>('/assistant/sessions').then(r => r.data),
  session: (id: string) => api.get<ChatSession>(`/assistant/sessions/${id}`).then(r => r.data),
  deleteSession: (id: string) => api.delete(`/assistant/sessions/${id}`),

  /**
   * Streams one assistant turn. Uses fetch rather than axios because the
   * response is a server-sent event stream read incrementally.
   */
  async chat(
    body: { message: string; sessionId?: string; allowWrites?: boolean },
    onEvent: (event: RuntimeEvent) => void,
    signal?: AbortSignal,
  ) {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Assistant unavailable (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line; keep any partial tail.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          onEvent(JSON.parse(payload) as RuntimeEvent);
        } catch {
          // A malformed frame shouldn't kill the stream.
        }
      }
    }
  },
};
