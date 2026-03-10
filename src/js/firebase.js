import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js';
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

export async function requestFCMToken() {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('FCM: Permiso de notificaciones denegado');
            return null;
        }

        const registrations = await navigator.serviceWorker.getRegistrations();
        const registration = registrations.find(reg => reg.active?.scriptURL.includes('sw.js'));

        if (!registration) {
            console.error('FCM: No se encontró el Service Worker principal (sw.js) registrado');
            return null;
        }

        console.log('FCM usando SW principal:', registration);

        const token = await getToken(messaging, {
            vapidKey: 'BCHREiBU8nAuYsdRrXCovUK5a1hCoQGHMAAeITKaWWD8eAg8Urp8_dKPkNv7zSbmJDLJ-nz04Mz3wdN13NV417Q',
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('FCM Token:', token);
            localStorage.setItem('fcmToken', token);

            await saveTokenToSupabase(token);

            return token;
        }
    } catch (error) {
        console.error('FCM Error:', error);
    }
    return null;
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

export async function onForegroundMessage() {
    onMessage(messaging, async (payload) => {
        console.log('Mensaje recibido en foreground:', payload);
        const notificationTitle = payload.notification?.title || 'KAI';
        const notificationOptions = {
            body: payload.notification?.body || 'Tienes una nueva alerta',
            icon: '/src/assets/icon-192.png',
            badge: '/src/assets/icon-192.png',
            tag: payload.data?.tag || 'kai-notification',
            data: payload.data,
            vibrate: [200, 100, 200]
        };

        if (Notification.permission === 'granted') {
            try {
                // En móviles (Android Chrome), 'new Notification' está bloqueado. Debe usarse el ServiceWorker.
                const registrations = await navigator.serviceWorker.getRegistrations();
                const sw = registrations.find(reg => reg.active && reg.active.scriptURL.includes('sw.js'));

                if (sw) {
                    await sw.showNotification(notificationTitle, notificationOptions);
                } else {
                    // Fallback para escritorio si no hay SW activo
                    new Notification(notificationTitle, notificationOptions);
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
