const CACHE_NAME = 'avagames-v15';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/math.html',
  '/spelling.html',
  '/story-reader.html',
  '/game.html',
  '/css/styles.css',
  '/css/hub.css',
  '/css/subject-page.css',
  '/css/game.css',
  '/css/breakfast-helper.css',
  '/css/santa-delivery.css',
  '/css/cobbler-game.css',
  '/css/zoo-game.css',
  '/css/paper-boy.css',
  '/css/supermarket-cashier.css',
  '/css/doggy-daycare.css',
  '/css/story-reader.css',
  '/js/hub.js',
  '/js/math-app.js',
  '/js/spelling-app.js',
  '/js/story-reader.js',
  '/js/math-engine.js',
  '/js/spelling-engine.js',
  '/js/audio-manager.js',
  '/js/word-audio-manager.js',
  '/js/game-base.js',
  '/js/spelling-game-base.js',
  '/js/dual-mode-adapter.js',
  '/js/games/animal-crossing.js',
  '/js/games/breakfast-helper.js',
  '/js/games/santa-scene.js',
  '/js/games/santa-delivery.js',
  '/js/games/cobbler-scene.js',
  '/js/games/cobbler-game.js',
  '/js/games/zoo-scene.js',
  '/js/games/zoo-game.js',
  '/js/games/paper-boy-scene.js',
  '/js/games/paper-boy.js',
  '/js/games/supermarket-cashier-scene.js',
  '/js/games/supermarket-cashier.js',
  '/js/games/doggy-daycare-scene.js',
  '/js/games/doggy-daycare.js',
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

  // CDN resources (Phaser, etc.): cache on first load, serve from cache after
  if (url.hostname === 'cdn.jsdelivr.net') {
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
