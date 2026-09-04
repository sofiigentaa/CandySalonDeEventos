const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'public', 'Documento_Funcional_Candy_Salon_Eventos.pdf');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 38, bottom: 40, left: 42, right: 42 },
  bufferPages: true,
  autoFirstPage: true,
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Colors
const primaryColor = '#1e1b4b'; // deep indigo
const secondaryColor = '#4338ca'; // indigo
const accentColor = '#db2777'; // pink
const textDark = '#1f2937'; // gray-800
const textMuted = '#4b5563'; // gray-600

function addHeader(title, subtitle = '') {
  doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text(title, { align: 'left' });
  if (subtitle) {
    doc.fontSize(9.5).font('Helvetica-Oblique').fillColor(textMuted).text(subtitle, { align: 'left' });
  }
  doc.moveDown(0.3);
  doc.strokeColor(secondaryColor).lineWidth(1.2).moveTo(42, doc.y).lineTo(553, doc.y).stroke();
  doc.moveDown(0.6);
}

function addSubSection(title) {
  doc.fontSize(11).font('Helvetica-Bold').fillColor(secondaryColor).text(title);
  doc.moveDown(0.25);
}

function addParagraph(text) {
  doc.fontSize(9).font('Helvetica').fillColor(textDark).lineGap(2).text(text, { align: 'justify' });
  doc.moveDown(0.4);
}

function addBullet(title, text) {
  doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor).text('• ' + title + ': ', { continued: true });
  doc.font('Helvetica').fillColor(textDark).lineGap(1.8).text(text);
  doc.moveDown(0.3);
}

function addCodeBox(text, height = 150) {
  const boxY = doc.y;
  doc.rect(42, boxY, 511, height).fillAndStroke('#f8fafc', '#cbd5e1');
  doc.fontSize(8).font('Courier').fillColor(primaryColor);
  doc.text(text, 50, boxY + 8, { lineGap: 1 });
  doc.y = boxY + height + 10;
}

// ---------------- COVER / HEADER ----------------
doc.rect(42, 38, 511, 88).fillAndStroke('#f1f5f9', '#cbd5e1');

doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor).text('DOCUMENTO FUNCIONAL Y MANUAL OPERATIVO', 50, 48, { align: 'center' });
doc.fontSize(11).font('Helvetica-Bold').fillColor(accentColor).text('Sistema de Gestión Integral para Salones de Eventos', { align: 'center' });
doc.moveDown(0.3);
doc.fontSize(8.5).font('Helvetica').fillColor(textMuted).text('Proyecto: Candy Salón de Eventos   |   Versión: 1.0   |   Fecha: 26/08/2026', { align: 'center' });
doc.fontSize(8.5).font('Helvetica-Oblique').fillColor(secondaryColor).text('Acceso Web: https://sistemadegestiondeventos.onrender.com/', { align: 'center' });

doc.y = 138;

// ---------------- 1. OBJETIVOS ----------------
addHeader('1. Objetivo del Proyecto');
addSubSection('1a. Objetivo General');
addParagraph('Proveer una solución integral y centralizada para la administración operativa y financiera de Candy Salón de Eventos, optimizando el control de la agenda de fechas, el seguimiento riguroso de cobros (señas y saldos pendientes), la gestión de gastos y la prevención de omisiones operativas mediante un sistema automatizado de alertas y recordatorios.');

addSubSection('1b. Objetivos Específicos');
addBullet('Gestión de Fechas y Disponibilidad', 'Evitar superposiciones mediante una agenda visual interactiva que clasifica por tipo de evento (Cumpleaños, Bautismo, Baby Shower, Comunión y Otro) con cálculo de cuentas regresivas.');
addBullet('Control Financiero y Cobranza', 'Automatizar el cálculo de montos totales, señas percibidas y saldos por evento, evitando pérdidas económicas por falta de cobro previo a la fiesta.');
addBullet('Prevención de Fallas y Olvidos', 'Implementar alertas automáticas de cobro, armado de Candy Bar, confirmación de lista de invitados y coordinación de proveedores con días y horarios definidos.');
addBullet('Flujo de Caja y Rentabilidad', 'Vincular ingresos percibidos con egresos operativos para obtener el beneficio neto mensual, distinguiendo efectivo en mano de dinero bancarizado.');
addBullet('Atención al Cliente Inmediata', 'Centralizar datos de contacto, notas y menús especiales para dar respuestas instantáneas ante consultas.');

