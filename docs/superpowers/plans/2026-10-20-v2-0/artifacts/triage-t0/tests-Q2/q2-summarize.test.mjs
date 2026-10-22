// Q2 roter Test (Teil 1): summarize() aus tests/eval/run-eval.mjs. Aufruf: ROOT=/tmp/triage/v2 (oder v18) node --test q2-summarize.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
const ROOT = process.env.ROOT || '/tmp/triage/v2';
const V18 = ROOT.includes('v18');
const { summarize } = await import(ROOT + '/tests/eval/run-eval.mjs');

// synthetische Werte, keine echten Personen
const FRAG = 'anna.beispiel@example.invalid';
test('Q2a Handfall: Teilrest "anna.beispiel" vor dem Platzhalter -> muss als undicht zaehlen', { skip: V18 && 'v18: summarize nimmt keine eigenen Faelle, Zeile 39 hat dieselbe includes-Logik' }, () => {
  const cases = [['x1', 'EMAIL', 'Mail: ' + FRAG, [FRAG], 'standard']];
  const caseRes = [{ key: 'x1', out: 'Mail: anna.beispiel{{EMAIL_1}}', tokens: 1 }];
  const s = summarize('t', caseRes, [], [], cases);
  console.log('  Handfall leaked =', s.cases.EMAIL.leaked, 'von', s.cases.EMAIL.total);
  assert.equal(s.cases.EMAIL.leaked, 1);
});
function synth(docs, out) {
  // v18: summarize iteriert fest ueber CASES -> alle Handfaelle mit leerer Ausgabe bereitstellen
  if (V18) {
    return import(ROOT + '/tests/eval/cases.mjs').then(async (m) => { const g = await import(ROOT + '/tests/eval/cases-gdpr.mjs'); return summarize('t', [...m.CASES, ...g.GDPR].map(([id]) => ({ key: id, out: '', tokens: 0 })), [{ out }], docs); });
  }
  return summarize('t', [], [{ key: 'syn0', out }], docs, []);
}
test('Q2b Synthetik: Teilrest "anna.beispiel" bei vorhandenem Platzhalter -> muss als undicht zaehlen', async () => {
  const s = await synth([{ truth: [{ type: 'EMAIL', frags: [FRAG] }] }], 'Mail: anna.beispiel{{EMAIL_1}}');
  console.log('  synthLeaked =', s.synthLeaked, 'von', s.synthTotal);
  assert.equal(s.synthLeaked, 1);
});
test('Q2c Synthetik: IBAN, Fragment nur die letzten 9 Zeichen; Kopf der IBAN bleibt stehen -> muss undicht zaehlen', async () => {
  const iban = 'DE00 1234 5678 9012 3456 78'; // erfunden
  const s = await synth([{ truth: [{ type: 'IBAN', frags: [iban.slice(-9)] }] }], 'IBAN: DE00 1234 5678 9012 {{IBAN_1}}');
  console.log('  synthLeaked =', s.synthLeaked, 'von', s.synthTotal);
  assert.equal(s.synthLeaked, 1);
});
