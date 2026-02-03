const CACHE_NAME = 'panel-maria-v3-fix';

// Archivos est├íticos del App Shell (Rutas relativas a la ra├¡z del sw.js)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './chat.js',
  './auth.js',
  './storage.js',
  './config.js',
  './firebase-config.js',
  './icon-192.png', // Asumiendo que existen
  './icon-512.png'
];

// Dominios que queremos cachear en Runtime (CDNs)
const RUNTIME_CACHE_DOMAINS = [
  'www.gstatic.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'api.microlink.io' // Para las previews
];

// INSTALACI├ôN: Pre-cacheo vigoroso
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Pre-cacheando App Shell...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ACTIVACI├ôN: Limpieza de cach├®s viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH: Estrategia H├¡brida
// 1. App Shell (Local) -> Stale-While-Revalidate (R├ípido + Actualizado)
// 2. CDNs Externos -> Cache First (Persistencia)
// 3. API Calls (Cerebras) -> Network Only (No cachear respuestas de Chat)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Excluir llamadas a API o POSTs (Share Target / Cerebras)
  if (event.request.method !== 'GET' || url.searchParams.has('text')) {
    return; // Network only
  }

  // A. Estrategia para Assets Locales (Stale-While-Revalidate)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Actualizar cach├® en segundo plano
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(err => {
          // Si falla red y no hay cach├®, retornar fallback o nada
          console.log('SW: Fetch error (Local)', err);
        });

        // Retornar cach├® si existe, sino esperar a red
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // B. Estrategia para CDNs (Cache First, Network Fallback)
  if (RUNTIME_CACHE_DOMAINS.includes(url.hostname)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then(networkResponse => {
          // Verificar respuesta v├ílida antes de cachear
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'cors') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // C. Default: Network First (o Network Only)
  // Dejamos que el navegador maneje el resto (Analytics, otras APIs)
});
