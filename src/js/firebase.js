import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getMessaging, getToken, onMessage, onTokenRefresh } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js';
import { supabase } from './supabase.js';

const firebaseConfig = {
    apiKey: "AIzaSyAgsf640E_y-Ry8C6bf5cHMNB7BYjFk6FA",
    authDomain: "panel-de-control-maria.firebaseapp.com",
    projectId: "panel-de-control-maria",
    storageBucket: "panel-de-control-maria.firebasestorage.app",
    messagingSenderId: "434100378252",
    appId: "1:434100378252:web:56c7355bca874a940979a9"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function requestFCMToken(silent = false) {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('FCM: Permiso de notificaciones denegado');
            if (!silent) alert('🔔 PERMISO DENEGADO: Necesitás permitir notificaciones en Configuración → Apps → Panel-Maria → Notificaciones');
            return null;
        }

        // Registrar el Service Worker si no existe
        let registration = (await navigator.serviceWorker.getRegistrations())
            .find(reg => reg.active?.scriptURL.includes('sw.js'));
        
        if (!registration) {
            console.log('FCM: Registrando Service Worker...');
            registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
            await navigator.serviceWorker.ready;
            console.log('FCM: SW registrado:', registration);
        }

        console.log('FCM usando SW:', registration);

        const token = await getToken(messaging, {
            vapidKey: 'BCHREiBU8nAuYsdRrXCovUK5a1hCoQGHMAAeITKaWWD8eAg8Urp8_dKPkNv7zSbmJDLJ-nz04Mz3wdN13NV417Q',
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('FCM Token generado:', token.substring(0, 50) + '...');
            localStorage.setItem('fcmToken', token);
            localStorage.setItem('fcmTokenTime', Date.now().toString());

            await saveTokenToSupabase(token);
            return token;
        }
    } catch (error) {
        console.error('FCM Error:', error);
        if (!silent) alert('🔔 ERROR: ' + error.message + '\n\n' + JSON.stringify(error));
    }
    return null;
}

export function isTokenStale() {
    const token = localStorage.getItem('fcmToken');
    const tokenTime = localStorage.getItem('fcmTokenTime');
    
    if (!token || !tokenTime) return true;
    
    const age = Date.now() - parseInt(tokenTime);
    const sixDays = 6 * 24 * 60 * 60 * 1000; // 518400000 ms
    
    return age > sixDays;
}

export async function refreshFCMTokenIfNeeded() {
    const storedToken = localStorage.getItem('fcmToken');
    
    if (!storedToken || isTokenStale()) {
        console.log('🔄 Token FCM stale o ausente, refrescando...');
    }
    
    if (Notification.permission !== 'granted') {
        return await requestFCMToken();
    }
    
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        let registration = registrations.find(reg => reg.active?.scriptURL.includes('sw.js'));
        
        if (!registration) {
            registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
            await navigator.serviceWorker.ready;
        }

        const currentToken = await getToken(messaging, {
            vapidKey: 'BCHREiBU8nAuYsdRrXCovUK5a1hCoQGHMAAeITKaWWD8eAg8Urp8_dKPkNv7zSbmJDLJ-nz04Mz3wdN13NV417Q',
            serviceWorkerRegistration: registration
        });

        if (currentToken) {
            if (currentToken !== storedToken) {
                console.log('🔄 Token FCM cambió, actualizando...');
                console.log('  Token anterior:', storedToken ? storedToken.substring(0, 30) + '...' : '(ninguno)');
                console.log('  Token nuevo:', currentToken.substring(0, 30) + '...');
                localStorage.setItem('fcmToken', currentToken);
                localStorage.setItem('fcmTokenTime', Date.now().toString());
                await saveTokenToSupabase(currentToken);
            } else {
                console.log('✅ Token FCM vigente, sin cambios.');
            }
            return currentToken;
        }
    } catch (error) {
        console.error('Error refrescando token FCM:', error);
    }
    
    return localStorage.getItem('fcmToken');
}

async function saveTokenToSupabase(token) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const deviceName = navigator.userAgent || 'Unknown';

            const { error } = await supabase
                .from('fcm_tokens')
                .upsert({
                    user_id: user.id,
                    token: token,
                    device_name: deviceName.substring(0, 100)
                }, { onConflict: 'token' });

            if (error) {
                console.error('Error guardando token en Supabase:', error);
            } else {
                console.log('✅ Token FCM guardado en Supabase para multi-dispositivo');
            }
        }
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
    }
}

export function startTokenRefreshListener() {
    onTokenRefresh(messaging, async (newToken) => {
        console.log('🔄 Token FCM rotado por Firebase');
        const oldToken = localStorage.getItem('fcmToken');
        console.log('  Token anterior:', oldToken ? oldToken.substring(0, 30) + '...' : '(ninguno)');
        console.log('  Token nuevo:', newToken.substring(0, 30) + '...');
        
        localStorage.setItem('fcmToken', newToken);
        localStorage.setItem('fcmTokenTime', Date.now().toString());
        await saveTokenToSupabase(newToken);
    });
}

export async function onForegroundMessage() {
    onMessage(messaging, async (payload) => {
        console.log('📥 Mensaje recibido en foreground:', payload);
        
        const title = payload.data?.title || payload.notification?.title || 'KAI';
        const body = payload.data?.body || payload.notification?.body || 'Nueva alerta';
        
        const notificationOptions = {
            body: body,
            icon: './src/assets/icon-192.png',
            badge: './src/assets/icon-192.png',
            tag: payload.data?.tag || 'kai-notification',
            data: payload.data,
            vibrate: [200, 100, 200]
        };

        if (Notification.permission === 'granted') {
            try {
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.showNotification(title, notificationOptions);
                } else {
                    new Notification(title, notificationOptions);
                }
            } catch (error) {
                console.error('Error mostrando notificación en foreground:', error);
            }
        }
    });
}

export function getStoredFCMToken() {
    return localStorage.getItem('fcmToken');
}

export { messaging };