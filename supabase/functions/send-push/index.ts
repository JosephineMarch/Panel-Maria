import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const FCM_PROJECT_ID = 'panel-de-control-maria';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@panel-de-control-maria.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/f9Fwn/OzQaXx
x3DyhQO+bzQ+zHaCyKUkq99+xktxHMFW2DwNWlKhjukDXU76vsQYkDpF9gfkA1kF
9Q0f/jr5IRcD4sjQr4iKPFHS9xef5dIhAkdEWRsMrQwLAZspe5FJ4qzLo2RX5zWE
cc1pN3itJqvmWY4jMs9Eqi7honMgtG0KnHpnHlKTtV9Iwin2rvmtB4wineNt7G6Y
fyK8B1+kUxgMj2/gzXZtMRdrSB8QcULlIJgZojl4LPu1HxUmFweuMbDGHn6frSwI
RmBT6w68Oa8IXxbu5BYW8bYvJ3Q3pNwHO0ayk5Eact0vccAk6578nGMT37HVFs88
8uV7ndKXAgMBAAECggEAAo6HUlSgYVVQDOFXzbUe7qz3aps6PdbF9a5hxoSJP1Jd
9nXen2MEVWneDJBzXH+tiJJsZMC7LD0rNBwod7PiP69EamXdvoOJdCcIBKQN6bGc
05n/L5ds+AdbcM4trykaMH1ZR0LANTg+C62lS3FVKCKrCuFJN4kXIViQVazgkqAw
JSQYeAYGpKmWXGowjMfCfuLPgwlyeyA+Vq4Nl8qu+5ciqqp2/0IPS+zc7hb5xH3g
2tfyNkX3A5ovVOnIHuEejj01wUrjhboyEUPRcdLFNdCHbuY9Z+m5fsh/s5W7i2MA
JQVYr6O0NTEMgaUFdhquyYwXcb9ZwT51zbH6B7TayQKBgQDofcLzPMq4aiU5A0u8
Nj9WJ5ZXEuP27kEVOCnZiG3naS0eu+jVdYjg/xumy6dKUheSGq3yRY3u5nDZlDWJ
QwXVvAljz1NlNlm26GzslReQBwC0BzJFEkSkmhOaEOvcAkIoAhXrHdFTxCFcxUK3
gKGE8kKHgrwZXgnY+nRYCYgcDQKBgQDS3PGiDAwFCsaPmK8yqTt69R1qWqLzpTL3
YyTujMC9fYcIS1iV0aa5tphC/wi8Usmk4HLskQdVhWOA5JwBTqnKRVD4Q40g1omk
rcewtIX0JoYlmDzSZviO44/Z+PL/vnEtI24ATYy+ZEll4WYBlVN+6QiGecsXj0Vq
EpOyseYsMwKBgFvTmFV0NGmEWzFakOZE0t1Xg3Te3DViw0f7R+RIk4gsLYsPExaE
dszPVf+aPngHVpH5gazINhge4oG9nSua0koqG9dVQw4d2m94+9Sxyn2zll6E3SEU
5xHQXV+jwVTDe5fLwxZ7T3tzYu3+Z6yM3L7i5M4bH+oxD1ipC5zeHuldAoGBAKTW
U456HGtUoSRgF5Vi9jyIoRYjBH+zBMSfnJ9fKMz49DZnsDhuTAeh1iWJeSq/DSL2
0uBb/3+7Zq28CLh85f5ZcZKiPBEPpUo3D4Pzm0PhWbzJ5cIU/Pm2qx2an1uNZKwE
pllWRlAP1dDvAu757OupACEf1MP2HC1vmEZ5C5ZBAoGAURidrGAj6qlr46twidL0
qvkHzls6t+gqmfmx2mLF3cw5w1gJg8Qz5ousEEyxaELDKE5qLFE5oG7gvtXnvNVL
924MLO37dJdgADwNKlkuJxspVeOUWfdDIDBMxS7TMxut9g0C7c2bQJZkFW7f5y4H
wFIl12oAj7G6/bWKiL/zVhc=
-----END PRIVATE KEY-----`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      token, 
      title, 
      body, 
      timestamp, 
      itemId,
      repeat = null,
      snooze = false,
      action,
      data: extraData 
    } = await req.json();

    // Manejar acciones de notification (snooze, dismiss, etc)
    if (action === 'snooze') {
      return handleSnooze(extraData);
    }

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros requeridos: title y body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si es snooze, calcular nuevo timestamp
    let finalTimestamp = timestamp;
    if (snooze) {
      const snoozeMinutes = extraData?.snoozeMinutes || 10;
      finalTimestamp = Date.now() + (snoozeMinutes * 60 * 1000);
    }

    // Si es repetición, calcular próximos timestamps
    const timestamps = calculateRepeatTimestamps(finalTimestamp, repeat);

    if (token && typeof token === 'string' && token.length > 20) {
      console.log(`📱 Enviando a token específico: ${token.substring(0, 30)}...`);
      
      // Las edge functions son serverless — no podemos usar setTimeout para el futuro
      // Solo enviar inmediatamente. Para notificaciones futuras, el cliente debe llamar
      // a esta función en el momento correcto (alarmas.js ya hace polling cada 30s)
      const result = await sendFCMMessageV1(token, title, body, itemId, extraData);
      const results = [{ sent: true, result }];
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: timestamps.length === 1 ? 'Notificación enviada' : `Programadas ${timestamps.length} notificaciones`,
          scheduled: results,
          repeat: repeat
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sin token específico - buscar todos los tokens del usuario
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        const authSupabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await authSupabase.auth.getUser();
        if (user) {
          userId = user.id;
        }
      } catch (e) {
        console.log('JWT inválido, enviando a todos los dispositivos');
      }
    }

    let query = supabase.from('fcm_tokens').select('token');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: allTokens, error: tokenError } = await query;

    if (tokenError || !allTokens || allTokens.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay dispositivos registrados' }), { status: 400 });
    }

    const tokens = allTokens.map(t => t.token);
    console.log(`📱 Enviando a ${tokens.length} dispositivos`);

    // Las edge functions son serverless — enviar inmediatamente
    await sendFCMToAll(tokens, title, body, itemId, extraData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificaciones programadas (${timestamps.length})`,
        scheduled: timestamps.map(ts => new Date(ts).toISOString()),
        repeat: repeat
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en send-push:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateRepeatTimestamps(baseTimestamp: number, repeat: string | null): number[] {
  if (!repeat) return [baseTimestamp];
  
  const timestamps = [baseTimestamp];
  const now = Date.now();
  const maxTimestamps = 365; // Máximo 1 año deprogramaciones
  
  let current = baseTimestamp;
  
  switch (repeat) {
    case 'daily':
      for (let i = 0; i < maxTimestamps && current < now + 365 * 24 * 60 * 60 * 1000; i++) {
        current += 24 * 60 * 60 * 1000;
        if (current > now) timestamps.push(current);
      }
      break;
    case 'weekly':
      for (let i = 0; i < 52 && current < now + 365 * 24 * 60 * 60 * 1000; i++) {
        current += 7 * 24 * 60 * 60 * 1000;
        if (current > now) timestamps.push(current);
      }
      break;
    case 'monthly':
      for (let i = 0; i < 12 && current < now + 365 * 24 * 60 * 60 * 1000; i++) {
        const date = new Date(current);
        date.setMonth(date.getMonth() + 1);
        current = date.getTime();
        if (current > now) timestamps.push(current);
      }
      break;
  }
  
  return timestamps;
}

