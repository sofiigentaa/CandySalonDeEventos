import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  FileDown,
  FileText,
  FileSpreadsheet,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  Database,
  Calendar,
  DollarSign,
  Bell,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { EventItem, ExpenseItem, ReminderItem } from '../types.ts';
import {
  exportFullJsonBackup,
  exportPlainTextContingencyReport,
  exportEventsCSV,
  BackupPayload,
} from '../utils/backupUtils.ts';
import { getRemainingBalance } from '../utils/dateUtils.ts';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  expenses: ExpenseItem[];
  reminders: ReminderItem[];
  onRestoreBackup: (payload: BackupPayload) => Promise<void> | void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  events,
  expenses,
  reminders,
  onRestoreBackup,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const totalContracted = events.reduce((acc, evt) => acc + (Number(evt.totalAmount) || 0), 0);
  const totalCollected = events.reduce((acc, evt) => {
    const fromDeposit = Number(evt.depositAmount) || 0;
    const fromHistory = (evt.paymentHistory || []).reduce((pAcc, p) => pAcc + (Number(p.amount) || 0), 0);
    return acc + Math.max(fromDeposit, fromHistory);
  }, 0);
  const totalPending = events.reduce((acc, evt) => acc + getRemainingBalance(evt), 0);

  const handleExportJson = () => {
    exportFullJsonBackup(events, expenses, reminders);
    setDownloadSuccess('¡Respaldo plano completo descargado exitosamente (.JSON)!');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleExportTxt = () => {
    exportPlainTextContingencyReport(events, expenses, reminders);
    setDownloadSuccess('¡Reporte plano de contingencia descargado (.TXT legible)!');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleExportCsv = () => {
    exportEventsCSV(events);
    setDownloadSuccess('¡Planilla de eventos descargada (.CSV para Excel)!');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreSuccess(null);
    setIsRestoring(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as BackupPayload;

        if (!parsed || (!Array.isArray(parsed.events) && !Array.isArray((parsed as any).data))) {
          throw new Error('El archivo no tiene el formato de respaldo válido de Candy Salón.');
        }

        const eventsToRestore = parsed.events || (parsed as any).data || [];
        const expensesToRestore = parsed.expenses || [];
        const remindersToRestore = parsed.reminders || [];

        const confirmed = window.confirm(
          `¿Estás seguro de restaurar este respaldo?\n\n` +
          `• Eventos encontrados: ${eventsToRestore.length}\n` +
          `• Gastos encontrados: ${expensesToRestore.length}\n` +
          `• Recordatorios: ${remindersToRestore.length}\n\n` +
          `Esto actualizará los datos del sistema.`
        );

        if (!confirmed) {
          setIsRestoring(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        await onRestoreBackup({
          ...parsed,
          events: eventsToRestore,
          expenses: expensesToRestore,
          reminders: remindersToRestore,
        });

        setRestoreSuccess(
          `¡Respaldo restaurado con éxito! Se cargaron ${eventsToRestore.length} eventos y ${expensesToRestore.length} gastos.`
        );
      } catch (err: any) {
        console.error('Error al procesar archivo de respaldo:', err);
        setRestoreError(err.message || 'Error al leer el archivo JSON.');
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setRestoreError('Error al leer el archivo desde tu dispositivo.');
      setIsRestoring(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header con gradiente de seguridad y protección */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Respaldo en Archivo Plano & Contingencia
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-full">
                  OFFLINE READY
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Descarga una copia de seguridad en tu computadora para operar sin conexión o recuperar datos ante cualquier emergencia.
              </p>
            </div>
          </div>
        </div>

        {/* Resumen del Estado de la Base de Datos */}
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-pink-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Eventos</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900">{events.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Fiestas agendadas</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cobrado</span>
              </div>
              <p className="text-xl font-extrabold text-emerald-700">
                ${Math.round(totalCollected / 1000)}k
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Recaudación real</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-indigo-600 mb-1">
                <Database className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gastos</span>
              </div>
              <p className="text-xl font-extrabold text-slate-900">{expenses.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Egresos registrados</p>
            </div>
          </div>

          {/* Notificaciones de éxito / error */}
          {downloadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {restoreSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{restoreSuccess}</span>
            </div>
          )}

          {restoreError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{restoreError}</span>
            </div>
          )}

          {/* Opciones de Descarga / Exportación Plana */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-indigo-600" />
              <span>1. Descargar Respaldo en Archivo Plano</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opción 1: JSON Completo */}
              <button
                id="btn-backup-export-json"
                type="button"
                onClick={handleExportJson}
                className="group flex flex-col items-start p-4 rounded-2xl border-2 border-indigo-200/70 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50/90 transition-all text-left cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="p-2 bg-indigo-600 text-white rounded-xl mb-3 shadow-xs group-hover:scale-105 transition-transform">
                  <Database className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-indigo-950 mb-1">
                  Respaldo Completo (.JSON)
                </div>
                <p className="text-[11px] text-indigo-700/80 leading-relaxed">
                  Copia íntegra con eventos, pagos, señas, gastos y recordatorios. Permite restauración total.
                </p>
                <span className="mt-3 text-[11px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Descargar JSON →
                </span>
              </button>

              {/* Opción 2: TXT Reporte Legible */}
              <button
                id="btn-backup-export-txt"
                type="button"
                onClick={handleExportTxt}
                className="group flex flex-col items-start p-4 rounded-2xl border-2 border-slate-200 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100/80 transition-all text-left cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="p-2 bg-slate-800 text-white rounded-xl mb-3 shadow-xs group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-slate-900 mb-1">
                  Reporte Plano (.TXT)
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Documento de texto plano legible sin software. Ideal para imprimir o leer en el celular.
                </p>
                <span className="mt-3 text-[11px] font-bold text-slate-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Descargar TXT →
                </span>
              </button>

              {/* Opción 3: CSV para Excel */}
              <button
                id="btn-backup-export-csv"
                type="button"
                onClick={handleExportCsv}
                className="group flex flex-col items-start p-4 rounded-2xl border-2 border-emerald-200/70 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50/90 transition-all text-left cursor-pointer shadow-xs hover:shadow-md"
              >
                <div className="p-2 bg-emerald-600 text-white rounded-xl mb-3 shadow-xs group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-emerald-950 mb-1">
                  Planilla (.CSV / Excel)
                </div>
                <p className="text-[11px] text-emerald-700/80 leading-relaxed">
                  Tabla plana con clientes, teléfonos, fechas y saldos para abrir en Excel o Google Sheets.
                </p>
                <span className="mt-3 text-[11px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Descargar CSV →
                </span>
              </button>
            </div>
          </div>

          {/* Opción de Restaurar Respaldo */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>2. Restaurar desde un Archivo de Respaldo previo (.JSON)</span>
            </h3>

            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 sm:p-5 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-backup-upload-input"
              />

              <div className="flex flex-col items-center">
                <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xs text-slate-600 mb-2">
                  <Upload className="w-5 h-5 text-slate-700" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  ¿Tuviste un problema con la base de datos o cambiaste de equipo?
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mt-0.5 mb-3">
                  Selecciona tu archivo <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px] font-mono text-slate-700">respaldo-candy-salon-contingencia.json</code> para restablecer todos tus eventos y gastos.
                </p>

                <button
                  id="btn-select-backup-file"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isRestoring ? 'Leyendo respaldo...' : 'Seleccionar Archivo de Respaldo (.JSON)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mensaje de buenas prácticas ante contingencias */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              <strong>Consejo de seguridad:</strong> Se recomienda hacer clic en <em>"Respaldo Completo (.JSON)"</em> una vez por semana o antes de los fines de semana. Guarda el archivo en tu computadora o pendrive para tener siempre toda la información protegida ante cortes de luz, internet o caídas de servidores.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end">
          <button
            id="btn-close-backup-modal"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
