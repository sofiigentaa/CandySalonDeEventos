# Calandria en Candy

Calandria mira la agenda, los pagos y los gastos del salón y **propone** las tareas
que se repiten. No hace nada sola: cada propuesta espera que la apruebes.

## Qué propone

| Propuesta | Cuándo aparece | Qué hace al aprobar | Tiempo estimado |
|---|---|---|---|
| Avisar saldos pendientes | Eventos de los próximos 15 días (o ya pasados) con saldo y sin recordatorio de cobro | Crea el recordatorio de cobro y deja el mensaje listo para cada cliente (copiar o WhatsApp) | 3 min por evento |
| Tareas de la semana | Eventos de los próximos 7 días sin la lista de siempre | Crea los recordatorios: invitados, catering y bebidas, decoración y Candy Bar | 2 min por recordatorio |
| Gastos fijos del mes | Un gasto con el mismo concepto se cargó cada ~30 días y ya toca de nuevo | Lo carga con el mismo monto del mes anterior (se puede editar) | 2 min por gasto |
| Cerrar eventos realizados | Eventos que ya pasaron y están totalmente pagos | Los marca como realizados | 1 min por evento |

"Ahora no" la esconde 12 horas. **Pará** pone a Calandria en pausa hasta tocar **Reanudar**.

## El botón

- En pantalla: botón grande **Aprobar** del panel de Calandria.
- Teclado: **F9**.
- Botón físico: un ESP32-S3 conectado por USB como teclado que manda **F9**.
  Si el panel está cerrado, el botón primero lo abre (nunca aprueba sin que se vea qué).
- Luz: verde = todo en orden · ámbar = hay algo para aprobar · gris = en pausa.

## Registro sellado

Cada aprobación, "ahora no", pausa y reanudación queda registrada con número, fecha,
tipo de tarea, cantidad y minutos estimados. **No guarda nombres, teléfonos ni montos
de clientes**: el servidor solo acepta tipos y acciones conocidos y números. Los
mensajes a clientes se arman en memoria y se borran al cerrarlos.

- El servidor pone el número, la fecha y la huella:
  `sha256(numero|fecha|tipo|accion|cantidad|minutos|huella_anterior)`.
- La tabla `calandria_log` no deja modificar ni borrar líneas, y "Vaciar todo" /
  "Restablecer demo" no la tocan. La API pública de Supabase no tiene acceso.
- Sin conexión, la acción queda pendiente en el equipo y se sube sola.
- El registro se ve en pantalla (con la verificación). Para una auditoría,
  tecnoros.ar lo saca directo de la base de datos; el cliente no tiene que hacer nada.

## Pantalla principal: la C

Al entrar se ve solo la C de Calandria:
- **La C** se toca para aprobar la primera notificación (igual que el botón físico o F9).
  La luz alrededor: ámbar = hay algo para aprobar, verde = todo en orden, gris = en pausa.
- **Notificaciones**: cada tarea que propone Calandria, con ✓ (aprobar) y ✕ (ahora no).
- **Compartir** (WhatsApp o lo que ofrezca el celular) e **Imprimir**: el resumen del
  día, lo que Calandria hizo hoy y lo último que preparó (pedido o mensajes).
- Abajo: **tecnoros.ar**.
- **Abrir sistema** (arriba a la derecha) lleva al sistema completo. Desde ahí, tocando
  el logo de Calandria se vuelve a la C. Cada equipo recuerda en qué pantalla quedó.
- "X min ahorrados este mes" abre el panel con la pausa y el registro sellado.

## Asistente en la C, aprendizaje rápido y app

- El asistente también está en la pantalla de la C. Si una respuesta lleva a una
  pantalla del sistema (vender, cargar un evento, la caja…), abre el sistema ahí.
- Aprende rápido: con **2 veces** que se repita algo (mismo ingreso de mercadería,
  mismo gasto del mes) ya lo propone. Las tareas por reglas (vencimientos, stock
  mínimo, saldos, fiados) funcionan desde el primer día, con los datos que ya hay.
- Se instala como **aplicación** en el celular o la compu ("Agregar a la pantalla de
  inicio" / "Instalar"), con el nombre y el ícono de Calandria.
