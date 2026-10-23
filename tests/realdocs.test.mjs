// C1.r: realistische Formate Ende-zu-Ende. Dieselben Vorlagen wie die Synthetik (generateDocs2), aber als
// DOCX, PDF mit Textebene, TXT und PDF als Bild (OCR), geladen ueber das Auswahlfeld, mit KI-Modell anonymisiert
// und auf Klartextwerte (truth.frags) geprueft. Dokumente entstehen im Test; alle Werte sind erfunden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, setFiles, makePdf } from './helpers.mjs';
import { loadVendor } from './unit/_load.mjs';
import { generateDocs2 } from './eval/generate.mjs';
import { measureDoc, mergeResults, rates, assessImport } from './eval/measure.mjs';

const JSZip = loadVendor('jszip');

// Schwellen (Anteil undichter Werte), fest im Test
const MAX_LEAK_TEXT = 0.02;   // DOCX, PDF mit Textebene, TXT, mit Modell
const MAX_LEAK_OCR = 0.06;    // OCR: Zeichenverwechslung ist kein Erkennungsfehler
const OCR_MIN_FRAG = 5;       // bei OCR werden nur Fragmente ab 5 Zeichen gemessen; kuerzere Werte stehen als unmeasured im Bericht
// Ratsche: heute gemessener Stand (Anzahl undichter Werte), darf nicht steigen. Ziel C1.3 sind die Schwellen oben.
// Q2.fix: Messung verschaerft (Teilreste, Nenner nur importierte Werte); die Staende ki/fb sind mit der neuen Messung
// unveraendert bestaetigt (keine Teilreste gefunden). Nenner OCR: 24 importierte Werte statt 27, 3 verloren, 1 ungemessen.
const RATCHET = {
  TXT: { ki: 2, fb: 0 },
  DOCX: { ki: 2, fb: 0 },
  'PDF-Text': { ki: 3, fb: 1 },
  OCR: { ki: 5, fb: 4 },
};
// Vorbedingung Import (Q2.fix): TXT, DOCX, PDF mit Textebene muessen alle Werte erhalten (assessImport, 100 %);
// bei OCR ist Verlust erlaubt, wird aber als eigene Fehlerklasse 'ocr' ausgewiesen. Die Leckquote hat nur importierte Werte im Nenner.

