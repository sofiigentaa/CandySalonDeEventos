import { eq, desc } from 'drizzle-orm';
import { db, createPool } from './index.ts';
import { events, payments, reminders, users, expenses } from './schema.ts';
import { EventItem, PaymentRecord, ReminderItem, ExpenseItem } from '../types.ts';
import { INITIAL_EVENTS, INITIAL_REMINDERS, INITIAL_EXPENSES } from '../utils/storage.ts';

// In-memory fallback stores in case PostgreSQL is unreachable or permissions are restricted
let memoryEvents: EventItem[] = [...INITIAL_EVENTS];
let memoryReminders: ReminderItem[] = [...INITIAL_REMINDERS];
let memoryExpenses: ExpenseItem[] = [...INITIAL_EXPENSES];

let tablesReadyPromise: Promise<void> | null = null;
let dbDisabled = false;

export async function ensureTablesExist(): Promise<void> {
  if (dbDisabled) return;
  if (tablesReadyPromise) return tablesReadyPromise;

  tablesReadyPromise = (async () => {
    try {
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
        UPDATE events SET location = 'Candy Salón de Eventos' WHERE location ILIKE '%candy%';
      `);
    } catch (error) {
      dbDisabled = true;
      console.warn('PostgreSQL tables check note (falling back to resilient mode):', (error as any)?.message || error);
      // Do not crash server, fall back gracefully
    }
  })();

  return tablesReadyPromise;
}

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.warn('getOrCreateUser notice:', error);
    return { uid, email, displayName: displayName || 'Admin' };
  }
}

export async function getAllEventsFromDb(): Promise<EventItem[]> {
  if (dbDisabled) return memoryEvents;
  try {
    await ensureTablesExist();
    if (dbDisabled) return memoryEvents;
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

    const result = allEvents.map((ev) => ({
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
      paymentHistory: paymentMap.get(ev.id) || [],
      status: ev.status as any,
      notes: ev.notes || undefined,
      createdAt: ev.createdAt ? ev.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: ev.updatedAt ? ev.updatedAt.toISOString() : new Date().toISOString(),
    }));

    if (result.length > 0) {
      memoryEvents = result;
    }
    return memoryEvents;
  } catch (error) {
    console.warn('Using memory events cache due to database notice:', error);
    return memoryEvents;
  }
}

export async function saveEventToDb(event: EventItem, userId?: string): Promise<void> {
  // Update memory store first
  const existingIdx = memoryEvents.findIndex((e) => e.id === event.id);
  const sanitizedEvent = {
    ...event,
    location: 'Candy Salón de Eventos',
  };
  if (existingIdx >= 0) {
    memoryEvents[existingIdx] = sanitizedEvent;
  } else {
    memoryEvents.unshift(sanitizedEvent);
  }

  try {
    await db
      .insert(events)
      .values({
        id: sanitizedEvent.id,
        userId: userId || null,
        title: sanitizedEvent.title,
        clientName: sanitizedEvent.clientName,
        clientPhone: sanitizedEvent.clientPhone || null,
        clientEmail: sanitizedEvent.clientEmail || null,
        eventType: sanitizedEvent.eventType,
        eventDate: sanitizedEvent.eventDate,
        eventTime: sanitizedEvent.eventTime || null,
        location: 'Candy Salón de Eventos',
        guestCount: sanitizedEvent.guestCount || 0,
        totalAmount: sanitizedEvent.totalAmount,
        depositAmount: sanitizedEvent.depositAmount,
        status: sanitizedEvent.status,
        notes: sanitizedEvent.notes || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: events.id,
        set: {
          title: sanitizedEvent.title,
          clientName: sanitizedEvent.clientName,
          clientPhone: sanitizedEvent.clientPhone || null,
          clientEmail: sanitizedEvent.clientEmail || null,
          eventType: sanitizedEvent.eventType,
          eventDate: sanitizedEvent.eventDate,
          eventTime: sanitizedEvent.eventTime || null,
          location: 'Candy Salón de Eventos',
          guestCount: sanitizedEvent.guestCount || 0,
          totalAmount: sanitizedEvent.totalAmount,
          depositAmount: sanitizedEvent.depositAmount,
          status: sanitizedEvent.status,
          notes: sanitizedEvent.notes || null,
          updatedAt: new Date(),
        },
      });

    // Sync payment history
    if (sanitizedEvent.paymentHistory && sanitizedEvent.paymentHistory.length > 0) {
      for (const p of sanitizedEvent.paymentHistory) {
        await db
          .insert(payments)
          .values({
            id: p.id,
            eventId: sanitizedEvent.id,
            date: p.date,
            amount: p.amount,
            method: p.method,
            concept: p.concept,
            notes: p.notes || null,
            receiptNumber: p.receiptNumber || null,
          })
          .onConflictDoNothing();
      }
    }
  } catch (error) {
    console.warn('saveEventToDb notice (cached in memory):', error);
  }
}

export async function addPaymentToDb(eventId: string, payment: PaymentRecord): Promise<void> {
  const ev = memoryEvents.find((e) => e.id === eventId);
  if (ev) {
    const list = ev.paymentHistory ? [...ev.paymentHistory] : [];
    list.push(payment);
    const totalPaid = list.reduce((sum, p) => sum + p.amount, 0);
    ev.paymentHistory = list;
    ev.depositAmount = Math.max(ev.depositAmount, totalPaid);
    ev.status = totalPaid >= ev.totalAmount ? 'fully_paid' : 'deposit_paid';
  }

  try {
    await db.insert(payments).values({
      id: payment.id,
      eventId,
      date: payment.date,
      amount: payment.amount,
      method: payment.method,
      concept: payment.concept,
      notes: payment.notes || null,
      receiptNumber: payment.receiptNumber || null,
    }).onConflictDoNothing();

    const allEvPayments = await db.select().from(payments).where(eq(payments.eventId, eventId));
    const totalPaid = allEvPayments.reduce((sum, p) => sum + p.amount, 0);

    const [dbEv] = await db.select().from(events).where(eq(events.id, eventId));
    if (dbEv) {
      const isPaid = totalPaid >= dbEv.totalAmount;
      await db
        .update(events)
        .set({
          status: isPaid ? 'fully_paid' : 'deposit_paid',
          updatedAt: new Date(),
        })
        .where(eq(events.id, eventId));
    }
  } catch (error) {
    console.warn('addPaymentToDb notice (cached in memory):', error);
  }
}

export async function deleteEventFromDb(id: string): Promise<void> {
  memoryEvents = memoryEvents.filter((e) => e.id !== id);
  try {
    await db.delete(events).where(eq(events.id, id));
  } catch (error) {
    console.warn('deleteEventFromDb notice:', error);
  }
}

export async function getAllRemindersFromDb(): Promise<ReminderItem[]> {
  if (dbDisabled) return memoryReminders;
  try {
    await ensureTablesExist();
    if (dbDisabled) return memoryReminders;
    const list = await db.select().from(reminders).orderBy(reminders.dueDate);
    const result = list.map((r) => ({
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
    if (result.length > 0) {
      memoryReminders = result;
    }
    return memoryReminders;
  } catch (error) {
    console.warn('Using memory reminders cache due to database notice:', error);
    return memoryReminders;
  }
}

export async function saveReminderToDb(reminder: ReminderItem, userId?: string): Promise<void> {
  const existingIdx = memoryReminders.findIndex((r) => r.id === reminder.id);
  if (existingIdx >= 0) {
    memoryReminders[existingIdx] = reminder;
  } else {
    memoryReminders.unshift(reminder);
  }

  if (dbDisabled) return;

  try {
    await ensureTablesExist();
    if (dbDisabled) return;
    await db
      .insert(reminders)
      .values({
        id: reminder.id,
        userId: userId || null,
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
      })
      .onConflictDoUpdate({
        target: reminders.id,
        set: {
          title: reminder.title,
          dueDate: reminder.dueDate,
          dueTime: reminder.dueTime || null,
          category: reminder.category,
          completed: reminder.completed,
          priority: reminder.priority,
          notes: reminder.notes || null,
        },
      });
  } catch (error) {
    console.warn('saveReminderToDb notice (cached in memory):', error);
  }
}

export async function deleteReminderFromDb(id: string): Promise<void> {
  memoryReminders = memoryReminders.filter((r) => r.id !== id);
  if (dbDisabled) return;
  try {
    await ensureTablesExist();
    if (dbDisabled) return;
    await db.delete(reminders).where(eq(reminders.id, id));
  } catch (error) {
    console.warn('deleteReminderFromDb notice:', error);
  }
}

export async function getAllExpensesFromDb(): Promise<ExpenseItem[]> {
  if (dbDisabled) return memoryExpenses;
  try {
    await ensureTablesExist();
    if (dbDisabled) return memoryExpenses;
    const list = await db.select().from(expenses).orderBy(desc(expenses.date));
    const result = list.map((e) => ({
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
    if (result.length > 0) {
      memoryExpenses = result;
    }
    return memoryExpenses;
  } catch (error) {
    console.warn('Using memory expenses cache due to database notice:', error);
    return memoryExpenses;
  }
}

export async function saveExpenseToDb(expense: ExpenseItem, userId?: string): Promise<void> {
  const existingIdx = memoryExpenses.findIndex((e) => e.id === expense.id);
  if (existingIdx >= 0) {
    memoryExpenses[existingIdx] = expense;
  } else {
    memoryExpenses.unshift(expense);
  }

  if (dbDisabled) return;

  try {
    await ensureTablesExist();
    if (dbDisabled) return;
    await db
      .insert(expenses)
      .values({
        id: expense.id,
        userId: userId || null,
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
      })
      .onConflictDoUpdate({
        target: expenses.id,
        set: {
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
        },
      });
  } catch (error) {
    console.warn('saveExpenseToDb notice (cached in memory):', error);
  }
}

export async function deleteExpenseFromDb(id: string): Promise<void> {
  memoryExpenses = memoryExpenses.filter((e) => e.id !== id);
  if (dbDisabled) return;
  try {
    await db.delete(expenses).where(eq(expenses.id, id));
  } catch (error) {
    console.warn('deleteExpenseFromDb notice:', error);
  }
}

export async function clearAllFromDb(): Promise<void> {
  memoryEvents = [];
  memoryReminders = [];
  memoryExpenses = [];
  try {
    const pool = createPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY);
      TRUNCATE TABLE payments, reminders, expenses, events CASCADE;
    `);
  } catch (error) {
    try {
      await db.delete(payments);
      await db.delete(reminders);
      await db.delete(expenses);
      await db.delete(events);
    } catch (fallbackError) {
      console.warn('Clear DB fallback notice:', fallbackError);
    }
  }
}

export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const existing = await db.select().from(events).limit(1);
    if (existing.length === 0) {
      for (const ev of INITIAL_EVENTS) {
        await saveEventToDb(ev);
      }
      for (const rem of INITIAL_REMINDERS) {
        await saveReminderToDb(rem);
      }
      for (const exp of INITIAL_EXPENSES) {
        await saveExpenseToDb(exp);
      }
    }
  } catch (error) {
    console.warn('Initial seeding notice (using in-memory data):', error);
  }
}
