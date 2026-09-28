// Netora PWA Service Worker v2
const CACHE_NAME = 'netora-app-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network first dengan fallback cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
