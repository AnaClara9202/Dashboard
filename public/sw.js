const CACHE = 'sinergia-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(e.request);
        if (res && res.status === 200) cache.put(e.request, res.clone());
        return res;
      } catch {
        const cached = await cache.match(e.request);
        return cached || Response.error();
      }
    })
  );
});