// Erste 6 Vorlagen mit je 2 Dokumenten = 12 Dokumente (Index 0..5 und 14..19 bei 14 Vorlagen)
const ALL = generateDocs2(98);
const DOCS = ALL.map((d, i) => ({ ...d, idx: i })).filter((d) => d.idx % 14 < 6 && d.idx < 28);
// OCR: die 3 kuerzesten Dokumente (je Seite braucht die OCR Sekunden)
const OCR_DOCS = [...DOCS].sort((a, b) => a.text.length - b.text.length).slice(0, 3);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function makeDocx(text) {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const para = (t) => `<w:p><w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
  const cell = (t) => `<w:tc><w:tcPr><w:tcW w:w="4500" w:type="dxa"/></w:tcPr>${para(t)}</w:tc>`;
  // Zeilen der Form "Bezeichnung: Wert" (Listenwerte) als Tabellenzeile, alles andere als Absatz
  const body = text.split('\n').map((line) => {
    const m = line.match(/^([A-Za-zÄÖÜäöüß .\-\/]{2,28}): (.+)$/);
    if (m) return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="4500"/><w:gridCol w:w="4500"/></w:tblGrid><w:tr>${cell(m[1] + ':')}${cell(m[2])}</w:tr></w:tbl>`;
    return para(line);
  }).join('');
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr/></w:body></w:document>`);
  return Buffer.from(await z.generateAsync({ type: 'uint8array' }));
}

const textPdf = async (app, text) => Buffer.from(await makePdf(app, `<body style="font:12px Arial;margin:0"><div style="white-space:pre-wrap;width:700px">${esc(text)}</div>`), 'base64');

function wrapLines(text, max = 62) {
  const out = [];
  for (const line of text.split('\n')) {
    let rest = line;
    while (rest.length > max) {
      let cut = rest.lastIndexOf(' ', max);
      if (cut < 20) cut = max;
      out.push(rest.slice(0, cut)); rest = rest.slice(cut).trimStart();
    }
    out.push(rest);
  }
  return out;
}

// Text auf ein Canvas zeichnen, als PNG in ein PDF drucken (nur Pixel, keine Textebene)
async function imagePdf(a, f, text) {
  const lines = wrapLines(text);
  assert.ok(lines.length <= 38, 'Dokument zu lang fuer eine Seite: ' + lines.length + ' Zeilen');
  const png = await f.evaluate((ls) => {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 40 + ls.length * 34;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000'; g.font = '26px Arial';
    ls.forEach((l, i) => g.fillText(l, 30, 50 + i * 34));
    return c.toDataURL('image/png');
  }, lines);
  return Buffer.from(await makePdf(a.app, `<body style="margin:0"><img src="${png}" style="width:210mm">`), 'base64');
}

async function prepare() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await a.win.waitForTimeout(800);
  return { a, f };
}

async function modelOn(f) {
  await f.evaluate(async () => { setAIMode('auto'); await loadAIModel(); if (typeof AI_IDLE_MS !== 'undefined') AI_IDLE_MS = 3600000; });
  assert.equal(await f.evaluate(() => !!nerPipeline), true, 'KI-Modell nicht geladen');
}

// Datei ueber das Auswahlfeld laden; liefert den importierten Text
async function load(f, file, timeout = 180000) {
  await f.evaluate(() => { document.getElementById('IT').value = ''; });
  await setFiles(f, [file]);
  await f.waitForFunction(() => document.getElementById('IT').value.length > 0, null, { timeout });
  return f.evaluate(() => document.getElementById('IT').value);
}

const anonymize = (f) => f.evaluate(async () => {
  aiCache = { key: null, spans: [] };
  await anon();
  return document.getElementById('AT').value;
});

// Misst alle Dokumente eines Formats: mit Modell und im Modus fallback. Liefert die Zahlen (nie Klartextwerte).
async function measure(label, f, docs, build, { minFrag = 0, timeout } = {}) {
  await modelOn(f);
  const inputs = [], kiList = [];
  for (const d of docs) {
    const file = await build(d);
    const input = await load(f, file, timeout);
    inputs.push(input);
    const out = await anonymize(f);
    assert.ok(/\{\{[A-Z_0-9.]+\}\}/.test(out), `${label}: Dokument ${d.idx} ohne Platzhalter`);
    const r = measureDoc(d, out, { input, minFrag });
    kiList.push({ ...r, hits: r.hits.map((h) => ({ ...h, doc: d.idx })) });
  }
  // Modus fallback (W1): ohne Modell, Regeln plus Wortlisten
  await f.evaluate(() => { setAIMode('off'); localAIMode = true; });
  const fbList = [];
  for (let i = 0; i < docs.length; i++) {
    await f.evaluate((t) => { document.getElementById('IT').value = t; }, inputs[i]);
    fbList.push(measureDoc(docs[i], await anonymize(f), { input: inputs[i], minFrag }));
  }
  return { label, ki: mergeResults(kiList), fb: mergeResults(fbList) };
}

const hitList = (m) => m.hits.map((h) => `${h.doc}:${h.type}:${h.kind}`).join(' ');
const pct = (x) => (100 * x).toFixed(1) + ' %';

// Pro Format einmal messen; Ratschen- und Zieltest teilen das Ergebnis
const cache = new Map();
function measured(key, run) {
  if (!cache.has(key)) cache.set(key, run());
  return cache.get(key);
}
async function inApp(fn) {
  const { a, f } = await prepare();
  try { return await fn(a, f); } finally { await a.close(); }
}
const FORMATS = {
  TXT: { title: 'TXT (UTF-8)', max: MAX_LEAK_TEXT, run: () => inApp((a, f) => measure('TXT', f, DOCS, (d) => ({ name: `doc${d.idx}.txt`, mimeType: 'text/plain', buffer: Buffer.from(d.text, 'utf8') }))) },
  DOCX: { title: 'DOCX (Absaetze und Tabellenzeilen)', max: MAX_LEAK_TEXT, run: () => inApp((a, f) => measure('DOCX', f, DOCS, async (d) => ({ name: `doc${d.idx}.docx`, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await makeDocx(d.text) }))) },
  'PDF-Text': { title: 'PDF mit Textebene', max: MAX_LEAK_TEXT, run: () => inApp((a, f) => measure('PDF-Text', f, DOCS, async (d) => ({ name: `doc${d.idx}.pdf`, mimeType: 'application/pdf', buffer: await textPdf(a.app, d.text) }))) },
  OCR: { title: 'PDF als Bild (OCR)', max: MAX_LEAK_OCR, run: () => inApp((a, f) => measure('OCR', f, OCR_DOCS, async (d) => ({ name: `scan${d.idx}.pdf`, mimeType: 'application/pdf', buffer: await imagePdf(a, f, d.text) }), { minFrag: OCR_MIN_FRAG, timeout: 300000 })) },
};

test('Testdokumente: 12 Dokumente aus den ersten 6 Vorlagen, 3 davon fuer die OCR', () => {
  assert.equal(DOCS.length, 12);
  assert.equal(new Set(DOCS.map((d) => d.template)).size, 6);
  assert.equal(OCR_DOCS.length, 3);
});

for (const [key, F] of Object.entries(FORMATS)) {
  test(`${F.title}: Ratsche, Lecks mit Modell hoechstens ${RATCHET[key].ki}, fallback hoechstens ${RATCHET[key].fb}, Import funktioniert`, { timeout: 900000 }, async () => {
    const r = await measured(key, F.run);
    const q = rates(r.ki), qf = rates(r.fb);
    // Bericht: Dokumentnummer, Typ und Art, nie der Klartextwert; Import- und Leckquote getrennt
    console.log(`  ${key}: mit Modell ${r.ki.leaked}/${r.ki.imported} (${pct(q.leakRate)}) [${hitList(r.ki)}]; fallback ${r.fb.leaked}/${r.fb.imported} (${pct(qf.leakRate)}); Import ${r.ki.imported}/${r.ki.imported + r.ki.lost} (${pct(q.importRate)}), verloren ${r.ki.lost}, OCR-veraendert in Ausgabe ${r.ki.ocrChanged}, ungemessen ${r.ki.unmeasured}`);
    const imp = assessImport(key, r.ki);
    assert.ok(imp.ok, `${key}: ${r.ki.lost} von ${r.ki.imported + r.ki.lost} Werten ueberstehen den Import nicht (Fehlerklasse ${imp.errorClass})`);
    assert.ok(r.ki.leaked <= RATCHET[key].ki, `${key}: ${r.ki.leaked} Lecks mit Modell, Stand ${RATCHET[key].ki}: ${hitList(r.ki)}`);
    assert.ok(r.fb.leaked <= RATCHET[key].fb, `${key}: ${r.fb.leaked} Lecks im Modus fallback, Stand ${RATCHET[key].fb}`);
  });

  test(`${F.title}: Ziel hoechstens ${F.max * 100} % undichte Werte mit Modell`, { timeout: 900000, todo: 'Ziel C1.3: hoechstens 2 % (OCR 6 %)' }, async () => {
    const r = await measured(key, F.run);
    const q = rates(r.ki);
    assert.ok(q.leakRate <= F.max, `${key}: ${r.ki.leaked}/${r.ki.imported} undicht, erlaubt ${F.max * 100} %: ${hitList(r.ki)}`);
  });
}
