// B1.w2: Projekt als ZIP (#PRJZIP), Bericht und verschluesselte Zuordnung (E2E, rot bis zur Umsetzung).
// Angenommene Bedienelemente: #PRJZIP (Knopf), Kaestchen mit Beschriftung "Zuordnung einschliessen" (Standard an) und
// "Originalnamen verwenden" (Standard aus, Hinweis "Dateinamen enthalten oft Namen"); Passwortdialog #PWDLG aus A3.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { launchApp, toolFrame, captureDownloads, getDownloads, setFiles, makePdf } from './helpers.mjs';
import { loadVendor } from './unit/_load.mjs';

const require = createRequire(import.meta.url);
const JSZip = loadVendor('jszip');
const psmap = require('../app/lib/psmap.js');
const project = require('../app/lib/project.js');
const T = { timeout: 8000 };
const PW = 'korrektes Pferd Batterie';

const TEXTS = {
  a: 'Herr Thomas Müller, max@firma.de wohnt in Berlin.',
  b: 'Frau Anna Weber schreibt an anna.weber@beispiel.de. Herr Thomas Müller antwortet.',
  c: 'Herr Thomas Müller ruft zurück.',
};
const FRAGS = ['Müller', 'Weber', 'Thomas', 'max@firma.de', 'anna.weber@beispiel.de'];
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

async function prepare() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => startApp());
  await captureDownloads(f);
  await f.evaluate(() => {
    window.__toasts = [];
    const orig = window.toast;
    window.toast = function (msg, type) { window.__toasts.push({ msg: String(msg), type }); return orig.apply(this, arguments); };
  });
  return { a, f };
}
const txt = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
const waitItems = (f, n) => f.waitForFunction((k) => document.querySelectorAll('#PRJPANEL button.prj-item').length === k, n, { timeout: 20000 });
async function runAll(f, n) {
  await waitItems(f, n);
  await f.click('#PRJRUN');
  await f.waitForFunction((k) => {
    const els = [...document.querySelectorAll('#PRJPANEL button.prj-item')];
    return els.length === k && els.every((e) => /fertig/i.test(e.textContent));
  }, n, { timeout: 60000 });
}
async function makeDocx(text) {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return z.generateAsync({ type: 'nodebuffer' });
}
async function enterPassword(f, pw = PW) {
  await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 10000 });
  await f.fill('#PWD1', pw);
  await f.fill('#PWD2', pw);
  await f.click('#PWOK', T);
}
// ZIP erzeugen (Standard: Zuordnung an, Passwort wird im Dialog eingegeben) und laden
async function makeZip(f, { password = true } = {}) {
  await f.evaluate(() => { window.__dls = []; });
  await f.click('#PRJZIP');
  if (password) await enterPassword(f);
  await f.waitForFunction(() => (window.__dls || []).some((x) => x.name === 'anonymisiert.zip'), null, { timeout: 40000 });
  const d = (await getDownloads(f)).find((x) => x.name === 'anonymisiert.zip');
  return JSZip.loadAsync(Buffer.from(d.base64, 'base64'));
}
const resultNames = (zip) => Object.keys(zip.files).filter((n) => /\.txt$/.test(n) && !/^bericht/.test(n)).sort();
const readAll = async (zip) => Object.fromEntries(await Promise.all(Object.keys(zip.files).filter((n) => !zip.files[n].dir && n !== 'zuordnung.psmap').map(async (n) => [n, await zip.file(n).async('string')])));
const bodyText = (f) => f.evaluate(() => document.body.innerText);

