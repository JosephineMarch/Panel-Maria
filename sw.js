const CACHE_NAME = 'kai-cache-v3';
const STATIC_ASSETS = [
    './',
    './index.html',
    './src/css/style.css',
    './app.js',
    './manifest.json',
    './icon.svg',
    './src/assets/icon-192.png',
    './src/assets/icon-512.png',
    './src/js/supabase.js',
    './src/js/auth.js',
    './src/js/data.js',
    './src/js/ui.js',
    './src/js/logic.js',
    './src/js/ai.js',
    './src/js/cerebras.js',
    './src/js/gemini.js',
    './src/js/utils.js',
    './src/js/share.js'
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
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
}

async function cacheFirst(request) {
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
            console.log('[SW] Caché inicial abierta');
            return cache.addAll(STATIC_ASSETS);
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
    const url = new URL(request.url);

    if (url.origin !== location.origin && !url.pathname.startsWith('/')) {
        return;
    }

    const strategy = getStrategy(request.url);

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

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
