// K1.fix (rot bis zur Umsetzung): Projektkorrektur-Konsistenz (K1) und Zuruecksetzen/Entfernen (S2, D23). Nur synthetische Werte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { launchApp, toolFrame, captureDownloads, getDownloads, setFiles } from './helpers.mjs';
import { loadVendor } from './unit/_load.mjs';

const require = createRequire(import.meta.url);
const JSZip = loadVendor('jszip');
const psmap = require('../app/lib/psmap.js');
const PW = 'korrektes Pferd Batterie';
const D1 = 'Kontakt: anna.beispiel@example.invalid.';
const D2 = 'Kontakt: ben.beispiel@example.invalid. Notiz: Zwiebelbaum.';
const txt = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });

async function setup(docs) {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => startApp());
  await captureDownloads(f);
  await setFiles(f, docs.map(([n, t]) => txt(n, t)));
  await f.waitForFunction((k) => document.querySelectorAll('#PRJPANEL button.prj-item').length === k, docs.length, { timeout: 20000 });
  await f.click('#PRJRUN');
  await waitAllDone(f, docs.length);
  return { a, f };
}
const waitAllDone = (f, n) => f.waitForFunction((k) => {
  const els = [...document.querySelectorAll('#PRJPANEL button.prj-item')];
  return els.length === k && els.every((e) => /fertig/i.test(e.textContent)) && !prjBusy;
}, n, { timeout: 60000 });
// Dokument 2 oeffnen, Wert markieren, "Neu anonymisieren"; wartet, bis ein evtl. Neulauf des Projekts fertig ist
async function markAndReanon(f, value) {
  await f.locator('#PRJPANEL button.prj-item').nth(1).click();
  await f.evaluate((v) => { PSLib.marks.add(manualMarks, { value: v, pfx: 'NAME' }); }, value);
  await f.evaluate(() => reanon());
  await f.waitForFunction(() => !prjBusy && !anonBusy, null, { timeout: 60000 });
}
async function zipTexts(f) {
  await f.evaluate(() => { document.getElementById('PRJMAP').checked = false; window.__dls = []; });
  await f.evaluate(() => prjZip(true));
  await f.waitForFunction(() => (window.__dls || []).some((x) => x.name === 'anonymisiert.zip'), null, { timeout: 30000 });
  const d = (await getDownloads(f)).find((x) => x.name === 'anonymisiert.zip');
  const z = await JSZip.loadAsync(Buffer.from(d.base64, 'base64'));
  const out = {};
  for (const n of Object.keys(z.files).filter((x) => /\.txt$/.test(x) && !/^bericht/.test(x)).sort()) out[n] = await z.file(n).async('string');
  return out;
}
const psmapPayload = async (f) => {
  await f.evaluate(() => { window.__dls = []; psMapSave(); });
  await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 10000 });
  await f.fill('#PWD1', PW);
  await f.fill('#PWD2', PW);
  await f.click('#PWOK');
  await f.waitForFunction(() => (window.__dls || []).some((x) => /\.psmap$/.test(x.name)), null, { timeout: 20000 });
  const d = (await getDownloads(f)).find((x) => /\.psmap$/.test(x.name));
  return JSON.stringify(await psmap.decrypt(new Uint8Array(Buffer.from(d.base64, 'base64')), PW));
};
const csvText = async (f) => {
  await f.evaluate(() => { window.__dls = []; window.confirm = () => true; expMap(); });
  const d = (await getDownloads(f)).find((x) => /\.csv$/.test(x.name));
  return Buffer.from(d.base64, 'base64').toString('utf8');
};
const removeDoc = async (f, idx) => { await f.locator('#PRJPANEL button.prj-del').nth(idx).click(); };

test('K1: nach Korrektur in Dokument 2 enthaelt das ZIP keinen Klartext des markierten Werts', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await markAndReanon(f, 'Zwiebelbaum');
    const c = await zipTexts(f);
    assert.ok(!/Zwiebelbaum/.test(Object.values(c).join('\n')), 'ZIP enthaelt Klartext trotz Markierung: ' + JSON.stringify(c));
  } finally { await a.close(); }
});

