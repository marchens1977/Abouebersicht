// Offline-Speicher für die Browser-Version
const CACHE = 'abo-v2';
const DATEIEN = ['./', 'index.html', 'style.css', 'app.js', 'katalog.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'vendor/pdf.min.js', 'vendor/pdf.worker.min.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then((r) => { const k = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, k)); return r; })
    .catch(() => caches.match(e.request)));
});
