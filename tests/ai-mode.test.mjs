// KI-Modus: Standard "auto" = bei der ersten Analyse laden, nach Leerlauf entladen; "off" = nur Regeln und Wortlisten.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, runAnon, waitFor, GOLDEN, SAMPLE } from './helpers.mjs';

const loaded = (f) => f.evaluate(() => !!nerPipeline);

test('Standard: Modell startet erst bei der ersten Analyse und liefert das KI-Ergebnis', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    assert.equal(await f.evaluate(() => aiMode()), 'auto');
    assert.equal(await loaded(f), false, 'Modell darf vor der ersten Analyse nicht im Speicher sein');
    const r = await runAnon(f, SAMPLE);
    assert.equal(await loaded(f), true, 'Modell wurde nicht automatisch geladen');
    assert.equal(r.out, GOLDEN.model.out);
  } finally { await a.close(); }
});

test('Ausgeschaltet: kein Modell, Ergebnis der Standard-Erkennung', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => setAIMode('off'));
    const r = await runAnon(f, SAMPLE);
    assert.equal(await loaded(f), false);
    assert.equal(r.out, GOLDEN.wordlist.out);
    assert.equal(await f.evaluate(() => document.getElementById('aiAutoToggle').checked), false);
    // und wieder einschalten
    await f.evaluate(() => setAIMode('auto'));
    await runAnon(f, SAMPLE);
    assert.equal(await loaded(f), true);
  } finally { await a.close(); }
});

test('Leerlauf: Modell wird entladen (Speicher sinkt) und bei Bedarf identisch neu geladen', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => { AI_IDLE_MS = 1500; });
    const mem = () => a.win.evaluate(() => window.electronAPI.getSystemStats()).then((s) => s.app.memory);
    const first = await runAnon(f, SAMPLE);
    const withModel = await mem();
    await waitFor(() => loaded(f), (v) => v === false, { timeout: 10000 });
    assert.equal(await loaded(f), false, 'Modell wurde im Leerlauf nicht entladen');
    const after = await waitFor(mem, (m) => withModel - m > 200);
    console.log('  App-Speicher MB: mit Modell', withModel, '| nach Leerlauf-Entladen', after);
    assert.ok(withModel - after > 200, 'Speicher nicht freigegeben: ' + withModel + ' -> ' + after);
    const second = await runAnon(f, SAMPLE);
    assert.equal(await loaded(f), true);
    assert.equal(second.out, first.out, 'Ergebnis nach Neuladen weicht ab');
  } finally { await a.close(); }
});

test('Einstellung aus v1.7 wird uebernommen: "aiModelLoaded=false" bedeutet aus', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => { localStorage.removeItem('ps_ai_mode'); localStorage.setItem('aiModelLoaded', 'false'); });
    assert.equal(await f.evaluate(() => aiMode()), 'off');
  } finally { await a.close(); }
});
