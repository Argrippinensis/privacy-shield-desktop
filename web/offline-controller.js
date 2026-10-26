// Explicit, document-free offline preparation. Merely visiting never downloads the model.
(function () {
  'use strict';
  const data = window.PS_OFFLINE;
  const base = new URL('./', location.href);
  const announce = () => window.dispatchEvent(new Event('ps-offline-change'));
  let preparing = null, modelPreparing = null;
  async function controlledVersion() {
    const worker = navigator.serviceWorker.controller;
    if (!worker || worker.scriptURL !== new URL('offline-worker.js', base).href) return null;
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const done = value => { clearTimeout(timer); channel.port1.close(); resolve(value); };
      const timer = setTimeout(() => done(null), 3000);
      channel.port1.onmessage = event => done(event.data);
      worker.postMessage({ type: 'ps-offline-version' }, [channel.port2]);
    });
  }
  async function status() {
    if (!('serviceWorker' in navigator) || !window.caches || !data) return { core: false, model: false, detail: 'Dieser Browser erlaubt die benötigte Offline-Speicherung nicht.' };
    const keys = await caches.keys();
    const cache = keys.includes(data.cache) ? await caches.open(data.cache) : null;
    const core = !!cache && !!(await cache.match(new URL('offline-data.js', base).href)) && (await Promise.all(data.files.map(f => cache.match(new URL(f.path, base).href)))).every(Boolean);
    const controlled = core && await controlledVersion() === data.cache;
    const modelCache = keys.includes('transformers-cache') ? await caches.open('transformers-cache') : null;
    const model = !!modelCache && (await Promise.all(data.model.map(f => modelCache.match(f.url)))).every(Boolean);
    return { core: !!(core && controlled), model, detail: core && controlled ? 'Programmdateien vollständig gespeichert. Browser können Caches löschen. Bitte Flugmodus mit einem Testdokument und einem Neustart prüfen.' : core ? 'Dateien gespeichert. Alle PrivacyShield-Tabs schließen und neu öffnen, damit die vorbereitete Version aktiv wird.' : 'Zum Start ohne Netz muss die Browser-App zuerst vorbereitet werden. Eingaben und Zuordnungen sind kein Bestandteil dieses Speichers.' };
  }
  async function prepare() {
    if (preparing) return preparing;
    preparing = (async () => {
      if (!('serviceWorker' in navigator) || !window.caches) throw Error('Offline-Speicherung nicht verfügbar.');
      if ((await status()).core) return status();
      // A browser may evict a cache while keeping the registered worker. Repair it explicitly.
      if (await controlledVersion() === data.cache) {
        await new Promise((resolve, reject) => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => { channel.port1.close(); reject(Error('Download dauert zu lange. Bitte erneut vorbereiten.')); }, 180000);
          channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); event.data?.ok ? resolve() : reject(Error('Download oder Prüfsumme fehlgeschlagen; keine vollständige Offline-Kopie.')); };
          navigator.serviceWorker.controller.postMessage({ type: 'ps-offline-prepare' }, [channel.port2]);
        });
        announce(); return status();
      }
      const reg = await navigator.serviceWorker.register(new URL('offline-worker.js', base), { scope: base.pathname, updateViaCache: 'none' });
      const worker = reg.installing || reg.waiting || reg.active;
      if (!worker) throw Error('Offline-Worker konnte nicht gestartet werden.');
      if (!['installed', 'activated'].includes(worker.state)) await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { worker.removeEventListener('statechange', changed); reject(Error('Download dauert zu lange; bitte Verbindung und Speicher prüfen.')); }, 180000);
        function changed() {
          if (worker.state === 'redundant') { clearTimeout(timeout); worker.removeEventListener('statechange', changed); reject(Error('Download oder Prüfsumme fehlgeschlagen; keine vollständige Offline-Kopie.')); }
          else if (['installed', 'activated'].includes(worker.state)) { clearTimeout(timeout); worker.removeEventListener('statechange', changed); resolve(); }
        }
        worker.addEventListener('statechange', changed); changed();
      });
      if (!navigator.serviceWorker.controller && !reg.active && worker.state !== 'activated') await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { worker.removeEventListener('statechange', changed); reject(Error('Offline-Version noch nicht aktiv; bitte alle Tabs schließen und neu öffnen.')); }, 15000);
        function changed() { if (worker.state === 'activated') { clearTimeout(timer); worker.removeEventListener('statechange', changed); resolve(); } }
        worker.addEventListener('statechange', changed); changed();
      });
      if (!navigator.serviceWorker.controller && reg.active) await new Promise(resolve => {
        const done = () => { navigator.serviceWorker.removeEventListener('controllerchange', done); resolve(); };
        navigator.serviceWorker.addEventListener('controllerchange', done, { once: true }); setTimeout(done, 3000);
      });
      // Persistence is a request, not a guarantee. Safari may decline or lack this API.
      try { if (navigator.storage?.persist) await navigator.storage.persist(); } catch { /* report cache state, never promise persistence */ }
      announce(); return status();
    })();
    try { return await preparing; } finally { preparing = null; }
  }
  async function downloadModel() {
    if (!window.caches) throw Error('Modellspeicherung ist in diesem Browser nicht verfügbar.');
    const cache = await caches.open('transformers-cache');
    // Download only: no inference session, no additional model RAM, no change to the user's AI mode.
    for (const file of data.model) {
      const response = (await cache.match(file.url)) || await fetch(file.url);
      if (!response.ok) throw Error('Modelldownload fehlgeschlagen.');
      const bytes = await response.arrayBuffer();
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
      if (bytes.byteLength !== file.size || hash !== file.sha256) { await cache.delete(file.url); throw Error('Modelldatei unvollständig oder Prüfsumme falsch. Bitte erneut vorbereiten.'); }
      await cache.put(file.url, new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(bytes.byteLength) } }));
    }
    announce(); return status();
  }
  async function prepareModel() {
    if (modelPreparing) return modelPreparing;
    modelPreparing = downloadModel();
    try { return await modelPreparing; } finally { modelPreparing = null; }
  }
  window.PSOffline = { status, prepare, prepareModel };
})();
