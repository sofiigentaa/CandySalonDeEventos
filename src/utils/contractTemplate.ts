import { EventItem } from '../types.ts';

export interface GenerateContractOptions {
  event: EventItem;
  focusTone?: 'standard' | 'strict_rules' | 'kids_party' | 'teens_adults';
  customInstructions?: string;
  currency?: string;
}

export function generateSmartContractFallback(
  event: EventItem,
  focusTone: string = 'standard',
  customInstructions?: string,
  currency: string = '$'
): string {
  const total = Number(event.totalAmount) || 0;
  const deposit = Number(event.depositAmount) || 0;
  const remaining = Math.max(0, total - deposit);
  const isPaid = remaining === 0;

  let toneNote = '';
  if (focusTone === 'strict_rules') {
    toneNote =
      'Se hace especial énfasis en el control de daños, prohibición absoluta de elementos corrosivos/manchantes y cumplimiento estricto del horario de salida sin excepciones.';
  } else if (focusTone === 'kids_party') {
    toneNote =
      'El evento contempla uso de pelotero, inflable y juegos infantiles bajo supervisión responsable de adultos acompañantes.';
  } else if (focusTone === 'teens_adults') {
    toneNote =
      'El evento contempla público adolescente/adulto con estricto control de volumen musical y bebidas, respetando la convivencia barrial.';
  }

  return `🍭 CONTRATO DE ALQUILER DE SALÓN DE EVENTOS & REGLAMENTO DE USO
CANDY SALÓN DE EVENTOS • RES. REF: CS-${event.id ? event.id.slice(-6).toUpperCase() : '001'}

Entre CANDY SALÓN DE EVENTOS (en adelante "El Salón") y ${event.clientName || 'EL CLIENTE'} (en adelante "El Contratante"), se celebra el presente Contrato de Alquiler de Instalaciones sujeto a las siguientes cláusulas:

PRIMERA: OBJETO Y FECHA DEL EVENTO
El Salón cede temporalmente el uso exclusivo de sus instalaciones para la celebración de:
• Evento: ${event.title} (${event.eventType || 'Festejo Social'})
• Fecha reservada: ${event.eventDate}
• Horario del festejo: ${event.eventTime ? `${event.eventTime} hs` : 'A convenir con la administración'}
• Lugar: ${event.location || 'Candy Salón de Eventos'}
• Invitados estimados: ${event.guestCount || 'A confirmar'} personas.

SEGUNDA: CONDICIONES ECONÓMICAS
1. El precio total acordado por el alquiler es de ${currency} ${total.toLocaleString('es-AR')}.
2. Se registra un pago previo en concepto de seña/reserva por ${currency} ${deposit.toLocaleString('es-AR')}.
3. El saldo restante asciende a ${currency} ${remaining.toLocaleString('es-AR')}${isPaid ? ' (TOTALMENTE CANCELADO)' : ''}.
El saldo adeudado DEBE ser cancelado indefectiblemente 48 horas antes del evento o al momento del ingreso al salón, previo al inicio del festejo.

TERCERA: SEÑA Y CANCELACIONES
La entrega de la seña congela el turno de forma exclusiva para El Contratante, retirando la fecha del mercado. Por tal motivo, ante cancelación unilateral o desistimiento por parte de El Contratante, la seña NO ES REEMBOLSABLE NI TRANSFERIBLE bajo ningún concepto.

CUARTA: HORARIOS Y PUNTUALIDAD
• El Contratante podrá ingresar al salón 30 (treinta) minutos antes del horario estipulado para ambientación, ingreso de torta o catering.
• El horario de finalización pactado es estricto, contando con una tolerancia de 15 (quince) minutos para el retiro total del salón.
• Transcurrido dicho plazo de gracia, se cobrará automáticamente el valor estipulado de hora adicional.

QUINTA: CUIDADO DE INSTALACIONES Y RESPONSABILIDAD CIVIL
El Contratante se hace única, directa y legalmente responsable por cualquier daño, rotura, quemadura o deterioro causado en mobiliario, juegos infantiles, pelotero, inflables, vajilla, sanitarios o paredes. Ante cualquier perjuicio, El Contratante se compromete a abonar el costo íntegro de reparación o reposición inmediata.

SEXTA: ELEMENTOS EXPRESAMENTE PROHIBIDOS
Por razones de seguridad, higiene y mantenimiento, queda terminantemente PROHIBIDO el ingreso y uso de:
• Nieve o espuma en aerosol.
• Serpentinas líquidas o siliconadas.
• Papel picado metálico o confetti metalizado.
• Adhesivos, cintas o clavos sobre paredes y pintura.
• Pirotecnia o elementos de llama abierta (excepto velas de torta en presencia de personal).

SÉPTIMA: DISPOSICIONES PARTICULARES
${toneNote ? `• Enfoque del evento: ${toneNote}\n` : ''}${event.notes ? `• Observaciones registradas: ${event.notes}\n` : ''}${!toneNote && !event.notes && !customInstructions ? '• Sin disposiciones particulares adicionales para este evento.\n' : ''}
${customInstructions ? `OCTAVA: ACUERDO ESPECIAL PACTADO CON EL CONTRATANTE\nAmbas partes dejan expresamente asentado y aceptado el siguiente acuerdo particular para este evento: "${customInstructions}". Este acuerdo prevalece sobre cualquier disposición general que lo contradiga.\n\n` : ''}En prueba de plena conformidad, las partes suscriben el presente documento:

_____________________________              _____________________________
FIRMA DEL CONTRATANTE                      POR CANDY SALÓN DE EVENTOS
Aclaración: ${event.clientName || ''}       Administración / Recepción
DNI: _______________________               Fecha: ${event.eventDate}
Tel: ${event.clientPhone || ''}
`;
}
