const CACHE_NAME = 'kai-cache-v16';
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
    console.log('[SW] Mensaje en segundo plano recibido:', payload);

    // Enviar mensaje a todas las pestañas abiertas para que lo veamos en consola
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'FCM_SW_LOG',
                data: payload
            });
        });
    });

    console.log('[SW] Data:', payload.data);
    console.log('[SW] Notification:', payload.notification);

    const data = payload.data || {};
    const notificationBlock = payload.notification || {};
    const isAlarm = data.type === 'alarm';

    console.log('[SW] Data completa:', JSON.stringify(data));
    console.log('[SW] Hay notification en payload?:', !!notificationBlock);

    // Usar datos del bloque notification si existe, sino del bloque data
    const title = notificationBlock.title || data.title || '⏰ KAI - Recordatorio';
    const body = notificationBlock.body || data.body || 'Tienes algo pendiente';
    const priority = data.priority === 'high' ? 'high' : 'normal';
    
    const notificationOptions = {
        body: body,
        icon: './src/assets/icon-192.png',
        badge: './src/assets/icon-192.png',
        tag: data.itemId || 'kai-alarm',
        data: data,
        vibrate: priority === 'high' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        requireInteraction: true,
        actions: [
            { action: 'snooze', title: '⏱️ 5 min' },
            { action: 'snooze10', title: '⏱️ 10 min' },
            { action: 'dismiss', title: '✕' }
        ]
    };

    if (priority === 'high') {
        notificationOptions.urgency = 'high';
    }

    console.log('[SW] Mostrando notificación con título:', title);
    
    self.registration.showNotification(title, notificationOptions)
        .then(() => {
            console.log('[SW] Notificación mostrada exitosamente');
        })
        .catch((err) => {
            console.error('[SW] Error al mostrar notificación:', err);
        });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const action = event.action;
    const data = event.notification.data || {};
    const itemId = data.itemId;

    console.log('[SW] Notification click:', action, data);

    if (action === 'dismiss') {
        return;
    }

    if (action === 'snooze' || action === 'snooze10') {
        const snoozeMinutes = action === 'snooze10' ? 10 : 5;
        
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('Panel-Maria') || client.url.includes('localhost')) {
                        client.postMessage({
                            type: 'ALARM_SNOOZE',
                            itemId: itemId,
                            minutes: snoozeMinutes
                        });
                        return client.focus();
                    }
                }
                return clients.openWindow('/');
            })
        );
        return;
    }

    if (action === 'open' || !action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    for (const client of clientList) {
                        if (client.url.includes('Panel-Maria') || client.url.includes('localhost')) {
                            client.focus();
                            if (data.action === 'checkin' || data.type === 'checkin') {
                                client.postMessage({ type: 'OPEN_CHECKIN', momento: data.momento });
                            }
                            return client;
                        }
                    }
                    if (data.action === 'checkin' || data.type === 'checkin') {
                        return clients.openWindow(`./?action=checkin&momento=${data.momento || ''}`);
                    }
                    return clients.openWindow(`./?action=alarm&itemId=${itemId || ''}`);
                })
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

const STATIC_ASSETS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './src/assets/icon-192.png',
    './src/assets/icon-512.png',
    './src/assets/icon.svg',
    './src/css/style.css',
    './src/js/supabase.js',
    './src/js/auth.js',
    './src/js/data.js',
    './src/js/ui.js',
    './src/js/logic.js',
    './src/js/ai.js',
    './src/js/cerebras.js',
    './src/js/utils.js',
    './src/js/share.js',
    './src/js/firebase.js',
    './src/js/alarmas.js',
    './src/js/hoy.js'
];

const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

function getStrategy(url) {
    if (url.includes('api') || url.includes('supabase') || url.includes('cerebras')) {
        return CACHE_STRATEGIES.NETWORK_FIRST;
    }
    if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic') || url.includes('cdnjs')) {
        return CACHE_STRATEGIES.CACHE_FIRST;
    }
    if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.svg')) {
        return CACHE_STRATEGIES.CACHE_FIRST;
    }
    if (url.includes('index.html') || url.includes('manifest.json')) {
        return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
    }
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
}

async function cacheFirst(request) {
    if (request.method !== 'GET') {
        return fetch(request);
    }
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

async function networkFirst(request) {
    if (request.method !== 'GET') {
        return fetch(request);
    }
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);

    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
            });
        }
        return networkResponse;
    }).catch(() => null);

    return cachedResponse || fetchPromise || new Response('Offline', { status: 503 });
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(STATIC_ASSETS.map(a => cache.add(a).catch(e => console.warn("[SW] Cache fallback:", a))));
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (url.origin !== location.origin && !url.pathname.startsWith('/')) {
        return;
    }

    const urlWithoutCache = url.pathname + url.search.replace(/[?&]cache=.*$/, '');
    const strategy = getStrategy(urlWithoutCache || request.url);

    let responsePromise;
    switch (strategy) {
        case CACHE_STRATEGIES.CACHE_FIRST:
            responsePromise = cacheFirst(request);
            break;
        case CACHE_STRATEGIES.NETWORK_FIRST:
            responsePromise = networkFirst(request);
            break;
        case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
            responsePromise = staleWhileRevalidate(request);
            break;
        default:
            responsePromise = networkFirst(request);
    }

    event.respondWith(responsePromise);
});
