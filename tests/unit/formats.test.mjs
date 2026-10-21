// B2.m1: PSLib.formats (detect, guard, decodeText, extractHtml, extractEml, extractRtf)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib, loadVendor } from './_load.mjs';

const formats = loadLib('formats');
const JSZip = loadVendor('jszip');

const enc = (s) => new TextEncoder().encode(s);
const b = (...n) => Uint8Array.from(n);
const MiB = 1048576;

// ---- Hilfen fuer ZIP-Fixtures -------------------------------------------------------------

// Zentralverzeichnis: Signatur 0x02014b50, +20 komprimiert, +24 unkomprimiert (uint32 LE).
// fn(name) -> { comp, uncomp } oder null; ueberschreibt die Groessen der benannten Eintraege.
function patchSizes(bytes, fn) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i + 46 <= bytes.length; i++) {
    if (dv.getUint32(i, true) !== 0x02014b50) continue;
    const nameLen = dv.getUint16(i + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(i + 46, i + 46 + nameLen));
    const r = fn(name);
    if (r) {
      dv.setUint32(i + 20, r.comp, true);
      dv.setUint32(i + 24, r.uncomp, true);
    }
  }
  return bytes;
}

async function zipWith(files) {
  const z = new JSZip();
  for (const [n, c] of Object.entries(files)) z.file(n, c);
  return z.generateAsync({ type: 'uint8array' });
}

async function loadPatched(files, fn) {
  const bytes = await zipWith(files);
  return JSZip.loadAsync(patchSizes(bytes, fn));
}

async function guardCode(zip) {
  try { formats.guard(zip); } catch (e) { return e; }
  return null;
}

function assertFormatError(err, code) {
  assert.ok(err, 'Ausnahme erwartet');
  assert.ok(err instanceof formats.PSFormatError, 'PSFormatError erwartet, war: ' + (err && err.name));
  assert.ok(err instanceof Error);
  assert.equal(err.code, code);
}

// ---- Modul-API ---------------------------------------------------------------------------

test('Modul: stellt detect, guard, decodeText, extractHtml, extractEml, extractRtf und PSFormatError bereit', () => {
  for (const f of ['detect', 'guard', 'decodeText', 'extractHtml', 'extractEml', 'extractRtf']) {
    assert.equal(typeof formats[f], 'function', f);
  }
  assert.equal(typeof formats.PSFormatError, 'function');
  const e = new formats.PSFormatError('TOO_MANY');
  assert.ok(e instanceof Error);
  assert.equal(e.code, 'TOO_MANY');
});

// ---- detect ------------------------------------------------------------------------------

test('detect: ZIP-Formate mit PK-Anfang werden nach Endung erkannt', () => {
  const pk = b(0x50, 0x4b, 0x03, 0x04, 0, 0);
  for (const ext of ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp']) {
    assert.equal(formats.detect('datei.' + ext, pk), ext);
  }
});

test('detect: leeres ZIP (PK 05 06) gilt als ZIP-Anfang', () => {
  assert.equal(formats.detect('a.docx', b(0x50, 0x4b, 0x05, 0x06)), 'docx');
});

test('detect: Endung .docx mit falschem Inhalt ist unknown', () => {
  assert.equal(formats.detect('a.docx', enc('Hallo Welt')), 'unknown');
  assert.equal(formats.detect('a.xlsx', enc('%PDF-1.7')), 'unknown');
  assert.equal(formats.detect('a.odt', new Uint8Array(0)), 'unknown');
});

test('detect: Endung wird nach dem letzten Punkt und klein ausgewertet', () => {
  const pk = b(0x50, 0x4b, 0x03, 0x04);
  assert.equal(formats.detect('Bericht.Final.DOCX', pk), 'docx');
  assert.equal(formats.detect('Notiz.TXT', enc('abc')), 'txt');
});

test('detect: pdf verlangt %PDF am Anfang', () => {
  assert.equal(formats.detect('a.pdf', enc('%PDF-1.4\n...')), 'pdf');
  assert.equal(formats.detect('a.pdf', enc('Kein PDF')), 'unknown');
  assert.equal(formats.detect('a.pdf', enc(' %PDF-1.4')), 'unknown');
});

