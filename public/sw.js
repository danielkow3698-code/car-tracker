// Car Tracker Service Worker — v1
const CACHE = 'car-tracker-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/calendar',
  '/stats',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Install: cache static pages
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// Fetch: network-first for pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache API requests
  if (url.pathname.startsWith('/api/')) return;

  // Don't cache Next.js internal chunks (they have hash fingerprints)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Network-first for pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
