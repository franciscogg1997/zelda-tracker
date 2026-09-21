// Everything same-origin is network-first: the app code and the walkthrough must
// agree on the data format, and serving a cached app against fresh data (or the
// reverse) breaks the page. The cache is the offline fallback, not the fast path.
const CACHE_VERSION = 'v3';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const DATA_CACHE = 'data';
const SHELL = ['./', './index.html', './style.css', './app.js', './logic.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(networkFirst(req, url.pathname.includes('/data/') ? DATA_CACHE : SHELL_CACHE));
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500); // fall back to cache fast on a weak signal
    // Bypass the browser's own HTTP cache: a stale app.js against a fresh
    // index.html is exactly the mismatch this worker exists to prevent.
    const res = await fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }), { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req, { ignoreSearch: true });
    return cached || new Response('', { status: 504, statusText: 'offline' });
  }
}