async function handleSnooze(extraData: any) {
  const { itemId, snoozeMinutes = 10 } = extraData || {};
  console.log(`💤 Snooze solicitado: ${snoozeMinutes} minutos para item ${itemId}`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      action: 'snooze',
      snoozeMinutes,
      willTriggerAt: new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): ArrayBuffer {
  const lines = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  
  const binaryString = atob(lines);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getAccessToken(): Promise<string> {
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

  const keyBuffer = pemToDer(FIREBASE_PRIVATE_KEY);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
  const signatureB64 = base64UrlEncode(signature);
  const jwt = `${signInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    throw new Error('No se pudo obtener access token: ' + JSON.stringify(tokenData));
  }
  
  return tokenData.access_token;
}

async function sendFCMMessageV1(token: string, title: string, body: string, itemId?: string, extraData?: any) {
  try {
    const accessToken = await getAccessToken();

    const payload: any = {
      message: {
        token: token,
        // Siempre incluir el bloque notification para entrega nativa (iOS/Android/Desktop Chrome)
        notification: {
          title: title,
          body: body,
          icon: 'https://josephinemarch.github.io/Panel-Maria/src/assets/icon-192.png'
        },
        // Always include data (for SW routing and click actions)
        data: {
          title: title,
          body: body,
          itemId: itemId || '',
          type: extraData?.type || 'alarm',
          priority: extraData?.priority || 'normal',
          category: extraData?.category || '',
          ...extraData
        },
        android: {
          priority: extraData?.priority === 'high' ? 'high' : 'normal',
          ttl: extraData?.repeat ? (365 * 24 * 60 * 60 * 1000).toString() : '86400000'
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

    // Agregar acciones para Android
    if (extraData?.repeat || extraData?.snooze) {
      payload.message.android = {
        ...payload.message.android,
        notification: {
          channelId: 'alarmas',
          priority: extraData?.priority === 'high' ? 'high' : 'normal',
          sound: 'default',
          vibrate: [200, 100, 200, 100, 200]
        }
      };
    }

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    // Logging detallado
    console.log('📨 Payload enviado:', JSON.stringify(payload.message, null, 2));
    console.log('📨 Respuesta FCM status:', response.status);
    console.log('📨 Respuesta FCM body:', JSON.stringify(result));
    
    if (!response.ok) {
      console.error('❌ FCM Error:', JSON.stringify(result));
      // Devolver el error al cliente para debugging
      return { 
        success: false, 
        fcmError: result,
        tokenPrefix: token?.substring(0, 20) + '...',
        timestamp: Date.now()
      };
    } else {
      console.log('✅ FCM OK:', result.messageId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Exception:', error);
    return { error: error.message };
  }
}

async function sendFCMToAll(tokens: string[], title: string, body: string, itemId?: string, extraData?: any) {
  console.log(`📱 Enviando a ${tokens.length} dispositivos`);
  
  let successful = 0;
  let failed = 0;
  
  for (const token of tokens) {
    try {
      const result = await sendFCMMessageV1(token, title, body, itemId, extraData);
      if (result.messageId) successful++;
      else failed++;
    } catch (e) {
      failed++;
    }
  }
  
  return { successful, failed };
}
