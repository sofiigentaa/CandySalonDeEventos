import { EventItem, ExpenseItem, ReminderCategory, ReminderItem } from '../types.ts';
import { getRemainingBalance, parseLocalDate } from '../utils/dateUtils.ts';
import { CalandriaKind } from './chain.ts';

// Cotorra mira la agenda, los pagos y los gastos del salón y propone las
// tareas que se repiten. No hace nada sola: cada propuesta espera el botón.
// Los minutos son una estimación de cuánto lleva hacerlo a mano.

export type NewReminder = Omit<ReminderItem, 'id' | 'createdAt'>;

export interface Suggestion {
  key: string;
  kind: Exclude<CalandriaKind, 'sistema'>;
  title: string;
  detail: string;
  lines: string[];
  qty: number;
  minutes: number;
  payload:
    | { type: 'cobro_saldo'; reminders: NewReminder[]; messages: Array<{ client: string; phone?: string; text: string }> }
    | { type: 'preparativos'; reminders: NewReminder[] }
    | { type: 'evento_realizado'; events: EventItem[] }
    | { type: 'gasto_habitual'; expenses: ExpenseItem[] };
}

const DAY = 86400000;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const money = (n: number) => `$${n.toLocaleString('es-AR')}`;

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function daysUntil(dateStr: string, today: Date): number {
  return Math.round((parseLocalDate(dateStr).getTime() - today.getTime()) / DAY);
}
// La fecha del recordatorio: X días antes del evento, pero nunca antes de hoy.
function dueBefore(ev: EventItem, days: number, today: Date): string {
  const d = new Date(parseLocalDate(ev.eventDate).getTime() - days * DAY);
  return ymd(d < today ? today : d);
}
const shortDate = (s: string) => parseLocalDate(s).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' });

const active = (ev: EventItem) => ev.status !== 'cancelled' && ev.status !== 'completed';
const pendingRemindersFor = (reminders: ReminderItem[], evId: string, cat: ReminderCategory) =>
  reminders.some((r) => r.eventId === evId && r.category === cat && !r.completed);

// 1) Saldos: eventos en los próximos 15 días (o ya pasados) con saldo y sin
//    recordatorio de cobro pendiente.
function cobroSaldo(events: EventItem[], reminders: ReminderItem[], today: Date, salon: string): Suggestion | null {
  const list = events.filter(
    (ev) => active(ev) && getRemainingBalance(ev) > 0 && daysUntil(ev.eventDate, today) <= 15 && !pendingRemindersFor(reminders, ev.id, 'cobro_saldo')
  );
  if (list.length === 0) return null;
  return {
    key: `cobro_saldo:${list.map((e) => `${e.id}=${getRemainingBalance(e)}`).sort().join(',')}`,
    kind: 'cobro_saldo',
    title: 'Avisar los saldos pendientes',
    detail: `${plural(list.length, 'evento cercano tiene', 'eventos cercanos tienen')} saldo por cobrar. Creo el recordatorio de cobro y te dejo el mensaje listo para cada cliente.`,
    lines: list.map((e) => `${e.title} (${shortDate(e.eventDate)}): falta ${money(getRemainingBalance(e))}`),
    qty: list.length,
    minutes: 3 * list.length,
    payload: {
      type: 'cobro_saldo',
      reminders: list.map((ev) => ({
        eventId: ev.id,
        eventTitle: ev.title,
        clientName: ev.clientName,
        clientPhone: ev.clientPhone,
        title: `Cobrar saldo ${money(getRemainingBalance(ev))} (${ev.title})`,
        dueDate: dueBefore(ev, 7, today),
        category: 'cobro_saldo',
        priority: 'high',
        completed: false,
        notes: 'Creado con Cotorra.',
      })),
      messages: list.map((ev) => ({
        client: ev.clientName,
        phone: ev.clientPhone,
        text: `Hola ${ev.clientName.split(' ')[0]}! Te escribimos de ${salon}. Se acerca ${ev.title} (${shortDate(ev.eventDate)}) y quedó un saldo de ${money(
          getRemainingBalance(ev)
        )}. Podés abonarlo por transferencia o en el salón. ¡Cualquier duda nos escribís!`,
      })),
    },
  };
}

