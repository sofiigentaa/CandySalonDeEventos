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
  Copy,
  Check,
  FileSignature,
  Send,
  Sparkles,
  RefreshCw,
  Edit3,
  Eye,
  AlertCircle,
  ShieldCheck,
  Download,
} from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  currency: string;
}

type FocusTone = 'standard' | 'strict_rules' | 'kids_party' | 'teens_adults';

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  event,
  currency,
}) => {
  const [contractText, setContractText] = useState<string>('');
  const [isEditingMode, setIsEditingMode] = useState<boolean>(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [focusTone, setFocusTone] = useState<FocusTone>('standard');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [showAiControls, setShowAiControls] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastGeneratedWithAi, setLastGeneratedWithAi] = useState<boolean>(false);

  // Initialize with smart template on load or event change
  useEffect(() => {
    if (!isOpen || !event) return;
    const baseContract = generateSmartContractFallback(event, 'standard', '', currency);
    setContractText(baseContract);
    setIsEditingMode(true);
    setLastGeneratedWithAi(false);
    setAiError(null);
  }, [event?.id, currency, isOpen]);

  if (!isOpen || !event) return null;

  // Handle AI generation via Gemini
  const handleGenerateWithAi = async () => {
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/ai/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          focusTone,
          customInstructions: customInstructions.trim(),
          currency,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status})`);
      }

      const data = await response.json();
      if (data.contractText) {
        setContractText(data.contractText);
        setLastGeneratedWithAi(true);
        setShowAiControls(false);
        setIsEditingMode(true);
      } else {
        throw new Error('No se recibió texto de contrato válido');
      }
    } catch (err: any) {
      console.error('Error generando contrato:', err);
      setAiError(
        'Hubo una demora con el servicio de IA. Se cargó una versión inteligente predeterminada para que puedas editarla.'
      );
      // Fallback local
      const fallback = generateSmartContractFallback(event, focusTone, customInstructions, currency);
      setContractText(fallback);
      setLastGeneratedWithAi(true);
    } finally {
      setIsGeneratingAi(false);
    }
  };

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

  // Copy full contract text
  const handleCopy = () => {
    navigator.clipboard.writeText(contractText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
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
            {/* Toggle AI Controls Button */}
            <button
              type="button"
              onClick={() => setShowAiControls(!showAiControls)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showAiControls ? 'Ocultar IA' : 'Escribir con IA'}</span>
            </button>

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

        {/* AI Assistant Generator Panel (Collapsible) */}
        {showAiControls && (
          <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 border-b border-slate-700 animate-in slide-in-from-top-2 duration-150 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Redacción Asistida con Inteligencia Artificial (Gemini)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Redacta un contrato legal personalizado en segundos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Enfoque o tipo de festejo:
                </label>
                <select
                  value={focusTone}
                  onChange={(e) => setFocusTone(e.target.value as FocusTone)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-hidden focus:ring-2 focus:ring-pink-500"
                >
                  <option value="standard">Estándar (Equilibrado y protector)</option>
                  <option value="strict_rules">Énfasis estricto (Horarios, roturas y seña)</option>
                  <option value="kids_party">Cumpleaños Infantil (Pelotero e inflables)</option>
                  <option value="teens_adults">Festejo de Adultos / Teens (Música y bebidas)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Instrucciones o cláusulas adicionales (opcional):
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ej: Permite ingresar 1 hora antes / Trae su propio animador"
                  className="w-full text-xs bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2 outline-hidden focus:ring-2 focus:ring-pink-500 placeholder:text-slate-500"
                />
              </div>
            </div>

            {aiError && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/20 text-amber-200 border border-amber-500/40 rounded-xl text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={handleGenerateWithAi}
                className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Redactando contrato con IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generar Contrato con IA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

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

          {/* Green AI Banner when generated with AI */}
          {lastGeneratedWithAi && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-950 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900">
                    Redactado con Inteligencia Artificial (Gemini)
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    El texto generado está resaltado en verde. Puedes personalizarlo, copiarlo o enviarlo directamente.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-extrabold shrink-0">
                ✓ Redacción IA
              </span>
            </div>
          )}

          {isEditingMode ? (
            /* Direct Textarea Editor */
            <div className="relative flex-1 flex flex-col min-h-[360px]">
              {lastGeneratedWithAi && (
                <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-800 text-[11px] font-bold backdrop-blur-xs shadow-2xs pointer-events-none">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Texto Generado por IA</span>
                </div>
              )}
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="El texto del contrato se cargará aquí..."
                className={`w-full flex-1 min-h-[380px] p-4 rounded-2xl text-xs font-mono leading-relaxed outline-hidden shadow-xs resize-y transition-all ${
                  lastGeneratedWithAi
                    ? 'bg-emerald-50/25 border-2 border-emerald-500 text-emerald-950 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/20'
                    : 'bg-white border-2 border-pink-200/90 text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-400/20'
                }`}
              />
            </div>
          ) : (
            /* Document Preview */
            <div
              className={`p-6 sm:p-8 rounded-2xl max-w-2xl mx-auto w-full text-xs font-mono leading-relaxed whitespace-pre-wrap transition-all ${
                lastGeneratedWithAi
                  ? 'bg-emerald-50/15 border-2 border-emerald-400 text-emerald-950 shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-900 shadow-xs'
              }`}
            >
              {lastGeneratedWithAi && (
                <div className="mb-4 pb-3 border-b border-emerald-200 flex items-center justify-between text-[11px] text-emerald-800 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Contrato redactado mediante Inteligencia Artificial</span>
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                    Gemini AI
                  </span>
                </div>
              )}
              {contractText}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">¡Contrato Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copiar Contrato</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              title="Descargar archivo de texto"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
