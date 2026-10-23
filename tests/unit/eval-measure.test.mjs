// Q2.fix: Leckmessung der Erkennungsauswertung (tests/eval/measure.mjs).
// Die Messlogik aus run-eval.mjs (summarize) und tests/realdocs.test.mjs (leaks) liegt in einem importierbaren Modul.
// Alle Werte sind erfunden (example.invalid, Fantasienamen, Testnummern).
//
// Angenommene API von tests/eval/measure.mjs (alles benannte Exporte, reine Funktionen, keine Seiteneffekte):
//   measureDoc(doc, out, { input, minFrag = 0 }) -> {
//     imported,    // Werte, die den Import ueberstanden haben (alle Fragmente >= minFrag stehen im input); der Nenner der Leckquote
//     lost,        // Werte, die den Import nicht ueberstanden haben (nicht im Nenner)
//     leaked,      // importierte Werte, von denen in der Ausgabe etwas steht (ganz, Kopf oder Rumpf)
//     hits,        // [{ type, kind }] mit kind 'voll' | 'kopf' | 'rumpf'; nie Klartextwerte
//     ocrChanged,  // Zahl verlorener Werte, deren leicht veraenderte Form (Editierabstand 1) unmaskiert in der Ausgabe steht
//     unmeasured,  // Werte, deren Fragmente alle kuerzer als minFrag sind (werden gezaehlt, nicht still ignoriert)
//   }
//     doc = { text?, truth: [{ type, frags }] }; input faellt auf doc.text zurueck, fehlt beides, gilt jeder Wert als importiert.
//     Teilrest: ein Anfang (kopf) oder Ende (rumpf) des Fragments, bzw. bei Ziffernwerten der links vom Fragment stehende
//     Wertkopf aus dem input (z. B. IBAN-Gruppen), der ab 4 Zeichen unmittelbar am Platzhalter steht.
//   mergeResults(list) -> Summe aller Zaehler (hits aneinandergehaengt)
//   rates(res) -> { importRate, leakRate }   importRate = imported / (imported + lost), leakRate = leaked / imported
//   assessImport(format, res) -> { ok, errorClass }   TXT, DOCX, PDF-Text: lost muss 0 sein (errorClass 'import');
//     OCR: Verlust ist erlaubt, wird aber als eigene Fehlerklasse 'ocr' gefuehrt (ok true)
//   summarize(mode, caseRes, synthRes, docs, cases) bleibt in run-eval.mjs exportiert (Wiederverwendung der Messlogik),
//     liefert zusaetzlich synthLost; synthTotal zaehlt nur importierte Werte.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './_load.mjs';

// Lazy laden, damit jeder Testfall einzeln rot wird, solange das Modul fehlt.
const M = () => import('../eval/measure.mjs');
const RUN_EVAL = () => import('../eval/run-eval.mjs');

const EMAIL = 'anna.beispiel@example.invalid';
const IBAN = 'DE00 1234 5678 9012 3456 78'; // erfunden
const IBAN_TEXT = 'IBAN: ' + IBAN;
const IBAN_FRAG = IBAN.slice(-9); // wie generate.mjs: nur die letzten 9 Zeichen
const doc = (text, truth) => ({ text, truth });

// ---- summarize (run-eval.mjs): die drei Faelle aus dem Bericht ----

test('Q2a Handfall: Adressstamm "anna.beispiel" vor dem Platzhalter zaehlt als undicht', async () => {
  const { summarize } = await RUN_EVAL();
  const cases = [['x1', 'EMAIL', 'Mail: ' + EMAIL, [EMAIL], 'standard']];
  const caseRes = [{ key: 'x1', out: 'Mail: anna.beispiel{{EMAIL_1}}', tokens: 1 }];
  const s = summarize('t', caseRes, [], [], cases);
  assert.equal(s.cases.EMAIL.leaked, 1);
  assert.deepEqual(s.cases.EMAIL.ids, ['x1']);
});

test('Q2b Synthetik: Adressstamm "anna.beispiel" bei vorhandenem Platzhalter zaehlt als undicht', async () => {
  const { summarize } = await RUN_EVAL();
  const d = doc('Mail: ' + EMAIL, [{ type: 'EMAIL', frags: [EMAIL] }]);
  const s = summarize('t', [], [{ key: 'syn0', out: 'Mail: anna.beispiel{{EMAIL_1}}' }], [d], []);
  assert.equal(s.synthLeaked, 1);
  assert.equal(s.synth.EMAIL.leaked, 1);
});

