import React, { useState, useEffect } from 'react';
import { EventItem } from '../types.ts';
import {
  getDayOfWeekName,
  formatFullDateSpanish,
  formatCurrency,
  getTotalPaid,
  getRemainingBalance,
} from '../utils/dateUtils.ts';
import { generateSmartContractFallback } from '../utils/contractTemplate.ts';
import {
  X,
  FileSignature,
  Send,
  Edit3,
  Eye,
  ShieldCheck,
  Download,
} from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  currency: string;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  event,
  currency,
}) => {
  const [contractText, setContractText] = useState<string>('');
  const [isEditingMode, setIsEditingMode] = useState<boolean>(true);

  // Initialize with smart template on load or event change
  useEffect(() => {
    if (!isOpen || !event) return;
    const baseContract = generateSmartContractFallback(event, 'standard', '', currency);
    setContractText(baseContract);
    setIsEditingMode(true);
  }, [event?.id, currency, isOpen]);

  if (!isOpen || !event) return null;

  // Send Contract via WhatsApp
  const handleSendWhatsApp = () => {
    const textToSend = contractText.trim();
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

  // Download plain text contract
  const handleDownloadTxt = () => {
    const blob = new Blob([contractText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contrato_${event.clientName.replace(/\s+/g, '_')}_CandySalon.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <FileSignature className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold">Contrato de Alquiler & Términos</h2>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {event.clientName} • {event.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Edit / Preview */}
            <div className="hidden sm:flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setIsEditingMode(true)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  isEditingMode ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingMode(false)}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  !isEditingMode ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Vista Previa</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contract Content: Editor or Preview */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-slate-100 flex flex-col">
          {/* Action notification and edit hints */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-pink-600" />
              <span>Contrato editable: puedes modificar cualquier texto o cláusula</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                {contractText.length} caracteres
              </span>
              <button
                type="button"
                onClick={() => setIsEditingMode(!isEditingMode)}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 underline cursor-pointer sm:hidden"
              >
                {isEditingMode ? 'Ver formato' : 'Editar texto'}
              </button>
            </div>
          </div>

          {isEditingMode ? (
            /* Direct Textarea Editor */
            <div className="relative flex-1 flex flex-col min-h-[360px]">
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="El texto del contrato se cargará aquí..."
                className="w-full flex-1 min-h-[380px] p-4 rounded-2xl text-xs font-mono leading-relaxed outline-hidden shadow-xs resize-y transition-all bg-white border-2 border-pink-200/90 text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-400/20"
              />
            </div>
          ) : (
            /* Document Preview */
            <div className="p-6 sm:p-8 rounded-2xl max-w-2xl mx-auto w-full text-xs font-mono leading-relaxed whitespace-pre-wrap transition-all bg-white border border-slate-200 text-slate-900 shadow-xs">
              {contractText}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTxt}
              title="Descargar archivo de texto"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Guardar .txt</span>
            </button>
          </div>

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
