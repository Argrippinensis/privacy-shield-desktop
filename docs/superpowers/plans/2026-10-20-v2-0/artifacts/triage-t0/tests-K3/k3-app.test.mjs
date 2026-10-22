// K3 App-Test: APP=/tmp/triage/v2 oder /tmp/triage/v18
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame } from '/tmp/triage/v2/tests/helpers.mjs';
const APP = process.env.APP || '/tmp/triage/v2';
test('K3 App ' + APP + ': Ehemann-Beispiel', async () => {
  const a = await launchApp({ appDir: APP });
  try {
    const f = await toolFrame(a.win);
    const t = 'Frau Anna Weber kommt. Ihr Ehemann Herr Weber wartet.';
    const r = await f.evaluate(async (t) => {
      document.getElementById('IT').value = t;
      aiCache = { key: null, spans: [] };
      await anon();
      return { at: document.getElementById('AT').value, st: Object.entries(store).map(([k, v]) => [k, v.v]) };
    }, t);
    console.log('   AT =', JSON.stringify(r.at), JSON.stringify(r.st));
    assert.ok(!/\{\{NAME_\d+\.NACHNAME\}\}/.test(r.at), 'Herr Weber mit Anna Weber verknuepft');
  } finally { await a.close(); }
});
