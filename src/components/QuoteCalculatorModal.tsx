import React, { useState } from 'react';
import { formatCurrency } from '../utils/dateUtils.ts';
import {
  X,
  Calculator,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Users,
  PlusCircle,
  MessageCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface QuoteCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onApplyQuoteToNewEvent?: (quoteData: {
    title: string;
    totalAmount: number;
    notes: string;
    guestCount: number;
    depositAmount: number;
  }) => void;
}

interface AdditionalItem {
  id: string;
  name: string;
  price: number;
  selected: boolean;
  icon: string;
}

export const QuoteCalculatorModal: React.FC<QuoteCalculatorModalProps> = ({
  isOpen,
  onClose,
  currency,
  onApplyQuoteToNewEvent,
}) => {
  // Day type presets
  const [dayType, setDayType] = useState<'weekday' | 'friday' | 'weekend'>('weekend');
  const [basePrices, setBasePrices] = useState({
    weekday: 130000,
    friday: 160000,
    weekend: 195000,
  });

  const [eventType, setEventType] = useState<string>('Cumpleaños Infantil');
  const [duration, setDuration] = useState<string>('3 Horas');
  const [guestCountKids, setGuestCountKids] = useState<number>(25);
  const [guestCountAdults, setGuestCountAdults] = useState<number>(15);

  const [additionals, setAdditionals] = useState<AdditionalItem[]>([
    { id: 'inflable', name: 'Inflable Gigante / Castillo', price: 25000, selected: false, icon: '🏰' },
    { id: 'candybar', name: 'Decoración Temática & Candy Bar', price: 35000, selected: false, icon: '🎈' },
    { id: 'glitter', name: 'Puesto de Glitter Bar & Tatuajes', price: 20000, selected: false, icon: '✨' },
    { id: 'pochoclos', name: 'Pochoclera Libre (Popcorn)', price: 18000, selected: false, icon: '🍿' },
    { id: 'menu_chicos', name: 'Menú Infantil Completo (snacks y panchos)', price: 40000, selected: false, icon: '🍔' },
    { id: 'cafeteria', name: 'Servicio de Café & Mate Libre Adultos', price: 15000, selected: false, icon: '☕' },
    { id: 'hora_extra', name: 'Hora adicional de fiesta', price: 30000, selected: false, icon: '⏰' },
  ]);

  const [depositPercent, setDepositPercent] = useState<number>(30); // 30% o 50%
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Calculate totals
  const currentBasePrice = basePrices[dayType];
  const additionalsTotal = additionals
    .filter((a) => a.selected)
    .reduce((sum, item) => sum + item.price, 0);

  const grandTotal = currentBasePrice + additionalsTotal;
  const suggestedDeposit = Math.round((grandTotal * (depositPercent / 100)) / 1000) * 1000;

  const toggleAdditional = (id: string) => {
    setAdditionals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  };

  const updateAdditionalPrice = (id: string, newPrice: number) => {
    setAdditionals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, price: Math.max(0, newPrice) } : a))
    );
  };

  // Day label helper
  const getDayLabel = () => {
    switch (dayType) {
      case 'weekday':
        return 'Lunes a Jueves';
      case 'friday':
        return 'Viernes';
      case 'weekend':
        return 'Sábados, Domingos y Feriados';
    }
  };

  // Build WhatsApp text
  const selectedAdditionalsList = additionals.filter((a) => a.selected);
  const whatsappQuoteText =
    `🍭 *PRESUPUESTO CANDY SALÓN DE EVENTOS*\n` +
    `¡Hola! Muchas gracias por consultarnos para tu festejo. Te compartimos la cotización personalizada:\n\n` +
    `🎉 *Tipo de Evento:* ${eventType}\n` +
    `📅 *Turno / Días:* ${getDayLabel()} (${duration})\n` +
    `👥 *Capacidad sugerida:* Hasta ${guestCountKids} niños y ${guestCountAdults} adultos\n` +
    `----------------------------------------\n` +
    `🏰 *Alquiler Base del Salón:* ${formatCurrency(currentBasePrice, currency)}\n` +
    `_Incluye: Exclusividad del salón, coordinación del evento, música, pelotero, vajilla completa para adultos y niños, limpieza final e invitaciones digitales._\n\n` +
    (selectedAdditionalsList.length > 0
      ? `✨ *Servicios Adicionales Seleccionados:*\n` +
        selectedAdditionalsList
          .map((a) => `• ${a.icon} ${a.name}: ${formatCurrency(a.price, currency)}`)
          .join('\n') +
        `\n----------------------------------------\n`
      : '') +
    `💰 *TOTAL DEL PRESUPUESTO: ${formatCurrency(grandTotal, currency)}*\n` +
    `🔒 *Seña para congelar fecha (${depositPercent}%): ${formatCurrency(suggestedDeposit, currency)}*\n` +
    `----------------------------------------\n` +
    `📌 *Información importante:*\n` +
    `• Las fechas se reservan únicamente con el pago de la seña.\n` +
    `• Presupuesto válido por 7 días a partir de la fecha de envío.\n` +
    `• El saldo restante se cancela antes de ingresar al evento.\n\n` +
    `¡Esperamos poder acompañarlos en este día tan especial! Consultanos fechas disponibles para agendar. 🎈✨`;

  const handleCopyQuote = () => {
    navigator.clipboard.writeText(whatsappQuoteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApplyToEvent = () => {
    if (!onApplyQuoteToNewEvent) return;
    const notes = [
      `Presupuesto: ${getDayLabel()} (${duration})`,
      `Chicos: ${guestCountKids} | Adultos: ${guestCountAdults}`,
      selectedAdditionalsList.length > 0
        ? `Adicionales: ${selectedAdditionalsList.map((a) => a.name).join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join(' • ');

    onApplyQuoteToNewEvent({
      title: `${eventType} (Cotizado)`,
      totalAmount: grandTotal,
      notes,
      guestCount: guestCountKids + guestCountAdults,
      depositAmount: suggestedDeposit,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <Calculator className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Cotizador Rápido de Presupuestos</h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Calcula y envía propuestas de WhatsApp en 5 segundos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Day & Turn Presets */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 uppercase text-[11px] tracking-wider block">
              1. Selecciona el Día del Evento:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDayType('weekday')}
                className={`p-2.5 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                  dayType === 'weekday'
                    ? 'bg-pink-50 border-pink-400 text-pink-900 ring-2 ring-pink-500/30 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-[11px]">Lunes a Jueves</div>
                <div className="text-xs font-black text-pink-700 mt-0.5">
                  {formatCurrency(basePrices.weekday, currency)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDayType('friday')}
                className={`p-2.5 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                  dayType === 'friday'
                    ? 'bg-pink-50 border-pink-400 text-pink-900 ring-2 ring-pink-500/30 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-[11px]">Viernes</div>
                <div className="text-xs font-black text-pink-700 mt-0.5">
                  {formatCurrency(basePrices.friday, currency)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDayType('weekend')}
                className={`p-2.5 rounded-xl border font-semibold text-center transition-all cursor-pointer ${
                  dayType === 'weekend'
                    ? 'bg-pink-50 border-pink-400 text-pink-900 ring-2 ring-pink-500/30 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-[11px]">Sáb / Dom / Feriado</div>
                <div className="text-xs font-black text-pink-700 mt-0.5">
                  {formatCurrency(basePrices.weekend, currency)}
                </div>
              </button>
            </div>
          </div>

          {/* Quick Details: Event Type & Guests */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Tipo de Festejo
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 text-xs"
              >
                <option value="Cumpleaños Infantil">Cumpleaños Infantil</option>
                <option value="Bautismo">Bautismo</option>
                <option value="Baby Shower">Baby Shower</option>
                <option value="Comunión">Comunión</option>
                <option value="Festejo Adultos">Festejo Adultos</option>
                <option value="Otro Evento">Otro Evento</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Duración del Turno
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 text-xs"
              >
                <option value="2.5 Horas">2.5 Horas</option>
                <option value="3 Horas">3 Horas (Estándar)</option>
                <option value="4 Horas">4 Horas (Extendido)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Invitados estimados
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="150"
                  value={guestCountKids}
                  onChange={(e) => setGuestCountKids(Number(e.target.value) || 0)}
                  title="Niños"
                  className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-xs"
                />
                <span className="text-slate-400 font-bold">/</span>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={guestCountAdults}
                  onChange={(e) => setGuestCountAdults(Number(e.target.value) || 0)}
                  title="Adultos"
                  className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-xs"
                />
              </div>
              <div className="text-[9px] text-slate-400 text-center mt-0.5">Niños / Adultos</div>
            </div>
          </div>

          {/* Additionals Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                2. Servicios Adicionales:
              </label>
              <span className="text-[11px] font-bold text-pink-700">
                Total Adicionales: {formatCurrency(additionalsTotal, currency)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {additionals.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleAdditional(item.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    item.selected
                      ? 'bg-pink-50/70 border-pink-300 ring-1 ring-pink-400/40'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className={`text-xs truncate ${item.selected ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-xs text-slate-800">
                      {formatCurrency(item.price, currency)}
                    </span>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => {}} // handled by parent div
                      className="w-4 h-4 text-pink-600 rounded border-slate-300 focus:ring-pink-500 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Total & Deposit Proposal */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Total Presupuestado
                </span>
                <span className="text-2xl font-black text-white">
                  {formatCurrency(grandTotal, currency)}
                </span>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 justify-end mb-0.5">
                  <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">
                    Seña sugerida
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDepositPercent((prev) => (prev === 30 ? 50 : 30));
                    }}
                    className="text-[9px] px-1.5 py-0.2 bg-white/10 hover:bg-white/20 rounded font-bold text-slate-200 cursor-pointer"
                    title="Alternar entre 30% y 50%"
                  >
                    {depositPercent}% (cambiar)
                  </button>
                </div>
                <span className="text-lg font-black text-emerald-400">
                  {formatCurrency(suggestedDeposit, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyQuote}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Presupuesto Copiado para WhatsApp!</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                <span>Copiar Presupuesto para WhatsApp</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {onApplyQuoteToNewEvent && (
              <button
                type="button"
                onClick={handleApplyToEvent}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <span>Agendar con este Presupuesto</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
