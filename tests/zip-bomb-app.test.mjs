// B2.fix App-Test: gefaelschte ZIP-Groessen (Zentralverzeichnis luegt) ueber die echte Oberflaeche.
// Das Archiv behauptet 32 Byte und enthaelt 256 MiB. Erwartet: saubere Ablehnung mit fester Meldung "Archiv zu groß",
// vorher nur begrenzt entpackt, Mammoth (DOCX) wird gar nicht erst gestartet, die App bleibt bedienbar.
// Das Archiv ist wenige hundert KiB gross und entsteht erst im Test (nichts Grosses eingecheckt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, setFiles } from './helpers.mjs';
import { loadVendor } from './unit/_load.mjs';
import { buildZip, MiB } from './unit/_zipfake.mjs';

const JSZip = loadVendor('jszip');
const BOMB_MIB = 256;
const READ_LIMIT = 224 * MiB; // 200 MiB Gesamtgrenze plus Spielraum fuer den letzten Brocken
const ZEIT = { timeout: 180000 };

const CT = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const RELS = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docXml = (text) => '<?xml version="1.0"?><w:document ' + W + '><w:body><w:p><w:r><w:t>' + text + '</w:t></w:r></w:p></w:body></w:document>';

const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  odt: 'application/vnd.oasis.opendocument.text',
};

// Gefaelschte Archive: Kopf sagt 32 Byte, tatsaechlich 256 MiB im Hauptinhalt
function bombe(kind) {
  const common = { mib: BOMB_MIB, declared: 32 };
  if (kind === 'xlsx') return buildZip([{ name: 'xl/sharedStrings.xml', prefix: '<sst><si><t>', suffix: '</t></si></sst>', ...common }]);
  if (kind === 'odt') return buildZip([{ name: 'content.xml', prefix: '<office:document-content><text:p>', suffix: '</text:p></office:document-content>', ...common }]);
  return buildZip([
    { name: '[Content_Types].xml', content: CT },
    { name: '_rels/.rels', content: RELS },
    { name: 'word/document.xml', prefix: '<?xml version="1.0"?><w:document ' + W + '><w:body><w:p><w:r><w:t>Hallo</w:t></w:r></w:p><!--', suffix: '--></w:body></w:document>', ...common },
  ]);
}

// Ehrliche Archive (Positivfall)
async function ehrlich(kind) {
  const z = new JSZip();
  if (kind === 'docx') {
    z.file('[Content_Types].xml', CT);
    z.file('_rels/.rels', RELS);
    z.file('word/document.xml', docXml('Hans Mueller wohnt in Berlin'));
    z.file('word/header1.xml', '<w:hdr ' + W + '><w:p><w:r><w:t>Kopfzeile Weber</w:t></w:r></w:p></w:hdr>');
  } else if (kind === 'xlsx') {
    z.file('xl/sharedStrings.xml', '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Hans Mueller</t></si></sst>');
    z.file('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>');
  } else {
    z.file('content.xml', '<office:document-content><office:body><office:text><text:p>Hans Mueller wohnt in Berlin</text:p></office:text></office:body></office:document-content>');
  }
  return Buffer.from(await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}

// Messpunkte in der Seite: Toasts, tatsaechlich entpackte Bytes (ueber die Seiten-JSZip), Aufrufe von Mammoth
function messen(f) {
  return f.evaluate(() => {
    window.__toasts = [];
    const orig = window.toast;
    window.toast = function (msg, type) { window.__toasts.push({ msg: String(msg), type }); return orig.apply(this, arguments); };
    window.__inflated = 0;
    window.__mammoth = 0;
    const loadAsync = JSZip.loadAsync.bind(JSZip);
    JSZip.loadAsync = async function () {
      const z = await loadAsync.apply(null, arguments);
      for (const e of Object.values(z.files)) {
        if (e.dir) continue;
        const dec = e._decompressWorker.bind(e);
        e._decompressWorker = function () {
          const w = dec();
          w.on('data', (c) => { window.__inflated += c && c.data ? c.data.length : 0; });
          return w;
        };
      }
      return z;
    };
    if (typeof mammoth !== 'undefined') {
      for (const fn of ['extractRawText', 'convertToHtml']) {
        const o = mammoth[fn].bind(mammoth);
        mammoth[fn] = function () { window.__mammoth++; return o.apply(null, arguments); };
      }
    }
  });
}

async function vorbereiten() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => startApp());
  await messen(f);
  return { a, f };
}

// Datei wie ueber die Dateiauswahl laden und auf die Rueckmeldung warten (Fehler oder "geladen")
async function laden(f, name, kind, buffer) {
  await f.evaluate(() => { window.__toasts.length = 0; });
  await setFiles(f, [{ name, mimeType: MIME[kind] || 'text/plain', buffer }]);
  await f.waitForFunction(() => window.__toasts.length > 0, null, { timeout: 150000 });
  return f.evaluate(() => ({
    toasts: window.__toasts.slice(),
    text: document.getElementById('IT').value,
    inflated: window.__inflated,
    mammoth: window.__mammoth,
  }));
}

