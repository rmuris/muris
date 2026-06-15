export type OrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type ShipmentStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
export type DriverStatus = 'AVAILABLE' | 'ON_ROUTE' | 'OFF_DUTY';
export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE';
export type CarrierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
export type CustomsStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'RELEASED' | 'EXAM' | 'HOLD' | 'REJECTED';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  rfc?: string;
  ein?: string;
  type?: string;
  status?: string;
  country?: string;
  city?: string;
  state?: string;
  industry?: string;
  creditLimit?: number;
  paymentTerms?: number;
  riskScore?: number;
  trustScore?: number;
  createdAt: string;
  _count?: { orders: number };
}

export interface Carrier {
  id: string;
  name: string;
  mc?: string;
  dot?: string;
  ein?: string;
  rfc?: string;
  email?: string;
  phone?: string;
  country?: string;
  type?: string;
  status: CarrierStatus;
  safetyScore?: number;
  insuranceExpiry?: string;
  insuranceAmount?: number;
  riskScore?: number;
  createdAt: string;
  _count?: { drivers: number; vehicles: number; shipments: number };
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licenseNo: string;
  licenseExpiry?: string;
  medicalCardExpiry?: string;
  fastCardNo?: string;
  passportNo?: string;
  hazmatCert?: boolean;
  status: DriverStatus;
  complianceScore?: number;
  vehicle?: Vehicle;
  carrierId?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  vin?: string;
  make: string;
  model: string;
  year: number;
  type?: string;
  capacity: number;
  status: VehicleStatus;
  mileage: number;
  lastService?: string;
  nextServiceMileage?: number;
  driver?: Driver;
  carrierId?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  cost: number;
  mileageAtService?: number;
  performedAt: string;
  nextServiceDate?: string;
  vendor?: string;
  status: string;
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
  carrier?: Carrier;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  estimatedDist?: number;
  estimatedTime?: number;
  pickedUpAt?: string;
  deliveredAt?: string;
  notes?: string;
  riskScore?: number;
  etaConfidence?: number;
  profitability?: number;
  createdAt: string;
  updatedAt: string;
  events?: ShipmentEvent[];
}

export interface Quote {
  id: string;
  quoteNo: string;
  customerId?: string;
  customer?: Customer;
  origin: string;
  destination: string;
  weight?: number;
  commodity?: string;
  equipmentType?: string;
  rate?: number;
  fuelSurcharge?: number;
  totalRate?: number;
  costBasis?: number;
  margin?: number;
  marginPct?: number;
  status: QuoteStatus;
  validUntil?: string;
  aiGenerated?: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customer?: Customer;
  orderId?: string;
  type: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface CustomsEntry {
  id: string;
  shipmentId?: string;
  type: string;
  direction: string;
  status: CustomsStatus;
  pedimentoNo?: string;
  entryNo?: string;
  portOfEntry?: string;
  brokerName?: string;
  hsCode?: string;
  commodityDesc?: string;
  totalValue?: number;
  duties?: number;
  taxes?: number;
  complianceScore?: number;
  riskScore?: number;
  aiAnalysis?: string;
  createdAt: string;
  cartaPorte?: CartaPorte;
}

export interface CartaPorte {
  id: string;
  version: string;
  folio?: string;
  rfcEmisor?: string;
  rfcReceptor?: string;
  rfcTransportista?: string;
  totalDistance?: number;
  commodityCode?: string;
  description?: string;
  weight?: number;
  vehiclePlate?: string;
  driverLicense?: string;
  insurancePolicy?: string;
  validationErrors?: string;
  complianceScore?: number;
  status: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  type: string;
  sqft?: number;
  capacity?: number;
  isActive: boolean;
  _count?: { inventory: number; locations: number };
}

export interface InventoryItem {
  id: string;
  warehouseId: string;
  sku: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  weight?: number;
  lotNumber?: string;
  customerId?: string;
  hsCode?: string;
  unitValue?: number;
  totalValue?: number;
  expirationDate?: string;
  warehouse?: Warehouse;
}

export interface RiskEvent {
  id: string;
  customerId?: string;
  customer?: Customer;
  entityType?: string;
  entityId?: string;
  type: string;
  severity: RiskSeverity;
  title: string;
  description?: string;
  status: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface BorderCrossing {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  portType: string;
  waitTimeNB?: number;
  waitTimeSB?: number;
  isOpen: boolean;
  alerts?: string;
  lastUpdated?: string;
}

export interface AIAgentLog {
  id: string;
  agentType: string;
  action: string;
  output?: string;
  status: string;
  duration?: number;
  createdAt: string;
}

export interface AIPriority {
  rank: number;
  priority: string;
  title: string;
  action: string;
  module: string;
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  activeShipments: number;
  deliveredToday: number;
  availableDrivers: number;
  availableVehicles: number;
  totalCarriers?: number;
  totalCustomers?: number;
  openRiskEvents?: number;
  totalRevenue?: number;
  totalAR?: number;
  totalCollected?: number;
  complianceScore?: number;
}
