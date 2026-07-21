import { create } from 'zustand';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
}

interface AuthState {
  token: string | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isInitialized: boolean;
  setAuth: (token: string, tenant: Tenant) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  tenant: null,
  isLoading: false,
  isInitialized: false,
  initialize: () => {
    if (get().isInitialized) return;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const tenantStr = localStorage.getItem('tenant');
      let tenant = null;
      try {
        tenant = tenantStr ? JSON.parse(tenantStr) : null;
      } catch {
        tenant = null;
      }
      set({ token, tenant, isInitialized: true });
    }
  },
  setAuth: (token, tenant) => {
    localStorage.setItem('token', token);
    localStorage.setItem('tenant', JSON.stringify(tenant));
    set({ token, tenant });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenant');
    set({ token: null, tenant: null });
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));
