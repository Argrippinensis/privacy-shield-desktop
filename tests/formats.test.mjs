// B2.w: Weitere Formate in der Oberflaeche (E2E). Fixtures entstehen im Test (keine Binaerdateien im Repo).
// Jedes Beispiel enthaelt "Herr Thomas Müller, max@firma.de"; nach dem Laden ueber #FI und anon() (KI aus) darf kein Klartext bleiben.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, setFiles } from './helpers.mjs';
import { loadVendor } from './unit/_load.mjs';

const JSZip = loadVendor('jszip');
const VALUE = 'Herr Thomas Müller, max@firma.de';
const NAME_PH = /\{\{NAME_\d+\}\}/;
const MAIL_PH = /\{\{EMAIL_\d+\}\}/;

async function prepare() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => { window.confirm = () => true; window.alert = () => {}; startApp(); setAIMode('off'); });
  await f.evaluate(() => {
    window.__toasts = [];
    const orig = window.toast;
    window.toast = function (msg, type) { window.__toasts.push({ msg: String(msg), type }); return orig.apply(this, arguments); };
  });
  return { a, f };
}
const toasts = (f) => f.evaluate(() => window.__toasts.map((t) => t.msg));
const waitToast = (f, re, timeout = 15000) => f.waitForFunction((s) => window.__toasts.some((t) => new RegExp(s).test(t.msg)), re.source, { timeout });
const waitLoaded = (f) => f.waitForFunction(() => document.getElementById('IT').value.length > 0, null, { timeout: 20000 });
const getIT = (f) => f.evaluate(() => document.getElementById('IT').value);
async function anonymize(f) {
  await f.evaluate(() => { aiCache = { key: null, spans: [] }; return anon(); });
  return f.evaluate(() => document.getElementById('AT').value);
}
function assertClean(out) {
  assert.ok(!out.includes('Müller'), 'Name im Klartext: ' + out);
  assert.ok(!out.includes('max@firma.de'), 'E-Mail im Klartext: ' + out);
  assert.match(out, NAME_PH, 'Name-Platzhalter fehlt: ' + out);
  assert.match(out, MAIL_PH, 'E-Mail-Platzhalter fehlt: ' + out);
}
// Datei laden, Eingabe pruefen (kein Rohformat), anonymisieren, Klartextfreiheit pruefen
async function roundTrip(name, buffer, { rawMarkers = [] } = {}) {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [{ name, mimeType: 'application/octet-stream', buffer }]);
    await waitLoaded(f);
    const input = await getIT(f);
    assert.ok(input.includes('Thomas'), 'Text wurde nicht ausgelesen: ' + input.slice(0, 200));
    for (const m of rawMarkers) assert.ok(!input.includes(m), `Rohformat "${m}" im Eingabetext`);
    assertClean(await anonymize(f));
    return input;
  } finally { await a.close(); }
}

const OOXML_CT = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>';
const rels = (type, target) => `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/></Relationships>`;
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

