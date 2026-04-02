# Especificaciones Técnicas de APIs y Servicios 🔌

Este documento detalla la integración de Panel-Maria (KAI) con servicios externos y las Web APIs utilizadas.

## 1. Supabase (Backend as a Service)

### Base de Datos (PostgreSQL)
- **Tabla `items`**: Almacena todos los bloques de información.
  - Campos principales: `id` (UUID), `user_id`, `content`, `type`, `parent_id`, `status`, `descripcion`, `urls` (JSONB array), `tareas` (JSONB array), `tags` (TEXT[]), `deadline` (TIMESTAMPTZ), `repeat` (TEXT), `anclado` (BOOLEAN), `meta` (JSONB), `created_at`, `updated_at`
  - Soportada por **RLS (Row Level Security)** para garantizar privacidad por usuario.
  - Función RPC `search_items` para búsqueda full-text con parámetros: `p_query`, `p_user_id`, `p_limit`

- **Tabla `fcm_tokens`**: Registro de dispositivos para notificaciones push.
  - Campos: `user_id`, `token` (unique), `device_name`, `last_used`
  - Upsert por conflicto en `token`

- **Tabla `daily_checkins`**: Check-ins diarios de bienestar.
  - Campos: `user_id`, `date`, `emotional_state`, `physical`, `note`
  - Upsert por conflicto en `user_id, date`

- **Tabla `daily_routines`**: Rutinas diarias configurables.
  - Campos: `user_id`, `name`, `emoji`, `is_active`, `is_default`, `sort_order`

- **Tabla `daily_routine_completions`**: Completitud de rutinas.
  - Campos: `routine_id`, `user_id`, `date`, `completed`, `completed_at`
  - Upsert por conflicto en `routine_id, date`

- **Tabla `daily_tasks`**: Tareas específicas del día (sección Hoy).
  - Campos: `user_id`, `content`, `date`, `completed`, `completed_at`, `created_at`

### Autenticación (Supabase Auth)
- **Proveedores**: Google OAuth y Email/Password.
- **Flujo**: JWT persistido por el SDK de Supabase.
- **Redirección**: Dinámica según entorno (localhost vs GitHub Pages).

### Notificaciones (Edge Functions)
- **Función `send-push`**:
  - **Endpoint**: `https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push`
  - **Método**: `POST`
  - **Carga (Payload)**:
    ```json
    {
      "token": "FCM_DEVICE_TOKEN",
      "title": "Título",
      "body": "Contenido",
      "timestamp": "ms_until_deadline",
      "itemId": "UUID"
    }
    ```

- **Función `check-alarms`**:
  - **Endpoint**: `https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/check-alarms`
  - **Método**: `POST`
  - **Carga**: `{ "force": true, "itemId": "UUID" }` para forzar verificación inmediata
  - **Uso**: Invocada por `alarmas.js` al disparar una alarma local

## 2. Cerebras API (Kai AI)

La integración con la IA se realiza a través del módulo `cerebras.js`.

### Modelo Linguístico
- **Modelo**: `gpt-oss-120b` (vía Cerebras Inference, sucesor de llama-3.3-70b deprecado en feb 2026).
- **Endpoint**: `https://api.cerebras.ai/v1/chat/completions`
- **Rol de Sistema**: "Kai", un asistente ADHD-friendly, empático, breve y efectivo con 10 tipos de acción JSON.

### Esquema de Acción (JSON)
Kai devuelve respuestas estructuradas para que la app actúe automáticamente:

```json
{
  "response": "Texto para Maria...",
  "action": {
    "type": "CREATE_ITEM | UPDATE_ITEM | DELETE_ITEM | TOGGLE_TASK | TOGGLE_PIN | OPEN_PROJECT | OPEN_EDIT | SEARCH | FILTER_CATEGORY | NO_ACTION",
    "data": { ... }
  }
}
```

### Contexto RAG
- `getContext()` inyecta los items actuales del usuario en el prompt del sistema.
- Historial de conversación limitado a 10 mensajes (20 entries incluyendo user+assistant).

## 3. Firebase Cloud Messaging (FCM)

### Configuración
- **Project ID**: `panel-de-control-maria`
- **VAPID Key**: Configurada en `firebase.js` y `sw.js`
- **SDK**: Firebase v10.8.0 (compat modules en SW, modular en frontend)

