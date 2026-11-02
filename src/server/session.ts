import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import express from 'express';

type AuthenticatedUser = Pick<User, 'id' | 'email'>;

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

let supabase: SupabaseClient | null = null;

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!supabase) {
    supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return supabase;
}

export function assertSupabaseConfig(): void {
  if (getSupabaseClient()) return;
  throw new Error('Configurá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para habilitar la autenticación.');
}

export async function requireSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });

  const client = getSupabaseClient();
  if (!client) return res.status(503).json({ error: 'La autenticación no está configurada en el servidor.' });

  try {
    const { data, error } = await client.auth.getUser(match[1]);
    if (error) {
      const status = error.status === 401 || error.status === 403 ? 401 : 503;
      return res.status(status).json({
        error: status === 401 ? 'Tu sesión venció. Volvé a iniciar sesión.' : 'No se pudo verificar la sesión.',
      });
    }
    if (!data.user) return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
    if (!data.user.email_confirmed_at) {
      return res.status(403).json({ error: 'Verificá tu correo electrónico antes de continuar.' });
    }
    req.user = { id: data.user.id, email: data.user.email || '' };
    return next();
  } catch (error) {
    console.error('No se pudo verificar la sesión de Supabase:', error);
    return res.status(503).json({ error: 'No se pudo verificar la sesión. Probá de nuevo.' });
  }
}
