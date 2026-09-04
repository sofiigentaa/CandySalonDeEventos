import { EventItem, ExpenseItem, ReminderItem } from '../types.ts';
import { getRemainingBalance } from './dateUtils.ts';

export interface BackupPayload {
  exportVersion: string;
  exportDate: string;
  exportTimestamp: number;
  appName: string;
  system: string;
  summary: {
    totalEvents: number;
    totalExpenses: number;
    totalReminders: number;
    totalContracted: number;
    totalCollected: number;
    totalPendingBalance: number;
    totalExpensesPaid: number;
    netProfit: number;
  };
  events: EventItem[];
  expenses: ExpenseItem[];
  reminders: ReminderItem[];
}

/**
 * Downloads a flat file to the user's computer
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a full JSON Flat Backup file for contingency
 */
export function exportFullJsonBackup(
  events: EventItem[],
  expenses: ExpenseItem[],
  reminders: ReminderItem[]
): BackupPayload {
  const totalContracted = events.reduce((acc, evt) => acc + (Number(evt.totalAmount) || 0), 0);
  const totalCollected = events.reduce((acc, evt) => {
    const fromDeposit = Number(evt.depositAmount) || 0;
    const fromHistory = (evt.paymentHistory || []).reduce((pAcc, p) => pAcc + (Number(p.amount) || 0), 0);
    return acc + Math.max(fromDeposit, fromHistory);
  }, 0);
  const totalPendingBalance = events.reduce((acc, evt) => acc + getRemainingBalance(evt), 0);
  const totalExpensesPaid = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  const netProfit = totalCollected - totalExpensesPaid;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const payload: BackupPayload = {
    exportVersion: '1.0',
    exportDate: now.toISOString(),
    exportTimestamp: now.getTime(),
    appName: 'Candy Salón de Eventos',
    system: 'Sistema de Gestión Integral de Eventos',
    summary: {
      totalEvents: events.length,
      totalExpenses: expenses.length,
      totalReminders: reminders.length,
      totalContracted,
      totalCollected,
      totalPendingBalance,
      totalExpensesPaid,
      netProfit,
    },
    events,
    expenses,
    reminders,
  };

  const jsonContent = JSON.stringify(payload, null, 2);
  const filename = `respaldo-candy-salon-contingencia-${dateStr}.json`;
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8');

  return payload;
}

/**
 * Generates and downloads a readable plain text contingency report (.txt)
 * Perfect for offline reading in notepad, printing, or sending during internet/system emergencies.
 */
