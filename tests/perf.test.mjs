// Grosse Dokumente mit vielen verschiedenen Entitaeten: bleiben schnell, Rundreise und Wiederholung sind exakt.
// (Vorher wuchs die Zeit quadratisch: 6.000 Entitaeten brauchten ueber 10 s.) Auf langsamen Rechnern: PS_SKIP_PERF=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, waitFor, SAMPLE } from './helpers.mjs';

const SKIP = process.env.PS_SKIP_PERF === '1';

for (const { blocks, budgetMs } of [{ blocks: 400, budgetMs: 1000 }, { blocks: 1000, budgetMs: 6000 }]) {
  test(`Grosses Dokument (${blocks} Abschnitte) wird zuegig anonymisiert und ist rueckfuehrbar`, { skip: SKIP }, async () => {
    const a = await launchApp({ offline: true });
    try {
      const f = await toolFrame(a.win);
      const r = await f.evaluate(async (n) => {
        if (typeof setAIMode === 'function') setAIMode('off');
        const blk = (i) => `Vertrag Nr. ${100000 + i}: Herr Thomas Muster${i} (geb. ${(i % 28) + 1}.0${(i % 9) + 1}.19${60 + (i % 40)}), wohnhaft Musterstraße ${(i % 200) + 1}, ${10000 + (i % 80000)} Beispielstadt, erreichbar unter user${i}@beispiel-${i}.de oder +49 89 ${1000000 + i}. IBAN DE89 3704 0044 0532 ${String(i).padStart(4, '0')} 00. Die Firma Beispiel${i} GmbH zahlt ${i},50 EUR. Frau Anna Schmidt${i} unterschreibt am 12.03.20${10 + (i % 15)}.\n`;
        const text = Array.from({ length: n }, (_, i) => blk(i)).join('');
        document.getElementById('IT').value = text;
        const t0 = performance.now();
        await anon();
        const ms = Math.round(performance.now() - t0);
        const out = document.getElementById('AT').value;
        document.getElementById('AR').value = out;
        deanon();
        const roundtrip = document.getElementById('RT').value === text;
        await anon();
        return { ms, entities: Object.keys(store).length, roundtrip, stable: document.getElementById('AT').value === out };
      }, blocks);
      console.log(`  ${blocks} Abschnitte, ${r.entities} Entitaeten: ${r.ms} ms (Budget ${budgetMs} ms)`);
      assert.ok(r.roundtrip, 'deanon(anon(x)) ergibt nicht den Originaltext');
      assert.ok(r.stable, 'erneutes Anonymisieren liefert ein anderes Ergebnis');
      assert.ok(r.ms < budgetMs, `zu langsam: ${r.ms} ms > ${budgetMs} ms`);
    } finally { await a.close(); }
  });
}

// F4.b: festgeschriebene Budgets. 100.000 Zeichen Fliesstext der Testvorlage (tests/golden/sample.txt, Regelmodus ohne KI).
// Gemessen im Node-Prototyp: 0,17 s fuer 119.000 Zeichen; die App darf dafuer bis zu 2 s brauchen.
test('100.000 Zeichen Fliesstext der Testvorlage werden im Regelmodus in unter 2 s anonymisiert', { skip: SKIP }, async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const text = (SAMPLE.trimEnd() + '\n').repeat(Math.ceil(100000 / (SAMPLE.trimEnd().length + 1))).slice(0, 100000);
    assert.equal(text.length, 100000);
    const r = await f.evaluate(async (t) => {
      if (typeof setAIMode === 'function') setAIMode('off');
      document.getElementById('IT').value = t;
      const t0 = performance.now();
      await anon();
      const ms = Math.round(performance.now() - t0);
      return { ms, entities: Object.keys(store).length, outLen: document.getElementById('AT').value.length };
    }, text);
    console.log(`  100.000 Zeichen Fliesstext, ${r.entities} Entitaeten: ${r.ms} ms (Budget 2000 ms)`);
    assert.ok(r.entities > 0, 'es wurden keine Entitaeten erkannt (Eingabe nicht verarbeitet?)');
    assert.ok(r.outLen > 0, 'Ausgabe leer');
    assert.ok(r.ms < 2000, `zu langsam: ${r.ms} ms > 2000 ms`);
  } finally { await a.close(); }
});

// Speicher der App (alle Prozesse, getSystemStats().app.memory in MB) nach dem Entladen des KI-Modells unter 1 GB.
test('Speicher der App liegt nach dem Entladen des Modells unter 1 GB', { skip: SKIP }, async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const stats = () => a.win.evaluate(() => window.electronAPI.getSystemStats());
    const loadedOk = await f.evaluate(async () => { await loadAIModel(); return !!nerPipeline; });
    assert.equal(loadedOk, true, 'KI-Modell wurde nicht geladen');
    const loaded = (await stats()).app.memory;
    await f.evaluate(() => unloadAIModel());
    const after = await waitFor(async () => (await stats()).app.memory, (m) => m < 1024, { timeout: 30000 });
    console.log(`  App-Speicher MB: mit Modell ${loaded} | nach Entladen ${after} (Budget 1024 MB)`);
    assert.equal(await f.evaluate(() => !!nerPipeline), false, 'Modell ist nach unloadAIModel() noch aktiv');
    assert.ok(after < 1024, `Speicher nach Entladen zu hoch: ${after} MB >= 1024 MB`);
  } finally { await a.close(); }
});
