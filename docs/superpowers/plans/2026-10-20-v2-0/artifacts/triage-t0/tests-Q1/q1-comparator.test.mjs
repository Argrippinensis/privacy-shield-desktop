// Q1 roter Test: ein genehmigter Fall darf nicht beliebig weiterwandern; fehlender Fall darf nie ueber Ausnahme freigegeben werden
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { compareItems } = await import('/tmp/triage/v2/tests/eval/diff-reference.mjs');
const ref = JSON.parse(fs.readFileSync('/tmp/triage/v2/tests/golden/reference-v1.8.json', 'utf8')).items;
const allow = JSON.parse(fs.readFileSync('/tmp/triage/v2/tests/golden/reference-allow.json', 'utf8'));
const f = (mode, key) => ref.find((i) => i.mode === mode && i.key === key);
const GARBAGE = { outSha256: '0'.repeat(64), storeSha256: '1'.repeat(64), entities: 0 };

test('Q1a: erlaubter Fall w1/n12 mit voellig anderer Ausgabe und leerer Zuordnung wird NICHT als Abweichung gemeldet (Erwartung: gemeldet)', () => {
  const cur = [{ ...f('w1', 'n12'), ...GARBAGE }];
  const r = compareItems([f('w1', 'n12')], cur, allow);
  console.log('  Abweichungen:', r.deviations.length, 'erlaubt:', r.allowed.map((a) => a.line));
  assert.equal(r.deviations.length, 1);
});
test('Q1b: erlaubter Fall w1/n12 fehlt im aktuellen Lauf ganz -> wird ueber Ausnahme freigegeben (Erwartung: Abweichung)', () => {
  const r = compareItems([f('w1', 'n12')], [], allow);
  console.log('  Abweichungen:', r.deviations.length, 'erlaubt:', r.allowed.map((a) => a.line));
  assert.equal(r.deviations.length, 1);
});
test('Q1c: Eintrag ohne reason wird vom Comparator akzeptiert (Unit-Test verlangt reason, Comparator nicht)', () => {
  const cur = [{ ...f('w1', 'n12'), ...GARBAGE }];
  const r = compareItems([f('w1', 'n12')], cur, [{ mode: 'w1', key: 'n12' }]);
  console.log('  Abweichungen:', r.deviations.length);
  assert.equal(r.deviations.length, 1);
});
