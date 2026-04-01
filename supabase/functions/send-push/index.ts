import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const FCM_PROJECT_ID = 'panel-de-control-maria';
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, title, body, timestamp, itemId } = await req.json();

    // Si se pasa un token específico, enviar solo a ese token (para testing)
    if (token && typeof token === 'string' && token.length > 20) {
      console.log(`📱 Enviando a token específico: ${token.substring(0, 30)}...`);
      
      const result = await sendFCMMessageV1(token, title, body, itemId);
      const successful = result.messageId ? 1 : 0;
      
      return new Response(
        JSON.stringify({ 
          success: successful === 1, 
          message: successful === 1 ? 'Notificación enviada' : 'Error al enviar',
          devices: 1,
          successful: successful,
          fcmResult: result
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sin token específico - buscar todos los tokens del usuario
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Obtener usuario del JWT si existe
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
        try {
            // Crear cliente con auth header para validar el JWT
            const authSupabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            );
            const { data: { user } } = await authSupabase.auth.getUser();
            if (user) {
                userId = user.id;
                console.log('Usuario autenticado:', userId);
            }
        } catch (e) {
            console.log('JWT inválido o ausente, enviando a todos los dispositivos');
        }
    }

    // Buscar tokens: del usuario específico o todos si no hay user
    let query = supabase.from('fcm_tokens').select('token');
    if (userId) {
        query = query.eq('user_id', userId);
    }
    
    const { data: allTokens, error: tokenError } = await query;

    if (tokenError || !allTokens || allTokens.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay dispositivos registrados' }), { status: 400 });
    }

    const tokens = allTokens.map(t => t.token);
    console.log(`📱 Enviando a ${tokens.length} dispositivos (userId: ${userId || 'todos'})`);

    const scheduledTime = timestamp || Date.now() + 60000;
    const timeToSend = new Date(scheduledTime).getTime();
    const now = Date.now();
    const delay = timeToSend - now;

    if (delay > 0) {
      setTimeout(async () => {
        await sendFCMToAll(tokens, title, body, itemId);
      }, delay);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Notificación programada para ${tokens.length} dispositivos`,
          scheduledFor: new Date(scheduledTime).toISOString(),
          devices: tokens.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const result = await sendFCMToAll(tokens, title, body, itemId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Notificación enviada a ${result.successful}/${tokens.length} dispositivos`,
          devices: tokens.length,
          successful: result.successful,
          failed: result.failed
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error en send-push:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getAccessToken(): Promise<string> {
  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Credenciales de Firebase no configuradas en Supabase Edge Function');
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
  if (!tokenData.access_token) {
    throw new Error('No se pudo obtener access token de Firebase: ' + JSON.stringify(tokenData));
  }
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
          data: {
            itemId: itemId || '',
            type: 'alarm',
            title: title,
            body: body
          },
          webpush: {
            headers: {
              Urgency: "high",
              TTL: "86400"
            },
            fcmOptions: {
              link: 'https://josephinemarch.github.io/Panel-Maria/?action=alarm'
            }
          }
        }
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error(`❌ FCM Error para token ${token.substring(0, 30)}...:`, JSON.stringify(result));
    } else {
      console.log(`✅ FCM OK para token ${token.substring(0, 30)}...`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Exception para token ${token.substring(0, 30)}...:`, error);
    return { error: error.message };
  }
}
        }
      }
    })
  });

  const result = await response.json();
  
  // Loguear el error específico de FCM
  if (!response.ok) {
    console.error(`❌ FCM Error para token ${token.substring(0, 30)}...:`, JSON.stringify(result));
    if (result.error) {
      console.error(`   Código: ${result.error.status}, Mensaje: ${result.error.message}`);
    }
  } else {
    console.log(`✅ FCM OK para token ${token.substring(0, 30)}...`);
  }
  
  return result;
}

async function sendFCMToAll(tokens: string[], title: string, body: string, itemId?: string) {
  console.log(`📱 Enviando notificación a ${tokens.length} dispositivos`);
  
  let successful = 0;
  let failed = 0;
  
  for (const token of tokens) {
    try {
      const result = await sendFCMMessageV1(token, title, body, itemId);
      if (result.messageId) {
        successful++;
      } else {
        failed++;
      }
    } catch (e) {
      console.error(`❌ Token falló:`, e);
      failed++;
    }
  }
  
  console.log(`✅ Enviados: ${successful}, ❌ Fallidos: ${failed}`);
  
  return { successful, failed };
}
  });
  
  return { successful, failed };
}
