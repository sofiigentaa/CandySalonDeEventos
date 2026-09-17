import { GoogleGenAI } from '@google/genai';
import { EventItem } from '../types.ts';
import {
  GenerateContractOptions,
  generateSmartContractFallback,
} from './contractTemplate.ts';

export { generateSmartContractFallback, type GenerateContractOptions };

export interface ContractChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ContractChatResult {
  reply: string;
  proposedText: string | null;
  scope: 'full_contract' | 'clause' | null;
  source: 'gemini' | 'fallback';
}

const LEGAL_RULES_TEXT = `REGLAS LEGALES INDISPENSABLES QUE DEBES INCLUIR CON CLARIDAD EN UN CONTRATO COMPLETO:
1. Objeto del contrato y datos completos de ambas partes.
2. Cláusula de Seña: Seña no reembolsable ni transferible ante cancelación por parte del cliente, ya que garantiza exclusividad y bloqueo de agenda.
3. Pago del Saldo: Debe estar 100% saldado 48 hs antes o en la puerta al ingresar al salón, sin excepciones.
4. Horarios y Tolerancia: Ingreso 30 min antes para ambientación; horario de salida con 15 minutos de tolerancia para desalojo total. Excedido este tiempo se devenga hora extra.
5. Responsabilidad por Daños y Roturas: El cliente es el responsable económico de todo daño o rotura en juegos, inflables, pelotero, vajilla o mobiliario.
6. Elementos Expresamente Prohibidos: Nieve/espuma en aerosol, serpentina líquida, papel picado metálico, pirotecnia y adhesivos agresivos en paredes.
7. Sección final con líneas de firma para el Contratante (Nombre, DNI, Teléfono) y para Candy Salón de Eventos.`;

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Modelos vigentes de Gemini (se saca "gemini-3.8-flash", que no existe y hacía perder tiempo
// fallando siempre antes de pasar al siguiente modelo). Se usa un único modelo rápido por defecto
// y un solo respaldo, con timeout corto, para que la generación no quede "colgada".
const CANDIDATE_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];
const TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), ms)),
  ]);
}

export async function generateContractWithGemini(
  options: GenerateContractOptions
): Promise<{ contractText: string; source: 'gemini' | 'fallback' }> {
  const { event, focusTone = 'standard', customInstructions = '', currency = '$' } = options;

  const total = Number(event.totalAmount) || 0;
  const deposit = Number(event.depositAmount) || 0;
  const remaining = Math.max(0, total - deposit);

  const ai = getAiClient();
  if (!ai) {
    return {
      contractText: generateSmartContractFallback(event, focusTone, customInstructions, currency),
      source: 'fallback',
    };
  }

  const prompt = `Actúa como asesor legal y administrador de "Candy Salón de Eventos" (salón de fiestas y eventos sociales).
Redacta un CONTRATO DE ALQUILER DE INSTALACIONES Y TÉRMINOS DE SERVICIO formal, claro, riguroso y personalizado para el siguiente evento:

DATOS DEL EVENTO:
- Cliente / Contratante: ${event.clientName || 'Cliente'}
- Teléfono: ${event.clientPhone || 'No especificado'}
- Evento / Festejo: ${event.title} (${event.eventType || 'Evento Social'})
- Fecha del evento: ${event.eventDate}
- Horario de inicio y fiesta: ${event.eventTime ? `${event.eventTime} hs` : 'A convenir'}
- Lugar: ${event.location || 'Candy Salón de Eventos'}
- Monto Total Acordado: ${currency} ${total}
- Seña Abonada: ${currency} ${deposit}
- Saldo Restante por Abonar: ${currency} ${remaining}
- Cantidad de Invitados: ${event.guestCount || 'No especificado'}
- Notas / Detalles previos: ${event.notes || 'Ninguna'}

ENFOQUE SELECCIONADO POR LA ADMINISTRACIÓN:
${
  focusTone === 'strict_rules'
    ? 'Énfasis máximo y riguroso en prohibición de roturas, respeto implacable del horario de desalojo y pago de daños.'
    : focusTone === 'kids_party'
    ? 'Festejo infantil con foco en cuidado de peloteros, inflables, juegos y supervisión de los niños.'
    : focusTone === 'teens_adults'
    ? 'Festejo de adolescentes o adultos con control de sonido, consumo y cuidado general.'
    : 'Contrato estándar equilibrado y profesional para alquiler de salón.'
}
${customInstructions ? `INSTRUCCIÓN ESPECIAL OBLIGATORIA DE LA DUEÑA DEL SALÓN (debe quedar reflejada como una cláusula propia y explícita del contrato, no como una mención de paso): "${customInstructions}"` : ''}

${LEGAL_RULES_TEXT}

Formato: Devuelve únicamente el texto del contrato listo para enviar o imprimir, con un encabezado prolijo, títulos claros en mayúsculas y cláusulas numeradas en español rioplatense formal y cordial.`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            maxOutputTokens: 1400,
          },
        }),
        TIMEOUT_MS
      );

      const generated = response.text?.trim();
      if (generated && generated.length > 100) {
        return { contractText: generated, source: 'gemini' };
      }
    } catch (error: any) {
      // Intenta con el siguiente modelo si hay un error transitorio o timeout
      continue;
    }
  }

  return {
    contractText: generateSmartContractFallback(event, focusTone, customInstructions, currency),
    source: 'fallback',
  };
}

