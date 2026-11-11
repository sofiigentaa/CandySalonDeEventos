// Autenticación propia (sin Supabase):
// - Contraseña guardada con scrypt (sal aleatoria por usuario).
// - Segundo paso obligatorio con app autenticadora (TOTP, RFC 6238).
//   La cuenta queda activa recién cuando vincula la app y escribe un código.
// - Sesión en cookie httpOnly; en la base solo se guarda el hash del token.
import crypto from 'crypto';
import express from 'express';
import QRCode from 'qrcode';
import { createPool } from '../db/index.ts';
import { isMemoryMode } from '../db/eventsService.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const SESSION_COOKIE = 'candy_session';
const SESSION_DAYS = 30;
const PENDING_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const TOTP_ISSUER = 'Golondrina';

// ---------------------------------------------------------------------------
// Contraseñas
// ---------------------------------------------------------------------------

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  // Sin hash igual se calcula uno, para que el tiempo de respuesta no revele si el email existe.
  const [scheme, saltB64, keyB64] = (stored || 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$').split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(keyB64 || '', 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'));
  return Boolean(stored) && expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function validateCredentials(body: any): { email: string; password: string } {
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new AuthError('Ingresá un email válido.');
  if (password.length < 8) throw new AuthError('La contraseña debe tener al menos 8 caracteres.');
  if (password.length > 200) throw new AuthError('La contraseña es demasiado larga.');
  return { email, password };
}

// ---------------------------------------------------------------------------
// TOTP (app autenticadora)
// ---------------------------------------------------------------------------

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of text.replace(/=+$/, '').toUpperCase()) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, '0');
}

// Devuelve el "paso" de 30 s que coincide (tolera ±30 s de desfase de reloj), o null.
export function matchTotp(secret: string, code: string, lastUsedStep: number | null, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 1000 / 30);
  for (const step of [current - 1, current, current + 1]) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue; // un código no se puede reusar
    const expected = Buffer.from(totpAt(secret, step));
    if (crypto.timingSafeEqual(expected, Buffer.from(code))) return step;
  }
  return null;
}

export const __totpForTests = { totpAt, base32Encode, base32Decode };

async function buildEnrollment(email: string, secret: string) {
  const uri = `otpauth://totp/${encodeURIComponent(`${TOTP_ISSUER}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(TOTP_ISSUER)}&algorithm=SHA1&digits=6&period=30`;
  const qrCode = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
  return { qrCode, secret };
}

// ---------------------------------------------------------------------------
// Almacenamiento: PostgreSQL o memoria (modo demo sin base)
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  passwordHash: string | null;
  totpSecret: string | null;
  totpEnabled: boolean;
  totpLastStep: number | null;
}

interface TokenRow {
  userId: string;
  kind: 'session' | 'pending';
  expiresAt: number;
  attempts: number;
}

const memUsers = new Map<string, UserRow>(); // por email
const memTokens = new Map<string, TokenRow>(); // por hash del token

function mapUser(row: any): UserRow {
  return {
    id: row.uid,
    email: row.email,
    passwordHash: row.password_hash,
    totpSecret: row.totp_secret,
    totpEnabled: Boolean(row.totp_enabled),
    totpLastStep: row.totp_last_step === null || row.totp_last_step === undefined ? null : Number(row.totp_last_step),
  };
}

let authTablesReady: Promise<void> | null = null;

export function ensureAuthTables(): Promise<void> {
  if (isMemoryMode()) return Promise.resolve();
  if (!authTablesReady) {
    authTablesReady = createPool()
      .query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_step BIGINT;
        CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
        CREATE TABLE IF NOT EXISTS auth_tokens (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS auth_tokens_user_idx ON auth_tokens(user_id);
        ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;
        DELETE FROM auth_tokens WHERE expires_at < now();
      `)
      .then(() => undefined)
      .catch((error) => {
        authTablesReady = null;
        throw error;
      });
  }
  return authTablesReady;
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
  if (isMemoryMode()) return memUsers.get(email) || null;
  const { rows } = await createPool().query('SELECT * FROM users WHERE lower(email) = $1 LIMIT 1', [email]);
  return rows[0] ? mapUser(rows[0]) : null;
}

async function findUserById(id: string): Promise<UserRow | null> {
  if (isMemoryMode()) return [...memUsers.values()].find((u) => u.id === id) || null;
  const { rows } = await createPool().query('SELECT * FROM users WHERE uid = $1 LIMIT 1', [id]);
  return rows[0] ? mapUser(rows[0]) : null;
}