test('detect: rtf verlangt {\\rtf am Anfang', () => {
  assert.equal(formats.detect('a.rtf', enc('{\\rtf1\\ansi Hallo}')), 'rtf');
  assert.equal(formats.detect('a.rtf', enc('Hallo')), 'unknown');
});

test('detect: doc, xls, ppt verlangen die OLE-Kennung D0CF11E0A1B11AE1', () => {
  const ole = b(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0);
  for (const ext of ['doc', 'xls', 'ppt']) {
    assert.equal(formats.detect('alt.' + ext, ole), ext);
    assert.equal(formats.detect('alt.' + ext, enc('Text statt OLE')), 'unknown');
  }
  assert.equal(formats.detect('alt.doc', b(0xd0, 0xcf, 0x11, 0xe0)), 'unknown');
});

test('detect: Textformate txt, csv, md, json, eml ohne NUL-Byte werden erkannt', () => {
  const t = enc('a,b\n1,2\n');
  for (const ext of ['txt', 'csv', 'md', 'json', 'eml']) {
    assert.equal(formats.detect('x.' + ext, t), ext);
  }
});

test('detect: html und htm ergeben html', () => {
  assert.equal(formats.detect('seite.html', enc('<p>x</p>')), 'html');
  assert.equal(formats.detect('seite.htm', enc('<p>x</p>')), 'html');
});

test('detect: NUL-Byte in den ersten 512 Bytes macht Textformate zu unknown', () => {
  const bin = Uint8Array.from([0x41, 0x42, 0x00, 0x43]);
  for (const ext of ['txt', 'csv', 'md', 'json', 'eml', 'html', 'htm']) {
    assert.equal(formats.detect('x.' + ext, bin), 'unknown', ext);
  }
});

test('detect: unbekannte oder fehlende Endung ist unknown', () => {
  assert.equal(formats.detect('bild.png', enc('abc')), 'unknown');
  assert.equal(formats.detect('ohneendung', enc('abc')), 'unknown');
  assert.equal(formats.detect('x.exe', b(0x4d, 0x5a)), 'unknown');
});

// ---- guard -------------------------------------------------------------------------------

test('guard: normales Minimal-DOCX besteht', async () => {
  const bytes = await zipWith({
    '[Content_Types].xml': '<Types/>',
    '_rels/.rels': '<Relationships/>',
    'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Hallo</w:t></w:r></w:p></w:body></w:document>',
  });
  const zip = await JSZip.loadAsync(bytes);
  assert.doesNotThrow(() => formats.guard(zip));
});

test('guard: genau 2.000 Eintraege sind erlaubt', async () => {
  const files = {};
  for (let i = 0; i < 2000; i++) files['f' + i + '.txt'] = 'x';
  const zip = await JSZip.loadAsync(await zipWith(files));
  assert.equal(Object.keys(zip.files).length, 2000);
  assert.doesNotThrow(() => formats.guard(zip));
});

test('guard: 2.001 Eintraege werfen TOO_MANY', async () => {
  const files = {};
  for (let i = 0; i < 2001; i++) files['f' + i + '.txt'] = 'x';
  const zip = await JSZip.loadAsync(await zipWith(files));
  assertFormatError(await guardCode(zip), 'TOO_MANY');
});

test('guard: Verzeichniseintraege zaehlen bei der Eintragszahl mit', async () => {
  const z = new JSZip();
  for (let i = 0; i < 1001; i++) {
    z.folder('d' + i);
    z.file('d' + i + '/a.txt', 'x');
  }
  const zip = await JSZip.loadAsync(await z.generateAsync({ type: 'uint8array' }));
  assert.ok(Object.keys(zip.files).length > 2000);
  assertFormatError(await guardCode(zip), 'TOO_MANY');
});

test('guard: gefaelschte 300 MiB unkomprimiert bei 150 MiB komprimiert werfen TOO_BIG', async () => {
  const zip = await loadPatched({ 'gross.bin': 'abc' }, () => ({ comp: 150 * MiB, uncomp: 300 * MiB }));
  assertFormatError(await guardCode(zip), 'TOO_BIG');
});

