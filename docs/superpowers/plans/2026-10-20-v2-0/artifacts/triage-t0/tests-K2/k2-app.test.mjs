// K2 App-Test: APP=/tmp/triage/v2 oder /tmp/triage/v18; Rundlauf ueber anon() und deanon()
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame } from '/tmp/triage/v2/tests/helpers.mjs';
const APP = process.env.APP || '/tmp/triage/v2';
test('K2 App ' + APP + ': Rundlauf mit woertlichem {{EMAIL_1}}', async () => {
  const a = await launchApp({ appDir: APP });
  try {
    const f = await toolFrame(a.win);
    const t = 'Kontakt: test.person@example.invalid. Bereits vorhanden: {{EMAIL_1}}.';
    const r = await f.evaluate(async (t) => {
      document.getElementById('IT').value = t;
      aiCache = { key: null, spans: [] };
      await anon();
      const at = document.getElementById('AT').value;
      document.getElementById('AR').value = at;
      deanon();
      return { at, rt: document.getElementById('RT').value };
    }, t);
    console.log('   AT =', JSON.stringify(r.at), '\n   RT =', JSON.stringify(r.rt));
    assert.equal(r.rt, t);
  } finally { await a.close(); }
});