test('Q2c Synthetik: Fragment nur die letzten 9 Zeichen der IBAN, der Kopf der IBAN bleibt stehen -> undicht', async () => {
  const { summarize } = await RUN_EVAL();
  const d = doc(IBAN_TEXT, [{ type: 'IBAN', frags: [IBAN_FRAG] }]);
  const s = summarize('t', [], [{ key: 'syn0', out: 'IBAN: DE00 1234 5678 9012 {{IBAN_1}}' }], [d], []);
  assert.equal(s.synthLeaked, 1);
  assert.equal(s.synth.IBAN.leaked, 1);
});

test('summarize in run-eval.mjs und measure.mjs liefern fuer Q2a dasselbe (eine Messlogik)', async () => {
  const { summarize } = await RUN_EVAL();
  const m = await M();
  assert.equal(typeof m.measureDoc, 'function');
  const d = doc('Mail: ' + EMAIL, [{ type: 'EMAIL', frags: [EMAIL] }]);
  const a = summarize('t', [], [{ out: 'Mail: anna.beispiel{{EMAIL_1}}' }], [d], []);
  const r = m.measureDoc(d, 'Mail: anna.beispiel{{EMAIL_1}}');
  assert.equal(a.synthLeaked, r.leaked);
});

test('summarize: sauber maskierte Synthetik und Handfaelle ergeben 0 Lecks (kein Fehlalarm)', async () => {
  const { summarize } = await RUN_EVAL();
  const cases = [['x1', 'EMAIL', 'Mail: ' + EMAIL, [EMAIL], 'standard']];
  const caseRes = [{ key: 'x1', out: 'Mail: {{EMAIL_1}}', tokens: 1 }];
  const d = doc(IBAN_TEXT, [{ type: 'IBAN', frags: [IBAN_FRAG] }]);
  const s = summarize('t', caseRes, [{ out: 'IBAN: {{IBAN_1}}' }], [d], cases);
  assert.equal(s.cases.EMAIL.leaked, 0);
  assert.equal(s.synthLeaked, 0);
  assert.equal(s.synthTotal, 1);
});

test('summarize: Negativfaelle zaehlen weiter ueber Platzhalter in der Ausgabe', async () => {
  const { summarize } = await RUN_EVAL();
  const cases = [['n1', 'NEG', 'Das Wetter ist gut', [], 'standard'], ['n2', 'NEG', 'Heute ist Montag', [], 'standard']];
  const caseRes = [{ key: 'n1', out: 'Das Wetter ist gut', tokens: 0 }, { key: 'n2', out: 'Heute {{DATUM_1}}', tokens: 1 }];
  const s = summarize('t', caseRes, [], [], cases);
  assert.equal(s.cases.NEG.total, 2);
  assert.equal(s.cases.NEG.leaked, 1);
  assert.deepEqual(s.cases.NEG.ids, ['n2']);
});

test('summarize: verlorener Wert steht nicht im Nenner der Synthetik (synthTotal, synthLost)', async () => {
  const { summarize } = await RUN_EVAL();
  // Der Text enthaelt das Fragment des zweiten Werts nicht (Import verloren): kein Nenner, aber gezaehlt.
  const d = doc('Mail: ' + EMAIL, [{ type: 'EMAIL', frags: [EMAIL] }, { type: 'NAME', frags: ['Beispielmann'] }]);
  const s = summarize('t', [], [{ out: 'Mail: {{EMAIL_1}}' }], [d], []);
  assert.equal(s.synthTotal, 1);
  assert.equal(s.synthLost, 1);
  assert.equal(s.synthLeaked, 0);
});

// ---- measureDoc: Teilreste ----

test('Teilrest Kopf: "anna.beispiel{{EMAIL_1}}" ist ein Leck der Art kopf', async () => {
  const { measureDoc } = await M();
  const r = measureDoc(doc(EMAIL, [{ type: 'EMAIL', frags: [EMAIL] }]), 'Kontakt: anna.beispiel{{EMAIL_1}}');
  assert.equal(r.leaked, 1);
  assert.deepEqual(r.hits, [{ type: 'EMAIL', kind: 'kopf' }]);
});

test('Teilrest Rumpf: "{{NAME_1}}mann" (Namensende nach dem Platzhalter) ist ein Leck der Art rumpf', async () => {
  const { measureDoc } = await M();
  const r = measureDoc(doc('Herr Beispielmann', [{ type: 'NAME', frags: ['Beispielmann'] }]), 'Herr {{NAME_1}}mann');
  assert.equal(r.leaked, 1);
  assert.deepEqual(r.hits, [{ type: 'NAME', kind: 'rumpf' }]);
});

