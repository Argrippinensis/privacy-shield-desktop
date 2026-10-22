// E1 Geschwister: gleiche Ursache (Muster aus Originalzeichen, Suche im normalisierten Text)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from '/tmp/triage/v2/tests/unit/_load.mjs';
const M = loadLib('marks'), D = loadLib('detect'), P = loadLib('policy');
test('Sib1: Richtlinie (list) mit NBSP im Begriff, Text wie in der App normalisiert', () => {
  const v = 'zzq yyk';
  const r = P.parse(JSON.stringify({ version: 1, name: 't', rules: [{ id: 'r1', label: 'x', type: 'list', category: 'PROJ', terms: [v] }] }));
  assert.ok(r.ok, JSON.stringify(r));
  const t = 'Intern gilt ' + v + ' hier.';
  const spans = P.toSpans(r.policy, D.normalizeForDetection(t), 'standard');
  assert.equal(spans.length, 1, 'Richtlinienbegriff mit NBSP nicht gefunden');
});
test('Sib2: Whitelist-Eintrag mit NBSP gibt Treffer nicht frei (nur zur Info: Richtung)', () => {
  const t = 'Kontakt Anna Zwiebelbaum heute.';
  const a = D.detect(t, { whitelist: [] }).length;
  const b = D.detect(t, { whitelist: ['Anna Zwiebelbaum'] }).length;
  console.log('   Treffer ohne/mit Whitelist(NBSP):', a, b);
  assert.ok(b < a, 'Whitelist mit NBSP wirkt nicht');
});
test('Sib3: Markierung NFD (a + U+0308) gegen Text NFC (und umgekehrt)', () => {
  const nfc = 'zzäqyk', nfd = 'zzäqyk';
  for (const [mv, tv] of [[nfd, nfc], [nfc, nfd]]) {
    const m = M.create(); M.add(m, { value: mv, pfx: 'NAME' });
    const r = D.anonymize('Code ' + tv + ' fertig', { ents: [], cvars: M.toCvars(m) });
    assert.ok(!r.text.includes('zz'), 'NFC/NFD-Unterschied: ' + JSON.stringify(r.text));
  }
});
test('Sib4: Markierung "zzqyyk" trifft nicht "zzqyyks" (Genitiv) und nicht in Wortgrenzen', () => {
  const m = M.create(); M.add(m, { value: 'zzqyyk', pfx: 'NAME' });
  const r = D.anonymize('Der Code zzqyyks gilt', { ents: [], cvars: M.toCvars(m) });
  console.log('   Genitiv:', JSON.stringify(r.text));
  assert.ok(!r.text.includes('zzqyyk'));
});
test('Sib5: Markierung Gross-/Kleinschreibung', () => {
  const m = M.create(); M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' });
  const r = D.anonymize('ZWIEBELBAUM und zwiebelbaum', { ents: [], cvars: M.toCvars(m) });
  console.log('   Case:', JSON.stringify(r.text));
});