test('guard: Summe ueber mehrere Eintraege ueber 200 MiB wirft TOO_BIG', async () => {
  const zip = await loadPatched({ 'a.bin': 'a', 'b.bin': 'b', 'c.bin': 'c' },
    () => ({ comp: 60 * MiB, uncomp: 80 * MiB }));
  assertFormatError(await guardCode(zip), 'TOO_BIG');
});

test('guard: genau 200 MiB gesamt (Verhaeltnis klein) ist erlaubt', async () => {
  const zip = await loadPatched({ 'a.bin': 'a' }, () => ({ comp: 100 * MiB, uncomp: 200 * MiB }));
  assert.doesNotThrow(() => formats.guard(zip));
});

test('guard: gefaelschte 50 MiB unkomprimiert bei 100 KiB komprimiert werfen RATIO', async () => {
  const zip = await loadPatched({ 'bombe.bin': 'abc' }, () => ({ comp: 100 * 1024, uncomp: 50 * MiB }));
  assertFormatError(await guardCode(zip), 'RATIO');
});

test('guard: komprimiert 0 bei Eintrag ueber 1 MiB gilt als unendliches Verhaeltnis (RATIO)', async () => {
  const zip = await loadPatched({ 'null.bin': 'abc' }, () => ({ comp: 0, uncomp: 5 * MiB }));
  assertFormatError(await guardCode(zip), 'RATIO');
});

test('guard: 900 KiB mit Verhaeltnis 5000 ist erlaubt (unter 1 MiB)', async () => {
  const zip = await loadPatched({ 'klein.bin': 'abc' }, () => ({ comp: 184, uncomp: 900 * 1024 }));
  assert.ok(900 * 1024 / 184 > 4000);
  assert.doesNotThrow(() => formats.guard(zip));
});

test('guard: Reihenfolge, TOO_MANY vor TOO_BIG', async () => {
  const files = {};
  for (let i = 0; i < 2001; i++) files['f' + i + '.txt'] = 'x';
  const zip = await loadPatched(files, (n) => (n === 'f0.txt' ? { comp: 150 * MiB, uncomp: 300 * MiB } : null));
  assertFormatError(await guardCode(zip), 'TOO_MANY');
});

test('guard: Reihenfolge, TOO_BIG vor RATIO', async () => {
  const zip = await loadPatched({ 'a.bin': 'a' }, () => ({ comp: 10, uncomp: 300 * MiB }));
  assertFormatError(await guardCode(zip), 'TOO_BIG');
});

test('guard: fehlendes _data bei einer Datei wirft CORRUPT', () => {
  const fake = { files: { 'a.txt': { dir: false } } };
  assertFormatError(
    (() => { try { formats.guard(fake); } catch (e) { return e; } return null; })(), 'CORRUPT');
});

test('guard: fehlende Groessenangabe bei einer Datei wirft CORRUPT', () => {
  const fake = { files: { 'a.txt': { dir: false, _data: { compressedSize: 5 } } } };
  assertFormatError(
    (() => { try { formats.guard(fake); } catch (e) { return e; } return null; })(), 'CORRUPT');
});

test('guard: prueft ohne Entpacken in unter 200 ms (2.001 Eintraege)', async () => {
  const files = {};
  for (let i = 0; i < 2001; i++) files['f' + i + '.txt'] = 'x';
  const zip = await JSZip.loadAsync(await zipWith(files));
  const t0 = process.hrtime.bigint();
  await guardCode(zip);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 200, 'Dauer ' + ms + ' ms');
});

// ---- decodeText --------------------------------------------------------------------------

test('decodeText: Latin-1-Bytes von Mueller ergeben Mueller mit windows-1252', () => {
  const r = formats.decodeText(b(0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72));
  assert.equal(r.text, 'Müller');
  assert.equal(r.encoding, 'windows-1252');
});

test('decodeText: UTF-8-Bytes von Mueller ergeben utf-8', () => {
  const r = formats.decodeText(enc('Müller'));
  assert.equal(r.text, 'Müller');
  assert.equal(r.encoding, 'utf-8');
});

