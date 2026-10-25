// F4.a, Fuzz-Tests (V2-F, Abschnitt F4.a, Aufgabe 2): Kern PSDetect mit Zufallseingaben und Formate (B2) mit
// kaputten Archiven und zufaelligen Eingaben fuer extractEml, extractHtml und extractRtf.
// Ausnahme von der 5-Sekunden-Regel: bis 60 s je Datei erlaubt (Spezifikation F4.a). Begruendung: gesamt mehr als
// 1.000 Kerneingaben (je Erzeuger 200 Eingaben mit 10 bis 3.000 Zeichen und 3 mit 100.000 Zeichen) und 3.000 Formateingaben.
// Alle Zufallsstroeme sind mit mulberry32 und festem Seed 20261021 bestimmt: gleicher Lauf = gleiche Eingaben.
// Bei Fehlschlag nennt die Meldung Seed, Erzeuger (Profil) und Eingabenummer samt Laenge und Anfang der Eingabe.
// Rote Faelle sind echte Befunde und werden nicht abgeschwaecht.
import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { loadLib, loadVendor } from './_load.mjs';
import { buildZip } from './_zipfake.mjs';

const T_START = performance.now();
const D = loadLib('detect');
const F = loadLib('formats');
const R = loadLib('reader');
const JSZip = loadVendor('jszip');
const mammoth = loadVendor('mammoth');

const SEED = 20261021;
const GRENZE_MS = 2000;        // Zeit je Eingabe
const RSS_GRENZE = 300 * 1048576;
const BUDGET_MS = 60000;       // Zeitbudget der Datei
const KURZ = 200;              // Eingaben je Erzeuger mit 10 bis 3.000 Zeichen
const LANG = 3;                // Eingaben je Erzeuger mit 100.000 Zeichen
const FORMAT_N = 1000;         // Eingaben je Format (eml, html, rtf)
const ZIP_N = 300;             // kaputte Archive

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Jeder Strom bekommt einen eigenen, aus dem Seed abgeleiteten Zaehler: Reihenfolge der Tests aendert keine Eingabe.
const strom = (n) => mulberry32((SEED + n * 7919) >>> 0);
const ganz = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const kurz = (s) => JSON.stringify(String(s).length > 80 ? String(s).slice(0, 80) + '...' : String(s));

// ---- Erzeuger des Kerns --------------------------------------------------------------------
const EMOJI = String.fromCodePoint(0x1F600);           // nie als Zeichen im Quelltext
const ASTRAL_A = String.fromCodePoint(0x1D49C);        // mathematisches Schreib-A
const IBAN = 'DE89 3704 0044 0532 0130 00';
const VORRAT = ['Herr ', 'Müller', ' ', ' ', '\n', '\t', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '@', IBAN, '{{', '}}',
  EMOJI, ASTRAL_A, 'ä', ' GmbH', ', ', '​', '­', '\u0000'];

const ERZEUGER = {
  bmp(rnd, n) { // U+0000 bis U+FFFF ohne Surrogate (U+D800 bis U+DFFF)
    const out = [];
    for (let i = 0; i < n; i++) { let c = ganz(rnd, 0, 0xFFFF - 0x800); if (c >= 0xD800) c += 0x800; out.push(String.fromCharCode(c)); }
    return out.join('');
  },
  astral(rnd, n) { // ab U+10000 (n Zeichen, je zwei UTF-16-Einheiten)
    const out = [];
    for (let i = 0; i < n; i++) out.push(String.fromCodePoint(ganz(rnd, 0x10000, 0x10FFFF)));
    return out.join('');
  },
  mixed(rnd, n) { // Folge aus dem Vorrat bis mindestens n Zeichen (nie mitten in einem Surrogatpaar abgeschnitten)
    const out = [];
    let len = 0;
    while (len < n) { const s = VORRAT[Math.floor(rnd() * VORRAT.length)]; out.push(s); len += s.length; }
    return out.join('');
  },
  ctrl(rnd, n) { // U+0000 bis U+001F
    const out = [];
    for (let i = 0; i < n; i++) out.push(String.fromCharCode(ganz(rnd, 0, 0x1F)));
    return out.join('');
  },
  lonely(rnd, n) { // einzelne Surrogate, hoch und tief gemischt (U+D800 bis U+DFFF)
    const out = [];
    for (let i = 0; i < n; i++) out.push(String.fromCharCode(ganz(rnd, 0xD800, 0xDFFF)));
    return out.join('');
  },
};
const WOHLGEFORMT_PFLICHT = { bmp: true, astral: true, mixed: true, ctrl: true, lonely: false };

