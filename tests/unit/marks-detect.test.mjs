// E1.fix: manuelle Markierungen, eigene Variablen und Richtlinienbegriffe gegen die Normalisierung des Erkennungskerns.
// Muster und Text muessen in derselben Normalform verglichen werden (Unicode, Leerraum, Gross-/Kleinschreibung).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const M = loadLib('marks'), D = loadLib('detect'), P = loadLib('policy'), L = loadLib('leakcheck');
const ents = []; // nur die Markierung wirkt, keine Regel stoert

function run(value, text, pfx = 'NAME') {
  const m = M.create();
  assert.equal(M.add(m, { value, pfx }), true, 'marks.add muss den Wert annehmen');
  return D.anonymize(text, { ents, cvars: M.toCvars(m) });
}

test('Kontrolle: ASCII-Markierung wird ersetzt', () => {
  const r = run('Zwiebelbaum', 'Das Projekt Zwiebelbaum startet.');
  assert.match(r.text, /\{\{NAME_1\}\}/);
});

test('Markierung mit geschuetztem Leerzeichen im Wert und im Text wird ersetzt und ist rueckfuehrbar', () => {
  const v = 'Zwiebel\u00a0baum', t = 'Das Projekt ' + v + ' startet.';
  const r = run(v, t);
  assert.ok(!r.text.includes('Zwiebel'), 'Wert steht noch im Klartext: ' + JSON.stringify(r.text));
  assert.equal(D.deanonymize(r.text, r.state), t);
});

test('Markierung mit Vollbreitenbuchstaben im Wert und im Text wird ersetzt', () => {
  const v = 'Ｚｗｉｅｂｅｌ', t = 'Das Projekt ' + v + ' startet.';
  const r = run(v, t);
  assert.ok(!r.text.includes(v), 'Wert steht noch im Klartext: ' + JSON.stringify(r.text));
  assert.match(r.text, /\{\{NAME_1\}\}/);
});

test('Markierung mit schmalem Leerzeichen U+202F wird ersetzt', () => {
  const v = 'Zwiebel\u202fbaum', t = 'Das Projekt ' + v + ' startet.';
  const r = run(v, t);
  assert.ok(!r.text.includes('Zwiebel'), JSON.stringify(r.text));
});

test('Markierung mit ideographischem Leerzeichen U+3000 wird ersetzt', () => {
  const v = 'Zwiebel\u3000baum', t = 'Das Projekt ' + v + ' startet.';
  const r = run(v, t);
  assert.ok(!r.text.includes('Zwiebel'), JSON.stringify(r.text));
});

test('Markierung mit Schmalraum U+2009 wird ersetzt', () => {
  const v = 'Zwiebel\u2009baum', t = 'Das Projekt ' + v + ' startet.';
  const r = run(v, t);
  assert.ok(!r.text.includes('Zwiebel'), JSON.stringify(r.text));
});

test('ASCII-Markierung findet Text mit geschuetztem Leerzeichen', () => {
  const r = run('Zwiebel baum', 'Das Projekt Zwiebel\u00a0baum startet.');
  assert.ok(!r.text.includes('Zwiebel'), JSON.stringify(r.text));
});

test('ASCII-Markierung findet Text in Vollbreitenschrift (Grossschreibung bleibt egal)', () => {
  const r = run('zwiebel', 'Das Projekt Ｚｗｉｅｂｅｌ startet.');
  assert.ok(!r.text.includes('Ｚｗｉｅｂｅｌ'), JSON.stringify(r.text));
});

test('Markierung NFD (a + U+0308) findet Text in NFC', () => {
  const r = run('zz\u0061\u0308qyk', 'Code zz\u00e4qyk fertig');
  assert.ok(!r.text.includes('zz'), JSON.stringify(r.text));
});

test('Markierung NFC findet Text in NFD', () => {
  const r = run('zz\u00e4qyk', 'Code zz\u0061\u0308qyk fertig');
  assert.ok(!r.text.includes('zz'), JSON.stringify(r.text));
});

test('Markierung findet Text unabhaengig von Gross- und Kleinschreibung', () => {
  const r = run('Zwiebelbaum', 'ZWIEBELBAUM und zwiebelbaum');
  assert.ok(!/zwiebelbaum/i.test(r.text), JSON.stringify(r.text));
});

test('Eigene Variable (cvars) mit geschuetztem Leerzeichen im Muster wird ersetzt', () => {
  const v = 'zzq\u00a0yyk';
  const r = D.anonymize('Intern gilt ' + v + ' hier.', { ents, cvars: [{ n: 'PROJ', p: v }] });
  assert.ok(!r.text.includes('zzq'), JSON.stringify(r.text));
});

test('Eigene Variable (cvars) mit Vollbreitenzeichen im Muster wird ersetzt', () => {
  const v = 'ｚｚｑｙｙｋ';
  const r = D.anonymize('Intern gilt ' + v + ' hier.', { ents, cvars: [{ n: 'PROJ', p: v }] });
  assert.ok(!r.text.includes(v), JSON.stringify(r.text));
});

test('Wert aus dem Ergebnistext markiert (Weg Gegenpruefung, Maskieren) wird im zweiten Lauf ersetzt', () => {
  const v = 'Zwiebel\u00a0baum';
  const r1 = D.anonymize('Kennung: ' + v + ' ok', { ents: ['EMAIL'] });
  const r2 = run(v, r1.text);
  assert.ok(!r2.text.includes('Zwiebel'), JSON.stringify(r2.text));
});

test('Gegenpruefung findet einen Rest, den eine Markierung mit geschuetztem Leerzeichen betrifft', () => {
  const v = 'Zwiebel\u00a0baum', t = 'Das Projekt ' + v + ' startet.';
  const m = M.create(); M.add(m, { value: v, pfx: 'NAME' });
  const res = L.scan(t, { detect: (x) => D.detect(x, { ents, cvars: M.toCvars(m) }), whitelist: [] });
  assert.ok(res.count > 0, 'Gegenpruefung sollte den Rest finden: ' + JSON.stringify(res));
});

test('Richtlinienbegriff (list) mit geschuetztem Leerzeichen wird im normalisierten Text gefunden', () => {
  const v = 'zzq\u00a0yyk';
  const r = P.parse(JSON.stringify({ version: 1, name: 't', rules: [{ id: 'r1', label: 'x', type: 'list', category: 'PROJ', terms: [v] }] }));
  assert.ok(r.ok, JSON.stringify(r));
  const t = 'Intern gilt ' + v + ' hier.';
  const spans = P.toSpans(r.policy, D.normalizeForDetection(t), 'standard');
  assert.equal(spans.length, 1, 'Richtlinienbegriff nicht gefunden');
});

test('Richtlinienbegriff in Vollbreitenschrift wird im normalisierten Text gefunden', () => {
  const v = 'ｚｚｑｙｙｋ';
  const r = P.parse(JSON.stringify({ version: 1, name: 't', rules: [{ id: 'r1', label: 'x', type: 'list', category: 'PROJ', terms: [v] }] }));
  assert.ok(r.ok, JSON.stringify(r));
  const spans = P.toSpans(r.policy, D.normalizeForDetection('Intern gilt ' + v + ' hier.'), 'standard');
  assert.equal(spans.length, 1, 'Richtlinienbegriff nicht gefunden');
});
