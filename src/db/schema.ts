import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Events table for Candy Salón de Eventos
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  userId: text('user_id'), // Optional: tied to auth user uid
  title: text('title').notNull(),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone'),
  clientEmail: text('client_email'),
  eventType: text('event_type').notNull(),
  eventDate: text('event_date').notNull(), // YYYY-MM-DD
  eventTime: text('event_time'), // HH:mm
  location: text('location'),
  guestCount: integer('guest_count').default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  depositAmount: integer('deposit_amount').notNull().default(0),
  status: text('status').notNull().default('deposit_paid'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Payments history table
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .references(() => events.id, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(),
  amount: integer('amount').notNull(),
  method: text('method').notNull(),
  concept: text('concept').notNull(),
  notes: text('notes'),
  receiptNumber: text('receipt_number'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Reminders table
export const reminders = pgTable('reminders', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  eventId: text('event_id'),
  eventTitle: text('event_title'),
  clientName: text('client_name'),
  clientPhone: text('client_phone'),
  title: text('title').notNull(),
  dueDate: text('due_date').notNull(), // YYYY-MM-DD
  dueTime: text('due_time'),
  category: text('category').notNull().default('cobro_saldo'),
  completed: boolean('completed').notNull().default(false),
  priority: text('priority').notNull().default('medium'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Expenses table for Candy Salón (Flujo de egresos: Personal, Alquiler, Gastos fijos, Suministros, Comida, Bebida)
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  date: text('date').notNull(), // YYYY-MM-DD
  amount: integer('amount').notNull(),
  category: text('category').notNull(), // pago_personal, alquiler, gastos_fijos, suministros, comida, bebida, etc.
  concept: text('concept').notNull(),
  paymentMethod: text('payment_method').notNull().default('Efectivo'), // Efectivo, Tarjeta, Transferencia
  eventId: text('event_id'),
  eventTitle: text('event_title'),
  supplier: text('supplier'),
  receiptNumber: text('receipt_number'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  event: one(events, {
    fields: [payments.eventId],
    references: [events.id],
  }),
}));


// BOTON memory: authorized observations from the host system.
// This stores what happened, not a pre-programmed automation rule.
export const botonObservations = pgTable('boton_observations', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  source: text('source').notNull().default('candy'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  context: text('context'), // JSON serialized context; avoids coupling BOTON to Candy UI
  outcome: text('outcome').notNull().default('observed'),
  createdAt: timestamp('created_at').defaultNow(),
});

// BOTON keeps the hypotheses it discovers separate from Candy business data.
export const botonDiscoveries = pgTable('boton_discoveries', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  kind: text('kind').notNull(), // pattern | need | microsystem
  signature: text('signature').notNull(),
  description: text('description').notNull(),
  confidence: integer('confidence').notNull().default(0), // 0..100
  status: text('status').notNull().default('candidate'),
  evidence: text('evidence'), // JSON serialized evidence
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Execution history lets BOTON verify results and learn from success/failure.
export const botonExecutions = pgTable('boton_executions', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  discoveryId: integer('discovery_id'),
  action: text('action').notNull(),
  risk: text('risk').notNull().default('low'),
  decision: text('decision').notNull(),
  result: text('result'),
  verified: boolean('verified').notNull().default(false),
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow(),
});