const rssVorher = [];
const rssNachher = [];

let erzeugerNr = 0;
for (const [name, gen] of Object.entries(ERZEUGER)) {
  const nr = ++erzeugerNr;
  test(`Fuzz Kern, Erzeuger ${name}: ${KURZ} Eingaben mit 10 bis 3.000 Zeichen und ${LANG} mit 100.000 Zeichen ohne Ausnahme, unter ${GRENZE_MS} ms, Rueckweg gleich${WOHLGEFORMT_PFLICHT[name] ? ', Ausgabe wohlgeformt' : ''}`, () => {
    const rnd = strom(nr);
    const laengen = [];
    for (let i = 0; i < KURZ; i++) laengen.push(ganz(rnd, 10, 3000));
    for (let i = 0; i < LANG; i++) laengen.push(100000);
    const fehler = [];
    let maxMs = 0;
    laengen.forEach((n, i) => {
      const x = gen(rnd, n);
      const wo = `Seed ${SEED}, Erzeuger ${name}, Eingabe ${i} (${x.length} Zeichen, Anfang ${kurz(x)})`;
      try {
        const t0 = performance.now();
        const r = D.anonymize(x, { wordlists: true });
        const ms = performance.now() - t0;
        if (ms > maxMs) maxMs = ms;
        if (ms >= GRENZE_MS) fehler.push(`${wo}: ${Math.round(ms)} ms, Grenze ${GRENZE_MS} ms`);
        if (typeof r.text !== 'string') fehler.push(`${wo}: Ausgabe ist kein String`);
        else {
          if (WOHLGEFORMT_PFLICHT[name] && !r.text.isWellFormed()) fehler.push(`${wo}: Ausgabe nicht wohlgeformt (isWellFormed)`);
          if (D.deanonymize(r.text, r.state) !== x) fehler.push(`${wo}: Rueckweg ergibt nicht die Eingabe`);
        }
      } catch (e) {
        fehler.push(`${wo}: Ausnahme ${e && e.name}: ${e && e.message}`);
      }
    });
    assert.equal(fehler.length, 0, `${fehler.length} von ${laengen.length} Eingaben fehlgeschlagen (groesste Zeit ${Math.round(maxMs)} ms):\n` + fehler.slice(0, 10).join('\n'));
  });
}

test('Fuzz Kern: Eingaben sind bestimmt (gleicher Seed ergibt dieselbe Eingabe) und enthalten die geforderten Zeichenklassen', () => {
  for (const [name, gen] of Object.entries(ERZEUGER)) {
    assert.equal(gen(mulberry32(1), 200), gen(mulberry32(1), 200), `${name} ist nicht bestimmt`);
  }
  const r = mulberry32(5);
  assert.ok(/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(ERZEUGER.astral(r, 20)), 'astral erzeugt Surrogatpaare');
  assert.ok(ERZEUGER.bmp(r, 2000).isWellFormed(), 'bmp enthaelt keine Surrogate');
  assert.ok(!ERZEUGER.lonely(r, 50).isWellFormed(), 'lonely ist nicht wohlgeformt');
  assert.ok(/^[\u0000-\u001F]+$/.test(ERZEUGER.ctrl(r, 100)), 'ctrl nur Steuerzeichen');
  const m = ERZEUGER.mixed(r, 5000);
  for (const teil of ['Herr ', 'Müller', IBAN, '{{', '}}', EMOJI, ASTRAL_A, 'ä', ' GmbH', '​', '­', '\u0000']) assert.ok(m.includes(teil), `mixed enthaelt ${kurz(teil)}`);
});

