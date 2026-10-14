import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EventItem, ExpenseItem, ReminderItem } from '../types.ts';
import { CalandriaAction, CalandriaKind, LogEntry, verifyChain, VerifyResult } from './chain.ts';
import { buildSuggestions, NewReminder, Suggestion } from './suggestions.ts';

// Lo que se muestra después de aprobar los saldos: mensajes listos para cada
// cliente. Vive solo en memoria y se borra al cerrar.
export type CalandriaResult = { type: 'mensajes'; messages: Array<{ title: string; phone?: string; text: string }> };

export interface PendingAction {
  localId: string;
  kind: CalandriaKind;
  action: CalandriaAction;
  qty: number;
  minutes: number;
  createdAt: string;
}

interface CalandriaContextType {
  suggestions: Suggestion[];
  paused: boolean;
  togglePause: () => void;
  approve: (s: Suggestion) => void;
  dismiss: (s: Suggestion) => void;
  pressButton: () => void;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  logOpen: boolean;
  setLogOpen: (v: boolean) => void;
  log: LogEntry[];
  pending: PendingAction[];
  verification: VerifyResult;
  minutesThisMonth: number;
  approvedCount: number;
  result: CalandriaResult | null;
  lastResult: CalandriaResult | null; // lo último que preparó (para compartir / imprimir); solo en memoria
  clearResult: () => void;
  homeActive: boolean; // se está viendo la pantalla de la G
  setHomeActive: (v: boolean) => void;
  toast: string | null;
  refreshLog: () => void;
}

const Ctx = createContext<CalandriaContextType | null>(null);
const SNOOZE_MS = 12 * 60 * 60 * 1000;
// Lo aprobado no vuelve a aparecer igual (si cambia algo, la propuesta cambia de clave y aparece de nuevo).
const DONE_MS = 3 * 24 * 60 * 60 * 1000;
const PREFS = 'candy_calandria_prefs';
const SNOOZE = 'candy_calandria_snooze';
const PENDING = 'candy_calandria_pending';

function readJson<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // ignorar
  }
}

