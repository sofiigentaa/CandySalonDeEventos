import crypto from 'crypto';
import express from 'express';

// Login del salón: un email autorizado + una contraseña definida en el servidor.
// La sesión es una cookie HttpOnly firmada con HMAC (no se puede falsificar sin
// conocer SESSION_SECRET). Mismo esquema que la Agenda Odontológica.

const SESSION_COOKIE = 'candy_session';
const SESSION_HOURS = 12;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET || '';
  if (secret) return secret;
  // Solo en desarrollo: secreto aleatorio por arranque.
  return isProduction() ? '' : devSecret;
}
const devSecret = crypto.randomBytes(32).toString('hex');

function salonPassword(): string {
  const configured = process.env.SALON_PASSWORD || '';
  if (configured) return configured;
  return isProduction() ? '' : 'candy-demo';
}

function allowedEmails(): string[] {
  return (process.env.SALON_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function assertProductionSecrets(): void {
  if (!isProduction()) return;
  if ((process.env.SALON_PASSWORD || '').length < 12) {
    console.error('Producción: SALON_PASSWORD debe tener al menos 12 caracteres. El servidor no arranca.');
    process.exit(1);
  }
  if ((process.env.SESSION_SECRET || '').length < 32) {
    console.error('Producción: SESSION_SECRET debe tener al menos 32 caracteres aleatorios. El servidor no arranca.');
    process.exit(1);
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb) && a.length === b.length;
}

function clientIp(req: express.Request): string {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket.remoteAddress || 'unknown';
}

function tooManyFailedLogins(ip: string): boolean {
  const row = loginAttempts.get(ip);
  if (!row) return false;
  if (Date.now() > row.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }
  return row.count >= 8;
}

function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const row = loginAttempts.get(ip);
  if (!row || now > row.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return;
  }
  row.count += 1;
}

function signSession(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_HOURS * 3600 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function readSession(req: express.Request): { email: string } | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const raw = (req.headers.cookie || '')
    .split(';')
    .map((p) => p.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!raw) return null;
  const token = decodeURIComponent(raw.slice(SESSION_COOKIE.length + 1));
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (!timingSafeStringEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return { email: String(data.email) };
  } catch {
    return null;
  }
}

export function requireSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = readSession(req);
  if (session) {
    (req as any).user = { uid: session.email, email: session.email };
    return next();
  }
  return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
}

export function registerAuthRoutes(app: express.Express): void {
  app.post('/api/auth/login', (req, res) => {
    const ip = clientIp(req);
    if (tooManyFailedLogins(ip)) {
      return res.status(429).json({ error: 'Demasiados intentos. Esperá 15 minutos.' });
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const expected = salonPassword();
    const emails = allowedEmails();
    const emailOk = email.includes('@') && (emails.length === 0 || emails.includes(email));
    if (!expected || !emailOk || !timingSafeStringEqual(password, expected)) {
      recordFailedLogin(ip);
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    loginAttempts.delete(ip);
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(signSession(email))}; HttpOnly; Path=/; Max-Age=${SESSION_HOURS * 3600}; SameSite=Strict${isProduction() ? '; Secure' : ''}`
    );
    return res.json({ success: true, email });
  });

  app.get('/api/auth/me', (req, res) => {
    const session = readSession(req);
    if (!session) return res.json({ authenticated: false });
    return res.json({ authenticated: true, email: session.email });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`);
    res.json({ success: true });
  });
}
