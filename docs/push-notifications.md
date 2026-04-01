# Firebase Cloud Messaging (FCM) - Push Notifications

## Resumen

Se implementó el sistema de notificaciones push para la app KAI/Panel-Maria usando:
- **Firebase Cloud Messaging (FCM)** para notificaciones push
- **Supabase Edge Functions** como backend para enviar notificaciones
- **Service Worker** para recibir notificaciones en el navegador

## Problema Inicial

Las notificaciones push fallaban con el error:
```
invalid_grant: {"error":"invalid_grant","error_description":"..."}
```

Esto ocurría al intentar obtener el access token de Google OAuth para autenticar con FCM.

## Solución Implementada

### 1. Credenciales embebidas en el código

En lugar de依赖 de environment variables de Supabase (que no se cargaban correctamente), las credenciales se embebieron directamente en el código de la Edge Function:

```typescript
const FCM_PROJECT_ID = 'panel-de-control-maria';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@panel-de-control-maria.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
... clave privada ...
-----END PRIVATE KEY-----`;
```

### 2. Conversión PEM a DER correcta

La clave privada PEM debe convertirse a formato DER (ArrayBuffer) para poder firmAR el JWT con la Web Crypto API:

```typescript
function pemToDer(pem: string): ArrayBuffer {
  const lines = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');  // Remover todos los whitespaces
  
  const binaryString = atob(lines);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
```

### 3. Encoding base64url para la firma JWT

El error principal era que la firma del JWT usaba base64 estándar en lugar de base64url:

```typescript
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // google espera base64url, no base64 estándar
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
```

### 4. Obtención del Access Token

El flujo completo para obtener el access token:

```typescript
async function getAccessToken(): Promise<string> {
  // 1. Crear header y payload del JWT
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({
    iss: FIREBASE_CLIENT_EMAIL,
    sub: FIREBASE_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  }));

  // 2. Firmar el JWT con la clave privada
  const signInput = `${header}.${payload}`;
  const data = encoder.encode(signInput);
  const keyBuffer = pemToDer(FIREBASE_PRIVATE_KEY);
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
  const signatureB64 = base64UrlEncode(signature);  // ⚠️ base64url!
  const jwt = `${signInput}.${signatureB64}`;

  // 3. Intercambiar JWT por access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
```

### 5. Envío de notificación FCM

Una vez obtenido el access token:

```typescript
async function sendFCMMessageV1(token: string, title: string, body: string, itemId?: string, extraData?: any) {
  const accessToken = await getAccessToken();

  // IMPORTANTE: NO usar notification: {}, sino solo data:
  // Así la notificación pasa por el Service Worker y muestra las acciones de snooze
  const payload = {
    message: {
      token: token,
      data: {
        title: title,
        body: body,
        itemId: itemId || '',
        type: extraData?.type || 'alarm',
        priority: extraData?.priority || 'normal',
        ...extraData
      },
      webpush: {
        headers: {
          Urgency: extraData?.priority === 'high' ? 'high' : 'normal',
          TTL: extraData?.repeat ? '604800' : '86400'
        },
        fcmOptions: {
          link: `https://josephinemarch.github.io/Panel-Maria/?action=alarm&itemId=${itemId || ''}`
        }
      }
    }
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    }
  );

  return await response.json();
}
```

### 6. Por qué NO usar notification: {}

Si usás `notification: { title, body }` en el payload de FCM, el navegador muestra su propia notificación nativa **sin pasar por el Service Worker**, lo que significa:
- ❌ No se muestran las acciones de snooze (5 min, 10 min, dismiss)
- ❌ En algunos navegadores no aparece la notificación

Usando solo `data: { title, body, ... }`:
- ✅ El Service Worker (`sw.js`) muestra la notificación
- ✅ Las acciones de snooze funcionan correctamente
- ✅ Mayor control sobre el外观 de la notificación

## Archivos Involucrados

- `supabase/functions/send-push/index.ts` - Edge Function que envía notificaciones
- `src/js/firebase.js` - Cliente FCM en el frontend
- `sw.js` - Service Worker para recibir notificaciones
- `panel-de-control-maria-*.json` - Credenciales de Firebase (NO committed)

## Notas de Seguridad

⚠️ **IMPORTANTE**: Las credenciales de Firebase contienen secretos sensibles. 

Si necesitás regenerar credenciales:
1. Ir a [Firebase Console](https://console.firebase.google.com/project/panel-de-control-maria/settings/serviceaccounts/adminsdk)
2. Generar nueva clave privada
3. Actualizar `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY` en la Edge Function

⚠️ **NO hacer commit de credenciales al repo**. Si las subís,-rotalas inmediatamente en Firebase Console.

## Actualizaciones

- **Abril 2026**: Se rotaron las credenciales. Nuevo service account: `firebase-adminsdk-fbsvc@panel-de-control-maria.iam.gserviceaccount.com`

## Testing

Para probar manualmente:

```javascript
fetch('https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/send-push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'TU_FCM_TOKEN_AQUI',
    title: 'Test Notification',
    body: 'Funciona!'
  })
})
```

## Referencias

- [Firebase Cloud Messaging HTTP v1](https://firebase.google.com/docs/cloud-messaging/http-server-ref)
- [Google OAuth 2.0 JWT Bearer Tokens](https://developers.google.com/identity/protocols/oauth2/service-account#authorizingrequests)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
