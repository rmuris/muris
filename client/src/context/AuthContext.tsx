import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AppUser, UserPermission } from '../types';

interface AuthState {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AppUser) => void;
  logout: () => void;
  can: (resource: string, action: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete') => boolean;
  isInternal: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('tms_token'),
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('tms_token');
    const raw = localStorage.getItem('tms_user');
    if (token && raw) {
      try {
        setState({ user: JSON.parse(raw), token, loading: false });
      } catch {
        localStorage.removeItem('tms_token');
        localStorage.removeItem('tms_user');
        setState({ user: null, token: null, loading: false });
      }
    } else {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  function login(token: string, user: AppUser) {
    localStorage.setItem('tms_token', token);
    localStorage.setItem('tms_user', JSON.stringify(user));
    setState({ user, token, loading: false });
  }

  function logout() {
    localStorage.removeItem('tms_token');
    localStorage.removeItem('tms_user');
    setState({ user: null, token: null, loading: false });
  }

  function can(resource: string, action: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete') {
    if (!state.user) return false;
    const { role, permissions } = state.user;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
    const perm = permissions.find((p: UserPermission) => p.resource === resource);
    return perm ? perm[action] : false;
  }

  function isInternal() {
    if (!state.user) return false;
    return !state.user.companyId;
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, can, isInternal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
