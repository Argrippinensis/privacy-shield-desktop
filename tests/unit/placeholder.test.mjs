// PSLib.placeholder (F2, Punkt 3): ein Ort fuer die Platzhalter-Grammatik
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const P = loadLib('placeholder');

test('TOKEN_SOURCE hat den festgelegten Wortlaut', () => {
  assert.equal(P.TOKEN_SOURCE, '\\{\\{[A-ZÄÖÜ][A-ZÄÖÜ0-9_.\\-]{0,63}\\}\\}');
});

for (const t of ['{{NAME_1}}', '{{NAME_1_2}}', '{{NAME_1.NACHNAME}}', '{{VERTRAGSNR_3}}', '{{ÄRGER_1}}', '{{KUNDEN-NR_1}}']) {
  test(`isToken: ${t} ist ein Platzhalter`, () => {
    assert.equal(P.isToken(t), true);
  });
  test(`find: ${t} wird als einziger Treffer gefunden`, () => {
    assert.deepEqual(P.find('x ' + t + ' y'), [{ start: 2, end: 2 + t.length, token: t }]);
  });
}

const nicht = ['{{name_1}}', '{{ }}', '{{max@firma.de}}', '{{NAME_1}', '{NAME_1}', '{{}}', '{{A' + 'B'.repeat(64) + '}}'];
for (const t of nicht) {
  test(`isToken: ${t.length > 30 ? 'Muster mit 65 Zeichen im Inneren' : t} ist kein Platzhalter`, () => {
    assert.equal(P.isToken(t), false);
  });
}

test('find: kein Treffer in Texten ohne gueltigen Platzhalter', () => {
  assert.deepEqual(P.find(nicht.slice(0, 6).join(' ')), []);
});

test('isToken: Platzhalter mit 64 Zeichen im Inneren ist gueltig', () => {
  assert.equal(P.isToken('{{A' + 'B'.repeat(63) + '}}'), true);
});

test('isToken: Text um den Platzhalter herum ist kein Platzhalter', () => {
  assert.equal(P.isToken('Herr {{NAME_1}}'), false);
  assert.equal(P.isToken(''), false);
});

test('find: aneinandergrenzende {{A_1}}{{B_1}} ergeben zwei Treffer', () => {
  assert.deepEqual(P.find('{{A_1}}{{B_1}}'), [
    { start: 0, end: 7, token: '{{A_1}}' },
    { start: 7, end: 14, token: '{{B_1}}' },
  ]);
});

test('find: Treffer sind nach start sortiert und ueberlappungsfrei', () => {
  const r = P.find('a {{X_1}} b {{Y_2}} c {{Z_3}}');
  assert.equal(r.length, 3);
  for (let i = 1; i < r.length; i++) assert.ok(r[i].start >= r[i - 1].end);
});

test('mask: gleiche Laenge, kein {{ mehr, Rest unveraendert', () => {
  const t = 'Herr {{NAME_1}}, Tel {{TEL_1}}';
  const m = P.mask(t);
  assert.equal(m.length, t.length);
  assert.ok(!m.includes('{{'));
  assert.equal(m, 'Herr ' + '\u0000'.repeat(10) + ', Tel ' + '\u0000'.repeat(9));
});

test('mask: Standardmaske ist NUL (\\u0000)', () => {
  assert.equal(P.mask('{{A_1}}'), '\u0000'.repeat(7));
});

test('mask(t, "x") ersetzt durch x', () => {
  assert.equal(P.mask('Herr {{NAME_1}}, Tel {{TEL_1}}', 'x'), 'Herr xxxxxxxxxx, Tel xxxxxxxxx');
});

test('mask: Text ohne Platzhalter bleibt gleich', () => {
  assert.equal(P.mask('nichts {NAME_1} hier'), 'nichts {NAME_1} hier');
});
