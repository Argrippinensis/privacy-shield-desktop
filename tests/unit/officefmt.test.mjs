// B2.m2: PSLib.officefmt (extractXlsx, extractOdf, extractPptx, extractDocxExtras)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib, loadVendor } from './_load.mjs';

const formats = loadLib('formats');
const office = loadLib('officefmt');
const JSZip = loadVendor('jszip');

// ---- Hilfen -------------------------------------------------------------------------------

async function loadZip(files) {
  const z = new JSZip();
  for (const [n, c] of Object.entries(files)) z.file(n, c);
  const bytes = await z.generateAsync({ type: 'uint8array' });
  return JSZip.loadAsync(bytes);
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS_S = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const sheetXml = (rows) => XML + '<worksheet ' + NS_S + '><sheetData>' + rows + '</sheetData></worksheet>';
const sstXml = (items) => XML + '<sst ' + NS_S + '>' + items.map((t) => '<si><t>' + t + '</t></si>').join('') + '</sst>';

async function codeOf(promiseFn) {
  try { await promiseFn(); } catch (e) { return e; }
  return null;
}

// Laedt ein echtes ZIP und ueberschreibt die Kopfgroessen in files[name]._data.
async function loadPatched(files, fn) {
  const zip = await loadZip(files);
  for (const [name, f] of Object.entries(zip.files)) {
    if (f.dir) continue;
    const r = fn(name);
    if (r) {
      f._data.compressedSize = r.comp;
      f._data.uncompressedSize = r.uncomp;
    }
  }
  return zip;
}

const XLSX_BEISPIEL = {
  'xl/sharedStrings.xml': sstXml(['Name', 'Betrag', 'Müller']),
  'xl/worksheets/sheet1.xml': sheetXml(
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>12.5</v></c></row>' +
    '<row r="3"><c r="A3" t="inlineStr"><is><t>Weber</t></is></c><c r="C3"><v>3</v></c></row>'),
};

// ---- Modul-API ----------------------------------------------------------------------------

test('Modul: stellt extractXlsx, extractOdf, extractPptx und extractDocxExtras bereit', () => {
  for (const f of ['extractXlsx', 'extractOdf', 'extractPptx', 'extractDocxExtras']) {
    assert.equal(typeof office[f], 'function', f);
  }
});

// ---- extractXlsx --------------------------------------------------------------------------

test('extractXlsx: Beispiel aus der Spezifikation ergibt genau den erwarteten Text', async () => {
  const r = await office.extractXlsx(await loadZip(XLSX_BEISPIEL));
  assert.equal(r.text, '== Blatt 1 ==\nName\tBetrag\nMüller\t12.5\nWeber\t\t3');
  assert.equal(r.sheets, 1);
});

test('extractXlsx: Blaetter werden numerisch sortiert (sheet2 vor sheet10), Ueberschrift mit laufender Nummer', async () => {
  const zip = await loadZip({
    'xl/worksheets/sheet10.xml': sheetXml('<row r="1"><c r="A1" t="inlineStr"><is><t>zehn</t></is></c></row>'),
    'xl/worksheets/sheet2.xml': sheetXml('<row r="1"><c r="A1" t="inlineStr"><is><t>zwei</t></is></c></row>'),
  });
  const r = await office.extractXlsx(zip);
  assert.equal(r.text, '== Blatt 1 ==\nzwei\n\n== Blatt 2 ==\nzehn');
  assert.equal(r.sheets, 2);
});

test('extractXlsx: Blattbloecke durch Leerzeile getrennt, kein Zeilenumbruch am Ende', async () => {
  const zip = await loadZip({
    'xl/worksheets/sheet1.xml': sheetXml('<row r="1"><c r="A1"><v>1</v></c></row>'),
    'xl/worksheets/sheet2.xml': sheetXml('<row r="1"><c r="A1"><v>2</v></c></row>'),
  });
  const r = await office.extractXlsx(zip);
  assert.ok(r.text.includes('1\n\n== Blatt 2 =='));
  assert.ok(!r.text.endsWith('\n'));
});

test('extractXlsx: fehlende Spalten bleiben leer, nachlaufende Leerspalten entfallen', async () => {
  const zip = await loadZip({
    'xl/worksheets/sheet1.xml': sheetXml('<row r="1"><c r="B1"><v>x</v></c><c r="D1"><v>y</v></c></row>'),
  });
  const r = await office.extractXlsx(zip);
  assert.equal(r.text, '== Blatt 1 ==\n\tx\t\ty');
});

test('extractXlsx: Zellen werden nach Spaltenbuchstaben aus r="..." platziert (AA nach Z)', async () => {
  const zip = await loadZip({
    'xl/worksheets/sheet1.xml': sheetXml('<row r="1"><c r="A1"><v>a</v></c><c r="AA1"><v>b</v></c></row>'),
  });
  const r = await office.extractXlsx(zip);
  const zeile = r.text.split('\n')[1];
  assert.equal(zeile.split('\t').length, 27);
  assert.equal(zeile.split('\t')[26], 'b');
});

test('extractXlsx: zusammengesetzte gemeinsame Zeichenketten (<r><t>) werden verbunden', async () => {
  const zip = await loadZip({
    'xl/sharedStrings.xml': XML + '<sst ' + NS_S + '><si><r><t>Max </t></r><r><t>Muster</t></r></si></sst>',
    'xl/worksheets/sheet1.xml': sheetXml('<row r="1"><c r="A1" t="s"><v>0</v></c></row>'),
  });
  const r = await office.extractXlsx(zip);
  assert.equal(r.text, '== Blatt 1 ==\nMax Muster');
});

test('extractXlsx: Zelltypen str (v), b (TRUE/FALSE) und Zahl unveraendert', async () => {
  const zip = await loadZip({
    'xl/worksheets/sheet1.xml': sheetXml(
      '<row r="1"><c r="A1" t="str"><v>Formelwert</v></c><c r="B1" t="b"><v>1</v></c>' +
      '<c r="C1" t="b"><v>0</v></c><c r="D1"><v>007.50</v></c></row>'),
  });
  const r = await office.extractXlsx(zip);
  assert.equal(r.text, '== Blatt 1 ==\nFormelwert\tTRUE\tFALSE\t007.50');
});

test('extractXlsx: Blattname geht nicht in die Ueberschrift ein', async () => {
  const zip = await loadZip({
    'xl/workbook.xml': XML + '<workbook ' + NS_S + '><sheets><sheet name="Geheim" sheetId="1" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></sheets></workbook>',
    'xl/worksheets/sheet1.xml': sheetXml('<row r="1"><c r="A1"><v>1</v></c></row>'),
  });
  const r = await office.extractXlsx(zip);
  assert.ok(!r.text.includes('Geheim'));
  assert.ok(r.text.startsWith('== Blatt 1 =='));
});

test('extractXlsx: Entitaeten werden dekodiert (&amp; &lt; &#252; &#xFC;)', async () => {
  const zip = await loadZip({
    'xl/worksheets/sheet1.xml': sheetXml('<row r="1"><c r="A1" t="inlineStr"><is><t>A &amp; B &lt;c&gt; M&#252;ller M&#xFC;ller</t></is></c></row>'),
  });
  const r = await office.extractXlsx(zip);
  assert.equal(r.text, '== Blatt 1 ==\nA & B <c> Müller Müller');
});

test('extractXlsx: DOCTYPE mit ENTITY und &a; in einer Zelle wird nie expandiert', async () => {
  const xml = XML + '<!DOCTYPE x [<!ENTITY a "AAAA">]><worksheet ' + NS_S + '><sheetData>' +
    '<row r="1"><c r="A1" t="inlineStr"><is><t>vor &a; nach</t></is></c></row></sheetData></worksheet>';
  const r = await office.extractXlsx(await loadZip({ 'xl/worksheets/sheet1.xml': xml }));
  assert.ok(!r.text.includes('AAAA'), 'Entitaet darf nicht expandiert werden');
  assert.ok(r.text.includes('&a;') || !r.text.includes('vor'), 'entweder unveraendert oder nichts');
});

// ---- extractOdf ---------------------------------------------------------------------------

const ODF_NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" ' +
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"';
const odfContent = (body) => XML + '<office:document-content ' + ODF_NS + '><office:body><office:text>' + body +
  '</office:text></office:body></office:document-content>';

test('extractOdf: Beispiel aus der Spezifikation ergibt genau den erwarteten Text', async () => {
  const body = '<text:h>Titel</text:h><text:p>Hallo<text:s text:c="2"/>Welt<text:line-break/>Neu</text:p>' +
    '<table:table><table:table-row><table:table-cell><text:p>A</text:p></table:table-cell>' +
    '<table:table-cell><text:p>B</text:p></table:table-cell></table:table-row></table:table>';
  const r = await office.extractOdf(await loadZip({ 'content.xml': odfContent(body) }));
  assert.equal(r.text, 'Titel\nHallo  Welt\nNeu\nA\tB');
});

test('extractOdf: text:s ohne Attribut ist ein Leerzeichen, text:tab ein Tabulator, text:span inline', async () => {
  const body = '<text:p>a<text:s/>b<text:tab/>c<text:span text:style-name="T1">d</text:span>e</text:p>';
  const r = await office.extractOdf(await loadZip({ 'content.xml': odfContent(body) }));
  assert.equal(r.text, 'a b\tcde');
});

test('extractOdf: mehrere Absaetze in einer Zelle werden mit Leerzeichen verbunden, Zeilen mit Zeilenumbruch', async () => {
  const body = '<table:table>' +
    '<table:table-row><table:table-cell><text:p>Max</text:p><text:p>Muster</text:p></table:table-cell>' +
    '<table:table-cell><text:p>1</text:p></table:table-cell></table:table-row>' +
    '<table:table-row><table:table-cell><text:p>x</text:p></table:table-cell>' +
    '<table:table-cell><text:p>y</text:p></table:table-cell></table:table-row></table:table>';
  const r = await office.extractOdf(await loadZip({ 'content.xml': odfContent(body) }));
  assert.equal(r.text, 'Max Muster\t1\nx\ty');
});

test('extractOdf: Ausgabe ist getrimmt', async () => {
  const body = '<text:p></text:p><text:p>Text</text:p><text:p></text:p>';
  const r = await office.extractOdf(await loadZip({ 'content.xml': odfContent(body) }));
  assert.equal(r.text, 'Text');
});

test('extractOdf: DOCTYPE mit ENTITY und &a; im Text wird nie expandiert', async () => {
  const xml = XML + '<!DOCTYPE x [<!ENTITY a "AAAA">]><office:document-content ' + ODF_NS +
    '><office:body><office:text><text:p>vor &a; nach</text:p></office:text></office:body></office:document-content>';
  const r = await office.extractOdf(await loadZip({ 'content.xml': xml }));
  assert.ok(!r.text.includes('AAAA'));
  assert.ok(r.text.includes('&a;') || !r.text.includes('vor'));
});

// ---- extractPptx --------------------------------------------------------------------------

const PNS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const slideXml = (paras) => XML + '<p:sld ' + PNS + '><p:cSld><p:spTree><p:sp><p:txBody>' +
  paras.map((t) => '<a:p><a:r><a:t>' + t + '</a:t></a:r></a:p>').join('') +
  '</p:txBody></p:sp></p:spTree></p:cSld></p:sld>';
const notesXml = (paras) => XML + '<p:notes ' + PNS + '><p:cSld><p:spTree><p:sp><p:txBody>' +
  paras.map((t) => '<a:p><a:r><a:t>' + t + '</a:t></a:r></a:p>').join('') +
  '</p:txBody></p:sp></p:spTree></p:cSld></p:notes>';

test('extractPptx: Folien numerisch sortiert (slide2 vor slide10), Notizen mit gleicher Nummer danach', async () => {
  const zip = await loadZip({
    'ppt/slides/slide10.xml': slideXml(['Zehn A', 'Zehn B']),
    'ppt/slides/slide2.xml': slideXml(['Zwei']),
    'ppt/notesSlides/notesSlide2.xml': notesXml(['Notiz zwei']),
  });
  const r = await office.extractPptx(zip);
  assert.equal(r.slides, 2);
  const i1 = r.text.indexOf('== Folie 1 ==');
  const i2 = r.text.indexOf('== Folie 2 ==');
  assert.ok(i1 >= 0 && i2 > i1);
  const folie1 = r.text.slice(i1, i2);
  assert.ok(folie1.includes('Zwei') && !folie1.includes('Zehn'));
  assert.ok(folie1.indexOf('-- Notizen --') > folie1.indexOf('Zwei'));
  assert.ok(folie1.indexOf('Notiz zwei') > folie1.indexOf('-- Notizen --'));
  const folie2 = r.text.slice(i2);
  assert.ok(folie2.includes('Zehn A\nZehn B'), 'Absaetze a:p je eine Zeile');
  assert.ok(!folie2.includes('-- Notizen --') && !folie2.includes('Notiz'));
});

test('extractPptx: genaue Ausgabe einer Folie mit Notiz', async () => {
  const zip = await loadZip({
    'ppt/slides/slide1.xml': slideXml(['Titel', 'Herr M&#252;ller']),
    'ppt/notesSlides/notesSlide1.xml': notesXml(['Sprechtext']),
  });
  const r = await office.extractPptx(zip);
  assert.equal(r.slides, 1);
  assert.equal(r.text, '== Folie 1 ==\nTitel\nHerr Müller\n-- Notizen --\nSprechtext');
});

test('extractPptx: DOCTYPE mit ENTITY und &a; auf einer Folie wird nie expandiert', async () => {
  const xml = XML + '<!DOCTYPE x [<!ENTITY a "AAAA">]><p:sld ' + PNS +
    '><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>vor &a; nach</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>';
  const r = await office.extractPptx(await loadZip({ 'ppt/slides/slide1.xml': xml }));
  assert.ok(!r.text.includes('AAAA'));
  assert.ok(r.text.includes('&a;') || !r.text.includes('vor'));
});

// ---- extractDocxExtras --------------------------------------------------------------------

const WNS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const wp = (t) => '<w:p><w:r><w:t>' + t + '</w:t></w:r></w:p>';
const wdoc = (root, inner) => XML + '<w:' + root + ' ' + WNS + '>' + inner + '</w:' + root + '>';

test('extractDocxExtras: Kopf-, Fuss-, Fussnoten, Endnoten, Kommentare in fester Reihenfolge mit Ueberschriften', async () => {
  const zip = await loadZip({
    'word/comments.xml': wdoc('comments', '<w:comment w:id="0">' + wp('Kommentar Text') + '</w:comment>'),
    'word/endnotes.xml': wdoc('endnotes', '<w:endnote w:id="1">' + wp('Endnote Text') + '</w:endnote>'),
    'word/footnotes.xml': wdoc('footnotes',
      '<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>' +
      '<w:footnote w:id="1">' + wp('Fussnote Text') + '</w:footnote>'),
    'word/footer1.xml': wdoc('ftr', wp('FUSSZEILE Herr Müller')),
    'word/header1.xml': wdoc('hdr', wp('KOPFZEILE max@firma.de')),
  });
  const r = await office.extractDocxExtras(zip);
  assert.equal(r.parts, 5);
  assert.equal(r.text,
    '== Kopfzeile ==\nKOPFZEILE max@firma.de\n\n' +
    '== Fußzeile ==\nFUSSZEILE Herr Müller\n\n' +
    '== Fußnoten ==\nFussnote Text\n\n' +
    '== Endnoten ==\nEndnote Text\n\n' +
    '== Kommentare ==\nKommentar Text');
});

test('extractDocxExtras: nur nicht leere Teile, Trennerfussnoten ohne Text entfallen', async () => {
  const zip = await loadZip({
    'word/header1.xml': wdoc('hdr', '<w:p/>'),
    'word/footnotes.xml': wdoc('footnotes',
      '<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>'),
    'word/footer1.xml': wdoc('ftr', wp('Seite 1')),
  });
  const r = await office.extractDocxExtras(zip);
  assert.equal(r.parts, 1);
  assert.equal(r.text, '== Fußzeile ==\nSeite 1');
});

test('extractDocxExtras: mehrere Kopfzeilen-Dateien gehoeren zu einem Teil, Absaetze je eine Zeile', async () => {
  const zip = await loadZip({
    'word/header1.xml': wdoc('hdr', wp('Kopf eins') + wp('Kopf zwei')),
    'word/header2.xml': wdoc('hdr', wp('Kopf drei')),
  });
  const r = await office.extractDocxExtras(zip);
  assert.equal(r.parts, 1);
  assert.ok(r.text.startsWith('== Kopfzeile ==\n'));
  assert.equal(r.text.split('== Kopfzeile ==').length, 2, 'Ueberschrift nur einmal');
  for (const t of ['Kopf eins', 'Kopf zwei', 'Kopf drei']) assert.ok(r.text.includes(t), t);
  assert.ok(r.text.includes('Kopf eins\nKopf zwei'));
});

test('extractDocxExtras: DOCX ohne Zusatzteile ergibt leeren Text und parts 0', async () => {
  const r = await office.extractDocxExtras(await loadZip({ 'word/document.xml': wdoc('document', '<w:body>' + wp('Haupttext') + '</w:body>') }));
  assert.equal(r.text, '');
  assert.equal(r.parts, 0);
});

test('extractDocxExtras: Haupttext (word/document.xml) wird nicht ausgegeben', async () => {
  const r = await office.extractDocxExtras(await loadZip({
    'word/document.xml': wdoc('document', '<w:body>' + wp('Haupttext') + '</w:body>'),
    'word/header1.xml': wdoc('hdr', wp('Kopf')),
  }));
  assert.ok(!r.text.includes('Haupttext'));
});

test('extractDocxExtras: DOCTYPE mit ENTITY und &a; in der Kopfzeile wird nie expandiert', async () => {
  const xml = XML + '<!DOCTYPE x [<!ENTITY a "AAAA">]><w:hdr ' + WNS + '>' + wp('vor &a; nach') + '</w:hdr>';
  const r = await office.extractDocxExtras(await loadZip({ 'word/header1.xml': xml }));
  assert.ok(!r.text.includes('AAAA'));
  assert.ok(r.text.includes('&a;') || !r.text.includes('vor'));
});

// ---- guard: gefaelschte Archive ------------------------------------------------------------

const MiB = 1048576;
const FALSCH = {
  xlsx: (z) => office.extractXlsx(z),
  odf: (z) => office.extractOdf(z),
  pptx: (z) => office.extractPptx(z),
  docx: (z) => office.extractDocxExtras(z),
};
const ENTRY = {
  xlsx: 'xl/worksheets/sheet1.xml',
  odf: 'content.xml',
  pptx: 'ppt/slides/slide1.xml',
  docx: 'word/header1.xml',
};

for (const art of Object.keys(FALSCH)) {
  test('guard: ' + art + ' mit gefaelschten 50 MiB bei 100 KiB wirft PSFormatError RATIO, ohne zu entpacken (unter 200 ms)', async () => {
    const zip = await loadPatched({ [ENTRY[art]]: '<x>klein</x>' }, () => ({ comp: 100 * 1024, uncomp: 50 * MiB }));
    let entpackt = false;
    for (const f of Object.values(zip.files)) {
      for (const m of ['async', 'nodeStream', 'internalStream']) {
        const orig = f[m];
        if (typeof orig === 'function') f[m] = function () { entpackt = true; return orig.apply(this, arguments); };
      }
    }
    const t0 = Date.now();
    const err = await codeOf(() => FALSCH[art](zip));
    const dt = Date.now() - t0;
    assert.ok(err instanceof formats.PSFormatError, 'PSFormatError erwartet, war: ' + (err && err.name));
    assert.equal(err.code, 'RATIO');
    assert.equal(entpackt, false, 'darf nicht entpacken');
    assert.ok(dt < 200, 'Dauer ' + dt + ' ms');
  });
}

test('guard: xlsx mit gefaelschten 300 MiB wirft TOO_BIG', async () => {
  const zip = await loadPatched({ 'xl/worksheets/sheet1.xml': '<x/>' }, () => ({ comp: 150 * MiB, uncomp: 300 * MiB }));
  const err = await codeOf(() => office.extractXlsx(zip));
  assert.ok(err instanceof formats.PSFormatError);
  assert.equal(err.code, 'TOO_BIG');
});

test('guard: 2.001 Eintraege in einem PPTX werfen TOO_MANY', async () => {
  const files = {};
  for (let i = 0; i < 2001; i++) files['x/f' + i + '.txt'] = 'a';
  const err = await codeOf(async () => office.extractPptx(await loadZip(files)));
  assert.ok(err instanceof formats.PSFormatError);
  assert.equal(err.code, 'TOO_MANY');
});

// ---- Robustheit ---------------------------------------------------------------------------

test('Robustheit: leeres ZIP liefert leere Ergebnisse statt einer Ausnahme', async () => {
  const z = await loadZip({ 'leer.txt': 'x' });
  assert.equal((await office.extractXlsx(z)).sheets, 0);
  assert.equal((await office.extractPptx(z)).slides, 0);
  assert.equal((await office.extractDocxExtras(z)).parts, 0);
  assert.equal(typeof (await office.extractOdf(z)).text, 'string');
});

test('Robustheit: kaputtes XML wirft nur PSFormatError oder liefert ein Ergebnis', async () => {
  const kaputt = ['<a><b', '</x></y>', '<c r="A1"><v>', '&#xZZ;&#99999999999;', '\u0000\u0001<<<>>>', '<![CDATA[ungeschlossen'];
  for (const k of kaputt) {
    const z = await loadZip({
      'xl/worksheets/sheet1.xml': k, 'content.xml': k, 'ppt/slides/slide1.xml': k, 'word/header1.xml': k,
    });
    for (const fn of [office.extractXlsx, office.extractOdf, office.extractPptx, office.extractDocxExtras]) {
      const err = await codeOf(() => fn(z));
      assert.ok(err === null || err instanceof formats.PSFormatError, 'unerwartete Ausnahme: ' + (err && err.message));
    }
  }
});
