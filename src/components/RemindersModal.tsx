import React, { useState, useRef, useEffect } from 'react';
import { EventItem, ReminderItem, ReminderCategory, ReminderPriority } from '../types';
import { getDayOfWeekName, formatShortDateSpanish, formatCurrency, getTodayString } from '../utils/dateUtils';
import {
  triggerBrowserNotification,
  playNotificationSound,
} from '../utils/notificationService';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MessageCircle,
  X,
  AlertTriangle,
  Tag,
  User,
  PartyPopper,
  Sparkles,
  ChevronRight,
  Filter,
  Zap,
} from 'lucide-react';

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: ReminderItem[];
  events: EventItem[];
  currency: string;
  onAddReminder: (reminder: Omit<ReminderItem, 'id' | 'createdAt'>) => void;
  onToggleComplete: (reminderId: string) => void;
  onDeleteReminder: (reminderId: string) => void;
  initialEventId?: string | null;
  preselectedEventId?: string | null;
}

const CATEGORY_CONFIG: Record<
  ReminderCategory,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  cobro_saldo: {
    label: 'Cobro de Saldo',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: '💰',
  },
  confirmar_invitados: {
    label: 'Confirmar Invitados',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: '👥',
  },
  proveedores_catering: {
    label: 'Proveedores & Catering',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    icon: '🍽️',
  },
  decoracion_candy: {
    label: 'Decoración & Candy Bar',
    bg: 'bg-pink-50',
    text: 'text-pink-800',
    border: 'border-pink-200',
    icon: '🍭',
  },
  aviso_cliente: {
    label: 'Aviso al Cliente',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: '📞',
  },
  otro: {
    label: 'General / Otro',
    bg: 'bg-slate-50',
    text: 'text-slate-800',
    border: 'border-slate-200',
    icon: '📝',
  },
};

