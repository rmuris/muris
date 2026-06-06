export type OrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type ShipmentStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
export type DriverStatus = 'AVAILABLE' | 'ON_ROUTE' | 'OFF_DUTY';
export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
  _count?: { orders: number };
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licenseNo: string;
  status: DriverStatus;
  vehicle?: Vehicle;
}

export interface Vehicle {
  id: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status: VehicleStatus;
  mileage: number;
  lastService?: string;
  driver?: Driver;
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customer: Customer;
  origin: string;
  destination: string;
  weight: number;
  description?: string;
  status: OrderStatus;
  totalCost?: number;
  createdAt: string;
  shipment?: Shipment;
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: string;
  note?: string;
  location?: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  trackingNo: string;
  orderId: string;
  order: Order;
  driver?: Driver;
  vehicle?: Vehicle;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  estimatedDist?: number;
  estimatedTime?: number;
  pickedUpAt?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  events?: ShipmentEvent[];
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  activeShipments: number;
  deliveredToday: number;
  availableDrivers: number;
  availableVehicles: number;
}
