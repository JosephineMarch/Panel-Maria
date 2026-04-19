# Implementación del Centro de Notificaciones In-App

Este plan describe la creación e integración de un sistema de notificaciones persistente dentro de la app (el clásico ícono de "campanita") donde puedas ver todos los avisos importantes, alarmas y sugerencias, y tener control sobre cuáles has leído y cuáles no.

## User Review Required
> [!IMPORTANT]
> **Nueva Tabla Principal:** Crearemos una tabla general llamada `app_notifications` en la base de datos de Supabase. Esto nos permite separar la cola de envío de notificaciones PUSH (`alarm_notifications`) del historial visual dentro de la aplicación, permitiendo en el futuro agregar notificaciones que no sean alarmas (ej. resúmenes semanales de la IA, avisos de sistema). ¿Estás de acuerdo con este enfoque?

## Proposed Changes

---

### Supabase / Base de Datos
Creación de la estructura necesaria para guardar el historial in-app.

#### [NEW] `user_notifications` schema
- Ejecución de migraciones/comandos SQL para crear la tabla:
  - `id` (uuid)
  - `user_id` (fk a usuarios)
  - `title` (texto)
  - `message` (texto)
  - `type` (texto, ej: 'alarm', 'system')
  - `is_read` (boolean, default false)
  - `related_item_id` (uuid, opcional, para ir a la nota asociada)
  - `created_at` (timestamptz)
- Configuración de políticas de seguridad (RLS) para que cada usuario vea sólo sus notificaciones.
- [Opcional si lo apruebas] Un trigger automático: cada vez que se envía o crea una alarma del día, también se guardará una copia en esta bandeja de entrada por si no viste la Push.

---

### UI (index.html)
Añadiremos los elementos visuales sin recargar la pantalla.

#### [MODIFY] `index.html`
- **Ícono del Header:** Junto al ícono de tu avatar o reciclando el espacio del header, un ícono de campana (`fa-bell`). Este tendrá un puntito o "burbuja roja" indicando la cantidad de avisos no leídos.
- **Drawer de Notificaciones (Panel Lateral Lateral Derecho o Modal):** Un nuevo contenedor oculto que al pulsar la campana se deslice mostrando una lista con:
  - Título y mensaje de la notificación.
  - Indicador visual de leído/no leído.
  - Botón rápido "Marcar todo como leído".

---

### Lógica (src/js/)
Conexión de los datos con los elementos visuales.

#### [MODIFY] `src/js/data.js`
- `getNotifications()`: Trae la lista de las últimas notificaciones ordenadas y detecta cuántas son nuevas.
- `markNotificationRead(id)`: Cambia el estado a leído en la base de datos.
- `markAllRead()`: Utilidad rápida para limpiar los pendientes.

#### [MODIFY] `src/js/ui.js`
- `renderNotificationDrawer(notificaciones)`: Genera el HTML de la lista.
- `updateBellBadge(count)`: Actualiza el puntito rojo visual en la campanita.
- `toggleNotificationDrawer()`: Abre o cierra el panel.

#### [MODIFY] `src/js/logic.js`
- **Inicialización:** Al iniciar sesión o refrescar, obtener notificaciones y pintar el ícono.
- **Event Listeners:** Asignar los eventos de clic a la campana y a cada ítem del drawer para marcarlos como vistos o navegar a la anotación.

## Open Questions

> [!WARNING]
> ¿Deseas que al hacer clic en una notificación (por ejemplo de una alarma) me lleve automáticamente a la sección del Timeline o resalte la card correspondiente, o prefieres que solo sea informativa y estática por ahora?

> [!TIP]
> ¿Buscamos añadir a este panel un sistema de "Sugerencias de Kai"? Es decir, que Kai te mande notificaciones periódicas como "Noto que hoy no has registrado tu check-in emocional". Por ahora el plan solo prepara el terreno para esto.

## Verification Plan

### Automated Tests
1. Verificar que al crear un item remoto con fecha/alarma se inserte un registro.
2. Inyectar notificaciones de prueba manualmente por SQL y re-abrir la app para asegurar la cuenta.

### Manual Verification
1. Abrir la PWA en desarrollo.
2. Ver que aparece la campana. Clicar e interactuar marcando leídos.
3. Comprobar que en escritorio o dispositivos móviles el panel se anima fluida y responsivamente.
