const CACHE_NAME = 'megarecreacion-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/db.js',
  './js/auth.js',
  './assets/logo.jpg',
  './assets/logo-192.png',
  './assets/logo-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia Network-First para evitar el "Service Worker Trap" (bloqueo de caché)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o que vayan al backend/firebase
  if (
    event.request.method !== 'GET' || 
    event.request.url.includes('/api/') ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, clonar y guardar en caché
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // En caso de estar offline, servir desde el caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si es navegación de página, fallback al index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