// ---------------- 2. OPERATORIA DIARIA ----------------
addHeader('2. Operatoria Diaria: Ficha Centralizada por Evento');
addParagraph('Toda la información del festejo queda guardada en una sola ficha dentro del sistema, eliminando cuadernos y mensajes dispersos en WhatsApp:');
addBullet('Contacto Directo', 'Nombre del cliente, teléfono/WhatsApp e email con botón de acceso a chat en un clic.');
addBullet('Método de Pago y Comprobantes', 'Registro del medio de cobro (Transferencia, Efectivo, Mercado Pago, Tarjeta, Cheque u Otro) y número de comprobante.');
addBullet('Requerimientos del Homenajeado', 'Espacio para temática ("Dinosaurios", "Colores pasteles"), menú especial (celíacos/vegetarianos) y extras (mozos, inflables, barra).');
addBullet('Respuestas Instantáneas', 'Acceso en segundos a saldos, horarios y detalles ante cualquier llamado del cliente.');

doc.addPage();

// ---------------- 3. MÓDULOS DEL SISTEMA ----------------
addHeader('3. Módulos del Sistema');
addSubSection('3.1 Módulo de Calendario y Eventos');
addBullet('Categorías', 'Cumpleaños, Bautismo, Baby Shower, Comunión y Otro.');
addBullet('Día y Horario con Cuenta Regresiva', 'Muestra el día de la semana, horario y días restantes ("Faltan 5 días", "¡Es hoy!").');
addBullet('Cálculo Financiero en Vivo', 'Monto Total, Seña percibida (%), Saldo pendiente (%) y Estado automático (Seña Abonada, Totalmente Cubierto $0 o Sin Seña).');

addSubSection('3.2 Módulo de Recordatorios & Alertas Inteligentes');
addBullet('💰 Cobro de Saldo', 'Recordatorio automático (7 días antes a las 11:00 hs) indicando el monto adeudado.');
addBullet('🍭 Candy Bar & Decoración', 'Alerta para alistar vajilla, golosinas y temática (3 días antes a las 16:00 hs).');
addBullet('👥 Confirmar Invitados', 'Chequeo de cubiertos y menús especiales celíacos/vegetarianos (3 días antes).');
addBullet('🍽️ Proveedores & Catering', 'Confirmación de llegada de DJ, mozos, vajilla y fotógrafo (5 días antes).');
addBullet('📞 Contacto con Cliente', 'Llamado o mensaje final de horarios y bienvenida (1 día antes).');
addBullet('📝 Tareas Personalizadas', 'Creación libre de tareas con fecha, hora y prioridad editable.');

addSubSection('3.3 Módulo de Flujo de Caja & Posición Financiera');
addBullet('Ingresos Percibidos', 'Total cobrado en el mes, con detalle de cantidad de cobros e importe exacto en efectivo físico.');
addBullet('Control de Gastos', 'Egresos clasificados por rubro (Personal, Sonido/DJ, Limpieza, Mantenimiento, Catering, Impuestos, Insumos Candy, Publicidad, Otro).');
addBullet('Flujo Neto / Balance', 'Ganancia neta del período (Total Cobrado menos Gastos Totales) con porcentaje de margen.');
addBullet('Posición de Caja & Banco', 'Control de Caja Física (Efectivo en mano) vs. Banco / Tarjeta / Mercado Pago.');

// ---------------- 4. MAPA DEL SITIO ----------------
addHeader('4. Mapa del Sitio');
const mapTree = `CANDY SALÓN DE EVENTOS
│
├── 📋 1. VISTA DE EVENTOS (Pantalla Principal)
│   ├── Panel Superior de Indicadores (KPIs de Cobranza)
│   ├── Barra de Búsqueda Multicriterio y Selector de Orden
│   ├── Píldoras de Filtros Rápidos (Saldo pendiente, 100% Abonado, Próximos 7 días, Este Mes)
│   └── Tabla General de Eventos y Acciones Rápidas (Pagos, WhatsApp, Alertas, Edición, Baja)
│
├── 📅 2. VISTA DE CALENDARIO MENSUAL
│   ├── Navegador de Meses (Mes anterior / Mes siguiente / Hoy)
│   ├── Grilla Calendario con Ocupación por Fechas
│   └── Acceso directo a Nueva Reserva por día libre
│
├── 💰 3. VISTA DE FLUJO DE CAJA
│   ├── Tarjetas de Resumen (Ingresos, Gastos, Beneficio Neto)
│   ├── Control de Posición: Caja Física (Efectivo) vs. Banco/MP
│   ├── Registro y Listado de Gastos (ExpenseModal)
│   └── Historial de Movimientos Económicos
│
├── 🔔 4. PANEL DE RECORDATORIOS Y TAREAS (Modal)
│   ├── Pestañas: Pendientes, Todos y Completados
│   ├── Alertas Rojas para tareas vencidas o para el día de hoy
│   └── WhatsApp directo y marcado de tareas completadas
│
└── 📝 5. FORMULARIO DE EVENTO (EventModal)
    ├── Datos Principales, Tipo de Festejo y Cantidad de Invitados
    ├── Día, Horario y Cuenta Regresiva Automática
    ├── Presupuesto Total, Seña, Método de Pago y Saldo
    ├── Contacto del Cliente y Ubicación
    ├── Configuración de Recordatorios y Alertas
    └── Notas, Menús Especiales y Servicios Incluidos`;

