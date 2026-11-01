/**
 * Service Worker for PWA Video Player
 * Complies with PWA Standards & Mobile Best Practices
 */

const CACHE_NAME = 'pwa-video-player-v10';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css?v=10',
  './app.js?v=10',
  './manifest.webmanifest?v=10',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

// Install event: Precache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate event: Clean up old caches and claim clients
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
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Serve cache-first with network fallback and scope isolation
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Skip non-http/https requests (such as blob:, data:, chrome-extension:)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Scope isolation: do not intercept requests outside of this app's registration scope
  if (url.origin === self.location.origin && !request.url.startsWith(self.registration.scope)) {
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // If not a valid response, return immediately
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Cache newly fetched assets within the same scope
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for navigation requests when offline
        if (request.mode === 'navigate' && request.url.startsWith(self.registration.scope)) {
          return caches.match('./index.html', { ignoreSearch: true });
        }
      });
    })
  );
});

// Listen for messages from client (e.g., skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
