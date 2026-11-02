import React from 'react';
import { EventItem, ExpenseItem, ReminderItem, ViewMode } from '../types.ts';
import { getRemainingBalance, getTodayString, parseLocalDate } from '../utils/dateUtils.ts';
import { useCalandria } from '../calandria/CalandriaContext.tsx';
import { AsistenteChat, Tema, normalizar } from './AsistenteChat.tsx';

// Soporte de tecnoros.ar (se puede cambiar con VITE_SOPORTE_WHATSAPP).
const SOPORTE = ((import.meta as any).env?.VITE_SOPORTE_WHATSAPP || '5493413130336').replace(/\D/g, '');
const SALON = 'Candy Salón de Eventos';
const DAY = 86400000;

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const corta = (s: string) => parseLocalDate(s).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' });
const larga = (s: string) => parseLocalDate(s).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const CATEGORIAS: Record<string, string> = {
  pago_personal: 'Personal',
  alquiler: 'Alquiler',
  gastos_fijos: 'Gastos fijos',
  suministros: 'Suministros',
  comida: 'Comida',
  bebida: 'Bebida',
  mantenimiento: 'Mantenimiento',
  otro: 'Otros',
};

// "15/11", "15-11-2026", "el sábado", "mañana", "hoy" → YYYY-MM-DD
function fechaEn(q: string): string | null {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const m = q.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (m) {
    const dia = Number(m[1]);
    const mes = Number(m[2]) - 1;
    let anio = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : hoy.getFullYear();
    let d = new Date(anio, mes, dia);
    if (d.getMonth() !== mes) return null;
    if (!m[3] && d < hoy) d = new Date(++anio, mes, dia);
    return ymd(d);
  }
  if (q.includes('pasado manana')) return ymd(new Date(hoy.getTime() + 2 * DAY));
  if (q.includes('manana')) return ymd(new Date(hoy.getTime() + DAY));
  if (/\bhoy\b/.test(q)) return ymd(hoy);
  const i = DIAS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(q));
  if (i >= 0) {
    const falta = (i - hoy.getDay() + 7) % 7;
    return ymd(new Date(hoy.getTime() + falta * DAY));
  }
  return null;
}

interface Props {
  events: EventItem[];
  reminders: ReminderItem[];
  expenses: ExpenseItem[];
  setViewMode: (v: ViewMode) => void;
  openNewEvent: (date?: string) => void;
  openNewExpense: () => void;
  openReminders: () => void;
  openNewReminder: () => void;
  openQuote: () => void;
  openPayment: (event: EventItem) => void;
  openReceipt: (event: EventItem) => void;
  editEvent: (event: EventItem) => void;
  deleteEvent: (event: EventItem) => void;
  saveEvent: (event: EventItem) => void;
  editExpense: (expense: ExpenseItem) => void;
  deleteExpense: (expense: ExpenseItem) => void;
  editReminder: (reminder: ReminderItem) => void;
  deleteReminder: (reminder: ReminderItem) => void;
  toggleReminder: (id: string) => void;
  antesDeAccion?: () => void;
  posicion?: string;
}