test('Drei Dateien (TXT, DOCX, PDF) in einem Lauf: ZIP anonymisiert.zip enthaelt genau die Eintraege aus zipPlan', async () => {
  const { a, f } = await prepare();
  try {
    const pdf = await makePdf(a.app, '<body style="font:16px Arial"><p>Herr Thomas Müller wohnt in Berlin.</p>');
    await setFiles(f, [
      txt('a.txt', TEXTS.a),
      { name: 'b.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await makeDocx(TEXTS.c) },
      { name: 'c.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf, 'base64') },
    ]);
    await runAll(f, 3);
    const zip = await makeZip(f);
    const results = [1, 2, 3].map((i) => ({ index: i, id: 'x' + i, status: 'fertig' }));
    const expected = project.zipPlan(results, { report: true, map: true }).map((e) => e.path).sort();
    assert.deepEqual(Object.keys(zip.files).sort(), expected);
    assert.deepEqual(expected, ['anonymisiert_001.txt', 'anonymisiert_002.txt', 'anonymisiert_003.txt', 'bericht.json', 'bericht.txt', 'zuordnung.psmap']);
    // gleicher Name, gleicher Platzhalter in allen drei Ergebnissen
    const ph = new Set();
    for (const n of resultNames(zip)) {
      const m = (await zip.file(n).async('string')).match(/\{\{NAME_\d+\}\}/);
      assert.ok(m, `${n} ohne Platzhalter`);
      ph.add(m[0]);
    }
    assert.equal(ph.size, 1);
  } finally { await a.close(); }
});

test('ZIP: kein Eintrag enthaelt Klartext (Name oder Inhalt), Bericht und Dateinamen ohne Fragmente, Zuordnung nicht im Klartext', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('Weber_Anna.txt', TEXTS.b), txt('Mueller_Hans.txt', TEXTS.a)]);
    await runAll(f, 2);
    const zip = await makeZip(f);
    const all = await readAll(zip);
    for (const [n, c] of Object.entries(all)) {
      for (const fr of FRAGS) {
        assert.ok(!n.includes(fr), `Eintragsname ${n} enthaelt ${fr}`);
        assert.ok(!c.includes(fr), `Inhalt von ${n} enthaelt ${fr}`);
      }
    }
    for (const n of Object.keys(zip.files)) assert.ok(!/Weber|Mueller|Hans|Anna/.test(n), 'Originalname im Eintragsnamen: ' + n);
    const psm = Buffer.from(await zip.file('zuordnung.psmap').async('uint8array'));
    assert.equal(psm.subarray(0, 4).toString('latin1'), 'PSM1');
    for (const fr of FRAGS) assert.ok(!psm.toString('utf8').includes(fr) && !psm.toString('latin1').includes(fr), 'Klartext in .psmap');
  } finally { await a.close(); }
});

test('Bericht: bericht.txt und bericht.json mit Zaehlern je Dokument und SHA-256 je Ergebnistext, ohne Klartext', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('eins.txt', TEXTS.a), txt('zwei.txt', TEXTS.b)]);
    await runAll(f, 2);
    const zip = await makeZip(f);
    const rep = JSON.parse(await zip.file('bericht.json').async('string'));
    assert.equal(rep.format, 'privacyshield-report/1');
    assert.equal(rep.documents.length, 2);
    assert.equal(rep.totals.documents, 2);
    const names = resultNames(zip);
    for (let i = 0; i < 2; i++) {
      const content = await zip.file(names[i]).async('string');
      assert.equal(rep.documents[i].index, i + 1);
      assert.equal(rep.documents[i].resultSha256, sha(content), `Hash von Dokument ${i + 1}`);
      assert.ok(Object.values(rep.documents[i].counts).reduce((x, y) => x + y, 0) > 0, 'Zaehler leer');
      assert.ok(rep.documents[i].leak && Number.isInteger(rep.documents[i].leak.count), 'leak fehlt');
    }
    const t = await zip.file('bericht.txt').async('string');
    assert.match(t, /Anonymisierungsbericht/);
    for (const x of [t, JSON.stringify(rep)]) for (const fr of [...FRAGS, 'eins.txt', 'zwei.txt']) assert.ok(!x.includes(fr), 'Bericht enthaelt ' + fr);
  } finally { await a.close(); }
});

test('Rundlauf: store leeren, zuordnung.psmap aus dem ZIP laden (Passwort per Dialog), jedes Ergebnis deanon() ergibt exakt den Originaltext', async () => {
  const { a, f } = await prepare();
  try {
    const orig = [TEXTS.a, TEXTS.b, TEXTS.c];
    await setFiles(f, orig.map((t, i) => txt(`d${i + 1}.txt`, t)));
    await runAll(f, 3);
    const zip = await makeZip(f);
    const psm = Buffer.from(await zip.file('zuordnung.psmap').async('uint8array'));
    await f.evaluate(() => { window.confirm = () => true; store = {}; cnt = {}; renderMap(); });
    await f.setInputFiles('#inp-map-load', [{ name: 'zuordnung.psmap', mimeType: 'application/octet-stream', buffer: psm }]);
    await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
    await f.fill('#PWD1', PW);
    await f.click('#PWOK', T);
    await f.waitForFunction(() => Object.keys(store).length > 0, null, { timeout: 20000 });
    const names = resultNames(zip);
    assert.equal(names.length, 3);
    for (let i = 0; i < 3; i++) {
      const res = await zip.file(names[i]).async('string');
      const back = await f.evaluate((o) => { document.getElementById('AR').value = o; deanon(); return document.getElementById('RT').value; }, res);
      assert.equal(back, orig[i], `Rundlauf Dokument ${i + 1}`);
    }
  } finally { await a.close(); }
});

