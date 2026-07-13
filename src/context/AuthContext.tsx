import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthUser {
  dni: string;
  email: string;
  expiresAt: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (dni: string, email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'simulauna_auth_v2';
const LEGACY_STORAGE_KEY = 'simulauna_auth';
const TTL_MS = 30 * 60 * 1000; // 30 min

function readStoredUser(key: string): AuthUser | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Clave nueva primero; si no existe, migración silenciosa desde la clave legada.
    const current = readStoredUser(STORAGE_KEY);
    if (current) return current;

    const legacy = readStoredUser(LEGACY_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return legacy;
    }
    return null;
  });

  useEffect(() => {
    if (!user) return;
    const remaining = user.expiresAt - Date.now();
    if (remaining <= 0) {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const t = setTimeout(() => {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }, remaining);
    return () => clearTimeout(t);
  }, [user]);

  const login = (dni: string, email: string) => {
    const u: AuthUser = { dni, email, expiresAt: Date.now() + TTL_MS };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
