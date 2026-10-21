// compareItems aus tests/eval/diff-reference.mjs (F2, Punkt 0) mit erfundenen Elementen
import test from 'node:test';
import assert from 'node:assert/strict';

const { compareItems } = await import('../eval/diff-reference.mjs');

const item = (mode, key, o = {}) => ({ mode, key, profile: 'standard', inputSha256: 'a'.repeat(64), outSha256: 'b'.repeat(64), storeSha256: 'c'.repeat(64), entities: 3, ...o });
const ref = () => [item('w0', 'k1'), item('w0', 'k2'), item('w1', 'k1')];
const has = (list, s) => JSON.stringify(list).includes(s);

test('compareItems: gleiche Elemente ergeben keine Abweichung', () => {
  const r = compareItems(ref(), ref(), []);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.allowed.length, 0);
  assert.equal(r.unused.length, 0);
});

test('compareItems: geaenderter outSha256 ergibt genau eine Abweichung', () => {
  const cur = ref(); cur[1] = item('w0', 'k2', { outSha256: 'd'.repeat(64) });
  const r = compareItems(ref(), cur, []);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'k2'));
});

test('compareItems: Abweichung mit Eintrag {mode, key} ist erlaubt', () => {
  const cur = ref(); cur[1] = item('w0', 'k2', { outSha256: 'd'.repeat(64) });
  const r = compareItems(ref(), cur, [{ mode: 'w0', key: 'k2', reason: 'Test, Paket X' }]);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.allowed.length, 1);
  assert.equal(r.unused.length, 0);
});

test('compareItems: Eintrag {mode, key: "*"} deckt alle Schluessel des Modus', () => {
  const cur = [item('w0', 'k1', { outSha256: 'd'.repeat(64) }), item('w0', 'k2', { storeSha256: 'e'.repeat(64) }), item('w1', 'k1')];
  const r = compareItems(ref(), cur, [{ mode: 'w0', key: '*', reason: 'Test' }]);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.allowed.length, 2);
});

test('compareItems: Eintrag {mode: "*", key: "*"} deckt alles', () => {
  const cur = [item('w0', 'k1', { outSha256: 'd'.repeat(64) }), item('w0', 'k2'), item('w1', 'k1', { entities: 9 })];
  const r = compareItems(ref(), cur, [{ mode: '*', key: '*', reason: 'Test' }]);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.allowed.length, 2);
});

test('compareItems: Eintrag fuer anderen Modus erlaubt die Abweichung nicht', () => {
  const cur = ref(); cur[1] = item('w0', 'k2', { outSha256: 'd'.repeat(64) });
  const r = compareItems(ref(), cur, [{ mode: 'w1', key: 'k2', reason: 'Test' }]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.unused.length, 1);
});

test('compareItems: fehlendes Element im aktuellen Lauf ist eine Abweichung "fehlt"', () => {
  const cur = ref().slice(0, 2);
  const r = compareItems(ref(), cur, []);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'fehlt'));
  assert.ok(has(r.deviations, 'k1'));
});

test('compareItems: unused listet nicht benutzte Eintraege', () => {
  const allow = [{ mode: 'w0', key: 'k1', reason: 'ungenutzt' }, { mode: 'ki', key: '*', reason: 'auch ungenutzt' }];
  const r = compareItems(ref(), ref(), allow);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.unused.length, 2);
});

test('compareItems: geaenderter storeSha256 ist eine Abweichung', () => {
  const cur = ref(); cur[0] = item('w0', 'k1', { storeSha256: 'f'.repeat(64) });
  assert.equal(compareItems(ref(), cur, []).deviations.length, 1);
});

test('compareItems: geaenderter inputSha256 ist eine Abweichung (Eingabe abweichend)', () => {
  const cur = ref(); cur[0] = item('w0', 'k1', { inputSha256: 'f'.repeat(64) });
  const r = compareItems(ref(), cur, []);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'eingabe'));
});