test('decodeText: UTF-8-BOM wird entfernt', () => {
  const r = formats.decodeText(Uint8Array.from([0xef, 0xbb, 0xbf, ...enc('Müller')]));
  assert.equal(r.text, 'Müller');
  assert.equal(r.encoding, 'utf-8');
});

test('decodeText: UTF-16LE-BOM ergibt utf-16le ohne BOM', () => {
  const bytes = [0xff, 0xfe];
  for (const ch of 'Müller') { const c = ch.charCodeAt(0); bytes.push(c & 255, c >> 8); }
  const r = formats.decodeText(Uint8Array.from(bytes));
  assert.equal(r.text, 'Müller');
  assert.equal(r.encoding, 'utf-16le');
});

test('decodeText: UTF-16BE-BOM ergibt utf-16be ohne BOM', () => {
  const bytes = [0xfe, 0xff];
  for (const ch of 'Müller') { const c = ch.charCodeAt(0); bytes.push(c >> 8, c & 255); }
  const r = formats.decodeText(Uint8Array.from(bytes));
  assert.equal(r.text, 'Müller');
  assert.equal(r.encoding, 'utf-16be');
});

test('decodeText: reines ASCII ergibt utf-8', () => {
  const r = formats.decodeText(enc('Hallo Welt'));
  assert.equal(r.text, 'Hallo Welt');
  assert.equal(r.encoding, 'utf-8');
});

test('decodeText: leere Eingabe ergibt leeren Text', () => {
  assert.equal(formats.decodeText(new Uint8Array(0)).text, '');
});

test('decodeText: zufaellige Bytes werfen nie', () => {
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 8;
  for (let n = 0; n < 200; n++) {
    const len = rnd() % 300;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = rnd() & 255;
    const r = formats.decodeText(arr);
    assert.equal(typeof r.text, 'string');
    assert.equal(typeof r.encoding, 'string');
  }
});

// ---- extractHtml -------------------------------------------------------------------------

test('extractHtml: Beispiel aus der Spezifikation', () => {
  const r = formats.extractHtml('<p>Hallo&nbsp;&amp; <b>Welt</b></p><script>alert(1)</script><p>Zeile&#252;</p>');
  assert.equal(r.text, 'Hallo & Welt\nZeileü');
});

test('extractHtml: script, style, noscript und Kommentare verschwinden samt Inhalt', () => {
  const r = formats.extractHtml(
    'A<script>var x="geheim";</script>B<style>p{color:red}</style>C<noscript>nojs</noscript>D<!-- Kommentar -->E');
  assert.equal(r.text, 'ABCDE');
});

test('extractHtml: Block-Tags ergeben je einen Zeilenumbruch, Grenzen ohne Text zaehlen einmal', () => {
  const r = formats.extractHtml('<div>A</div><div></div><div>B</div><ul><li>C</li><li>D</li></ul>');
  assert.equal(r.text, 'A\nB\nC\nD');
});

test('extractHtml: br ergibt jeweils einen Zeilenumbruch', () => {
  assert.equal(formats.extractHtml('a<br>b<br/>c').text, 'a\nb\nc');
  assert.equal(formats.extractHtml('a<br><br>b').text, 'a\n\nb');
});

test('extractHtml: td und th ergeben ein Tabulatorzeichen, tr einen Zeilenumbruch', () => {
  const r = formats.extractHtml('<table><tr><th>Name</th><th>Ort</th></tr><tr><td>Max</td><td>Koeln</td></tr></table>');
  const lines = r.text.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Name') && lines[0].includes('\tOrt'));
  assert.ok(lines[1].startsWith('Max') && lines[1].includes('\tKoeln'));
});

test('extractHtml: die fuenf vordefinierten Entitaeten', () => {
  assert.equal(formats.extractHtml('&amp;&lt;&gt;&quot;&apos;').text, '&<>"\'');
});

test('extractHtml: nbsp wird zu Leerzeichen', () => {
  assert.equal(formats.extractHtml('a&nbsp;b').text, 'a b');
});