test('Zuordnungsdatei: Nutzlast docs enthaelt index, name, chars, sha256 je Dokument und stimmt mit den Ergebnissen ueberein', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('p.txt', TEXTS.a), txt('q.txt', TEXTS.b)]);
    await runAll(f, 2);
    const zip = await makeZip(f);
    const p = await psmap.decrypt(await zip.file('zuordnung.psmap').async('uint8array'), PW);
    assert.equal(p.v, 1);
    assert.equal(p.docs.length, 2);
    for (const d of p.docs) {
      assert.deepEqual(Object.keys(d).sort(), ['chars', 'index', 'name', 'sha256']);
      assert.match(d.sha256, /^[0-9a-f]{64}$/);
    }
    assert.deepEqual(p.docs.map((d) => d.index), [1, 2]);
    assert.ok(Object.keys(p.state.store).length > 0);
  } finally { await a.close(); }
});

test('Standard: neutrale Eintragsnamen (anonymisiert_001.txt), Originalnamen aus, Hinweis "Dateinamen enthalten oft Namen" sichtbar', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('Mustermann_Hans.txt', TEXTS.a), txt('Weber_Anna.txt', TEXTS.b)]);
    await runAll(f, 2);
    assert.equal(await f.getByLabel(/Originalnamen verwenden/).isChecked(), false);
    assert.equal(await f.getByLabel(/Zuordnung einschlie(ß|ss)en/).isChecked(), true);
    assert.match(await bodyText(f), /Dateinamen enthalten oft Namen/);
    const zip = await makeZip(f);
    assert.deepEqual(resultNames(zip), ['anonymisiert_001.txt', 'anonymisiert_002.txt']);
  } finally { await a.close(); }
});

test('Schalter "Originalnamen verwenden": Eintragsnamen <Name>_anonymisiert.txt statt neutraler Namen', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('Mustermann_Hans.txt', TEXTS.a), txt('Beispiel_Bericht.txt', TEXTS.c)]);
    await runAll(f, 2);
    await f.getByLabel(/Originalnamen verwenden/).check();
    const zip = await makeZip(f);
    assert.deepEqual(resultNames(zip), ['Beispiel_Bericht_anonymisiert.txt', 'Mustermann_Hans_anonymisiert.txt']);
  } finally { await a.close(); }
});

test('Ohne Haken bei "Zuordnung einschliessen": kein Passwortdialog und keine zuordnung.psmap im ZIP', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('u.txt', TEXTS.a), txt('v.txt', TEXTS.b)]);
    await runAll(f, 2);
    await f.getByLabel(/Zuordnung einschlie(ß|ss)en/).uncheck();
    const zip = await makeZip(f, { password: false });
    assert.equal(await f.isVisible('#PWDLG'), false);
    assert.deepEqual(Object.keys(zip.files).sort(), ['anonymisiert_001.txt', 'anonymisiert_002.txt', 'bericht.json', 'bericht.txt']);
  } finally { await a.close(); }
});

test('Passwortdialog abgebrochen: Hinweis "Ohne Zuordnung kann nicht zurückübersetzt werden" mit Auswahl, "Ohne Zuordnung fortfahren" liefert ZIP ohne .psmap', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('k.txt', TEXTS.a), txt('l.txt', TEXTS.b)]);
    await runAll(f, 2);
    await f.evaluate(() => { window.__dls = []; });
    await f.click('#PRJZIP');
    await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 10000 });
    await f.click('#PWCANCEL', T);
    await f.waitForFunction(() => /Ohne Zuordnung kann nicht zurückübersetzt werden/.test(document.body.innerText), null, { timeout: 10000 });
    assert.equal((await getDownloads(f)).length, 0, 'noch kein Download');
    await f.getByRole('button', { name: /ohne zuordnung/i }).click();
    await f.waitForFunction(() => (window.__dls || []).some((x) => x.name === 'anonymisiert.zip'), null, { timeout: 30000 });
    const d = (await getDownloads(f)).find((x) => x.name === 'anonymisiert.zip');
    const zip = await JSZip.loadAsync(Buffer.from(d.base64, 'base64'));
    assert.ok(!zip.file('zuordnung.psmap'));
    assert.ok(zip.file('bericht.json'));
  } finally { await a.close(); }
});

