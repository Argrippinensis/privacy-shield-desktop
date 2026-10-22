import test from 'node:test';
const H = await import('/tmp/triage/v2/tests/helpers.mjs');
test('v18 Rest-Zustand nach clearAll', async () => {
  const a = await H.launchApp({ offline: true, appDir: '/tmp/triage/v18' });
  const f = await H.toolFrame(a.win);
  try {
    await f.evaluate(() => startApp());
    const s = await f.evaluate(async () => {
      document.getElementById('IT').value = 'Kontakt: anna.beispiel@example.invalid.';
      await anon(); window.confirm = () => true; clearAll();
      return { store: Object.keys(store).length, aiKey: aiCache.key ? aiCache.key.slice(0, 30) : null, unsaved: typeof psMapUnsaved === 'function' ? psMapUnsaved() : 'n/a', mapSaved: typeof mapSaved !== 'undefined' ? mapSaved : 'n/a' };
    });
    console.log('v18', JSON.stringify(s));
  } finally { await a.close(); }
});
