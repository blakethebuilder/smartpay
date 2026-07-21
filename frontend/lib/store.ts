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
  setAuth: (token: string, tenant: Tenant) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  tenant: typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem('tenant') || 'null'); } catch { return null; } })() : null,
  isLoading: false,
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
