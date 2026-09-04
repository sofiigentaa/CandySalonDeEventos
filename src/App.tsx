import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  EventItem,
  ExpenseItem,
  FilterStatus,
  PaymentRecord,
  ReminderItem,
  SortOption,
  ViewMode,
} from './types.ts';
import {
  loadEventsFromStorage,
  saveEventsToStorage,
  loadRemindersFromStorage,
  saveRemindersToStorage,
  loadExpensesFromStorage,
  saveExpensesToStorage,
  resetToDemoData,
} from './utils/storage.ts';
import {
  fetchEvents,
  fetchReminders,
  fetchExpenses,
  saveEventApi,
  deleteEventApi,
  addPaymentApi,
  saveReminderApi,
  deleteReminderApi,
  saveExpenseApi,
  deleteExpenseApi,
  resetDemoApi,
  clearAllDataApi,
} from './utils/api.ts';
import {
  getRemainingBalance,
  getDaysRemaining,
  parseLocalDate,
  getTodayString,
} from './utils/dateUtils.ts';

import { Navbar } from './components/Navbar.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { EventFilters } from './components/EventFilters.tsx';
import { EventTable } from './components/EventTable.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { CashflowView } from './components/CashflowView.tsx';
import { RemindersView } from './components/RemindersView.tsx';
import { EventModal } from './components/EventModal.tsx';
import { PaymentModal } from './components/PaymentModal.tsx';
import { ReceiptModal } from './components/ReceiptModal.tsx';
import { RemindersModal } from './components/RemindersModal.tsx';
import { ExpenseModal } from './components/ExpenseModal.tsx';
import { BackupModal } from './components/BackupModal.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';
import { WhatsAppModal } from './components/WhatsAppModal.tsx';
import { ContractModal } from './components/ContractModal.tsx';
import { QuoteCalculatorModal } from './components/QuoteCalculatorModal.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import { BackupPayload } from './utils/backupUtils.ts';

import { CalendarPlus, Plus, FilterX } from 'lucide-react';