test('extractHtml: numerische Zeichenverweise dezimal und hexadezimal', () => {
  assert.equal(formats.extractHtml('&#252;&#xFC;&#xfc;').text, 'üüü');
});

test('extractHtml: benannte Entitaeten der Tabelle', () => {
  const r = formats.extractHtml(
    '&auml;&ouml;&uuml;&Auml;&Ouml;&Uuml;&szlig;&euro;&copy;&ndash;&mdash;&hellip;&bdquo;&ldquo;&rdquo;&laquo;&raquo;');
  assert.equal(r.text, 'äöüÄÖÜß€©–—…„“”«»');
});

test('extractHtml: Leerzeichenfolgen in einer Zeile werden zu einem Leerzeichen', () => {
  assert.equal(formats.extractHtml('<p>a    b \t  c</p>').text, 'a b c');
});

test('extractHtml: mehr als zwei Zeilenumbrueche werden zu zwei, Ergebnis getrimmt', () => {
  const r = formats.extractHtml('  <p>A</p><br><br><br><br><p>B</p>  ');
  assert.equal(r.text, 'A\n\nB');
});

test('extractHtml: DOCTYPE mit ENTITY wird ignoriert, &a; bleibt unveraendert', () => {
  const r = formats.extractHtml('<!DOCTYPE x [<!ENTITY a "AAAA">]><p>Wert &a; Ende</p>');
  assert.ok(r.text.includes('&a;'), r.text);
  assert.ok(!r.text.includes('AAAA'), r.text);
  assert.ok(!r.text.includes('ENTITY'), r.text);
  assert.ok(!r.text.includes('DOCTYPE'), r.text);
});

test('extractHtml: unbekannte Entitaeten bleiben unveraendert', () => {
  assert.equal(formats.extractHtml('x &unbekannt; y').text, 'x &unbekannt; y');
});

test('extractHtml: Tag-Attribute erscheinen nicht im Text', () => {
  assert.equal(formats.extractHtml('<a href="http://x.de/geheim" title="t">Link</a>').text, 'Link');
});

// ---- extractEml --------------------------------------------------------------------------

test('extractEml: einfaches Beispiel aus der Spezifikation', () => {
  const eml = 'From: Max <max@firma.de>\r\nSubject: =?UTF-8?B?QsO8cm8=?=\r\n\r\nHallo';
  const r = formats.extractEml(enc(eml));
  assert.equal(r.text, 'Von: Max <max@firma.de>\nBetreff: Büro\n\nHallo');
  assert.equal(r.hadAttachments, false);
  assert.equal(r.attachmentCount, 0);
});

test('extractEml: Kopfzeilen To, Cc, Date heissen An, Cc, Datum, nur vorhandene', () => {
  const eml = 'From: a@x.de\r\nTo: b@x.de\r\nCc: c@x.de\r\nDate: Mon, 1 Jan 2024 10:00:00 +0100\r\nX-Mailer: Foo\r\n\r\nText';
  const t = formats.extractEml(enc(eml)).text;
  assert.ok(t.includes('Von: a@x.de'));
  assert.ok(t.includes('An: b@x.de'));
  assert.ok(t.includes('Cc: c@x.de'));
  assert.ok(t.includes('Datum: Mon, 1 Jan 2024 10:00:00 +0100'));
  assert.ok(!t.includes('Betreff'));
  assert.ok(!t.includes('X-Mailer'));
  assert.ok(t.endsWith('\n\nText'));
});

test('extractEml: gefaltete Kopfzeilen werden entfaltet', () => {
  const eml = 'Subject: Erste\r\n Zweite\r\n\tDritte\r\n\r\nx';
  const t = formats.extractEml(enc(eml)).text;
  assert.ok(/^Betreff: Erste\s+Zweite\s+Dritte\n/.test(t), JSON.stringify(t));
});

test('extractEml: RFC-2047 Q-Kodierung mit ISO-8859-1', () => {
  const eml = 'Subject: =?ISO-8859-1?Q?M=FCller_Bericht?=\r\n\r\nx';
  assert.ok(formats.extractEml(enc(eml)).text.includes('Betreff: Müller Bericht'));
});

