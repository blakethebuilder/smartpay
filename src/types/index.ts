export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface Merchant {
  id: string;
  tenantId: string;
  gateway: 'paystack' | 'ozow';
  publicKeyEncrypted: string;
  secretKeyEncrypted: string;
  webhookSecretEncrypted?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppInstance {
  id: string;
  tenantId: string;
  instanceName: string;
  instanceId: string;
  status: 'connected' | 'disconnected' | 'connecting';
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'cancelled';
  description?: string;
  metadata?: Record<string, unknown>;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  gateway: 'paystack' | 'ozow';
  gatewayReference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  tenantId: string;
  instanceId: string;
  customerId: string;
  type: 'text' | 'media' | 'template';
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  tenantId: string;
  gateway: string;
  eventType: string;
  payload: Record<string, unknown>;
  processedAt?: Date;
  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
}

export interface AuthPayload {
  tenantId: string;
  email: string;
  role: 'owner' | 'admin' | 'user';
}

export interface RequestContext {
  tenantId: string;
  userId: string;
  email: string;
  role: string;
}
