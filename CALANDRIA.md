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
