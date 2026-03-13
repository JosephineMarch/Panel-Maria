# Especificaciones Técnicas de APIs y Servicios 🔌

Este documento detalla la integración de Panel-Maria (KAI) con servicios externos.

## 1. Supabase (Backend as a Service)

### Base de Datos (PostgreSQL)
- **Tabla `items`**: Almacena todos los bloques de información.
  - Soportada por **RLS (Row Level Security)** para garantizar privacidad por usuario.
  - Utiliza `JSONB` para checklists dinámicas y `TEXT[]` para etiquetas.
- **Tabla `fcm_tokens`**: Registro de dispositivos para notificaciones push.

### Autenticación (Supabase Auth)
- **Proveedores**: Google OAuth y Email/Password (preparado).
- **Flujo**: JWT persistido en `localStorage` (gestionado por el SDK de Supabase).

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

## 2. Cerebras API (Kai AI)

La integración con la IA se realiza a través del módulo `cerebras.js`.

### Modelo Linguístico
- **Modelo**: Llama-3-70B (vía Cerebras Inference).
- **Rol de Sistema**: "Kai", un asistente ADHD-friendly, empático, breve y efectivo.

### Esquema de Acción (JSON)
Kai devuelve respuestas estructuradas para que la app actúe automáticamente:

```json
{
  "response": "Texto para Maria...",
  "action": {
    "type": "CREATE_ITEM | UPDATE_ITEM | DELETE_ITEM | SEARCH",
    "data": { ... }
  }
}
```

## 3. Web APIs Utilizadas

- **Web Speech API**: Para la captura de voz y transcripción instantánea.
- **Service Worker API**: Gestión de caché (`v9`) y soporte offline.
- **Push & Notifications API**: Para mostrar avisos locales en escritorio y Android.
- **Share Target API**: Permite que otras apps compartan contenido hacia Panel-Maria.

---
Última actualización: Marzo 2026
