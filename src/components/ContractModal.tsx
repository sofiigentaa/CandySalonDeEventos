import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Bot,
  Loader2,
  PlusCircle,
  User,
} from 'lucide-react';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventItem | null;
  currency: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  clause?: string | null;
}

const ASSISTANT_WELCOME_MESSAGE =
  'Contame qué querés agregar, aclarar o cambiar en el contrato (por ejemplo: una regla especial, una política de cancelación, un límite de horario) y te voy guiando para armar la cláusula.';

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  event,
  currency,
}) => {
  const [contractText, setContractText] = useState<string>('');
  const [mode, setMode] = useState<'edit' | 'preview' | 'assistant'>('edit');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with smart template on load or event change
  useEffect(() => {
    if (!isOpen || !event) return;
    const baseContract = generateSmartContractFallback(event, 'standard', '', currency);
    setContractText(baseContract);
    setMode('edit');
    setChatMessages([]);
    setChatInput('');
    setChatError(null);
  }, [event?.id, currency, isOpen]);

  useEffect(() => {
    if (mode === 'assistant' && chatMessages.length === 0) {
      setChatMessages([{ id: 'welcome', role: 'assistant', text: ASSISTANT_WELCOME_MESSAGE }]);
    }
  }, [mode, chatMessages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  if (!isOpen || !event) return null;

  const handleSendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    const historyForRequest = chatMessages
      .filter((m) => m.id !== 'welcome' || chatMessages.length > 1)
      .map((m) => ({ role: m.role, text: m.text }));

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatError(null);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/contract-assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          currency,
          contractText,
          history: historyForRequest,
          message: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conectar con el asistente');

      setChatMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', text: data.reply, clause: data.clause || null },
      ]);
    } catch (err: any) {
      setChatError(err.message || 'No se pudo contactar al asistente de IA.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleInsertClause = (clause: string) => {
    setContractText((prev) => `${prev.trim()}\n\n${clause.trim()}`);
    setMode('edit');
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
            {/* Toggle Edit / Preview / Asistente IA */}
            <div className="hidden sm:flex bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'edit' ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'preview' ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Vista Previa</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('assistant')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'assistant' ? 'bg-pink-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Asistente IA</span>
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

        {/* Contract Content: Editor, Preview or AI Assistant */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-slate-100 flex flex-col">
          {/* Action notification and mode hints */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
            {mode === 'assistant' ? (
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <span>Asistente IA: contale qué cláusula querés armar y te va guiando</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-pink-600" />
                <span>Contrato editable: puedes modificar cualquier texto o cláusula</span>
              </span>
            )}

            <div className="flex items-center gap-2">
              {mode !== 'assistant' && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {contractText.length} caracteres
                </span>
              )}
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'edit' | 'preview' | 'assistant')}
                className="sm:hidden text-xs font-bold text-pink-600 bg-white border border-pink-200 rounded-lg px-1.5 py-1 cursor-pointer"
              >
                <option value="edit">Editar</option>
                <option value="preview">Vista Previa</option>
                <option value="assistant">Asistente IA</option>
              </select>
            </div>
          </div>

          {mode === 'edit' && (
            /* Direct Textarea Editor */
            <div className="relative flex-1 flex flex-col min-h-[360px]">
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder="El texto del contrato se cargará aquí..."
                className="w-full flex-1 min-h-[380px] p-4 rounded-2xl text-xs font-mono leading-relaxed outline-hidden shadow-xs resize-y transition-all bg-white border-2 border-pink-200/90 text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-400/20"
              />
            </div>
          )}

          {mode === 'preview' && (
            /* Document Preview */
            <div className="p-6 sm:p-8 rounded-2xl max-w-2xl mx-auto w-full text-xs font-mono leading-relaxed whitespace-pre-wrap transition-all bg-white border border-slate-200 text-slate-900 shadow-xs">
              {contractText}
            </div>
          )}

          {mode === 'assistant' && (
            /* AI Assistant Chat */
            <div className="flex-1 flex flex-col min-h-[360px] bg-white rounded-2xl border-2 border-pink-200/90 shadow-xs overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${
                        msg.role === 'user'
                          ? 'bg-slate-800 text-white'
                          : 'bg-pink-100 text-pink-600 border border-pink-200'
                      }`}
                    >
                      {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`max-w-[80%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-slate-800 text-white rounded-tr-sm'
                            : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      {msg.clause && (
                        <div className="w-full p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                            Cláusula propuesta
                          </p>
                          <p className="text-xs text-emerald-950 whitespace-pre-wrap leading-relaxed mb-2">
                            {msg.clause}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleInsertClause(msg.clause as string)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Insertar en el contrato</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-pink-100 text-pink-600 border border-pink-200">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-slate-100 text-xs flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Pensando la cláusula...</span>
                    </div>
                  </div>
                )}

                {chatError && (
                  <p className="text-[11px] text-red-600 font-medium px-1">{chatError}</p>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-slate-200 p-3 flex items-center gap-2 shrink-0 bg-slate-50">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  placeholder="Ej: quiero que se aclare que no se permiten mascotas..."
                  className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleSendChatMessage}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
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
