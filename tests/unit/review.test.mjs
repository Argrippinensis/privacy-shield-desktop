import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const R = loadLib('review');

// Hilfsfunktion: Spans fuer alle Vorkommen von value im Text
function spansOf(text, list) {
  const out = [];
  for (const [value, pfx] of list) {
    let i = -1;
    while ((i = text.indexOf(value, i + 1)) !== -1) out.push({ start: i, end: i + value.length, pfx });
  }
  return out;
}
const opts = (o = {}) => ({ tokenOf: () => null, released: [], whitelist: [], ...o });

test('drei Vorkommen desselben Namens ergeben einen Eintrag mit count 3', () => {
  const text = 'Anton Beispiel, Anton Beispiel und Anton Beispiel';
  const r = R.build(spansOf(text, [['Anton Beispiel', 'NAME']]), text, opts());
  assert.equal(r.length, 1);
  assert.equal(r[0].count, 3);
  assert.equal(r[0].key, 'NAME|Anton Beispiel');
  assert.equal(r[0].type, 'NAME');
  assert.equal(r[0].value, 'Anton Beispiel');
  assert.equal(r[0].firstStart, 0);
});

test('derselbe Wert mit zwei Typen bleibt zwei Eintraege', () => {
  const text = 'Berlin und Berlin';
  const spans = [
    { start: 0, end: 6, pfx: 'ORT' }, { start: 11, end: 17, pfx: 'ORG' },
  ];
  const r = R.build(spans, text, opts());
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(e => e.key).sort(), ['ORG|Berlin', 'ORT|Berlin']);
});

test('Sortierung nach TYPE_ORDER, dann Haeufigkeit, dann Position', () => {
  const text = 'a@x.de Zed Zed Abe Abe Abe Cy +49 1';
  const spans = [
    ...spansOf(text, [['a@x.de', 'EMAIL'], ['Zed', 'NAME'], ['Abe', 'NAME'], ['Cy', 'NAME']]),
  ];
  const r = R.build(spans, text, opts());
  assert.deepEqual(r.map(e => e.value), ['Abe', 'Zed', 'Cy', 'a@x.de']);
});

test('Gleichstand bei Typ und Haeufigkeit wird nach Position sortiert (stabil)', () => {
  const text = 'Mia Bo Al';
  const r = R.build(spansOf(text, [['Al', 'NAME'], ['Bo', 'NAME'], ['Mia', 'NAME']]), text, opts());
  assert.deepEqual(r.map(e => e.value), ['Mia', 'Bo', 'Al']);
});

test('unbekannte Typen stehen nach den bekannten, alphabetisch', () => {
  const text = 'q w e';
  const spans = [
    { start: 0, end: 1, pfx: 'ZZZ' }, { start: 2, end: 3, pfx: 'AAA' }, { start: 4, end: 5, pfx: 'PARAGRAF' },
  ];
  const r = R.build(spans, text, opts());
  assert.deepEqual(r.map(e => e.type), ['PARAGRAF', 'AAA', 'ZZZ']);
});

test('TYPE_ORDER entspricht der Spezifikation', () => {
  assert.deepEqual(R.TYPE_ORDER, ['NAME', 'ORG', 'ORT', 'ADRESSE', 'EMAIL', 'TEL', 'IBAN', 'BIC', 'KARTE', 'KONTO', 'KENNNR', 'DATUM', 'BETRAG', 'KFZ', 'IP', 'GERAET', 'STANDORT', 'ROLLE', 'MEDIZIN', 'SENSIBEL', 'PARAGRAF']);
});

test('examples: hoechstens 3, die ersten drei Vorkommen', () => {
  const text = 'eins Xy zwei Xy drei Xy vier Xy fuenf Xy';
  const r = R.build(spansOf(text, [['Xy', 'NAME']]), text, opts());
  assert.equal(r[0].count, 5);
  assert.equal(r[0].examples.length, 3);
  assert.ok(r[0].examples[0].includes('eins'));
  assert.ok(!r[0].examples.some(e => e.includes('fuenf')));
});

