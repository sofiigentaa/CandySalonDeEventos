import React, { useState, useEffect } from 'react';
import { EventItem } from '../types.ts';
import {
  getDayOfWeekName,
  formatFullDateSpanish,
  formatCurrency,
  getTotalPaid,
  getRemainingBalance,
  getDaysRemaining,
} from '../utils/dateUtils.ts';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  Clock,
  Coins,
  HeartHandshake,
  AlertTriangle,
  FileCheck2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  currency: string;
}

type TemplateType = 'balance' | 'confirmation' | 'reminder_48h' | 'thanks';

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  event,
  currency,
}) => {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>(
    event && getRemainingBalance(event) > 0 ? 'balance' : 'confirmation'
  );
  const [customNotes, setCustomNotes] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [isCustomEdited, setIsCustomEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  const dayOfWeek = event ? getDayOfWeekName(event.eventDate) : '';
  const fullDate = event ? formatFullDateSpanish(event.eventDate) : '';
  const countdown = event ? getDaysRemaining(event.eventDate) : { days: 0, label: '' };
  const totalPaid = event ? getTotalPaid(event) : 0;
  const remaining = event ? getRemainingBalance(event) : 0;
  const isPaid = remaining === 0;

  // Generate templates based on event state
  const buildTemplateText = (type: TemplateType, note: string): string => {
    if (!event) return '';
    switch (type) {
      case 'balance':
        return (
          `🍭 *CANDY SALÓN DE EVENTOS*\n` +
          `¡Hola ${event.clientName}! Te saludamos del equipo de Candy Salón.\n\n` +
          `Te escribimos para recordarte los detalles de tu evento *"${event.title}"*:\n` +
          `📅 *Fecha:* ${dayOfWeek.toUpperCase()} ${fullDate}\n` +
          `${event.eventTime ? `⏰ *Horario:* ${event.eventTime} hs\n` : ''}` +
          `----------------------------------------\n` +
          `💰 *Total del evento:* ${formatCurrency(event.totalAmount, currency)}\n` +
          `✅ *Abonado a la fecha:* ${formatCurrency(totalPaid, currency)}\n` +
          `⏳ *Saldo pendiente por abonar:* ${formatCurrency(remaining, currency)}\n` +
          `----------------------------------------\n` +
          `📌 *Recordatorio:* Te recordamos que el saldo restante debe quedar cancelado con anterioridad o al momento de ingresar al salón.\n\n` +
          (note ? `📝 *Nota:* ${note}\n\n` : '') +
          `Si necesitas coordinar el pago por transferencia o en efectivo, avísanos por este medio. ¡Muchas gracias! ✨`
        );

      case 'confirmation':
        return (
          `🍭 *CANDY SALÓN DE EVENTOS*\n` +
          `¡Hola ${event.clientName}! ¡Muchas felicidades! 🎉\n\n` +
          `Confirmamos la reserva formal de tu evento *"${event.title}"*:\n` +
          `📅 *Día:* ${dayOfWeek.toUpperCase()} ${fullDate}\n` +
          `${event.eventTime ? `⏰ *Horario:* ${event.eventTime} hs\n` : ''}` +
          `📍 *Lugar:* ${event.location || 'Candy Salón de Eventos'}\n` +
          `----------------------------------------\n` +
          `💰 *Presupuesto acordado:* ${formatCurrency(event.totalAmount, currency)}\n` +
          `✅ *Seña recibida:* ${formatCurrency(totalPaid, currency)}\n` +
          `⏳ *Saldo restante:* ${isPaid ? '$ 0 (Totalmente cancelado)' : formatCurrency(remaining, currency)}\n` +
          `----------------------------------------\n` +
          `Tu fecha se encuentra *100% asegurada y agendada* en nuestro calendario.\n\n` +
          (note ? `📝 *Nota:* ${note}\n\n` : '') +
          `¡Nos alegra un montón acompañarlos en esta hermosa celebración! Ante cualquier consulta, estamos a tu disposición. 🎈`
        );

      case 'reminder_48h':
        return (
          `🍭 *CANDY SALÓN DE EVENTOS*\n` +
          `¡Hola ${event.clientName}! ¡Falta muy poquito para el festejo de *"${event.title}"*! 🥳\n\n` +
          `📅 *Fecha:* ${dayOfWeek.toUpperCase()} ${fullDate}\n` +
          `${event.eventTime ? `⏰ *Inicio del evento:* ${event.eventTime} hs\n` : ''}` +
          `⏳ *Cuenta regresiva:* ${countdown.label}\n` +
          `----------------------------------------\n` +
          `🎈 *Información importante para el día del evento:*\n` +
          `• Puedes ingresar 30 minutos antes para ambientación, torta o detalles personales.\n` +
          `${!isPaid ? `• Recuerda que el saldo pendiente es de *${formatCurrency(remaining, currency)}*.\n` : '• Tu evento está 100% al día en pagos.\n'}` +
          `• Por favor confírmanos si tienes adicionales de último momento o requerimientos especiales.\n\n` +
          (note ? `📝 *Nota:* ${note}\n\n` : '') +
          `¡Estamos preparando todo con mucho cariño para que sea un día inolvidable! 🧁✨`
        );

      case 'thanks':
        return (
          `🍭 *CANDY SALÓN DE EVENTOS*\n` +
          `¡Hola ${event.clientName}! ❤️\n\n` +
          `Queríamos agradecerte de corazón por haber elegido a Candy Salón para celebrar el evento *"${event.title}"*.\n\n` +
          `Esperamos que tanto ustedes como sus invitados hayan disfrutado de una jornada mágica y divertida. Fue un placer enorme recibirlos.\n\n` +
          `¡Los esperamos siempre con los brazos abiertos para futuros festejos! 🎂🎈✨`
        );
    }
  };

  // Sync initial message whenever template changes or note changes (if not manually overridden)
  useEffect(() => {
    if (!isOpen || !event) return;
    setMessageText(buildTemplateText(activeTemplate, customNotes));
    setIsCustomEdited(false);
  }, [activeTemplate, event?.id, isOpen]);

  if (!isOpen || !event) return null;

  const handleApplyNote = (newNote: string) => {
    setCustomNotes(newNote);
    setMessageText(buildTemplateText(activeTemplate, newNote));
    setIsCustomEdited(false);
  };

  const handleResetToTemplate = () => {
    setMessageText(buildTemplateText(activeTemplate, customNotes));
    setIsCustomEdited(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    setIsCustomEdited(true);
  };

  const handleSendWhatsApp = () => {
    const textToSend = messageText.trim();
    if (!textToSend) return;

    if (event.clientPhone) {
      const cleanPhone = event.clientPhone.replace(/[^0-9]/g, '');
      const encoded = encodeURIComponent(textToSend);
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    } else {
      const encoded = encodeURIComponent(textToSend);
      window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Mensaje de WhatsApp (Editable)</h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                {event.clientName} • {event.title} {event.clientPhone ? `(${event.clientPhone})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
              Plantilla base:
            </span>
            {isCustomEdited && (
              <button
                type="button"
                onClick={handleResetToTemplate}
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer a plantilla</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setActiveTemplate('balance')}
              className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                activeTemplate === 'balance'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs ring-2 ring-amber-400/40'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Coins className="w-4 h-4 mb-1 text-amber-600" />
              <span className="font-bold">Cobro de Saldo</span>
              <span className="text-[10px] text-slate-500">Recordatorio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTemplate('confirmation')}
              className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                activeTemplate === 'confirmation'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs ring-2 ring-emerald-400/40'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-4 h-4 mb-1 text-emerald-600" />
              <span className="font-bold">Seña Confirmada</span>
              <span className="text-[10px] text-slate-500">Reserva formal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTemplate('reminder_48h')}
              className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                activeTemplate === 'reminder_48h'
                  ? 'bg-pink-50 border-pink-300 text-pink-900 shadow-xs ring-2 ring-pink-400/40'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4 mb-1 text-pink-600" />
              <span className="font-bold">Aviso 48hs</span>
              <span className="text-[10px] text-slate-500">Últimos detalles</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTemplate('thanks')}
              className={`flex flex-col items-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                activeTemplate === 'thanks'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs ring-2 ring-indigo-400/40'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <HeartHandshake className="w-4 h-4 mb-1 text-indigo-600" />
              <span className="font-bold">Agradecimiento</span>
              <span className="text-[10px] text-slate-500">Post evento</span>
            </button>
          </div>
        </div>

        {/* Message Editor & Custom Note */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Edita el mensaje directamente antes de enviarlo:</span>
                {isCustomEdited && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    ✏️ Modificado
                  </span>
                )}
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {messageText.length} caracteres
              </span>
            </div>

            <div className="relative">
              <textarea
                value={messageText}
                onChange={handleTextChange}
                rows={9}
                placeholder="Escribe o modifica el mensaje aquí..."
                className="w-full text-xs text-slate-800 bg-emerald-50/30 border-2 border-emerald-200 hover:border-emerald-300 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-400/20 rounded-xl p-3.5 leading-relaxed font-sans outline-hidden shadow-2xs transition-all resize-y"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              💡 Puedes cambiar cualquier palabra, agregar emojis, alias o condiciones particulares antes de enviar.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">
              Insertar nota o dato bancario rápido (opcional):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Ej: Alias: candy.salon.mp / Recordar traer velas"
                className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden bg-slate-50"
              />
              <button
                type="button"
                onClick={() => handleApplyNote(customNotes)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0"
              >
                Aplicar al texto
              </button>
            </div>
          </div>

          {!event.clientPhone && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Este evento no tiene teléfono registrado. Puedes copiar el mensaje y pegarlo en cualquier chat de WhatsApp.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">¡Texto Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Copiar Mensaje</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
