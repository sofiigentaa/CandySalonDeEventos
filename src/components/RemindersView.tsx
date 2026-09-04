import React, { useState, useMemo, useRef } from 'react';
import { EventItem, ReminderItem, ReminderCategory, ReminderPriority } from '../types';
import {
  formatShortDateSpanish,
  formatCurrency,
  getTodayString,
  getDaysRemaining,
} from '../utils/dateUtils';
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
  Sparkles,
  ChevronRight,
  Filter,
  Search,
  Check,
  CalendarDays,
  DollarSign,
  Users,
  Utensils,
  PartyPopper,
} from 'lucide-react';

interface RemindersViewProps {
  reminders: ReminderItem[];
  events: EventItem[];
  currency: string;
  onAddReminder: (reminder: Omit<ReminderItem, 'id' | 'createdAt'>) => void;
  onToggleComplete: (reminderId: string) => void;
  onDeleteReminder: (reminderId: string) => void;
  onOpenEventDetail?: (event: EventItem) => void;
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

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  events,
  currency,
  onAddReminder,
  onToggleComplete,
  onDeleteReminder,
  onOpenEventDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'today' | 'all' | 'completed'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [dueDate, setDueDate] = useState(getTodayString());
  const [dueTime, setDueTime] = useState('11:00');
  const [category, setCategory] = useState<ReminderCategory>('cobro_saldo');
  const [priority, setPriority] = useState<ReminderPriority>('high');
  const [notes, setNotes] = useState('');

  const handleOpenCreateForm = () => {
    setIsAddingNew(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 60);
  };

  const todayStr = getTodayString();

  // Metrics
  const pendingReminders = useMemo(() => reminders.filter((r) => !r.completed), [reminders]);
  const completedReminders = useMemo(() => reminders.filter((r) => r.completed), [reminders]);
  const dueTodayOrPast = useMemo(
    () => reminders.filter((r) => !r.completed && r.dueDate <= todayStr),
    [reminders, todayStr]
  );
  const pendingBalancesCount = useMemo(
    () => reminders.filter((r) => !r.completed && r.category === 'cobro_saldo').length,
    [reminders]
  );

  // Events without reminders for quick suggestions
  const upcomingEventsWithoutReminders = useMemo(() => {
    return events
      .filter((ev) => {
        if (ev.status === 'cancelled') return false;
        const count = reminders.filter((r) => r.eventId === ev.id).length;
        return count === 0;
      })
      .slice(0, 4);
  }, [events, reminders]);

