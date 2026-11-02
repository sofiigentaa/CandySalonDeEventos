import { and, eq, desc, inArray } from 'drizzle-orm';
import { db, createPool, isDatabaseConfigured } from './index.ts';
import { events, payments, reminders, users, expenses } from './schema.ts';
import { EventItem, PaymentRecord, ReminderItem, ExpenseItem } from '../types.ts';
import { INITIAL_EVENTS, INITIAL_REMINDERS, INITIAL_EXPENSES } from '../utils/storage.ts';
import { getTotalPaid } from '../utils/dateUtils.ts';

// Dos modos, nunca mezclados:
// - Con base de datos (DATABASE_URL / SQL_HOST): todo se lee y se escribe en
//   PostgreSQL. Si la base falla, el error sube y la API responde 500, así la
//   pantalla avisa en vez de decir "guardado" y perder el dato al reiniciar.
// - Sin base (desarrollo o demo local): todo vive en memoria.
const MEMORY_MODE = !isDatabaseConfigured;

const memoryEvents = new Map<string, EventItem[]>();
const memoryReminders = new Map<string, ReminderItem[]>();
const memoryExpenses = new Map<string, ExpenseItem[]>();

function memoryItems<T>(store: Map<string, T[]>, userId: string): T[] {
  let items = store.get(userId);
  if (!items) {
    items = [];
    store.set(userId, items);
  }
  return items;
}

export class OwnershipConflictError extends Error {
  constructor() {
    super('El identificador ya pertenece a otro usuario.');
  }
}

let tablesReadyPromise: Promise<void> | null = null;

export function isMemoryMode(): boolean {
  return MEMORY_MODE;
}

export async function ensureTablesExist(): Promise<void> {
  if (MEMORY_MODE) return;
  if (tablesReadyPromise) return tablesReadyPromise;

  tablesReadyPromise = (async () => {
    const pool = createPool();
    await pool.query(`
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
        total_amount INTEGER NOT NULL DEFAULT 0,
        deposit_amount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'deposit_paid',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        amount INTEGER NOT NULL,
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
        amount INTEGER NOT NULL,
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
      ALTER TABLE events ADD COLUMN IF NOT EXISTS contracted_services JSONB;
      CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;
      CREATE INDEX IF NOT EXISTS events_user_id_idx ON events(user_id);
      CREATE INDEX IF NOT EXISTS payments_event_id_idx ON payments(event_id);
      CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders(user_id);
      CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses(user_id);
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
      ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          REVOKE ALL ON users, events, payments, reminders, expenses FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          REVOKE ALL ON users, events, payments, reminders, expenses FROM authenticated;
        END IF;
      END $$;
    `);
  })().catch((error) => {
    tablesReadyPromise = null;
    throw error;
  });

  return tablesReadyPromise;
}

// ---------------------------------------------------------------------------
// Numeración de recibos: correlativa (REC-000001, REC-000002, ...)
// ---------------------------------------------------------------------------

let memoryReceiptCounter = 0;

function formatReceipt(n: number): string {
  return `REC-${String(n).padStart(6, '0')}`;
}

async function nextReceiptNumber(): Promise<string> {
  if (MEMORY_MODE) {
    memoryReceiptCounter += 1;
    return formatReceipt(memoryReceiptCounter);
  }
  const pool = createPool();
  const result = await pool.query<{ n: string }>(`SELECT nextval('receipt_number_seq') AS n`);
  return formatReceipt(Number(result.rows[0].n));
}

function isCorrelativeReceipt(value?: string): boolean {
  return Boolean(value && /^REC-\d{6}$/.test(value));
}

// ---------------------------------------------------------------------------
// Usuarios (se mantiene la tabla por compatibilidad)
// ---------------------------------------------------------------------------

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  if (MEMORY_MODE) return { uid, email, displayName: displayName || null };
  await ensureTablesExist();
  const result = await db
    .insert(users)
    .values({ uid, email, displayName: displayName || null })
    .onConflictDoUpdate({ target: users.uid, set: { email, displayName: displayName || null } })
    .returning();
  return result[0];
}

// ---------------------------------------------------------------------------
// Eventos y pagos
// ---------------------------------------------------------------------------