test('K1: nach Korrektur in Dokument 2 liefert die Rueckuebersetzung von Dokument 1 weiter die Adresse von Anna', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await markAndReanon(f, 'Zwiebelbaum');
    const back = await f.evaluate(() => [...prjRes.values()].map((r) => PSDetect.deanonymize(r.text, { store })));
    assert.equal(back[0], D1, 'Dokument 1 wird nicht zum Original zurueckuebersetzt: ' + back[0]);
    assert.equal(back[1], D2, 'Dokument 2 wird nicht zum Original zurueckuebersetzt: ' + back[1]);
  } finally { await a.close(); }
});

test('K1: nach Korrektur entspricht der sichtbare Text von Dokument 2 dem Projektergebnis und dem ZIP-Inhalt', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await markAndReanon(f, 'Zwiebelbaum');
    const s = await f.evaluate(() => ({ visible: document.getElementById('AT').value, res: [...prjRes.values()][1].text }));
    const c = await zipTexts(f);
    assert.equal(s.visible, s.res, 'sichtbarer Text weicht vom Projektergebnis ab');
    assert.equal(Object.values(c)[1], s.visible, 'ZIP-Inhalt weicht vom sichtbaren Text ab');
  } finally { await a.close(); }
});

test('K1: nach Korrektur gehoeren Zuordnung (.psmap) und Ergebnistexte zusammen: jeder Platzhalter der Ergebnisse ist aufloesbar', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await markAndReanon(f, 'Zwiebelbaum');
    const payload = JSON.parse(await psmapPayload(f));
    const keys = Object.keys((payload.state || payload).store || {});
    const used = await f.evaluate(() => [...prjRes.values()].flatMap((r) => r.text.match(/\{\{[^{}]+\}\}/g) || []));
    assert.ok(used.length >= 3, 'zu wenige Platzhalter in den Ergebnissen: ' + used);
    for (const k of new Set(used)) assert.ok(keys.includes(k), 'Platzhalter ohne Zuordnung in der .psmap: ' + k);
  } finally { await a.close(); }
});

test('K1: Whitelist-Aenderung nach dem Lauf und "Neu anonymisieren": Ergebnisse bleiben rueckuebersetzbar oder der ZIP-Export ist als veraltet gesperrt', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await f.locator('#PRJPANEL button.prj-item').nth(1).click();
    await f.evaluate(() => { whitelist.push('Zwiebelbaum'); document.getElementById('IT').value = document.getElementById('IT').value; });
    await f.evaluate(() => PSLib.marks.add(manualMarks, { value: 'Notiz', pfx: 'NAME' }));
    await f.evaluate(() => reanon());
    await f.waitForFunction(() => !prjBusy && !anonBusy, null, { timeout: 60000 });
    const s = await f.evaluate(() => ({
      zipDisabled: document.getElementById('PRJZIP').disabled,
      back: [...prjRes.values()].map((r) => PSDetect.deanonymize(r.text, { store })),
    }));
    assert.ok(s.zipDisabled || (s.back[0] === D1 && s.back[1] === D2), 'weder gesperrt noch konsistent: ' + JSON.stringify(s));
  } finally { await a.close(); }
});

test('S2: "Alles zuruecksetzen" leert das Projekt: keine Dokumente, keine Ergebnisse, Panel verborgen', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await f.evaluate(() => { window.confirm = () => true; clearAll(); });
    const s = await f.evaluate(() => ({
      docs: prj ? prj.docs.length : 0, res: prjRes.size, panel: document.getElementById('PRJPANEL').style.display,
      items: document.querySelectorAll('#PRJPANEL button.prj-item').length,
    }));
    assert.equal(s.docs, 0, 'Projektdokumente bleiben');
    assert.equal(s.res, 0, 'Projektergebnisse bleiben');
    assert.equal(s.items, 0, 'Dokumentliste bleibt');
    assert.equal(s.panel, 'none', 'Projekt-Panel bleibt sichtbar');
  } finally { await a.close(); }
});

