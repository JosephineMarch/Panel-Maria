# Push Notifications — KAI v2

**Rama**: `redesign-ui` | **Fase**: 1 — INICIO + Sistema de Tareas 🚧

## Stack

- **Firebase Cloud Messaging** (FCM V1 API)
- **Supabase Edge Functions** (Deno/TS) como backend
- **Service Worker** para recibir en navegador

## Flujo

1. Frontend genera token FCM → guarda en `fcm_tokens` (Supabase)
2. Al crear item con deadline, trigger DB `trg_sync_alarm_notification` crea registro en `alarm_notifications`
3. Edge Function `check-alarms` (cron cada minuto) busca alarmas pendientes y envía push
4. SW recibe mensaje → muestra notificación con acciones snooze

## Payload (solo `data:` block)

```json
{
  "message": {
    "token": "...",
    "data": {
      "title": "⏰ KAI - Recordatorio",
      "body": "Contenido",
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

⚠️ NO usar `notification:` block — impide que el SW muestre acciones de snooze.

## Archivos involucrados

- `supabase/functions/send-push/index.ts` — envía notificaciones
- `supabase/functions/check-alarms/index.ts` — verifica alarmas
- `src/js/firebase.js` — cliente FCM frontend
- `sw.js` — service worker + push receiver

## Edge Functions

### send-push
```http
POST /functions/v1/send-push
{ "token", "title", "body", "itemId" }
```

### check-alarms
- Busca alarmas pending con deadline próximo (< 30s)
- Envía push a todos los tokens del usuario
- Maneja repeticiones (daily/weekly/monthly)
- Actualiza deadline para repetitivas

## Service Worker

Notificaciones con `requireInteraction: true`, vibración según prioridad, y acciones:
- `snooze` (5 min)
- `snooze10` (10 min)
- `dismiss`

Comunicación con cliente vía `postMessage`.

## Consideraciones de seguridad

- JWT RS256 firmado con Web Crypto para auth FCM
- Credenciales embebidas en Edge Function (no env vars de Supabase)
- NO commitear credenciales al repo

## Testing manual

```js
fetch('https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'FCM_TOKEN',
    title: 'Test',
    body: 'Funciona!'
  })
})
```

---
Mayo 2026
