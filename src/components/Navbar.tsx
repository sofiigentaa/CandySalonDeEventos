import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, Table, BellRing, RotateCcw, Trash2, Database, Sparkles, ChevronDown, Wallet, ShieldCheck, FileDown, Calculator } from 'lucide-react';
import { ViewMode } from '../types.ts';
import { CandyLogo } from './CandyLogo.tsx';

interface NavbarProps {
  onOpenNewEvent?: () => void;
  onOpenNewExpense?: () => void;
  onSyncSupabase?: () => void;
  isRefreshing?: boolean;
  onClearAllData?: () => void;
  onResetDemoData?: () => void;
  onOpenBackupModal?: () => void;
  onOpenQuoteCalculator?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenReminders: () => void;
  pendingRemindersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewEvent,
  onSyncSupabase,
  isRefreshing = false,
  onClearAllData,
  onResetDemoData,
  onOpenBackupModal,
  onOpenQuoteCalculator,
  viewMode,
  onViewModeChange,
  onOpenReminders,
  pendingRemindersCount,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 gap-2 sm:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center transition-transform hover:scale-[1.02]">
              <CandyLogo size="md" showSubtitle={true} className="h-9 sm:h-11" />
            </div>
          </div>

          {/* Desktop & Mobile Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* View Mode Toggle / Solapas Principales (Desktop / Tablet) */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/80 text-xs">
              <button
                id="btn-view-table"
                onClick={() => onViewModeChange('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista de Tabla de Eventos"
              >
                <Table className="w-4 h-4 text-pink-600" />
                <span>Eventos</span>
              </button>
              <button
                id="btn-view-calendar"
                onClick={() => onViewModeChange('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista de Calendario"
              >
                <CalendarDays className="w-4 h-4 text-pink-600" />
                <span>Calendario</span>
              </button>
              <button
                id="btn-view-cashflow"
                onClick={() => onViewModeChange('cashflow')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === 'cashflow'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista de Flujo de Caja y Egresos"
              >
                <Wallet className="w-4 h-4 text-emerald-600" />
                <span>Flujo de Caja</span>
              </button>
            </div>

            {/* Quick Reminders Modal Button */}
            <button
              id="btn-quick-reminders-modal"
              type="button"
              onClick={onOpenReminders}
              title={`Ver Recordatorios y Tareas (${pendingRemindersCount} pendientes)`}
              className={`relative flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                pendingRemindersCount > 0
                  ? 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:text-pink-600 hover:bg-pink-50 border-slate-200'
              }`}
            >
              <BellRing className="w-4 h-4 text-pink-600" />
              {pendingRemindersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                  {pendingRemindersCount}
                </span>
              )}
            </button>

            {/* Botón Cotizador Rápido de Presupuestos */}
            {onOpenQuoteCalculator && (
              <button
                id="btn-open-quote-calculator"
                type="button"
                onClick={onOpenQuoteCalculator}
                title="Cotizador Rápido de Presupuestos para WhatsApp"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 hover:border-pink-300 border border-pink-200 transition-all cursor-pointer shadow-2xs"
              >
                <Calculator className="w-4 h-4 text-pink-600" />
                <span className="hidden sm:inline">Cotizador</span>
              </button>
            )}

            {/* Botón Respaldo Plano / Contingencia */}
            {onOpenBackupModal && (
              <button
                id="btn-open-backup-modal"
                type="button"
                onClick={onOpenBackupModal}
                title="Respaldo en archivo plano ante posibles contingencias"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="hidden lg:inline">Respaldo</span>
              </button>
            )}

            {/* Ruedita: Sincronización y Opciones de Supabase / Base de datos */}
            <div className="relative" ref={menuRef}>
              <button
                id="btn-database-sync-menu"
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                title="Sincronización con Supabase y opciones de base de datos"
                className={`flex items-center gap-1 p-2 rounded-xl border transition-all cursor-pointer ${
                  isMenuOpen
                    ? 'bg-pink-100 text-pink-700 border-pink-300 shadow-xs ring-2 ring-pink-400/20'
                    : 'bg-slate-50 text-slate-600 hover:text-pink-600 hover:bg-pink-50 border-slate-200'
                }`}
              >
                <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-pink-600' : ''}`} />
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-pink-600" />
                      <span className="text-xs font-bold text-slate-800">Base de Datos / Supabase</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Sincroniza o administra los datos</p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    {/* Cotizador Rápido de Presupuestos */}
                    {onOpenQuoteCalculator && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenQuoteCalculator();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-pink-700 hover:bg-pink-50 rounded-xl transition-colors text-left cursor-pointer font-medium mb-0.5"
                      >
                        <Calculator className="w-4 h-4 text-pink-600" />
                        <div>
                          <p className="font-semibold text-pink-900">Cotizador Rápido</p>
                          <p className="text-[10px] text-pink-600/80">Presupuestos WhatsApp en 5 seg</p>
                        </div>
                      </button>
                    )}

                    {/* Respaldo de Contingencia */}
                    {onOpenBackupModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenBackupModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-indigo-700 hover:bg-indigo-50 rounded-xl transition-colors text-left cursor-pointer font-medium mb-0.5"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="font-semibold text-indigo-900">Respaldo de Contingencia</p>
                          <p className="text-[10px] text-indigo-600/80">Archivos planos (.JSON / .TXT / .CSV)</p>
                        </div>
                      </button>
                    )}

                    {/* Sincronizar con Supabase */}
                    {onSyncSupabase && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onSyncSupabase();
                        }}
                        disabled={isRefreshing}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-pink-50 hover:text-pink-700 rounded-xl transition-colors text-left cursor-pointer font-medium disabled:opacity-50"
                      >
                        <RotateCcw className={`w-4 h-4 text-pink-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <div>
                          <p className="font-semibold text-slate-800">Sincronizar con Supabase</p>
                          <p className="text-[10px] text-slate-400">Recargar datos en vivo</p>
                        </div>
                      </button>
                    )}

                    {/* Borrar Todo (Vaciar base de datos) */}
                    {onClearAllData && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onClearAllData();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors text-left cursor-pointer font-medium"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="font-semibold text-red-700">Borrar todo (Vaciar BD)</p>
                          <p className="text-[10px] text-red-400">Dejar tablas limpias en cero</p>
                        </div>
                      </button>
                    )}

                    {/* Cargar datos de ejemplo */}
                    {onResetDemoData && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onResetDemoData();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer font-medium"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="font-medium text-slate-700">Cargar datos de ejemplo</p>
                          <p className="text-[10px] text-slate-400">Para probar el sistema</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