function computeStatus(ev: Pick<EventItem, 'status' | 'totalAmount'>, totalPaid: number): EventItem['status'] {
  if (ev.status === 'completed' || ev.status === 'cancelled') return ev.status;
  if (ev.totalAmount > 0 && totalPaid >= ev.totalAmount) return 'fully_paid';
  if (totalPaid > 0) return 'deposit_paid';
  return 'no_deposit';
}

export async function getAllEventsFromDb(userId: string): Promise<EventItem[]> {
  if (MEMORY_MODE) return memoryItems(memoryEvents, userId);
  await ensureTablesExist();
  const allEvents = await db.select().from(events).where(eq(events.userId, userId)).orderBy(desc(events.eventDate));
  if (allEvents.length === 0) return [];
  const allPayments = await db.select().from(payments).where(inArray(payments.eventId, allEvents.map((event) => event.id)));

  const paymentMap = new Map<string, PaymentRecord[]>();
  for (const p of allPayments) {
    const list = paymentMap.get(p.eventId) || [];
    list.push({
      id: p.id,
      date: p.date,
      amount: p.amount,
      method: p.method as any,
      concept: p.concept as any,
      notes: p.notes || undefined,
      receiptNumber: p.receiptNumber || undefined,
    });
    paymentMap.set(p.eventId, list);
  }

  return allEvents.map((ev) => ({
    id: ev.id,
    title: ev.title,
    clientName: ev.clientName,
    clientPhone: ev.clientPhone || undefined,
    clientEmail: ev.clientEmail || undefined,
    eventType: ev.eventType as any,
    eventDate: ev.eventDate,
    eventTime: ev.eventTime || undefined,
    location: ev.location ?? '',
    guestCount: ev.guestCount ?? undefined,
    totalAmount: ev.totalAmount,
    depositAmount: ev.depositAmount,
    paymentHistory: (paymentMap.get(ev.id) || []).sort((a, b) => a.date.localeCompare(b.date)),
    status: ev.status as any,
    notes: ev.notes || undefined,
    contractedServices: Array.isArray(ev.contractedServices) ? (ev.contractedServices as any) : undefined,
    createdAt: ev.createdAt ? ev.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: ev.updatedAt ? ev.updatedAt.toISOString() : new Date().toISOString(),
  }));
}

export async function getEventById(id: string, userId: string): Promise<EventItem | undefined> {
  const all = await getAllEventsFromDb(userId);
  return all.find((e) => e.id === id);
}

// Guarda el evento y deja su historial de pagos EXACTAMENTE como viene:
// agrega los nuevos (con número de recibo correlativo) y borra los que se
// eliminaron desde la pantalla. Devuelve el evento tal como quedó guardado.
export async function saveEventToDb(event: EventItem, userId: string): Promise<EventItem> {
  const history: PaymentRecord[] = [];
  const previous = MEMORY_MODE
    ? memoryItems(memoryEvents, userId).find((e) => e.id === event.id)
    : await getEventById(event.id, userId);
  const previousReceipts = new Map((previous?.paymentHistory || []).map((p) => [p.id, p.receiptNumber]));

  for (const p of event.paymentHistory || []) {
    let receiptNumber = previousReceipts.get(p.id);
    if (!isCorrelativeReceipt(receiptNumber)) receiptNumber = await nextReceiptNumber();
    history.push({ ...p, receiptNumber });
  }

  const totalPaid = getTotalPaid({ ...event, paymentHistory: history });
  const saved: EventItem = {
    ...event,
    paymentHistory: history,
    status: computeStatus(event, totalPaid),
    updatedAt: new Date().toISOString(),
  };

  if (MEMORY_MODE) {
    const userEvents = memoryItems(memoryEvents, userId);
    const idx = userEvents.findIndex((e) => e.id === saved.id);
    if (idx >= 0) userEvents[idx] = saved;
    else userEvents.unshift(saved);
    return saved;
  }

  await ensureTablesExist();
  await db.transaction(async (tx) => {
    const row = {
      title: saved.title,
      clientName: saved.clientName,
      clientPhone: saved.clientPhone || null,
      clientEmail: saved.clientEmail || null,
      eventType: saved.eventType,
      eventDate: saved.eventDate,
      eventTime: saved.eventTime || null,
      location: saved.location ?? null,
      guestCount: saved.guestCount ?? 0,
      totalAmount: saved.totalAmount,
      depositAmount: saved.depositAmount,
      status: saved.status,
      notes: saved.notes || null,
      contractedServices: saved.contractedServices && saved.contractedServices.length > 0 ? saved.contractedServices : null,
      updatedAt: new Date(),
    };
    const result = await tx
      .insert(events)
      .values({ id: saved.id, userId, ...row })
      .onConflictDoUpdate({ target: events.id, set: { ...row, userId }, where: eq(events.userId, userId) })
      .returning({ id: events.id });
    if (result.length === 0) throw new OwnershipConflictError();

    // El historial de la base queda igual al que mandó la pantalla
    // (antes, un pago borrado reaparecía al recargar).
    await tx.delete(payments).where(eq(payments.eventId, saved.id));
    for (const p of history) {
      await tx.insert(payments).values({
        id: p.id,
        eventId: saved.id,
        date: p.date,
        amount: p.amount,
        method: p.method,
        concept: p.concept,
        notes: p.notes || null,
        receiptNumber: p.receiptNumber || null,
      });
    }
  });
  return saved;
}

