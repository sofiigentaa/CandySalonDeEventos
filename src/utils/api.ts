import { EventItem, PaymentRecord, ReminderItem, ExpenseItem } from '../types.ts';
import {
  loadEventsFromStorage,
  saveEventsToStorage,
  loadRemindersFromStorage,
  saveRemindersToStorage,
  loadExpensesFromStorage,
  saveExpensesToStorage,
} from './storage.ts';
import { supabase } from './supabase.ts';

// La sesión de Supabase aporta el token de acceso para cada llamada a la API.
// Si un guardado falla, se avisa en pantalla (antes fallaba en silencio).

type ErrorHandler = (message: string) => void;
let onUnauthorized: () => void = () => {};
let onApiError: ErrorHandler = () => {};

export function setApiHandlers(handlers: { onUnauthorized?: () => void; onError?: ErrorHandler }) {
  if (handlers.onUnauthorized) onUnauthorized = handlers.onUnauthorized;
  if (handlers.onError) onApiError = handlers.onError;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      onUnauthorized();
      throw new ApiError(error.message, 401);
    }
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  Object.assign(headers, init.headers || {});

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      cache: init.cache || 'no-store',
      headers,
    });
  } catch {
    throw new ApiError('Sin conexión con el servidor. Revisá internet y probá de nuevo.', 0);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError('Tu sesión venció. Volvé a iniciar sesión.', 401);
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Error del servidor (${res.status}).`, res.status);
  }
  return data as T;
}

// Para guardados: si falla, avisa en pantalla y devuelve null.
async function mutate<T = any>(url: string, init: RequestInit): Promise<T | null> {
  try {
    return await apiRequest<T>(url, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo guardar.';
    if (!(err instanceof ApiError && err.status === 401)) onApiError(message);
    return null;
  }
}

// Para lecturas: si no hay conexión, usa la copia guardada en el navegador.
async function readList<T>(url: string, fromCache: () => T[], toCache: (items: T[]) => void): Promise<T[]> {
  try {
    const data = await apiRequest<T[]>(url);
    if (Array.isArray(data)) {
      toCache(data);
      return data;
    }
    return fromCache();
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) {
      onApiError('Sin conexión: se muestran los últimos datos guardados en este equipo.');
      return fromCache();
    }
    throw err;
  }
}

// --- Eventos ----------------------------------------------------------------

export function fetchEvents(): Promise<EventItem[]> {
  return readList('/api/events', loadEventsFromStorage, saveEventsToStorage);
}

// Devuelve el evento tal como quedó guardado (con recibos numerados), o null si falló.
export async function saveEventApi(event: EventItem): Promise<EventItem | null> {
  const data = await mutate<{ event: EventItem }>('/api/events', { method: 'POST', body: JSON.stringify(event) });
  return data?.event ?? null;
}

export async function deleteEventApi(id: string): Promise<boolean> {
  return (await mutate(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' })) !== null;
}

export async function addPaymentApi(eventId: string, payment: PaymentRecord): Promise<EventItem | null> {
  const data = await mutate<{ event: EventItem }>(`/api/events/${encodeURIComponent(eventId)}/payments`, {
    method: 'POST',
    body: JSON.stringify(payment),
  });
  return data?.event ?? null;
}

// --- Recordatorios ----------------------------------------------------------

export function fetchReminders(): Promise<ReminderItem[]> {
  return readList('/api/reminders', loadRemindersFromStorage, saveRemindersToStorage);
}

export async function saveReminderApi(reminder: ReminderItem): Promise<boolean> {
  return (await mutate('/api/reminders', { method: 'POST', body: JSON.stringify(reminder) })) !== null;
}

export async function deleteReminderApi(id: string): Promise<boolean> {
  return (await mutate(`/api/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' })) !== null;
}

// --- Egresos ----------------------------------------------------------------

export function fetchExpenses(): Promise<ExpenseItem[]> {
  return readList('/api/expenses', loadExpensesFromStorage, saveExpensesToStorage);
}

export async function saveExpenseApi(expense: ExpenseItem): Promise<boolean> {
  return (await mutate('/api/expenses', { method: 'POST', body: JSON.stringify(expense) })) !== null;
}

export async function deleteExpenseApi(id: string): Promise<boolean> {
  return (await mutate(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' })) !== null;
}

// --- Demo -------------------------------------------------------------------

export async function resetDemoApi(): Promise<{ events: EventItem[]; reminders: ReminderItem[]; expenses: ExpenseItem[] } | null> {
  const data = await mutate<{ events: EventItem[]; reminders: ReminderItem[]; expenses: ExpenseItem[] }>('/api/reset-demo', {
    method: 'POST',
  });
  if (!data) return null;
  saveEventsToStorage(data.events);
  saveRemindersToStorage(data.reminders);
  saveExpensesToStorage(data.expenses || []);
  return { events: data.events, reminders: data.reminders, expenses: data.expenses || loadExpensesFromStorage() };
}

export async function clearAllDataApi(): Promise<boolean> {
  const ok = (await mutate('/api/clear-all', { method: 'POST' })) !== null;
  if (ok) {
    saveEventsToStorage([]);
    saveRemindersToStorage([]);
    saveExpensesToStorage([]);
  }
  return ok;
}