  const handleQuickPreset = (
    presetType: 'cobro' | 'invitados' | 'proveedores' | 'candy' | 'aviso',
    event: EventItem
  ) => {
    setSelectedEventId(event.id);
    setIsAddingNew(true);

    if (presetType === 'cobro') {
      const balance = event.totalAmount - (event.depositAmount || 0);
      setTitle(`Cobrar saldo restante de ${event.title}`);
      setCategory('cobro_saldo');
      setPriority('high');
      setNotes(
        `Recordar cobro de saldo ${formatCurrency(balance, currency)} antes de la fecha del evento (${event.eventDate}).`
      );
    } else if (presetType === 'invitados') {
      setTitle(`Confirmar cantidad de invitados - ${event.clientName}`);
      setCategory('confirmar_invitados');
      setPriority('medium');
      setNotes(`Revisar lista final de invitados (${event.guestCount} pax estimados) para Candy Salón.`);
    } else if (presetType === 'proveedores') {
      setTitle(`Coordinar Proveedores & Catering - ${event.title}`);
      setCategory('proveedores_catering');
      setPriority('high');
      setNotes(`Confirmar horarios de DJ, ambientación y entrega de catering.`);
    } else if (presetType === 'candy') {
      setTitle(`Decoración & Candy Bar - ${event.title}`);
      setCategory('decoracion_candy');
      setPriority('medium');
      setNotes(`Chequear temática, mesa dulce, golosinas y souvenirs.`);
    } else if (presetType === 'aviso') {
      setTitle(`Aviso al Cliente / Coordinación - ${event.clientName}`);
      setCategory('aviso_cliente');
      setPriority('high');
      setNotes(`Avisar horarios de ingreso para la familia y detalles finales.`);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let eventTitle: string | undefined = undefined;
    let clientName: string | undefined = undefined;
    let clientPhone: string | undefined = undefined;

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

    // Reset
    setTitle('');
    setSelectedEventId('');
    setNotes('');
    setIsAddingNew(false);
  };

  // Filtered List
  const filteredReminders = useMemo(() => {
    return reminders
      .filter((r) => {
        // Tab filter
        if (activeTab === 'pending' && r.completed) return false;
        if (activeTab === 'completed' && !r.completed) return false;
        if (activeTab === 'today') {
          if (r.completed) return false;
          if (r.dueDate > todayStr) return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchClient = r.clientName?.toLowerCase().includes(q);
          const matchEvent = r.eventTitle?.toLowerCase().includes(q);
          const matchNotes = r.notes?.toLowerCase().includes(q);
          if (!matchTitle && !matchClient && !matchEvent && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [reminders, activeTab, categoryFilter, searchQuery, todayStr]);

  const sendWhatsAppReminder = (r: ReminderItem) => {
    if (!r.clientPhone) return;
    const cleanPhone = r.clientPhone.replace(/\D/g, '');
    let msg = `Hola ${r.clientName || ''}! Te contactamos desde *Candy Salón de Eventos* 🎉\n\n`;
    msg += `📌 *Recordatorio:* ${r.title}\n`;
    if (r.eventTitle) msg += `🗓 *Evento:* ${r.eventTitle}\n`;
    if (r.notes) msg += `📝 ${r.notes}\n\n`;
    msg += `¡Muchas gracias y quedamos a tu entera disposición!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner & Stats */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Recordatorios & Tareas
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                  Candy Salón
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Gestiona alertas de cobros de saldo, confirmación de invitados y proveedores.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => (isAddingNew ? setIsAddingNew(false) : handleOpenCreateForm())}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-pink-600 hover:bg-pink-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
          >
            {isAddingNew ? (
              <>
                <X className="w-4 h-4" />
                <span>Cerrar Formulario</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nuevo Recordatorio</span>
              </>
            )}
          </button>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Pendientes</span>
              <Bell className="w-4 h-4 text-pink-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {pendingReminders.length}
            </div>
            <div className="text-[11px] text-slate-400">Total por resolver</div>
          </div>

          <div
            className={`border rounded-xl p-3 ${
              dueTodayOrPast.length > 0
                ? 'bg-red-50/80 border-red-200 text-red-900'
                : 'bg-slate-50 border-slate-200/80 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={dueTodayOrPast.length > 0 ? 'text-red-700' : 'text-slate-500'}>
                Para Hoy / Vencidos
              </span>
              <AlertTriangle
                className={`w-4 h-4 ${dueTodayOrPast.length > 0 ? 'text-red-600' : 'text-slate-400'}`}
              />
            </div>
            <div className="text-2xl font-black mt-1">{dueTodayOrPast.length}</div>
            <div className={`text-[11px] ${dueTodayOrPast.length > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              Atención prioritaria
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
              <span>Cobros de Saldo</span>
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">{pendingBalancesCount}</div>
            <div className="text-[11px] text-amber-700 font-medium">Recordatorios de cobro</div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
              <span>Completados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {completedReminders.length}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">Tareas realizadas</div>
          </div>
        </div>
      </div>

      {/* New Reminder Form Card */}
      {isAddingNew && (
        <form
          ref={formRef}
          onSubmit={handleCreateSubmit}
          className="bg-white rounded-2xl border-2 border-pink-500 ring-4 ring-pink-500/10 p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Crear Nuevo Recordatorio
              </h3>
            </div>
            <span className="text-xs text-pink-600 font-semibold">Candy Salón de Eventos</span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Título de la Tarea o Alerta *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              placeholder="Ej: Cobrar saldo restante $250.000 a Sofía / Pedir confirmación de invitados"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:outline-hidden transition-all"
            />
          </div>

          {/* Event & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vincular a un Evento (Opcional)
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  if (e.target.value && !title) {
                    const ev = events.find((x) => x.id === e.target.value);
                    if (ev) setTitle(`Recordatorio para ${ev.title}`);
                  }
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ReminderCategory)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
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

          {/* Date, Time & Priority */}
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
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
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
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ReminderPriority)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
              >
                <option value="high">🔴 Alta (Urgente)</option>
                <option value="medium">🟡 Media</option>
                <option value="low">🟢 Baja</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas / Detalles Adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre número de cuenta, monto exacto, requerimientos especiales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-hidden transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold bg-pink-600 hover:bg-pink-700 active:scale-95 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Recordatorio</span>
            </button>
          </div>
        </form>
      )}

      {/* Quick Presets Bar for Upcoming Events */}
      {upcomingEventsWithoutReminders.length > 0 && (
        <div className="bg-gradient-to-r from-pink-50/70 to-indigo-50/70 rounded-2xl border border-pink-200/70 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Sugerencias Rápidas para Eventos Próximos
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {upcomingEventsWithoutReminders.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="font-bold text-xs text-slate-900 truncate pr-1">{ev.title}</div>
                  <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded shrink-0">
                    {ev.eventDate}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Cliente: <span className="font-semibold text-slate-700">{ev.clientName}</span>
                </div>
                <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('cobro', ev)}
                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                    title="Cobrar saldo"
                  >
                    💰 Saldo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('invitados', ev)}
                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                    title="Confirmar invitados"
                  >
                    👥 Invitados
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('candy', ev)}
                    className="px-2 py-1 bg-pink-100 hover:bg-pink-200 text-pink-900 rounded-lg text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                    title="Candy Bar y decoración"
                  >
                    🍭 Candy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('aviso', ev)}
                    className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                    title="Aviso al cliente"
                  >
                    📞 Aviso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs, Search & Category Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Status Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pendientes</span>
              <span className="px-1.5 py-0.2 bg-pink-100 text-pink-700 text-[10px] rounded-full">
                {pendingReminders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'today'
                  ? 'bg-white text-red-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Para Hoy / Urgentes</span>
              {dueTodayOrPast.length > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {dueTodayOrPast.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todos</span>
              <span className="text-slate-400 text-[10px]">({reminders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'bg-white text-emerald-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Completados</span>
              <span className="text-emerald-600 text-[10px]">({completedReminders.length})</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, tarea o evento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas las categorías
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('cobro_saldo')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'cobro_saldo'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            💰 Cobro de Saldo
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('confirmar_invitados')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'confirmar_invitados'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            👥 Confirmar Invitados
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('proveedores_catering')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'proveedores_catering'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            🍽️ Proveedores & Catering
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('decoracion_candy')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'decoracion_candy'
                ? 'bg-pink-600 text-white shadow-2xs'
                : 'bg-pink-50 text-pink-800 border border-pink-200 hover:bg-pink-100'
            }`}
          >
            🍭 Decoración & Candy Bar
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('aviso_cliente')}
            className={`px-3 py-1 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'aviso_cliente'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            📞 Aviso al Cliente
          </button>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-500 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {activeTab === 'pending'
                ? '¡No hay recordatorios pendientes!'
                : 'No se encontraron recordatorios con estos filtros.'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Puedes agregar recordatorios de cobro de saldo, confirmación de invitados o detalles de
              decoración para mantener Candy Salón siempre al día.
            </p>
            <button
              id="btn-create-reminder-empty-view"
              type="button"
              onClick={handleOpenCreateForm}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer ring-2 ring-pink-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Recordatorio</span>
            </button>
          </div>
        ) : (
          filteredReminders.map((r) => {
            const cat = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.otro;
            const isDueToday = r.dueDate === todayStr;
            const isOverdue = !r.completed && r.dueDate < todayStr;
            const remaining = getDaysRemaining(r.dueDate);

            return (
              <div
                key={r.id}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  r.completed
                    ? 'border-slate-200 opacity-60 bg-slate-50/50'
                    : isOverdue
                    ? 'border-red-300 ring-2 ring-red-400/10'
                    : isDueToday
                    ? 'border-amber-300 ring-2 ring-amber-400/10'
                    : 'border-slate-200/90 hover:border-pink-300'
                }`}
              >
                {/* Left Side: Checkbox & Info */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(r.id)}
                    title={r.completed ? 'Marcar como pendiente' : 'Marcar como completado'}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      r.completed
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-slate-300 hover:border-pink-500 text-transparent hover:text-pink-500'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Category & Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${cat.bg} ${cat.text} ${cat.border}`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </span>

                      {/* Priority Tag */}
                      {r.priority === 'high' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          🔴 Prioridad Alta
                        </span>
                      )}

                      {/* Event link tag */}
                      {r.eventTitle && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <PartyPopper className="w-3 h-3 text-pink-500" />
                          <span className="truncate max-w-[200px]">{r.eventTitle}</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      className={`text-sm font-bold text-slate-900 leading-snug break-words ${
                        r.completed ? 'line-through text-slate-400 font-normal' : ''
                      }`}
                    >
                      {r.title}
                    </h4>

                    {/* Notes if present */}
                    {r.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
                        {r.notes}
                      </p>
                    )}

                    {/* Footer Meta: Date, Time, Client */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-pink-500" />
                        <span
                          className={
                            isOverdue
                              ? 'text-red-600 font-bold'
                              : isDueToday
                              ? 'text-amber-700 font-bold'
                              : 'text-slate-700'
                          }
                        >
                          {formatShortDateSpanish(r.dueDate)}
                        </span>
                        {r.dueTime && <span className="text-slate-400">({r.dueTime} hs)</span>}
                      </div>

                      {/* Relative countdown pill */}
                      {!r.completed && (
                        <span
                          className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOverdue
                              ? 'bg-red-100 text-red-800'
                              : isDueToday
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {remaining.label}
                        </span>
                      )}

                      {r.clientName && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Cliente: {r.clientName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Actions (WhatsApp, Delete) */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                  {r.clientPhone && (
                    <button
                      type="button"
                      onClick={() => sendWhatsAppReminder(r)}
                      title={`Enviar recordatorio por WhatsApp a ${r.clientName || 'Cliente'}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Deseas eliminar el recordatorio "${r.title}"?`)) {
                        onDeleteReminder(r.id);
                      }
                    }}
                    title="Eliminar recordatorio"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
