const CACHE_VERSION = 'scheduler-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/css/index.css',
  '/index.svg',
  '/manifest.json',
  '/script/index.js',
  '/script/app.js',
  '/script/home.js',
  '/script/component.js',
  '/script/events.js',
  '/script/apps.js',
  '/script/community.js',
  '/script/gs.js',
  '/script/options.js',
  '/script/particles.js',
  '/script/search.js',
  '/script/selection.js',
  '/script/support.js',
  '/script/tabs.js',
  '/script/scheduler.js',
  '/uv/uv.bundle.js',
  '/uv/uv.config.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