test('Teilrest Kopf bei Namen: "Beispiel{{NAME_1}}" ist ein Leck', async () => {
  const { measureDoc } = await M();
  const r = measureDoc(doc('Herr Beispielmann', [{ type: 'NAME', frags: ['Beispielmann'] }]), 'Herr Beispiel{{NAME_1}}');
  assert.equal(r.leaked, 1);
  assert.equal(r.hits[0].kind, 'kopf');
});

test('IBAN-Kopf: Fragment nur das Ende, der Kopf "DE00 1234 5678 9012" steht vor dem Platzhalter -> Leck', async () => {
  const { measureDoc } = await M();
  const r = measureDoc(doc(IBAN_TEXT, [{ type: 'IBAN', frags: [IBAN_FRAG] }]), 'IBAN: DE00 1234 5678 9012 {{IBAN_1}}');
  assert.equal(r.leaked, 1);
  assert.equal(r.hits[0].type, 'IBAN');
  assert.equal(r.hits[0].kind, 'kopf');
});

test('IBAN-Kopf: schon die letzte Kopfgruppe "9012" unmittelbar vor dem Platzhalter ist ein Leck', async () => {
  const { measureDoc } = await M();
  const r = measureDoc(doc(IBAN_TEXT, [{ type: 'IBAN', frags: [IBAN_FRAG] }]), 'IBAN: 9012 {{IBAN_1}}');
  assert.equal(r.leaked, 1);
});

test('volles Fragment unveraendert in der Ausgabe ist ein Leck der Art voll', async () => {
  const { measureDoc } = await M();
  const r = measureDoc(doc(EMAIL, [{ type: 'EMAIL', frags: [EMAIL] }]), 'Kontakt: ' + EMAIL);
  assert.equal(r.leaked, 1);
  assert.deepEqual(r.hits, [{ type: 'EMAIL', kind: 'voll' }]);
});

test('mehrere Fragmente eines Werts: steht nur eines in der Ausgabe, ist der Wert undicht', async () => {
  const { measureDoc } = await M();
  const d = doc('Musterweg 12, 99999 Beispielstadt', [{ type: 'ADR', frags: ['Musterweg 12', '99999'] }]);
  const r = measureDoc(d, '{{ADR_1}}, 99999 {{ORT_1}}');
  assert.equal(r.leaked, 1);
  assert.equal(r.hits[0].kind, 'voll');
});

test('Hits nennen Typ und Art, nie den Klartextwert', async () => {
  const { measureDoc } = await M();
  const r = measureDoc(doc(EMAIL, [{ type: 'EMAIL', frags: [EMAIL] }]), 'Kontakt: anna.beispiel{{EMAIL_1}}');
  assert.equal(r.leaked, 1);
  const json = JSON.stringify(r);
  assert.ok(!json.includes('anna'), 'Ergebnis enthaelt Klartext: ' + json);
  assert.ok(!json.includes('example.invalid'));
});

// ---- Positivfaelle: kein Fehlalarm ----

test('sauber maskiert (E-Mail, Name, IBAN, Telefon) ergibt 0 Lecks', async () => {
  const { measureDoc } = await M();
  const d = doc('Mail ' + EMAIL + ', Herr Beispielmann, ' + IBAN_TEXT + ', Tel 0000 1234567', [
    { type: 'EMAIL', frags: [EMAIL] }, { type: 'NAME', frags: ['Beispielmann'] },
    { type: 'IBAN', frags: [IBAN_FRAG] }, { type: 'TEL', frags: ['1234567'] },
  ]);
  const r = measureDoc(d, 'Mail {{EMAIL_1}}, Herr {{NAME_1}}, IBAN: {{IBAN_1}}, Tel {{TEL_1}}');
  assert.equal(r.leaked, 0);
  assert.deepEqual(r.hits, []);
  assert.equal(r.imported, 4);
  assert.equal(r.lost, 0);
});

test('kein Fehlalarm: Anrede "Frau" vor dem Platzhalter und Platzhalter mit Unterteil {{NAME_1.NACHNAME}}', async () => {
  const { measureDoc } = await M();
  const d = doc('Frau Beispielmann', [{ type: 'NAME', frags: ['Beispielmann'] }]);
  assert.equal(measureDoc(d, 'Frau {{NAME_1}}').leaked, 0);
  assert.equal(measureDoc(d, 'Frau {{NAME_1.NACHNAME}}').leaked, 0);
});

test('kein Fehlalarm: Wortanfang eines anderen Worts ohne Naehe zum Platzhalter ist kein Teilrest', async () => {
  const { measureDoc } = await M();
  const d = doc('Herr Beispielmann', [{ type: 'NAME', frags: ['Beispielmann'] }]);
  const r = measureDoc(d, 'Die Beispiel GmbH liefert an {{NAME_1}}');
  assert.equal(r.leaked, 0);
});