// ---- Formate (B2) --------------------------------------------------------------------------

const enc = (s) => new TextEncoder().encode(s);

function zufallsBytes(rnd, n) { const b = new Uint8Array(n); for (let i = 0; i < n; i++) b[i] = Math.floor(rnd() * 256); return b; }
function zufallsText(rnd, n, vorrat) {
  const out = [];
  let len = 0;
  while (len < n) { const s = vorrat[Math.floor(rnd() * vorrat.length)]; out.push(s); len += s.length; }
  return out.join('');
}

// Eingaben je Format: mal reine Zufallsbytes/-zeichen, mal Folge aus formtypischen Bausteinen, mal Mischung
const HTML_TEIL = ['<p>', '</p>', '<div>', '</div>', '<br>', '<br/>', '<b>', '</b>', '<script>', '</script>', '<style>', '</style>', '<!--', '-->', '<!', '<', '>', '&amp;', '&nbsp;', '&#252;', '&#x1F600;', '&#xFFFFFFFF;', '&#0;', '&', ';', '=', '"', "'", ' a="b"', 'Text ', 'Müller', '\n', '<![CDATA[', ']]>', '<?', '?>', '<table><tr><td>', '</td></tr></table>', '<li>', '<a href="x">', '</a>', EMOJI];
const RTF_TEIL = ['{\\rtf1\\ansi', '{', '}', '\\par ', '\\b ', '\\b0 ', "\\'e4", "\\'", '\\u228?', '\\u-3?', '\\u55357?', '\\u', '\\uc0', '\\uc2 ', '\\*\\foo ', '{\\*\\generator x}', '{\\fonttbl{\\f0 Arial;}}', '{\\colortbl;}', '\\pict ', '\\bin5 abcde', '\\bin99999999 ', '\\\\', '\\{', '\\}', '\\~', '\\_', '\\-', '\\tab ', 'Text ', 'Müller', '\n', '\r', '\\ansicpg1252', '\\fs24', '\\', '\\0', '\\-12 '];
const EML_TEIL = ['From: a@b.de\r\n', 'To: c@d.de\r\n', 'Subject: =?UTF-8?B?w6Q=?=\r\n', 'Subject: =?ISO-8859-1?Q?M=FCller?=\r\n', '=?', '?=', '?Q?', '?B?', 'Content-Type: multipart/mixed; boundary="X"\r\n', 'Content-Type: text/plain; charset=utf-8\r\n', 'Content-Type: text/html\r\n', 'Content-Type: message/rfc822\r\n', 'Content-Transfer-Encoding: base64\r\n', 'Content-Transfer-Encoding: quoted-printable\r\n', 'Content-Disposition: attachment; filename="a.txt"\r\n', '\r\n', '\n', '--X\r\n', '--X--\r\n', 'boundary=', 'SGFsbG8gV2VsdA==', '=C3=A4', '=\r\n', '=ZZ', '=', 'Text ', 'Müller', '<p>x</p>', ' ', '\t', ': ', 'X-Foo: bar\r\n baz\r\n'];

