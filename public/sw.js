// Netora PWA Service Worker v2026.36 - Auto Invalidate Cache & Always Fresh Network First
const CACHE_NAME = 'netora-cache-v2026.36';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = (req && req.url) ? req.url.toLowerCase() : '';

  // Never intercept admin, guru, or API endpoints
  if (url.includes('admin') || url.includes('guru') || url.includes('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Untuk navigasi halaman (HTML), skrip JS, dan CSS: SELALU ambil dari jaringan (network-first) agar update langsung tampil seketika
  if (req.mode === 'navigate' || url.endsWith('.html') || url.endsWith('.js') || url.endsWith('.css') || !url.includes('.')) {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Aset statis (gambar, font)
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    }).catch(() => fetch(req))
  );
});
