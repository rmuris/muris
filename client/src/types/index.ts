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

// --- Auth & Multi-tenant types ---

export type CompanyType = 'CUSTOMER' | 'SUPPLIER' | 'US_CARRIER' | 'MX_CARRIER' | 'US_CUSTOMS_BROKER' | 'MX_CUSTOMS_BROKER';
export type OnboardingStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'STAFF' | 'PORTAL_USER' | 'VIEWER';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type UpdateType = 'NOTE' | 'STATUS_CHANGE' | 'DOCUMENT_UPLOAD' | 'TASK_UPDATE' | 'CUSTOMS_UPDATE' | 'CARRIER_UPDATE' | 'EXCEPTION' | 'CHECKPOINT';
export type UpdateVisibility = 'INTERNAL' | 'ALL' | 'CUSTOMER' | 'CARRIER' | 'CUSTOMS_BROKER';
export type DocumentType = 'PEDIMENTO' | 'US_CUSTOMS_ENTRY' | 'COMMERCIAL_INVOICE' | 'BOL' | 'PACKING_LIST' | 'CERTIFICATE_OF_ORIGIN' | 'OTHER';

export interface UserPermission {
  id: string;
  userId: string;
  resource: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  taxId?: string;
  onboardingStatus: OnboardingStatus;
  onboardingData?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number; documents: number; tasks: number };
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  company?: Company;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions: UserPermission[];
}

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  text: string;
  isCompleted: boolean;
  completedAt?: string;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedToCompanyId?: string;
  assignedToCompany?: Company;
  assignedToUserId?: string;
  assignedToUser?: { id: string; name: string; email: string };
  createdByUserId: string;
  createdBy?: { id: string; name: string };
  shipmentId?: string;
  orderId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  checklistItems: TaskChecklistItem[];
}

export interface OperationUpdate {
  id: string;
  shipmentId?: string;
  orderId?: string;
  authorId: string;
  author?: { id: string; name: string; role: string };
  companyId?: string;
  company?: { id: string; name: string; type: string };
  type: UpdateType;
  content: string;
  visibility: UpdateVisibility;
  metadata?: string;
  createdAt: string;
}

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'BOOLEAN';
export type CustomFieldEntityType = 'ORDER' | 'SHIPMENT' | 'CUSTOMER' | 'COMPANY';

export interface CustomFieldDef {
  id: string;
  entityType: CustomFieldEntityType;
  name: string;
  label: string;
  fieldType: CustomFieldType;
  options?: string; // JSON string of string[]
  required: boolean;
  position: number;
  isActive: boolean;
  createdAt: string;
}

export interface Document {
  id: string;
  type: DocumentType;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  shipmentId?: string;
  orderId?: string;
  uploadedById: string;
  uploadedBy?: { id: string; name: string };
  companyId?: string;
  company?: { id: string; name: string; type: string };
  description?: string;
  isPublic: boolean;
  createdAt: string;
}
