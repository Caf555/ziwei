/* 紫微斗數命盤 PWA（方式二：網頁自動更新）
   - index.html／導覽請求：網路優先（有網路一律取最新，離線才用快取）→ 改 index.html 重開即更新
   - 字型／圖示等其他資源：快取優先（維持離線、避免重複下載約 10MB 篆體）
   更新大改版時可將 ziwei-v2 遞增以清舊快取。 */
const CACHE = 'ziwei-v2';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
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
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  const isHTML = req.mode === 'navigate' ||
    (url.origin === location.origin && url.pathname.endsWith('.html'));

  if (isHTML) {
    // 網路優先：取最新 index.html，並更新快取；離線時退回快取
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 其他資源：快取優先 + 首次連網時快取（含跨網域字型）
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        try {
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
