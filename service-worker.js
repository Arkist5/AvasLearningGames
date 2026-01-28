const CACHE_NAME = 'mathfun-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/game.html',
  '/css/styles.css',
  '/css/homepage.css',
  '/css/game.css',
  '/js/app.js',
  '/js/math-engine.js',
  '/js/audio-manager.js',
  '/js/game-base.js',
  '/js/games/animal-crossing.js',
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for audio
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Audio files: cache on first load, serve from cache after
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
