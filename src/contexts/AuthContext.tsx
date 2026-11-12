import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setApiHandlers } from '../utils/api.ts';
import { setStorageUserId } from '../utils/storage.ts';

// Autenticación propia: email + contraseña + código de app autenticadora (2FA).
// La sesión vive en una cookie httpOnly que maneja el servidor.

export interface SessionUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

// Respuesta del paso 1 (registro o ingreso): falta el código de la app.
export interface PendingTwoFactor {
  step: 'enroll' | 'verify';
  pendingToken: string;
  email: string;
  qrCode?: string; // solo en 'enroll'
  secret?: string; // solo en 'enroll'
}

type Result<T> = { data?: T; error?: string };

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<Result<PendingTwoFactor>>;
  logIn: (email: string, password: string) => Promise<Result<PendingTwoFactor>>;
  verifyCode: (pendingToken: string, code: string) => Promise<string | null>;
  resetPassword: (email: string, code: string, password: string) => Promise<string | null>;
  logOut: () => Promise<void>;
}

const notReady = async () => ({ error: 'Cargando…' });

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: notReady,
  logIn: notReady,
  verifyCode: async () => 'Cargando…',
  resetPassword: async () => 'Cargando…',
  logOut: async () => {},
});

async function postAuth<T>(path: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: data?.error || `Error del servidor (${res.status}).` };
    return { data: data as T };
  } catch {
    return { error: 'Sin conexión con el servidor. Revisá internet y probá de nuevo.' };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyUser = useCallback((next: SessionUser | null) => {
    setUser(next);
    setStorageUserId(next?.id || null);
  }, []);

  useEffect(() => {
    setApiHandlers({ onUnauthorized: () => applyUser(null) });

    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (res) => (res.ok ? ((await res.json()) as { user: SessionUser }).user : null))
      .catch(() => null)
      .then((current) => {
        if (cancelled) return;
        applyUser(current);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  const signUp = useCallback((email: string, password: string) => postAuth<PendingTwoFactor>('signup', { email, password }), []);

  const logIn = useCallback((email: string, password: string) => postAuth<PendingTwoFactor>('login', { email, password }), []);

  const verifyCode = useCallback(async (pendingToken: string, code: string) => {
    const result = await postAuth<{ user: SessionUser }>('verify', { pendingToken, code });
    if (result.data) applyUser(result.data.user);
    return result.error || null;
  }, [applyUser]);

  const resetPassword = useCallback(async (email: string, code: string, password: string) => {
    const result = await postAuth<{ user: SessionUser }>('reset-password', { email, code, password });
    if (result.data) applyUser(result.data.user);
    return result.error || null;
  }, [applyUser]);

  const logOut = useCallback(async () => {
    const result = await postAuth('logout');
    if (result.error) throw new Error(result.error);
    applyUser(null);
  }, [applyUser]);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, logIn, verifyCode, resetPassword, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
