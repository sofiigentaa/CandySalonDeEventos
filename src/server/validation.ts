import { EventItem, ExpenseItem, PaymentRecord, ReminderItem } from '../types.ts';
import { getTotalPaid } from '../utils/dateUtils.ts';

// Validaciones del lado del servidor: la pantalla ya controla, pero la API
// no puede confiar en lo que le llega.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 1_000_000_000;
}

function text(value: unknown, max = 500): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value).slice(0, max);
}

export class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message);
}

export function validatePayment(p: any): PaymentRecord {
  if (!p || typeof p !== 'object') fail('Pago inválido.');
  if (!p.id || typeof p.id !== 'string') fail('El pago no tiene identificador.');
  if (!isValidDate(p.date)) fail('La fecha del pago no es válida.');
  if (!isMoney(p.amount) || p.amount <= 0) fail('El monto del pago tiene que ser un número entero mayor a 0.');
  if (!text(p.method)) fail('Falta el medio de pago.');
  if (!text(p.concept)) fail('Falta el concepto del pago.');
  return {
    id: p.id.slice(0, 80),
    date: p.date,
    amount: p.amount,
    method: text(p.method, 40) as any,
    concept: text(p.concept, 80)!,
    notes: text(p.notes),
    receiptNumber: text(p.receiptNumber, 40),
  };
}

export function validateEvent(e: any): EventItem {
  if (!e || typeof e !== 'object') fail('Evento inválido.');
  if (!e.id || typeof e.id !== 'string') fail('El evento no tiene identificador.');
  if (!text(e.title)) fail('Falta el nombre del evento.');
  if (!text(e.clientName)) fail('Falta el nombre del cliente.');
  if (!text(e.eventType)) fail('Falta el tipo de evento.');
  if (!isValidDate(e.eventDate)) fail('La fecha del evento no es válida.');
  if (e.eventTime && !TIME_RE.test(e.eventTime)) fail('La hora del evento no es válida.');
  if (!isMoney(e.totalAmount)) fail('El total tiene que ser un número entero igual o mayor a 0.');
  if (!isMoney(e.depositAmount)) fail('La seña tiene que ser un número entero igual o mayor a 0.');
  if (e.depositAmount > e.totalAmount) fail('La seña no puede ser mayor que el total del evento.');
  const history = Array.isArray(e.paymentHistory) ? e.paymentHistory.map(validatePayment) : [];
  const paid = getTotalPaid({ ...e, paymentHistory: history });
  if (paid > e.totalAmount) fail('Lo pagado supera el total del evento.');
  return {
    ...e,
    id: e.id.slice(0, 80),
    title: text(e.title, 160)!,
    clientName: text(e.clientName, 160)!,
    clientPhone: text(e.clientPhone, 40),
    clientEmail: text(e.clientEmail, 160),
    eventType: text(e.eventType, 40) as any,
    eventTime: text(e.eventTime, 5),
    guestCount: Number.isInteger(e.guestCount) && e.guestCount >= 0 ? e.guestCount : undefined,
    notes: text(e.notes, 4000),
    paymentHistory: history,
    contractedServices: Array.isArray(e.contractedServices)
      ? e.contractedServices.slice(0, 100).map((x: any) => ({
          id: String(x?.id || '').slice(0, 80),
          name: String(x?.name || '').slice(0, 160),
          price: Number.isFinite(x?.price) ? Math.max(0, Math.round(x.price)) : 0,
          quantity: Number.isFinite(x?.quantity) ? Math.max(0, Math.round(x.quantity)) : undefined,
          category: x?.category ? String(x.category).slice(0, 60) : undefined,
        }))
      : undefined,
  };
}

export function validatePaymentForEvent(ev: EventItem, payment: PaymentRecord): void {
  const paid = getTotalPaid(ev);
  const remaining = Math.max(0, ev.totalAmount - paid);
  if (payment.amount > remaining) {
    fail(`El pago supera el saldo pendiente ($${remaining.toLocaleString('es-AR')}).`);
  }
}

// Mismo día y misma hora en el salón = el salón ya está ocupado.
export function findBookingConflict(all: EventItem[], ev: EventItem): EventItem | undefined {
  if (!ev.eventTime) return undefined;
  return all.find(
    (other) =>
      other.id !== ev.id &&
      other.status !== 'cancelled' &&
      other.eventDate === ev.eventDate &&
      other.eventTime === ev.eventTime
  );
}

export function validateReminder(r: any): ReminderItem {
  if (!r || typeof r !== 'object') fail('Recordatorio inválido.');
  if (!r.id || typeof r.id !== 'string') fail('El recordatorio no tiene identificador.');
  if (!text(r.title)) fail('Falta el título del recordatorio.');
  if (!isValidDate(r.dueDate)) fail('La fecha del recordatorio no es válida.');
  if (r.dueTime && !TIME_RE.test(r.dueTime)) fail('La hora del recordatorio no es válida.');
  return { ...r, title: text(r.title, 200)!, notes: text(r.notes, 2000), completed: Boolean(r.completed) };
}

export function validateExpense(x: any): ExpenseItem {
  if (!x || typeof x !== 'object') fail('Egreso inválido.');
  if (!x.id || typeof x.id !== 'string') fail('El egreso no tiene identificador.');
  if (!isValidDate(x.date)) fail('La fecha del egreso no es válida.');
  if (!isMoney(x.amount) || x.amount <= 0) fail('El monto del egreso tiene que ser un número entero mayor a 0.');
  if (!text(x.category)) fail('Falta la categoría del egreso.');
  if (!text(x.concept)) fail('Falta el concepto del egreso.');
  return { ...x, concept: text(x.concept, 200)!, notes: text(x.notes, 2000) };
}
