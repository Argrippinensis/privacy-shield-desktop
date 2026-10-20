// Service Worker fuer PrivacyShield (nur diese Seite): macht die Seite als App offline startbar.
//  - Seite (HTML):           Netzwerk zuerst (max. 4 s), sonst Cache -> Updates der Seite kommen sofort an
//  - Icons der App:          Cache zuerst
//  - Bibliotheken per CDN:   zuerst aus dem Cache, im Hintergrund aktualisieren (nur fuer PrivacyShield-Seiten)
//  - alles andere (KI-Modell von Hugging Face, Update-Pruefung, Fonts): unveraendert durchreichen
// Not-Aus: Diese Datei durch eine Version ersetzen, die nur self.registration.unregister() aufruft.
const VERSION = 'ps-2026-10-v1';
const SHELL = 'ps-shell-' + VERSION;
const LIBS = 'ps-libs-' + VERSION;
const PAGE = '/tools/privacyshield-redesigned.html';
const SHELL_URLS = [PAGE, '/tools/privacyshield-manifest.json', '/assets/privacyshield/icon-192.png', '/assets/privacyshield/icon-512.png', '/assets/privacyshield/apple-touch-icon-180.png'];
const LIB_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'cdn.tailwindcss.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL && k !== LIBS) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(req, { signal: ctl.signal });
    clearTimeout(t);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || Response.error();
  }
}
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  return (await cache.match(req)) || (await fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }));
}
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const refresh = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await refresh) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname === PAGE) return e.respondWith(networkFirst(req, SHELL));
    if (url.pathname.startsWith('/assets/privacyshield/') || url.pathname === '/tools/privacyshield-manifest.json') return e.respondWith(cacheFirst(req, SHELL));
    return;
  }
  if (LIB_HOSTS.includes(url.hostname)) {
    // nur Anfragen der PrivacyShield-Seite cachen, nicht die Bibliotheken anderer Tools im selben Bereich
    e.respondWith((async () => {
      const client = e.clientId ? await self.clients.get(e.clientId) : null;
      if (!client || !client.url.includes('/tools/privacyshield-redesigned')) return fetch(req);
      return staleWhileRevalidate(req, LIBS);
    })());
  }
});
