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
gKGE8kKHgrwZXgnY+nRYCYgcDQKBgQDS3PGiDAwFCasaPmK8yqTt69R1qWqLzpTL3
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
    console.log('🔔 check-alarms invoked at', new Date().toISOString());

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query pending alarms due within the next 30 seconds
    const { data: pendingAlarms, error: queryError } = await supabase
      .from('alarm_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('deadline', new Date(Date.now() + 30000).toISOString())
      .order('deadline', { ascending: true });

    if (queryError) {
      console.error('❌ Error querying pending alarms:', queryError);
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingAlarms || pendingAlarms.length === 0) {
      console.log('✅ No pending alarms to process');
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, failed: 0, noTokens: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${pendingAlarms.length} pending alarm(s)`);

    let sent = 0;
    let failed = 0;
    let noTokens = 0;

    for (const alarm of pendingAlarms) {
      try {
        console.log(`⏰ Processing alarm for item ${alarm.item_id}, deadline: ${alarm.deadline}`);

        // Get FCM tokens for the user
        const { data: tokensData, error: tokenError } = await supabase
          .from('fcm_tokens')
          .select('token')
          .eq('user_id', alarm.user_id);

        if (tokenError || !tokensData || tokensData.length === 0) {
          console.warn(`⚠️ No FCM tokens for user ${alarm.user_id}`);
          noTokens++;
          await supabase
            .from('alarm_notifications')
            .update({ status: 'failed', error_message: 'No FCM tokens', updated_at: new Date().toISOString() })
            .eq('id', alarm.id);
          continue;
        }

        const tokens = tokensData.map(t => t.token);
        console.log(`📱 Found ${tokens.length} token(s) for user ${alarm.user_id}`);

        // Send push to all tokens
        let allSuccess = true;
        for (const token of tokens) {
          const result = await sendFCMMessageV1(token, alarm.title, alarm.body, alarm.item_id, {
            priority: alarm.priority,
            type: 'alarm'
          });

          if (!result.messageId) {
            allSuccess = false;
            console.error(`❌ Failed to send to token ${token.substring(0, 20)}...`);
          }
        }

        if (allSuccess) {
          console.log(`✅ Alarm sent successfully for item ${alarm.item_id}`);
          sent++;

          // Update alarm status
          await supabase
            .from('alarm_notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', alarm.id);

          // Handle repeat: update item deadline for next cycle
          const { data: item } = await supabase
            .from('items')
            .select('repeat, deadline')
            .eq('id', alarm.item_id)
            .single();

          if (item && item.repeat) {
            const nextDeadline = calculateNextDeadline(item.deadline, item.repeat);
            if (nextDeadline) {
              console.log(`🔄 Updating item ${alarm.item_id} deadline to ${nextDeadline} (${item.repeat})`);
              await supabase
                .from('items')
                .update({ deadline: nextDeadline })
                .eq('id', alarm.item_id);
              // The trigger will automatically create a new alarm_notification
            }
          }
        } else {
          console.error(`❌ Some tokens failed for alarm ${alarm.id}`);
          failed++;
          await supabase
            .from('alarm_notifications')
            .update({ status: 'failed', error_message: 'Some tokens failed', updated_at: new Date().toISOString() })
            .eq('id', alarm.id);
        }
      } catch (err) {
        console.error(`❌ Error processing alarm ${alarm.id}:`, err);
        failed++;
        await supabase
          .from('alarm_notifications')
          .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
          .eq('id', alarm.id);
      }
    }

    const summary = {
      processed: pendingAlarms.length,
      sent,
      failed,
      noTokens
    };

    console.log('📊 Summary:', JSON.stringify(summary));

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in check-alarms:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateNextDeadline(currentDeadline: string, repeat: string): string | null {
  const date = new Date(currentDeadline);
  
  switch (repeat) {
    case 'daily':
      date.setHours(date.getHours() + 24);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      return null;
  }
  
  return date.toISOString();
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

    const isHighPriority = extraData?.priority === 'high';

    const payload: any = {
      message: {
        token: token,
        // BLOQUE notification: Android lo muestra en la bandeja del sistema
        // incluso si el Service Worker no está vivo (Chrome killed, Doze mode)
        notification: {
          title: title,
          body: body,
        },
        // BLOQUE data: El Service Worker lo recibe para acciones custom (snooze)
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
          priority: isHighPriority ? 'high' : 'default',
          ttl: '86400000', // 24 horas — FCM reintenta si el dispositivo está offline
          notification: {
            // Configuración específica de Android para máxima visibilidad
            channelId: 'alarmas',
            title: title,
            body: body,
            defaultSound: true,
            defaultVibrateTimings: true,
            notificationCount: 1,
            // Icono por defecto de Android
            icon: 'ic_notification',
          }
        },
        webpush: {
          headers: {
            Urgency: isHighPriority ? 'high' : 'normal',
            TTL: '86400'
          },
          notification: {
            title: title,
            body: body,
            icon: 'https://josephinemarch.github.io/Panel-Maria/src/assets/icon-192.png',
            badge: 'https://josephinemarch.github.io/Panel-Maria/src/assets/icon-192.png',
            tag: itemId || 'kai-alarm',
            requireInteraction: true,
            vibrate: isHighPriority ? [200, 100, 200, 100, 200] : [200, 100, 200],
          },
          fcmOptions: {
            link: `https://josephinemarch.github.io/Panel-Maria/?action=alarm&itemId=${itemId || ''}`
          }
        }
      }
    };

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log('📨 FCM status:', response.status);
    console.log('📨 FCM body:', JSON.stringify(result));
    
    if (!response.ok) {
      console.error('❌ FCM Error:', JSON.stringify(result));
      return { success: false, fcmError: result };
    } else {
      console.log('✅ FCM OK:', result.messageId);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Exception:', error);
    return { error: error.message };
  }
}
