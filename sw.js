/* 决策蒸馏 PWA Service Worker —— 离线可用，应用壳缓存优先 */
var CACHE = 'dd-cache-v4.0.1';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // 不缓存第三方（如 AI API）
  var isPage = e.request.mode === 'navigate' ||
    url.pathname === '/' || /index\.html$/.test(url.pathname);
  if (isPage) {
    /* 页面网络优先：发新版后刷新即拿到新代码；断网才退缓存 */
    e.respondWith(
      fetch(e.request).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }
  /* 静态资源（图标/manifest）缓存优先 */
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var cp = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, cp); });
        return res;
      });
    })
  );
});
