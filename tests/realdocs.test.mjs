// C1.r: realistische Formate Ende-zu-Ende. Dieselben Vorlagen wie die Synthetik (generateDocs2), aber als
// DOCX, PDF mit Textebene, TXT und PDF als Bild (OCR), geladen ueber das Auswahlfeld, mit KI-Modell anonymisiert
// und auf Klartextwerte (truth.frags) geprueft. Dokumente entstehen im Test; alle Werte sind erfunden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, setFiles, makePdf } from './helpers.mjs';
import { loadVendor } from './unit/_load.mjs';
import { generateDocs2 } from './eval/generate.mjs';

const JSZip = loadVendor('jszip');

// Schwellen (Anteil undichter Werte), fest im Test
const MAX_LEAK_TEXT = 0.02;   // DOCX, PDF mit Textebene, TXT, mit Modell
const MAX_LEAK_OCR = 0.06;    // OCR: Zeichenverwechslung ist kein Erkennungsfehler
const OCR_MIN_FRAG = 5;       // bei OCR zaehlen nur Fragmente ab 5 Zeichen
// Ratsche: heute gemessener Stand (Anzahl undichter Werte), darf nicht steigen. Ziel C1.3 sind die Schwellen oben.
const RATCHET = {
  TXT: { ki: 3, fb: 8 },
  DOCX: { ki: 3, fb: 8 },
  'PDF-Text': { ki: 4, fb: 9 },
  OCR: { ki: 5, fb: 6 },
};
const MIN_EXTRACTED = 0.9;    // Vorbedingung: mindestens so viele Werte muessen den Import ueberstehen

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

function leaks(doc, out, minFrag = 0) {
  let total = 0, leaked = 0; const hits = [];
  for (const t of doc.truth) {
    const frags = t.frags.filter((x) => x.length >= minFrag);
    if (!frags.length) continue;
    total++;
    const hit = frags.find((x) => out.includes(x));
    if (hit) { leaked++; hits.push(t.type); }
  }
  return { total, leaked, hits };
}

// Misst alle Dokumente eines Formats: mit Modell und im Modus fallback. Liefert die Zahlen (nie Klartextwerte).
async function measure(label, f, docs, build, { minFrag = 0, timeout } = {}) {
  await modelOn(f);
  const inputs = [], ki = { total: 0, leaked: 0, hits: [] }; let present = 0, presentTotal = 0;
  for (const d of docs) {
    const file = await build(d);
    const input = await load(f, file, timeout);
    inputs.push(input);
    const out = await anonymize(f);
    assert.ok(/\{\{[A-Z_0-9.]+\}\}/.test(out), `${label}: Dokument ${d.idx} ohne Platzhalter`);
    for (const t of d.truth) { const fr = t.frags.filter((x) => x.length >= minFrag); if (fr.length) { presentTotal++; if (fr.some((x) => input.includes(x))) present++; } }
    const r = leaks(d, out, minFrag);
    ki.total += r.total; ki.leaked += r.leaked; ki.hits.push(...r.hits.map((h) => d.idx + ':' + h));
  }
  // Modus fallback (W1): ohne Modell, Regeln plus Wortlisten
  await f.evaluate(() => { setAIMode('off'); localAIMode = true; });
  const fb = { total: 0, leaked: 0 };
  for (let i = 0; i < docs.length; i++) {
    await f.evaluate((t) => { document.getElementById('IT').value = t; }, inputs[i]);
    const r = leaks(docs[i], await anonymize(f), minFrag);
    fb.total += r.total; fb.leaked += r.leaked;
  }
  return { label, ki, fb, present, presentTotal };
}

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
    // Bericht: Dokumentnummer und Typ, nie der Klartextwert
    console.log(`  ${key}: mit Modell ${r.ki.leaked}/${r.ki.total} (${(100 * r.ki.leaked / r.ki.total).toFixed(1)} %) [${r.ki.hits.join(' ')}]; fallback ${r.fb.leaked}/${r.fb.total} (${(100 * r.fb.leaked / r.fb.total).toFixed(1)} %)`);
    assert.ok(r.present / r.presentTotal >= MIN_EXTRACTED, `${key}: nur ${r.present}/${r.presentTotal} Werte ueberstehen den Import`);
    assert.ok(r.ki.leaked <= RATCHET[key].ki, `${key}: ${r.ki.leaked} Lecks mit Modell, Stand ${RATCHET[key].ki}: ${r.ki.hits.join(' ')}`);
    assert.ok(r.fb.leaked <= RATCHET[key].fb, `${key}: ${r.fb.leaked} Lecks im Modus fallback, Stand ${RATCHET[key].fb}`);
  });

  test(`${F.title}: Ziel hoechstens ${F.max * 100} % undichte Werte mit Modell`, { timeout: 900000, todo: 'Ziel C1.3: hoechstens 2 % (OCR 6 %)' }, async () => {
    const r = await measured(key, F.run);
    assert.ok(r.ki.leaked / r.ki.total <= F.max, `${key}: ${r.ki.leaked}/${r.ki.total} undicht, erlaubt ${F.max * 100} %: ${r.ki.hits.join(' ')}`);
  });
}
