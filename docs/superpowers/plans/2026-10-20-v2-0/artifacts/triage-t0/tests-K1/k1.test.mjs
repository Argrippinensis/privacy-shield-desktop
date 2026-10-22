// K1: Projektkorrektur (manuelle Markierung + Neu anonymisieren) bei geladenem Projekt. Nur synthetische Werte.
import test from 'node:test';
import assert from 'node:assert/strict';
const H = await import('/tmp/triage/v2/tests/helpers.mjs');
const { loadVendor } = await import('/tmp/triage/v2/tests/unit/_load.mjs');
const JSZip = loadVendor('jszip');
const txt = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });

test('K1: nach Korrektur in Dokument 2 bleiben Ergebnis, Zuordnung und ZIP konsistent', async () => {
  const a = await H.launchApp({ offline: true, appDir: process.env.APPDIR || '/tmp/triage/v2' });
  const f = await H.toolFrame(a.win);
  try {
    await f.evaluate(() => startApp());
    await H.captureDownloads(f);
    await H.setFiles(f, [
      txt('d1.txt', 'Kontakt: anna.beispiel@example.invalid.'),
      txt('d2.txt', 'Kontakt: ben.beispiel@example.invalid. Notiz: Zwiebelbaum.'),
    ]);
    await f.waitForFunction(() => document.querySelectorAll('#PRJPANEL button.prj-item').length === 2);
    await f.click('#PRJRUN');
    await f.waitForFunction(() => [...document.querySelectorAll('#PRJPANEL button.prj-item')].every((e) => /fertig/i.test(e.textContent)), null, { timeout: 60000 });
    const before = await f.evaluate(() => ({ store: JSON.parse(JSON.stringify(store)), r: [...prjRes.values()].map((x) => x.text) }));
    console.log('VORHER store:', JSON.stringify(Object.fromEntries(Object.entries(before.store).map(([k, v]) => [k, v.v]))), 'ergebnisse:', JSON.stringify(before.r));
    // Dokument 2 oeffnen, "Zwiebelbaum" manuell markieren, neu anonymisieren (wie Leckpruefung/Annotieren -> reanon)
    await f.locator('#PRJPANEL button.prj-item').nth(1).click();
    await f.evaluate(() => { PSLib.marks.add(manualMarks, { value: 'Zwiebelbaum', pfx: 'NAME' }); });
    await f.evaluate(() => reanon());
    const after = await f.evaluate(() => ({
      visible: document.getElementById('AT').value,
      store: Object.fromEntries(Object.entries(store).map(([k, v]) => [k, v.v])),
      prjTexts: [...prjRes.values()].map((x) => x.text),
      stale: typeof prjStale !== 'undefined' ? prjStale : '(keine Variable prjStale)',
      zipDisabled: document.getElementById('PRJZIP').disabled,
      back1: PSDetect.deanonymize([...prjRes.values()][0].text, { store }),
    }));
    console.log('NACHHER sichtbar(Dok2):', JSON.stringify(after.visible));
    console.log('NACHHER store:', JSON.stringify(after.store));
    console.log('NACHHER prjRes:', JSON.stringify(after.prjTexts));
    console.log('Rueckuebersetzung Dok1:', JSON.stringify(after.back1), '| ZIP-Knopf gesperrt:', after.zipDisabled);
    // ZIP ohne Zuordnung exportieren
    await f.evaluate(() => { document.getElementById('PRJMAP').checked = false; });
    await f.evaluate(() => prjZip(true));
    await f.waitForFunction(() => (window.__dls || []).length >= 1, null, { timeout: 15000 }).catch(() => {});
    const d = await H.getDownloads(f);
    assert.equal(d.length >= 1, true, 'kein ZIP-Download (Export gesperrt?)');
    const z = await JSZip.loadAsync(Buffer.from(d[0].base64, 'base64'));
    const names = Object.keys(z.files).filter((n) => /\.txt$/.test(n) && !/bericht/i.test(n)).sort();
    const contents = {};
    for (const n of names) contents[n] = await z.file(n).async('string');
    console.log('ZIP-Inhalt:', JSON.stringify(contents));
    const d2 = Object.values(contents).find((c) => /EMAIL_2|Zwiebel|\{\{/.test(c) && /Notiz/.test(c)) || '';
    assert.ok(!/Zwiebelbaum/.test(Object.values(contents).join('\n')), 'ZIP enthaelt Klartext Zwiebelbaum trotz Markierung');
    assert.equal(after.back1.includes('ben.beispiel'), false, 'Rueckuebersetzung Dok1 liefert fremde Adresse (Bens)');
    assert.equal(after.visible, [...after.prjTexts].find((t) => /Notiz/.test(t)), 'sichtbarer Text == ZIP/Projektergebnis Dok2');
  } finally { await a.close(); }
});
