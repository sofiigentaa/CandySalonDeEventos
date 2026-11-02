import 'dotenv/config';
import express from 'express';
import path from 'path';
import {
  getAllEventsFromDb,
  getEventById,
  saveEventToDb,
  deleteEventFromDb,
  addPaymentToDb,
  getAllRemindersFromDb,
  saveReminderToDb,
  deleteReminderFromDb,
  getAllExpensesFromDb,
  saveExpenseToDb,
  deleteExpenseFromDb,
  clearAllFromDb,
  loadDemoData,
  ensureTablesExist,
  isMemoryMode,
  OwnershipConflictError,
} from './src/db/eventsService.ts';
import { appendCalandriaLog, ensureCalandriaTable, getCalandriaLog, validateLogInput } from './src/server/calandriaLog.ts';
import { generateContractWithGemini, chatWithContractAssistant } from './src/utils/aiContractService.ts';
import { assertSupabaseConfig, isProduction, requireSession } from './src/server/session.ts';
import {
  ValidationError,
  findBookingConflict,
  validateEvent,
  validateExpense,
  validatePayment,
  validatePaymentForEvent,
  validateReminder,
} from './src/server/validation.ts';

// Respuesta de error: el detalle técnico queda en el log del servidor, nunca
// llega al navegador en producción.
function sendError(res: express.Response, error: unknown, fallback: string) {
  if (error instanceof OwnershipConflictError) {
    return res.status(409).json({ error: error.message });
  }
  if (error instanceof ValidationError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(fallback, error);
  const detail = !isProduction() && error instanceof Error ? ` (${error.message})` : '';
  return res.status(500).json({ error: `${fallback}${detail}` });
}

// "Vaciar todo" y "Restablecer demo" solo existen si se habilitan a propósito
// (por ejemplo en la demo pública). En el sistema de un cliente quedan apagados.
const demoToolsEnabled = () => !isProduction() || process.env.ALLOW_DEMO_RESET === 'true';

async function startServer() {
  assertSupabaseConfig();
  if (isProduction() && isMemoryMode()) {
    throw new Error('Configurá DATABASE_URL para usar PostgreSQL en producción.');
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3005;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    if (isProduction()) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Tablas y (si se pidió) datos de ejemplo. Si la base no responde, el
  // servidor no arranca: es mejor que Render muestre el error a que la app
  // "funcione" sin guardar nada.
  await ensureTablesExist();
  await ensureCalandriaTable();
  console.log(isMemoryMode() ? 'Modo demo: datos en memoria (sin base de datos).' : 'Base de datos PostgreSQL conectada.');

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), database: isMemoryMode() ? 'memory' : 'postgres', demoTools: demoToolsEnabled() });
  });

  // Todo lo que sigue exige sesión iniciada.
  app.use('/api', requireSession);

  app.get('/api/events', async (req, res) => {
    try {
      res.json(await getAllEventsFromDb(req.user!.id));
    } catch (error) {
      sendError(res, error, 'No se pudieron leer los eventos.');
    }
  });

  app.post('/api/events', async (req, res) => {
    try {
      const event = validateEvent(req.body);
      const all = await getAllEventsFromDb(req.user!.id);
      const conflict = findBookingConflict(all, event);
      if (conflict) {
        return res.status(409).json({
          error: `Ese día y horario ya está reservado: "${conflict.title}" (${conflict.clientName}).`,
          conflictId: conflict.id,
        });
      }
      const saved = await saveEventToDb(event, req.user!.id);
      res.json({ success: true, event: saved });
    } catch (error) {
      sendError(res, error, 'No se pudo guardar el evento.');
    }
  });

  app.delete('/api/events/:id', async (req, res) => {
    try {
      await deleteEventFromDb(req.params.id, req.user!.id);
      res.json({ success: true, deletedId: req.params.id });
    } catch (error) {
      sendError(res, error, 'No se pudo borrar el evento.');
    }
  });

  app.post('/api/events/:id/payments', async (req, res) => {
    try {
      const payment = validatePayment(req.body);
      const ev = await getEventById(req.params.id, req.user!.id);
      if (!ev) return res.status(404).json({ error: 'El evento no existe.' });
      validatePaymentForEvent(ev, payment);
      const saved = await addPaymentToDb(req.params.id, payment, req.user!.id);
      res.json({ success: true, event: saved, payment: saved?.paymentHistory?.find((p) => p.id === payment.id) });
    } catch (error) {
      sendError(res, error, 'No se pudo registrar el pago.');
    }
  });

  app.get('/api/reminders', async (req, res) => {
    try {
      res.json(await getAllRemindersFromDb(req.user!.id));
    } catch (error) {
      sendError(res, error, 'No se pudieron leer los recordatorios.');
    }
  });

  app.post('/api/reminders', async (req, res) => {
    try {
      const reminder = validateReminder(req.body);
      if (reminder.eventId && !(await getEventById(reminder.eventId, req.user!.id))) {
        return res.status(404).json({ error: 'El evento relacionado no existe.' });
      }
      await saveReminderToDb(reminder, req.user!.id);
      res.json({ success: true, reminder });
    } catch (error) {
      sendError(res, error, 'No se pudo guardar el recordatorio.');
    }
  });

  app.delete('/api/reminders/:id', async (req, res) => {
    try {
      await deleteReminderFromDb(req.params.id, req.user!.id);
      res.json({ success: true, deletedId: req.params.id });
    } catch (error) {
      sendError(res, error, 'No se pudo borrar el recordatorio.');
    }
  });

  app.get('/api/expenses', async (req, res) => {
    try {
      res.json(await getAllExpensesFromDb(req.user!.id));
    } catch (error) {
      sendError(res, error, 'No se pudieron leer los egresos.');
    }
  });

  app.post('/api/expenses', async (req, res) => {
    try {
      const expense = validateExpense(req.body);
      if (expense.eventId && !(await getEventById(expense.eventId, req.user!.id))) {
        return res.status(404).json({ error: 'El evento relacionado no existe.' });
      }
      await saveExpenseToDb(expense, req.user!.id);
      res.json({ success: true, expense });
    } catch (error) {
      sendError(res, error, 'No se pudo guardar el egreso.');
    }
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    try {
      await deleteExpenseFromDb(req.params.id, req.user!.id);
      res.json({ success: true, deletedId: req.params.id });
    } catch (error) {
      sendError(res, error, 'No se pudo borrar el egreso.');
    }
  });

  // Golondrina: registro sellado (solo se agrega; nunca se modifica ni se borra).
  app.get('/api/calandria/log', async (req, res) => {
    try {
      res.json(await getCalandriaLog(req.user!.id));
    } catch (error) {
      sendError(res, error, 'No se pudo leer el registro de Golondrina.');
    }
  });

  app.post('/api/calandria/log', async (req, res) => {
    try {
      res.json({ success: true, entry: await appendCalandriaLog(validateLogInput(req.body), req.user!.id) });
    } catch (error) {
      sendError(res, error, 'No se pudo registrar la acción de Golondrina.');
    }
  });

  // IA para contratos (Gemini). Requiere sesión: así nadie de afuera gasta la clave.
  app.post('/api/ai/generate-contract', async (req, res) => {
    try {
      const { event, focusTone, customInstructions, currency } = req.body || {};
      if (!event) return res.status(400).json({ error: 'Faltan los datos del evento para redactar el contrato' });
      const result = await generateContractWithGemini({ event, focusTone, customInstructions, currency: currency || '$' });
      res.json({ success: true, contractText: result.contractText, source: result.source });
    } catch (error) {
      sendError(res, error, 'Error al generar el contrato con IA.');
    }
  });

  app.post('/api/ai/contract-assistant-chat', async (req, res) => {
    try {
      const { event, currency, contractText, history, message } = req.body || {};
      if (!event || !message) return res.status(400).json({ error: 'Faltan datos para el asistente de contrato' });
      const result = await chatWithContractAssistant(
        event,
        currency || '$',
        String(contractText || '').slice(0, 20000),
        Array.isArray(history) ? history.slice(-20) : [],
        String(message).slice(0, 2000)
      );
      res.json({ success: true, ...result });
    } catch (error) {
      sendError(res, error, 'Error en el asistente de IA.');
    }
  });

  app.post('/api/clear-all', async (req, res) => {
    if (!demoToolsEnabled()) return res.status(403).json({ error: 'Función deshabilitada en este sistema.' });
    try {
      await clearAllFromDb(req.user!.id);
      res.json({ success: true, events: [], reminders: [], expenses: [] });
    } catch (error) {
      sendError(res, error, 'No se pudo vaciar la base.');
    }
  });

  app.post('/api/reset-demo', async (req, res) => {
    if (!demoToolsEnabled()) return res.status(403).json({ error: 'Función deshabilitada en este sistema.' });
    try {
      await loadDemoData(req.user!.id);
      res.json({
        success: true,
        events: await getAllEventsFromDb(req.user!.id),
        reminders: await getAllRemindersFromDb(req.user!.id),
        expenses: await getAllExpensesFromDb(req.user!.id),
      });
    } catch (error) {
      sendError(res, error, 'No se pudieron restablecer los datos de ejemplo.');
    }
  });

  if (!isProduction()) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Candy Salón Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('El servidor no pudo arrancar:', error);
  process.exit(1);
});