async function postLog(p: PendingAction): Promise<boolean> {
  try {
    const res = await fetch('/api/calandria/log', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: p.kind, action: p.action, qty: p.qty, minutes: p.minutes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

let flushing: Promise<void> | null = null;
function flushPending(): Promise<void> {
  // Una sola subida a la vez: ninguna acción se registra dos veces.
  if (!flushing) {
    flushing = (async () => {
      for (;;) {
        const queue = readJson<PendingAction[]>(PENDING, []);
        if (queue.length === 0) return;
        if (!(await postLog(queue[0]))) return;
        writeJson(PENDING, readJson<PendingAction[]>(PENDING, []).filter((x) => x.localId !== queue[0].localId));
      }
    })().finally(() => (flushing = null));
  }
  return flushing;
}

interface ProviderProps {
  children: React.ReactNode;
  salon: string;
  events: EventItem[];
  reminders: ReminderItem[];
  expenses: ExpenseItem[];
  addReminder: (r: NewReminder) => void;
  saveExpense: (x: ExpenseItem) => void;
  saveEvent: (ev: EventItem) => void;
}

export const CalandriaProvider: React.FC<ProviderProps> = ({ children, salon, events, reminders, expenses, addReminder, saveExpense, saveEvent }) => {
  const [paused, setPaused] = useState<boolean>(() => readJson(PREFS, { paused: false }).paused);
  const [snoozed, setSnoozed] = useState<Record<string, number>>(() => readJson(SNOOZE, {}));
  const [panelOpen, setPanelOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pending, setPending] = useState<PendingAction[]>(() => readJson(PENDING, []));
  const [result, setResultState] = useState<CalandriaResult | null>(null);
  const [lastResult, setLastResult] = useState<CalandriaResult | null>(null);
  const setResult = (r: CalandriaResult | null) => {
    setResultState(r);
    if (r) setLastResult(r);
  };
  const [homeActive, setHomeActive] = useState(false);
  const homeRef = useRef(false);
  homeRef.current = homeActive;
  const [toast, setToast] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const refreshLog = useCallback(async () => {
    await flushPending();
    setPending(readJson(PENDING, []));
    try {
      const res = await fetch('/api/calandria/log', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLog(data);
      }
    } catch {
      // sin conexión: queda lo último que se leyó
    }
  }, []);

  useEffect(() => {
    refreshLog();
    const onOnline = () => refreshLog();
    window.addEventListener('online', onOnline);
    const t = setInterval(() => {
      if (readJson<PendingAction[]>(PENDING, []).length > 0) refreshLog();
    }, 30_000);
    return () => {
      window.removeEventListener('online', onOnline);
      clearInterval(t);
    };
  }, [refreshLog]);

  const record = useCallback(
    (kind: CalandriaKind, action: CalandriaAction, qty: number, minutes: number) => {
      const item: PendingAction = {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        action,
        qty,
        minutes,
        createdAt: new Date().toISOString(),
      };
      const next = [...readJson<PendingAction[]>(PENDING, []), item];
      writeJson(PENDING, next);
      setPending(next);
      refreshLog();
    },
    [refreshLog]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // Esconde una propuesta por un tiempo (functional update: sirve aunque se llame varias veces seguidas).
  const markSnoozed = useCallback(
    (key: string, ms: number) => {
      setSnoozed((prev) => {
        const now = Date.now();
        const next: Record<string, number> = { ...prev, [key]: now + ms };
        Object.keys(next).forEach((k) => next[k] < now && delete next[k]);
        writeJson(SNOOZE, next);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const suggestions = useMemo(() => {
    if (paused) return [];
    const now = Date.now();
    return buildSuggestions(events, reminders, expenses, salon).filter((s) => !(snoozed[s.key] > now));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, reminders, expenses, paused, snoozed, salon, tick]);

  const approve = useCallback(
    (s: Suggestion) => {
      const p = s.payload;
      if (p.type === 'cobro_saldo') {
        p.reminders.forEach(addReminder);
        setResult({ type: 'mensajes', messages: p.messages.map((m) => ({ title: m.client, phone: m.phone, text: m.text })) });
      } else if (p.type === 'preparativos') {
        p.reminders.forEach(addReminder);
      } else if (p.type === 'evento_realizado') {
        p.events.forEach(saveEvent);
      } else if (p.type === 'gasto_habitual') {
        p.expenses.forEach(saveExpense);
      }
      markSnoozed(s.key, DONE_MS);
      record(s.kind, 'aprobada', s.qty, s.minutes);
      showToast(`Listo. Golondrina te ahorró ~${s.minutes} min.`);
    },
    [addReminder, saveEvent, saveExpense, record, markSnoozed]
  );

  const dismiss = useCallback(
    (s: Suggestion) => {
      markSnoozed(s.key, SNOOZE_MS);
      record(s.kind, 'descartada', s.qty, 0);
    },
    [markSnoozed, record]
  );

  const togglePause = useCallback(() => {
    const next = !paused;
    setPaused(next);
    writeJson(PREFS, { paused: next });
    record('sistema', next ? 'pausa' : 'reanudada', 0, 0);
    showToast(next ? 'Golondrina en pausa: no propone nada hasta que la reanudes.' : 'Golondrina volvió a mirar.');
  }, [paused, record]);

  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;
  const panelRef = useRef(panelOpen);
  panelRef.current = panelOpen;
  const blockRef = useRef(false);

  // El botón físico nunca aprueba "a ciegas": si el panel está cerrado, lo abre.
  const pressButton = useCallback(() => {
    if (blockRef.current) return;
    blockRef.current = true;
    setTimeout(() => (blockRef.current = false), 600);
    if (!panelRef.current && !homeRef.current) {
      setPanelOpen(true);
      return;
    }
    const first = suggestionsRef.current[0];
    if (first) approve(first);
  }, [approve]);

  // F9 = botón Golondrina (un ESP32 conectado por USB como teclado manda F9).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        pressButton();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pressButton]);

  const verification = useMemo(() => verifyChain(log), [log]);
  const { minutesThisMonth, approvedCount } = useMemo(() => {
    const now = new Date();
    let month = 0;
    let count = 0;
    const add = (at: string, action: string, minutes: number) => {
      if (action !== 'aprobada') return;
      count++;
      const d = new Date(at);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) month += minutes;
    };
    log.forEach((e) => add(e.at, e.action, e.minutes));
    pending.forEach((p) => add(p.createdAt, p.action, p.minutes));
    return { minutesThisMonth: month, approvedCount: count };
  }, [log, pending]);

  const value: CalandriaContextType = {
    suggestions,
    paused,
    togglePause,
    approve,
    dismiss,
    pressButton,
    panelOpen,
    setPanelOpen,
    logOpen,
    setLogOpen,
    log,
    pending,
    verification,
    minutesThisMonth,
    approvedCount,
    result,
    lastResult,
    clearResult: () => setResultState(null),
    homeActive,
    setHomeActive,
    toast,
    refreshLog,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useCalandria() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCalandria fuera de CalandriaProvider');
  return v;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
