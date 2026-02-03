const CACHE_NAME = 'panel-maria-v1';

// Lista de archivos que componen tu app. 
// He incluido los archivos base y las carpetas de im├ígenes y scripts que usa tu repositorio.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// Instalaci├│n: Guarda los archivos en cach├®
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cacheando archivos de la app...');
      return cache.addAll(ASSETS);
    })
  );
});

// Activaci├│n: Limpia cach├®s antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Estrategia: "Cache First" (Carga r├ípido desde cach├®, luego actualiza)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
