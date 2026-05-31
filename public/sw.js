const CACHE = 'glizzy-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  // Always hit network for API and live data routes
  if (request.url.includes('/api/')) return;
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(cached => {
        const network = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached ?? network;
      })
    )
  );
});
