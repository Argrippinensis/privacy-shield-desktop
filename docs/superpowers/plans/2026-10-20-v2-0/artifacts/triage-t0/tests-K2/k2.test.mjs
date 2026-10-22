// K2: literale Platzhalter im Original (v2/main, PSDetect.anonymize/deanonymize, PSLib.psmap)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from '/tmp/triage/v2/tests/unit/_load.mjs';
const D = loadLib('detect'), PS = loadLib('psmap');
const rt = (t, o) => { const r = D.anonymize(t, o); return { r, back: D.deanonymize(r.text, r.state) }; };

test('K2a: Beispiel des Berichts, E-Mail + woertliches {{EMAIL_1}}', () => {
  const t = 'Kontakt: test.person@example.invalid. Bereits vorhanden: {{EMAIL_1}}.';
  const { r, back } = rt(t);
  console.log('   anon :', JSON.stringify(r.text)); console.log('   back :', JSON.stringify(back));
  assert.equal(back, t);
});
test('K2b: Reihenfolge umgekehrt (woertliches Token zuerst)', () => {
  const t = 'Vorlage {{EMAIL_1}} ... Kontakt test.person@example.invalid.';
  const { r, back } = rt(t);
  console.log('   anon :', JSON.stringify(r.text)); console.log('   back :', JSON.stringify(back));
  assert.equal(back, t);
});
test('K2c: woertliches {{NAME_1}} und zwei verschiedene Personen (andere Kategorie als EMAIL)', () => {
  const t = 'Vorlage: Frau {{NAME_1}} schreibt. Echte Person: Herr Hans Zwiebelbaum.';
  const { r, back } = rt(t);
  console.log('   anon :', JSON.stringify(r.text)); console.log('   back :', JSON.stringify(back));
  assert.equal(back, t);
});
test('K2d: andere Kategorien (IBAN_1, TEL_1, DATUM_1) woertlich', () => {
  for (const [lit, real] of [['{{IBAN_1}}', 'DE89 3704 0044 0532 0130 00'], ['{{TEL_1}}', 'Tel. 089 123456'], ['{{DATUM_1}}', '12.03.2024']]) {
    const t = 'Alt ' + lit + ' neu ' + real + '.';
    const { r, back } = rt(t);
    console.log('   ' + lit + ' ->', JSON.stringify(r.text), '->', JSON.stringify(back));
    assert.equal(back, t, lit);
  }
});
test('K2e: mehrere Dokumente mit gemeinsamem state (Projektmodus): Doc 2 enthaelt woertlich ein Token aus Doc 1', () => {
  const st = D.createState();
  const d1 = 'Mail test.person@example.invalid.';
  const d2 = 'Hinweis: im ersten Dokument stand {{EMAIL_1}}; neu: zweite.person@example.invalid.';
  const r1 = D.anonymize(d1, { state: st });
  const r2 = D.anonymize(d2, { state: st });
  console.log('   r1:', JSON.stringify(r1.text), ' r2:', JSON.stringify(r2.text));
  assert.equal(D.deanonymize(r1.text, st), d1);
  assert.equal(D.deanonymize(r2.text, st), d2, 'Doc 2 nicht rueckgaengig machbar');
});
test('K2f: mehrere Dokumente: Doc 1 enthaelt woertlich {{EMAIL_2}}, Doc 2 vergibt EMAIL_2 neu (gemeinsamer state)', () => {
  const st = D.createState();
  const d1 = 'Platzhalter {{EMAIL_2}} und a.person@example.invalid.';
  const d2 = 'x.person@example.invalid und y.person@example.invalid.';
  const r1 = D.anonymize(d1, { state: st });
  const r2 = D.anonymize(d2, { state: st });
  console.log('   r1:', JSON.stringify(r1.text), ' r2:', JSON.stringify(r2.text));
  assert.equal(D.deanonymize(r1.text, st), d1);
  assert.equal(D.deanonymize(r2.text, st), d2);
});
test('K2g: .psmap-Rundlauf: Zuordnung verschluesseln, entschluesseln, damit zurueckuebersetzen (Original mit woertlichem Token)', async () => {
  const t = 'Kontakt: test.person@example.invalid. Bereits vorhanden: {{EMAIL_1}}.';
  const r = D.anonymize(t);
  const bytes = await PS.encrypt({ store: r.state.store, cnt: r.state.cnt }, 'passwort-12345', { iterations: 100000 });
  const p = await PS.decrypt(bytes, 'passwort-12345');
  const back = D.deanonymize(r.text, { store: p.store });
  console.log('   psmap store:', JSON.stringify(p.store));
  assert.equal(back, t);
});
test('K2h: .psmap aus dem ersten Lauf auf KI-Antwort anwenden, in der ein woertliches Token vorkommt, das NICHT zur Zuordnung gehoert', () => {
  const t = 'Mail test.person@example.invalid.';
  const r = D.anonymize(t);
  const ai = 'Antwort ' + r.text + ' und ein Fremdtoken {{EMAIL_7}}.';
  const back = D.deanonymize(ai, r.state);
  assert.ok(back.includes('{{EMAIL_7}}'));
});
test('K2i: Wert im Original, der selbst wie ein Token aussieht und erkannt wird (Span enthaelt Token): tok() streicht Token aus dem Wert', () => {
  const t = 'Konto IBAN DE89 3704 0044 0532 0130 00 und Name Anna {{NAME_9}} Weber.';
  const { r, back } = rt(t);
  console.log('   anon :', JSON.stringify(r.text)); console.log('   back :', JSON.stringify(back));
  assert.equal(back, t);
});
test('K2j: Doppelter Lauf (bereits anonymisierter Text nochmals): Rundlauf des zweiten Laufs', () => {
  const t = 'Herr Hans Zwiebelbaum, test.person@example.invalid';
  const r1 = D.anonymize(t);
  const r2 = D.anonymize(r1.text + ' und neu: zweite.person@example.invalid');
  const back2 = D.deanonymize(r2.text, r2.state);
  console.log('   r1:', JSON.stringify(r1.text), ' r2:', JSON.stringify(r2.text), ' back2:', JSON.stringify(back2));
  assert.equal(back2, r1.text + ' und neu: zweite.person@example.invalid');
});