function makeXlsx() {
  const z = new JSZip();
  z.file('[Content_Types].xml', OOXML_CT);
  z.file('_rels/.rels', rels('officeDocument', 'xl/workbook.xml'));
  z.file('xl/workbook.xml', '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Tabelle1" sheetId="1" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></sheets></workbook>');
  z.file('xl/sharedStrings.xml', `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1"><si><t>${VALUE}</t></si></sst>`);
  z.file('xl/worksheets/sheet1.xml', '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>');
  return z.generateAsync({ type: 'nodebuffer' });
}
function makeOdt() {
  const z = new JSZip();
  z.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  z.file('META-INF/manifest.xml', '<?xml version="1.0"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>');
  z.file('content.xml', `<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:text><text:p>${VALUE}</text:p></office:text></office:body></office:document-content>`);
  return z.generateAsync({ type: 'nodebuffer' });
}
function makePptx() {
  const z = new JSZip();
  z.file('[Content_Types].xml', OOXML_CT);
  z.file('_rels/.rels', rels('officeDocument', 'ppt/presentation.xml'));
  z.file('ppt/presentation.xml', '<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>');
  z.file('ppt/slides/slide1.xml', `<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${VALUE}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  return z.generateAsync({ type: 'nodebuffer' });
}
// DOCX: Haupttext neutral, Name und E-Mail nur in Kopfzeile und Fusszeile (mammoth liefert beides nicht)
function makeDocxHeaderFooter() {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', rels('officeDocument', 'word/document.xml'));
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body><w:p><w:r><w:t>Nur Fließtext im Hauptteil.</w:t></w:r></w:p></w:body></w:document>`);
  z.file('word/header1.xml', `<?xml version="1.0" encoding="UTF-8"?><w:hdr ${W}><w:p><w:r><w:t>Herr Thomas Müller</w:t></w:r></w:p></w:hdr>`);
  z.file('word/footer1.xml', `<?xml version="1.0" encoding="UTF-8"?><w:ftr ${W}><w:p><w:r><w:t>max@firma.de</w:t></w:r></w:p></w:ftr>`);
  return z.generateAsync({ type: 'nodebuffer' });
}
const makeEml = () => Buffer.from(`From: Max <max@firma.de>\r\nTo: info@beispiel.de\r\nSubject: Test\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${VALUE}\r\n`, 'utf8');
const makeHtml = () => Buffer.from(`<!DOCTYPE html><html><head><style>p{color:red}</style></head><body><script>var x = 1;</script><p>${VALUE.replace('ü', '&uuml;')}</p></body></html>`, 'utf8');
const makeRtf = () => Buffer.from(`{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f0 Arial;}} Herr Thomas M\\'fcller, max@firma.de\\par}`, 'latin1');

test('XLSX: Zellen werden ausgelesen und anonymisiert, kein Klartext im Ergebnis', async () => {
  await roundTrip('tabelle.xlsx', await makeXlsx(), { rawMarkers: ['PK', '<si>', 'sharedStrings'] });
});

test('ODT: Text wird ausgelesen und anonymisiert, kein Klartext im Ergebnis', async () => {
  await roundTrip('brief.odt', await makeOdt(), { rawMarkers: ['PK', 'office:'] });
});

test('PPTX: Folientext wird ausgelesen und anonymisiert, kein Klartext im Ergebnis', async () => {
  await roundTrip('folien.pptx', await makePptx(), { rawMarkers: ['PK', '<a:t>'] });
});

test('EML: Kopf und Körper werden ausgelesen und anonymisiert, kein Klartext im Ergebnis', async () => {
  const input = await roundTrip('nachricht.eml', makeEml());
  assert.match(input, /Von: /, 'Kopfzeile "Von:" fehlt (extractEml nicht verdrahtet)');
});

test('HTML: Markup und Skripte entfallen, Text wird anonymisiert, kein Klartext im Ergebnis', async () => {
  await roundTrip('seite.html', makeHtml(), { rawMarkers: ['<p>', '<script', 'var x', 'color:red', '&uuml;'] });
});

test('RTF: Steuerwörter entfallen und \\\'fc wird zu ü, Ergebnis ohne Klartext', async () => {
  await roundTrip('brief.rtf', makeRtf(), { rawMarkers: ['\\rtf1', "\\'fc", 'fonttbl', 'Arial'] });
});

test('DOCX mit Kopf- und Fußzeile: Name und E-Mail aus Kopf-/Fußzeile werden geladen und anonymisiert', async () => {
  const input = await roundTrip('mit-kopf.docx', await makeDocxHeaderFooter());
  assert.ok(input.includes('Nur Fließtext im Hauptteil.'), 'Haupttext (mammoth) fehlt');
  assert.ok(input.includes('max@firma.de'), 'Fußzeile fehlt im Eingabetext');
});