const FORMATE = {
  eml: { fn: (x) => F.extractEml(x), bauen(rnd, i) {
    const n = ganz(rnd, 0, 2000);
    const m = i % 3;
    if (m === 0) return zufallsBytes(rnd, n);
    if (m === 1) return enc(zufallsText(rnd, n, EML_TEIL));
    const k = ganz(rnd, 0, n); return Uint8Array.from([...enc(zufallsText(rnd, k, EML_TEIL)), ...zufallsBytes(rnd, n - k)]);
  } },
  html: { fn: (x) => F.extractHtml(x), bauen(rnd, i) {
    const n = ganz(rnd, 0, 2000);
    const m = i % 3;
    if (m === 0) return ERZEUGER.bmp(rnd, n);
    if (m === 1) return zufallsText(rnd, n, HTML_TEIL);
    return zufallsText(rnd, n, HTML_TEIL) + ERZEUGER.lonely(rnd, ganz(rnd, 0, 40)) + ERZEUGER.mixed(rnd, ganz(rnd, 0, n));
  } },
  rtf: { fn: (x) => F.extractRtf(x), bauen(rnd, i) {
    const n = ganz(rnd, 0, 2000);
    const m = i % 3;
    if (m === 0) return ERZEUGER.bmp(rnd, n);
    if (m === 1) return zufallsText(rnd, n, RTF_TEIL);
    return zufallsText(rnd, n, RTF_TEIL) + ERZEUGER.lonely(rnd, ganz(rnd, 0, 40)) + ERZEUGER.mixed(rnd, ganz(rnd, 0, n));
  } },
};

let formatNr = 10;
for (const [name, fm] of Object.entries(FORMATE)) {
  const nr = ++formatNr;
  test(`Fuzz Format ${name}: ${FORMAT_N} Zufallseingaben ohne andere Ausnahme als PSFormatError, je Eingabe unter ${GRENZE_MS} ms`, () => {
    const rnd = strom(nr);
    const fehler = [];
    let maxMs = 0, ok = 0, fe = 0;
    rssVorher.push(process.memoryUsage().rss);
    for (let i = 0; i < FORMAT_N; i++) {
      const x = fm.bauen(rnd, i);
      const wo = `Seed ${SEED}, Format ${name}, Eingabe ${i} (${x.length} Einheiten, Anfang ${kurz(typeof x === 'string' ? x : Buffer.from(x.subarray(0, 40)).toString('latin1'))})`;
      const t0 = performance.now();
      try {
        const r = fm.fn(x);
        if (!r || typeof r.text !== 'string') fehler.push(`${wo}: Ergebnis ohne text`);
        else ok++;
      } catch (e) {
        if (e instanceof F.PSFormatError) fe++;
        else fehler.push(`${wo}: Ausnahme ${e && e.name}: ${e && e.message} (erlaubt ist nur PSFormatError)`);
      }
      const ms = performance.now() - t0;
      if (ms > maxMs) maxMs = ms;
      if (ms >= GRENZE_MS) fehler.push(`${wo}: ${Math.round(ms)} ms, Grenze ${GRENZE_MS} ms`);
    }
    rssNachher.push(process.memoryUsage().rss);
    assert.equal(fehler.length, 0, `${fehler.length} von ${FORMAT_N} Eingaben fehlgeschlagen (ok ${ok}, PSFormatError ${fe}, groesste Zeit ${Math.round(maxMs)} ms):\n` + fehler.slice(0, 10).join('\n'));
  });
}

// Falsch typisierte Eingaben (die Anwendung reicht Bytes oder Text hinein; ein Fehler in der Vorstufe darf nie roh durchschlagen)
test('Fuzz Format: falsch typisierte Eingaben fuer extractEml, extractHtml, extractRtf ergeben ein Ergebnis oder PSFormatError', () => {
  const werte = [null, undefined, 0, 42, NaN, true, {}, [], [1, 2, 3], '', 'abc', { length: 5 }, { length: -1 }, new Uint8Array(0), new ArrayBuffer(8), Buffer.from('From: a@b.de\r\n\r\nx'), () => 1, Symbol.iterator];
  const fehler = [];
  for (const [name, fn] of [['extractEml', F.extractEml], ['extractHtml', F.extractHtml], ['extractRtf', F.extractRtf]]) {
    werte.forEach((x, i) => {
      try {
        const r = fn(x);
        if (!r || typeof r.text !== 'string') fehler.push(`${name}, Wert ${i} (${typeof x}): Ergebnis ohne text`);
      } catch (e) {
        if (!(e instanceof F.PSFormatError)) fehler.push(`${name}, Wert ${i} (${typeof x}): Ausnahme ${e && e.name}: ${e && e.message} (erlaubt ist nur PSFormatError)`);
      }
    });
  }
  assert.equal(fehler.length, 0, fehler.join('\n'));
});