// Crea la cuenta, o reemplaza los datos de una que nunca terminó de activarse.
// Si el email ya existía de antes (cuentas de Supabase), se conserva su id y
// por lo tanto sus eventos, pagos y demás datos.
async function upsertPendingUser(email: string, passwordHash: string, totpSecret: string): Promise<UserRow> {
  if (isMemoryMode()) {
    const existing = memUsers.get(email);
    const row: UserRow = {
      id: existing?.id || crypto.randomUUID(),
      email,
      passwordHash,
      totpSecret,
      totpEnabled: false,
      totpLastStep: null,
    };
    memUsers.set(email, row);
    return row;
  }
  const { rows } = await createPool().query(
    `INSERT INTO users (uid, email, password_hash, totp_secret, totp_enabled)
     VALUES ($1, $2, $3, $4, false)
     ON CONFLICT ((lower(email))) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, totp_secret = EXCLUDED.totp_secret, totp_enabled = false, totp_last_step = NULL
       WHERE users.totp_enabled = false
     RETURNING *`,
    [crypto.randomUUID(), email, passwordHash, totpSecret]
  );
  if (!rows[0]) throw new AuthError('Ya existe una cuenta con ese email. Iniciá sesión.', 409);
  return mapUser(rows[0]);
}

async function updateUser(user: UserRow, changes: Partial<Pick<UserRow, 'passwordHash' | 'totpSecret' | 'totpEnabled' | 'totpLastStep'>>) {
  Object.assign(user, changes);
  if (isMemoryMode()) {
    memUsers.set(user.email, user);
    return;
  }
  await createPool().query(
    'UPDATE users SET password_hash = $2, totp_secret = $3, totp_enabled = $4, totp_last_step = $5 WHERE uid = $1',
    [user.id, user.passwordHash, user.totpSecret, user.totpEnabled, user.totpLastStep]
  );
}

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

async function createToken(userId: string, kind: TokenRow['kind'], ttlMs: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + ttlMs;
  if (isMemoryMode()) {
    memTokens.set(hashToken(token), { userId, kind, expiresAt, attempts: 0 });
  } else {
    await createPool().query('INSERT INTO auth_tokens (token_hash, user_id, kind, expires_at) VALUES ($1, $2, $3, $4)', [
      hashToken(token),
      userId,
      kind,
      new Date(expiresAt),
    ]);
  }
  return token;
}

async function readToken(token: string, kind: TokenRow['kind']): Promise<TokenRow | null> {
  const key = hashToken(token);
  if (isMemoryMode()) {
    const row = memTokens.get(key);
    return row && row.kind === kind && row.expiresAt > Date.now() ? row : null;
  }
  const { rows } = await createPool().query(
    'SELECT user_id, kind, expires_at, attempts FROM auth_tokens WHERE token_hash = $1 AND kind = $2 AND expires_at > now()',
    [key, kind]
  );
  if (!rows[0]) return null;
  return { userId: rows[0].user_id, kind, expiresAt: new Date(rows[0].expires_at).getTime(), attempts: rows[0].attempts };
}

async function countFailedAttempt(token: string): Promise<void> {
  const key = hashToken(token);
  if (isMemoryMode()) {
    const row = memTokens.get(key);
    if (row) row.attempts += 1;
    return;
  }
  await createPool().query('UPDATE auth_tokens SET attempts = attempts + 1 WHERE token_hash = $1', [key]);
}

async function deleteToken(token: string): Promise<void> {
  if (isMemoryMode()) {
    memTokens.delete(hashToken(token));
    return;
  }
  await createPool().query('DELETE FROM auth_tokens WHERE token_hash = $1', [hashToken(token)]);
}

async function deleteUserTokens(userId: string): Promise<void> {
  if (isMemoryMode()) {
    for (const [key, row] of memTokens) if (row.userId === userId) memTokens.delete(key);
    return;
  }
  await createPool().query('DELETE FROM auth_tokens WHERE user_id = $1', [userId]);
}