export async function addPaymentToDb(eventId: string, payment: PaymentRecord, userId: string): Promise<EventItem | undefined> {
  const ev = MEMORY_MODE
    ? memoryItems(memoryEvents, userId).find((e) => e.id === eventId)
    : await getEventById(eventId, userId);
  if (!ev) return undefined;
  const updated: EventItem = {
    ...ev,
    paymentHistory: [...(ev.paymentHistory || []), { ...payment, receiptNumber: undefined }],
  };
  return saveEventToDb(updated, userId);
}

export async function deleteEventFromDb(id: string, userId: string): Promise<void> {
  if (MEMORY_MODE) {
    const userEvents = memoryItems(memoryEvents, userId);
    memoryEvents.set(userId, userEvents.filter((e) => e.id !== id));
    const userReminders = memoryItems(memoryReminders, userId);
    memoryReminders.set(userId, userReminders.filter((r) => r.eventId !== id));
    return;
  }
  await ensureTablesExist();
  await db.transaction(async (tx) => {
    await tx.delete(reminders).where(and(eq(reminders.eventId, id), eq(reminders.userId, userId)));
    await tx.delete(events).where(and(eq(events.id, id), eq(events.userId, userId)));
  });
}

// ---------------------------------------------------------------------------
// Recordatorios
// ---------------------------------------------------------------------------

export async function getAllRemindersFromDb(userId: string): Promise<ReminderItem[]> {
  if (MEMORY_MODE) return memoryItems(memoryReminders, userId);
  await ensureTablesExist();
  const list = await db.select().from(reminders).where(eq(reminders.userId, userId)).orderBy(reminders.dueDate);
  return list.map((r) => ({
    id: r.id,
    eventId: r.eventId || undefined,
    eventTitle: r.eventTitle || undefined,
    clientName: r.clientName || undefined,
    clientPhone: r.clientPhone || undefined,
    title: r.title,
    dueDate: r.dueDate,
    dueTime: r.dueTime || undefined,
    category: r.category as any,
    completed: r.completed,
    priority: r.priority as any,
    notes: r.notes || undefined,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  }));
}

export async function saveReminderToDb(reminder: ReminderItem, userId: string): Promise<void> {
  if (MEMORY_MODE) {
    const userReminders = memoryItems(memoryReminders, userId);
    const idx = userReminders.findIndex((r) => r.id === reminder.id);
    if (idx >= 0) userReminders[idx] = reminder;
    else userReminders.unshift(reminder);
    return;
  }
  await ensureTablesExist();
  const row = {
    eventId: reminder.eventId || null,
    eventTitle: reminder.eventTitle || null,
    clientName: reminder.clientName || null,
    clientPhone: reminder.clientPhone || null,
    title: reminder.title,
    dueDate: reminder.dueDate,
    dueTime: reminder.dueTime || null,
    category: reminder.category,
    completed: reminder.completed,
    priority: reminder.priority,
    notes: reminder.notes || null,
  };
  const result = await db
    .insert(reminders)
    .values({ id: reminder.id, userId, ...row })
    .onConflictDoUpdate({ target: reminders.id, set: { ...row, userId }, where: eq(reminders.userId, userId) })
    .returning({ id: reminders.id });
  if (result.length === 0) throw new OwnershipConflictError();
}

