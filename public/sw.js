/**
 * Mira service worker: offline-first shell for a local-first app.
 *
 * - Navigations: network-first (new deploys picked up promptly), cached
 *   shell served when offline.
 * - Same-origin assets: cache-first (Vite emits content-hashed files,
 *   so cached copies are immutable).
 * - Nothing cross-origin is fetched or cached; the app makes no
 *   external requests by design.
 *
 * Bump CACHE_VERSION on breaking cache-layout changes.
 */
const CACHE_VERSION = 'mira-cache-v1';
const SHELL = ['.', 'manifest.webmanifest', 'icon.svg', 'icon-maskable.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('.', copy));
          return response;
        })
        .catch(() => caches.match('.')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