test('examples: hoechstens 60 Zeichen, gekuerzt auf 59 plus Ellipse', () => {
  const text = 'a'.repeat(50) + ' Xy ' + 'b'.repeat(50);
  const r = R.build(spansOf(text, [['Xy', 'NAME']]), text, opts());
  const e = r[0].examples[0];
  assert.ok(e.length <= 60);
  assert.equal(e.length, 60);
  assert.ok(e.endsWith('…'));
});

test('examples: Leerraum wird zu einem Leerzeichen zusammengezogen und getrimmt', () => {
  const text = 'vor\n\n\t  Xy \n nach';
  const r = R.build(spansOf(text, [['Xy', 'NAME']]), text, opts());
  assert.equal(r[0].examples[0], 'vor Xy nach');
});

test('decision: released gibt exakt frei, nicht bei anderer Schreibung', () => {
  const text = 'Berlin und berlin';
  const spans = [{ start: 0, end: 6, pfx: 'ORT' }, { start: 11, end: 17, pfx: 'ORT' }];
  const r = R.build(spans, text, opts({ released: [{ pfx: 'ORT', value: 'Berlin' }] }));
  const by = Object.fromEntries(r.map(e => [e.value, e.decision]));
  assert.equal(by['Berlin'], 'freigeben');
  assert.equal(by['berlin'], 'maskieren');
});

test('decision: released gilt nur fuer denselben Typ', () => {
  const text = 'Berlin';
  const r = R.build([{ start: 0, end: 6, pfx: 'ORG' }], text, opts({ released: [{ pfx: 'ORT', value: 'Berlin' }] }));
  assert.equal(r[0].decision, 'maskieren');
});

test('decision: whitelist wirkt als Teilzeichenfolge ohne Beachtung der Schreibung', () => {
  const text = 'Berliner Allee 5';
  const r = R.build([{ start: 0, end: 16, pfx: 'ADRESSE' }], text, opts({ whitelist: ['berlin'] }));
  assert.equal(r[0].decision, 'freigeben');
});

test('decision: ohne Treffer maskieren', () => {
  const text = 'Anton';
  const r = R.build([{ start: 0, end: 5, pfx: 'NAME' }], text, opts({ whitelist: ['xyz'] }));
  assert.equal(r[0].decision, 'maskieren');
});

test('token kommt ueber tokenOf(value, pfx), sonst null', () => {
  const text = 'Anton und a@x.de';
  const calls = [];
  const tokenOf = (v, p) => { calls.push([v, p]); return p === 'NAME' ? '[NAME_1]' : null; };
  const r = R.build(spansOf(text, [['Anton', 'NAME'], ['a@x.de', 'EMAIL']]), text, opts({ tokenOf }));
  assert.equal(r.find(e => e.type === 'NAME').token, '[NAME_1]');
  assert.equal(r.find(e => e.type === 'EMAIL').token, null);
  assert.ok(calls.some(c => c[0] === 'Anton' && c[1] === 'NAME'));
});

test('soft ist wahr fuer Zweifelstypen, sonst falsch', () => {
  const soft = ['NAME', 'ORG', 'ORT', 'ADRESSE', 'ROLLE', 'MEDIZIN', 'SENSIBEL'];
  const hard = ['EMAIL', 'TEL', 'IBAN', 'BIC', 'KARTE', 'KONTO', 'KENNNR', 'DATUM', 'BETRAG', 'KFZ', 'IP', 'GERAET', 'STANDORT', 'PARAGRAF'];
  const text = 'x'.repeat(30);
  const all = [...soft, ...hard];
  const spans = all.map((pfx, i) => ({ start: i, end: i + 1, pfx }));
  const r = R.build(spans, text, opts());
  for (const e of r) assert.equal(e.soft, soft.includes(e.type), e.type);
  assert.equal(r.length, all.length);
});

test('6000 Spans werden in unter 300 ms gebaut', () => {
  let text = '';
  const spans = [];
  for (let i = 0; i < 6000; i++) {
    const v = 'Person' + (i % 2000);
    spans.push({ start: text.length, end: text.length + v.length, pfx: i % 3 ? 'NAME' : 'ORT' });
    text += v + ' und ';
  }
  const t0 = performance.now();
  const r = R.build(spans, text, opts({ tokenOf: (v, p) => '[' + p + ']' }));
  const dt = performance.now() - t0;
  assert.ok(r.length > 0);
  assert.ok(dt < 300, 'Dauer ' + dt + ' ms');
});
