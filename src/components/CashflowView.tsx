import React, { useState, useMemo } from 'react';
import { EventItem, ExpenseCategory, ExpenseItem, PaymentMethod, PaymentRecord } from '../types';
import { formatCurrency, parseLocalDate, formatFullDateSpanish } from '../utils/dateUtils';
import { EXPENSE_CATEGORIES } from './ExpenseModal';
import { printDocument } from '../utils/printUtils';
import { CashflowReportModal } from './CashflowReportModal';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Wallet,
  Building,
  CreditCard,
  Banknote,
  PieChart as PieChartIcon,
  BarChart3,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Trash2,
  Edit2,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Zap,
  Users,
  Utensils,
  Wine,
  Package,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CashflowViewProps {
  events: EventItem[];
  expenses: ExpenseItem[];
  currency: string;
  onOpenNewExpense: () => void;
  onEditExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onOpenNewPaymentDirect?: () => void;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const PIE_COLORS = [
  '#a855f7', // purple - personal
  '#f43f5e', // rose - alquiler
  '#f59e0b', // amber - gastos fijos
  '#06b6d4', // cyan - suministros
  '#10b981', // emerald - comida
  '#3b82f6', // blue - bebida
  '#64748b', // slate - mantenimiento
  '#94a3b8', // gray - otro
];

export const CashflowView: React.FC<CashflowViewProps> = ({
  events,
  expenses,
  currency,
  onOpenNewExpense,
  onEditExpense,
  onDeleteExpense,
  onOpenNewPaymentDirect,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0 - 11, or -1 for all year
  const [filterType, setFilterType] = useState<'all' | 'incomes' | 'expenses'>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPrintReportOpen, setIsPrintReportOpen] = useState<boolean>(false);

  // Extract all income records from events' payment histories
  const allIncomes = useMemo(() => {
    const list: Array<PaymentRecord & { eventTitle: string; clientName: string; eventId: string }> = [];
    for (const ev of events) {
      if (ev.paymentHistory && ev.paymentHistory.length > 0) {
        for (const p of ev.paymentHistory) {
          list.push({
            ...p,
            eventId: ev.id,
            eventTitle: ev.title,
            clientName: ev.clientName,
          });
        }
      }
    }
    return list;
  }, [events]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === -1) {
      setSelectedYear((y) => y - 1);
    } else if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === -1) {
      setSelectedYear((y) => y + 1);
    } else if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Filtered Incomes for the selected month/year
  const monthIncomes = useMemo(() => {
    return allIncomes.filter((inc) => {
      const d = parseLocalDate(inc.date);
      const matchYear = d.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === -1 || d.getMonth() === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [allIncomes, selectedYear, selectedMonth]);

  // Filtered Expenses for the selected month/year
  const monthExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const d = parseLocalDate(exp.date);
      const matchYear = d.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === -1 || d.getMonth() === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [expenses, selectedYear, selectedMonth]);

  // Totals
  const totalIncomes = useMemo(() => {
    return monthIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  }, [monthIncomes]);

  const totalExpenses = useMemo(() => {
    return monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [monthExpenses]);

  const netCashflow = totalIncomes - totalExpenses;
  const profitMargin = totalIncomes > 0 ? (netCashflow / totalIncomes) * 100 : 0;

  // Breakdown of incomes by payment method
  const incomeByMethod = useMemo(() => {
    const counts: Record<string, number> = {
      Efectivo: 0,
      Tarjeta: 0,
      Transferencia: 0,
      'Mercado Pago': 0,
      Otro: 0,
    };
    for (const inc of monthIncomes) {
      const m = inc.method || 'Transferencia';
      if (counts[m] !== undefined) {
        counts[m] += inc.amount;
      } else {
        counts['Otro'] += inc.amount;
      }
    }
    return counts;
  }, [monthIncomes]);

  // Breakdown of expenses by category (requested: personal, alquiler, fijos, suministros, comida, bebida, etc.)
  const expenseByCategory = useMemo(() => {
    const map: Record<ExpenseCategory, number> = {
      pago_personal: 0,
      alquiler: 0,
      gastos_fijos: 0,
      suministros: 0,
      comida: 0,
      bebida: 0,
      mantenimiento: 0,
      otro: 0,
    };
    for (const exp of monthExpenses) {
      if (map[exp.category] !== undefined) {
        map[exp.category] += exp.amount;
      } else {
        map['otro'] += exp.amount;
      }
    }
    return map;
  }, [monthExpenses]);

  // Breakdown of expenses by payment method (cash vs digital)
  const expenseByMethod = useMemo(() => {
    const counts: Record<string, number> = {
      Efectivo: 0,
      Tarjeta: 0,
      Transferencia: 0,
      'Mercado Pago': 0,
      Otro: 0,
    };
    for (const exp of monthExpenses) {
      const m = exp.paymentMethod || 'Efectivo';
      if (counts[m] !== undefined) {
        counts[m] += exp.amount;
      } else {
        counts['Otro'] += exp.amount;
      }
    }
    return counts;
  }, [monthExpenses]);

  // Physical Cash balance (Caja chica) vs Bank accounts / Digital
  const cashPhysicalIn = incomeByMethod['Efectivo'] || 0;
  const cashPhysicalOut = expenseByMethod['Efectivo'] || 0;
  const cashPhysicalNet = cashPhysicalIn - cashPhysicalOut;

  const digitalIn = totalIncomes - cashPhysicalIn;
  const digitalOut = totalExpenses - cashPhysicalOut;
  const digitalNet = digitalIn - digitalOut;

  // Annual Bar Chart Data (Month by Month for selectedYear)
  const annualChartData = useMemo(() => {
    const monthsData = [];
    for (let m = 0; m < 12; m++) {
      const incTotal = allIncomes
        .filter((inc) => {
          const d = parseLocalDate(inc.date);
          return d.getFullYear() === selectedYear && d.getMonth() === m;
        })
        .reduce((s, inc) => s + inc.amount, 0);

      const expTotal = expenses
        .filter((exp) => {
          const d = parseLocalDate(exp.date);
          return d.getFullYear() === selectedYear && d.getMonth() === m;
        })
        .reduce((s, exp) => s + exp.amount, 0);

      monthsData.push({
        month: MONTH_NAMES[m].substring(0, 3),
        fullName: MONTH_NAMES[m],
        Ingresos: incTotal,
        Egresos: expTotal,
        Neto: incTotal - expTotal,
      });
    }
    return monthsData;
  }, [allIncomes, expenses, selectedYear]);

  // Pie chart data for expense categories
  const pieChartData = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      const value = expenseByCategory[cat.key] || 0;
      return {
        name: cat.label,
        value,
        key: cat.key,
      };
    }).filter((item) => item.value > 0);
  }, [expenseByCategory]);

  // Unified ledger list of movements for selected month
  const unifiedMovements = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      type: 'income' | 'expense';
      title: string;
      subtitle: string;
      categoryOrConcept: string;
      method: PaymentMethod;
      amount: number;
      receiptNumber?: string;
      originalExpense?: ExpenseItem;
      notes?: string;
    }> = [];

    // Add incomes
    for (const inc of monthIncomes) {
      list.push({
        id: `inc-${inc.id}`,
        date: inc.date,
        type: 'income',
        title: `${inc.concept || 'Cobro de evento'} • ${inc.clientName}`,
        subtitle: inc.eventTitle,
        categoryOrConcept: inc.concept,
        method: inc.method,
        amount: inc.amount,
        receiptNumber: inc.receiptNumber,
        notes: inc.notes,
      });
    }

    // Add expenses
    for (const exp of monthExpenses) {
      const catMeta = EXPENSE_CATEGORIES.find((c) => c.key === exp.category);
      list.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        type: 'expense',
        title: exp.concept,
        subtitle: exp.supplier || (exp.eventTitle ? `Evento: ${exp.eventTitle}` : 'Gasto general del salón'),
        categoryOrConcept: catMeta?.label || exp.category,
        method: exp.paymentMethod,
        amount: exp.amount,
        receiptNumber: exp.receiptNumber,
        originalExpense: exp,
        notes: exp.notes,
      });
    }

    // Sort descending by date
    list.sort((a, b) => b.date.localeCompare(a.date));

    // Apply UI filters & search
    return list.filter((item) => {
      if (filterType === 'incomes' && item.type !== 'income') return false;
      if (filterType === 'expenses' && item.type !== 'expense') return false;
      if (filterMethod !== 'all' && item.method !== filterMethod) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchSubtitle = item.subtitle.toLowerCase().includes(query);
        const matchCat = item.categoryOrConcept.toLowerCase().includes(query);
        const matchReceipt = item.receiptNumber?.toLowerCase().includes(query) ?? false;
        if (!matchTitle && !matchSubtitle && !matchCat && !matchReceipt) {
          return false;
        }
      }

      return true;
    });
  }, [monthIncomes, monthExpenses, filterType, filterMethod, searchTerm]);

  return (
    <div id="printable-cashflow-section" className="space-y-6 animate-in fade-in duration-200">
      {/* Month Navigation & Controls Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-pink-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
              <option value={-1}>-- Todo el Año (Consolidado) --</option>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-print-cashflow-summary"
            type="button"
            onClick={() => setIsPrintReportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Imprimir Resumen</span>
          </button>

          <button
            onClick={onOpenNewExpense}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <TrendingDown className="w-4 h-4" />
            <span>+ Registrar Egreso</span>
          </button>
        </div>
      </div>

      {/* Main KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incomes Card */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Ingresos del Mes
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-800 tracking-tight">
              {formatCurrency(totalIncomes, currency)}
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>{monthIncomes.length} cobros registrados</span>
            <span className="text-emerald-800 font-bold">
              💵 Ef: {formatCurrency(incomeByMethod['Efectivo'] || 0, currency)}
            </span>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Egresos / Costos del Mes
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-800 tracking-tight">
              {formatCurrency(totalExpenses, currency)}
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>{monthExpenses.length} egresos pagados</span>
            <span className="text-rose-800 font-bold">
              Personal: {formatCurrency(expenseByCategory['pago_personal'] || 0, currency)}
            </span>
          </div>
        </div>

        {/* Net Cashflow (Balance) Card */}
        <div
          className={`rounded-2xl p-4.5 border shadow-xs relative overflow-hidden ${
            netCashflow >= 0
              ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-600'
              : 'bg-gradient-to-br from-rose-600 to-red-800 text-white border-rose-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              Flujo Neto / Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">
              {formatCurrency(netCashflow, currency)}
            </span>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] text-white/90 font-semibold">
            <span>{netCashflow >= 0 ? 'Superávit Operativo' : 'Déficit del Mes'}</span>
            <span>Margen: {profitMargin.toFixed(1)}%</span>
          </div>
        </div>

        {/* Cash Register vs Bank Position */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Posición de Caja & Banco
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                💵 Caja Física (Efectivo):
              </span>
              <span className={`font-bold ${cashPhysicalNet >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                {formatCurrency(cashPhysicalNet, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium flex items-center gap-1">
                💳 Banco / Tarjeta / MP:
              </span>
              <span className={`font-bold ${digitalNet >= 0 ? 'text-indigo-800' : 'text-rose-800'}`}>
                {formatCurrency(digitalNet, currency)}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
            Control de efectivo en mano vs cuentas bancarias
          </div>
        </div>
      </div>

      {/* Categories Breakdown Quick Badges */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-pink-600" />
          <span>Desglose Detallado de Egresos por Rubro ({selectedMonth === -1 ? selectedYear : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`})</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Pago Personal */}
          <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
            <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs mb-1">
              <Users className="w-3.5 h-3.5" />
              <span>Pago Personal</span>
            </div>
            <div className="text-base font-black text-purple-900">
              {formatCurrency(expenseByCategory['pago_personal'] || 0, currency)}
            </div>
            <div className="text-[10px] text-purple-600 mt-0.5">Mozos, DJ, Limpieza</div>
          </div>

          {/* Alquiler */}
          <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl">
            <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs mb-1">
              <Building className="w-3.5 h-3.5" />
              <span>Alquiler</span>
            </div>
            <div className="text-base font-black text-rose-900">
              {formatCurrency(expenseByCategory['alquiler'] || 0, currency)}
            </div>
            <div className="text-[10px] text-rose-600 mt-0.5">Salón & Expensas</div>
          </div>

          {/* Gastos Fijos */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
            <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Gastos Fijos</span>
            </div>
            <div className="text-base font-black text-amber-900">
              {formatCurrency(expenseByCategory['gastos_fijos'] || 0, currency)}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">Luz, Gas, WiFi, Seguro</div>
          </div>

          {/* Suministros */}
          <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl">
            <div className="flex items-center gap-1.5 text-cyan-700 font-bold text-xs mb-1">
              <Package className="w-3.5 h-3.5" />
              <span>Suministros</span>
            </div>
            <div className="text-base font-black text-cyan-900">
              {formatCurrency(expenseByCategory['suministros'] || 0, currency)}
            </div>
            <div className="text-[10px] text-cyan-600 mt-0.5">Cotillón, vajilla, manteles</div>
          </div>

          {/* Comida */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-1">
              <Utensils className="w-3.5 h-3.5" />
              <span>Comida / Catering</span>
            </div>
            <div className="text-base font-black text-emerald-900">
              {formatCurrency(expenseByCategory['comida'] || 0, currency)}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Carnes, repostería, menú</div>
          </div>

          {/* Bebida */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs mb-1">
              <Wine className="w-3.5 h-3.5" />
              <span>Bebida & Barra</span>
            </div>
            <div className="text-base font-black text-blue-900">
              {formatCurrency(expenseByCategory['bebida'] || 0, currency)}
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">Gaseosas, licores, hielo</div>
          </div>
        </div>
      </div>

      {/* Visual Charts: Annual Flow & Monthly Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Annual Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Flujo Comparativo Mes a Mes ({selectedYear})</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Evolución de Ingresos cobrados vs Egresos operativos
              </p>
            </div>
          </div>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val, currency)]}
                  labelFormatter={(label, payload) => {
                    const item = payload[0]?.payload;
                    return item ? `${item.fullName} ${selectedYear}` : label;
                  }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie / Distribution of Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-pink-600" />
                <span>Distribución de Costos</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">Porcentajes del total de egresos</p>
            </div>
          </div>
          {pieChartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <TrendingDown className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-xs font-semibold">No hay egresos registrados en este período.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [
                        `${formatCurrency(val, currency)} (${((val / totalExpenses) * 100).toFixed(1)}%)`,
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full grid grid-cols-2 gap-1.5 text-[11px] mt-2">
                {pieChartData.slice(0, 6).map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="text-slate-600 truncate">{item.name}:</span>
                    <span className="font-bold text-slate-900 ml-auto">
                      {((item.value / totalExpenses) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Movements Table / Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-pink-600" />
              <span>Libro de Movimientos Financieros</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Listado cronológico de todos los cobros recibidos y egresos efectuados
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar movimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white font-medium"
              />
            </div>

            {/* Type filter pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : ''
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('incomes')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'incomes' ? 'bg-emerald-600 text-white shadow-2xs font-bold' : ''
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFilterType('expenses')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'expenses' ? 'bg-rose-600 text-white shadow-2xs font-bold' : ''
                }`}
              >
                Egresos
              </button>
            </div>
          </div>
        </div>

        {/* Movements Table */}
        {unifiedMovements.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p className="text-sm font-semibold">No se encontraron movimientos registrados con los filtros actuales.</p>
            <p className="text-xs text-slate-400 mt-1">
              Usa el botón "+ Registrar Egreso" para anotar gastos de personal, alquiler, suministros, comida o bebida.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Concepto / Detalle</th>
                  <th className="py-3 px-4">Rubro / Categoría</th>
                  <th className="py-3 px-4">Medio de Pago</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {unifiedMovements.map((mov) => {
                  const isInc = mov.type === 'income';
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {mov.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isInc
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isInc ? (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              <span>INGRESO</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                              <span>EGRESO</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{mov.title}</div>
                        {mov.subtitle && (
                          <div className="text-[11px] text-slate-600 truncate max-w-xs">{mov.subtitle}</div>
                        )}
                        {mov.receiptNumber && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Comprobante: {mov.receiptNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {mov.categoryOrConcept}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          {mov.method === 'Efectivo'
                            ? '💵 Efectivo'
                            : mov.method === 'Tarjeta'
                            ? '💳 Tarjeta'
                            : mov.method === 'Transferencia'
                            ? '🏦 Transferencia'
                            : mov.method === 'Mercado Pago'
                            ? '📱 MP'
                            : mov.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-black text-sm ${
                            isInc ? 'text-emerald-800' : 'text-rose-800'
                          }`}
                        >
                          {isInc ? '+' : '-'} {formatCurrency(mov.amount, currency)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {!isInc && mov.originalExpense && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onEditExpense(mov.originalExpense!)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar egreso"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Eliminar egreso "${mov.title}"?`)) {
                                  onDeleteExpense(mov.originalExpense!.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar egreso"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {isInc && (
                          <span className="text-[10px] text-slate-400 italic">Vinculado a evento</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cashflow Printable Report Modal */}
      <CashflowReportModal
        isOpen={isPrintReportOpen}
        onClose={() => setIsPrintReportOpen(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        events={events}
        expenses={expenses}
        currency={currency}
      />
    </div>
  );
};
