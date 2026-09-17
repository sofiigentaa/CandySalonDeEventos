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
  clause: string | null;
  source: 'gemini' | 'fallback';
}

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

REGLAS LEGALES INDISPENSABLES QUE DEBES INCLUIR CON CLARIDAD:
1. Objeto del contrato y datos completos de ambas partes.
2. Cláusula de Seña: Seña no reembolsable ni transferible ante cancelación por parte del cliente, ya que garantiza exclusividad y bloqueo de agenda.
3. Pago del Saldo: Debe estar 100% saldado 48 hs antes o en la puerta al ingresar al salón, sin excepciones.
4. Horarios y Tolerancia: Ingreso 30 min antes para ambientación; horario de salida con 15 minutos de tolerancia para desalojo total. Excedido este tiempo se devenga hora extra.
5. Responsabilidad por Daños y Roturas: El cliente es el responsable económico de todo daño o rotura en juegos, inflables, pelotero, vajilla o mobiliario.
6. Elementos Expresamente Prohibidos: Nieve/espuma en aerosol, serpentina líquida, papel picado metálico, pirotecnia y adhesivos agresivos en paredes.
7. Sección final con líneas de firma para el Contratante (Nombre, DNI, Teléfono) y para Candy Salón de Eventos.

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
  'El asistente de IA no está disponible en este momento (falta configurar la clave de API de Gemini). Mientras tanto podés escribir la cláusula directamente en el editor.';

/**
 * Chatea con la dueña del salón, turno a turno, para ayudarla a redactar
 * cláusulas o secciones específicas del contrato. El modelo responde siempre
 * con un mensaje conversacional y, opcionalmente, un texto de cláusula listo
 * para insertar en el contrato.
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
    return { reply: CONTRACT_ASSISTANT_UNAVAILABLE_REPLY, clause: null, source: 'fallback' };
  }

  const total = Number(event.totalAmount) || 0;
  const deposit = Number(event.depositAmount) || 0;
  const remaining = Math.max(0, total - deposit);
  const trimmedContract = (currentContractText || '').slice(0, 4000);

  const systemInstruction = `Sos el asistente de redacción de contratos de "Candy Salón de Eventos" (salón de fiestas). Chateás directamente con la dueña del salón para ayudarla a definir y redactar partes puntuales del contrato de alquiler (cláusulas, reglas, condiciones especiales), NO con el cliente final.

Cómo conversar:
- Hablá en español rioplatense, cercano, breve y concreto (nada de rodeos).
- Si el pedido de la dueña ya es suficientemente claro para redactar una cláusula precisa, redactala directamente sin seguir preguntando de más.
- Si falta información clave para que la cláusula sea precisa (montos, plazos, objetos prohibidos, excepciones, etc.), hacé como máximo 1 o 2 preguntas cortas y puntuales antes de redactar.
- No repitas cláusulas que ya están en el contrato actual (te lo paso más abajo); si lo que pide ya está cubierto, avisale y no dupliques.

Datos del evento para dar contexto si hace falta:
- Cliente: ${event.clientName || 'Cliente'} | Evento: ${event.title} (${event.eventType || 'Evento Social'})
- Fecha: ${event.eventDate} ${event.eventTime ? `a las ${event.eventTime} hs` : ''}
- Monto total: ${currency} ${total} | Seña: ${currency} ${deposit} | Saldo: ${currency} ${remaining}
- Invitados: ${event.guestCount || 'No especificado'}

Contrato actual (para contexto, no lo repitas):
"""
${trimmedContract || '(Todavía no hay texto cargado)'}
"""

Formato de respuesta OBLIGATORIO, siempre exactamente así, sin texto antes ni después:
RESPUESTA: <tu mensaje conversacional para la dueña: una pregunta breve o una confirmación de que la cláusula está lista>
CLAUSULA: <el texto de la cláusula lista para pegar en el contrato, numerada/titulada si corresponde, en español formal-cordial> (si todavía no corresponde proponer texto, escribí la palabra NINGUNA en este campo)`;

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
            maxOutputTokens: 700,
          },
        }),
        TIMEOUT_MS
      );

      const raw = response.text?.trim();
      if (!raw) continue;

      const match = raw.match(/RESPUESTA:\s*([\s\S]*?)\n\s*CLAUSULA:\s*([\s\S]*)$/i);
      if (match) {
        const reply = match[1].trim();
        const clauseRaw = match[2].trim();
        const clause = clauseRaw && clauseRaw.toUpperCase() !== 'NINGUNA' ? clauseRaw : null;
        return { reply, clause, source: 'gemini' };
      }

      return { reply: raw, clause: null, source: 'gemini' };
    } catch (error: any) {
      continue;
    }
  }

  return {
    reply: 'No pude conectarme con la IA en este momento. Probá de nuevo en unos segundos.',
    clause: null,
    source: 'fallback',
  };
}