// Kaputte Archive: abgeschnitten, Muell mit ZIP-Kopf, leer, gefaelschte Groessen, Bitfehler.
// Pruefung auf zwei Wegen: (a) reader.readText (Ausnahmen nur PSReadError mit festem Code, nie Dateiinhalt) und
// (b) JSZip.loadAsync + formats.guard + boundedRead (Ausnahmen nur PSFormatError; JSZip darf das Laden ablehnen).
const ZIP_ARTEN = ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'];
const OFFICE_DATEIEN = {
  docx: { '[Content_Types].xml': '<Types/>', 'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>Herr Müller</w:t></w:r></w:p></w:body></w:document>' },
  xlsx: { '[Content_Types].xml': '<Types/>', 'xl/sharedStrings.xml': '<sst><si><t>Müller</t></si></sst>', 'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>' },
  pptx: { '[Content_Types].xml': '<Types/>', 'ppt/slides/slide1.xml': '<p:sld><a:p><a:r><a:t>Herr Müller</a:t></a:r></a:p></p:sld>' },
  odt: { mimetype: 'application/vnd.oasis.opendocument.text', 'content.xml': '<office:document-content><text:p>Herr Müller</text:p></office:document-content>' },
};
OFFICE_DATEIEN.ods = { mimetype: 'application/vnd.oasis.opendocument.spreadsheet', 'content.xml': '<office:document-content><table:table><table:table-row><table:table-cell><text:p>Müller</text:p></table:table-cell></table:table-row></table:table></office:document-content>' };
OFFICE_DATEIEN.odp = { mimetype: 'application/vnd.oasis.opendocument.presentation', 'content.xml': '<office:document-content><draw:page><text:p>Müller</text:p></draw:page></office:document-content>' };

