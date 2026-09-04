import React, { useState, useEffect } from 'react';
import { EventItem, ExpenseCategory, ExpenseItem, PaymentMethod } from '../types';
import { formatCurrency, getTodayString } from '../utils/dateUtils';
import {
  X,
  TrendingDown,
  Users,
  Building,
  Zap,
  Package,
  Utensils,
  Wine,
  Wrench,
  HelpCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: ExpenseItem) => void;
  initialExpense?: ExpenseItem | null;
  events: EventItem[];
  currency: string;
}

export const EXPENSE_CATEGORIES: {
  key: ExpenseCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  badgeBg: string;
  textColor: string;
  borderColor: string;
}[] = [
  {
    key: 'pago_personal',
    label: 'Pago Personal',
    description: 'Mozos, animadores, camareras, DJ, sonido, limpieza, cocineros',
    icon: Users,
    badgeBg: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  {
    key: 'alquiler',
    label: 'Alquiler',
    description: 'Alquiler del salón, local, canon locativo, expensas',
    icon: Building,
    badgeBg: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
  },
  {
    key: 'gastos_fijos',
    label: 'Gastos Fijos',
    description: 'Luz (Edenor/Edesur), gas, agua, WiFi, seguros, impuestos/tasas',
    icon: Zap,
    badgeBg: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  {
    key: 'suministros',
    label: 'Suministros',
    description: 'Cotillón, vajilla descartable, mantelería, globos, artículos de limpieza',
    icon: Package,
    badgeBg: 'bg-cyan-50',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-200',
  },
  {
    key: 'comida',
    label: 'Comida & Catering',
    description: 'Carnes, catering, insumos gastronómicos, tortas, repostería',
    icon: Utensils,
    badgeBg: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  {
    key: 'bebida',
    label: 'Bebida & Barra',
    description: 'Gaseosas, barra libre, jugos, vinos, cervezas, hielo, licores',
    icon: Wine,
    badgeBg: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  {
    key: 'mantenimiento',
    label: 'Mantenimiento',
    description: 'Pintura, service de aires acondicionados, audio, iluminación, muebles',
    icon: Wrench,
    badgeBg: 'bg-slate-100',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
  },
  {
    key: 'otro',
    label: 'Otros Egresos',
    description: 'Imprevistos o gastos varios no clasificados',
    icon: HelpCircle,
    badgeBg: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
  },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo',
  'Tarjeta',
  'Transferencia',
  'Mercado Pago',
  'Cheque',
  'Otro',
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  initialExpense,
  events,
  currency,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('pago_personal');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [eventId, setEventId] = useState<string>('');
  const [supplier, setSupplier] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialExpense) {
      setCategory(initialExpense.category);
      setConcept(initialExpense.concept);
      setAmount(initialExpense.amount);
      setDate(initialExpense.date);
      setPaymentMethod(initialExpense.paymentMethod || 'Efectivo');
      setEventId(initialExpense.eventId || '');
      setSupplier(initialExpense.supplier || '');
      setReceiptNumber(initialExpense.receiptNumber || '');
      setNotes(initialExpense.notes || '');
    } else {
      setCategory('pago_personal');
      setConcept('');
      setAmount('');
      setDate(getTodayString());
      setPaymentMethod('Efectivo');
      setEventId('');
      setSupplier('');
      setReceiptNumber('');
      setNotes('');
    }
  }, [initialExpense, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = typeof amount === 'number' ? amount : 0;
    if (numAmount <= 0) {
      alert('Por favor ingresa un monto válido mayor a $0.');
      return;
    }
    if (!concept.trim()) {
      alert('Por favor especifica el concepto o detalle del egreso.');
      return;
    }

    const selectedEvent = events.find((ev) => ev.id === eventId);

    const expenseItem: ExpenseItem = {
      id: initialExpense?.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date,
      amount: numAmount,
      category,
      concept: concept.trim(),
      paymentMethod,
      eventId: eventId || undefined,
      eventTitle: selectedEvent ? selectedEvent.title : undefined,
      supplier: supplier.trim() || undefined,
      receiptNumber: receiptNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: initialExpense?.createdAt || new Date().toISOString(),
    };

    onSaveExpense(expenseItem);
    onClose();
  };

  const selectedCategoryMeta = EXPENSE_CATEGORIES.find((c) => c.key === category) || EXPENSE_CATEGORIES[0];
  const CategoryIcon = selectedCategoryMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {initialExpense ? 'Editar Egreso / Gasto' : 'Registrar Nuevo Egreso'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Candy Salón • Control de costos operativos y flujo de caja
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Categoría de Egreso *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-rose-600' : 'text-slate-500'}`} />
                    <span className="text-[11px] leading-tight line-clamp-1">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
              <CategoryIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{selectedCategoryMeta.description}</span>
            </p>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Monto del Egreso ({currency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                  {currency}
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="0"
                  value={amount === '' ? '' : amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-14 pr-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha del Egreso *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Concept / Detail */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Concepto / Detalle del Gasto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Pago turno 2 mozos y 1 bachero, Factura de luz Edenor, Compra vajilla..."
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden font-medium"
            />
          </div>

          {/* Payment Method & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Método de Pago Utilizado *
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden font-semibold text-slate-800"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m === 'Efectivo'
                        ? '💵 Efectivo (Caja)'
                        : m === 'Tarjeta'
                        ? '💳 Tarjeta (Débito / Crédito)'
                        : m === 'Transferencia'
                        ? '🏦 Transferencia Bancaria'
                        : m === 'Mercado Pago'
                        ? '📱 Mercado Pago'
                        : m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Proveedor / Destinatario / Empleado
              </label>
              <input
                type="text"
                placeholder="Ej. Distribuidora Quilmes, Mozo Juan, Edenor..."
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Event Association (Optional) & Receipt / Invoice # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vincular a Evento (Opcional)
              </label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden font-medium text-slate-700"
              >
                <option value="">-- Gasto General del Salón --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.eventDate} • {ev.title} ({ev.clientName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                N° de Factura / Ticket / Comprobante
              </label>
              <input
                type="text"
                placeholder="Ej. Factura A #003-884, Tkt 9481..."
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas Adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Observaciones sobre el pago, número de presupuesto, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-hidden font-medium"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialExpense ? 'Guardar Cambios' : 'Registrar Egreso'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
