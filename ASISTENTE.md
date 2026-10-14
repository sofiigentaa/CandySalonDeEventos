# Asistente

Botón "Asistente" abajo a la derecha. Es un asistente guiado hecho por tecnoros.ar:
**sin IA ni servicios externos**. Responde con los datos que ya están en el sistema,
nada de lo que se escribe sale del navegador y no guarda la conversación.
(El asistente de contratos con IA que ya existía sigue igual, dentro de cada contrato.)

**Cómo vas**
- ¿Está libre el sábado? / ¿el 15/11? / ¿mañana? (y ofrece reservar esa fecha)
- ¿Qué eventos tengo esta semana? · ¿Quién me debe? · ¿Qué tengo pendiente hoy?
- ¿Cuánto entró este mes? · ¿Cuánto gasté este mes? · ¿Cómo vamos este mes?

**Cómo se hace**: cargar un evento, registrar una seña o pago y el recibo, el
contrato, armar un presupuesto, cargar un gasto y qué hace Golondrina. Cada
respuesta trae un botón que lleva a la pantalla correspondiente.

**Soporte**: "Hablar con soporte" abre WhatsApp con tecnoros.ar. El número se
cambia con la variable `VITE_SOPORTE_WHATSAPP` (por defecto 5493413130336).

**Hablarle**: el botón del micrófono dicta la pregunta (Chrome, Edge y Safari, en
compu y celular; la primera vez el navegador pide permiso). Si la pregunta se hizo
hablando, la respuesta también se lee en voz alta. El reconocimiento de voz lo hace
el navegador (en Chrome, con el servicio de Google); el sistema no guarda el audio
ni el texto. En navegadores sin dictado el botón no aparece y se escribe como siempre.
