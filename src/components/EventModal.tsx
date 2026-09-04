import React, { useState, useEffect } from 'react';
import { EventItem, EventType, PaymentMethod, PaymentRecord, ReminderItem, ReminderCategory, ReminderPriority, EventContractedService } from '../types';
import {
  getDayOfWeekName,
  formatFullDateSpanish,
  formatShortDateSpanish,
  getDaysRemaining,
  formatCurrency,
  getTodayString,
} from '../utils/dateUtils';
import {
  triggerBrowserNotification,
  playNotificationSound,
} from '../utils/notificationService';
import {
  X,
  Calendar,
  Clock,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  Users,
  Tag,
  AlertCircle,
  CheckCircle2,
  BellRing,
  Sparkles,
  Plus,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Calculator,
  Check,
  Receipt,
} from 'lucide-react';

export interface EventReminderConfig {
  id: string;
  enabled: boolean;
  title: string;
  daysBefore: number;
  time: string;
  category: ReminderCategory;
  priority: ReminderPriority;
  notes?: string;
  isExpanded?: boolean;
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: EventItem, autoReminders?: Array<Omit<ReminderItem, 'id' | 'createdAt'>>) => void;
  onDeleteEvent?: (id: string) => void;
  initialEvent?: EventItem | null;
  defaultDate?: string;
  currency: string;
}

const EVENT_TYPES: EventType[] = [
  'Cumpleaños',
  'Bautismo',
  'Baby Shower',
  'Comunión',
  'Otro',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'Transferencia',
  'Efectivo',
  'Mercado Pago',
  'Tarjeta',
  'Cheque',
  'Otro',
];