// ---------------------------------------------------------------------------
// Límite de intentos (por IP + email), en memoria
// ---------------------------------------------------------------------------

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(req: express.Request, email: string) {
  const key = `${req.ip}|${email}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > ATTEMPT_LIMIT) {
    throw new AuthError('Demasiados intentos. Esperá 15 minutos y probá de nuevo.', 429);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.resetAt < now) attempts.delete(key);
  for (const [key, row] of memTokens) if (row.expiresAt < now) memTokens.delete(key);
}, 10 * 60 * 1000).unref();

// ---------------------------------------------------------------------------
// Cookies de sesión
// ---------------------------------------------------------------------------

function readSessionCookie(req: express.Request): string | null {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}

async function startSession(res: express.Response, user: UserRow) {
  const token = await createToken(user.id, 'session', SESSION_DAYS * 24 * 60 * 60 * 1000);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

function publicUser(user: UserRow): AuthenticatedUser {
  return { id: user.id, email: user.email };
}

// ---------------------------------------------------------------------------
// Rutas /api/auth/*
// ---------------------------------------------------------------------------

function handle(fn: (req: express.Request, res: express.Response) => Promise<unknown>) {
  return async (req: express.Request, res: express.Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof AuthError) return res.status(error.status).json({ error: error.message });
      console.error('Error de autenticación:', error);
      return res.status(500).json({ error: 'No se pudo completar la solicitud. Probá de nuevo.' });
    }
  };
}

export function createAuthRouter(): express.Router {
  const router = express.Router();

  // Registro: crea la cuenta inactiva y devuelve el QR para vincular la app.
  router.post('/signup', handle(async (req, res) => {
    const { email, password } = validateCredentials(req.body);
    checkRateLimit(req, email);
    const secret = base32Encode(crypto.randomBytes(20));
    const user = await upsertPendingUser(email, await hashPassword(password), secret);
    const pendingToken = await createToken(user.id, 'pending', PENDING_MINUTES * 60 * 1000);
    res.json({ step: 'enroll', pendingToken, email: user.email, ...(await buildEnrollment(user.email, secret)) });
  }));

  // Ingreso, paso 1: email + contraseña. Si la cuenta no tiene la app
  // vinculada todavía, se genera un QR nuevo.
  router.post('/login', handle(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    checkRateLimit(req, email);
    const user = await findUserByEmail(email);
    const ok = await verifyPassword(password, user?.passwordHash ?? null);
    if (!user || !ok) throw new AuthError('Email o contraseña incorrectos.', 401);

    const pendingToken = await createToken(user.id, 'pending', PENDING_MINUTES * 60 * 1000);
    if (user.totpEnabled && user.totpSecret) {
      return res.json({ step: 'verify', pendingToken, email: user.email });
    }
    const secret = base32Encode(crypto.randomBytes(20));
    await updateUser(user, { totpSecret: secret, totpLastStep: null });
    res.json({ step: 'enroll', pendingToken, email: user.email, ...(await buildEnrollment(user.email, secret)) });
  }));

  // Ingreso, paso 2: código de la app. Al primer código correcto la app
  // queda vinculada y la cuenta activa.
  router.post('/verify', handle(async (req, res) => {
    const pendingToken = String(req.body?.pendingToken || '');
    const code = String(req.body?.code || '').replace(/\s/g, '');
    const pending = pendingToken ? await readToken(pendingToken, 'pending') : null;
    if (!pending) throw new AuthError('El ingreso venció. Volvé a escribir tu email y contraseña.', 401);
    if (pending.attempts >= MAX_CODE_ATTEMPTS) {
      await deleteToken(pendingToken);
      throw new AuthError('Demasiados códigos incorrectos. Volvé a iniciar sesión.', 429);
    }
    const user = await findUserById(pending.userId);
    if (!user?.totpSecret) throw new AuthError('El ingreso venció. Volvé a iniciar sesión.', 401);

    const step = matchTotp(user.totpSecret, code, user.totpLastStep);
    if (step === null) {
      await countFailedAttempt(pendingToken);
      throw new AuthError('El código no es correcto o ya venció. Probá con el código nuevo que muestra la app.');
    }
    await updateUser(user, { totpEnabled: true, totpLastStep: step });
    await deleteToken(pendingToken);
    await startSession(res, user);
    res.json({ user: publicUser(user) });
  }));

  // Olvidé mi contraseña: se prueba la identidad con el código de la app.
  router.post('/reset-password', handle(async (req, res) => {
    const { email, password } = validateCredentials(req.body);
    const code = String(req.body?.code || '').replace(/\s/g, '');
    checkRateLimit(req, email);
    const user = await findUserByEmail(email);
    const step = user?.totpEnabled && user.totpSecret ? matchTotp(user.totpSecret, code, user.totpLastStep) : null;
    if (!user || step === null) throw new AuthError('Email o código incorrectos.', 401);
    await updateUser(user, { passwordHash: await hashPassword(password), totpLastStep: step });
    await deleteUserTokens(user.id); // cierra las sesiones abiertas en otros equipos
    await startSession(res, user);
    res.json({ user: publicUser(user) });
  }));

  router.get('/me', handle(async (req, res) => {
    const user = await userFromRequest(req);
    if (!user) return res.status(401).json({ error: 'No hay sesión iniciada.' });
    res.json({ user });
  }));

  router.post('/logout', handle(async (req, res) => {
    const token = readSessionCookie(req);
    if (token) await deleteToken(token);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.json({ success: true });
  }));

  return router;
}

async function userFromRequest(req: express.Request): Promise<AuthenticatedUser | null> {
  const token = readSessionCookie(req);
  if (!token) return null;
  const session = await readToken(token, 'session');
  if (!session) return null;
  const user = await findUserById(session.userId);
  return user?.totpEnabled ? publicUser(user) : null;
}

export async function requireSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const user = await userFromRequest(req);
    if (!user) return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
    req.user = user;
    return next();
  } catch (error) {
    console.error('No se pudo verificar la sesión:', error);
    return res.status(503).json({ error: 'No se pudo verificar la sesión. Probá de nuevo.' });
  }
}
