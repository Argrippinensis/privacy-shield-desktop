// Ratsche fuer die Erkennungsqualitaet: Lecks (nicht maskierte personenbezogene Werte) und Falsch-Maskierungen
// duerfen gegenueber tests/eval/baseline.json nie zunehmen. Verbesserungen: npm run eval:baseline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { runEval, BASELINE } from './eval/run-eval.mjs';

test('Erkennungsqualitaet faellt gegenueber der Baseline nicht zurueck', async () => {
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const results = await runEval({ withAI: true });
  const problems = [];
  const better = [];
  for (const sum of results) {
    const b = base[sum.mode];
    assert.ok(b, 'Baseline fuer Modus fehlt: ' + sum.mode);
    for (const [cat, v] of Object.entries(sum.cases)) {
      const allowed = b.cases[cat] ?? 0;
      if (v.leaked > allowed) problems.push(`${sum.mode}/${cat}: ${v.leaked} > ${allowed} (${v.ids.join(' ')})`);
      if (v.leaked < allowed) better.push(`${sum.mode}/${cat}: ${v.leaked} < ${allowed}`);
    }
    if (sum.synthLeaked > b.synthLeaked) problems.push(`${sum.mode}/synthetisch: ${sum.synthLeaked} > ${b.synthLeaked}`);
    if (sum.synthLeaked < b.synthLeaked) better.push(`${sum.mode}/synthetisch: ${sum.synthLeaked} < ${b.synthLeaked}`);
  }
  if (better.length) console.log('  Verbessert (Baseline mit "npm run eval:baseline" nachziehen):', better.join('; '));
  assert.deepEqual(problems, [], 'Erkennung verschlechtert: ' + problems.join(' | '));
});
