import { eq, desc } from 'drizzle-orm';
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

let memoryEvents: EventItem[] = structuredClone(INITIAL_EVENTS);
let memoryReminders: ReminderItem[] = structuredClone(INITIAL_REMINDERS);
let memoryExpenses: ExpenseItem[] = structuredClone(INITIAL_EXPENSES);

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

export async function getAllEventsFromDb(): Promise<EventItem[]> {
  if (MEMORY_MODE) return memoryEvents;
  await ensureTablesExist();
  const allEvents = await db.select().from(events).orderBy(desc(events.eventDate));
  const allPayments = await db.select().from(payments);

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
    location: 'Candy Salón de Eventos',
    guestCount: ev.guestCount || undefined,
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

export async function getEventById(id: string): Promise<EventItem | undefined> {
  const all = await getAllEventsFromDb();
  return all.find((e) => e.id === id);
}

// Guarda el evento y deja su historial de pagos EXACTAMENTE como viene:
// agrega los nuevos (con número de recibo correlativo) y borra los que se
// eliminaron desde la pantalla. Devuelve el evento tal como quedó guardado.
export async function saveEventToDb(event: EventItem, userId?: string): Promise<EventItem> {
  const history: PaymentRecord[] = [];
  const previous = MEMORY_MODE ? memoryEvents.find((e) => e.id === event.id) : await getEventById(event.id);
  const previousReceipts = new Map((previous?.paymentHistory || []).map((p) => [p.id, p.receiptNumber]));

  for (const p of event.paymentHistory || []) {
    let receiptNumber = previousReceipts.get(p.id);
    if (!isCorrelativeReceipt(receiptNumber)) receiptNumber = await nextReceiptNumber();
    history.push({ ...p, receiptNumber });
  }

  const totalPaid = getTotalPaid({ ...event, paymentHistory: history });
  const saved: EventItem = {
    ...event,
    location: 'Candy Salón de Eventos',
    paymentHistory: history,
    status: computeStatus(event, totalPaid),
    updatedAt: new Date().toISOString(),
  };

  if (MEMORY_MODE) {
    const idx = memoryEvents.findIndex((e) => e.id === saved.id);
    if (idx >= 0) memoryEvents[idx] = saved;
    else memoryEvents.unshift(saved);
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
      location: 'Candy Salón de Eventos',
      guestCount: saved.guestCount || 0,
      totalAmount: saved.totalAmount,
      depositAmount: saved.depositAmount,
      status: saved.status,
      notes: saved.notes || null,
      contractedServices: saved.contractedServices && saved.contractedServices.length > 0 ? saved.contractedServices : null,
      updatedAt: new Date(),
    };
    await tx
      .insert(events)
      .values({ id: saved.id, userId: userId || null, ...row })
      .onConflictDoUpdate({ target: events.id, set: row });

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

export async function addPaymentToDb(eventId: string, payment: PaymentRecord): Promise<EventItem | undefined> {
  const ev = MEMORY_MODE ? memoryEvents.find((e) => e.id === eventId) : await getEventById(eventId);
  if (!ev) return undefined;
  const updated: EventItem = {
    ...ev,
    paymentHistory: [...(ev.paymentHistory || []), { ...payment, receiptNumber: undefined }],
  };
  return saveEventToDb(updated);
}

export async function deleteEventFromDb(id: string): Promise<void> {
  if (MEMORY_MODE) {
    memoryEvents = memoryEvents.filter((e) => e.id !== id);
    memoryReminders = memoryReminders.filter((r) => r.eventId !== id);
    return;
  }
  await ensureTablesExist();
  await db.transaction(async (tx) => {
    await tx.delete(reminders).where(eq(reminders.eventId, id));
    await tx.delete(events).where(eq(events.id, id));
  });
}

// ---------------------------------------------------------------------------
// Recordatorios
// ---------------------------------------------------------------------------

export async function getAllRemindersFromDb(): Promise<ReminderItem[]> {
  if (MEMORY_MODE) return memoryReminders;
  await ensureTablesExist();
  const list = await db.select().from(reminders).orderBy(reminders.dueDate);
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

export async function saveReminderToDb(reminder: ReminderItem, userId?: string): Promise<void> {
  if (MEMORY_MODE) {
    const idx = memoryReminders.findIndex((r) => r.id === reminder.id);
    if (idx >= 0) memoryReminders[idx] = reminder;
    else memoryReminders.unshift(reminder);
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
  await db
    .insert(reminders)
    .values({ id: reminder.id, userId: userId || null, ...row })
    .onConflictDoUpdate({ target: reminders.id, set: row });
}

export async function deleteReminderFromDb(id: string): Promise<void> {
  if (MEMORY_MODE) {
    memoryReminders = memoryReminders.filter((r) => r.id !== id);
    return;
  }
  await ensureTablesExist();
  await db.delete(reminders).where(eq(reminders.id, id));
}

// ---------------------------------------------------------------------------
// Egresos
// ---------------------------------------------------------------------------

export async function getAllExpensesFromDb(): Promise<ExpenseItem[]> {
  if (MEMORY_MODE) return memoryExpenses;
  await ensureTablesExist();
  const list = await db.select().from(expenses).orderBy(desc(expenses.date));
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

export async function saveExpenseToDb(expense: ExpenseItem, userId?: string): Promise<void> {
  if (MEMORY_MODE) {
    const idx = memoryExpenses.findIndex((e) => e.id === expense.id);
    if (idx >= 0) memoryExpenses[idx] = expense;
    else memoryExpenses.unshift(expense);
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
  await db
    .insert(expenses)
    .values({ id: expense.id, userId: userId || null, ...row })
    .onConflictDoUpdate({ target: expenses.id, set: row });
}

export async function deleteExpenseFromDb(id: string): Promise<void> {
  if (MEMORY_MODE) {
    memoryExpenses = memoryExpenses.filter((e) => e.id !== id);
    return;
  }
  await ensureTablesExist();
  await db.delete(expenses).where(eq(expenses.id, id));
}

// ---------------------------------------------------------------------------
// Vaciar / demo
// ---------------------------------------------------------------------------

export async function clearAllFromDb(): Promise<void> {
  if (MEMORY_MODE) {
    memoryEvents = [];
    memoryReminders = [];
    memoryExpenses = [];
    memoryReceiptCounter = 0;
    return;
  }
  await ensureTablesExist();
  const pool = createPool();
  await pool.query(`TRUNCATE TABLE payments, reminders, expenses, events CASCADE;`);
}

function withoutReceipts(ev: EventItem): EventItem {
  return { ...ev, paymentHistory: (ev.paymentHistory || []).map((p) => ({ ...p, receiptNumber: undefined })) };
}

export async function loadDemoData(): Promise<void> {
  await clearAllFromDb();
  for (const ev of structuredClone(INITIAL_EVENTS)) await saveEventToDb(withoutReceipts(ev));
  for (const rem of structuredClone(INITIAL_REMINDERS)) await saveReminderToDb(rem);
  for (const exp of structuredClone(INITIAL_EXPENSES)) await saveExpenseToDb(exp);
}

// Los datos de ejemplo se cargan solo si se pide (SEED_DEMO=true) o en modo
// memoria. Antes se cargaban en cualquier base vacía, incluida la de un cliente.
export async function seedInitialDataIfEmpty(): Promise<void> {
  if (MEMORY_MODE) {
    await loadDemoData();
    return;
  }
  if (process.env.SEED_DEMO !== 'true') return;
  await ensureTablesExist();
  const existing = await db.select().from(events).limit(1);
  if (existing.length === 0) await loadDemoData();
}