test('kein Fehlalarm: unbeteiligte Zahl vor dem Platzhalter bei maskierter IBAN', async () => {
  const { measureDoc } = await M();
  const r = measureDoc(doc(IBAN_TEXT, [{ type: 'IBAN', frags: [IBAN_FRAG] }]), 'Rechnung 2024-0815 zu IBAN: {{IBAN_1}}');
  assert.equal(r.leaked, 0);
});

// ---- Import- und Leckquote getrennt ----

test('Importverlust steht nicht im Nenner: 10 Werte, 1 verloren -> imported 9, lost 1', async () => {
  const { measureDoc } = await M();
  const truth = Array.from({ length: 10 }, (_, i) => ({ type: 'NAME', frags: ['Wert' + i + 'xyz'] }));
  const input = truth.slice(0, 9).map((t) => t.frags[0]).join(' ');
  const out = 'Wert0xyz Wert1xyz {{NAME_1}}'; // zwei echte Lecks, der zehnte Wert ging im Import verloren
  const r = measureDoc({ truth }, out, { input });
  assert.equal(r.imported, 9);
  assert.equal(r.lost, 1);
  assert.equal(r.leaked, 2);
});

test('Quoten getrennt: Importquote 0,9 und Leckquote ueber die importierten Werte (2/9)', async () => {
  const { measureDoc, rates } = await M();
  const truth = Array.from({ length: 10 }, (_, i) => ({ type: 'NAME', frags: ['Wert' + i + 'xyz'] }));
  const input = truth.slice(0, 9).map((t) => t.frags[0]).join(' ');
  const r = measureDoc({ truth }, 'Wert0xyz Wert1xyz {{NAME_1}}', { input });
  const q = rates(r);
  assert.ok(Math.abs(q.importRate - 0.9) < 1e-9, 'importRate ' + q.importRate);
  assert.ok(Math.abs(q.leakRate - 2 / 9) < 1e-9, 'leakRate ' + q.leakRate);
});

test('Quoten ohne Werte: Importquote 1 und Leckquote 0 statt NaN', async () => {
  const { measureDoc, rates } = await M();
  const q = rates(measureDoc({ truth: [] }, 'nichts'));
  assert.equal(q.importRate, 1);
  assert.equal(q.leakRate, 0);
});

test('Import zaehlt nur, wenn alle Fragmente eines Werts im input stehen', async () => {
  const { measureDoc } = await M();
  const d = { truth: [{ type: 'ADR', frags: ['Musterweg 12', '99999'] }] };
  const r = measureDoc(d, '{{ADR_1}}', { input: 'Musterweg 12, ohne Postleitzahl' });
  assert.equal(r.imported, 0);
  assert.equal(r.lost, 1);
});

test('input faellt auf doc.text zurueck; ohne beides gilt jeder Wert als importiert', async () => {
  const { measureDoc } = await M();
  const truth = [{ type: 'EMAIL', frags: [EMAIL] }];
  assert.equal(measureDoc({ text: 'ohne Adresse', truth }, '{{EMAIL_1}}').lost, 1);
  assert.equal(measureDoc({ truth }, '{{EMAIL_1}}').imported, 1);
});

test('mergeResults summiert Zaehler und haengt Hits aneinander', async () => {
  const { measureDoc, mergeResults } = await M();
  const d = doc(EMAIL, [{ type: 'EMAIL', frags: [EMAIL] }]);
  const a = measureDoc(d, 'anna.beispiel{{EMAIL_1}}');
  const b = measureDoc(d, '{{EMAIL_1}}');
  const m = mergeResults([a, b]);
  assert.equal(m.imported, 2);
  assert.equal(m.leaked, 1);
  assert.equal(m.hits.length, 1);
});

// ---- Importvorbedingung je Format, OCR als eigene Fehlerklasse ----

for (const fmt of ['TXT', 'DOCX', 'PDF-Text']) {
  test(`Import ${fmt}: ein verlorener Wert ist ein Fehler, 100 % sind verlangt`, async () => {
    const { measureDoc, assessImport } = await M();
    const d = doc('nur Text', [{ type: 'EMAIL', frags: [EMAIL] }]);
    const r = measureDoc(d, '{{EMAIL_1}}');
    const v = assessImport(fmt, r);
    assert.equal(v.ok, false);
    assert.equal(v.errorClass, 'import');
  });
}

