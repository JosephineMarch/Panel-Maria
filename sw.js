const CACHE_NAME = 'panel-maria-v1';

// Lista de archivos que componen tu app. 
// He incluido los archivos base y las carpetas de imágenes y scripts que usa tu repositorio.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './script.js',
  './firebase-config.js',
  './assets/logo.png', // Asegúrate de que esta ruta sea correcta si tienes logo
  './icon-192.png',
  './icon-512.png'
];

// Instalación: Guarda los archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cacheando archivos de la app...');
      return cache.addAll(ASSETS);
    })
  );
});

// Activación: Limpia cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Estrategia: "Cache First" (Carga rápido desde caché, luego actualiza)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
