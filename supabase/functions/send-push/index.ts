import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const FCM_PROJECT_ID = 'panel-de-control-maria';
const FIREBASE_CLIENT_EMAIL = 'panel-de-control-maria@appspot.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChKKdKFNkhKhWo
PbtATKxC6mMttfMdSKXyANuEIaHqYeaUEHFJVzIFLGWmNPPBREESLrxipCiKaY1T
h52kx7TkqiMjVubuVyor19JdfOy4v6gh2xhqMcvjoYwFUrLfGmemcViqzYovB0ll
lgu/oeQMbPY2iroqpIOHKzerejJJ/wTwE3co8mk7SH0H/UzR5NoqlMiXrz6FzBu7
rYfHgrmZlUMECvTVqLXAu7lm8Z3Nmx5AIn8fOgRa09efWBXRONvdIZeTac7D77CC
SyoIpdpOxtnw1w5d7EiELf1cPTkPL0h+e6JdHUDRkCM+aOFCy1JwoLmHEN6OqWII
AWCyT6hdAgMBAAECggEAAtR4F5Iae/1wCEEeltL3MBeglTloOFVBwL2ox9RgB6x0
xEMuUheLY9GImWy9nmEIntKeRpcpCmvZv6Pr2JcUg0gaOjEjo1TO2JqUxu/TfQJf
PUpKeUxAOdI+PLZb42oPHuTyUHwv1y09aeDCz7h+jNn5pYc1x1uV3wZFwdJGrCDx
97vuPJ6fi0DzFrk9l5YfDN2287cN8MekcFd6m4hvEjsyB2SbrfrAvOG8CMvU0Wf8
1KUMZgJvHIuI5LACajksQH4eOMDkLO1ClWCVKjmzKlJwEiOkxScpSVLRe5X2rtkD
CcoWsz64gDHv2pFbTalevZHbAJdp4UA7ZWqB4AnfGwKBgQC57LxG0RUXS8BiU/lK
rsoEoN/vz4uRRu3iI8b0+e8nk/pyGGz+Hoc6Mm9sO703dDUvoK2M7sbqwNLq7KgK
J9zoqX7vdDUg12KfmiUJNsOw/8jsPRUoDIf24nOJtCdZJVjGEArxSTmZZoB8wMZE
KgG176AEXshHjHGFhdngUxjHkwKBgQDd5lVz60RjWdztze6CTizSbSyZ4cGnbLX8
y2pih38LhAHAXY3Idr9MQXxU6RfwLT+eU7QJkge0gPuZfYHdajOeTRjzfGxYGYlu
MWiOdHxOAe2QvTNnt2Y5IPtpl/hNsjhDcuXjBF9kLwOgmEg3qB3K3EvOAlZ/zOrJ
pD9QDbTmTwKBgFJ4TfNjnuVcdpOnB/c2nOl8qphnCVOBkNc0Y3YavxhhLUAa0Y3O
4NDRulbaEM5eP5FGxnSzHYzXxzbpjogisnyJYoK4mzBcGaUN7MuvfRIwA2G2noHL
PSwnunQkcye5xyzjxNbOUjxXGTs9DzUBJQ0co3AM0u3ZwCkn/ELi2ST9AoGAU2Mf
cbRTutImR+c/XhBqn5kPTbScxYIA0cLPc79fasBsuBFwGoklUk65nl8J8+PNKH5k
BcSuyJI/+mpDxyUFyNNIMRfszx6pmpNOq1ny7I2k7ONs0ekFrSpL0F6fnPMAWbhv
02PtRQS15D/Vw7SVnYozonMWdmhXQvdKI5dDB9kCgYBEE7JQOD86V3lUrIHQPstl
xloKiEWgVFv9CZHrHMcCz9KG23nT2WtfDhxtsoynlUl+84OIoknYMuoTaVy9MNkC
G5gJqx8VDrsITTR1GV9L3tcbyaIiMvaT8FUAQCwillstP5c9VXPFA+9xLocmEJ3C
EW4F9T9383x0zg0wwAAJIA==
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
      
      const results = [];
      for (const ts of timestamps) {
        const delay = ts - Date.now();
        if (delay > 0) {
          setTimeout(() => sendFCMMessageV1(token, title, body, itemId, extraData), delay);
          results.push({ scheduledFor: new Date(ts).toISOString(), delay });
        } else {
          const result = await sendFCMMessageV1(token, title, body, itemId, extraData);
          results.push({ sent: true, result });
        }
      }
      
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

    // Programar notificaciones
    for (const ts of timestamps) {
      const delay = ts - Date.now();
      if (delay > 0) {
        setTimeout(() => sendFCMToAll(tokens, title, body, itemId, extraData), delay);
      } else {
        await sendFCMToAll(tokens, title, body, itemId, extraData);
      }
    }

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
        notification: {
          title: title,
          body: body
        },
        data: {
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
    
    if (!response.ok) {
      console.error('❌ FCM Error:', JSON.stringify(result));
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