export function exportPlainTextContingencyReport(
  events: EventItem[],
  expenses: ExpenseItem[],
  reminders: ReminderItem[]
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const totalContracted = events.reduce((acc, evt) => acc + (Number(evt.totalAmount) || 0), 0);
  const totalCollected = events.reduce((acc, evt) => {
    const fromDeposit = Number(evt.depositAmount) || 0;
    const fromHistory = (evt.paymentHistory || []).reduce((pAcc, p) => pAcc + (Number(p.amount) || 0), 0);
    return acc + Math.max(fromDeposit, fromHistory);
  }, 0);
  const totalPending = events.reduce((acc, evt) => acc + getRemainingBalance(evt), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

  let report = `========================================================================\n`;
  report += `   CANDY SALÓN DE EVENTOS - REPORTE PLANO DE CONTINGENCIA (OFFLINE)\n`;
  report += `========================================================================\n`;
  report += `Fecha de Generación : ${dateStr} - ${timeStr}\n`;
  report += `Propósito           : Respaldo ante caídas de servidor, internet o contingencia\n`;
  report += `Total de Eventos    : ${events.length}\n`;
  report += `Total de Gastos     : ${expenses.length}\n`;
  report += `Total Recordatorios : ${reminders.length}\n`;
  report += `------------------------------------------------------------------------\n`;
  report += `RESUMEN FINANCIERO GENERAL:\n`;
  report += `• Facturación Total Contratada : $ARS ${totalContracted.toLocaleString('es-AR')}\n`;
  report += `• Total Cobrado Efectivo/Señas : $ARS ${totalCollected.toLocaleString('es-AR')}\n`;
  report += `• Saldo Pendiente por Cobrar   : $ARS ${totalPending.toLocaleString('es-AR')}\n`;
  report += `• Total Egresos Operativos     : $ARS ${totalExpenses.toLocaleString('es-AR')}\n`;
  report += `• Beneficio Neto Resultante    : $ARS ${(totalCollected - totalExpenses).toLocaleString('es-AR')}\n`;
  report += `========================================================================\n\n`;

  report += `========================================================================\n`;
  report += `1. CRONOGRAMA Y FICHA DETALLADA DE EVENTOS (${events.length} Eventos)\n`;
  report += `========================================================================\n\n`;

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));

  sortedEvents.forEach((evt, idx) => {
    const remaining = getRemainingBalance(evt);
    report += `[EVENTO #${idx + 1}] -----------------------------------------------------\n`;
    report += `Título Evento   : ${evt.title}\n`;
    report += `Tipo de Fiesta  : ${evt.eventType}\n`;
    report += `Fecha y Hora    : ${evt.eventDate} a las ${evt.eventTime || 'A confirmar'} hs\n`;
    report += `Cliente Titular : ${evt.clientName}\n`;
    report += `Teléfono/WhatsApp: ${evt.clientPhone || 'No registrado'}\n`;
    report += `Email           : ${evt.clientEmail || 'No registrado'}\n`;
    report += `Salón/Ubicación : ${evt.location || 'Salón Principal'}\n`;
    report += `Invitados       : ${evt.guestCount || 0} personas\n`;
    report += `Presupuesto     : $ARS ${(Number(evt.totalAmount) || 0).toLocaleString('es-AR')}\n`;
    report += `Seña Cobrada    : $ARS ${(Number(evt.depositAmount) || 0).toLocaleString('es-AR')}\n`;
    report += `Saldo Pendiente : $ARS ${remaining.toLocaleString('es-AR')} ${remaining === 0 ? '[100% ABONADO / AL DÍA]' : '[DEBE SALDO]'}\n`;
    
    if (evt.paymentHistory && evt.paymentHistory.length > 0) {
      report += `Historial Pagos :\n`;
      evt.paymentHistory.forEach((p, pIdx) => {
        report += `   (${pIdx + 1}) Fecha: ${p.date} | Monto: $ARS ${Number(p.amount).toLocaleString('es-AR')} | Medio: ${p.method || 'Efectivo'} | Comp: ${p.receiptNumber || 'N/A'}\n`;
      });
    }

    if (evt.notes) {
      report += `Notas / Menús   : ${evt.notes}\n`;
    }
    report += `\n`;
  });

  report += `========================================================================\n`;
  report += `2. RECORDATORIOS Y TAREAS PENDIENTES (${reminders.length} Recordatorios)\n`;
  report += `========================================================================\n\n`;

  reminders.forEach((rem, idx) => {
    report += `[TAREA #${idx + 1}] ${rem.completed ? '[✓ COMPLETADA]' : '[PENDIENTE]'}\n`;
    report += `Título     : ${rem.title}\n`;
    report += `Fecha/Hora : ${rem.dueDate} ${rem.dueTime || ''}\n`;
    report += `Categoría  : ${rem.category}\n`;
    report += `Prioridad  : ${rem.priority || 'medium'}\n`;
    if (rem.clientName) report += `Cliente    : ${rem.clientName} (Tel: ${rem.clientPhone || 'N/A'})\n`;
    if (rem.notes) report += `Notas      : ${rem.notes}\n`;
    report += `\n`;
  });

  report += `========================================================================\n`;
  report += `3. LIBRO DE GASTOS Y EGRESOS (${expenses.length} Egresos)\n`;
  report += `========================================================================\n\n`;

  expenses.forEach((exp, idx) => {
    report += `[EGRESO #${idx + 1}] Fecha: ${exp.date} | Rubro: ${exp.category} | Monto: $ARS ${Number(exp.amount).toLocaleString('es-AR')} | Medio: ${exp.paymentMethod || 'Efectivo'}\n`;
    report += `   Concepto: ${exp.concept} ${exp.receiptNumber ? `(Comp: ${exp.receiptNumber})` : ''}\n`;
  });

  report += `\n========================================================================\n`;
  report += `FIN DEL REPORTE PLANO DE CONTINGENCIA - CANDY SALÓN DE EVENTOS\n`;
  report += `========================================================================\n`;

  const filename = `reporte-plano-candy-salon-${now.toISOString().split('T')[0]}.txt`;
  downloadFile(report, filename, 'text/plain;charset=utf-8');
}

/**
 * Exports events as a clean CSV table for Excel
 */
export function exportEventsCSV(events: EventItem[]) {
  const headers = [
    'ID',
    'Titulo',
    'Tipo Evento',
    'Fecha',
    'Hora',
    'Cliente',
    'Telefono',
    'Email',
    'Salon',
    'Invitados',
    'Total Presupuesto',
    'Total Seña Abonada',
    'Saldo Pendiente',
    'Estado',
    'Observaciones',
  ];

  const rows = events.map((evt) => [
    `"${evt.id}"`,
    `"${(evt.title || '').replace(/"/g, '""')}"`,
    `"${evt.eventType}"`,
    `"${evt.eventDate}"`,
    `"${evt.eventTime || ''}"`,
    `"${(evt.clientName || '').replace(/"/g, '""')}"`,
    `"${evt.clientPhone || ''}"`,
    `"${evt.clientEmail || ''}"`,
    `"${(evt.location || '').replace(/"/g, '""')}"`,
    `${evt.guestCount || 0}`,
    `${evt.totalAmount || 0}`,
    `${evt.depositAmount || 0}`,
    `${getRemainingBalance(evt)}`,
    `"${evt.status}"`,
    `"${(evt.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const now = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `eventos-candy-salon-${now}.csv`, 'text/csv;charset=utf-8');
}