// 2) Preparativos: eventos de los próximos 7 días sin la lista de tareas de siempre.
const CHECKLIST: Array<{ category: ReminderCategory; title: string; daysBefore: number }> = [
  { category: 'confirmar_invitados', title: 'Confirmar cantidad final de invitados', daysBefore: 4 },
  { category: 'proveedores_catering', title: 'Confirmar catering y bebidas con proveedores', daysBefore: 3 },
  { category: 'decoracion_candy', title: 'Preparar decoración y Candy Bar', daysBefore: 1 },
];
function preparativos(events: EventItem[], reminders: ReminderItem[], today: Date): Suggestion | null {
  const items: NewReminder[] = [];
  const touched: EventItem[] = [];
  for (const ev of events) {
    const d = daysUntil(ev.eventDate, today);
    if (!active(ev) || d < 0 || d > 7) continue;
    const has = (cat: ReminderCategory) => reminders.some((r) => r.eventId === ev.id && r.category === cat);
    const missing = CHECKLIST.filter((c) => !has(c.category));
    if (missing.length === 0) continue;
    touched.push(ev);
    missing.forEach((c) =>
      items.push({
        eventId: ev.id,
        eventTitle: ev.title,
        clientName: ev.clientName,
        clientPhone: ev.clientPhone,
        title: `${c.title} (${ev.title})`,
        dueDate: dueBefore(ev, c.daysBefore, today),
        category: c.category,
        priority: c.daysBefore <= 1 ? 'high' : 'medium',
        completed: false,
        notes: 'Creado con Cotorra.',
      })
    );
  }
  if (items.length === 0) return null;
  return {
    key: `preparativos:${items.map((r) => `${r.eventId}/${r.category}`).sort().join(',')}`,
    kind: 'preparativos',
    title: 'Armar la lista de tareas de la semana',
    detail: `${touched.length === 1 ? 'Hay 1 evento' : `Hay ${touched.length} eventos`} en los próximos 7 días. Creo los recordatorios de siempre con su fecha.`,
    lines: items.map((r) => `${shortDate(r.dueDate)}: ${r.title}`),
    qty: items.length,
    minutes: 2 * items.length,
    payload: { type: 'preparativos', reminders: items },
  };
}

// 3) Eventos que ya pasaron y están totalmente pagos: marcarlos como realizados.
function realizados(events: EventItem[], today: Date): Suggestion | null {
  const list = events.filter((ev) => ev.status === 'fully_paid' && daysUntil(ev.eventDate, today) < 0);
  if (list.length === 0) return null;
  return {
    key: `evento_realizado:${list.map((e) => e.id).sort().join(',')}`,
    kind: 'evento_realizado',
    title: 'Cerrar los eventos que ya se hicieron',
    detail: `${plural(list.length, 'evento ya pasó y está pago', 'eventos ya pasaron y están pagos')}. Los marco como realizados para que la agenda quede limpia.`,
    lines: list.map((e) => `${e.title} (${shortDate(e.eventDate)})`),
    qty: list.length,
    minutes: list.length,
    payload: { type: 'evento_realizado', events: list.map((e) => ({ ...e, status: 'completed' as const })) },
  };
}

// 4) Gastos que se repiten cada mes (aprendido): si un gasto con el mismo
//    concepto se cargó 2 veces o más con ~30 días de diferencia y ya toca,
//    propone cargarlo con el mismo monto.
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
function gastosHabituales(expenses: ExpenseItem[], today: Date): Suggestion | null {
  const groups = new Map<string, ExpenseItem[]>();
  for (const x of expenses) {
    const k = `${x.category}|${norm(x.concept)}`;
    groups.set(k, [...(groups.get(k) || []), x]);
  }
  const due: ExpenseItem[] = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const gap = (parseLocalDate(last.date).getTime() - parseLocalDate(prev.date).getTime()) / DAY;
    if (gap < 25 || gap > 35) continue; // no es mensual
    const since = (today.getTime() - parseLocalDate(last.date).getTime()) / DAY;
    if (since < gap - 5) continue; // todavía no toca
    if (since > gap + 20) continue; // se dejó de pagar
    due.push({
      ...last,
      id: `exp-cal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: ymd(today),
      receiptNumber: undefined,
      notes: 'Cargado con Cotorra: mismo monto que el mes anterior (se puede editar).',
      createdAt: new Date().toISOString(),
    });
  }
  if (due.length === 0) return null;
  return {
    key: `gasto_habitual:${due.map((x) => `${x.category}|${norm(x.concept)}`).sort().join(',')}`,
    kind: 'gasto_habitual',
    title: 'Cargar los gastos fijos del mes',
    detail: `Aprendí que ${due.length === 1 ? 'este gasto se repite' : `estos ${due.length} gastos se repiten`} todos los meses. Los cargo con el mismo monto del mes pasado; si cambió, lo editás.`,
    lines: due.map((x) => `${x.concept}: ${money(x.amount)}`),
    qty: due.length,
    minutes: 2 * due.length,
    payload: { type: 'gasto_habitual', expenses: due },
  };
}

export function buildSuggestions(
  events: EventItem[],
  reminders: ReminderItem[],
  expenses: ExpenseItem[],
  salon: string,
  now = new Date()
): Suggestion[] {
  const today = startOfDay(now);
  return [cobroSaldo(events, reminders, today, salon), preparativos(events, reminders, today), gastosHabituales(expenses, today), realizados(events, today)].filter(
    (s): s is Suggestion => s !== null
  );
}
