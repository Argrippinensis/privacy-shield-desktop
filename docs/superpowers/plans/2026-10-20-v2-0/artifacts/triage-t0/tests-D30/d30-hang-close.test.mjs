// D30 roter Test: Renderer haengt (z. B. lange Berechnung) bei ungespeicherter Zuordnung -> Fenster schliesst ohne Warnung
import test from 'node:test';
import assert from 'node:assert/strict';
const H = await import('/tmp/triage/v2/tests/helpers.mjs');
const { launchApp, toolFrame, runAnon } = H;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stubDialog = (app) => app.evaluate(({ dialog }) => { globalThis.__psDlgCount = 0; dialog.showMessageBox = async () => { globalThis.__psDlgCount++; await new Promise((ok) => setTimeout(ok, 1500)); return { response: 0 }; }; });

test('D30: haengender Renderer (8 s Schleife) + ungespeicherte Zuordnung: erwartet Warnung/Dialog, Ist: schliesst nach ca. 2,5 s ohne Dialog', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => startApp());
    await runAnon(f, 'Herr Hans Beispiel wohnt in Teststadt, hans.beispiel@example.invalid');
    assert.equal(await f.evaluate(() => psMapUnsaved()), true);
    await stubDialog(a.app);
    f.evaluate(() => { setTimeout(() => { const t = Date.now(); while (Date.now() - t < 8000); }, 0); }).catch(() => {});
    await sleep(300);
    const t0 = Date.now();
    const closed = a.app.waitForEvent('close', { timeout: 15000 }).then(() => Date.now() - t0, () => false);
    await a.app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].close(); }).catch(() => {});
    const ms = await closed;
    const n = await a.app.evaluate(() => globalThis.__psDlgCount).catch(() => 'App beendet');
    console.log('  Fenster/App geschlossen nach ms:', ms, ' Dialogaufrufe:', n);
    assert.notEqual(ms, false, 'nicht geschlossen');
    assert.ok(n === 1, 'Erwartet: genau ein Warndialog bei unbekanntem/ungespeichertem Zustand; Ist: ' + n);
  } finally { await a.close().catch(() => {}); }
});
