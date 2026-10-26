// C1.0: Korpusausbau fuer PrivacyShield 2.0 (rote Tests aus der Spezifikation V2-C-erkennung.md, Abschnitt C1.0).
// Prueft: generateDocs(42) bitgleich, generateDocs2/TEMPLATES2, CASES_V2, Harness-Modus fallback, Basisdateien,
// Backlog-Datei und die Ratsche je Modus fuer die neue Menge.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const EVAL = path.join(HERE, 'eval');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// Referenz: SHA-256 ueber die Texte der 42 Dokumente von generateDocs(42), verbunden mit \u0000 (Stand 1.8.0)
const REF_SHA_42 = 'b2d30b0f3f5dc7a173e64280a5e4d2dc62edecf0d9ebe774338f87232506ddd0';
const TEMPLATES2_EXPECTED = ['zeugnis', 'mietvertrag', 'gespraechsprotokoll', 'emailverlauf', 'csvexport', 'chatverlauf', 'bewerbung', 'rechnung_positionen', 'gutachten', 'behoerdenbescheid', 'krankmeldung', 'arztbrief_lang', 'kuendigung_lang', 'schadensmeldung_lang'];

const gen = () => import('./eval/generate.mjs');
const casesV2 = async () => (await import('./eval/cases-v2.mjs')).CASES_V2;

// ---------- Dokumente ----------

test('generateDocs(42) bleibt bitgleich zur Referenz', async () => {
  const { generateDocs } = await gen();
  const docs = generateDocs(42);
  assert.equal(docs.length, 42);
  assert.equal(sha(docs.map((d) => d.text).join('\u0000')), REF_SHA_42);
});

test('generateDocs2 und TEMPLATES2 sind exportiert', async () => {
  const m = await gen();
  assert.equal(typeof m.generateDocs2, 'function');
  assert.ok(Array.isArray(m.TEMPLATES2), 'TEMPLATES2 fehlt');
});

test('TEMPLATES2 enthaelt genau die 14 vorgesehenen Vorlagen', async () => {
  const { TEMPLATES2 } = await gen();
  assert.deepEqual([...TEMPLATES2].sort(), [...TEMPLATES2_EXPECTED].sort());
});

test('SYNTH_DOCS2 ist 98 (generate.mjs oder run-eval.mjs)', async () => {
  const g = await gen();
  const r = await import('./eval/run-eval.mjs');
  assert.equal(g.SYNTH_DOCS2 ?? r.SYNTH_DOCS2, 98);
});

test('generateDocs2 liefert 98 Dokumente, je Vorlage 7', async () => {
  const { generateDocs2, TEMPLATES2 } = await gen();
  const docs = generateDocs2();
  assert.equal(docs.length, 98);
  for (const t of TEMPLATES2) assert.equal(docs.filter((d) => d.template === t).length, 7, 'Vorlage ' + t);
});

test('generateDocs2 ist deterministisch (Standardwerte seed 20261021)', async () => {
  const { generateDocs2 } = await gen();
  const a = generateDocs2(98, 20261021), b = generateDocs2();
  assert.deepEqual(a, b);
  assert.notDeepEqual(generateDocs2(98, 1).map((d) => d.text), a.map((d) => d.text));
});

test('generateDocs2: jedes Dokument hat Text und 3 bis 12 Wahrheitswerte', async () => {
  const { generateDocs2 } = await gen();
  for (const [i, d] of generateDocs2().entries()) {
    assert.equal(typeof d.text, 'string', 'Dokument ' + i);
    assert.ok(d.text.length > 50, 'Text zu kurz in Dokument ' + i);
    assert.ok(Array.isArray(d.truth) && d.truth.length >= 3 && d.truth.length <= 12, `Dokument ${i} (${d.template}): ${d.truth && d.truth.length} Werte`);
  }
});

test('generateDocs2: alle Fragmente der Wahrheit stehen im Text', async () => {
  const { generateDocs2 } = await gen();
  for (const [i, d] of generateDocs2().entries()) {
    for (const t of d.truth) {
      assert.ok(t.type && Array.isArray(t.frags) && t.frags.length > 0, `Dokument ${i}: Wahrheitseintrag unvollstaendig`);
      for (const f of t.frags) assert.ok(d.text.includes(f), `Dokument ${i} (${d.template}): Fragment fehlt im Text`);
    }
  }
});

test('generateDocs2: Dokumente einer Vorlage unterscheiden sich', async () => {
  const { generateDocs2, TEMPLATES2 } = await gen();
  const docs = generateDocs2();
  for (const t of TEMPLATES2) {
    const texts = new Set(docs.filter((d) => d.template === t).map((d) => d.text));
    assert.equal(texts.size, 7, 'Vorlage ' + t);
  }
});

