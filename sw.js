// SqueveTrack Service Worker v2
// NETWORK-FIRST: always fetch fresh on deploy, fallback to cache when offline
const CACHE = 'squevetrack-v5';

self.addEventListener('install', e => {
  // Pre-cache the app shell
  e.waitUntil(
    caches.open(CACHE).then(c => c.add('/'))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete ALL old caches (v1 and any others)
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Skip non-GET and external API requests — let them go direct
  if (e.request.method !== 'GET') return;
  if (url.includes('supabase.co')) return;
  if (url.includes('cdn.jsdelivr.net')) return;
  if (url.includes('cdnjs.cloudflare.com')) return;
  if (url.includes('cdn.sheetjs.com')) return;
  if (url.includes('fonts.googleapis.com')) return;
  if (url.includes('fonts.gstatic.com')) return;

  // NETWORK FIRST for HTML (the app shell) — always get fresh on deploy
  if (url.endsWith('/') || url.endsWith('/squevetrack') || url.endsWith('/squevetrack/') || url.includes('index.html') || url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update cache with fresh copy
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
    return;
  }

  // CACHE FIRST for static assets (icons, manifest, sw)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
