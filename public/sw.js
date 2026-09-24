// Service Worker for ISKCON Mayapur 3D
// Provides persistent offline-capable Cache Storage for 3D GLB models and assets
const CACHE_NAME = 'mayapur-3d-cache-v4';

const CACHE_PATTERNS = [
  /\/models\//,
  /\/assets\//,
  /\.glb(\?.*)?$/i,
  /\.gltf(\?.*)?$/i,
  /\.bin(\?.*)?$/i,
  /\.png(\?.*)?$/i,
  /\.jpg(\?.*)?$/i,
  /\.jpeg(\?.*)?$/i,
  /\.webp(\?.*)?$/i,
  /\.mp3(\?.*)?$/i,
  /\.ogg(\?.*)?$/i,
  /\.wav(\?.*)?$/i
];

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.info('[SW] Purging old cache version:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // We handle GLB models and media assets with Cache-First strategy
  const shouldCache = CACHE_PATTERNS.some((p) => p.test(url.pathname));

  if (shouldCache) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Match ignoring query string (e.g. cache busters)
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) {
          return cached;
        }

        try {
          const response = await fetch(req);
          if (response && response.status === 200) {
            // Clone response before consuming it
            cache.put(req, response.clone());
          }
          return response;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })
    );
  }
});