function assertAbgelehnt(r, wie) {
  const msg = r.toasts.map((t) => t.msg).join(' | ');
  assert.ok(r.toasts.some((t) => t.type === 'e'), wie + ': Fehlermeldung erwartet, war: ' + msg);
  assert.match(msg, /Archiv zu gro(ß|ss)/, wie + ': Meldung nennt nicht die Archivgroesse: ' + msg);
  assert.equal(r.text, '', wie + ': kein Text darf geladen sein');
  assert.ok(r.inflated < READ_LIMIT, wie + ': tatsaechlich entpackt ' + Math.round(r.inflated / MiB) + ' MiB von ' + BOMB_MIB);
}

test('XLSX mit gefaelschter Kopfgroesse wird mit "Archiv zu groß" abgelehnt, nur begrenzt entpackt', ZEIT, async () => {
  const { a, f } = await vorbereiten();
  try {
    const r = await laden(f, 'tabelle.xlsx', 'xlsx', Buffer.from(bombe('xlsx')));
    assertAbgelehnt(r, 'xlsx');
  } finally { await a.close(); }
});

test('DOCX mit gefaelschter Kopfgroesse wird abgelehnt, bevor Mammoth startet', ZEIT, async () => {
  const { a, f } = await vorbereiten();
  try {
    const r = await laden(f, 'brief.docx', 'docx', Buffer.from(bombe('docx')));
    assertAbgelehnt(r, 'docx');
    assert.equal(r.mammoth, 0, 'Mammoth darf nicht aufgerufen werden (eigene JSZip-Kopie ohne Grenze)');
  } finally { await a.close(); }
});

test('ODT mit gefaelschter Kopfgroesse wird abgelehnt', ZEIT, async () => {
  const { a, f } = await vorbereiten();
  try {
    const r = await laden(f, 'brief.odt', 'odt', Buffer.from(bombe('odt')));
    assertAbgelehnt(r, 'odt');
  } finally { await a.close(); }
});

test('Nach der Ablehnung bleibt die App bedienbar: ehrliche Datei laedt, keine Seitenfehler', ZEIT, async () => {
  const { a, f } = await vorbereiten();
  try {
    assertAbgelehnt(await laden(f, 'tabelle.xlsx', 'xlsx', Buffer.from(bombe('xlsx'))), 'xlsx');
    const r = await laden(f, 'notiz.txt', 'txt', Buffer.from('Hans Mueller, Berlin', 'utf8'));
    assert.equal(r.text, 'Hans Mueller, Berlin');
    assert.ok(r.toasts.every((t) => t.type !== 'e'), 'keine Fehlermeldung beim ehrlichen Laden: ' + JSON.stringify(r.toasts));
    assert.equal(await f.evaluate(() => 6 * 7), 42, 'Seite antwortet');
    const pageErrors = a.errors.filter((e) => e.startsWith('pageerror'));
    assert.deepEqual(pageErrors, [], 'Seitenfehler: ' + pageErrors.join(' | '));
  } finally { await a.close(); }
});

test('Mehrfach abgelehnt, mehrfach ehrlich: kein Zustand bleibt haengen', ZEIT, async () => {
  const { a, f } = await vorbereiten();
  try {
    assertAbgelehnt(await laden(f, 'brief.odt', 'odt', Buffer.from(bombe('odt'))), 'odt');
    const r1 = await laden(f, 'brief.odt', 'odt', await ehrlich('odt'));
    assert.match(r1.text, /Hans Mueller wohnt in Berlin/);
    assertAbgelehnt(await laden(f, 'tabelle.xlsx', 'xlsx', Buffer.from(bombe('xlsx'))), 'xlsx');
    const r2 = await laden(f, 'tabelle.xlsx', 'xlsx', await ehrlich('xlsx'));
    assert.match(r2.text, /Hans Mueller/);
  } finally { await a.close(); }
});

test('Ehrliches DOCX (mit Kopfzeile) wird weiter gelesen, Mammoth laeuft', ZEIT, async () => {
  const { a, f } = await vorbereiten();
  try {
    const r = await laden(f, 'brief.docx', 'docx', await ehrlich('docx'));
    assert.ok(r.toasts.every((t) => t.type !== 'e'), 'Fehlermeldung: ' + JSON.stringify(r.toasts));
    assert.match(r.text, /Hans Mueller wohnt in Berlin/);
    assert.match(r.text, /Kopfzeile Weber/);
    assert.ok(r.mammoth >= 1, 'Mammoth muss fuer ehrliche DOCX laufen');
  } finally { await a.close(); }
});

test('Ehrliches XLSX wird weiter gelesen', ZEIT, async () => {
  const { a, f } = await vorbereiten();
  try {
    const r = await laden(f, 'tabelle.xlsx', 'xlsx', await ehrlich('xlsx'));
    assert.ok(r.toasts.every((t) => t.type !== 'e'), 'Fehlermeldung: ' + JSON.stringify(r.toasts));
    assert.match(r.text, /Hans Mueller/);
  } finally { await a.close(); }
});