test('extractEml: quoted-printable mit UTF-8 und weichem Umbruch', () => {
  const eml = 'Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nGr=C3=BC=C3=9Fe aus K=\r\n=C3=B6ln';
  const t = formats.extractEml(enc(eml)).text;
  assert.ok(t.includes('Grüße aus Köln'), JSON.stringify(t));
});

test('extractEml: base64-Koerper mit utf-8', () => {
  const body = Buffer.from('Hallo Müller', 'utf-8').toString('base64');
  const eml = 'Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + body + '\r\n';
  assert.ok(formats.extractEml(enc(eml)).text.includes('Hallo Müller'));
});

test('extractEml: Zeichensatz iso-8859-1 und windows-1252 bei 8bit', () => {
  for (const cs of ['iso-8859-1', 'latin1', 'windows-1252']) {
    const head = enc('Content-Type: text/plain; charset=' + cs + '\r\nContent-Transfer-Encoding: 8bit\r\n\r\nM');
    const bytes = Uint8Array.from([...head, 0xfc, ...enc('ller')]);
    assert.ok(formats.extractEml(bytes).text.includes('Müller'), cs);
  }
});

test('extractEml: multipart/alternative bevorzugt text/plain', () => {
  const eml = [
    'Content-Type: multipart/alternative; boundary="B1"', '', '--B1',
    'Content-Type: text/plain; charset=utf-8', '', 'Klartext-Teil',
    '--B1', 'Content-Type: text/html; charset=utf-8', '', '<p>HTML-Teil</p>', '--B1--', ''].join('\r\n');
  const t = formats.extractEml(enc(eml)).text;
  assert.ok(t.includes('Klartext-Teil'));
  assert.ok(!t.includes('HTML-Teil'));
});

test('extractEml: nur text/html wird ueber extractHtml ausgewertet', () => {
  const eml = 'Content-Type: text/html; charset=utf-8\r\n\r\n<p>Hallo&nbsp;<b>Welt</b></p><script>x()</script>';
  const t = formats.extractEml(enc(eml)).text;
  assert.ok(t.includes('Hallo Welt'));
  assert.ok(!t.includes('<'));
  assert.ok(!t.includes('x()'));
});

test('extractEml: Anhaenge werden nicht gelesen, nur gezaehlt', () => {
  const eml = [
    'Content-Type: multipart/mixed; boundary="M"', '', '--M',
    'Content-Type: text/plain', '', 'Haupttext',
    '--M', 'Content-Type: application/pdf', 'Content-Disposition: attachment; filename="a.pdf"',
    'Content-Transfer-Encoding: base64', '', Buffer.from('GEHEIMER ANHANGSINHALT').toString('base64'),
    '--M', 'Content-Type: text/plain; name="b.txt"', 'Content-Disposition: attachment; filename="b.txt"', '',
    'ANHANGSTEXT-GEHEIM', '--M--', ''].join('\r\n');
  const r = formats.extractEml(enc(eml));
  assert.ok(r.text.includes('Haupttext'));
  assert.ok(!r.text.includes('GEHEIMER'));
  assert.ok(!r.text.includes('ANHANGSTEXT'));
  assert.equal(r.hadAttachments, true);
  assert.equal(r.attachmentCount, 2);
});

test('extractEml: Teil mit filename= ohne Disposition zaehlt als Anhang', () => {
  const eml = [
    'Content-Type: multipart/mixed; boundary="M"', '', '--M',
    'Content-Type: text/plain', '', 'Haupttext',
    '--M', 'Content-Type: image/png; name="x.png"', 'Content-Disposition: inline; filename="x.png"', '', 'DATEN',
    '--M--', ''].join('\r\n');
  const r = formats.extractEml(enc(eml));
  assert.equal(r.attachmentCount, 1);
  assert.ok(!r.text.includes('DATEN'));
});

test('extractEml: verschachtelte multipart-Teile werden gelesen', () => {
  const eml = [
    'Content-Type: multipart/mixed; boundary="OUT"', '', '--OUT',
    'Content-Type: multipart/alternative; boundary="IN"', '', '--IN',
    'Content-Type: text/plain', '', 'Tief verschachtelt', '--IN--', '--OUT--', ''].join('\r\n');
  assert.ok(formats.extractEml(enc(eml)).text.includes('Tief verschachtelt'));
});

