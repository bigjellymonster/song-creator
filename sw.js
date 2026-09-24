// Cache-first app shell. The whole app is one HTML file, so "offline" just means
// holding on to that file plus the icons. Bump CACHE to ship an update: the new
// worker installs alongside, then takes over and deletes the old cache.
const CACHE = 'song-sketcher-58c1f904';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-192.png', './icon-512.png', './icon-maskable-512.png',
                './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith(self.location.origin)) return;

  // The page itself goes to the network first. Cache-first was why a new build
  // took ten reloads to appear: the cached page was served every time until the
  // browser happened to re-check the worker, which it does on its own schedule.
  // Network-first means one reload gets the new build whenever there is a
  // connection, and the cache is still there the moment there isn't. Everything
  // else -- icons, manifest -- stays cache-first, because it never changes.
  const isPage = r.mode === 'navigate' || new URL(r.url).pathname.endsWith('/index.html');
  if (isPage){
    e.respondWith(
      fetch(r).then(res => {
        if (res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./index.html', { ignoreSearch: true }).then(hit => hit || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).then(res => {
      if (res && res.ok && res.type === 'basic'){
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(r, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
