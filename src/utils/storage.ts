import { EventItem, ReminderItem, ExpenseItem } from '../types';

const STORAGE_KEY = 'gestor_eventos_candy_data_v2';
const REMINDERS_STORAGE_KEY = 'gestor_eventos_candy_reminders_v1';

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt-1',
    title: 'Boda Sofía & Mateo',
    clientName: 'Sofía Genta',
    clientPhone: '+54 9 11 4589-2231',
    clientEmail: 'sofiigenta@gmail.com',
    eventType: 'Bautismo',
    eventDate: '2026-09-12',
    eventTime: '19:30',
    location: 'Candy Salón de Eventos',
    guestCount: 140,
    totalAmount: 850000,
    depositAmount: 350000,
    paymentHistory: [
      {
        id: 'pay-1',
        date: '2026-07-10',
        amount: 350000,
        method: 'Transferencia',
        concept: 'Seña inicial',
        notes: 'Reserva de fecha congelada en Candy Salón. Comprobante #9482',
        receiptNumber: 'REC-001',
      },
      {
        id: 'pay-2',
        date: '2026-08-15',
        amount: 200000,
        method: 'Transferencia',
        concept: 'Abono parcial',
        notes: 'Segundo pago pactado a 30 días del evento',
        receiptNumber: 'REC-002',
      },
    ],
    status: 'deposit_paid',
    notes: 'Incluye servicio de barra libre premium y DJ. Pendiente coordinar menú vegetariano y mesa dulce Candy.',
    createdAt: '2026-07-10T14:30:00.000Z',
    updatedAt: '2026-08-15T10:20:00.000Z',
  },
  {
    id: 'evt-2',
    title: 'Cumpleaños 15 Años Martina',
    clientName: 'Marcela Rodríguez',
    clientPhone: '+54 9 11 6321-7744',
    clientEmail: 'marcela.rod@gmail.com',
    eventType: 'Cumpleaños',
    eventDate: '2026-08-29',
    eventTime: '21:00',
    location: 'Candy Salón de Eventos',
    guestCount: 110,
    totalAmount: 620000,
    depositAmount: 200000,
    paymentHistory: [
      {
        id: 'pay-3',
        date: '2026-06-01',
        amount: 200000,
        method: 'Mercado Pago',
        concept: 'Seña inicial',
        notes: 'Seña 30% confirmación de fecha en Candy Salón',
        receiptNumber: 'REC-003',
      },
    ],
    status: 'deposit_paid',
    notes: 'Temática Neon Party. Candy Bar temático y cabina de fotos 360.',
    createdAt: '2026-06-01T11:00:00.000Z',
    updatedAt: '2026-06-01T11:00:00.000Z',
  },
  {
    id: 'evt-3',
    title: 'Comunión de Benjamín',
    clientName: 'Federico Bal',
    clientPhone: '+54 9 11 8899-4411',
    clientEmail: 'fbal@techlab.io',
    eventType: 'Comunión',
    eventDate: '2026-09-04',
    eventTime: '12:30',
    location: 'Candy Salón de Eventos',
    guestCount: 65,
    totalAmount: 480000,
    depositAmount: 480000,
    paymentHistory: [
      {
        id: 'pay-4',
        date: '2026-08-01',
        amount: 240000,
        method: 'Transferencia',
        concept: 'Seña inicial',
        notes: 'Factura A #003-8841',
        receiptNumber: 'REC-004',
      },
      {
        id: 'pay-5',
        date: '2026-08-20',
        amount: 240000,
        method: 'Transferencia',
        concept: 'Pago final',
        notes: 'Cancelación total contra entrega de contrato',
        receiptNumber: 'REC-005',
      },
    ],
    status: 'fully_paid',
    notes: 'Finger food gourmet + coffee break extendido. 10 menús celíacos.',
    createdAt: '2026-08-01T09:15:00.000Z',
    updatedAt: '2026-08-20T16:40:00.000Z',
  },
  {
    id: 'evt-4',
    title: 'Cumpleaños 50 de Carlos',
    clientName: 'Silvia Rossi',
    clientPhone: '+54 9 11 3344-9912',
    clientEmail: 'silviarossi@outlook.com',
    eventType: 'Cumpleaños',
    eventDate: '2026-09-26',
    eventTime: '13:00',
    location: 'Candy Salón de Eventos',
    guestCount: 50,
    totalAmount: 390000,
    depositAmount: 120000,
    paymentHistory: [
      {
        id: 'pay-6',
        date: '2026-08-10',
        amount: 120000,
        method: 'Efectivo',
        concept: 'Seña inicial',
        notes: 'Recibido en mano en oficina de Candy Salón',
        receiptNumber: 'REC-006',
      },
    ],
    status: 'deposit_paid',
    notes: 'Asado criollo con barra de tragos. Música en vivo.',
    createdAt: '2026-08-10T17:00:00.000Z',
    updatedAt: '2026-08-10T17:00:00.000Z',
  },
  {
    id: 'evt-5',
    title: 'Baby Shower Bautista',
    clientName: 'Camila Morales',
    clientPhone: '+54 9 11 7766-3322',
    clientEmail: 'camimorales@gmail.com',
    eventType: 'Baby Shower',
    eventDate: '2026-10-03',
    eventTime: '16:00',
    location: 'Candy Salón de Eventos',
    guestCount: 35,
    totalAmount: 220000,
    depositAmount: 80000,
    paymentHistory: [
      {
        id: 'pay-7',
        date: '2026-08-22',
        amount: 80000,
        method: 'Mercado Pago',
        concept: 'Seña inicial',
        notes: 'Seña reserva de fecha',
        receiptNumber: 'REC-007',
      },
    ],
    status: 'deposit_paid',
    notes: 'Candy bar temático ositos celestes y dorados. Torta principal incluida.',
    createdAt: '2026-08-22T10:00:00.000Z',
    updatedAt: '2026-08-22T10:00:00.000Z',
  },
];

