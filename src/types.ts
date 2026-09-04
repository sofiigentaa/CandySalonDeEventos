export type EventType =
  | 'Cumpleaños'
  | 'Bautismo'
  | 'Baby Shower'
  | 'Comunión'
  | 'Otro';

export type PaymentMethod =
  | 'Efectivo'
  | 'Tarjeta'
  | 'Transferencia'
  | 'Mercado Pago'
  | 'Cheque'
  | 'Otro';

export type PaymentConcept =
  | 'Seña inicial'
  | 'Abono parcial'
  | 'Pago final'
  | 'Adicional'
  | 'Devolución'
  | 'Ingreso directo';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  concept: PaymentConcept;
  notes?: string;
  receiptNumber?: string;
}

export type EventStatus =
  | 'no_deposit'      // Sin seña
  | 'deposit_paid'    // Con seña / Pago parcial
  | 'fully_paid'      // Totalmente abonado (saldo $0)
  | 'completed'       // Realizado
  | 'cancelled';      // Cancelado

export type ExpenseCategory =
  | 'pago_personal'   // Pago personal: mozos, animadores, camareras, DJ, sonido, limpieza, cocineros
  | 'alquiler'        // Alquiler: salón, local, expensas
  | 'gastos_fijos'    // Gastos fijos: luz, gas, agua, internet, impuestos, seguros
  | 'suministros'     // Suministros: cotillón, vajilla descartable, mantelería, globos, limpieza
  | 'comida'          // Comida: catering, materias primas, tortas, carnes, repostería
  | 'bebida'          // Bebida: gaseosas, barra libre, jugos, vinos, cervezas, hielo
  | 'mantenimiento'   // Mantenimiento y reparaciones del salón
  | 'otro';           // Otros egresos

export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  concept: string;
  paymentMethod: PaymentMethod;
  eventId?: string; // Opcional si está asociado a un evento específico
  eventTitle?: string;
  supplier?: string; // Proveedor / Destinatario / Empleado
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export type ReminderCategory =
  | 'cobro_saldo'
  | 'confirmar_invitados'
  | 'proveedores_catering'
  | 'decoracion_candy'
  | 'aviso_cliente'
  | 'otro';

export type ReminderPriority = 'high' | 'medium' | 'low';

export interface ReminderItem {
  id: string;
  eventId?: string; // Optional: linked to a specific event
  eventTitle?: string;
  clientName?: string;
  clientPhone?: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  category: ReminderCategory;
  completed: boolean;
  priority: ReminderPriority;
  notes?: string;
  createdAt: string;
}

export interface EventContractedService {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
}

export interface EventItem {
  id: string;
  title: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  eventType: EventType;
  eventDate: string; // Format: YYYY-MM-DD
  eventTime?: string; // Format: HH:mm
  location?: string;
  guestCount?: number;
  totalAmount: number; // Monto total presupuestado
  depositAmount: number; // Seña inicial registrada
  paymentHistory: PaymentRecord[]; // Historial de pagos
  contractedServices?: EventContractedService[]; // Desglose de servicios y adicionales solicitados
  status: EventStatus;
  notes?: string;
  reminders?: ReminderItem[]; // Recordatorios asociados al evento
  createdAt: string;
  updatedAt: string;
}

export type FilterStatus = 'all' | 'pending_balance' | 'fully_paid' | 'upcoming_7_days' | 'this_month';
export type ViewMode = 'table' | 'calendar' | 'cashflow' | 'reminders';
export type SortOption = 'date_asc' | 'date_desc' | 'balance_desc' | 'total_desc' | 'client_asc';

