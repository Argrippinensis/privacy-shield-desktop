import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('/tmp/triage/v2/app/lib/placeholder.js');
const D = require('/tmp/triage/v2/app/lib/detect.js');
test('Geschwister: Variablenname mit Markup ergibt Platzhalter, der nicht als Platzhalter gilt (Rundlauf)', () => {
  const r = D.anonymize('Az ZZQ123 Ende', { ents: [], cvars: [{ n: '<B>TEST</B>', p: 'ZZQ\\d{3}' }], whitelist: [] });
  const ph = (r.text || r.anonymized || '').match(/\{\{[^}]*\}\}/);
  console.log('Platzhalter:', ph && ph[0], 'isToken:', ph && P.isToken(ph[0]));
  assert.ok(ph && P.isToken(ph[0]));
});
