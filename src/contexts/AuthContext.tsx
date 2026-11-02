import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { setApiHandlers } from '../utils/api.ts';
import { setStorageUserId } from '../utils/storage.ts';
import { isSupabaseConfigured, supabase } from '../utils/supabase.ts';

interface SessionUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  isConfigured: boolean;
  passwordRecovery: boolean;
  logIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isConfigured: false,
  passwordRecovery: false,
  logIn: async () => 'La autenticación no está configurada.',
  signUp: async () => 'La autenticación no está configurada.',
  requestPasswordReset: async () => 'La autenticación no está configurada.',
  updatePassword: async () => 'La autenticación no está configurada.',
  logOut: async () => {},
});

function authErrorMessage(message: string): string {
  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Tu correo todavía no está verificado. Revisá tu bandeja de entrada.';
  }
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (message.toLowerCase().includes('password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  return message;
}

function confirmedUser(session: Session | null): SessionUser | null {
  const account = session?.user;
  if (!account?.email || !account.email_confirmed_at) return null;
  return { id: account.id, email: account.email };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    setApiHandlers({
      onUnauthorized: () => {
        setUser(null);
        setStorageUserId(null);
        if (supabase) {
          void supabase.auth.signOut().then(({ error }) => {
            if (error) console.error('No se pudo cerrar la sesión vencida:', error);
          });
        }
      },
    });

    if (!supabase) {
      setLoading(false);
      setStorageUserId(null);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = confirmedUser(session);
      setUser(currentUser);
      setStorageUserId(currentUser?.id || null);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'La autenticación no está configurada.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? authErrorMessage(error.message) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'La autenticación no está configurada.';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return error ? authErrorMessage(error.message) : null;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) return 'La autenticación no está configurada.';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error ? authErrorMessage(error.message) : null;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return 'La autenticación no está configurada.';
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setPasswordRecovery(false);
    return error ? authErrorMessage(error.message) : null;
  }, []);

  const logOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(authErrorMessage(error.message));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isSupabaseConfigured,
        passwordRecovery,
        logIn,
        signUp,
        requestPasswordReset,
        updatePassword,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
