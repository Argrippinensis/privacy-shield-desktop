// E1: manuelle Markierungen (PSLib.marks) gegen die Normalisierung des Erkennungskerns (v2/main)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from '/tmp/triage/v2/tests/unit/_load.mjs';
const M = loadLib('marks'), D = loadLib('detect');
const ents = []; // nur die manuelle Markierung wirkt, keine Regel stoert
function run(value, text, pfx = 'NAME') {
  const m = M.create();
  assert.equal(M.add(m, { value, pfx }), true, 'marks.add muss annehmen');
  const r = D.anonymize(text, { ents, cvars: M.toCvars(m) });
  return r;
}
test('Kontrolle ASCII: Markierung wird ersetzt', () => {
  const r = run('Zwiebelbaum', 'Das Projekt Zwiebelbaum startet.');
  assert.match(r.text, /\{\{NAME_1\}\}/);
});
test('E1a: geschuetztes Leerzeichen im markierten Wert und im Text', () => {
  const v = 'Zwiebel baum', t = 'Das Projekt ' + v + ' startet.';
  const r = run(v, t);
  assert.ok(!r.text.includes('Zwiebel'), 'Wert steht noch im Klartext: ' + JSON.stringify(r.text));
  assert.equal(D.deanonymize(r.text, r.state), t);
});
test('E1b: Vollbreitenbuchstaben im markierten Wert und im Text', () => {
  const v = 'Ｚｗｉｅｂｅｌ', t = 'Das Projekt ' + v + ' startet.';
  const r = run(v, t);
  assert.ok(!r.text.includes(v), 'Wert steht noch im Klartext: ' + JSON.stringify(r.text));
});
test('E1c: schmales Leerzeichen U+202F und Ideographisches U+3000', () => {
  for (const sp of [' ', '　', ' ']) {
    const v = 'Zwiebel' + sp + 'baum', t = 'Das Projekt ' + v + ' startet.';
    const r = run(v, t);
    assert.ok(!r.text.includes('Zwiebel'), 'U+' + sp.charCodeAt(0).toString(16) + ' bleibt im Klartext: ' + JSON.stringify(r.text));
  }
});
test('Gegenprobe: ASCII-Markierung gegen Text mit NBSP funktioniert (Normalisierung hilft)', () => {
  const r = run('Zwiebel baum', 'Das Projekt Zwiebel baum startet.');
  assert.ok(!r.text.includes('Zwiebel'));
});
test('Gegenprobe: ASCII-Markierung gegen Vollbreitentext funktioniert', () => {
  const r = run('Zwiebel', 'Das Projekt Ｚｗｉｅｂｅｌ startet.');
  // Gross-/Kleinschreibung: Muster hat kein i-Flag; nur zur Information
  console.log('   Gegenprobe-Ergebnis:', JSON.stringify(r.text));
});
test('E1d: Gegenpruefung (leakcheck) mit demselben Muster meldet nichts', () => {
  const L = loadLib('leakcheck');
  const v = 'Zwiebel baum', t = 'Das Projekt ' + v + ' startet.';
  const m = M.create(); M.add(m, { value: v, pfx: 'NAME' });
  const res = L.scan(t, { detect: (x) => D.detect(x, { ents, cvars: M.toCvars(m) }), whitelist: [] });
  console.log('   leakcheck:', JSON.stringify(res));
  assert.ok(res.count > 0, 'Gegenpruefung sollte den Rest finden');
});
test('E1e: Zusammenspiel mit Markierung durch Gegenpruefungs-Weg (lcMask): Wert aus Ergebnistext markieren', () => {
  // lcMask nimmt den Wert aus dem Ergebnistext (Originalzeichen) -> Muster mit NBSP -> Treffer unmoeglich
  const v = 'Zwiebel baum';
  const r1 = D.anonymize('Kennung: ' + v + ' ok', { ents: ['EMAIL'] });
  const m = M.create(); M.add(m, { value: v, pfx: 'NAME' });
  const r2 = D.anonymize(r1.text, { ents, cvars: M.toCvars(m) });
  assert.ok(!r2.text.includes('Zwiebel'), JSON.stringify(r2.text));
});