export const INITIAL_REMINDERS: ReminderItem[] = [
  {
    id: 'rem-1',
    eventId: 'evt-2',
    eventTitle: 'Cumpleaños 15 Años Martina',
    clientName: 'Marcela Rodríguez',
    clientPhone: '+54 9 11 6321-7744',
    title: 'Cobrar saldo restante $420.000 (15 Años Martina)',
    dueDate: '2026-08-25',
    dueTime: '11:00',
    category: 'cobro_saldo',
    completed: false,
    priority: 'high',
    notes: 'Recordar que el pago final debe estar saldado antes del evento el 29 de Agosto.',
    createdAt: '2026-08-20T10:00:00.000Z',
  },
  {
    id: 'rem-2',
    eventId: 'evt-1',
    eventTitle: 'Boda Sofía & Mateo',
    clientName: 'Sofía Genta',
    clientPhone: '+54 9 11 4589-2231',
    title: 'Confirmar lista definitiva de invitados y menú especial',
    dueDate: '2026-09-02',
    dueTime: '17:00',
    category: 'confirmar_invitados',
    completed: false,
    priority: 'medium',
    notes: 'Definir cantidad final de cubiertos y platos celíacos/vegetarianos.',
    createdAt: '2026-08-21T14:00:00.000Z',
  },
  {
    id: 'rem-3',
    eventId: 'evt-5',
    eventTitle: 'Baby Shower Bautista',
    clientName: 'Camila Morales',
    clientPhone: '+54 9 11 7766-3322',
    title: 'Preparar detalles de Candy Bar y decoración personalizada',
    dueDate: '2026-09-28',
    dueTime: '15:30',
    category: 'decoracion_candy',
    completed: false,
    priority: 'low',
    notes: 'Temática ositos celestes y dorados con souvenirs.',
    createdAt: '2026-08-23T09:00:00.000Z',
  },
  {
    id: 'rem-4',
    eventId: 'evt-3',
    eventTitle: 'Catering Aniversario Empresa TechLab',
    clientName: 'Federico Bal',
    clientPhone: '+54 9 11 8899-4411',
    title: 'Coordinar prueba de sonido y proyector con el DJ',
    dueDate: '2026-09-03',
    dueTime: '10:00',
    category: 'proveedores_catering',
    completed: true,
    priority: 'medium',
    notes: 'Todo listo con el técnico del salón Candy.',
    createdAt: '2026-08-18T12:00:00.000Z',
  },
];

const EXPENSES_STORAGE_KEY = 'gestor_eventos_candy_expenses_v1';