async function gueltigesZip(art) {
  const z = new JSZip();
  for (const [n, c] of Object.entries(OFFICE_DATEIEN[art])) z.file(n, c);
  return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

// Zentralverzeichnis: Groessen (+20 komprimiert, +24 unkomprimiert) auf Zufallswerte setzen
function faelscheGroessen(bytes, rnd) {
  const b = Uint8Array.from(bytes);
  const dv = new DataView(b.buffer);
  const werte = [0, 1, 0xFFFFFFFF, 0x7FFFFFFF, 0x10000000, ganz(rnd, 0, 0xFFFFFFFF)];
  for (let i = 0; i + 46 <= b.length; i++) {
    if (dv.getUint32(i, true) !== 0x02014b50) continue;
    dv.setUint32(i + 20, werte[Math.floor(rnd() * werte.length)], true);
    dv.setUint32(i + 24, werte[Math.floor(rnd() * werte.length)], true);
  }
  return b;
}

async function kaputtesZip(rnd, i, basis) {
  const art = ZIP_ARTEN[i % ZIP_ARTEN.length];
  const gut = basis[art];
  switch (Math.floor(i / ZIP_ARTEN.length) % 6) {
    case 0: return { art, x: gut.subarray(0, ganz(rnd, 0, gut.length - 1)), was: 'abgeschnitten' };
    case 1: return { art, x: Uint8Array.from([0x50, 0x4B, 0x03, 0x04, ...zufallsBytes(rnd, ganz(rnd, 0, 500))]), was: 'Muell mit ZIP-Kopf' };
    case 2: return { art, x: new Uint8Array(ganz(rnd, 0, 3)), was: 'leer oder fast leer' };
    case 3: return { art, x: faelscheGroessen(gut, rnd), was: 'gefaelschte Groessen im Zentralverzeichnis' };
    case 4: { const b = Uint8Array.from(gut); for (let k = ganz(rnd, 1, 8); k > 0; k--) b[Math.floor(rnd() * b.length)] = Math.floor(rnd() * 256); return { art, x: b, was: 'Bitfehler' }; }
    default: {
      // von Hand gebautes Archiv mit luegender Groesse (nur wenige KiB gross)
      const declared = [0, 1, 0xFFFFFFFF, 100 * 1048576][ganz(rnd, 0, 3)];
      return { art, x: buildZip([{ name: 'content.xml', content: '<a>' + 'x'.repeat(ganz(rnd, 0, 200)) + '</a>', declared }, { name: 'word/document.xml', content: 'kein xml', declared }]), was: 'gebaut mit gefaelschter Groesse' };
    }
  }
}

test(`Fuzz Format ZIP: ${ZIP_N} kaputte Archive (abgeschnitten, Muell, leer, gefaelschte Groessen, Bitfehler) ohne andere Ausnahme als PSReadError beziehungsweise PSFormatError, je Eingabe unter ${GRENZE_MS} ms`, async () => {
  const basis = {};
  for (const a of ZIP_ARTEN) basis[a] = await gueltigesZip(a);
  const reader = R.create({ JSZip, mammoth });
  const rnd = strom(20);
  const fehler = [];
  let maxMs = 0;
  rssVorher.push(process.memoryUsage().rss);
  for (let i = 0; i < ZIP_N; i++) {
    const { art, x, was } = await kaputtesZip(rnd, i, basis);
    const wo = `Seed ${SEED}, Format zip/${art}, Eingabe ${i} (${was}, ${x.length} Bytes)`;
    const t0 = performance.now();
    // (a) Leseweg der Anwendung
    try {
      const t = await reader.readText('datei.' + art, x);
      if (typeof t !== 'string') fehler.push(`${wo}: readText lieferte keinen String`);
    } catch (e) {
      if (!(e instanceof R.PSReadError)) fehler.push(`${wo}: readText warf ${e && e.name}: ${e && e.message} (erlaubt ist nur PSReadError)`);
      else if (/Mueller|Müller/.test(e.message)) fehler.push(`${wo}: Fehlertext enthaelt Dateiinhalt`);
    }
    // (b) Bausteine einzeln
    try {
      F.guard(R.zipDirOf(x));
      const zip = await JSZip.loadAsync(x).catch(() => null);
      if (zip) {
        F.guard(zip);
        const bud = { used: 0, max: F.MAX_TOTAL };
        for (const nm of Object.keys(zip.files)) if (!zip.files[nm].dir) await F.boundedRead(zip, nm, { budget: bud, as: 'count' });
      }
    } catch (e) {
      if (!(e instanceof F.PSFormatError)) fehler.push(`${wo}: guard/boundedRead warf ${e && e.name}: ${e && e.message} (erlaubt ist nur PSFormatError)`);
    }
    const ms = performance.now() - t0;
    if (ms > maxMs) maxMs = ms;
    if (ms >= GRENZE_MS) fehler.push(`${wo}: ${Math.round(ms)} ms, Grenze ${GRENZE_MS} ms`);
  }
  rssNachher.push(process.memoryUsage().rss);
  assert.equal(fehler.length, 0, `${fehler.length} von ${ZIP_N} Archiven fehlgeschlagen (groesste Zeit ${Math.round(maxMs)} ms):\n` + fehler.slice(0, 10).join('\n'));
});

test('Fuzz Format: Speicherzuwachs (RSS) ueber alle Formattests unter 300 MB', () => {
  assert.ok(rssVorher.length >= 4 && rssNachher.length === rssVorher.length, 'Messpunkte fehlen');
  const zuwachs = Math.max(...rssNachher) - Math.min(...rssVorher);
  assert.ok(zuwachs < RSS_GRENZE, `RSS-Zuwachs ${Math.round(zuwachs / 1048576)} MB, Grenze 300 MB`);
});

test(`Zeitbudget der Datei: unter ${BUDGET_MS / 1000} s`, () => {
  const ms = performance.now() - T_START;
  assert.ok(ms < BUDGET_MS, `${Math.round(ms)} ms, Budget ${BUDGET_MS} ms`);
});
