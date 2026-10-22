// S2: Zuruecksetzen und Entfernen im Projektmodus. Nur synthetische Werte.
import test from 'node:test';
import assert from 'node:assert/strict';
const H = await import('/tmp/triage/v2/tests/helpers.mjs');
const txt = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
const D1 = 'Kontakt: anna.beispiel@example.invalid.', D2 = 'Kontakt: ben.beispiel@example.invalid.';

async function setup() {
  const a = await H.launchApp({ offline: true, appDir: process.env.APPDIR || '/tmp/triage/v2' });
  const f = await H.toolFrame(a.win);
  await f.evaluate(() => startApp());
  await H.captureDownloads(f);
  await H.setFiles(f, [txt('d1.txt', D1), txt('d2.txt', D2)]);
  await f.waitForFunction(() => document.querySelectorAll('#PRJPANEL button.prj-item').length === 2);
  await f.click('#PRJRUN');
  await f.waitForFunction(() => [...document.querySelectorAll('#PRJPANEL button.prj-item')].every((e) => /fertig/i.test(e.textContent)), null, { timeout: 60000 });
  return { a, f };
}

test('S2-A: nach "Alles zuruecksetzen" ist vom Projekt nichts mehr erreichbar', async () => {
  const { a, f } = await setup();
  try {
    await f.evaluate(() => { window.confirm = () => true; clearAll(); });
    const s = await f.evaluate(() => ({
      docs: prj ? prj.docs.length : 0, res: prjRes.size, panel: document.getElementById('PRJPANEL').style.display,
      zipDisabled: document.getElementById('PRJZIP').disabled, store: Object.keys(store).length,
      items: document.querySelectorAll('#PRJPANEL button.prj-item').length,
    }));
    console.log('nach clearAll:', JSON.stringify(s));
    if (s.items > 0) {
      await f.locator('#PRJPANEL button.prj-item').nth(0).click();
      const shown = await f.evaluate(() => ({ it: document.getElementById('IT').value, at: document.getElementById('AT').value }));
      console.log('nach Klick auf Listeneintrag: Eingabe =', JSON.stringify(shown.it), ' Ergebnis =', JSON.stringify(shown.at));
    }
    assert.equal(s.docs, 0, 'prj.docs nicht geleert');
    assert.equal(s.res, 0, 'prjRes nicht geleert');
    assert.equal(s.items, 0, 'Liste noch sichtbar');
  } finally { await a.close(); }
});

test('S2-B: entferntes Dokument taucht in .psmap-Export und CSV nicht mehr auf', async () => {
  const { a, f } = await setup();
  try {
    await f.locator('#PRJPANEL button.prj-del').nth(1).click(); // d2 entfernen
    const left = await f.evaluate(() => ({ docs: prj.docs.map((d) => d.name), store: Object.fromEntries(Object.entries(store).map(([k, v]) => [k, v.v])), scope: Object.values(prjScope().store).map((v) => v.v) }));
    console.log('nach Entfernen von d2:', JSON.stringify(left));
    // psmap (Einzel-Export ueber Zuordnungstabelle)
    await f.evaluate(() => { psMapSave(); document.getElementById('PWD1').value = 'Synthetisch-Passwort-1'; document.getElementById('PWD2').value = 'Synthetisch-Passwort-1'; });
    await f.evaluate(() => psPwOk());
    await f.waitForFunction(() => (window.__dls || []).some((d) => /psmap$/.test(d.name)), null, { timeout: 15000 });
    const dls = await H.getDownloads(f);
    const pm = dls.find((d) => /psmap$/.test(d.name));
    const payload = await f.evaluate(async (b64) => { const u = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); const p = await PSLib.psmap.decrypt(u, 'Synthetisch-Passwort-1'); return Object.values(p.state.store).map((v) => v.v); }, pm.base64);
    console.log('.psmap-Werte:', JSON.stringify(payload));
    // CSV
    await f.evaluate(() => { window.confirm = () => true; expMap(); });
    const csv = (await H.getDownloads(f)).find((d) => /csv$/.test(d.name));
    const csvText = Buffer.from(csv.base64, 'base64').toString('utf8');
    console.log('CSV:', JSON.stringify(csvText));
    assert.ok(!payload.some((v) => /ben\./.test(v)), '.psmap enthaelt Wert des entfernten Dokuments');
    assert.ok(!/ben\./.test(csvText), 'CSV enthaelt Wert des entfernten Dokuments');
  } finally { await a.close(); }
});