export const RemindersModal: React.FC<RemindersModalProps> = ({
  isOpen,
  onClose,
  reminders,
  events,
  currency,
  onAddReminder,
  onToggleComplete,
  onDeleteReminder,
  initialEventId,
  preselectedEventId,
}) => {
  const effectiveEventId = initialEventId || preselectedEventId;
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('pending');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // New Reminder Form State
  const [title, setTitle] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>(effectiveEventId || '');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [dueTime, setDueTime] = useState('11:00');
  const [category, setCategory] = useState<ReminderCategory>('cobro_saldo');
  const [priority, setPriority] = useState<ReminderPriority>('high');
  const [notes, setNotes] = useState('');

  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const handleOpenCreateForm = () => {
    setIsAddingNew(true);
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 60);
  };

  // Update selected event if effectiveEventId changes when opening
  React.useEffect(() => {
    if (effectiveEventId) {
      setSelectedEventId(effectiveEventId);
      // Keep title field blank as requested: user has an empty field with quick shortcuts right there
      setTitle('');
      handleOpenCreateForm();
    }
  }, [effectiveEventId]);

  if (!isOpen) return null;

  const todayStr = getTodayString();

  const handleQuickPreset = (presetType: 'cobro' | 'invitados' | 'proveedores' | 'candy' | 'aviso' | 'repaso', event: EventItem) => {
    setSelectedEventId(event.id);
    setIsAddingNew(true);

    if (presetType === 'cobro') {
      setTitle(`Cobrar saldo restante de ${event.title}`);
      setCategory('cobro_saldo');
      setPriority('high');
      setNotes(`Recordar cobro de saldo antes de la fecha del evento (${event.eventDate}).`);
    } else if (presetType === 'invitados') {
      setTitle(`Confirmar cantidad de invitados - ${event.clientName}`);
      setCategory('confirmar_invitados');
      setPriority('medium');
      setNotes(`Revisar lista final de adultos/niños para armado de mesas y catering.`);
    } else if (presetType === 'proveedores') {
      setTitle(`Coordinar Proveedores & Catering - ${event.title}`);
      setCategory('proveedores_catering');
      setPriority('high');
      setNotes(`Confirmar horario de entrega de comida, sonido/DJ y mozos.`);
    } else if (presetType === 'candy') {
      setTitle(`Decoración & Candy Bar - ${event.title}`);
      setCategory('decoracion_candy');
      setPriority('medium');
      setNotes(`Chequear temática, golosinas personalizadas, globos y mantelería.`);
    } else if (presetType === 'aviso' || presetType === 'repaso') {
      setTitle(`Aviso al Cliente / Coordinación - ${event.clientName}`);
      setCategory('aviso_cliente');
      setPriority('high');
      setNotes(`Avisar horarios de ingreso para familiares, recepción y detalles finales.`);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let eventTitle = undefined;
    let clientName = undefined;
    let clientPhone = undefined;

    if (selectedEventId) {
      const evt = events.find((e) => e.id === selectedEventId);
      if (evt) {
        eventTitle = evt.title;
        clientName = evt.clientName;
        clientPhone = evt.clientPhone;
      }
    }

    onAddReminder({
      eventId: selectedEventId || undefined,
      eventTitle,
      clientName,
      clientPhone,
      title: title.trim(),
      dueDate,
      dueTime: dueTime || undefined,
      category,
      completed: false,
      priority,
      notes: notes.trim() || undefined,
    });

    // Play pleasant chime and trigger browser desktop alert
    playNotificationSound();
    triggerBrowserNotification('¡Recordatorio Guardado en Candy Salón!', {
      body: `${title.trim()} (Fecha: ${dueDate}${dueTime ? ` a las ${dueTime}` : ''})`,
    });

    // Reset form
    setTitle('');
    setSelectedEventId('');
    setNotes('');
    setIsAddingNew(false);
  };

  // Filtered Reminders
  const filteredReminders = reminders
    .filter((r) => {
      if (activeTab === 'pending' && r.completed) return false;
      if (activeTab === 'completed' && !r.completed) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => {
      // Pending first, then by dueDate asc
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const pendingCount = reminders.filter((r) => !r.completed).length;
  const dueTodayCount = reminders.filter((r) => !r.completed && r.dueDate <= todayStr).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center relative">
              <BellRing className="w-5 h-5" />
              {dueTodayCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Recordatorios y Tareas</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  Candy Salón
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {pendingCount} pendientes ({dueTodayCount} para hoy o vencidos)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (isAddingNew ? setIsAddingNew(false) : handleOpenCreateForm())}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isAddingNew
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              {isAddingNew ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cerrar Formulario</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Recordatorio</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Scrollable Body */}
        <div ref={scrollContainerRef} className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* New Reminder Form Card */}
          {isAddingNew && (
            <form
              onSubmit={handleCreateSubmit}
              className="bg-white rounded-2xl border-2 border-indigo-500/80 ring-4 ring-indigo-500/10 p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-top-4 duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Añadir Nuevo Recordatorio
                  </h3>
                </div>
                <span className="text-[11px] text-indigo-600 font-semibold">
                  Candy Salón de Eventos
                </span>
              </div>

              {/* Title input with Quick Shortcuts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Título de la Tarea / Recordatorio *
                  </label>
                  {title && (
                    <button
                      type="button"
                      onClick={() => setTitle('')}
                      className="text-[11px] text-slate-400 hover:text-pink-600 font-medium underline cursor-pointer"
                    >
                      Vaciar campo
                    </button>
                  )}
                </div>

                {/* Atajos Rápidos / One-click Presets */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Atajos rápidos para este recordatorio (1 click):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: '💰 Cobrar saldo restante',
                        title: 'Cobrar saldo pendiente',
                        cat: 'cobro_saldo' as ReminderCategory,
                        prio: 'high' as ReminderPriority,
                      },
                      {
                        label: '👥 Confirmar invitados',
                        title: 'Confirmar lista final de invitados (adultos y niños)',
                        cat: 'confirmar_invitados' as ReminderCategory,
                        prio: 'medium' as ReminderPriority,
                      },
                      {
                        label: '🎂 Torta & Catering',
                        title: 'Encargar torta temática, snacks y catering',
                        cat: 'proveedores_catering' as ReminderCategory,
                        prio: 'high' as ReminderPriority,
                      },
                      {
                        label: '🏰 Inflable & Pelotero',
                        title: 'Coordinar armado y chequeo de inflable y pelotero',
                        cat: 'proveedores_catering' as ReminderCategory,
                        prio: 'high' as ReminderPriority,
                      },
                      {
                        label: '🍭 Decoración & Candy Bar',
                        title: 'Armado de temática, globología y golosinas',
                        cat: 'decoracion_candy' as ReminderCategory,
                        prio: 'medium' as ReminderPriority,
                      },
                      {
                        label: '🕒 Avisar horarios (48h)',
                        title: 'Avisar horarios de ingreso y entrega de torta al cliente',
                        cat: 'aviso_cliente' as ReminderCategory,
                        prio: 'high' as ReminderPriority,
                      },
                      {
                        label: '🔑 Entrega de llaves',
                        title: 'Recepción, apertura del salón y entrega de llaves',
                        cat: 'otro' as ReminderCategory,
                        prio: 'medium' as ReminderPriority,
                      },
                      {
                        label: '🧹 Limpieza y personal',
                        title: 'Coordinación de personal de limpieza y cierre',
                        cat: 'otro' as ReminderCategory,
                        prio: 'low' as ReminderPriority,
                      },
                    ].map((shortcut, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => {
                          const ev = events.find((x) => x.id === selectedEventId);
                          const clientSuffix = ev ? ` - ${ev.clientName}` : '';
                          setTitle(`${shortcut.title}${clientSuffix}`);
                          setCategory(shortcut.cat);
                          setPriority(shortcut.prio);
                        }}
                        className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-pink-300 hover:text-pink-700 hover:bg-pink-50/50 shadow-2xs transition-all cursor-pointer active:scale-95"
                      >
                        {shortcut.label}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  ref={titleInputRef}
                  type="text"
                  required
                  placeholder="Escribe el recordatorio o toca un atajo rápido arriba..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:outline-hidden transition-all"
                />
              </div>

              {/* Event link & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vincular a Evento (Opcional)
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => {
                      setSelectedEventId(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
                  >
                    <option value="">-- Sin evento vinculado (General) --</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.eventDate}) - {ev.clientName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
                  >
                    <option value="cobro_saldo">💰 Cobro de Saldo</option>
                    <option value="confirmar_invitados">👥 Confirmar Invitados</option>
                    <option value="proveedores_catering">🍽️ Proveedores & Catering</option>
                    <option value="decoracion_candy">🍭 Decoración & Candy Bar</option>
                    <option value="aviso_cliente">📞 Aviso al Cliente</option>
                    <option value="otro">📝 General / Otro</option>
                  </select>
                </div>
              </div>

              {/* Date, Time & Priority with Quick Date Shortcuts */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500">
                  <Clock className="w-3 h-3 text-indigo-600" />
                  <span>Atajos de fecha:</span>
                  <button
                    type="button"
                    onClick={() => setDueDate(todayStr)}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-pink-100 hover:text-pink-700 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tm = new Date();
                      tm.setDate(tm.getDate() + 1);
                      setDueDate(tm.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-pink-100 hover:text-pink-700 text-slate-700 font-semibold border border-slate-200 cursor-pointer"
                  >
                    Mañana
                  </button>

                  {/* If linked event has a date, offer relative shortcuts */}
                  {selectedEventId && (() => {
                    const linkedEv = events.find(x => x.id === selectedEventId);
                    if (!linkedEv || !linkedEv.eventDate) return null;
                    const eventDateObj = new Date(linkedEv.eventDate + 'T12:00:00');
                    
                    const minusDays = (days: number) => {
                      const d = new Date(eventDateObj);
                      d.setDate(d.getDate() - days);
                      return d.toISOString().split('T')[0];
                    };

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setDueDate(minusDays(2));
                            setDueTime('10:00');
                          }}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 cursor-pointer"
                        >
                          2 días antes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDueDate(minusDays(5));
                            setDueTime('10:00');
                          }}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 cursor-pointer"
                        >
                          5 días antes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDueDate(minusDays(7));
                            setDueTime('10:00');
                          }}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 cursor-pointer"
                        >
                          1 semana antes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDueDate(linkedEv.eventDate);
                            setDueTime('09:00');
                          }}
                          className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200 cursor-pointer"
                        >
                          Día del evento (09:00)
                        </button>
                      </>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha Límite *
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Hora (Opcional)
                    </label>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prioridad
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ReminderPriority)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
                    >
                      <option value="high">🔴 Alta (Urgente)</option>
                      <option value="medium">🟡 Media</option>
                      <option value="low">🟢 Normal / Baja</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas Adicionales
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el cobro, proveedor, Candy Bar o llamada..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-hidden transition-all resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Guardar Recordatorio
                </button>
              </div>
            </form>
          )}

          {/* Quick Presets Carousel if there are events */}
          {events.length > 0 && !isAddingNew && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Atajos Rápidos para Candy Salón
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Crear recordatorio en 1 toque
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {events.slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex-shrink-0 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 rounded-xl p-2.5 transition-all text-left"
                  >
                    <div className="font-bold text-slate-900 text-[11px] truncate max-w-[140px]">
                      {ev.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
                      {ev.clientName}
                    </div>
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('cobro', ev)}
                        className="px-1.5 py-0.5 bg-amber-100/90 hover:bg-amber-200 text-amber-900 rounded-md text-[9px] font-bold transition-colors cursor-pointer"
                        title="Recordar cobrar saldo"
                      >
                        💰 Cobro
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('invitados', ev)}
                        className="px-1.5 py-0.5 bg-blue-100/90 hover:bg-blue-200 text-blue-900 rounded-md text-[9px] font-bold transition-colors cursor-pointer"
                        title="Confirmar invitados"
                      >
                        👥 Invitados
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('proveedores', ev)}
                        className="px-1.5 py-0.5 bg-purple-100/90 hover:bg-purple-200 text-purple-900 rounded-md text-[9px] font-bold transition-colors cursor-pointer"
                        title="Proveedores y Catering"
                      >
                        🍽️ Catering
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('candy', ev)}
                        className="px-1.5 py-0.5 bg-pink-100/90 hover:bg-pink-200 text-pink-900 rounded-md text-[9px] font-bold transition-colors cursor-pointer"
                        title="Candy bar y decoración"
                      >
                        🍭 Candy Bar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPreset('aviso', ev)}
                        className="px-1.5 py-0.5 bg-emerald-100/90 hover:bg-emerald-200 text-emerald-900 rounded-md text-[9px] font-bold transition-colors cursor-pointer"
                        title="Aviso al Cliente"
                      >
                        📞 Aviso
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Tabs & Category Filter Chips */}
          <div className="space-y-2 border-b border-slate-200/80 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'pending'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pendientes ({reminders.filter((r) => !r.completed).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({reminders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'completed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completados ({reminders.filter((r) => r.completed).length})
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Mostrando {filteredReminders.length} items
              </span>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px]">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('cobro_saldo')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === 'cobro_saldo'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                💰 Cobro de Saldo
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('confirmar_invitados')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === 'confirmar_invitados'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                👥 Confirmar Invitados
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('proveedores_catering')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === 'proveedores_catering'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                🍽️ Proveedores & Catering
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('decoracion_candy')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === 'decoracion_candy'
                    ? 'bg-pink-600 text-white'
                    : 'bg-pink-50 text-pink-800 border border-pink-200 hover:bg-pink-100'
                }`}
              >
                🍭 Decoración & Candy Bar
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('aviso_cliente')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === 'aviso_cliente'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                📞 Aviso al Cliente
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('otro')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  categoryFilter === 'otro'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                📝 General / Otro
              </button>
            </div>
          </div>

          {/* List of Reminders */}
          {filteredReminders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {activeTab === 'pending'
                  ? '¡No tienes recordatorios pendientes!'
                  : 'No hay recordatorios en esta lista.'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {activeTab === 'pending'
                  ? 'Todas las tareas y cobros de Candy Salón de Eventos están al día.'
                  : 'Puedes añadir recordatorios de cobro, confirmación de invitados o decoración.'}
              </p>
              <button
                id="btn-create-reminder-empty-state"
                type="button"
                onClick={handleOpenCreateForm}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer ring-2 ring-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Recordatorio</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredReminders.map((reminder) => {
                const catInfo = CATEGORY_CONFIG[reminder.category] || CATEGORY_CONFIG.otro;
                const isOverdue = !reminder.completed && reminder.dueDate < todayStr;
                const isDueToday = !reminder.completed && reminder.dueDate === todayStr;

                const handleWhatsAppClient = () => {
                  if (!reminder.clientPhone) return;
                  const phone = reminder.clientPhone.replace(/[^0-9]/g, '');
                  const text = encodeURIComponent(
                    `Hola ${reminder.clientName || ''}! Te escribimos de *Candy Salón de Eventos* para recordarte: ${reminder.title}. ¡Muchas gracias!`
                  );
                  window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
                };

                return (
                  <div
                    key={reminder.id}
                    className={`bg-white rounded-2xl border p-4 transition-all shadow-xs flex items-start justify-between gap-3 ${
                      reminder.completed
                        ? 'opacity-65 border-slate-200 bg-slate-50/40'
                        : isOverdue
                        ? 'border-red-300 bg-red-50/20 ring-1 ring-red-200'
                        : isDueToday
                        ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleComplete(reminder.id)}
                      className={`mt-0.5 p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                        reminder.completed
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                      }`}
                      title={reminder.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    {/* Body Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catInfo.bg} ${catInfo.text} ${catInfo.border}`}
                        >
                          {catInfo.icon} {catInfo.label}
                        </span>

                        {/* Priority Badge */}
                        {reminder.priority === 'high' && !reminder.completed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-900 border border-red-200">
                            🔴 Urgente
                          </span>
                        )}

                        {/* Due Date Alert Badge */}
                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white">
                            Vencido ({formatShortDateSpanish(reminder.dueDate)})
                          </span>
                        )}
                        {isDueToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white">
                            ¡Hoy! ({reminder.dueTime || 'Durante el día'})
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-xs sm:text-sm font-bold text-slate-900 mt-1.5 leading-snug ${
                          reminder.completed ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {reminder.title}
                      </h4>

                      {/* Event link tag */}
                      {reminder.eventTitle && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1 font-medium">
                          <PartyPopper className="w-3 h-3 text-indigo-500" />
                          <span className="font-semibold text-slate-800">
                            {reminder.eventTitle}
                          </span>
                          {reminder.clientName && (
                            <span className="text-slate-400">
                              ({reminder.clientName})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {reminder.notes && (
                        <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          {reminder.notes}
                        </p>
                      )}

                      {/* Date & Time footer */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mt-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatShortDateSpanish(reminder.dueDate)} ({getDayOfWeekName(reminder.dueDate)})
                        </span>
                        {reminder.dueTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {reminder.dueTime} hs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions on right */}
                    <div className="flex items-center gap-1 shrink-0">
                      {reminder.clientPhone && (
                        <button
                          type="button"
                          onClick={handleWhatsAppClient}
                          className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                          title={`Enviar WhatsApp a ${reminder.clientName || 'cliente'}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteReminder(reminder.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Eliminar recordatorio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Candy Salón de Eventos • Notificaciones y Alarmas
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
