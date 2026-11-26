/* Service worker: caches the app so it opens instantly and without internet.
   IMPORTANT: bump CACHE_VERSION whenever you change any file, so devices pick up the update. */
const CACHE_VERSION = 'mizan-v5';
const ASSETS = ['./', './index.html', './config.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', (e) => {
  // one missing file must never break the whole install
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const fromCache = (req) => caches.match(req, { ignoreSearch: true });
  const store = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, copy)); } return res; };

  // Firebase library files: keep a copy so sign-in and sync still work later without internet
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) {
    e.respondWith(fromCache(e.request).then((hit) => hit || fetch(e.request).then((r) => store(e.request, r))));
    return;
  }
  if (url.origin !== location.origin) return;
  // config.js: always try the network first so edits take effect straight away
  if (url.pathname.endsWith('/config.js')) {
    e.respondWith(fetch(e.request).then((r) => store(e.request, r)).catch(() => fromCache(e.request)));
    return;
  }
  e.respondWith(fromCache(e.request).then((hit) => hit || fetch(e.request).then((r) => store(e.request, r))
    .catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