test('generateDocs2: Sonderformen (Sprecherkuerzel, CSV, Chat)', async () => {
  const { generateDocs2 } = await gen();
  const docs = generateDocs2();
  const of = (t) => docs.filter((d) => d.template === t);
  assert.ok(of('csvexport').every((d) => d.text.split('\n').filter((l) => l.includes(',')).length >= 3), 'csvexport: Zeilen mit Komma');
  assert.ok(of('gespraechsprotokoll').every((d) => /^[A-ZÄÖÜ]{1,4}:/m.test(d.text)), 'gespraechsprotokoll: Sprecherkuerzel');
  assert.ok(of('arztbrief_lang').every((d) => d.text.split(/\n\s*\n/).length >= 3), 'arztbrief_lang: mehrere Absaetze');
});

// ---------- Faelle ----------

test('CASES_V2 hat das Tupelformat [id, Kategorie, Text, [Fragmente], Profil?]', async () => {
  const c = await casesV2();
  assert.ok(Array.isArray(c) && c.length > 0);
  for (const e of c) {
    assert.equal(typeof e[0], 'string');
    assert.equal(typeof e[1], 'string');
    assert.equal(typeof e[2], 'string');
    assert.ok(Array.isArray(e[3]));
    assert.ok(e[4] === undefined || ['standard', 'strict', 'medical', 'finance'].includes(e[4]), 'Profil ' + e[4]);
  }
});

test('CASES_V2: Ids eindeutig, positiv v2a01.., negativ v2n01..', async () => {
  const c = await casesV2();
  const ids = c.map((e) => e[0]);
  assert.equal(new Set(ids).size, ids.length, 'doppelte Ids');
  for (const e of c) {
    if (e[1] === 'NEG') assert.match(e[0], /^v2n\d{2,}$/, e[0]);
    else assert.match(e[0], /^v2a\d{2,}$/, e[0]);
  }
  assert.ok(ids.includes('v2a01') && ids.includes('v2n01'));
});

test('CASES_V2: Ids kollidieren nicht mit cases.mjs und cases-gdpr.mjs', async () => {
  const c = await casesV2();
  const { CASES } = await import('./eval/cases.mjs');
  const { GDPR } = await import('./eval/cases-gdpr.mjs');
  const old = new Set([...CASES, ...GDPR].map((e) => e[0]));
  for (const e of c) assert.ok(!old.has(e[0]), 'Kollision ' + e[0]);
});

test('CASES_V2: mindestens 100 neue positive Faelle, insgesamt mindestens 250', async () => {
  const c = await casesV2();
  const { CASES } = await import('./eval/cases.mjs');
  const { GDPR } = await import('./eval/cases-gdpr.mjs');
  const pos = c.filter((e) => e[1] !== 'NEG').length;
  assert.ok(pos >= 100, 'neue positive Faelle: ' + pos);
  const oldPos = [...CASES, ...GDPR].filter((e) => e[1] !== 'NEG').length;
  assert.equal(oldPos, 150);
  assert.ok(oldPos + pos >= 250, 'positive gesamt: ' + (oldPos + pos));
});

test('CASES_V2: positive Kategorien V2-<Gruppe>, elf Gruppen mit je 5 bis 25 Faellen', async () => {
  const c = await casesV2();
  const by = {};
  for (const e of c) if (e[1] !== 'NEG') (by[e[1]] ||= []).push(e[0]);
  for (const k of Object.keys(by)) assert.match(k, /^V2-[A-Z0-9]+$/, 'Kategorie ' + k);
  assert.equal(Object.keys(by).length, 11, 'Gruppen: ' + Object.keys(by).join(', '));
  for (const [k, v] of Object.entries(by)) assert.ok(v.length >= 5 && v.length <= 25, `${k}: ${v.length} Faelle`);
});

test('CASES_V2: genau 74 Negativfaelle, insgesamt 94', async () => {
  const c = await casesV2();
  const { CASES } = await import('./eval/cases.mjs');
  const { GDPR } = await import('./eval/cases-gdpr.mjs');
  const neg = c.filter((e) => e[1] === 'NEG');
  assert.equal(neg.length, 74);
  assert.equal([...CASES, ...GDPR].filter((e) => e[1] === 'NEG').length, 20);
  for (const e of neg) assert.deepEqual(e[3], [], e[0] + ': Negativfall ohne Fragmente');
});

test('CASES_V2: positive Faelle haben Fragmente, die im Text stehen', async () => {
  const c = await casesV2();
  for (const e of c.filter((x) => x[1] !== 'NEG')) {
    assert.ok(e[3].length > 0, e[0] + ': keine Fragmente');
    for (const f of e[3]) assert.ok(e[2].includes(f), `${e[0]}: Fragment "${f}" nicht im Text`);
  }
});

test('CASES_V2: Art.-9- und Art.-10-Gruppen laufen im Profil strict', async () => {
  const c = await casesV2();
  const sens = c.filter((e) => /^V2-ART(9|10)$/.test(e[1]));
  assert.ok(sens.length >= 10, 'Art.-9/10-Faelle: ' + sens.length);
  for (const e of sens) assert.equal(e[4], 'strict', e[0]);
});

// ---------- Harness und Basisdateien ----------

