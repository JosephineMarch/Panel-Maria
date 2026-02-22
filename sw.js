const CACHE_NAME = 'kai-cache-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/src/css/style.css',
    '/app.js',
    '/src/js/supabase.js',
    '/src/js/auth.js',
    '/src/js/data.js',
    '/src/js/ui.js',
    '/src/js/ai.js',
    '/src/js/utils.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
