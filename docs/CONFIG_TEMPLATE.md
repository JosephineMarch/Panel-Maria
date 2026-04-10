# 📋 Plantilla de Configuración - Características de App Web

Esta guía documenta la configuración completa para implementar una app web con autenticación, base de datos, y notificaciones push.

---

## TABLA DE CONTENIDOS

1. [Autenticación (Supabase Auth)](#1-supabase-auth)
2. [Base de Datos](#2-base-de-datos)
3. [Notificaciones Push (Firebase + Supabase)](#3-notificaciones-push)
4. [Service Worker](#4-service-worker)
5. [PWA Manifest](#5-pwa-manifest)
6. [Frontend: Módulos JS](#6-frontend-módulos-js)
7. [Workflow Completo](#7-workflow-completo)
8. [Checklist para Nueva App](#8-checklist-para-nueva-app)
9. [Variables de Entorno](#9-variables-de-entorno)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. SUPABASE AUTH

### 1.1 Configuración en Supabase Dashboard

1. Ir a **Authentication** → **Providers**
2. Habilitar **Email** (para login con email/password)
3. Habilitar **Google** (opcional, requiere configurar OAuth en Google Cloud)

### 1.2 Configuración de Email

```yaml
# En Supabase: Authentication → Settings → Email
- Enable email signups: ✅
- Confirm email: ✅ (opcional - desactivar para auto-confirmar)
- Enable password recovery: ✅
```

### 1.3 Configuración de Google OAuth

```yaml
# En Supabase: Authentication → Providers → Google
- Client ID: [desde Google Cloud Console]
- Client Secret: [desde Google Cloud Console]
- Authorized Redirect URI: https://TU_PROYECTO.supabase.co/auth/v1/callback
```

### 1.4 auth.js (Módulo de autenticación)

```javascript
// src/js/auth.js
import { supabase } from './supabase.js';

export const auth = {
    currentUser: null,

    async init() {
        // Obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        this.currentUser = session?.user || null;
        
        // Escuchar cambios de estado de auth
        supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            this.handleAuthChange(event, session);
        });

        return this.currentUser;
    },

    handleAuthChange(event, session) {
        // Dispatch evento para otros módulos
        const eventName = `auth-${event}`;
        window.dispatchEvent(new CustomEvent(eventName, { detail: session }));
    },

    // Registro con email/password
    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    // Login con email/password
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        this.currentUser = data.user;
        return data;
    },

    // Login con Google OAuth
    async signInWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin.includes('localhost')
                    ? window.location.origin 
                    : 'https://TU_DOMINIO.github.io/TU_PROYECTO/'
            }
        });
        if (error) throw error;
        return data;
    },

    // Logout
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        this.currentUser = null;
    },

    // Obtener usuario actual
    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        this.currentUser = user;
        return user;
    },

    isAuthenticated() {
        return !!this.currentUser;
    }
};
```

### 1.5 supabase.js (Cliente de Supabase)

```javascript
// src/js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuración de tipos de la app
export const CONFIG = {
    types: ['nota', 'tarea', 'proyecto', 'directorio'],
    
    typeIcons: {
        nota: '📝',
        tarea: '✅',
        proyecto: '📁',
        directorio: '🔗',
    },
    typeColors: {
        nota: '#FFF2A1',
        tarea: '#A1DFFF',
        proyecto: '#FFB7C5',
        directorio: '#C9B8FF',
    }
};
```

---

## 2. BASE DE DATOS

### 2.1 Tabla: items (principal)

```sql
-- items: tabla principal de la app
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'nota' CHECK (type IN ('nota', 'tarea', 'proyecto', 'directorio')),
    parent_id UUID REFERENCES items(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'active', 'completed', 'archived')),
    descripcion TEXT DEFAULT '',
    url TEXT DEFAULT '',
    tareas JSONB DEFAULT '[]',
    tags TEXT[] DEFAULT '{}',
    deadline TIMESTAMPTZ,
    repeat TEXT,
    anclado BOOLEAN DEFAULT false,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own items" ON items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" ON items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON items
    FOR DELETE USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_parent_id ON items(parent_id);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_items_deadline ON items(deadline) WHERE deadline IS NOT NULL;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 Tabla: fcm_tokens (push notifications por dispositivo)

```sql
-- fcm_tokens: tokens de dispositivos para push notifications
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_name TEXT DEFAULT 'Unknown',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_token ON fcm_tokens(token);

-- Auto-update last_used
CREATE OR REPLACE FUNCTION update_fcm_token_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fcm_token_last_used
    BEFORE UPDATE ON fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_fcm_token_last_used();
```

### 2.3 Tabla: alarm_notifications (alarmas programadas)

```sql
-- alarm_notifications: alarmas para push notifications
CREATE TABLE IF NOT EXISTS alarm_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    deadline TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alarm_notifications_status_deadline 
    ON alarm_notifications (status, deadline) 
    WHERE status = 'pending';

-- RLS
ALTER TABLE alarm_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alarm notifications"
    ON alarm_notifications FOR SELECT
    USING (user_id = auth.uid());
```

---

## 3. NOTIFICACIONES PUSH

### 3.1 Firebase Configuration

#### 3.1.1 Crear Proyecto en Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear nuevo proyecto
3. Habilitar **Cloud Messaging** (FCM)
4. Registrar como **Web App**

#### 3.1.2 Configuración Firebase (frontend)

```javascript
// src/js/firebase.js
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.firebasestorage.app",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};
```

#### 3.1.3 Generar VAPID Key

1. Firebase Console → Project Settings → Cloud Messaging
2. Generar par de claves Web
3. Guardar la **clave pública** (VAPID key)

### 3.2 Supabase Edge Functions

#### 3.2.1 check-alarms (se ejecuta cada minuto)

```typescript
// check-alarms/index.ts
const FCM_PROJECT_ID = 'TU_PROYECTO_FIREBASE';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@TU_PROYECTO.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----...`;

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar alarmas pendientes en los próximos 30 segundos
    const { data: pendingAlarms } = await supabase
        .from('alarm_notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('deadline', new Date(Date.now() + 30000).toISOString());

    for (const alarm of pendingAlarms) {
        const { data: tokensData } = await supabase
            .from('fcm_tokens')
            .select('token')
            .eq('user_id', alarm.user_id);

        if (!tokensData?.length) {
            await supabase.from('alarm_notifications')
                .update({ status: 'failed', error_message: 'No FCM tokens' })
                .eq('id', alarm.id);
            continue;
        }

        for (const token of tokensData.map(t => t.token)) {
            await sendFCMMessageV1(token, alarm.title, alarm.body, alarm.item_id, {
                priority: alarm.priority,
                type: 'alarm'
            });
        }

        await supabase.from('alarm_notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', alarm.id);

        // Manejar repeat (daily/weekly/monthly)
        // ... actualizar deadline del item
    }

    return new Response(JSON.stringify({ processed: pendingAlarms?.length ?? 0 }));
});
```

#### 3.2.2 send-push (envío manual)

```typescript
// send-push/index.ts
serve(async (req) => {
    const { title, body, type, itemId } = await req.json();

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: allTokens } = await supabase
        .from('fcm_tokens')
        .select('token');

    for (const token of allTokens.map(t => t.token)) {
        await sendFCMMessageV1(token, title, body, itemId);
    }

    return new Response(JSON.stringify({ success: true }));
});
```

### 3.3 Supabase Cron Job

```sql
-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Programar job (cada minuto)
SELECT cron.schedule(
    'check-alarms-every-minute',
    '* * * * *',
    $$
        SELECT net.http_post(
            url := 'https://TU_PROYECTO.supabase.co/functions/v1/check-alarms',
            body := '{}'::jsonb,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    $$
);
```

### 3.4 Database Trigger (items → alarm_notifications)

```sql
-- Trigger para sincronizar items con alarm_notifications
CREATE OR REPLACE FUNCTION sync_alarm_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF 'urgente' = ANY(COALESCE(NEW.tags, ARRAY[]::TEXT[])) THEN
        NEW.title := '⚠️ URGENTE';
    ELSIF 'salud' = ANY(NEW.tags) THEN
        NEW.title := '💊 Salud';
    ELSE
        NEW.title := '⏰ Recordatorio';
    END IF;

    IF NEW.deadline IS NOT NULL AND NEW.user_id IS NOT NULL THEN
        INSERT INTO alarm_notifications (item_id, user_id, deadline, title, body, priority, status)
        VALUES (NEW.id, NEW.user_id, NEW.deadline, NEW.title, NEW.content, 'normal', 'pending')
        ON CONFLICT (item_id) DO UPDATE SET
            deadline = EXCLUDED.deadline,
            status = 'pending',
            updated_at = NOW();
    ELSE
        UPDATE alarm_notifications
        SET status = 'cancelled'
        WHERE item_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_alarm_notification
    AFTER INSERT OR UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION sync_alarm_notification();
```

### 3.5 firebase.js (Frontend)

```javascript
// src/js/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js';
import { supabase } from './supabase.js';

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.firebasestorage.app",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Generar y guardar token FCM
export async function requestFCMToken(silent = false) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        if (!silent) alert('Permiso de notificaciones denegado');
        return null;
    }

    let registration = (await navigator.serviceWorker.getRegistrations())
        .find(reg => reg.active?.scriptURL.includes('sw.js'));
    
    if (!registration) {
        registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        await navigator.serviceWorker.ready;
    }

    const token = await getToken(messaging, {
        vapidKey: 'TU_VAPID_KEY_PUBLICA',
        serviceWorkerRegistration: registration
    });

    if (token) {
        localStorage.setItem('fcmToken', token);
        localStorage.setItem('fcmTokenTime', Date.now().toString());
        await saveTokenToSupabase(token);
        return token;
    }
    return null;
}

// Guardar token en Supabase
async function saveTokenToSupabase(token) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('fcm_tokens').upsert({
        user_id: user.id,
        token: token,
        device_name: (navigator.userAgent || 'Unknown').substring(0, 100)
    }, { onConflict: 'token' });
}

// Refrescar token automáticamente (después de 6 días)
export async function refreshFCMTokenIfNeeded() {
    const storedToken = localStorage.getItem('fcmToken');
    const tokenTime = localStorage.getItem('fcmTokenTime');
    
    if (!storedToken || !tokenTime || 
        Date.now() - parseInt(tokenTime) > 6 * 24 * 60 * 60 * 1000) {
        return await requestFCMToken();
    }
    return storedToken;
}

// Recibir notificaciones en foreground
export async function onForegroundMessage() {
    onMessage(messaging, async (payload) => {
        const title = payload.data?.title || payload.notification?.title || 'App';
        const body = payload.data?.body || payload.notification?.body || 'Nueva alerta';
        
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                icon: './src/assets/icon-192.png',
                data: payload.data,
                vibrate: [200, 100, 200]
            });
        }
    });
}

// Polling para detectar rotación de tokens
export function startTokenRefreshListener() {
    setInterval(async () => {
        const storedToken = localStorage.getItem('fcmToken');
        const currentToken = await getToken(messaging, {
            vapidKey: 'TU_VAPID_KEY_PUBLICA'
        });
        
        if (currentToken && currentToken !== storedToken) {
            localStorage.setItem('fcmToken', currentToken);
            localStorage.setItem('fcmTokenTime', Date.now().toString());
            await saveTokenToSupabase(currentToken);
        }
    }, 60 * 60 * 1000); // Cada hora
}
```

---

## 4. SERVICE WORKER

```javascript
// sw.js - debe estar en la raíz del proyecto
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const title = data.title || 'App';
    const options = {
        body: data.body || 'Nueva notificación',
        icon: './src/assets/icon-192.png',
        badge: './src/assets/icon-192.png',
        data: data,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'snooze', title: 'Posponer' }
        ]
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        clients.openWindow('https://TU_DOMINIO/');
    } else if (event.action === 'snooze') {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                clientList[0]?.postMessage({ action: 'snooze', itemId: event.notification.data?.itemId });
            })
        );
    }
});
```

---

## 5. PWA MANIFEST

```json
// manifest.json
{
    "name": "Mi App - Panel de Control",
    "short_name": "MiApp",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#4F46E5",
    "icons": [
        {
            "src": "src/assets/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "src/assets/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```

---

## 6. FRONTEND: INTEGRACIÓN

### 6.1 index.html (Head)

```html
<head>
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json">
    
    <!-- Service Worker -->
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }
    </script>
</head>
```

### 6.2 app.js (Inicialización)

```javascript
// src/js/app.js
import { auth } from './auth.js';
import { requestFCMToken, refreshFCMTokenIfNeeded, onForegroundMessage, startTokenRefreshListener } from './firebase.js';

async function initApp() {
    // 1. Inicializar auth
    await auth.init();
    
    // 2. Inicializar FCM
    await refreshFCMTokenIfNeeded();
    onForegroundMessage();
    startTokenRefreshListener();
}

initApp();
```

---

## 7. WORKFLOW COMPLETO

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuario   │────▶│  Supabase   │────▶│  Firebase   │
│  (Browser)  │     │   (Auth)    │     │   (FCM)     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                                        │
      │ 1. Login (email/password o Google)    │
      │ 2. getToken() → FCM token             │
      │ 3. Guardar en fcm_tokens               │
      │                                        │
      ▼                                        ▼
┌─────────────┐                          ┌─────────────┐
│ localStorage│                          │  pg_cron    │
│ session     │                          │  check-alarms│
└─────────────┘                          └─────────────┘
```

---

## 8. CHECKLIST PARA NUEVA APP

### Autenticación
- [ ] Crear proyecto en Supabase
- [ ] Configurar provider de email en Supabase Auth
- [ ] (Opcional) Configurar Google OAuth
- [ ] Copiar auth.js y supabase.js al proyecto

### Base de Datos
- [ ] Ejecutar migración SQL para tabla items
- [ ] Ejecutar migración SQL para tabla fcm_tokens
- [ ] Ejecutar migración SQL para tabla alarm_notifications

### Push Notifications
- [ ] Crear proyecto en Firebase Console
- [ ] Habilitar Cloud Messaging
- [ ] Descargar private key (service account)
- [ ] Copiar VAPID public key
- [ ] Deploy edge function check-alarms
- [ ] Deploy edge function send-push
- [ ] Configurar pg_cron job
- [ ] Copiar firebase.js y sw.js al proyecto

### PWA
- [ ] Agregar manifest.json
- [ ] Crear iconos (192x192, 512x512)
- [ ] Registrar Service Worker en index.html

### Testing
- [ ] Login con email/password
- [ ] Login con Google
- [ ] Generar token FCM
- [ ] Enviar push manual
- [ ] Probar alarma programada

---

## 9. VARIABLES DE ENTORNO

| Variable | Descripción | Dónde obtener |
|----------|-------------|---------------|
| `SUPABASE_URL` | URL del proyecto | Supabase Dashboard |
| `SUPABASE_ANON_KEY` | Clave pública anon | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta (solo Edge Functions) | Supabase Settings → API |
| `FCM_PROJECT_ID` | ID del proyecto Firebase | Firebase Console |
| `FIREBASE_CLIENT_EMAIL` | Email del service account | Firebase → Project Settings → Service Accounts |
| `FIREBASE_PRIVATE_KEY` | Private key del service account | Firebase → Project Settings → Service Accounts |
| `VAPID_KEY` | Clave pública VAPID | Firebase → Project Settings → Cloud Messaging |

---

## 10. TROUBLESHOOTING

### Error: "No unique constraint matching ON CONFLICT"
```sql
ALTER TABLE alarm_notifications 
ADD CONSTRAINT alarm_notifications_item_id_unique UNIQUE (item_id);
```

### Tokens no se guardan en Supabase
1. Verificar RLS en fcm_tokens
2. Verificar que el usuario está autenticado (`auth.uid()`)
3. Revisar logs de Supabase (API)

### Push no llega a Android
1. Instalar como PWA (no funciona en Chrome normal de Android)
2. Verificar permisos de notificaciones en Android
3. Revisar Firebase Console → Cloud Messaging → Debug View

### Push no llega a iOS (Safari)
- Safari no soporta Web Push Notifications en iOS
- Necesita usar Web Push de Apple (APNs) - configuración adicional

### Error 42P10 en Supabase
- Agregar constraint UNIQUE a la columna referenciada en ON CONFLICT
- Verificar que no haya duplicados antes de crear la constraint

---

*Documento generado desde Panel-Maria - 2026-04-10*