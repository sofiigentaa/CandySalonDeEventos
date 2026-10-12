import { createPool, isDatabaseConfigured } from '../db/index.ts';
import { CALANDRIA_ACTIONS, CALANDRIA_KINDS, CalandriaAction, CalandriaKind, LogEntry, sealEntry } from '../calandria/chain.ts';
import { ValidationError } from './validation.ts';

// Registro sellado de Cotorra (lado servidor).
// - El servidor pone el número, la fecha y la huella: el navegador solo dice
//   qué tipo de tarea fue, la acción, la cantidad y los minutos estimados.
// - Solo se aceptan tipos y acciones conocidos y números: no puede entrar
//   texto libre, así que no puede colarse un nombre ni un teléfono.
// - En la base, la tabla no deja modificar ni borrar líneas (triggers), y
//   "Vaciar todo" / "Restablecer demo" no la tocan.

let memoryLog: LogEntry[] = [];

export async function ensureCalandriaTable(): Promise<void> {
  if (!isDatabaseConfigured) return;
  const pool = createPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calandria_log (
      seq INTEGER PRIMARY KEY,
      at TEXT NOT NULL,
      kind TEXT NOT NULL,
      action TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      minutes INTEGER NOT NULL DEFAULT 0,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL
    );
    CREATE OR REPLACE FUNCTION calandria_log_no_changes() RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'El registro de Cotorra no se puede modificar ni borrar';
    END;
    $$;
    DROP TRIGGER IF EXISTS calandria_log_no_update ON calandria_log;
    CREATE TRIGGER calandria_log_no_update BEFORE UPDATE OR DELETE ON calandria_log
      FOR EACH ROW EXECUTE FUNCTION calandria_log_no_changes();
    DROP TRIGGER IF EXISTS calandria_log_no_truncate ON calandria_log;
    CREATE TRIGGER calandria_log_no_truncate BEFORE TRUNCATE ON calandria_log
      FOR EACH STATEMENT EXECUTE FUNCTION calandria_log_no_changes();
    -- En Supabase: que la API pública (clave anon) no pueda ni leerla.
    ALTER TABLE calandria_log ENABLE ROW LEVEL SECURITY;
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON calandria_log FROM anon';
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON calandria_log FROM authenticated';
      END IF;
    END $$;
  `);
}

export function validateLogInput(body: any): { kind: CalandriaKind; action: CalandriaAction; qty: number; minutes: number } {
  const kind = body?.kind;
  const action = body?.action;
  const qty = body?.qty;
  const minutes = body?.minutes;
  if (!CALANDRIA_KINDS.includes(kind)) throw new ValidationError('Tipo de tarea desconocido.');
  if (!CALANDRIA_ACTIONS.includes(action)) throw new ValidationError('Acción desconocida.');
  if (!Number.isInteger(qty) || qty < 0 || qty > 100000) throw new ValidationError('Cantidad inválida.');
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 600) throw new ValidationError('Minutos inválidos.');
  return { kind, action, qty, minutes };
}

export async function getCalandriaLog(): Promise<LogEntry[]> {
  if (!isDatabaseConfigured) return memoryLog;
  const { rows } = await createPool().query(
    'SELECT seq, at, kind, action, qty, minutes, prev_hash, hash FROM calandria_log ORDER BY seq ASC LIMIT 20000'
  );
  return rows as LogEntry[];
}

export async function appendCalandriaLog(input: ReturnType<typeof validateLogInput>): Promise<LogEntry> {
  const data = { ...input, at: new Date().toISOString() };
  if (!isDatabaseConfigured) {
    const entry = sealEntry(memoryLog[memoryLog.length - 1], data);
    memoryLog = [...memoryLog, entry];
    return entry;
  }
  const client = await createPool().connect();
  try {
    await client.query('BEGIN');
    // Una línea a la vez: la cadena no se bifurca aunque lleguen dos juntas.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('calandria_log'))");
    const { rows } = await client.query('SELECT seq, at, kind, action, qty, minutes, prev_hash, hash FROM calandria_log ORDER BY seq DESC LIMIT 1');
    const entry = sealEntry(rows[0] as LogEntry | undefined, data);
    await client.query(
      'INSERT INTO calandria_log (seq, at, kind, action, qty, minutes, prev_hash, hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [entry.seq, entry.at, entry.kind, entry.action, entry.qty, entry.minutes, entry.prev_hash, entry.hash]
    );
    await client.query('COMMIT');
    return entry;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
