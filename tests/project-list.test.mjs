// B1.w1: Dokumentenliste und Lauf (E2E). Mehrere Dateien fuellen #PRJPANEL, "Alle anonymisieren" (#PRJRUN) nutzt PSLib.project.run
// mit gemeinsamem Zustand; eine Datei laeuft wie in 1.8.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, captureDownloads, getDownloads, setFiles, makePdf } from './helpers.mjs';
import { loadVendor } from './unit/_load.mjs';

const JSZip = loadVendor('jszip');
const TEXT = 'Herr Thomas Müller';
const PH = /\{\{NAME_\d+\}\}/;

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
const getToasts = (f) => f.evaluate(() => window.__toasts);
const txt = (name, text = TEXT) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });

async function makeDocx(text) {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return z.generateAsync({ type: 'nodebuffer' });
}

const items = (f) => f.$$eval('#PRJPANEL button.prj-item', (els) => els.map((e) => ({ id: e.getAttribute('data-id'), text: e.textContent })));
const waitItems = (f, n) => f.waitForFunction((k) => document.querySelectorAll('#PRJPANEL button.prj-item').length === k, n, { timeout: 20000 });
const countStatus = (f, re) => f.$$eval('#PRJPANEL button.prj-item', (els, s) => els.filter((e) => new RegExp(s, 'i').test(e.textContent)).length, re);
async function waitAllDone(f, n) {
  await f.waitForFunction((k) => {
    const els = [...document.querySelectorAll('#PRJPANEL button.prj-item')];
    return els.length === k && els.every((e) => /fertig/i.test(e.textContent));
  }, n, { timeout: 60000 });
}
// Klick auf Dokument i (0-basiert) und Ergebnis aus #AT lesen
async function resultOf(f, i) {
  await f.locator('#PRJPANEL button.prj-item').nth(i).click();
  await f.waitForFunction(() => document.getElementById('AT').value.length > 0, null, { timeout: 15000 });
  return f.evaluate(() => ({ at: document.getElementById('AT').value, it: document.getElementById('IT').value }));
}

test('Drei Dateien (TXT, DOCX, PDF) mit demselben Namen: alle fertig und derselbe Platzhalter in den drei Ergebnissen', async () => {
  const { a, f } = await prepare();
  try {
    const pdf = await makePdf(a.app, '<body style="font:16px Arial"><p>Herr Thomas Müller wohnt in Berlin.</p>');
    await setFiles(f, [
      txt('a.txt'),
      { name: 'b.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await makeDocx(TEXT) },
      { name: 'c.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf, 'base64') },
    ]);
    await waitItems(f, 3);
    await f.click('#PRJRUN');
    await waitAllDone(f, 3);
    const found = new Set();
    for (let i = 0; i < 3; i++) {
      const r = await resultOf(f, i);
      assert.ok(!r.at.includes('Müller'), `Ergebnis ${i + 1} enthaelt Klartext`);
      const m = r.at.match(PH);
      assert.ok(m, `Ergebnis ${i + 1} ohne Platzhalter: ${r.at}`);
      found.add(m[0]);
    }
    assert.equal(found.size, 1, 'gleicher Name muss in allen Dokumenten denselben Platzhalter erhalten: ' + [...found]);
    assert.match(await f.textContent('#PRJSUM'), /3 Dokumente/);
    assert.equal(await f.getAttribute('#PRJPROG', 'aria-valuemax'), '3');
    assert.equal(await f.getAttribute('#PRJPROG', 'aria-valuenow'), '3');
  } finally { await a.close(); }
});

test('Liste zeigt je Dokument Nummer, Dateiname, Status als Text und ein SVG-Symbol sowie einen Entfernen-Knopf', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('eins.txt'), txt('zwei.txt')]);
    await waitItems(f, 2);
    const it = await items(f);
    assert.match(it[0].text, /eins\.txt/);
    assert.match(it[0].text, /wartet/i);
    assert.equal(await f.$$eval('#PRJPANEL button.prj-item svg', (e) => e.length) >= 2, true, 'Status-Symbol (inline-SVG) fehlt');
    assert.equal(await f.$$eval('#PRJPANEL button.prj-del', (e) => e.length), 2);
    assert.ok(await f.$('#PRJRUN'));
    assert.ok(await f.$('#PRJCANCEL'));
  } finally { await a.close(); }
});

