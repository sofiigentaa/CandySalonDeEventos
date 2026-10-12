-- Candy Salón de Eventos — estructura para Supabase
-- Pegar en Supabase → SQL Editor → Run (una sola vez).
-- El servidor también crea las tablas si faltan, pero este script además
-- activa la seguridad (RLS) para que nadie pueda leer los datos desde afuera.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_time TEXT,
  location TEXT,
  guest_count INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  deposit_amount INTEGER NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  status TEXT NOT NULL DEFAULT 'deposit_paid',
  notes TEXT,
  contracted_services JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE events ADD COLUMN IF NOT EXISTS contracted_services JSONB;

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  concept TEXT NOT NULL,
  notes TEXT,
  receipt_number TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_id TEXT,
  event_title TEXT,
  client_name TEXT,
  client_phone TEXT,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  due_time TEXT,
  category TEXT NOT NULL DEFAULT 'cobro_saldo',
  completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  concept TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Efectivo',
  event_id TEXT,
  event_title TEXT,
  supplier TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

CREATE INDEX IF NOT EXISTS payments_event_id_idx ON payments (event_id);
CREATE INDEX IF NOT EXISTS events_event_date_idx ON events (event_date);

-- Seguridad: RLS activado y SIN políticas. Así la API pública de Supabase
-- (la que usa la clave "anon") no puede leer ni escribir nada. Solo el
-- servidor de Render entra, con el usuario de la base (DATABASE_URL).
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON users, events, payments, reminders, expenses FROM anon, authenticated;
REVOKE ALL ON SEQUENCE receipt_number_seq FROM anon, authenticated;

-- Cotorra: registro sellado. Solo se agregan líneas; la base no deja
-- modificarlas ni borrarlas (tampoco "Vaciar todo"). Sin datos personales.
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
ALTER TABLE calandria_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON calandria_log FROM anon, authenticated;