addCodeBox(mapTree, 185);

doc.addPage();

// ---------------- 5. FLUJOS DE TRABAJO DETALLADOS ----------------
addHeader('5. Flujos de Trabajo Operativos (Workflows Detallados)');

addSubSection('Flujo A: Ciclo de Vida Completo de un Evento');
const flowA = `[ PASO 1: Consulta y Reserva ]
   ├─ El operador abre el formulario (+ Nuevo Evento o clic en el día del calendario).
   ├─ Carga: Nombre del evento, cliente, teléfono, fecha, horarios y cantidad de invitados.
   ├─ Ingresa el Presupuesto Total acordado y la Seña recibida con su Método de Pago.
   └─ El sistema calcula el Saldo pendiente y programa automáticamente las alertas preventivas.
   │
[ PASO 2: Semana Previa (Gestión de Cobro y Operatividad) ]
   ├─ Alerta a 7 días: Notificación para cobrar el saldo restante. Se envía WhatsApp con 1 clic.
   ├─ El cliente abona ➔ Se registra el pago parcial o total (el estado pasa a "100% Abonado").
   ├─ Alerta a 5 días: Se coordinan proveedores (DJ, sonido, mozos, vajilla).
   ├─ Alerta a 3 días: Se confirma lista definitiva de invitados, menú celíaco y Candy Bar.
   └─ Alerta a 1 día: Repaso final de horarios de apertura del salón con el cliente.
   │
[ PASO 3: Ejecución de la Fiesta ]
   ├─ El salón recibe al cliente y realiza el festejo según las notas registradas.
   └─ En caso de horas extras o consumos adicionales, se asientan en la ficha del evento.
   │
[ PASO 4: Cierre Financiero Post-Evento ]
   ├─ Se cargan los gastos del evento en Flujo de Caja (pago a mozos, limpieza, insumos).
   └─ El sistema descuenta los costos y computa la ganancia neta generada.`;
addCodeBox(flowA, 175);

addSubSection('Flujo B: Gestión de Cobranzas y Emisión de Recibos');
const flowB = `[ Recepción de Pago o Seña ]
   │
   ├─► Abrir la tabla de eventos y presionar el botón 📄 (Historial de Pagos / Comprobantes).
   ├─► Cargar: Monto recibido, fecha, método de cobro (Efectivo/Transferencia) y nota/comprobante.
   ├─► El sistema recalcula el saldo adeudado y actualiza la barra de progreso financiera.
   └─► Si el saldo llega a $0, el evento se clasifica automáticamente como "Al Día / 100% Cubierto".`;
addCodeBox(flowB, 68);

addSubSection('Flujo C: Control de Gastos y Arqueo de Caja (Efectivo vs. Banco)');
const flowC = `[ Registro de Gastos Operativos ]
   │
   ├─► Ingresar a la sección "💰 Flujo de Caja" y presionar "+ Nuevo Gasto".
   ├─► Seleccionar categoría (Personal, Limpieza, Insumos, DJ) e indicar medio de pago.
   ├─► Si se pagó en Efectivo: se descuenta del indicador "💵 Caja Física".
   ├─► Si se pagó por Transferencia / MP: se descuenta del indicador "💳 Banco / Tarjeta / MP".
   └─► Permite realizar el arqueo exacto del dinero físico en el salón sin desfasajes.`;
addCodeBox(flowC, 68);

doc.addPage();

// ---------------- 6. CASOS DE USO ----------------
addHeader('6. Flujos de Usuario (Casos de Uso Típicos)');
addBullet('Caso 1: Registrar una nueva reserva con seña por transferencia', 'El operador hace clic en la fecha deseada en el calendario, completa los datos del cliente, selecciona el tipo de fiesta, ingresa el total ($ 180.000) y la seña entregada ($ 80.000) indicando "Transferencia". El sistema calcula que restan abonar $ 100.000, programa los recordatorios y deja la fecha guardada como "Seña Abonada".');
addBullet('Caso 2: Cancelación de saldo antes de la fiesta', 'Al recibir el aviso de cobro en el panel de recordatorios, el operador contacta al cliente vía WhatsApp. Al recibir el dinero, asienta el cobro restante de $ 100.000. El evento pasa automáticamente a "Totalmente Cubierto ($ 0 pendiente)" y la alerta se marca como completada.');
addBullet('Caso 3: Carga de un gasto del salón', 'Desde la sección Flujo de Caja, el operador presiona "+ Nuevo Gasto", selecciona la categoría "Limpieza", anota el monto ($ 18.000) y el medio de pago. El sistema descuenta el gasto en el acto y actualiza la ganancia neta.');

