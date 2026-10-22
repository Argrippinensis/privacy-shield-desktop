// K3: Koreferenz (PSLib.coref + PSDetect.anonymize) verbindet verschiedene Personen
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from '/tmp/triage/v2/tests/unit/_load.mjs';
const D = loadLib('detect'), C = loadLib('coref');
const anon = (t, o) => D.anonymize(t, Object.assign({ wordlists: true }, o));
function nameTokens(r) { return (r.text.match(/\{\{NAME_[0-9.A-Z]+\}\}/g) || []); }
function show(t) { const r = anon(t); console.log('   ', JSON.stringify(t), '\n    ->', JSON.stringify(r.text)); return r; }
const noLink = (r) => !/\{\{NAME_\d+\.(NACHNAME|VORNAME|KURZ)\}\}/.test(r.text);

test('K3a: Beispiel des Berichts (Ehemann)', () => {
  const r = show('Frau Anna Weber kommt. Ihr Ehemann Herr Weber wartet.');
  assert.ok(noLink(r), 'Herr Weber wurde mit Anna Weber verknuepft');
});
test('K3b: Ehefrau/Ehemann in anderer Reihenfolge', () => {
  const r = show('Herr Paul Weber kommt. Seine Ehefrau Frau Weber wartet.');
  assert.ok(noLink(r));
});
test('K3c: Geschwister/Eltern/Kind (andere Beziehungshinweise)', () => {
  for (const t of [
    'Frau Anna Weber kommt. Ihr Bruder Herr Weber wartet.',
    'Frau Anna Weber kommt. Ihr Vater Herr Weber wartet.',
    'Frau Anna Weber kommt. Ihr Sohn Weber wartet.',
    'Frau Anna Weber kommt. Der Ehemann, Weber, wartet.',
    'Frau Anna Weber kommt. Frau Weber senior wartet.',
  ]) { const r = show(t); assert.ok(noLink(r), t); }
});
test('K3d: Beziehungshinweis mit Vorname der zweiten Person: Herr Paul Weber (zwei VOLL-Personen) bleibt getrennt', () => {
  const r = show('Frau Anna Weber kommt. Ihr Ehemann Herr Paul Weber wartet. Weber sagt, Anna sei da.');
  console.log('    Zuordnung:', JSON.stringify(Object.entries(r.state.store).map(([k, v]) => [k, v.v])));
  // "Weber" allein ist mehrdeutig -> darf keiner der beiden zugeordnet werden
  assert.ok(!/\{\{NAME_\d+\.NACHNAME\}\}/.test(r.text), 'mehrdeutiges Weber verknuepft');
});
test('K3e: Gegenprobe (gewollte Verknuepfung): eine Person, spaeter nur Nachname, kein Beziehungshinweis', () => {
  const r = show('Frau Anna Weber kommt. Herr Weber... Frau Weber wartet.');
  console.log('    (informativ)');
});
test('K3f: Verknuepfung ueber Satzgrenzen hinweg bei klar verschiedener Anrede (Herr/Frau) mit gleichem Nachnamen', () => {
  const r = show('Anna Weber leitet das Team. Herr Weber ist neu.');
  assert.ok(noLink(r), 'Frau Anna Weber (Vorname weiblich) und Herr Weber verknuepft');
});
test('K3g: coref.link direkt: Anrede (Frau/Herr) wird gar nicht beachtet', () => {
  const t = 'Frau Anna Weber / Herr Weber';
  const spans = [{ pfx: 'NAME', start: 0, end: 15 }, { pfx: 'NAME', start: 18, end: 28 }];
  const res = C.link(spans, t);
  console.log('    ', JSON.stringify(res.map((s) => [t.slice(s.start, s.end), s.personKey, s.form])));
  assert.equal(res[1].personKey, null);
});
test('K3h: Rundlauf bleibt korrekt (mechanisch), d.h. Rundlauftest findet K3 nicht', () => {
  const t = 'Frau Anna Weber kommt. Ihr Ehemann Herr Weber wartet.';
  const r = anon(t);
  assert.equal(D.deanonymize(r.text, r.state), t);
});
test('K3i: gleicher Nachname, zweite Person mit ausgeschriebenem anderem Vornamen -> keine Verknuepfung (D24 greift)', () => {
  const r = show('Frau Anna Weber kommt. Herr Paul Weber wartet. Herr Weber geht.');
  assert.ok(!/\{\{NAME_\d+\.NACHNAME\}\}/.test(r.text));
});