test('run-eval.mjs kennt den Modus fallback und die Option --set v2', () => {
  const src = fs.readFileSync(path.join(EVAL, 'run-eval.mjs'), 'utf8');
  assert.match(src, /fallback/, 'Modus fallback fehlt');
  assert.match(src, /--set/, 'Option --set fehlt');
  assert.match(src, /baseline-v2\.json/, 'baseline-v2.json fehlt');
  assert.match(src, /localAIMode/, 'localAIMode (W1) fehlt');
  assert.match(src, /CASES_V2/);
  assert.match(src, /generateDocs2/);
});

test('baseline.json: neuer Schluessel fallback, bestehende Zahlen unveraendert', () => {
  const b = readJson(path.join(EVAL, 'baseline.json'));
  assert.deepEqual(Object.keys(b).sort(), ['fallback', 'ki', 'wortlisten']);
  assert.equal(b.wortlisten.synthLeaked, 18);
  assert.equal(b.wortlisten.synthTotal, 276);
  assert.equal(b.ki.synthLeaked, 1);
  assert.equal(b.ki.synthTotal, 276);
  assert.equal(b.ki.cases['G-NAME'], 2);
  assert.equal(b.ki.cases['G-NATION'], 1);
  assert.equal(b.ki.cases['G-AUSLAND'], 1);
  const f = b.fallback;
  assert.ok(f && f.cases && Number.isInteger(f.synthLeaked), 'fallback-Messwerte fehlen');
  assert.equal(f.synthTotal, 276);
  assert.deepEqual(Object.keys(f.cases).sort(), Object.keys(b.ki.cases).sort());
  assert.ok(f.synthLeaked <= b.wortlisten.synthLeaked, 'fallback darf nicht schlechter sein als nur Regeln');
});

test('baseline-v2.json: drei Modi im Format von baseline.json, Menge 98 Dokumente', async () => {
  const p = path.join(EVAL, 'baseline-v2.json');
  assert.ok(fs.existsSync(p), 'baseline-v2.json fehlt');
  const b = readJson(p);
  assert.deepEqual(Object.keys(b).sort(), ['fallback', 'ki', 'wortlisten']);
  const cats = new Set((await casesV2()).map((e) => e[1]));
  for (const [mode, v] of Object.entries(b)) {
    assert.deepEqual(Object.keys(v.cases).sort(), [...cats].sort(), 'Kategorien in ' + mode);
    assert.ok(Number.isInteger(v.synthLeaked) && v.synthLeaked >= 0, mode);
    assert.ok(v.synthTotal >= 98 * 3, `${mode}: synthTotal ${v.synthTotal}`);
    assert.equal(v.cases.NEG <= 60, true);
  }
});

test('Backlog docs/erkennung-entscheidungen.md existiert', () => {
  const p = path.join(ROOT, 'docs', 'erkennung-entscheidungen.md');
  assert.ok(fs.existsSync(p), 'Datei fehlt');
  assert.ok(fs.readFileSync(p, 'utf8').length > 100);
});

// ---------- Ratsche je Modus (gleiche Logik wie eval.test.mjs, Basis baseline-v2.json) ----------

let measured;
async function measure() {
  if (!measured) {
    measured = (async () => {
      const { runEval } = await import('./eval/run-eval.mjs');
      return runEval({ withAI: true, set: 'v2' });
    })();
  }
  return measured;
}

function ratchet(mode) {
  return async () => {
    const base = readJson(path.join(EVAL, 'baseline-v2.json'));
    const sum = (await measure()).find((s) => s.mode === mode);
    assert.ok(sum, 'Modus nicht gemessen: ' + mode);
    const b = base[mode];
    assert.ok(b, 'Baseline fuer Modus fehlt: ' + mode);
    const problems = [];
    for (const [cat, v] of Object.entries(sum.cases)) {
      const allowed = b.cases[cat] ?? 0;
      if (v.leaked > allowed) problems.push(`${mode}/${cat}: ${v.leaked} > ${allowed} (${v.ids.join(' ')})`);
    }
    if (sum.synthLeaked > b.synthLeaked) problems.push(`${mode}/synthetisch: ${sum.synthLeaked} > ${b.synthLeaked}`);
    assert.equal(sum.synthTotal, b.synthTotal, 'Zahl der Werte weicht von der Baseline ab');
    assert.deepEqual(problems, [], 'Erkennung verschlechtert: ' + problems.join(' | '));
  };
}

test('Ratsche v2, Modus wortlisten', ratchet('wortlisten'));
test('Ratsche v2, Modus fallback', ratchet('fallback'));
test('Ratsche v2, Modus ki', ratchet('ki'));

test('Backlog nennt jedes Leck der neuen Menge mit Fall-Id', async () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs', 'erkennung-entscheidungen.md'), 'utf8');
  const res = await measure();
  const missing = [];
  for (const s of res) for (const v of Object.values(s.cases)) for (const id of v.ids) if (!doc.includes(id)) missing.push(`${s.mode}/${id}`);
  assert.deepEqual(missing, [], 'Lecks ohne Backlog-Eintrag: ' + missing.join(' '));
});
