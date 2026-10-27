// Generated build identity and a strict, public-assets-only allowlist.
importScripts('offline-data.js');
const DATA = self.PS_OFFLINE;
const BASE = new URL('./', self.location.href);
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
let preparing = null;
self.addEventListener('message', event => {
  if (event.data?.type === 'ps-offline-version' && event.ports[0]) event.ports[0].postMessage(DATA.cache);
  if (event.data?.type === 'ps-offline-prepare' && event.ports[0]) event.waitUntil(prepareAssets().then(() => event.ports[0].postMessage({ ok: true }), () => event.ports[0].postMessage({ ok: false })));
});
async function prepareAssets() {
  if (preparing) return preparing;
  preparing = (async () => {
    const cache = await caches.open(DATA.cache);
    try {
      for (const f of DATA.files) {
        const url = new URL(f.path, BASE).href;
        const response = await fetch(url, { cache: 'reload', credentials: 'same-origin' });
        if (!response.ok || response.type === 'opaque') throw Error('Offline download failed');
        const bytes = await response.clone().arrayBuffer();
        if (bytes.byteLength !== f.size || hex(await crypto.subtle.digest('SHA-256', bytes)) !== f.sha256) throw Error('Offline asset checksum mismatch');
        // Hosting may redirect index.html and iframe HTML to canonical URLs. A cached
        // redirected Response is invalid for navigations whose redirect mode is manual.
        // Store verified decoded bytes as a fresh response, with matching size headers.
        const headers = new Headers(response.headers);
        headers.delete('Content-Encoding'); headers.delete('Transfer-Encoding');
        headers.set('Content-Length', String(bytes.byteLength));
        await cache.put(url, new Response(bytes, { status: response.status, statusText: response.statusText, headers }));
      }
      // Metadata belongs to the same complete package, but cannot include its own checksum.
      await cache.put(new URL('offline-data.js', BASE).href, new Response('self.PS_OFFLINE = ' + JSON.stringify(DATA) + ';\n', { headers: { 'Content-Type': 'text/javascript' } }));
    } catch (e) { await caches.delete(DATA.cache); throw e; }
    // Do not replace an existing active version underneath an open document.
  })();
  try { return await preparing; } finally { preparing = null; }
}
self.addEventListener('install', event => event.waitUntil(prepareAssets()));
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('ps2-beta-static-') && name !== DATA.cache) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  let rel = url.pathname.slice(BASE.pathname.length);
  if (!rel || rel === 'index' || rel === 'index.html') rel = 'index.html';
  if (rel === 'privacy-shield') rel = 'privacy-shield.html'; // Cloudflare canonical HTML URLs
  if (rel !== 'offline-data.js' && !DATA.files.some(f => f.path === rel)) return;
  event.respondWith((async () => {
    const cache = await caches.open(DATA.cache);
    return (await cache.match(new URL(rel, BASE).href)) || fetch(req);
  })());
});