test('S2: nach Entfernen von Dokument 2 enthaelt die .psmap-Nutzlast keinen Wert des entfernten Dokuments', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await removeDoc(f, 1);
    const p = await psmapPayload(f);
    assert.ok(!/ben\.beispiel|Zwiebelbaum/.test(p), '.psmap enthaelt Wert des entfernten Dokuments');
    assert.ok(/anna\.beispiel/.test(p), 'Wert des verbliebenen Dokuments fehlt');
  } finally { await a.close(); }
});

test('S2: nach Entfernen von Dokument 2 enthaelt die CSV keinen Wert des entfernten Dokuments', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await removeDoc(f, 1);
    const csv = await csvText(f);
    assert.ok(!/ben\.beispiel/.test(csv), 'CSV enthaelt Wert des entfernten Dokuments: ' + csv);
    assert.ok(/anna\.beispiel/.test(csv), 'Wert des verbliebenen Dokuments fehlt');
  } finally { await a.close(); }
});

test('S2: nach Entfernen von Dokument 2 zeigt die Zuordnungstabelle nur Eintraege der verbliebenen Dokumente', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await removeDoc(f, 1);
    const s = await f.evaluate(() => ({ mt: document.getElementById('MT').textContent, mb: document.getElementById('MB').textContent }));
    assert.ok(!/ben\.beispiel/.test(s.mt), 'Tabelle zeigt Wert des entfernten Dokuments');
    assert.ok(/anna\.beispiel/.test(s.mt), 'Tabelle zeigt Wert des verbliebenen Dokuments nicht');
    assert.equal(s.mb, '1 Einträge');
  } finally { await a.close(); }
});

test('S2: nach Entfernen des letzten Dokuments ist die Zuordnung leer', async () => {
  const { a, f } = await setup([['d1.txt', D1], ['d2.txt', D2]]);
  try {
    await removeDoc(f, 1);
    await removeDoc(f, 0);
    const n = await f.evaluate(() => Object.keys(store).length);
    assert.equal(n, 0, 'Zuordnung bleibt nach Entfernen des letzten Dokuments');
  } finally { await a.close(); }
});

test('S2: "Alles zuruecksetzen" leert manuelle Markierungen und die letzte Leckpruefung', async () => {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  try {
    await f.evaluate(() => startApp());
    await f.evaluate(async () => {
      document.getElementById('IT').value = 'Kontakt: anna.beispiel@example.invalid. Notiz: Zwiebelbaum.';
      PSLib.marks.add(manualMarks, { value: 'Zwiebelbaum', pfx: 'NAME' });
      await anon();
      window.confirm = () => true;
      clearAll();
    });
    const s = await f.evaluate(() => ({ marks: JSON.stringify(PSLib.marks.toCvars(manualMarks)), lc: !!lcLast }));
    assert.ok(!/Zwiebelbaum/.test(s.marks), 'manuelle Markierung bleibt: ' + s.marks);
    assert.equal(s.lc, false, 'letzte Leckpruefung bleibt');
  } finally { await a.close(); }
});

test('D23: "Alles zuruecksetzen" leert den KI-Zwischenspeicher (aiCache)', async () => {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  try {
    await f.evaluate(() => startApp());
    await f.evaluate(() => {
      aiCache = { key: 'Kontakt: anna.beispiel@example.invalid.', spans: [{ start: 0, end: 7, type: 'NAME' }] };
      window.confirm = () => true;
      clearAll();
    });
    const s = await f.evaluate(() => ({ key: aiCache.key, spans: aiCache.spans.length }));
    assert.equal(s.key, null, 'aiCache.key bleibt: ' + s.key);
    assert.equal(s.spans, 0, 'aiCache.spans bleiben');
  } finally { await a.close(); }
});
