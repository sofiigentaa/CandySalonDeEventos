import { GoogleGenAI } from '@google/genai';
import { EventItem } from '../types.ts';
import {
  GenerateContractOptions,
  generateSmartContractFallback,
} from './contractTemplate.ts';

export { generateSmartContractFallback, type GenerateContractOptions };

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

  // Modelos vigentes de Gemini (se saca "gemini-3.8-flash", que no existe y hacía perder tiempo
  // fallando siempre antes de pasar al siguiente modelo). Se usa un único modelo rápido por defecto
  // y un solo respaldo, con timeout corto, para que la generación no quede "colgada".
  const candidateModels = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];
  const TIMEOUT_MS = 12000;

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI request timeout')), ms)),
    ]);

  for (const modelName of candidateModels) {
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