test('extractEml: Verschachtelung ueber Tiefe 5 hinaus fuehrt nicht zu Absturz', () => {
  let eml = 'Text';
  let ct = 'text/plain';
  let msg = 'Content-Type: ' + ct + '\r\n\r\n' + eml;
  for (let d = 0; d < 12; d++) {
    msg = 'Content-Type: multipart/mixed; boundary="b' + d + '"\r\n\r\n--b' + d + '\r\n' + msg + '\r\n--b' + d + '--\r\n';
  }
  let r;
  try { r = formats.extractEml(enc(msg)); } catch (e) { assert.ok(e instanceof formats.PSFormatError); return; }
  assert.equal(typeof r.text, 'string');
});

// ---- extractRtf --------------------------------------------------------------------------

test('extractRtf: Beispiel aus der Spezifikation', () => {
  const rtf = "{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f0 Arial;}} M\\'fcller wohnt in K\\u246?ln.\\par Zweite Zeile}";
  assert.equal(formats.extractRtf(rtf).text, 'Müller wohnt in Köln.\nZweite Zeile');
});

test('extractRtf: par und line ergeben Zeilenumbruch, tab Tabulator, Tilde Leerzeichen', () => {
  const r = formats.extractRtf('{\\rtf1 a\\par b\\line c\\tab d\\~e}');
  assert.equal(r.text, 'a\nb\nc\td e');
});

test('extractRtf: Codepage 1251 wird beachtet', () => {
  const r = formats.extractRtf("{\\rtf1\\ansi\\ansicpg1251 \\'cc\\'e0\\'ec\\'e0}");
  assert.equal(r.text, 'Мама');
});

test('extractRtf: unbekannte Codepage faellt auf 1252 zurueck', () => {
  const r = formats.extractRtf("{\\rtf1\\ansi\\ansicpg932 M\\'fcller}");
  assert.equal(r.text, 'Müller');
});

test('extractRtf: uN ist vorzeichenbehaftet (negative Werte)', () => {
  // -3913 + 65536 = 61623 = U+F0B7 ; 252 = u
  const r = formats.extractRtf('{\\rtf1\\ansi \\u252?\\u-3913?}');
  assert.equal(r.text, 'ü' + String.fromCharCode(61623));
});

test('extractRtf: ucN steuert die Zahl der uebersprungenen Ersatzzeichen', () => {
  assert.equal(formats.extractRtf('{\\rtf1\\ansi\\uc2 K\\u246??ln}').text, 'Köln');
  assert.equal(formats.extractRtf('{\\rtf1\\ansi\\uc0 K\\u246 ln}').text, 'Köln');
  assert.equal(formats.extractRtf('{\\rtf1\\ansi K\\u246?ln}').text, 'Köln');
});

test('extractRtf: Gruppen colortbl, stylesheet, info, pict, object und Zielgruppen {\\*...} entfallen', () => {
  const rtf = '{\\rtf1{\\colortbl;\\red0\\green0\\blue0;}{\\stylesheet{\\s0 Normal;}}' +
    '{\\info{\\title GEHEIMTITEL}}{\\pict\\wmetafile8 ABCDEF}{\\object OBJEKTDATEN}{\\*\\generator Foo 1.0;}Sichtbar}';
  const t = formats.extractRtf(rtf).text;
  assert.equal(t, 'Sichtbar');
});

test('extractRtf: Text in header, footer und footnote bleibt erhalten', () => {
  const rtf = '{\\rtf1 Haupt{\\header KOPF}{\\footer FUSS}{\\footnote NOTE}}';
  const t = formats.extractRtf(rtf).text;
  for (const s of ['Haupt', 'KOPF', 'FUSS', 'NOTE']) assert.ok(t.includes(s), s);
});

test('extractRtf: maskierte Klammern und Backslash', () => {
  assert.equal(formats.extractRtf('{\\rtf1 a\\{b\\}c\\\\d}').text, 'a{b}c\\d');
});

