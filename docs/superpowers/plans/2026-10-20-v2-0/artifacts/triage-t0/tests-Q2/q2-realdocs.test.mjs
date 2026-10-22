// Q2 roter Test (Teil 2): leaks() und Importvorbedingung aus tests/realdocs.test.mjs (echter Funktionskoerper per Textauszug)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync('/tmp/triage/v2/tests/realdocs.test.mjs', 'utf8');
const fnSrc = src.slice(src.indexOf('function leaks('), src.indexOf('// Misst alle Dokumente'));
const leaks = new Function(fnSrc + '; return leaks;')();
const MIN_EXTRACTED = Number(/const MIN_EXTRACTED = ([0-9.]+)/.exec(src)[1]);

const doc = { truth: [
  { type: 'EMAIL', frags: ['anna.beispiel@example.invalid'] },
  { type: 'NAME', frags: ['Beispielmann'] },
] };
test('Q2d Teilrest: "anna.beispiel{{EMAIL_1}}" bleibt stehen -> leaks() muss 1 Leck melden', () => {
  const r = leaks(doc, 'Kontakt: anna.beispiel{{EMAIL_1}}, Herr {{NAME_1}}');
  console.log('  leaks():', JSON.stringify(r));
  assert.equal(r.leaked, 1);
});
test('Q2e OCR-veraenderter Wert: "Beispieimann" (l -> i) steht unmaskiert in der Ausgabe -> muss Leck sein (oder eigene Fehlerklasse)', () => {
  const r = leaks(doc, 'Kontakt: {{EMAIL_1}}, Herr Beispieimann');
  console.log('  leaks():', JSON.stringify(r));
  assert.equal(r.leaked, 1);
});
test('Q2f Importverlust: 10 % der Werte duerfen den Import verlieren (MIN_EXTRACTED=' + MIN_EXTRACTED + ') und senken die Leckquote', () => {
  // 10 Werte, 1 verloren: Leckquote wird ueber alle 10 gebildet, der verlorene Wert kann nie lecken
  const truth = Array.from({ length: 10 }, (_, i) => ({ type: 'NAME', frags: ['Wert' + i + 'xyz'] }));
  const out = 'Ausgabe, Wert0xyz und Wert1xyz bleiben stehen (zwei echte Lecks), Wert9xyz ging im Import verloren'; // Wert9xyz fehlt in der Ausgabe
  const r = leaks({ truth }, out.replace('Wert9xyz', '') );
  const measurable = 9;
  console.log('  leaks():', JSON.stringify(r), ' Quote gemeldet', (r.leaked / r.total).toFixed(3), ' Quote ueber messbare', (r.leaked / measurable).toFixed(3), ' erlaubter Importverlust', 1 - MIN_EXTRACTED);
  assert.equal(r.total, measurable, 'verlorene Werte duerfen nicht im Nenner der Leckquote stehen');
});