doc.moveDown(0.3);

// ---------------- 7. DESGLOSE FUNCIONAL DE PANTALLAS ----------------
addHeader('7. Desglose Funcional Detallado de Pantallas');

addSubSection('7.1 Panel Superior de Indicadores Financieros (KPIs)');
addBullet('Total Recaudado ($ARS)', 'Suma total de todo el dinero efectivamente cobrado (señas + cancelaciones) con porcentaje de efectividad y barra verde.');
addBullet('Saldo Pendiente por Cobrar ($ARS)', 'Monto adeudado por los clientes, cantidad de eventos con saldo pendiente y porcentaje por cobrar con barra naranja.');
addBullet('Monto Total Contratado ($ARS)', 'Facturación total proyectada acumulando los presupuestos de todos los eventos agendados.');
addBullet('Estado de Cobranza', 'Relación visual entre eventos al día (100% liquidados) y eventos con saldo adeudado.');

doc.moveDown(0.3);
addSubSection('7.2 Barra de Búsqueda, Filtros Rápidos y Tabla de Eventos');
addBullet('Buscador Multicriterio', 'Filtrado en vivo por nombre del evento, tipo de fiesta, cliente, teléfono/WhatsApp, ubicación o fecha.');
addBullet('Filtros Rápidos a 1 Clic', 'Todos los eventos, Con saldo pendiente, 100% Abonado ($0), Próximos 7 días y Este Mes.');
addBullet('Columnas de la Tabla', 'DÍA & FECHA (con cuenta regresiva "En 9 días"), EVENTO/CLIENTE, TOTAL, DEJÓ SEÑA (en verde), FALTA ABONAR ($0 o saldo), ESTADO/% y ACCIONES.');
addBullet('Acciones Rápidas', '📄 Ver comprobante/pagos, 🔔 Alertas del evento, 💬 WhatsApp directo, ✏️ Editar ficha y 🗑️ Eliminar reserva.');

doc.moveDown(0.3);
addSubSection('7.3 Panel de Recordatorios, Alertas y Tareas (Modal Campanita 🔔)');
addBullet('Filtros y Estados', 'Pestañas de "Pendientes", "Todos" y "Completados", con aviso rojo para tareas vencidas o del día.');
addBullet('Categorías Automáticas', 'Cobro de Saldo (7d), Confirmar Invitados (3d), Decoración & Candy Bar (3d), Proveedores (5d), Contacto con Cliente (1d) y Personalizados.');

doc.moveDown(0.3);
addSubSection('7.4 Panel de Flujo de Caja & Posición Financiera');
addBullet('Ingresos del Mes', 'Total cobrado en el período con discriminación de efectivo físico (💵 Ef).');
addBullet('Egresos del Mes', 'Total de gastos con detección automática del mayor rubro (ej. Personal: $ARS 180.000).');
addBullet('Flujo Neto / Balance', 'Ganancia neta real de bolsillo (Ingresos menos Gastos) y margen de rentabilidad (%).');
addBullet('Posición de Caja & Banco', '💵 Caja Física (Efectivo en mano) vs. 💳 Banco / Tarjeta / MP (Cuentas virtuales).');

doc.moveDown(0.3);
addSubSection('7.5 Formulario de Evento (EventModal)');
addBullet('Secciones de Carga', '1. Datos Principales y Tipo; 2. Día, Horario y Cuenta Regresiva; 3. Montos, Seña, Método de Pago y Saldo; 4. Contacto del Cliente y Salón; 5. Programación de Alertas Preventivas; 6. Notas, Menús Especiales y Servicios Incluidos.');

// ---------------- 8. CONSIDERACIONES TÉCNICAS ----------------
doc.moveDown(0.3);
addHeader('8. Consideraciones Técnicas y Seguridad');
addBullet('Frontend', 'React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion.');
addBullet('Base de Datos', 'PostgreSQL relacional en la nube con claves foráneas e integridad en cascada.');
addBullet('Acceso y Seguridad', '100% Web (sin instalaciones), adaptable a PC/Móvil y conexión cifrada HTTPS / SSL.');

// FOOTER ON ALL PAGES
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);
  doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8');
  doc.text(
    `Candy Salón de Eventos — Documento Funcional y Manual Operativo v1.0   |   Página ${i + 1} de ${pages.count}`,
    42,
    800,
    { align: 'center', width: 511 }
  );
}

doc.end();

writeStream.on('finish', () => {
  console.log('PDF actualizado exitosamente en:', outputPath);
});