export async function deleteReminderFromDb(id: string, userId: string): Promise<void> {
  if (MEMORY_MODE) {
    const userReminders = memoryItems(memoryReminders, userId);
    memoryReminders.set(userId, userReminders.filter((r) => r.id !== id));
    return;
  }
  await ensureTablesExist();
  await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
}

// ---------------------------------------------------------------------------
// Egresos
// ---------------------------------------------------------------------------

export async function getAllExpensesFromDb(userId: string): Promise<ExpenseItem[]> {
  if (MEMORY_MODE) return memoryItems(memoryExpenses, userId);
  await ensureTablesExist();
  const list = await db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.date));
  return list.map((e) => ({
    id: e.id,
    date: e.date,
    amount: e.amount,
    category: e.category as any,
    concept: e.concept,
    paymentMethod: (e.paymentMethod as any) || 'Efectivo',
    eventId: e.eventId || undefined,
    eventTitle: e.eventTitle || undefined,
    supplier: e.supplier || undefined,
    receiptNumber: e.receiptNumber || undefined,
    notes: e.notes || undefined,
    createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
  }));
}

export async function saveExpenseToDb(expense: ExpenseItem, userId: string): Promise<void> {
  if (MEMORY_MODE) {
    const userExpenses = memoryItems(memoryExpenses, userId);
    const idx = userExpenses.findIndex((e) => e.id === expense.id);
    if (idx >= 0) userExpenses[idx] = expense;
    else userExpenses.unshift(expense);
    return;
  }
  await ensureTablesExist();
  const row = {
    date: expense.date,
    amount: expense.amount,
    category: expense.category,
    concept: expense.concept,
    paymentMethod: expense.paymentMethod || 'Efectivo',
    eventId: expense.eventId || null,
    eventTitle: expense.eventTitle || null,
    supplier: expense.supplier || null,
    receiptNumber: expense.receiptNumber || null,
    notes: expense.notes || null,
  };
  const result = await db
    .insert(expenses)
    .values({ id: expense.id, userId, ...row })
    .onConflictDoUpdate({ target: expenses.id, set: { ...row, userId }, where: eq(expenses.userId, userId) })
    .returning({ id: expenses.id });
  if (result.length === 0) throw new OwnershipConflictError();
}

export async function deleteExpenseFromDb(id: string, userId: string): Promise<void> {
  if (MEMORY_MODE) {
    const userExpenses = memoryItems(memoryExpenses, userId);
    memoryExpenses.set(userId, userExpenses.filter((e) => e.id !== id));
    return;
  }
  await ensureTablesExist();
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

// ---------------------------------------------------------------------------
// Vaciar / demo
// ---------------------------------------------------------------------------

export async function clearAllFromDb(userId: string): Promise<void> {
  if (MEMORY_MODE) {
    memoryEvents.set(userId, []);
    memoryReminders.set(userId, []);
    memoryExpenses.set(userId, []);
    memoryReceiptCounter = 0;
    return;
  }
  await ensureTablesExist();
  await db.transaction(async (tx) => {
    await tx.delete(reminders).where(eq(reminders.userId, userId));
    await tx.delete(expenses).where(eq(expenses.userId, userId));
    await tx.delete(events).where(eq(events.userId, userId));
  });
}

function withoutReceipts(ev: EventItem): EventItem {
  return { ...ev, paymentHistory: (ev.paymentHistory || []).map((p) => ({ ...p, receiptNumber: undefined })) };
}

export async function loadDemoData(userId: string): Promise<void> {
  await clearAllFromDb(userId);
  const demoId = (id: string) => `demo-${userId}-${id}`;
  for (const ev of structuredClone(INITIAL_EVENTS)) {
    const event = withoutReceipts(ev);
    await saveEventToDb({
      ...event,
      id: demoId(event.id),
      paymentHistory: event.paymentHistory?.map((payment) => ({ ...payment, id: demoId(payment.id) })),
    }, userId);
  }
  for (const rem of structuredClone(INITIAL_REMINDERS)) {
    await saveReminderToDb({
      ...rem,
      id: demoId(rem.id),
      eventId: rem.eventId ? demoId(rem.eventId) : undefined,
    }, userId);
  }
  for (const exp of structuredClone(INITIAL_EXPENSES)) {
    await saveExpenseToDb({
      ...exp,
      id: demoId(exp.id),
      eventId: exp.eventId ? demoId(exp.eventId) : undefined,
    }, userId);
  }
}
