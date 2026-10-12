import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSession, login as apiLogin, logout as apiLogout, setApiHandlers } from '../utils/api.ts';

interface SessionUser {
  email: string;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  logIn: (email: string, password: string) => Promise<string | null>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logIn: async () => null,
  logOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setApiHandlers({ onUnauthorized: () => setUser(null) });
    getSession().then((s) => {
      setUser(s.authenticated && s.email ? { email: s.email } : null);
      setLoading(false);
    });
  }, []);

  // Devuelve null si entró bien, o el mensaje de error.
  const logIn = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    if (result.ok && result.email) {
      setUser({ email: result.email });
      return null;
    }
    return result.error || 'No se pudo iniciar sesión.';
  }, []);

  const logOut = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, logIn, logOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
