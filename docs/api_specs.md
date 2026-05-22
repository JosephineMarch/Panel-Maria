# APIs — KAI v2

**Rama**: `redesign-ui` | **Fase**: 1 — INICIO + Sistema de Tareas 🚧

## Supabase

### Tabla `items`

Campos: `id` (UUID), `user_id`, `content`, `type`, `parent_id`, `status`, `descripcion`, `urls` (JSONB[]), `tareas` (JSONB[]), `tags` (TEXT[]), `deadline` (TIMESTAMPTZ), `repeat`, `anclado` (BOOLEAN), `puntos` (INTEGER, Fase 1), `meta` (JSONB), `created_at`, `updated_at`

Tipos canónicos: `nota`, `tarea`, `proyecto`, `directorio`

RLS por `user_id`. RPC `search_items(p_query, p_user_id, p_limit)` para búsqueda full-text.

### Otras tablas

- `fcm_tokens` — dispositivos para push
- `daily_checkins` — check-ins diarios
- `daily_routines` + `daily_routine_completions` — rutinas
- `daily_tasks` — tareas del día
- `alarm_notifications` — cola de alarmas para push

### Edge Functions

- `send-push` — envía notificación FCM V1 a un token
- `check-alarms` — verifica alarmas pendientes y envía push

## Cerebras

- **Endpoint**: `https://api.cerebras.ai/v1/chat/completions`
- **Modelo**: `gpt-oss-120b`
- **Rol**: Kai, asistente ADHD-friendly, responde con JSON `{ response, action: { type, data } }`
- **10 acciones**: CREATE_ITEM, UPDATE_ITEM, DELETE_ITEM, TOGGLE_TASK, TOGGLE_PIN, OPEN_PROJECT, OPEN_EDIT, SEARCH, FILTER_CATEGORY, NO_ACTION
- **Contexto RAG**: `getContext()` inyecta items actuales. Memoria: 10 mensajes.

## Firebase Cloud Messaging

- **Project ID**: `panel-de-control-maria`
- **Flujo**: Frontend genera token → guarda en `fcm_tokens` → trigger DB crea `alarm_notifications` → cron/edge function envía push
- **Payload**: solo `data:` block (no `notification:`) para que pase por SW y muestre acciones snooze

## Service Worker

- **Cache**: `kai-cache-v12`
- **Estrategias**: cache-first (fonts, assets), network-first (API calls), stale-while-revalidate (HTML)
- **Push**: acciones snooze/dismiss, vibración según prioridad, requireInteraction: true

## Schema Item

```
{
  id, user_id, content, type, parent_id, status, descripcion,
  urls: string[], tareas: [{titulo, completado}], tags: string[],
  deadline, repeat, anclado, puntos?: number,
  meta: {}, created_at, updated_at
}
```

---
Mayo 2026