test('Latin-1-TXT mit "Herr Thomas Müller" wird als Kodierungsfall zu {{NAME_1}}', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [{ name: 'latin1.txt', mimeType: 'text/plain', buffer: Buffer.from('Herr Thomas Müller wohnt hier.', 'latin1') }]);
    await waitLoaded(f);
    const input = await getIT(f);
    assert.ok(input.includes('Müller'), 'Umlaut falsch dekodiert: ' + input);
    assert.ok(!input.includes('�'), 'Ersatzzeichen im Eingabetext');
    const out = await anonymize(f);
    assert.ok(out.includes('{{NAME_1}}'), out);
    assert.ok(!out.includes('Müller'), out);
  } finally { await a.close(); }
});

test('RTF mit M\\\'fcller (Windows-1252): Name wird erkannt und ersetzt', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [{ name: 'name.rtf', mimeType: 'application/rtf', buffer: Buffer.from("{\\rtf1\\ansi\\ansicpg1252 Herr Thomas M\\'fcller wohnt in Berlin.\\par}", 'latin1') }]);
    await waitLoaded(f);
    const input = await getIT(f);
    assert.ok(input.includes('Müller'), 'Escape nicht dekodiert: ' + input);
    const out = await anonymize(f);
    assert.match(out, NAME_PH, out);
    assert.ok(!out.includes('Müller'), out);
  } finally { await a.close(); }
});

test('.doc-Magic (D0CF11E0...) zeigt die Meldung zu alten .doc-Dateien und lädt keinen Rohtext', async () => {
  const { a, f } = await prepare();
  try {
    const magic = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0, 0, 0, 0, 0x41, 0x42, 0x43, 0x44]);
    await setFiles(f, [{ name: 'alt.doc', mimeType: 'application/msword', buffer: magic }]);
    await waitToast(f, /Dateien im alten \.doc-Format werden nicht unterstützt\. Bitte in Word\/Excel\/PowerPoint als \.docx\/\.xlsx\/\.pptx speichern\./);
    assert.equal(await getIT(f), '', 'Eingabefeld darf keinen Rohtext enthalten');
  } finally { await a.close(); }
});

test('ZIP mit gefälschter Größe zeigt die Archivmeldung, die App bleibt bedienbar', async () => {
  const { a, f } = await prepare();
  try {
    const z = new JSZip();
    z.file('[Content_Types].xml', OOXML_CT);
    z.file('word/document.xml', '<w:document/>');
    const buf = await z.generateAsync({ type: 'nodebuffer' });
    // Zentralverzeichnis (0x02014b50): Offset +20 komprimiert, +24 unkomprimiert; erster Eintrag auf 50 MiB unkomprimiert, 100 KiB komprimiert
    const sig = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
    const at = buf.indexOf(sig);
    assert.ok(at > 0, 'Zentralverzeichnis nicht gefunden');
    buf.writeUInt32LE(100 * 1024, at + 20);
    buf.writeUInt32LE(50 * 1024 * 1024, at + 24);
    await setFiles(f, [{ name: 'bombe.docx', mimeType: 'application/octet-stream', buffer: buf }]);
    await waitToast(f, /Archiv ist verdächtig stark komprimiert/);
    assert.equal(await getIT(f), '', 'Eingabefeld darf keinen Inhalt der Datei enthalten');
    for (const m of await toasts(f)) assert.ok(!/<w:|PK/.test(m), 'Rohtext in Meldung: ' + m);
    // App bleibt bedienbar: eine normale Datei danach laden und anonymisieren
    await setFiles(f, [{ name: 'ok.txt', mimeType: 'text/plain', buffer: Buffer.from(VALUE, 'utf8') }]);
    await f.waitForFunction(() => document.getElementById('IT').value.includes('Thomas'), null, { timeout: 15000 });
    assertClean(await anonymize(f));
  } finally { await a.close(); }
});
