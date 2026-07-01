/* 紫微斗數命盤 PWA 離線快取
   策略：核心檔案安裝時預快取；字型等跨網域資源於首次連網使用時自動快取，之後可離線。 */
const CACHE = 'ziwei-v1';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        try {
          const url = new URL(req.url);
          const cacheable = resp && resp.status === 200 &&
            (url.origin === location.origin ||
             /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.host) ||
             /(^|\.)cdn\.jsdelivr\.net$/.test(url.host));
          if (cacheable) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
        } catch (_) {}
        return resp;
      }).catch(() => cached);
    })
  );
});
