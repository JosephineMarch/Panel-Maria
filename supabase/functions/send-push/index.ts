import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const FCM_PROJECT_ID = 'panel-de-control-maria';
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

serve(async (req) => {
  try {
    const { token, title, body, timestamp, itemId } = await req.json();

    if (!token || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- BLOQUE DE SEGURIDAD AÑADIDO: VALIDACIÓN JWT vs TOKEN ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Falta Token de Autorización (JWT)' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Intentamos buscar el FCM del supuesto dueño asumiendo la sesión RLS del JWT
    const { data: validTokens, error: sbError } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('token', token);

    if (sbError || !validTokens || validTokens.length === 0) {
      return new Response(JSON.stringify({ error: 'Acceso Denegado. El token Push no pertenece a tu sesión.' }), { status: 403 });
    }
    // -----------------------------------------------------------

    const scheduledTime = timestamp || Date.now() + 60000;
    const timeToSend = new Date(scheduledTime).getTime();
    const now = Date.now();
    const delay = timeToSend - now;

    if (delay > 0) {
      setTimeout(async () => {
        await sendFCMMessageV1(token, title, body, itemId);
      }, delay);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notificación programada',
          scheduledFor: new Date(scheduledTime).toISOString()
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      await sendFCMMessageV1(token, title, body, itemId);
      return new Response(
        JSON.stringify({ success: true, message: 'Notificación enviada inmediatamente' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function getAccessToken(): Promise<string> {
  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Credenciales de Firebase no configuradas');
  }

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

  const signInput = `${header}.${payload}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(signInput);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    decodeBase64ToArrayBuffer(FIREBASE_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
  const signatureB64 = arrayBufferToBase64(signature);

  const jwt = `${signInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function sendFCMMessageV1(token: string, title: string, body: string, itemId?: string) {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: title,
            body: body
          },
          webpush: {
            headers: {
              Urgency: "high",
              TTL: "86400"
            },
            notification: {
              icon: 'https://josephinemarch.github.io/Panel-Maria/src/assets/icon-192.png',
              badge: 'https://josephinemarch.github.io/Panel-Maria/src/assets/icon-192.png',
              tag: itemId ? `kai-alarm-${itemId}` : 'kai-alarm',
              sound: 'default'
            },
            fcmOptions: {
              link: 'https://josephinemarch.github.io/Panel-Maria/?action=alarm'
            }
          },
          data: {
            itemId: itemId || '',
            type: 'alarm'
          }
        }
      })
    });

    const result = await response.json();
    console.log('FCM V1 Response:', result);
    return result;
  } catch (error) {
    console.error('FCM V1 Error:', error);
    return { error: error.message };
  }
}
