import React from 'react';
import { EventItem, ExpenseItem, PaymentRecord } from '../types.ts';
import { formatCurrency, parseLocalDate, formatFullDateSpanish } from '../utils/dateUtils.ts';
import { EXPENSE_CATEGORIES } from './ExpenseModal.tsx';
import { CandyLogo } from './CandyLogo.tsx';
import { printDocument, openPrintWindowFromElement, downloadHtmlReport, generatePrintableHtml } from '../utils/printUtils.ts';
import {
  Printer,
  ExternalLink,
  Download,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

interface CashflowReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: number; // 0-11 or -1
  selectedYear: number;
  events: EventItem[];
  expenses: ExpenseItem[];
  currency: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const CashflowReportModal: React.FC<CashflowReportModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  selectedYear,
  events,
  expenses,
  currency,
}) => {
  if (!isOpen) return null;

  const periodTitle =
    selectedMonth === -1
      ? `Ejercicio Anual Consolidado ${selectedYear}`
      : `${MONTH_NAMES[selectedMonth]} de ${selectedYear}`;

  // Filter incomes
  const filteredIncomes: Array<PaymentRecord & { eventTitle: string; clientName: string }> = [];
  for (const ev of events) {
    if (ev.paymentHistory && ev.paymentHistory.length > 0) {
      for (const p of ev.paymentHistory) {
        const d = parseLocalDate(p.date);
        const matchYear = d.getFullYear() === selectedYear;
        const matchMonth = selectedMonth === -1 || d.getMonth() === selectedMonth;
        if (matchYear && matchMonth) {
          filteredIncomes.push({
            ...p,
            eventTitle: ev.title,
            clientName: ev.clientName,
          });
        }
      }
    }
  }

  // Filter expenses
  const filteredExpenses = expenses.filter((exp) => {
    const d = parseLocalDate(exp.date);
    const matchYear = d.getFullYear() === selectedYear;
    const matchMonth = selectedMonth === -1 || d.getMonth() === selectedMonth;
    return matchYear && matchMonth;
  });

  const totalIncomes = filteredIncomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncomes - totalExpenses;

  // Breakdown cash vs digital
  const cashIn = filteredIncomes.filter((i) => i.method === 'Efectivo').reduce((s, i) => s + i.amount, 0);
  const cashOut = filteredExpenses.filter((e) => e.paymentMethod === 'Efectivo').reduce((s, e) => s + e.amount, 0);
  const cashNet = cashIn - cashOut;

  const digitalIn = totalIncomes - cashIn;
  const digitalOut = totalExpenses - cashOut;
  const digitalNet = digitalIn - digitalOut;

  // Expenses by category
  const expenseByCategory: Record<string, number> = {};
  for (const exp of filteredExpenses) {
    expenseByCategory[exp.category] = (expenseByCategory[exp.category] || 0) + exp.amount;
  }

  // Combined movements list sorted by date
  const movements: Array<{
    date: string;
    type: 'income' | 'expense';
    concept: string;
    detail: string;
    method: string;
    amount: number;
    receipt?: string;
  }> = [];

  for (const inc of filteredIncomes) {
    movements.push({
      date: inc.date,
      type: 'income',
      concept: inc.concept || 'Cobro / Seña',
      detail: `${inc.clientName} (${inc.eventTitle})`,
      method: inc.method || 'Efectivo',
      amount: inc.amount,
      receipt: inc.receiptNumber,
    });
  }

  for (const exp of filteredExpenses) {
    const cat = EXPENSE_CATEGORIES.find((c) => c.key === exp.category)?.label || exp.category;
    movements.push({
      date: exp.date,
      type: 'expense',
      concept: exp.concept,
      detail: exp.supplier || cat,
      method: exp.paymentMethod || 'Efectivo',
      amount: exp.amount,
      receipt: exp.receiptNumber,
    });
  }

  movements.sort((a, b) => b.date.localeCompare(a.date));

  const handlePrintDirect = () => {
    printDocument('printable-cashflow-report-content', `Informe_Flujo_Caja_${periodTitle.replace(/\s+/g, '_')}`);
  };

  const handleOpenNewWindow = () => {
    openPrintWindowFromElement('printable-cashflow-report-content', `Informe_Flujo_Caja_${periodTitle.replace(/\s+/g, '_')}`);
  };

  const handleDownloadHtml = () => {
    const el = document.getElementById('printable-cashflow-report-content');
    if (!el) return;
    const fullHtml = generatePrintableHtml(el.innerHTML, `Informe_Flujo_Caja_${periodTitle.replace(/\s+/g, '_')}`);
    downloadHtmlReport(fullHtml, `Informe_Flujo_Caja_${periodTitle.replace(/\s+/g, '_')}.html`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Printer className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Imprimir Informe de Flujo de Caja</h2>
              <p className="text-[10px] text-slate-400 font-medium">Candy Salón de Eventos • {periodTitle}</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenNewWindow}
              title="Abrir en pestaña limpia para imprimir"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-pink-400" />
              <span>Nueva Pestaña</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              title="Descargar archivo HTML del informe"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descargar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 bg-slate-50">
          <div
            id="printable-cashflow-report-content"
            className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs max-w-3xl mx-auto space-y-6 text-slate-900"
          >
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b-2 border-pink-500 gap-4">
              <div>
                <CandyLogo size="lg" showSubtitle={true} className="h-12 sm:h-14" />
              </div>
              <div className="sm:text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg uppercase tracking-wider">
                  Informe Financiero
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1.5">{periodTitle}</h3>
                <p className="text-[11px] text-slate-500">
                  Emitido: {formatFullDateSpanish(new Date().toISOString().split('T')[0])}
                </p>
              </div>
            </div>

            {/* Financial Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Total Ingresos (Cobros & Señas)
                </span>
                <span className="text-xl font-black text-emerald-900 mt-1 block">
                  {formatCurrency(totalIncomes, currency)}
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {filteredIncomes.length} cobros registrados
                </span>
              </div>

              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                  Total Egresos (Gastos Operativos)
                </span>
                <span className="text-xl font-black text-rose-900 mt-1 block">
                  {formatCurrency(totalExpenses, currency)}
                </span>
                <span className="text-[11px] text-rose-700 font-medium">
                  {filteredExpenses.length} egresos pagados
                </span>
              </div>

              <div
                className={`border rounded-xl p-3.5 ${
                  netBalance >= 0 ? 'bg-indigo-50/70 border-indigo-200' : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                  Balance Neto de Caja
                </span>
                <span
                  className={`text-xl font-black mt-1 block ${
                    netBalance >= 0 ? 'text-indigo-950' : 'text-amber-950'
                  }`}
                >
                  {formatCurrency(netBalance, currency)}
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
                  {netBalance >= 0 ? 'Superávit / Ganancia' : 'Déficit del período'}
                </span>
              </div>
            </div>

            {/* Breakdown Cash vs Digital */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2.5">
                Distribución por Modalidad de Cobro y Pago
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">💵 Caja Chica (Efectivo Ingresado):</span>
                    <span className="font-bold text-emerald-800">{formatCurrency(cashIn, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">💵 Egresos pagados en Efectivo:</span>
                    <span className="font-bold text-rose-800">- {formatCurrency(cashOut, currency)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-800">Saldo Neto Efectivo (Caja):</span>
                    <span className="font-extrabold text-slate-900">{formatCurrency(cashNet, currency)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">💳 Cuentas Digitales (Transf. / MP / Tarjeta):</span>
                    <span className="font-bold text-emerald-800">{formatCurrency(digitalIn, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">💳 Egresos vía Bancaria / Tarjeta:</span>
                    <span className="font-bold text-rose-800">- {formatCurrency(digitalOut, currency)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-800">Saldo Neto Digital:</span>
                    <span className="font-extrabold text-slate-900">{formatCurrency(digitalNet, currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses by category table */}
            {filteredExpenses.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                  Desglose de Egresos por Rubro
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2">Categoría / Rubro</th>
                        <th className="p-2 text-right">Monto Total</th>
                        <th className="p-2 text-right">% del Gasto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {EXPENSE_CATEGORIES.map((cat) => {
                        const amount = expenseByCategory[cat.key] || 0;
                        if (amount === 0) return null;
                        const pct = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;
                        return (
                          <tr key={cat.key}>
                            <td className="p-2 font-medium">{cat.label}</td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              {formatCurrency(amount, currency)}
                            </td>
                            <td className="p-2 text-right font-semibold text-slate-500">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Detailed Movements Ledger Table */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                Detalle Cronológico de Movimientos ({movements.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Concepto</th>
                      <th className="p-2">Cliente / Proveedor</th>
                      <th className="p-2">Método</th>
                      <th className="p-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((mov, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-2 whitespace-nowrap font-medium text-slate-600">{mov.date}</td>
                        <td className="p-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                              mov.type === 'income'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {mov.type === 'income' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td className="p-2 font-semibold text-slate-900">{mov.concept}</td>
                        <td className="p-2 text-slate-600">{mov.detail}</td>
                        <td className="p-2 text-slate-600">{mov.method}</td>
                        <td
                          className={`p-2 text-right font-bold whitespace-nowrap ${
                            mov.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {mov.type === 'income' ? '+' : '-'} {formatCurrency(mov.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Document Signature & Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
              <div>
                <p className="font-semibold text-slate-700">Candy Salón de Eventos</p>
                <p className="text-[10px]">Documento de control interno y auditoría</p>
              </div>
              <div className="text-center sm:text-right">
                <div className="w-44 border-b border-slate-400 mb-1 mx-auto sm:ml-auto" />
                <span className="text-[10px] text-slate-400 font-medium">Firma Responsable / Administración</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <span className="text-xs text-slate-500 font-medium">
            💡 Puedes imprimir directamente o guardar como documento PDF desde el diálogo de impresión.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