test('Fuenf Textdateien, Abbruch nach dem ersten Dokument: eins fertig, vier wartet', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, ['1', '2', '3', '4', '5'].map((n) => txt(`d${n}.txt`)));
    await waitItems(f, 5);
    await f.evaluate(() => {
      const orig = PSLib.project.run;
      PSLib.project.run = function (p, o) {
        const prog = o.onProgress;
        return orig.call(this, p, Object.assign({}, o, {
          onProgress: (e) => { if (prog) prog(e); if (e.done === 1) document.getElementById('PRJCANCEL').click(); },
        }));
      };
    });
    await f.click('#PRJRUN');
    await f.waitForFunction(() => [...document.querySelectorAll('#PRJPANEL button.prj-item')].some((e) => /fertig/i.test(e.textContent)), null, { timeout: 30000 });
    await f.waitForTimeout(1500);
    assert.equal(await countStatus(f, 'fertig'), 1);
    assert.equal(await countStatus(f, 'wartet'), 4);
    assert.equal(await f.evaluate(() => psCurrent()), false);
    assert.equal(await f.locator('#PRJZIP').isDisabled(), true);
    assert.equal(await f.evaluate(async () => { try { await psEvidence(); return false; } catch { return true; } }), true);
  } finally { await a.close(); }
});

test('Eine .exe-Datei wird mit Meldung "Dateityp nicht unterstuetzt" abgelehnt und nicht in die Liste aufgenommen', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('gut.txt'), { name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ abc') }]);
    await f.waitForFunction(() => (window.__toasts || []).some((x) => /Dateityp nicht unterstützt: \.?exe/i.test(x.msg)), null, { timeout: 15000 });
    assert.equal((await items(f)).length <= 1, true);
    assert.ok(!(await items(f)).some((x) => /virus\.exe/.test(x.text)));
  } finally { await a.close(); }
});

test('Eine .doc-Datei wird mit der Meldung zum alten .doc-Format abgelehnt', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('gut.txt'), { name: 'alt.doc', mimeType: 'application/msword', buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]) }]);
    await f.waitForFunction(() => (window.__toasts || []).some((x) => /Dateien im alten \.doc-Format werden nicht unterstützt\. Bitte in Word als \.docx speichern\./.test(x.msg)), null, { timeout: 15000 });
    assert.ok(!(await items(f)).some((x) => /alt\.doc/.test(x.text)));
  } finally { await a.close(); }
});

test('Entfernen eines Dokuments: Liste schrumpft, die uebrigen laufen und bleiben nummeriert', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('x1.txt'), txt('x2.txt'), txt('x3.txt')]);
    await waitItems(f, 3);
    const before = await items(f);
    await f.locator('#PRJPANEL button.prj-del').nth(1).click();
    await waitItems(f, 2);
    const after = await items(f);
    assert.deepEqual(after.map((x) => x.id), [before[0].id, before[2].id]);
    assert.ok(!after.some((x) => /x2\.txt/.test(x.text)));
    await f.click('#PRJRUN');
    await waitAllDone(f, 2);
    assert.match(await f.textContent('#PRJSUM'), /2 Dokumente/);
  } finally { await a.close(); }
});

test('Einzeldatei laeuft unveraendert: Text in #IT, keine Projektliste, Ergebnis mit Platzhalter, kein Download', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [txt('einzeln.txt')]);
    await f.waitForFunction((t) => document.getElementById('IT').value.includes(t), TEXT, { timeout: 15000 });
    assert.equal((await items(f)).length, 0, 'keine Projektliste bei einer Datei');
    await f.evaluate(async () => { await anon(); });
    const at = await f.evaluate(() => document.getElementById('AT').value);
    assert.match(at, /\{\{NAME_1\}\}/);
    assert.ok(!at.includes('Müller'));
    assert.equal((await getDownloads(f)).length, 0);
    assert.ok(!(await getToasts(f)).some((x) => /Mehrere Dateien werden einzeln verarbeitet/.test(x.msg)));
  } finally { await a.close(); }
});