const CONTRACT_ASSISTANT_UNAVAILABLE_REPLY =
  'El asistente de IA no está disponible en este momento (falta configurar la clave de API de Gemini). Mientras tanto podés escribir el contrato directamente en el editor.';

/**
 * Chatea con la dueña del salón, turno a turno, para ayudarla a iniciar el
 * contrato completo de un evento o para redactar cláusulas puntuales sobre
 * uno ya existente. El modelo responde siempre con un mensaje conversacional
 * y, opcionalmente, un texto listo para usar: puede ser el CONTRATO COMPLETO
 * (reemplaza el texto actual) o una CLÁUSULA puntual (se agrega al final).
 */
export async function chatWithContractAssistant(
  event: EventItem,
  currency: string,
  currentContractText: string,
  history: ContractChatMessage[],
  userMessage: string
): Promise<ContractChatResult> {
  const ai = getAiClient();
  if (!ai) {
    return { reply: CONTRACT_ASSISTANT_UNAVAILABLE_REPLY, proposedText: null, scope: null, source: 'fallback' };
  }

  const total = Number(event.totalAmount) || 0;
  const deposit = Number(event.depositAmount) || 0;
  const remaining = Math.max(0, total - deposit);
  const trimmedContract = (currentContractText || '').slice(0, 4000);

  const systemInstruction = `Sos el asistente de redacción de contratos de "Candy Salón de Eventos" (salón de fiestas). Chateás directamente con la dueña del salón, NO con el cliente final. La ayudás a hacer dos cosas:
(a) INICIAR/REGENERAR el contrato completo de un evento desde cero, guiándola con preguntas breves, o
(b) redactar una cláusula puntual para sumar al contrato que ya tiene armado.

Cómo conversar:
- Hablá en español rioplatense, cercano, breve y concreto (nada de rodeos).
- Si la dueña pide iniciar, armar o regenerar "el contrato" completo para este evento: preguntale primero (en una sola pregunta corta) el enfoque/tono que quiere (estándar y equilibrado, reglas estrictas sobre daños y horarios, fiesta infantil con pelotero/inflables, o adolescentes/adultos con control de sonido y consumo) y si hay alguna instrucción especial que deba quedar como cláusula propia. En cuanto tengas esa info (o si ya te la dio en el primer mensaje), generá el CONTRATO COMPLETO siguiendo las reglas legales indispensables de más abajo, y marcá el ALCANCE como CONTRATO_COMPLETO.
- Si el pedido es sobre un aspecto puntual (una cláusula, una regla específica) y no sobre todo el documento: si ya es suficientemente claro, redactala directamente; si falta info clave (montos, plazos, excepciones), hacé como máximo 1 o 2 preguntas cortas antes de redactar. Marcá el ALCANCE como CLAUSULA. No repitas cláusulas que ya están en el contrato actual.
- Si todavía no corresponde proponer texto (te falta información), usá ALCANCE: NINGUNO y TEXTO: NINGUNO.

${LEGAL_RULES_TEXT}
(Esta lista de reglas legales indispensables solo aplica cuando el ALCANCE es CONTRATO_COMPLETO; para una CLAUSULA puntual redactá solo lo pedido.)

Datos del evento para dar contexto:
- Cliente: ${event.clientName || 'Cliente'} | Evento: ${event.title} (${event.eventType || 'Evento Social'})
- Fecha: ${event.eventDate} ${event.eventTime ? `a las ${event.eventTime} hs` : ''}
- Monto total: ${currency} ${total} | Seña: ${currency} ${deposit} | Saldo: ${currency} ${remaining}
- Invitados: ${event.guestCount || 'No especificado'}

Contrato actual (para contexto, no lo repitas ni lo cites salvo que te pidan regenerarlo):
"""
${trimmedContract || '(Todavía no hay texto cargado)'}
"""

Formato de respuesta OBLIGATORIO, siempre exactamente así, sin texto antes ni después:
RESPUESTA: <tu mensaje conversacional para la dueña: una pregunta breve o una confirmación de que el texto está listo>
ALCANCE: <CONTRATO_COMPLETO, CLAUSULA o NINGUNO>
TEXTO: <el contrato completo o la cláusula lista para usar, en español formal-cordial> (si ALCANCE es NINGUNO, escribí NINGUNA acá también)`;

  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 1600,
          },
        }),
        TIMEOUT_MS
      );

      const raw = response.text?.trim();
      if (!raw) continue;

      const match = raw.match(/RESPUESTA:\s*([\s\S]*?)\n\s*ALCANCE:\s*(\S+)\s*\n\s*TEXTO:\s*([\s\S]*)$/i);
      if (match) {
        const reply = match[1].trim();
        const scopeRaw = match[2].trim().toUpperCase();
        const textRaw = match[3].trim();
        const hasText = textRaw && textRaw.toUpperCase() !== 'NINGUNA' && textRaw.toUpperCase() !== 'NINGUNO';
        const scope: ContractChatResult['scope'] = !hasText
          ? null
          : scopeRaw === 'CONTRATO_COMPLETO'
          ? 'full_contract'
          : 'clause';
        return { reply, proposedText: hasText ? textRaw : null, scope, source: 'gemini' };
      }

      return { reply: raw, proposedText: null, scope: null, source: 'gemini' };
    } catch (error: any) {
      continue;
    }
  }

  return {
    reply: 'No pude conectarme con la IA en este momento. Probá de nuevo en unos segundos.',
    proposedText: null,
    scope: null,
    source: 'fallback',
  };
}
