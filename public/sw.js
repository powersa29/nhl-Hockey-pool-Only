const CACHE = 'glizzy-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
);

self.addEventListener('push', e => {
  let data = { title: '⛳ Glizzy Golf', body: "New week — let's play!", url: '/live' };
  try { data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data?.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const existing = wins.find(w => w.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
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