export const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp-1',
    date: '2026-08-05',
    amount: 180000,
    category: 'alquiler',
    concept: 'Alquiler mensual Salón Principal y Quincho',
    paymentMethod: 'Transferencia',
    supplier: 'Inmobiliaria del Parque',
    receiptNumber: 'ALQ-08-2026',
    notes: 'Pago canon locativo mensual mes Agosto',
    createdAt: '2026-08-05T10:00:00.000Z',
  },
  {
    id: 'exp-2',
    date: '2026-08-08',
    amount: 45000,
    category: 'gastos_fijos',
    concept: 'Servicio de Electricidad / Edenor',
    paymentMethod: 'Tarjeta',
    supplier: 'Edenor S.A.',
    receiptNumber: 'FACT-9921',
    notes: 'Consumo aires acondicionados e iluminación pista',
    createdAt: '2026-08-08T11:30:00.000Z',
  },
  {
    id: 'exp-3',
    date: '2026-08-10',
    amount: 95000,
    category: 'pago_personal',
    concept: 'Pago personal: 3 Mozos y 1 Encargado de Salón',
    paymentMethod: 'Efectivo',
    eventId: 'evt-4',
    eventTitle: 'Cumpleaños 50 de Carlos',
    supplier: 'Equipo Mozos Candy Salón',
    receiptNumber: 'REC-MOZOS-0810',
    notes: 'Pago por turno de evento nocturno en efectivo',
    createdAt: '2026-08-10T23:30:00.000Z',
  },
  {
    id: 'exp-4',
    date: '2026-08-12',
    amount: 72000,
    category: 'comida',
    concept: 'Insumos gastronómicos y catering carnes premium',
    paymentMethod: 'Transferencia',
    eventId: 'evt-4',
    eventTitle: 'Cumpleaños 50 de Carlos',
    supplier: 'Frigorífico Central',
    receiptNumber: 'FC-A-4432',
    notes: 'Corte asado criollo y empanadas para 50 personas',
    createdAt: '2026-08-12T09:15:00.000Z',
  },
  {
    id: 'exp-5',
    date: '2026-08-14',
    amount: 58000,
    category: 'bebida',
    concept: 'Pack bebidas, cervezas, vinos y hielo',
    paymentMethod: 'Transferencia',
    eventId: 'evt-4',
    eventTitle: 'Cumpleaños 50 de Carlos',
    supplier: 'Distribuidora Bebidas El Trébol',
    receiptNumber: 'REM-8821',
    notes: 'Gaseosas primera marca, barra libre y 10 bolsas de hielo',
    createdAt: '2026-08-14T15:00:00.000Z',
  },
  {
    id: 'exp-6',
    date: '2026-08-16',
    amount: 32000,
    category: 'suministros',
    concept: 'Cotillón, vajilla descartable y artículos de limpieza',
    paymentMethod: 'Efectivo',
    supplier: 'Cotillón Fantasía & Papelera',
    receiptNumber: 'TKT-1092',
    notes: 'Servilletas, vasos biodegradables, manteles y detergente industrial',
    createdAt: '2026-08-16T16:20:00.000Z',
  },
  {
    id: 'exp-7',
    date: '2026-08-18',
    amount: 28000,
    category: 'gastos_fijos',
    concept: 'Internet Fibra Óptica 500MB + Seguro de Responsabilidad Civil',
    paymentMethod: 'Tarjeta',
    supplier: 'Telecom & La Segunda Seguros',
    receiptNumber: 'POL-3321',
    notes: 'Póliza mensual cobertura eventos y salón',
    createdAt: '2026-08-18T09:00:00.000Z',
  },
  {
    id: 'exp-8',
    date: '2026-08-20',
    amount: 85000,
    category: 'pago_personal',
    concept: 'Honorarios DJ y Sonidista evento corporativo',
    paymentMethod: 'Transferencia',
    eventId: 'evt-3',
    eventTitle: 'Catering Aniversario Empresa TechLab',
    supplier: 'DJ Lucas Sonido Pro',
    receiptNumber: 'FAC-B-112',
    notes: 'Operador técnico proyector y música lounge',
    createdAt: '2026-08-20T18:00:00.000Z',
  },
  {
    id: 'exp-9',
    date: '2026-08-22',
    amount: 35000,
    category: 'mantenimiento',
    concept: 'Service y limpieza de filtros de aire acondicionado central',
    paymentMethod: 'Efectivo',
    supplier: 'Climatización San Martín',
    receiptNumber: 'REC-SERV-91',
    notes: 'Mantenimiento preventivo salón principal',
    createdAt: '2026-08-22T12:00:00.000Z',
  },
];

export function loadEventsFromStorage(): EventItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVENTS));
      return INITIAL_EVENTS;
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return INITIAL_EVENTS;
    }
    // Clean up any legacy sub-locations
    const sanitized = parsed.map((event: EventItem) => {
      if (event.location && event.location.toLowerCase().includes('candy')) {
        return { ...event, location: 'Candy Salón de Eventos' };
      }
      return event;
    });
    return sanitized;
  } catch (error) {
    console.error('Error loading events from storage:', error);
    return INITIAL_EVENTS;
  }
}

export function saveEventsToStorage(events: EventItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Error saving events to storage:', error);
  }
}

export function loadRemindersFromStorage(): ReminderItem[] {
  try {
    const data = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(INITIAL_REMINDERS));
      return INITIAL_REMINDERS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_REMINDERS;
  } catch (error) {
    console.error('Error loading reminders from storage:', error);
    return INITIAL_REMINDERS;
  }
}

export function saveRemindersToStorage(reminders: ReminderItem[]): void {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error('Error saving reminders to storage:', error);
  }
}

export function loadExpensesFromStorage(): ExpenseItem[] {
  try {
    const data = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(INITIAL_EXPENSES));
      return INITIAL_EXPENSES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_EXPENSES;
  } catch (error) {
    console.error('Error loading expenses from storage:', error);
    return INITIAL_EXPENSES;
  }
}

export function saveExpensesToStorage(expenses: ExpenseItem[]): void {
  try {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.error('Error saving expenses to storage:', error);
  }
}

export function resetToDemoData(): { events: EventItem[]; reminders: ReminderItem[]; expenses: ExpenseItem[] } {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVENTS));
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(INITIAL_REMINDERS));
  localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(INITIAL_EXPENSES));
  return { events: INITIAL_EVENTS, reminders: INITIAL_REMINDERS, expenses: INITIAL_EXPENSES };
}