export const AsistenteCandy: React.FC<Props> = ({
  events,
  reminders,
  expenses,
  setViewMode,
  openNewEvent,
  openNewExpense,
  openReminders,
  openNewReminder,
  openQuote,
  openPayment,
  openReceipt,
  editEvent,
  deleteEvent,
  saveEvent,
  editExpense,
  deleteExpense,
  editReminder,
  deleteReminder,
  toggleReminder,
  antesDeAccion,
  posicion,
}) => {
  const cal = useCalandria();
  const activos = events.filter((e) => e.status !== 'cancelled');
  const hoy = getTodayString();
  const mes = hoy.slice(0, 7);

  const ingresosMes = () => {
    let total = 0;
    let cantidad = 0;
    events.forEach((e) =>
      (e.paymentHistory || []).forEach((p) => {
        if (!p.date?.startsWith(mes)) return;
        total += p.concept === 'Devolución' ? -p.amount : p.amount;
        cantidad++;
      })
    );
    return { total, cantidad };
  };
  const gastosMes = () => expenses.filter((x) => x.date?.startsWith(mes));
  const buscarEvento = (q: string) => {
    return events.filter((e) => {
      const titulo = normalizar(e.title);
      const cliente = normalizar(e.clientName);
      return [titulo, cliente].some((term) => term.length > 0 && q.includes(term));
    });
  };
  const buscarGasto = (q: string) => {
    return expenses.filter((e) => {
      const concepto = normalizar(e.concept);
      const proveedor = normalizar(e.supplier || '');
      return [concepto, proveedor].some((term) => term.length > 0 && q.includes(term));
    });
  };

  const temas: Tema[] = [
    {
      id: 'gestionar',
      palabras: ['crear evento', 'crear un evento', 'nuevo evento', 'editar evento', 'modificar evento', 'eliminar evento', 'borrar evento', 'marcar evento realizado', 'marcar evento como realizado', 'completar evento', 'registrar pago', 'registrar un pago', 'anotar pago', 'anotar un pago', 'cargar pago', 'cargar un pago', 'ver pagos de', 'historial de pagos', 'nuevo gasto', 'crear gasto', 'crear un gasto', 'registrar egreso', 'registrar un egreso', 'editar gasto', 'eliminar gasto', 'crear recordatorio', 'crear un recordatorio', 'nuevo recordatorio', 'editar recordatorio', 'modificar recordatorio', 'eliminar recordatorio', 'borrar recordatorio', 'completar recordatorio', 'marcar recordatorio'],
      responder: (q) => {
        if (q.includes('como') || q.includes('donde')) return null;
        if (q.includes('crear evento') || q.includes('crear un evento') || q.includes('nuevo evento')) {
          const fecha = fechaEn(q);
          return {
            texto: `Voy a abrir el formulario para ${fecha ? `crear el evento el ${larga(fecha)}` : 'crear un evento nuevo'}. Revisá los datos y guardalo desde el formulario.`,
            confirmacion: { etiqueta: 'Abrir formulario', hacer: () => openNewEvent(fecha) },
          };
        }
        if (/\b(registrar|anotar|cargar) (un )?pago\b/.test(q)) {
          const coincidencias = buscarEvento(q);
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios eventos posibles. Incluí el nombre del evento o del cliente para identificar uno solo.' : 'Decime el nombre del evento o del cliente para abrir el registro de pago.' };
          }
          const evento = coincidencias[0];
          return {
            texto: `Abriré el registro de pago de "${evento.title}" (${evento.clientName}). Vas a revisar el monto, medio y concepto antes de guardarlo.`,
            confirmacion: { etiqueta: 'Continuar', hacer: () => openPayment(evento) },
          };
        }
        if (q.includes('ver pagos de') || q.includes('historial de pagos')) {
          const coincidencias = buscarEvento(q);
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios eventos posibles. Indicá el nombre completo del evento o del cliente.' : 'Decime el nombre del evento o del cliente para abrir su historial de pagos.' };
          }
          const evento = coincidencias[0];
          return {
            texto: `Abriré el comprobante y el historial de "${evento.title}". Desde allí podés revisar los pagos y solicitar una eliminación con la confirmación del sistema.`,
            confirmacion: { etiqueta: 'Abrir historial', hacer: () => openReceipt(evento) },
          };
        }
        if (q.includes('marcar evento realizado') || q.includes('marcar evento como realizado') || q.includes('completar evento')) {
          const coincidencias = buscarEvento(q);
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios eventos posibles. Indicá el nombre completo del evento o del cliente.' : 'Decime el nombre del evento o del cliente que querés marcar como realizado.' };
          }
          const evento = coincidencias[0];
          return {
            texto: `Voy a marcar "${evento.title}" como realizado. Esta acción guardará el cambio en el sistema.`,
            confirmacion: {
              etiqueta: 'Marcar como realizado',
              hacer: () => saveEvent({ ...evento, status: 'completed', updatedAt: new Date().toISOString() }),
            },
          };
        }
        if (q.includes('editar evento') || q.includes('modificar evento')) {
          const coincidencias = buscarEvento(q);
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios eventos posibles. Usá el nombre completo del evento o del cliente.' : 'Decime el nombre del evento o del cliente que querés editar.' };
          }
          const evento = coincidencias[0];
          return {
            texto: `Voy a abrir "${evento.title}" para que revises los datos y confirmes los cambios al guardar.`,
            confirmacion: { etiqueta: 'Editar evento', hacer: () => editEvent(evento) },
          };
        }
        if (q.includes('eliminar evento') || q.includes('borrar evento')) {
          const coincidencias = buscarEvento(q);
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios eventos posibles. Indicá el nombre completo del evento o del cliente.' : 'Decime el nombre del evento o del cliente que querés eliminar.' };
          }
          const evento = coincidencias[0];
          return {
            texto: `La eliminación de "${evento.title}" también puede borrar sus pagos y recordatorios asociados. Después de confirmar aquí, el sistema te pedirá una segunda confirmación.`,
            confirmacion: { etiqueta: 'Continuar con eliminación', hacer: () => deleteEvent(evento) },
          };
        }
        if (q.includes('nuevo gasto') || q.includes('crear gasto') || q.includes('crear un gasto') || q.includes('registrar egreso') || q.includes('registrar un egreso')) {
          return {
            texto: 'Abriré el formulario de egresos. Revisá el concepto, monto y categoría antes de guardar.',
            confirmacion: { etiqueta: 'Abrir formulario', hacer: openNewExpense },
          };
        }
        if (q.includes('editar gasto') || q.includes('eliminar gasto')) {
          const coincidencias = buscarGasto(q);
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios gastos posibles. Indicá el concepto o proveedor con más detalle.' : 'Decime el concepto o proveedor del gasto.' };
          }
          const gasto = coincidencias[0];
          if (q.includes('eliminar gasto')) {
            return {
              texto: `Voy a solicitar la eliminación del gasto "${gasto.concept}". El sistema pedirá confirmación antes de borrarlo.`,
              confirmacion: { etiqueta: 'Continuar con eliminación', hacer: () => deleteExpense(gasto) },
            };
          }
          return {
            texto: `Abriré "${gasto.concept}" para que revises y guardes los cambios.`,
            confirmacion: { etiqueta: 'Editar gasto', hacer: () => editExpense(gasto) },
          };
        }
        if (q.includes('crear recordatorio') || q.includes('crear un recordatorio') || q.includes('nuevo recordatorio')) {
          return {
            texto: 'Abriré el formulario del recordatorio. Revisá sus datos antes de guardarlo.',
            confirmacion: { etiqueta: 'Crear recordatorio', hacer: openNewReminder },
          };
        }
        if (q.includes('editar recordatorio') || q.includes('modificar recordatorio')) {
          const coincidencias = reminders.filter((r) => q.includes(normalizar(r.title)));
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios recordatorios posibles. Indicá el título completo.' : 'Decime el título completo del recordatorio que querés editar.' };
          }
          const recordatorio = coincidencias[0];
          return {
            texto: `Abriré "${recordatorio.title}" para que revises los datos y confirmes los cambios al guardarlo.`,
            confirmacion: { etiqueta: 'Editar recordatorio', hacer: () => editReminder(recordatorio) },
          };
        }
        if (q.includes('completar recordatorio') || q.includes('marcar recordatorio')) {
          const coincidencias = reminders.filter((r) => q.includes(normalizar(r.title)));
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios recordatorios posibles. Indicá el título completo.' : 'Decime el título completo del recordatorio que querés marcar como completado.' };
          }
          const recordatorio = coincidencias[0];
          return {
            texto: `Voy a cambiar el estado del recordatorio "${recordatorio.title}".`,
            confirmacion: { etiqueta: recordatorio.completed ? 'Reabrir recordatorio' : 'Marcar como completado', hacer: () => toggleReminder(recordatorio.id) },
          };
        }
        if (q.includes('eliminar recordatorio') || q.includes('borrar recordatorio')) {
          const coincidencias = reminders.filter((r) => {
            const titulo = normalizar(r.title);
            return q.includes(titulo);
          });
          if (coincidencias.length !== 1) {
            return { texto: coincidencias.length > 1 ? 'Encontré varios recordatorios posibles. Indicá el título completo.' : 'No pude identificar un recordatorio por su título. Abriré la lista para que lo selecciones.' , accion: { etiqueta: 'Ver recordatorios', hacer: openReminders } };
          }
          const recordatorio = coincidencias[0];
          return {
            texto: `Voy a solicitar la eliminación del recordatorio "${recordatorio.title}". El sistema pedirá confirmación antes de borrarlo.`,
            confirmacion: { etiqueta: 'Continuar con eliminación', hacer: () => deleteReminder(recordatorio) },
          };
        }
        return null;
      },
    },
    {
      id: 'fecha',
      chip: '¿Está libre el sábado?',
      palabras: ['libre', 'disponible', 'ocupad', 'fecha', 'hay evento', 'tengo evento', 'que hay', 'que tengo el', 'manana', 'hoy', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', '/'],
      responder: (q) => {
        const f = fechaEn(q);
        if (!f) return null;
        const ese = activos.filter((e) => e.eventDate === f).sort((a, b) => (a.eventTime || '').localeCompare(b.eventTime || ''));
        if (ese.length === 0) {
          return { texto: `El ${larga(f)} está libre: no hay eventos cargados.`, accion: { etiqueta: 'Reservar esa fecha', hacer: () => openNewEvent(f) } };
        }
        return {
          texto: `El ${larga(f)} ${ese.length === 1 ? 'hay 1 evento' : `hay ${ese.length} eventos`}:`,
          lineas: ese.map((e) => `${e.eventTime || 'sin hora'} · ${e.title} (${e.guestCount || '?'} invitados)`),
          accion: { etiqueta: 'Ver calendario', hacer: () => setViewMode('calendar') },
        };
      },
    },
    {
      id: 'semana',
      chip: '¿Qué eventos tengo esta semana?',
      palabras: ['semana', 'proximo', 'proximos', 'que eventos', 'agenda', 'que tengo'],
      responder: () => {
        const limite = ymd(new Date(parseLocalDate(hoy).getTime() + 7 * DAY));
        const lista = activos.filter((e) => e.eventDate >= hoy && e.eventDate <= limite).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
        if (lista.length === 0) return { texto: 'No hay eventos en los próximos 7 días.', accion: { etiqueta: 'Ver calendario', hacer: () => setViewMode('calendar') } };
        return {
          texto: `En los próximos 7 días ${lista.length === 1 ? 'hay 1 evento' : `hay ${lista.length} eventos`}:`,
          lineas: lista.map((e) => {
            const falta = getRemainingBalance(e);
            return `${corta(e.eventDate)} ${e.eventTime || ''} · ${e.title}${falta > 0 ? ` (falta cobrar ${money(falta)})` : ''}`;
          }),
          accion: { etiqueta: 'Ver calendario', hacer: () => setViewMode('calendar') },
        };
      },
    },
    {
      id: 'saldos',
      chip: '¿Quién me debe?',
      palabras: ['debe', 'deben', 'saldo', 'deuda', 'falta cobrar', 'cobrar', 'pendiente de pago'],
      responder: (q) => {
        if (q.includes('como')) return null;
        const lista = activos.filter((e) => e.status !== 'completed' && getRemainingBalance(e) > 0).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
        if (lista.length === 0) return { texto: 'Nadie debe nada: todos los eventos están pagos.' };
        const total = lista.reduce((a, e) => a + getRemainingBalance(e), 0);
        return {
          texto: `Falta cobrar ${money(total)} en ${lista.length} ${lista.length === 1 ? 'evento' : 'eventos'}:`,
          lineas: lista.slice(0, 8).map((e) => `${corta(e.eventDate)} · ${e.title}: ${money(getRemainingBalance(e))}`),
          accion: { etiqueta: 'Ver eventos con saldo', hacer: () => setViewMode('table') },
        };
      },
    },
    {
      id: 'ingresos',
      chip: '¿Cuánto entró este mes?',
      palabras: ['entro', 'ingres', 'cobre', 'cobramos', 'recaud', 'factur'],
      responder: () => {
        const { total, cantidad } = ingresosMes();
        return {
          texto: cantidad === 0 ? 'Este mes todavía no se registraron cobros.' : `Este mes entraron ${money(total)} en ${cantidad} ${cantidad === 1 ? 'pago' : 'pagos'} (señas, abonos y pagos finales).`,
          accion: { etiqueta: 'Ver flujo de caja', hacer: () => setViewMode('cashflow') },
        };
      },
    },
    {
      id: 'gastos',
      chip: '¿Cuánto gasté este mes?',
      palabras: ['gast', 'egreso', 'pague', 'pagamos', 'salida'],
      responder: (q) => {
        if (q.includes('como') || q.includes('cargo') || q.includes('anoto')) return null;
        const lista = gastosMes();
        if (lista.length === 0) return { texto: 'Este mes todavía no hay gastos cargados.', accion: { etiqueta: 'Cargar un gasto', hacer: openNewExpense } };
        const porCat = new Map<string, number>();
        lista.forEach((x) => porCat.set(x.category, (porCat.get(x.category) || 0) + x.amount));
        const total = lista.reduce((a, x) => a + x.amount, 0);
        return {
          texto: `Este mes van ${money(total)} en gastos:`,
          lineas: [...porCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, t]) => `${CATEGORIAS[c] || c}: ${money(t)}`),
          accion: { etiqueta: 'Ver flujo de caja', hacer: () => setViewMode('cashflow') },
        };
      },
    },
    {
      id: 'balance',
      palabras: ['balance', 'ganancia', 'gane', 'ganamos', 'resultado', 'neto', 'como vamos', 'como voy'],
      responder: () => {
        const ing = ingresosMes().total;
        const gas = gastosMes().reduce((a, x) => a + x.amount, 0);
        return {
          texto: `Este mes: entraron ${money(ing)} y salieron ${money(gas)}. ${ing - gas >= 0 ? `Quedan ${money(ing - gas)} a favor.` : `Van ${money(gas - ing)} abajo.`}`,
          accion: { etiqueta: 'Ver flujo de caja', hacer: () => setViewMode('cashflow') },
        };
      },
    },
    {
      id: 'pendientes',
      chip: '¿Qué tengo pendiente hoy?',
      palabras: ['pendiente', 'tengo pendiente', 'pendientes hoy', 'recordatorio', 'tarea', 'que hago', 'que tengo que hacer'],
      responder: (q) => {
        if (q.includes('como')) return null;
        const lista = reminders.filter((r) => !r.completed && r.dueDate <= hoy).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        if (lista.length === 0) return { texto: 'No hay tareas para hoy ni atrasadas. ¡Al día!', accion: { etiqueta: 'Ver recordatorios', hacer: openReminders } };
        return {
          texto: `Tenés ${lista.length} ${lista.length === 1 ? 'tarea para hoy o atrasada' : 'tareas para hoy o atrasadas'}:`,
          lineas: lista.slice(0, 8).map((r) => `${r.dueDate < hoy ? 'Atrasada · ' : ''}${r.title}`),
          accion: { etiqueta: 'Ver recordatorios', hacer: openReminders },
        };
      },
    },
    {
      id: 'como_evento',
      palabras: ['evento', 'reserva', 'reservar', 'cargar', 'crear', 'nuevo'],
      requiere: ['como', 'donde'],
      responder: () => ({
        texto: 'Para cargar un evento:',
        lineas: [
          'Tocá "Crear Evento" (o el + en el celular).',
          'Completá cliente, tipo, fecha, hora, invitados, total y seña.',
          'Al guardar, el sistema arma solo los recordatorios del evento.',
        ],
        accion: { etiqueta: 'Crear un evento', hacer: () => openNewEvent() },
      }),
    },
    {
      id: 'como_pago',
      palabras: ['pago', 'seña', 'sena', 'abono', 'cobro', 'cobrar', 'registrar', 'recibo', 'comprobante'],
      requiere: ['como', 'donde'],
      responder: () => ({
        texto: 'Para registrar un pago:',
        lineas: [
          'En la lista de eventos, tocá el botón "$" (Abonar Seña / Pago) del evento.',
          'Cargá monto, medio de pago y concepto. El saldo se actualiza solo.',
          'El recibo numerado sale del botón "Ver Comprobante de Pago".',
        ],
        accion: { etiqueta: 'Ir a eventos', hacer: () => setViewMode('table') },
      }),
    },
    {
      id: 'como_contrato',
      palabras: ['contrato', 'terminos', 'condiciones'],
      responder: () => ({
        texto: 'El contrato se arma desde cada evento:',
        lineas: [
          'Tocá el botón de contrato del evento ("Contrato y Términos de Servicio").',
          'Podés editarlo, verlo como queda o pedirle al asistente de contratos que lo complete.',
          'Después se imprime o se guarda en PDF.',
        ],
        accion: { etiqueta: 'Ir a eventos', hacer: () => setViewMode('table') },
      }),
    },
    {
      id: 'como_presupuesto',
      chip: 'Armar un presupuesto',
      palabras: ['presupuesto', 'cotiz', 'cuanto cobro', 'precio'],
      responder: () => ({
        texto: 'Con el Cotizador armás el presupuesto en un minuto y lo mandás por WhatsApp. Si el cliente acepta, lo pasás a evento con un toque.',
        accion: { etiqueta: 'Abrir cotizador', hacer: openQuote },
      }),
    },
    {
      id: 'como_gasto',
      palabras: ['gasto', 'egreso', 'cargo', 'anoto', 'cargar'],
      requiere: ['como', 'donde'],
      responder: () => ({
        texto: 'Para cargar un gasto: en "Flujo de Caja" tocá "Nuevo egreso", elegí la categoría y el monto. Si es un gasto fijo, Golondrina lo aprende y te lo propone cada mes.',
        accion: { etiqueta: 'Cargar un gasto', hacer: openNewExpense },
      }),
    },
    {
      id: 'calandria',
      chip: '¿Qué hace Golondrina?',
      palabras: ['golondrina', 'calandria', 'boton', 'automat', 'luz'],
      responder: () => ({
        texto: `Golondrina mira los eventos, los pagos y los gastos y te propone las tareas de siempre: avisar saldos, armar las tareas de la semana, cargar gastos fijos. Vos aprobás con un botón (o F9).${
          cal.suggestions.length ? `\nAhora tiene ${cal.suggestions.length} ${cal.suggestions.length === 1 ? 'tarea lista' : 'tareas listas'}.` : '\nAhora no tiene nada pendiente.'
        }`,
        accion: { etiqueta: 'Abrir Golondrina', hacer: () => cal.setPanelOpen(true), enLugar: true },
      }),
    },
    {
      id: 'saludo',
      palabras: ['hola', 'buen dia', 'buenas', 'gracias', 'que podes hacer', 'ayudame'],
      responder: (q) => ({
        texto: q.includes('gracias')
          ? '¡De nada! Cualquier cosa, acá estoy.'
          : 'Puedo decirte cómo vas y explicarte cómo se hace algo. Probá con "¿Está libre el sábado?", "¿Quién me debe?" o "¿Cómo registro una seña?", o tocá uno de los botones de abajo.',
      }),
    },
    {
      id: 'soporte',
      chip: 'Hablar con una persona',
      palabras: ['soporte', 'persona', 'humano', 'ayuda', 'problema', 'error', 'no anda', 'no funciona', 'falla'],
      responder: () => ({
        texto: 'Te atiende el equipo de tecnoros.ar por WhatsApp. Contanos qué pasó y en qué pantalla.',
        accion: {
          enLugar: true,
          etiqueta: 'Escribir a soporte',
          hacer: () => window.open(`https://wa.me/${SOPORTE}?text=${encodeURIComponent(`Hola tecnoros.ar, necesito ayuda con el sistema de ${SALON}.`)}`, '_blank', 'noopener'),
        },
      }),
    },
  ];

  return (
    <AsistenteChat
      temas={temas}
      saludo="¡Hola! Soy el asistente local de Golondrina. Puedo consultar eventos, saldos y gastos, y ayudarte a crear, editar o eliminar registros. Por ejemplo: «crear evento mañana», «registrar pago de Ana López», «editar evento Ana López» o «crear gasto». Antes de iniciar una acción te pediré confirmación; los datos se revisan en los formularios del sistema."
      soporteWhatsapp={SOPORTE}
      soporteMensaje={`Hola tecnoros.ar, necesito ayuda con el sistema de ${SALON}.`}
      colorBoton="bg-slate-900 hover:bg-slate-800 text-white ring-2 ring-cyan-400/60"
      posicion={posicion || "bottom-20 right-4 md:bottom-6 md:right-6"}
      antesDeAccion={antesDeAccion}
    />
  );
};