export default function App() {
  const { user } = useAuth();

  // Persistence state
  const [events, setEvents] = useState<EventItem[]>(() => loadEventsFromStorage());
  const [reminders, setReminders] = useState<ReminderItem[]>(() => loadRemindersFromStorage());
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => loadExpensesFromStorage());
  const currency = '$ARS';
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date_asc');

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [defaultDateForNewEvent, setDefaultDateForNewEvent] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<EventItem | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedEventForReceipt, setSelectedEventForReceipt] = useState<EventItem | null>(null);

  // Reminders Modal state
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [selectedEventIdForReminder, setSelectedEventIdForReminder] = useState<string | undefined>(undefined);

  // Expenses Modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Backup & Contingency Modal state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // WhatsApp Messaging Modal state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedEventForWhatsApp, setSelectedEventForWhatsApp] = useState<EventItem | null>(null);

  // Contract & Terms Modal state
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedEventForContract, setSelectedEventForContract] = useState<EventItem | null>(null);

  // Quote Calculator Modal state
  const [isQuoteCalculatorOpen, setIsQuoteCalculatorOpen] = useState(false);

  // In-app interactive confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const askConfirmation = (params: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      title: params.title,
      description: params.description,
      confirmText: params.confirmText || 'Eliminar',
      cancelText: params.cancelText || 'Cancelar',
      variant: params.variant || 'danger',
      onConfirm: params.onConfirm,
    });
  };

  // Initial fetch from backend database
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [backendEvents, backendReminders, backendExpenses] = await Promise.all([
        fetchEvents(),
        fetchReminders(),
        fetchExpenses(),
      ]);
      if (Array.isArray(backendEvents)) {
        setEvents(backendEvents);
      }
      if (Array.isArray(backendReminders)) {
        setReminders(backendReminders);
      }
      if (Array.isArray(backendExpenses)) {
        setExpenses(backendExpenses);
      }
    } catch (err) {
      console.warn('Initial load data error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, user]);

  // Sync to local storage whenever events change
  useEffect(() => {
    saveEventsToStorage(events);
  }, [events]);

  // Sync to local storage whenever reminders change
  useEffect(() => {
    saveRemindersToStorage(reminders);
  }, [reminders]);

  // Sync to local storage whenever expenses change
  useEffect(() => {
    saveExpensesToStorage(expenses);
  }, [expenses]);

  // Pending reminders count for badges
  const pendingRemindersCount = useMemo(() => {
    return reminders.filter((r) => !r.completed).length;
  }, [reminders]);

  // Handle Reminder Actions
  const handleAddReminder = (reminderData: Omit<ReminderItem, 'id' | 'createdAt'>) => {
    const newReminder: ReminderItem = {
      ...reminderData,
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setReminders((prev) => [newReminder, ...prev]);
    saveReminderApi(newReminder);
  };

  const handleToggleCompleteReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, completed: !r.completed };
          saveReminderApi(updated);
          return updated;
        }
        return r;
      })
    );
  };

  const handleDeleteReminder = (id: string) => {
    const target = reminders.find((r) => r.id === id);
    askConfirmation({
      title: '¿Eliminar Recordatorio?',
      description: `¿Estás seguro de que deseas eliminar el recordatorio ${target ? `"${target.title}"` : ''}?`,
      confirmText: 'Eliminar Recordatorio',
      variant: 'danger',
      onConfirm: () => {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        deleteReminderApi(id);
      },
    });
  };

  const handleOpenReminders = (eventId?: string) => {
    setSelectedEventIdForReminder(eventId);
    setIsRemindersModalOpen(true);
  };

  // Handle Expense Actions
  const handleSaveExpense = (savedExpense: ExpenseItem) => {
    setExpenses((prev) => {
      const exists = prev.some((e) => e.id === savedExpense.id);
      if (exists) {
        return prev.map((e) => (e.id === savedExpense.id ? savedExpense : e));
      }
      return [savedExpense, ...prev];
    });
    saveExpenseApi(savedExpense);
  };

  const handleDeleteExpense = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    askConfirmation({
      title: '¿Eliminar Egreso / Gasto?',
      description: `¿Estás seguro de que deseas eliminar el egreso ${target ? `"${target.concept}"` : ''}?`,
      confirmText: 'Eliminar Egreso',
      variant: 'danger',
      onConfirm: () => {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        deleteExpenseApi(id);
        if (editingExpense?.id === id) {
          setEditingExpense(null);
          setIsExpenseModalOpen(false);
        }
      },
    });
  };

  const handleOpenNewExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  // Handle Event CRUD
  const handleSaveEvent = (
    savedEvent: EventItem,
    autoReminders?: Array<Omit<ReminderItem, 'id' | 'createdAt'>>
  ) => {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === savedEvent.id);
      if (exists) {
        return prev.map((e) => (e.id === savedEvent.id ? savedEvent : e));
      }
      return [savedEvent, ...prev];
    });

    saveEventApi(savedEvent);

    if (autoReminders && autoReminders.length > 0) {
      autoReminders.forEach((r) => {
        handleAddReminder(r);
      });
    }
  };

  const handleDeleteEvent = (id: string) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;
    askConfirmation({
      title: '¿Eliminar Evento?',
      description: `¿Estás seguro de que deseas eliminar el evento "${target.title}" de ${target.clientName}? Esta acción borrará también sus pagos y recordatorios vinculados.`,
      confirmText: 'Eliminar Evento',
      variant: 'danger',
      onConfirm: () => {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setReminders((prev) => prev.filter((r) => r.eventId !== id));
        deleteEventApi(id);
        if (selectedEventForReceipt?.id === id) setIsReceiptModalOpen(false);
        if (selectedEventForPayment?.id === id) setIsPaymentModalOpen(false);
        if (editingEvent?.id === id) {
          setEditingEvent(null);
          setIsEventModalOpen(false);
        }
      },
    });
  };

  // Handle Adding Payments
  const handleAddPayment = (eventId: string, payment: PaymentRecord) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const newHistory = [...(ev.paymentHistory || []), payment];
        const newTotalPaid = newHistory.reduce((acc, p) => acc + p.amount, 0);
        const isPaid = newTotalPaid >= ev.totalAmount;

        const updated: EventItem = {
          ...ev,
          paymentHistory: newHistory,
          status: isPaid ? 'fully_paid' : 'deposit_paid',
          updatedAt: new Date().toISOString(),
        };

        if (selectedEventForReceipt?.id === eventId) {
          setSelectedEventForReceipt(updated);
        }

        return updated;
      })
    );

    addPaymentApi(eventId, payment);
  };

  // Handle Deleting a payment record from receipt view
  const handleDeletePayment = (eventId: string, paymentId: string) => {
    askConfirmation({
      title: '¿Eliminar Pago / Seña?',
      description: '¿Deseas eliminar este registro de pago del historial? El saldo del evento se recalculará automáticamente.',
      confirmText: 'Eliminar Pago',
      variant: 'danger',
      onConfirm: () => {
        setEvents((prev) =>
          prev.map((ev) => {
            if (ev.id !== eventId) return ev;
            const newHistory = (ev.paymentHistory || []).filter((p) => p.id !== paymentId);
            const newTotalPaid = newHistory.reduce((acc, p) => acc + p.amount, 0);
            const isPaid = newTotalPaid >= ev.totalAmount;

            const updated: EventItem = {
              ...ev,
              paymentHistory: newHistory,
              status: isPaid ? 'fully_paid' : newTotalPaid > 0 ? 'deposit_paid' : 'no_deposit',
              updatedAt: new Date().toISOString(),
            };

            saveEventApi(updated);

            if (selectedEventForReceipt?.id === eventId) {
              setSelectedEventForReceipt(updated);
            }

            return updated;
          })
        );
      },
    });
  };

  // Clear all data from Database and App
  const handleClearAllData = () => {
    askConfirmation({
      title: '¿Borrar Todos los Datos?',
      description: 'Esta acción borrará de manera definitiva todos los eventos, pagos, recordatorios y egresos tanto de la base de datos como de la aplicación para que comiences desde cero.',
      confirmText: 'Vaciar Todo',
      variant: 'danger',
      onConfirm: async () => {
        setIsRefreshing(true);
        await clearAllDataApi();
        setEvents([]);
        setReminders([]);
        setExpenses([]);
        setIsRefreshing(false);
      },
    });
  };

  // Reset to Demo Data
  const handleResetData = () => {
    askConfirmation({
      title: '¿Restablecer Datos de Demostración?',
      description: '¿Deseas restablecer los datos de ejemplo de Candy Salón (eventos, recordatorios y egresos) en la base de datos?',
      confirmText: 'Restablecer Datos',
      variant: 'warning',
      onConfirm: async () => {
        setIsRefreshing(true);
        const serverResult = await resetDemoApi();
        if (serverResult) {
          setEvents(serverResult.events);
          setReminders(serverResult.reminders);
          if (serverResult.expenses) {
            setExpenses(serverResult.expenses);
          }
        } else {
          const demo = resetToDemoData();
          setEvents(demo.events);
          setReminders(demo.reminders);
          setExpenses(demo.expenses);
        }
        setIsRefreshing(false);
      },
    });
  };

  // Restore from flat file backup
  const handleRestoreBackup = async (payload: BackupPayload) => {
    try {
      if (payload.events && Array.isArray(payload.events)) {
        setEvents(payload.events);
        saveEventsToStorage(payload.events);
      }
      if (payload.expenses && Array.isArray(payload.expenses)) {
        setExpenses(payload.expenses);
        saveExpensesToStorage(payload.expenses);
      }
      if (payload.reminders && Array.isArray(payload.reminders)) {
        setReminders(payload.reminders);
        saveRemindersToStorage(payload.reminders);
      }
    } catch (err) {
      console.error('Error restaurando respaldo:', err);
    }
  };

  // Open Event Modal Helpers
  const handleOpenNewEvent = (customDate?: string) => {
    setEditingEvent(null);
    setDefaultDateForNewEvent(customDate || getTodayString());
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: EventItem) => {
    setEditingEvent(event);
    setDefaultDateForNewEvent(undefined);
    setIsEventModalOpen(true);
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (event: EventItem) => {
    setSelectedEventForPayment(event);
    setIsPaymentModalOpen(true);
  };

  // Open Receipt Modal
  const handleOpenReceiptModal = (event: EventItem) => {
    setSelectedEventForReceipt(event);
    setIsReceiptModalOpen(true);
  };

  // Open WhatsApp Messaging Modal
  const handleOpenWhatsAppModal = (event: EventItem) => {
    setSelectedEventForWhatsApp(event);
    setIsWhatsAppModalOpen(true);
  };

  // Open Contract Modal
  const handleOpenContractModal = (event: EventItem) => {
    setSelectedEventForContract(event);
    setIsContractModalOpen(true);
  };

  // Open Quote Calculator
  const handleOpenQuoteCalculator = () => {
    setIsQuoteCalculatorOpen(true);
  };

  // Apply Quote To New Event
  const handleApplyQuoteToNewEvent = (quoteData: {
    title: string;
    totalAmount: number;
    notes: string;
    guestCount: number;
    depositAmount: number;
  }) => {
    setEditingEvent({
      id: '',
      title: quoteData.title,
      clientName: '',
      clientPhone: '',
      eventType: 'Cumpleaños Infantil',
      eventDate: getTodayString(),
      eventTime: '17:00',
      totalAmount: quoteData.totalAmount,
      depositAmount: quoteData.depositAmount,
      paymentHistory: [],
      status: 'reserved',
      notes: quoteData.notes,
      location: 'Candy Salón de Eventos',
      guestCount: quoteData.guestCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setDefaultDateForNewEvent(getTodayString());
    setIsEventModalOpen(true);
  };

  // Filtered & Sorted events calculation
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return events
      .filter((ev) => {
        // Search term check
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchTitle = ev.title.toLowerCase().includes(query);
          const matchClient = ev.clientName.toLowerCase().includes(query);
          const matchLocation = ev.location?.toLowerCase().includes(query) ?? false;
          const matchDate = ev.eventDate.includes(query);
          const matchType = ev.eventType.toLowerCase().includes(query);
          if (!matchTitle && !matchClient && !matchLocation && !matchDate && !matchType) {
            return false;
          }
        }

        // Status Filter check
        const remaining = getRemainingBalance(ev);
        if (statusFilter === 'pending_balance') {
          return remaining > 0 && ev.status !== 'cancelled';
        }
        if (statusFilter === 'fully_paid') {
          return remaining === 0 && ev.status !== 'cancelled';
        }
        if (statusFilter === 'upcoming_7_days') {
          const countdown = getDaysRemaining(ev.eventDate);
          return countdown.days >= 0 && countdown.days <= 7 && ev.status !== 'cancelled';
        }
        if (statusFilter === 'this_month') {
          const evDate = parseLocalDate(ev.eventDate);
          return (
            evDate.getMonth() === currentMonth &&
            evDate.getFullYear() === currentYear &&
            ev.status !== 'cancelled'
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'date_asc') {
          return a.eventDate.localeCompare(b.eventDate);
        }
        if (sortOption === 'date_desc') {
          return b.eventDate.localeCompare(a.eventDate);
        }
        if (sortOption === 'balance_desc') {
          return getRemainingBalance(b) - getRemainingBalance(a);
        }
        if (sortOption === 'total_desc') {
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        }
        if (sortOption === 'client_asc') {
          return a.clientName.localeCompare(b.clientName);
        }
        return 0;
      });
  }, [events, searchTerm, statusFilter, sortOption]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-pink-500 selection:text-white pb-20 md:pb-0">
      {/* Top Navigation */}
      <Navbar
        onOpenNewEvent={() => handleOpenNewEvent()}
        onOpenNewExpense={handleOpenNewExpense}
        onSyncSupabase={loadData}
        isRefreshing={isRefreshing}
        onClearAllData={handleClearAllData}
        onResetDemoData={handleResetData}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenQuoteCalculator={handleOpenQuoteCalculator}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenReminders={() => handleOpenReminders()}
        pendingRemindersCount={pendingRemindersCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {viewMode === 'cashflow' ? (
          /* Cashflow & Financial View */
          <CashflowView
            events={events}
            expenses={expenses}
            currency={currency}
            onOpenNewExpense={handleOpenNewExpense}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        ) : viewMode === 'reminders' ? (
          /* Reminders & Alerts Central View */
          <RemindersView
            reminders={reminders}
            events={events}
            currency={currency}
            onAddReminder={handleAddReminder}
            onToggleComplete={handleToggleCompleteReminder}
            onDeleteReminder={handleDeleteReminder}
            onOpenEventDetail={(ev) => handleOpenReceiptModal(ev)}
          />
        ) : (
          /* Events Table or Calendar View */
          <>
            {/* KPI / Stats Header */}
            <StatsCards events={events} currency={currency} />

            {/* Filters & View Controls */}
            <EventFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortOption={sortOption}
              onSortOptionChange={setSortOption}
              totalCount={events.length}
              filteredCount={filteredEvents.length}
              onOpenNewEvent={handleOpenNewEvent}
            />

            {/* Content View: Table or Calendar */}
            {filteredEvents.length === 0 ? (
              /* Empty State */
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-600 border border-pink-100 mx-auto flex items-center justify-center mb-4">
                  <CalendarPlus className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  No se encontraron eventos
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                  {searchTerm || statusFilter !== 'all'
                    ? 'No hay eventos que coincidan con los filtros de búsqueda aplicados.'
                    : 'Comienza registrando tu primer evento con su fecha, seña y saldo a abonar en Candy Salón.'}
                </p>
                <div className="mt-5 flex items-center justify-center gap-2.5">
                  {searchTerm || statusFilter !== 'all' ? (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <FilterX className="w-3.5 h-3.5" />
                      <span>Limpiar Filtros</span>
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleOpenNewEvent()}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Evento</span>
                  </button>
                </div>
              </div>
            ) : viewMode === 'table' ? (
              /* Table / Mobile Cards View */
              <EventTable
                events={filteredEvents}
                currency={currency}
                onOpenPaymentModal={handleOpenPaymentModal}
                onOpenReceiptModal={handleOpenReceiptModal}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                onOpenReminderForEvent={(eventId) => handleOpenReminders(eventId)}
                onOpenWhatsAppModal={handleOpenWhatsAppModal}
                onOpenContractModal={handleOpenContractModal}
              />
            ) : (
              /* Monthly Calendar View */
              <CalendarView
                events={events}
                currency={currency}
                onOpenReceiptModal={handleOpenReceiptModal}
                onOpenNewEventWithDate={(dateStr) => handleOpenNewEvent(dateStr)}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Dock Bar */}
      <MobileBottomNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenReminders={() => handleOpenReminders()}
        onOpenNewEvent={() => handleOpenNewEvent()}
        pendingRemindersCount={pendingRemindersCount}
      />

      {/* Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        onDeleteEvent={handleDeleteEvent}
        initialEvent={editingEvent}
        defaultDate={defaultDateForNewEvent}
        currency={currency}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        event={selectedEventForPayment}
        currency={currency}
        onAddPayment={handleAddPayment}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        event={selectedEventForReceipt}
        currency={currency}
        onDeletePayment={handleDeletePayment}
        onOpenReminderForEvent={(eventId) => handleOpenReminders(eventId)}
        onOpenContract={handleOpenContractModal}
        onOpenWhatsAppModal={handleOpenWhatsAppModal}
      />

      {/* WhatsApp Quick Messaging Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        event={selectedEventForWhatsApp}
        currency={currency}
      />

      {/* Contract & Terms Modal */}
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        event={selectedEventForContract}
        currency={currency}
      />

      {/* Quote Calculator Modal */}
      <QuoteCalculatorModal
        isOpen={isQuoteCalculatorOpen}
        onClose={() => setIsQuoteCalculatorOpen(false)}
        currency={currency}
        onApplyQuoteToNewEvent={handleApplyQuoteToNewEvent}
      />

      <RemindersModal
        isOpen={isRemindersModalOpen}
        onClose={() => setIsRemindersModalOpen(false)}
        reminders={reminders}
        events={events}
        currency={currency}
        onAddReminder={handleAddReminder}
        onToggleComplete={handleToggleCompleteReminder}
        onDeleteReminder={handleDeleteReminder}
        initialEventId={selectedEventIdForReminder}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSaveExpense={handleSaveExpense}
        onDeleteExpense={handleDeleteExpense}
        initialExpense={editingExpense}
        events={events}
        currency={currency}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        events={events}
        expenses={expenses}
        reminders={reminders}
        onRestoreBackup={handleRestoreBackup}
      />

      {/* Global Interactive Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
      />

      {/* Subtle Footer (Desktop) */}
      <footer className="hidden md:block bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-slate-600">
            🍭 Candy Salón de Eventos • Gestión Integral & Flujo de Caja
          </span>
          <span className="text-slate-400 font-medium">
            Ingresos • Egresos • Recordatorios
          </span>
        </div>
      </footer>
    </div>
  );
}
