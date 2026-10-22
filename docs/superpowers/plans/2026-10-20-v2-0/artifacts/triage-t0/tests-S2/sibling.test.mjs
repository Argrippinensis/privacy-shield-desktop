// Geschwister: was bleibt nach clearAll() im Renderer-Zustand? (gleicher Test v2 und 1.8.0, Einzeldokument)
import test from 'node:test';
const H = await import('/tmp/triage/v2/tests/helpers.mjs');
test('Rest-Zustand nach clearAll (Einzeldokument)', async () => {
  const a = await H.launchApp({ offline: true, appDir: process.env.APPDIR || '/tmp/triage/v2' });
  const f = await H.toolFrame(a.win);
  try {
    await f.evaluate(() => startApp());
    await f.evaluate(async () => {
      document.getElementById('IT').value = 'Kontakt: anna.beispiel@example.invalid. Notiz: Zwiebelbaum.';
      PSLib.marks.add(manualMarks, { value: 'Zwiebelbaum', pfx: 'NAME' });
      await anon();
      window.confirm = () => true; clearAll();
    });
    const s = await f.evaluate(() => ({
      store: Object.keys(store).length, MT: document.getElementById('MT').textContent.slice(0, 60),
      marks: JSON.stringify(PSLib.marks.toCvars(manualMarks)).slice(0, 120),
      aiCacheKey: aiCache && aiCache.key ? String(aiCache.key).slice(0, 40) : null,
      lcLast: !!lcLast, lcIgnored: lcIgnored.size,
      prj: typeof prj !== 'undefined' ? (prj ? prj.docs.length : 0) : 'n/a', prjRes: typeof prjRes !== 'undefined' ? prjRes.size : 'n/a',
      unsaved: psMapUnsaved(), mapSaved,
    }));
    console.log(process.env.APPDIR || 'v2', JSON.stringify(s));
  } finally { await a.close(); }
});
