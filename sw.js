/* 泰郡工務系統 Service Worker — 網路優先(network-first)
   線上：永遠抓最新版（HTML 加時間戳繞過 CDN 快取）；離線：用快取讓工地沒訊號也能開。 */
const CACHE = 'wm-cache-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('./')).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheIfOk(key, res) {
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isDoc = req.mode === 'navigate' || req.destination === 'document';
  if (isDoc) {
    // HTML：加時間戳向來源要最新（繞過 GitHub CDN 邊緣快取），失敗才用快取
    const fresh = req.url + (req.url.includes('?') ? '&' : '?') + '_sw=' + Date.now();
    e.respondWith(
      fetch(fresh, { cache: 'no-store' })
        .then(res => cacheIfOk('./', res))
        .catch(() => caches.match('./').then(r => r || caches.match(req)))
    );
    return;
  }
  e.respondWith(
    fetch(req)
      .then(res => cacheIfOk(req, res))
      .catch(() => caches.match(req).then(r => r || caches.match('./')))
  );
});
