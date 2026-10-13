// Hablena service worker: makes the site installable and keeps it usable on a bad connection.
// - Pages: network first, the last copy (or an offline page) when there is no connection.
// - CSS, JS, fonts, icons: served from the cache and refreshed in the background.
// - Lesson audio: cached after the first play, so repeated lessons work offline.
// - The API (except audio) and the admin area are never cached.
const VERSION = 'v1';
const STATIC = `hablena-static-${VERSION}`;
const PAGES = `hablena-pages-${VERSION}`;
const AUDIO = `hablena-audio-${VERSION}`;
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/assets/css/main.css', '/assets/js/main.js', '/favicon.svg', '/icons/icon-192.png'];
const MAX_PAGES = 60;
const MAX_AUDIO = 400;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hablena-') && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/admin')) return;

  // Lesson audio: immutable per hash
  if (url.pathname.startsWith('/api/audio/') && url.pathname.endsWith('.mp3')) {
    event.respondWith(caches.open(AUDIO).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.status === 200) { cache.put(req, res.clone()); trim(AUDIO, MAX_AUDIO); }
      return res;
    }));
    return;
  }
  if (url.pathname.startsWith('/api/')) return;

  // Pages
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)).then(() => trim(PAGES, MAX_PAGES)); }
        return res;
      } catch {
        return (await caches.match(req, { ignoreSearch: true })) || (await caches.match(OFFLINE));
      }
    })());
    return;
  }

  // Static files: stale while revalidate
  if (/^\/(assets|fonts|icons)\//.test(url.pathname) || url.pathname === '/favicon.svg') {
    event.respondWith(caches.open(STATIC).then(async (cache) => {
      const hit = await cache.match(req);
      const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || fresh;
    }));
  }
});