// ---- Fuzz (F4.a) -------------------------------------------------------------------------

function fuzzOk(fn) {
  try {
    const r = fn();
    assert.equal(typeof r.text, 'string');
  } catch (e) {
    assert.ok(e instanceof formats.PSFormatError, 'unerwartete Ausnahme: ' + (e && e.stack));
  }
}

test('Fuzz: extractHtml mit kaputten Eingaben wirft nie etwas anderes als PSFormatError', () => {
  const samples = ['<', '<<<>>>', '<p', '<script>', '<!--', '<!DOCTYPE', '<!DOCTYPE x [<!ENTITY', '&', '&#', '&#x;', '&#99999999999;',
    '&#xD800;', '<a href="', '</', '<p>'.repeat(5000), '&amp'.repeat(5000), '\u0000￿', ''];
  for (const s of samples) fuzzOk(() => formats.extractHtml(s));
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 8;
  const alpha = '<>/&;#x!-[]"\'=pdivscript ab1\n';
  for (let n = 0; n < 300; n++) {
    let s = '';
    for (let i = rnd() % 200; i > 0; i--) s += alpha[rnd() % alpha.length];
    fuzzOk(() => formats.extractHtml(s));
  }
});

test('Fuzz: extractEml mit kaputten Eingaben wirft nie etwas anderes als PSFormatError', () => {
  const samples = ['', '\r\n\r\n', 'Subject: =?UTF-8?B?!!!?=\r\n\r\nx', 'Subject: =?XX?Q?=ZZ?=\r\n\r\nx',
    'Content-Type: multipart/mixed\r\n\r\n--x\r\n', 'Content-Type: multipart/mixed; boundary=""\r\n\r\n',
    'Content-Transfer-Encoding: base64\r\n\r\n@@@@', 'Content-Transfer-Encoding: quoted-printable\r\n\r\n=\r\n=Z=',
    'Content-Type: text/plain; charset=unbekannt\r\n\r\nx', 'Subject'];
  for (const s of samples) fuzzOk(() => formats.extractEml(enc(s)));
  let seed = 99;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 8;
  for (let n = 0; n < 300; n++) {
    const arr = new Uint8Array(rnd() % 300);
    for (let i = 0; i < arr.length; i++) arr[i] = rnd() & 255;
    fuzzOk(() => formats.extractEml(arr));
  }
  fuzzOk(() => formats.extractEml(new Uint8Array(0)));
});

test('Fuzz: extractRtf mit kaputten Eingaben wirft nie etwas anderes als PSFormatError', () => {
  const samples = ['', '{', '}', '{\\rtf1', '\\', '\\\'', "\\'z", "\\'f", '\\u', '\\u99999999?', '\\uc', '\\uc99999 \\u1?', '{{{{{{{{',
    '}}}}}}}}', '{\\rtf1{\\fonttbl', '{\\*', '{\\rtf1\\ansicpg99999 x}', '{'.repeat(20000), '\\par'.repeat(20000), '{\\rtf1 ' + '{\\b '.repeat(5000)];
  for (const s of samples) fuzzOk(() => formats.extractRtf(s));
  let seed = 4242;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 8;
  const alpha = "{}\\'*uc0123456789abcdefpar tab ?-;";
  for (let n = 0; n < 300; n++) {
    let s = '{\\rtf1';
    for (let i = rnd() % 200; i > 0; i--) s += alpha[rnd() % alpha.length];
    fuzzOk(() => formats.extractRtf(s));
  }
});

test('Fuzz: detect mit beliebigen Bytes und Namen wirft nie', () => {
  let seed = 5;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 8;
  const names = ['', '.', 'a.', '.docx', 'a.b.c.PDF', 'x'.repeat(10000) + '.txt'];
  for (const nm of names) {
    for (let n = 0; n < 20; n++) {
      const arr = new Uint8Array(rnd() % 600);
      for (let i = 0; i < arr.length; i++) arr[i] = rnd() & 255;
      assert.equal(typeof formats.detect(nm, arr), 'string');
    }
  }
});
