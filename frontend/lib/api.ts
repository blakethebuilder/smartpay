import axios from 'axios';

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'smartpay.smartintegrate.co.za') {
      return 'https://payapi.smartintegrate.co.za';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('tenant');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface Tenant { id: string; name: string; email: string; phone?: string; status: string; createdAt: string; }
export interface Customer { id: string; name: string; email?: string; phone: string; metadata?: Record<string, unknown>; createdAt: string; }
export interface Invoice { id: string; customerId: string; amount: number; currency: string; status: string; description?: string; dueDate?: string; paidAt?: string; createdAt: string; }
export interface Payment { id: string; invoiceId: string; gateway: string; amount: number; currency: string; status: string; createdAt: string; }
export interface Merchant { id: string; gateway: string; isActive: boolean; createdAt: string; }
export interface WhatsAppInstance { id: string; instanceName: string; instanceId: string; status: string; phoneNumber?: string; createdAt: string; }
export interface Message { id: string; instanceId: string; customerId: string; type: string; content: string; status: string; sentAt?: string; createdAt: string; }
export interface Gateway { id: string; name: string; description: string; status: 'live' | 'coming_soon'; }

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
};

// Tenant
export const tenantApi = {
  getProfile: () => api.get<Tenant>('/tenants/profile'),
  updateProfile: (data: { name?: string; phone?: string }) => api.put('/tenants/profile', data),
  getMerchants: () => api.get<Merchant[]>('/tenants/merchants'),
  addMerchant: (data: { gateway: string; publicKey: string; secretKey: string; webhookSecret?: string }) => api.post('/tenants/merchants', data),
  deleteMerchant: (id: string) => api.delete(`/tenants/merchants/${id}`),
};

// Customer
export const customerApi = {
  list: (page = 1, limit = 50) => api.get<{ customers: Customer[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/customers?page=${page}&limit=${limit}`),
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (data: { name: string; email?: string; phone: string; metadata?: Record<string, unknown> }) => api.post<Customer>('/customers', data),
  update: (id: string, data: { name?: string; email?: string; phone?: string }) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

// Invoice
export const invoiceApi = {
  list: (page = 1, status?: string) => api.get<{ invoices: Invoice[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/invoices?page=${page}${status ? `&status=${status}` : ''}`),
  get: (id: string) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: { customerId: string; amount: number; currency?: string; description?: string; dueDate?: string }) => api.post<Invoice>('/invoices', data),
  createPaymentLink: (data: { invoiceId: string; gateway: string }) => api.post<{ paymentUrl: string; reference: string }>('/invoices/payment-link', data),
  getGateways: () => api.get<Gateway[]>('/invoices/gateways'),
};

// WhatsApp
export const whatsappApi = {
  listInstances: () => api.get<WhatsAppInstance[]>('/whatsapp/instances'),
  createInstance: (data: { name: string }) => api.post<WhatsAppInstance>('/whatsapp/instances', data),
  getQRCode: (id: string) => api.get(`/whatsapp/instances/${id}/qr`),
  getStatus: (id: string) => api.get(`/whatsapp/instances/${id}/status`),
  sendMessage: (data: { instanceId: string; customerId: string; content: string; type?: string; mediaUrl?: string }) => api.post<Message>('/whatsapp/messages', data),
  listMessages: (instanceId?: string, page = 1) => api.get<{ messages: Message[] }>(`/whatsapp/messages?page=${page}${instanceId ? `&instanceId=${instanceId}` : ''}`),
};

// Demo
export const demoApi = {
  simulatePayment: (reference: string) => api.post<{ success: boolean; message: string }>('/demo/simulate-payment', { reference }),
};
