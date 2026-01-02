const CACHE_NAME = 'panel-maria-v1';
const ASSETS = [
  '/',
  '/index.html',
  // Agrega aquí tus archivos CSS o JS específicos, ej: '/style.css'
];

// Instalación: Guarda los archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

// Estrategia: Primero busca en caché, si no hay, va a internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