test('Import TXT: ohne Verlust ist die Vorbedingung erfuellt', async () => {
  const { measureDoc, assessImport } = await M();
  const r = measureDoc(doc(EMAIL, [{ type: 'EMAIL', frags: [EMAIL] }]), '{{EMAIL_1}}');
  assert.equal(assessImport('TXT', r).ok, true);
});

test('Import OCR: ein verlorener Wert ist erlaubt, wird aber als eigene Fehlerklasse ocr gefuehrt', async () => {
  const { measureDoc, assessImport } = await M();
  const r = measureDoc(doc('nur Text', [{ type: 'EMAIL', frags: [EMAIL] }]), '{{EMAIL_1}}');
  const v = assessImport('OCR', r);
  assert.equal(v.ok, true);
  assert.equal(v.errorClass, 'ocr');
});

test('OCR-veraenderter Wert: "Beispieimann" (l -> i) steht unmaskiert in der Ausgabe -> ocrChanged, nicht still als entfernt', async () => {
  const { measureDoc, assessImport } = await M();
  const truth = [{ type: 'EMAIL', frags: [EMAIL] }, { type: 'NAME', frags: ['Beispielmann'] }];
  const input = 'Kontakt: ' + EMAIL + ', Herr Beispieimann'; // OCR-Fehler im Namen
  const r = measureDoc({ truth }, 'Kontakt: {{EMAIL_1}}, Herr Beispieimann', { input });
  assert.equal(r.imported, 1);
  assert.equal(r.lost, 1);
  assert.equal(r.ocrChanged, 1);
  assert.equal(r.leaked, 0);
  assert.equal(assessImport('OCR', r).ok, true);
});

test('OCR-veraenderter Wert, der auch in der Ausgabe fehlt, ist nur Importverlust (ocrChanged 0)', async () => {
  const { measureDoc } = await M();
  const truth = [{ type: 'NAME', frags: ['Beispielmann'] }];
  const r = measureDoc({ truth }, 'Herr {{NAME_1}}', { input: 'Herr Beispieimann' });
  assert.equal(r.lost, 1);
  assert.equal(r.ocrChanged, 0);
});

// ---- kleine Fragmente nicht still ignorieren ----

test('kleine Fragmente (unter minFrag) werden als unmeasured gezaehlt, nicht still ignoriert', async () => {
  const { measureDoc } = await M();
  const d = doc('Herr Ali', [{ type: 'NAME', frags: ['Ali'] }]);
  const r = measureDoc(d, 'Herr Ali', { minFrag: 5 });
  assert.equal(r.unmeasured, 1);
  assert.equal(r.imported, 0);
  assert.equal(r.leaked, 0);
});

test('ohne minFrag wird dasselbe kleine Fragment gemessen und ist ein Leck', async () => {
  const { measureDoc } = await M();
  const d = doc('Herr Ali', [{ type: 'NAME', frags: ['Ali'] }]);
  const r = measureDoc(d, 'Herr Ali');
  assert.equal(r.unmeasured, 0);
  assert.equal(r.leaked, 1);
});

test('Wert mit kleinem und grossem Fragment wird ueber das grosse gemessen (kein unmeasured)', async () => {
  const { measureDoc } = await M();
  const d = doc('Musterweg 12, 99999', [{ type: 'ADR', frags: ['12', 'Musterweg 12'] }]);
  const r = measureDoc(d, 'Musterweg 12, {{PLZ_1}}', { minFrag: 5 });
  assert.equal(r.unmeasured, 0);
  assert.equal(r.leaked, 1);
});

// ---- Verdrahtung ----

test('realdocs.test.mjs und run-eval.mjs nutzen die gemeinsame Messlogik; keine eigene leaks()-Kopie, keine 90-%-Importtoleranz', () => {
  const real = fs.readFileSync(path.join(ROOT, 'tests', 'realdocs.test.mjs'), 'utf8');
  const run = fs.readFileSync(path.join(ROOT, 'tests', 'eval', 'run-eval.mjs'), 'utf8');
  assert.match(real, /eval\/measure\.mjs/);
  assert.match(run, /\.\/measure\.mjs/);
  assert.doesNotMatch(real, /function leaks\(/);
  assert.doesNotMatch(real, /MIN_EXTRACTED\s*=\s*0\.9/);
});

test('run-eval.mjs startet beim Import keinen Lauf und exportiert summarize', async () => {
  const t0 = Date.now();
  const m = await RUN_EVAL();
  assert.equal(typeof m.summarize, 'function');
  assert.ok(Date.now() - t0 < 20000, 'Import dauerte zu lange (Lauf gestartet?)');
});
