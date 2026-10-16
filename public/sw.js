const C = 'agri-v5'
self.addEventListener('install', (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(['./', './index.html']))); self.skipWaiting() })
self.addEventListener('fetch', (e) => { if (e.request.method !== 'GET') return
  e.respondWith(fetch(e.request).then((r) => { if (r.status === 200) { const k = r.clone(); caches.open(C).then((c) => c.put(e.request, k)) } return r }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))) })