const DEFAULT_SERVICES = [
  { id: 'inflable', name: '🏰 Inflable Gigante / Pelotero', price: 25000, selected: false, icon: '🏰' },
  { id: 'candybar', name: '🎈 Decoración Temática & Candy Bar', price: 35000, selected: false, icon: '🎈' },
  { id: 'glitter', name: '✨ Puesto de Glitter Bar & Tatuajes', price: 20000, selected: false, icon: '✨' },
  { id: 'pochoclos', name: '🍿 Pochoclera Libre (Popcorn)', price: 18000, selected: false, icon: '🍿' },
  { id: 'menu_chicos', name: '🍔 Menú Infantil (panchos y snacks)', price: 40000, selected: false, icon: '🍔' },
  { id: 'cafeteria', name: '☕ Cafetería & Mate Libre Adultos', price: 15000, selected: false, icon: '☕' },
  { id: 'hora_extra', name: '⏰ Hora adicional de salón', price: 30000, selected: false, quantity: 1, icon: '⏰' },
];

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEvent,
  defaultDate,
  currency,
}) => {
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [eventType, setEventType] = useState<EventType>('Cumpleaños');
  const [eventDate, setEventDate] = useState(getTodayString());
  const [eventTime, setEventTime] = useState('20:00');
  const [location, setLocation] = useState('Candy Salón de Eventos');
  const [guestCount, setGuestCount] = useState<number | ''>('');
  
  // Financial fields
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('Transferencia');
  const [depositNotes, setDepositNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // Mode: Direct Total (false) vs Calculator Mode (true)
  const [isCalculatorMode, setIsCalculatorMode] = useState<boolean>(false);
  const [baseRentType, setBaseRentType] = useState<'weekday' | 'friday' | 'weekend' | 'custom'>('weekend');
  const [customBasePrice, setCustomBasePrice] = useState<number>(195000);
  const [servicesOptions, setServicesOptions] = useState<
    Array<{
      id: string;
      name: string;
      price: number;
      selected: boolean;
      quantity?: number;
      icon?: string;
    }>
  >(DEFAULT_SERVICES);
  const [isAddingCustomService, setIsAddingCustomService] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState<number | ''>('');

  // Editable Reminders List State
  const [remindersConfig, setRemindersConfig] = useState<EventReminderConfig[]>([]);

  // Precios base editables por la usuaria (dejan de estar fijos/hardcodeados)
  const [basePrices, setBasePrices] = useState<{ weekday: number; friday: number; weekend: number }>({
    weekday: 130000,
    friday: 160000,
    weekend: 195000,
  });
  const effectiveBasePrice = baseRentType === 'custom' ? (customBasePrice || 0) : basePrices[baseRentType];

  // Auto-detect day of week for recommended base rent
  const getDayRecommendation = (dateStr: string): 'weekday' | 'friday' | 'weekend' => {
    if (!dateStr) return 'weekend';
    try {
      const parts = dateStr.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const day = d.getDay();
      if (day === 5) return 'friday';
      if (day === 0 || day === 6) return 'weekend';
      return 'weekday';
    } catch {
      return 'weekend';
    }
  };

  // Sync recommended base rent type when eventDate changes for a new event
  useEffect(() => {
    if (!initialEvent && eventDate) {
      const rec = getDayRecommendation(eventDate);
      setBaseRentType(rec);
    }
  }, [eventDate, initialEvent]);

  // Reset or initialize state
  useEffect(() => {
    if (initialEvent) {
      setTitle(initialEvent.title || '');
      setClientName(initialEvent.clientName || '');
      setClientPhone(initialEvent.clientPhone || '');
      setClientEmail(initialEvent.clientEmail || '');
      setEventType(initialEvent.eventType || 'Cumpleaños');
      setEventDate(initialEvent.eventDate || getTodayString());
      setEventTime(initialEvent.eventTime || '20:00');
      setLocation(initialEvent.location || 'Candy Salón de Eventos');
      setGuestCount(initialEvent.guestCount ?? '');
      setTotalAmount(initialEvent.totalAmount ?? 0);
      setDepositAmount(initialEvent.depositAmount ?? 0);
      setGeneralNotes(initialEvent.notes || '');

      // Sync contracted services if editing
      if (initialEvent.contractedServices && initialEvent.contractedServices.length > 0) {
        const hasSalonRent = initialEvent.contractedServices.some((s) => s.category === 'salon');
        setIsCalculatorMode(hasSalonRent);

        // Map existing services
        const initialCustoms: Array<{
          id: string;
          name: string;
          price: number;
          selected: boolean;
          quantity?: number;
          icon?: string;
        }> = [];

        const mappedDefaults = DEFAULT_SERVICES.map((def) => {
          const match = initialEvent.contractedServices?.find(
            (cs) => cs.id === def.id || cs.name.toLowerCase().includes(def.id)
          );
          if (match) {
            return { ...def, selected: true, quantity: match.quantity || 1, price: match.price || def.price };
          }
          return { ...def, selected: false };
        });

        // Check if there were custom services not in defaults
        initialEvent.contractedServices.forEach((cs) => {
          if (cs.category === 'salon') return;
          const isDefault = DEFAULT_SERVICES.some((def) => def.id === cs.id || cs.name.toLowerCase().includes(def.id));
          if (!isDefault) {
            initialCustoms.push({
              id: cs.id,
              name: cs.name,
              price: cs.price,
              selected: true,
              quantity: cs.quantity || 1,
              icon: '✨',
            });
          }
        });

        setServicesOptions([...mappedDefaults, ...initialCustoms]);
      } else {
        setIsCalculatorMode(false);
        setServicesOptions(DEFAULT_SERVICES.map((s) => ({ ...s, selected: false })));
      }

      // Existing event: allow adding optional new reminders
      setRemindersConfig([
        {
          id: 'rem-balance',
          enabled: false,
          title: `Cobrar saldo pendiente`,
          daysBefore: 7,
          time: '11:00',
          category: 'cobro_saldo',
          priority: 'high',
          notes: 'Recordatorio para solicitar el pago del saldo.',
          isExpanded: false,
        },
        {
          id: 'rem-candy',
          enabled: false,
          title: `Armado de Candy Bar & confirmación de invitados`,
          daysBefore: 3,
          time: '16:00',
          category: 'decoracion_candy',
          priority: 'medium',
          notes: 'Chequear vajilla, golosinas y lista final de asistentes.',
          isExpanded: false,
        },
      ]);

      const initialDepositRecord = initialEvent.paymentHistory?.find(
        (p) => p.concept === 'Seña inicial'
      );
      if (initialDepositRecord) {
        setDepositMethod(initialDepositRecord.method);
        setDepositNotes(initialDepositRecord.notes || '');
      }
    } else {
      // New Event: Pre-configured and enabled by default
      setTitle('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setEventType('Cumpleaños');
      setEventDate(defaultDate || getTodayString());
      setEventTime('20:00');
      setLocation('Candy Salón de Eventos');
      setGuestCount('');
      setTotalAmount('');
      setDepositAmount('');
      setDepositMethod('Transferencia');
      setDepositNotes('');
      setGeneralNotes('');
      setIsCalculatorMode(false);
      setServicesOptions(DEFAULT_SERVICES.map((s) => ({ ...s, selected: false })));

      setRemindersConfig([
        {
          id: 'rem-balance',
          enabled: true,
          title: 'Cobrar saldo pendiente',
          daysBefore: 7,
          time: '11:00',
          category: 'cobro_saldo',
          priority: 'high',
          notes: 'Avisar al cliente para cancelar el saldo restante.',
          isExpanded: false,
        },
        {
          id: 'rem-candy',
          enabled: true,
          title: 'Armado de Candy Bar & confirmación de invitados',
          daysBefore: 3,
          time: '16:00',
          category: 'decoracion_candy',
          priority: 'medium',
          notes: 'Chequear vajilla, golosinas y lista final de asistentes.',
          isExpanded: false,
        },
      ]);
    }
  }, [initialEvent, defaultDate, isOpen]);

  // Cierra el modal con la tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Real-time calculations
  const numTotal = typeof totalAmount === 'number' ? totalAmount : 0;
  const numDeposit = typeof depositAmount === 'number' ? depositAmount : 0;
  const remaining = Math.max(0, numTotal - numDeposit);
  const percentageDeposit = numTotal > 0 ? Math.min(100, Math.round((numDeposit / numTotal) * 100)) : 0;

  // Real-time sum of selected services
  const additionalsSum = servicesOptions
    .filter((s) => s.selected)
    .reduce((sum, s) => sum + s.price * (s.quantity || 1), 0);
  const calculatedTotalWithBase = effectiveBasePrice + additionalsSum;

  const dayOfWeek = eventDate ? getDayOfWeekName(eventDate) : '';
  const fullDateSpan = eventDate ? formatFullDateSpanish(eventDate) : '';
  const countdown = eventDate ? getDaysRemaining(eventDate) : null;

  // Calculate reminder target date given days before
  const calcDateBefore = (daysBefore: number): string => {
    try {
      const parts = eventDate.split('-').map(Number);
      const target = new Date(parts[0], parts[1] - 1, parts[2] - daysBefore);
      const today = new Date();
      const effectiveDate = target < today ? today : target;
      return `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}-${String(effectiveDate.getDate()).padStart(2, '0')}`;
    } catch {
      return getTodayString();
    }
  };

  // Helper to add custom reminder
  const handleAddCustomReminder = (presetType?: 'custom' | 'proveedores' | 'llamada') => {
    let newTitle = '';
    let newCategory: ReminderCategory = 'otro';
    let newDays = 2;
    let newTime = '12:00';
    let newPriority: ReminderPriority = 'medium';
    let newNotes = '';

    if (presetType === 'proveedores') {
      newTitle = 'Coordinar con Proveedores (Sonido, DJ, Catering)';
      newCategory = 'proveedores_catering';
      newDays = 5;
      newTime = '10:00';
      newPriority = 'high';
      newNotes = 'Confirmar horarios de llegada de sonido y catering.';
    } else if (presetType === 'llamada') {
      newTitle = 'Llamar al cliente para repasar cronograma';
      newCategory = 'aviso_cliente';
      newDays = 1;
      newTime = '15:00';
      newPriority = 'high';
      newNotes = 'Último contacto para confirmar horarios y detalles de ingreso.';
    }

    setRemindersConfig((prev) => [
      ...prev,
      {
        id: `rem-custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        enabled: true,
        title: newTitle,
        daysBefore: newDays,
        time: newTime,
        category: newCategory,
        priority: newPriority,
        notes: newNotes,
        isExpanded: true,
      },
    ]);
  };

  // Calculator & Service Selection helper methods
  const toggleServiceOption = (id: string) => {
    setServicesOptions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s));
      if (isCalculatorMode) {
        const newAddSum = updated
          .filter((s) => s.selected)
          .reduce((sum, s) => sum + s.price * (s.quantity || 1), 0);
        setTotalAmount(effectiveBasePrice + newAddSum);
      }
      return updated;
    });
  };

  const updateServiceQuantity = (id: string, delta: number) => {
    setServicesOptions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === id) {
          const newQ = Math.max(1, (s.quantity || 1) + delta);
          return { ...s, quantity: newQ };
        }
        return s;
      });
      if (isCalculatorMode) {
        const newAddSum = updated
          .filter((s) => s.selected)
          .reduce((sum, s) => sum + s.price * (s.quantity || 1), 0);
        setTotalAmount(effectiveBasePrice + newAddSum);
      }
      return updated;
    });
  };

  // Permite a la usuaria editar el precio de un servicio/adicional (deja de ser un valor fijo)
  const updateServicePrice = (id: string, newPrice: number) => {
    setServicesOptions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, price: Math.max(0, newPrice) } : s));
      if (isCalculatorMode) {
        const newAddSum = updated
          .filter((s) => s.selected)
          .reduce((sum, s) => sum + s.price * (s.quantity || 1), 0);
        setTotalAmount(effectiveBasePrice + newAddSum);
      }
      return updated;
    });
  };

  // Permite a la usuaria editar los precios base sugeridos (día de semana / viernes / fin de semana)
  const updateBasePriceForType = (type: 'weekday' | 'friday' | 'weekend', newPrice: number) => {
    setBasePrices((prev) => {
      const updated = { ...prev, [type]: Math.max(0, newPrice) };
      if (baseRentType === type) {
        setTotalAmount(Math.max(0, newPrice) + additionalsSum);
      }
      return updated;
    });
  };

  const handleSelectBaseRentType = (type: 'weekday' | 'friday' | 'weekend' | 'custom') => {
    setBaseRentType(type);
    const newBase = type === 'custom' ? (customBasePrice || 0) : basePrices[type];
    setTotalAmount(newBase + additionalsSum);
  };

  const handleApplyAdditionalsTotal = () => {
    setTotalAmount(additionalsSum);
  };

  const handleSwitchToCalculator = () => {
    setIsCalculatorMode(true);
    if (totalAmount === '' || totalAmount === 0) {
      setTotalAmount(calculatedTotalWithBase);
    }
  };

  const handleSwitchToManual = () => {
    setIsCalculatorMode(false);
  };

  const handleAddCustomService = () => {
    if (!customServiceName.trim() || !customServicePrice) return;
    const newId = `custom-svc-${Date.now()}`;
    const newPrice = Number(customServicePrice);
    setServicesOptions((prev) => {
      const updated = [
        ...prev,
        {
          id: newId,
          name: customServiceName.trim(),
          price: newPrice,
          selected: true,
          icon: '✨',
        },
      ];
      if (isCalculatorMode) {
        const newAddSum = updated
          .filter((s) => s.selected)
          .reduce((sum, s) => sum + s.price * (s.quantity || 1), 0);
        setTotalAmount(effectiveBasePrice + newAddSum);
      }
      return updated;
    });
    setCustomServiceName('');
    setCustomServicePrice('');
    setIsAddingCustomService(false);
  };

  const handleQuickDeposit = (percentage: number) => {
    const currentTot = typeof totalAmount === 'number' ? totalAmount : 0;
    if (currentTot <= 0) return;
    const calcDeposit = Math.round((currentTot * (percentage / 100)) / 1000) * 1000;
    setDepositAmount(calcDeposit);
  };

  // Helpers to update individual reminder fields
  const handleUpdateReminder = (id: string, updates: Partial<EventReminderConfig>) => {
    setRemindersConfig((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleToggleReminder = (id: string) => {
    setRemindersConfig((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteReminderConfig = (id: string) => {
    setRemindersConfig((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleExpandReminder = (id: string) => {
    setRemindersConfig((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isExpanded: !r.isExpanded } : r))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !clientName.trim() || !eventDate) {
      alert('Por favor completa el nombre del evento, cliente y la fecha.');
      return;
    }

    const now = new Date().toISOString();

    // Setup initial payment history
    let updatedHistory: PaymentRecord[] = initialEvent?.paymentHistory ? [...initialEvent.paymentHistory] : [];
    
    if (!initialEvent) {
      // If new and there's a deposit, log it as first payment record
      if (numDeposit > 0) {
        updatedHistory.push({
          id: `pay-${Date.now()}`,
          date: getTodayString(),
          amount: numDeposit,
          method: depositMethod,
          concept: 'Seña inicial',
          notes: depositNotes || 'Seña de reserva de fecha en Candy Salón',
          receiptNumber: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
        });
      }
    } else {
      // If editing existing event and deposit amount was changed
      const depositIndex = updatedHistory.findIndex((p) => p.concept === 'Seña inicial');
      if (depositIndex >= 0) {
        updatedHistory[depositIndex] = {
          ...updatedHistory[depositIndex],
          amount: numDeposit,
          method: depositMethod,
          notes: depositNotes,
        };
      } else if (numDeposit > 0) {
        updatedHistory.unshift({
          id: `pay-${Date.now()}`,
          date: getTodayString(),
          amount: numDeposit,
          method: depositMethod,
          concept: 'Seña inicial',
          notes: depositNotes,
        });
      }
    }

    const eventId = initialEvent ? initialEvent.id : `evt-${Date.now()}`;

    // Compile contracted services list
    const contractedServicesList: EventContractedService[] = [];

    if (isCalculatorMode) {
      contractedServicesList.push({
        id: 'base-rent',
        name: `Alquiler Salón (${baseRentType === 'weekday' ? 'Lun a Jue' : baseRentType === 'friday' ? 'Viernes' : baseRentType === 'weekend' ? 'Sábado/Dom/Feriado' : 'Personalizado'} - 3 hs)`,
        price: effectiveBasePrice,
        quantity: 1,
        category: 'salon',
      });
    }

    // Include all selected additional services in both modes
    servicesOptions
      .filter((s) => s.selected)
      .forEach((s) => {
        contractedServicesList.push({
          id: s.id,
          name: s.name,
          price: s.price,
          quantity: s.quantity || 1,
          category: 'adicional',
        });
      });

    const eventToSave: EventItem = {
      id: eventId,
      title: title.trim(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      eventType,
      eventDate,
      eventTime: eventTime.trim() || undefined,
      location: location.trim() || 'Candy Salón de Eventos',
      guestCount: typeof guestCount === 'number' && guestCount > 0 ? guestCount : undefined,
      totalAmount: numTotal,
      depositAmount: numDeposit,
      paymentHistory: updatedHistory,
      contractedServices: contractedServicesList.length > 0 ? contractedServicesList : undefined,
      status: remaining === 0 && numTotal > 0 ? 'fully_paid' : numDeposit > 0 ? 'deposit_paid' : 'no_deposit',
      notes: generalNotes.trim() || undefined,
      createdAt: initialEvent ? initialEvent.createdAt : now,
      updatedAt: now,
    };

    // Build reminders from active configs
    const autoReminders: Array<Omit<ReminderItem, 'id' | 'createdAt'>> = [];

    remindersConfig.forEach((rem) => {
      if (!rem.enabled || !rem.title.trim()) return;

      const targetDueDate = calcDateBefore(rem.daysBefore);
      let reminderNote = rem.notes?.trim() || '';

      if (rem.category === 'cobro_saldo' && remaining > 0 && !reminderNote) {
        reminderNote = `Evento: ${title.trim()} (${eventDate}). Falta abonar: ${formatCurrency(remaining, currency)}.`;
      }

      autoReminders.push({
        eventId: eventId,
        eventTitle: title.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        title: rem.title.trim(),
        dueDate: targetDueDate,
        dueTime: rem.time || undefined,
        category: rem.category,
        completed: false,
        priority: rem.priority,
        notes: reminderNote || undefined,
      });
    });

    onSave(eventToSave, autoReminders.length > 0 ? autoReminders : undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onMouseDown={(e) => {
        // Cierra el modal si se hace click fuera de la tarjeta (en el fondo oscuro)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {initialEvent ? 'Editar Evento' : 'Registrar Nuevo Evento'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Detalla la fecha, seña recibida, saldo pendiente y recordatorios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Basic Event Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              1. Datos Principales del Evento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre o Título del Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Boda Sofía & Mateo / Cumpleaños 15 Valentina"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Evento
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden transition-all cursor-pointer font-medium"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. DÍA Y FECHA DEL EVENTO */}
          <div className="p-4.5 bg-indigo-50/40 rounded-2xl border border-indigo-100/90 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              2. Día y Fecha del Evento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha del Evento *
                </label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Horario de Inicio
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Real-time Day of Week banner */}
            {eventDate && (
              <div className="mt-2 p-3 bg-white rounded-xl border border-indigo-100/80 text-xs flex items-center justify-between shadow-2xs">
                <div>
                  <span className="font-bold text-slate-900 uppercase tracking-wide">
                    {dayOfWeek}
                  </span>
                  <span className="text-slate-600 ml-2 font-medium">
                    {fullDateSpan}
                  </span>
                </div>
                {countdown && (
                  <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0 leading-none">
                    {countdown.label}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 3. CALCULADORA DE SERVICIOS Y SEÑA */}
          <div className="p-4.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                3. Monto Total & Servicios Solicitados
              </h3>
              
              {/* Toggle Calculator / Direct Agreement */}
              <div className="flex items-center bg-slate-200/90 p-1 rounded-xl text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={handleSwitchToManual}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    !isCalculatorMode
                      ? 'bg-white text-indigo-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>✍️ Monto Acordado Directo</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToCalculator}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isCalculatorMode
                      ? 'bg-white text-indigo-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🧮 Calculadora de Servicios</span>
                </button>
              </div>
            </div>

            {isCalculatorMode ? (
              /* MODO CALCULADORA AUTOMÁTICA */
              <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                {/* Base Rent Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Alquiler Base del Salón (3 Horas)
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: 'weekday' as const, label: 'Lun a Jue', price: basePrices.weekday, desc: '3 hs base' },
                      { type: 'friday' as const, label: 'Viernes', price: basePrices.friday, desc: '3 hs base' },
                      { type: 'weekend' as const, label: 'Sáb / Dom / Feriado', price: basePrices.weekend, desc: '3 hs base' },
                      { type: 'custom' as const, label: 'Personalizado', price: customBasePrice, desc: 'Monto libre' },
                    ].map((opt) => {
                      const isSelected = baseRentType === opt.type;
                      return (
                        <div
                          key={opt.type}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectBaseRentType(opt.type)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                              {opt.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                          </div>
                          {opt.type === 'custom' ? (
                            <div className="text-xs font-extrabold text-slate-900 mt-1">
                              {formatCurrency(opt.price, currency)}
                            </div>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={opt.price}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateBasePriceForType(opt.type, Number(e.target.value) || 0)}
                              className="w-full mt-1 px-1.5 py-1 text-xs font-extrabold text-slate-900 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {baseRentType === 'custom' && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">Base personalizada:</span>
                      <input
                        type="number"
                        min="0"
                        value={customBasePrice}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setCustomBasePrice(val);
                          setTotalAmount(val + additionalsSum);
                        }}
                        className="w-36 px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>
                  )}
                </div>

                {/* Additional Services List */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Servicios y Adicionales Solicitados
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Tilda los servicios pedidos para calcular el total. El precio de cada uno es editable.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {servicesOptions.map((svc) => (
                      <div
                        key={svc.id}
                        onClick={() => toggleServiceOption(svc.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                          svc.selected
                            ? 'border-indigo-400 bg-indigo-50/60 shadow-2xs ring-1 ring-indigo-400/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={svc.selected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none shrink-0"
                          />
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {svc.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {svc.selected && svc.quantity !== undefined && (
                            <div className="flex items-center bg-white border border-slate-300 rounded-md px-1 py-0.5">
                              <button
                                type="button"
                                onClick={() => updateServiceQuantity(svc.id, -1)}
                                className="px-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                              >
                                -
                              </button>
                              <span className="px-1 text-[11px] font-bold text-slate-900">{svc.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateServiceQuantity(svc.id, 1)}
                                className="px-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                              >
                                +
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-0.5">
                            <span className="text-[10px] text-slate-400">{currency}</span>
                            <input
                              type="number"
                              min="0"
                              value={svc.price}
                              onChange={(e) => updateServicePrice(svc.id, Number(e.target.value) || 0)}
                              className="w-16 text-xs font-bold text-indigo-950 bg-white border border-slate-200 rounded-md px-1 py-0.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Extra Service */}
                  <div className="mt-2.5">
                    {isAddingCustomService ? (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 flex-wrap text-xs">
                        <input
                          type="text"
                          placeholder="Nombre del servicio (ej. Animador, Fotografía)"
                          value={customServiceName}
                          onChange={(e) => setCustomServiceName(e.target.value)}
                          className="flex-1 min-w-[160px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Precio ($)"
                          value={customServicePrice}
                          onChange={(e) => setCustomServicePrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomService}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 cursor-pointer"
                        >
                          Agregar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomService(false)}
                          className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomService(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar otro servicio o adicional personalizado
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtotal desglose (el Monto Total de abajo se actualiza solo con cada cambio) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-600">
                    Alquiler base: <span className="font-bold text-slate-900">{formatCurrency(effectiveBasePrice, currency)}</span>
                    {additionalsSum > 0 && (
                      <>
                        {' + '}Adicionales: <span className="font-bold text-slate-900">{formatCurrency(additionalsSum, currency)}</span>
                      </>
                    )}
                    {' = '}Suma total: <span className="font-extrabold text-indigo-700">{formatCurrency(calculatedTotalWithBase, currency)}</span>
                  </div>
                </div>

                {/* Monto Total Editable */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monto Total del Evento ({currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={totalAmount === '' ? '' : totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-14 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* MODO MONTO ACORDADO DIRECTO */
              <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Monto Total del Evento ({currency}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ingresa el monto total acordado"
                      value={totalAmount === '' ? '' : totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-14 pr-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Servicios y Adicionales (Opcional pero siempre visible y configurable) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        Servicios y Adicionales Incluidos
                      </label>
                      <span className="text-[11px] text-slate-500 block">
                        Tilda los servicios que incluye el festejo para que figuren en el contrato y comprobante
                      </span>
                    </div>

                    {additionalsSum > 0 && (
                      <button
                        type="button"
                        onClick={handleApplyAdditionalsTotal}
                        className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-all cursor-pointer"
                        title="Usar suma de los adicionales seleccionados como monto total"
                      >
                        ⚡ Usar suma ({formatCurrency(additionalsSum, currency)})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {servicesOptions.map((svc) => (
                      <div
                        key={svc.id}
                        onClick={() => toggleServiceOption(svc.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
                          svc.selected
                            ? 'border-indigo-400 bg-indigo-50/60 shadow-2xs ring-1 ring-indigo-400/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={svc.selected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none shrink-0"
                          />
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {svc.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {svc.selected && svc.quantity !== undefined && (
                            <div className="flex items-center bg-white border border-slate-300 rounded-md px-1 py-0.5">
                              <button
                                type="button"
                                onClick={() => updateServiceQuantity(svc.id, -1)}
                                className="px-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                              >
                                -
                              </button>
                              <span className="px-1 text-[11px] font-bold text-slate-900">{svc.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateServiceQuantity(svc.id, 1)}
                                className="px-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                              >
                                +
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-0.5">
                            <span className="text-[10px] text-slate-400">{currency}</span>
                            <input
                              type="number"
                              min="0"
                              value={svc.price}
                              onChange={(e) => updateServicePrice(svc.id, Number(e.target.value) || 0)}
                              className="w-16 text-xs font-bold text-indigo-950 bg-white border border-slate-200 rounded-md px-1 py-0.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Extra Service */}
                  <div className="mt-2.5">
                    {isAddingCustomService ? (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 flex-wrap text-xs">
                        <input
                          type="text"
                          placeholder="Nombre del servicio (ej. Animador, Fotografía)"
                          value={customServiceName}
                          onChange={(e) => setCustomServiceName(e.target.value)}
                          className="flex-1 min-w-[160px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Precio ($)"
                          value={customServicePrice}
                          onChange={(e) => setCustomServicePrice(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomService}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 cursor-pointer"
                        >
                          Agregar
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomService(false)}
                          className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomService(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Agregar otro servicio o adicional personalizado
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Total Display & Deposit Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-900 uppercase block">
                    Monto Total a Cobrar
                  </span>
                  <span className="text-lg font-black text-indigo-950">
                    {formatCurrency(numTotal, currency)}
                  </span>
                </div>
                <span className="text-[11px] px-2 py-1 bg-white rounded-md text-indigo-700 font-bold border border-indigo-100">
                  {isCalculatorMode ? 'Calculadora' : 'Monto Acordado'}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-emerald-800">
                    ¿Cuánto Dejó de Seña? ({currency})
                  </label>
                  {/* Quick deposit buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickDeposit(30)}
                      className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer transition-colors"
                      title="Calcular seña del 30%"
                    >
                      30%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDeposit(50)}
                      className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer transition-colors"
                      title="Calcular seña del 50%"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDeposit(100)}
                      className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer transition-colors"
                      title="Marcar 100% abonado"
                    >
                      100%
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs pointer-events-none">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={depositAmount === '' ? '' : depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-14 pr-3.5 py-2 text-sm bg-white border border-emerald-300 rounded-xl font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            {/* LIVE CALCULATION BOX */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-bold uppercase text-emerald-900 block">
                  Seña Registrada
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-base font-bold text-emerald-800">
                    {formatCurrency(numDeposit, currency)}
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold">
                    ({percentageDeposit}% del total)
                  </span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${
                remaining === 0 && numTotal > 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <span className={`text-[11px] font-bold uppercase block ${
                  remaining === 0 && numTotal > 0 ? 'text-emerald-900' : 'text-amber-900'
                }`}>
                  Falta Abonar (Saldo Pendiente)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-base font-bold ${
                    remaining === 0 && numTotal > 0 ? 'text-emerald-800' : 'text-amber-950'
                  }`}>
                    {remaining === 0 && numTotal > 0 ? 'Totalmente Cubierto ($ 0)' : formatCurrency(remaining, currency)}
                  </span>
                  {remaining > 0 && (
                    <span className="text-xs text-amber-800 font-semibold">
                      ({100 - percentageDeposit}%)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Method & Deposit notes */}
            {numDeposit > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Método de Pago de la Seña
                  </label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden font-medium"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Comprobante / Nota de la Seña
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Transferencia #9948, Recibido en efectivo..."
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Client Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              4. Contacto del Cliente y Ubicación
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="+54 9 11 1234-5678"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lugar / Salón del Evento
                </label>
                <input
                  type="text"
                  placeholder="Ej. Salón Magnolia, Av. Libertador 4500"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad de Invitados
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ej. 100"
                  value={guestCount === '' ? '' : guestCount}
                  onChange={(e) => setGuestCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 5. Recordatorios & Alertas Editables para Candy Salón */}
          <div className="bg-indigo-50/60 rounded-2xl border border-indigo-200/90 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  5. Recordatorios & Alertas para este Evento
                </h3>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                Personalizable
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Activa o edita el texto, los días de anticipación y los detalles de cada recordatorio para este evento:
            </p>

            {/* List of Configurable Reminders */}
            <div className="space-y-2.5">
              {remindersConfig.map((rem, idx) => {
                const targetDate = calcDateBefore(rem.daysBefore);
                const targetDaySpan = formatShortDateSpanish(targetDate);
                const targetDayName = getDayOfWeekName(targetDate);

                return (
                  <div
                    key={rem.id}
                    className={`rounded-xl border transition-all ${
                      rem.enabled
                        ? 'bg-white border-indigo-200 shadow-2xs ring-1 ring-indigo-500/10'
                        : 'bg-white/60 border-slate-200/80 opacity-70'
                    }`}
                  >
                    {/* Main Row */}
                    <div className="p-3 flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={rem.enabled}
                          onChange={() => handleToggleReminder(rem.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0"
                        />

                        {/* Title input / display */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={rem.title}
                            onChange={(e) => handleUpdateReminder(rem.id, { title: e.target.value })}
                            placeholder="Nombre del recordatorio (o toca un atajo abajo)..."
                            className={`w-full text-xs font-semibold px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 rounded transition-all focus:outline-hidden ${
                              rem.enabled ? 'text-slate-900' : 'text-slate-500'
                            }`}
                          />
                          {/* Quick shortcuts chips directly under the input */}
                          <div className="flex items-center gap-1 flex-wrap mt-1 px-1">
                            <span className="text-[10px] text-slate-400 font-semibold">Atajo rápido:</span>
                            {[
                              { label: '💰 Cobrar saldo', cat: 'cobro_saldo', days: 7 },
                              { label: '👥 Confirmar invitados', cat: 'confirmar_invitados', days: 3 },
                              { label: '🎂 Catering & Torta', cat: 'proveedores_catering', days: 4 },
                              { label: '🏰 Inflable', cat: 'decoracion_candy', days: 2 },
                              { label: '🍭 Candy Bar', cat: 'decoracion_candy', days: 3 },
                              { label: '🕒 Horarios de ingreso', cat: 'aviso_cliente', days: 1 },
                              { label: '🔑 Llaves y limpieza', cat: 'otro', days: 0 },
                            ].map((sc) => (
                              <button
                                key={sc.label}
                                type="button"
                                onClick={() =>
                                  handleUpdateReminder(rem.id, {
                                    title: sc.label,
                                    category: sc.cat as ReminderCategory,
                                    daysBefore: sc.days,
                                    enabled: true,
                                  })
                                }
                                className="px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-[10px] text-slate-600 font-semibold transition-colors cursor-pointer"
                              >
                                {sc.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Tag and Expand Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {rem.enabled && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                            {rem.daysBefore === 0 ? 'Mismo día' : `${rem.daysBefore}d antes`}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleExpandReminder(rem.id)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title={rem.isExpanded ? 'Ocultar ajustes' : 'Editar detalles y anticipación'}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {remindersConfig.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReminderConfig(rem.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Quitar recordatorio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable detailed settings */}
                    {rem.isExpanded && (
                      <div className="p-3 pt-0 border-t border-slate-100 mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50/70 rounded-b-xl animate-in fade-in duration-150 text-xs">
                        {/* Days Before Input */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Días de Anticipación
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="90"
                              value={rem.daysBefore}
                              onChange={(e) =>
                                handleUpdateReminder(rem.id, {
                                  daysBefore: Math.max(0, parseInt(e.target.value) || 0),
                                })
                              }
                              className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-hidden focus:border-indigo-500"
                            />
                            <span className="text-[11px] text-slate-500 font-medium">
                              días antes
                            </span>
                          </div>
                          <span className="text-[10px] text-indigo-700 font-semibold mt-1 block">
                            📅 {targetDayName} {targetDaySpan}
                          </span>
                        </div>

                        {/* Time & Priority */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Hora de la Alerta
                          </label>
                          <input
                            type="time"
                            value={rem.time}
                            onChange={(e) => handleUpdateReminder(rem.id, { time: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Categoría
                          </label>
                          <select
                            value={rem.category}
                            onChange={(e) =>
                              handleUpdateReminder(rem.id, {
                                category: e.target.value as ReminderCategory,
                              })
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="cobro_saldo">💰 Cobro de Saldo</option>
                            <option value="decoracion_candy">🍭 Candy Bar / Decoración</option>
                            <option value="confirmar_invitados">👥 Confirmar Invitados</option>
                            <option value="proveedores_catering">🍽️ Proveedores / Catering</option>
                            <option value="aviso_cliente">📞 Contactar Cliente</option>
                            <option value="otro">📝 General / Otro</option>
                          </select>
                        </div>

                        {/* Custom notes for reminder */}
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                            Nota / Mensaje del Recordatorio (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Detalle específico a chequear o recordar..."
                            value={rem.notes || ''}
                            onChange={(e) => handleUpdateReminder(rem.id, { notes: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Actions & Add Button */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 mr-1">
                  Atajos rápidos:
                </span>
                <button
                  type="button"
                  onClick={() => handleAddCustomReminder('proveedores')}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  + 🍽️ Proveedores (5d)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddCustomReminder('llamada')}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  + 📞 Llamar Cliente (1d)
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleAddCustomReminder('custom')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Recordatorio</span>
              </button>
            </div>
          </div>

          {/* 6. General Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas Adicionales / Servicios Incluidos
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre catering, música, decoración, horarios o condiciones acordadas..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {initialEvent ? 'Guardar Cambios' : 'Registrar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