### Flujo de Notificaciones
1. Frontend genera token FCM con `getToken()` y lo guarda en `fcm_tokens`
2. Al crear item con deadline, trigger DB crea registro en `alarm_notifications`
3. Cron del servidor o `check-alarms` edge function envía push vía FCM V1 API
4. Service Worker recibe mensaje y muestra notificación con acciones de snooze

### Formato de Payload (solo `data:` block)
```json
{
  "message": {
    "token": "...",
    "data": {
      "title": "⏰ KAI - Recordatorio",
      "body": "Contenido de la alarma",
      "itemId": "uuid",
      "type": "alarm",
      "priority": "high|normal"
    },
    "webpush": {
      "headers": { "Urgency": "high", "TTL": "86400" },
      "fcmOptions": { "link": "https://.../?action=alarm&itemId=..." }
    }
  }
}
```

⚠️ **NO usar `notification:` block** — pasa por el SW y permite acciones de snooze.

## 4. Service Worker (sw.js)

### Configuración de Caché
- **Versión**: `kai-cache-v12`
- **Estrategias**:
  - **Cache-First**: Fonts (Google Fonts), imágenes (.png, .svg), JS, CSS
  - **Network-First**: URLs con `api`, `supabase`, `cerebras`
  - **Stale-While-Revalidate**: `index.html`, `manifest.json`

### Assets Cacheados
```
./, index.html, app.js, manifest.json
src/assets/icon-192.png, icon-512.png, icon.svg
src/css/style.css
src/js/supabase.js, auth.js, data.js, ui.js, logic.js, ai.js, cerebras.js, utils.js, share.js, firebase.js, alarmas.js, hoy.js
```

### Notificaciones Push
- **Acciones**: `snooze` (5min), `snooze10` (10min), `dismiss`
- **Comunicación**: `postMessage` con tipo `ALARM_SNOOZE` al cliente activo
- **Vibración**: `[200, 100, 200]` normal, `[200, 100, 200, 100, 200]` high priority
- **Require Interaction**: `true` — la notificación no se descarta sola

## 5. Web APIs Utilizadas

| API | Uso | Módulo |
|-----|-----|--------|
| **Web Speech API** | Reconocimiento de voz y transcripción | `ai.js` |
| **Service Worker API** | Caché (v12), offline, push messaging | `sw.js`, `app.js` |
| **Push API** | Suscripción a push notifications con VAPID | `firebase.js` |
| **Notifications API** | Mostrar notificaciones en foreground | `firebase.js`, `alarmas.js`, `checkins.js` |
| **Share Target API** | Recibir contenido compartido desde otras apps | `share.js`, `manifest.json` |
| **Launch Queue API** | Manejo de launch params para share target | `share.js` |
| **Web Crypto API** | Firma JWT RS256 para FCM V1 (en Edge Function) | Edge Function `send-push` |
| **Cache Storage API** | Almacenamiento de assets para offline | `sw.js` |
| **Custom Events** | Comunicación entre módulos (`kai:add-item`, `auth-*`, `voice-*`) | Múltiples módulos |

## 6. Tipos de Datos (Schema de Items)

```typescript
interface Item {
  id: string;                    // UUID generado por Supabase
  user_id: string;               // ID del usuario (Supabase Auth)
  content: string;               // Título principal
  type: 'nota' | 'tarea' | 'proyecto' | 'directorio' | 'checkin';
  parent_id: string | null;      // ID del item padre (para proyectos)
  status: string;                // Estado (inbox, completed, etc.)
  descripcion: string;           // Descripción extendida
  urls: string[];                // Array de URLs (múltiples enlaces)
  tareas: { titulo: string; completado: boolean }[];
  tags: string[];                // Tags: 'logro', 'salud', 'emocion', 'alarma'
  deadline: string | null;       // ISO 8601 timestamp
  repeat: 'daily' | 'weekly' | 'monthly' | null;
  anclado: boolean;              // Item fijado arriba
  meta: Record<string, any>;     // Metadatos extendidos (energía, emoción, checkin_id, etc.)
  created_at: string;
  updated_at?: string;
}
```

---
Última actualización: Abril 2026
