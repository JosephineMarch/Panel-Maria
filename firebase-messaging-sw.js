importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAgsf640E_y-Ry8C6bf5cHMNB7BYjFk6FA",
    authDomain: "panel-de-control-maria.firebaseapp.com",
    projectId: "panel-de-control-maria",
    storageBucket: "panel-de-control-maria.firebasestorage.app",
    messagingSenderId: "434100378252",
    appId: "1:434100378252:web:56c7355bca874a940979a9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || '⏰ KAI - Recordatorio';
    const notificationOptions = {
        body: payload.notification?.body || 'Tienes una alarma programada',
        icon: '/src/assets/icon-192.png',
        badge: '/src/assets/icon-192.png',
        tag: payload.data?.tag || 'kai-alarm',
        data: payload.data,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'Abrir KAI' },
            { action: 'dismiss', title: 'Cerrar' }
        ]
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    for (const client of clientList) {
                        if (client.url.includes('index.html') && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    return clients.openWindow('./index.html');
                })
        );
    }
});