test('D32: Dokument nach dem Lauf entfernen, dann ZIP: .psmap-Nutzlast und Ergebnisse enthalten nichts vom entfernten Dokument, Dateinamen nicht in Toasts', async () => {
  const { a, f } = await prepare();
  try {
    const gone = 'Frau Erika Schmidtbauer, erika.schmidtbauer@geheim.example';
    await setFiles(f, [txt('keep1.txt', TEXTS.a), txt('Schmidtbauer_Erika.txt', gone), txt('keep2.txt', TEXTS.c)]);
    await runAll(f, 3);
    await f.locator('#PRJPANEL button.prj-del').nth(1).click();
    await waitItems(f, 2);
    const zip = await makeZip(f);
    const p = await psmap.decrypt(await zip.file('zuordnung.psmap').async('uint8array'), PW);
    const payload = JSON.stringify(p);
    for (const fr of ['Schmidtbauer', 'Erika', 'erika.schmidtbauer@geheim.example']) assert.ok(!payload.includes(fr), 'Nutzlast enthaelt ' + fr);
    assert.equal(p.docs.length, 2);
    assert.equal(resultNames(zip).length, 2);
    const all = await readAll(zip);
    for (const [n, c] of Object.entries(all)) for (const fr of ['Schmidtbauer', 'Erika']) assert.ok(!n.includes(fr) && !c.includes(fr), `${n} enthaelt ${fr}`);
    const toasts = await f.evaluate(() => window.__toasts.map((x) => x.msg).join('\n'));
    assert.ok(!/Schmidtbauer|keep1|keep2/.test(toasts), 'Dateiname in Toast: ' + toasts);
  } finally { await a.close(); }
});

test('K1.fix/K2: woertlicher Platzhalter in Dokument 2 wird bei Dokument 1 nie neu vergeben (reserved wird durchgereicht)', async () => {
  const { a, f } = await prepare();
  try {
    const d1 = 'Kontakt: ben.beispiel@example.invalid.';
    const d2 = 'Hinweis: {{EMAIL_1}} steht woertlich im Original.';
    await setFiles(f, [txt('r1.txt', d1), txt('r2.txt', d2)]);
    await runAll(f, 2);
    const s = await f.evaluate(() => ({ res: [...prjRes.values()].map((r) => r.text), back: [...prjRes.values()].map((r) => PSDetect.deanonymize(r.text, { store })) }));
    assert.ok(!s.res[0].includes('{{EMAIL_1}}'), 'Dokument 1 bekommt den woertlich vorkommenden Platzhalter: ' + s.res[0]);
    assert.equal(s.back[0], d1);
    assert.equal(s.back[1], d2);
  } finally { await a.close(); }
});

test('K1.fix/K2: Zuordnungstabelle zeigt Eintraege mit Methode "wortlich" ohne "null" als Farbe', async () => {
  const { a, f } = await prepare();
  try {
    await f.evaluate(() => {
      store = { '{{EMAIL_2}}': { v: '{{EMAIL_1}}', t: 'EMAIL', c: null, m: 'wortlich' } };
      renderMap();
    });
    const html = await f.evaluate(() => document.getElementById('MT').innerHTML);
    assert.ok(!/null/.test(html), 'Tabelle enthaelt "null": ' + html);
  } finally { await a.close(); }
});

test('K1.fix/K2: prjCounts zaehlt woertliche Eintraege nicht als erkannte Entitaet', async () => {
  const { a, f } = await prepare();
  try {
    const c = await f.evaluate(() => {
      store = { '{{EMAIL_2}}': { v: '{{EMAIL_1}}', t: 'EMAIL', c: null, m: 'wortlich' } };
      return prjCounts('Hinweis {{EMAIL_2}} bleibt.');
    });
    assert.equal(c.EMAIL, undefined, 'woertlicher Eintrag zaehlt als EMAIL: ' + JSON.stringify(c));
  } finally { await a.close(); }
});
