// K2.fix: woertliche Platzhalter im Originaltext (PSLib.detect anonymize/deanonymize, PSLib.project).
// Rote Tests aus der Spezifikation; nur synthetische Werte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const D = loadLib('detect');
const P = loadLib('project');
const rt = (t, o) => { const r = D.anonymize(t, o); return { r, back: D.deanonymize(r.text, r.state) }; };

test('Kontrolle: Text ohne Platzhalter bleibt bitgleich (Ausgabe und Rueckuebersetzung)', () => {
  const t = 'Kontakt: test.person@example.invalid, Zweitadresse zweite.person@example.invalid. Tel. 089 123456.';
  const { r, back } = rt(t);
  assert.equal(r.text, 'Kontakt: {{EMAIL_2}}, Zweitadresse {{EMAIL_1}}. {{TEL_1}}');
  assert.equal(back, t);
});

test('Woertliches {{EMAIL_1}} nach echter Adresse: Original wird exakt wiederhergestellt', () => {
  const t = 'Kontakt: test.person@example.invalid. Bereits vorhanden: {{EMAIL_1}}.';
  const { back } = rt(t);
  assert.equal(back, t);
});

test('Woertliches {{EMAIL_1}} vor echter Adresse: Original wird exakt wiederhergestellt', () => {
  const t = 'Vorlage {{EMAIL_1}} ... Kontakt test.person@example.invalid.';
  const { back } = rt(t);
  assert.equal(back, t);
});

test('Neuer Platzhalter ueberspringt den reservierten woertlichen Platzhalter', () => {
  const t = 'Vorlage {{EMAIL_1}} ... Kontakt test.person@example.invalid.';
  const { r } = rt(t);
  assert.ok(!r.text.includes('Kontakt {{EMAIL_1}}'), 'neue Adresse darf nicht {{EMAIL_1}} erhalten');
  assert.equal(r.text.split('{{EMAIL_1}}').length - 1, 1, '{{EMAIL_1}} darf nur einmal (woertlich) vorkommen');
  assert.ok(!r.state.store['{{EMAIL_1}}'], 'woertlicher Platzhalter darf kein store-Schluessel sein');
});

test('Woertliches {{NAME_1}} mit echter Person: Original wird exakt wiederhergestellt', () => {
  const t = 'Vorlage: Frau {{NAME_1}} schreibt. Echte Person: Herr Hans Zwiebelbaum.';
  const { r, back } = rt(t);
  assert.equal(r.text.split('{{NAME_1}}').length - 1, 1);
  assert.equal(back, t);
});

test('Woertliches {{IBAN_1}} wird reserviert', () => {
  const t = 'Alt {{IBAN_1}} neu DE89 3704 0044 0532 0130 00.';
  assert.equal(rt(t).back, t);
});

test('Woertliches {{TEL_1}} wird reserviert', () => {
  const t = 'Alt {{TEL_1}} neu Tel. 089 123456.';
  assert.equal(rt(t).back, t);
});

test('Woertliches {{DATUM_1}} wird reserviert', () => {
  const t = 'Alt {{DATUM_1}} neu 12.03.2024.';
  assert.equal(rt(t).back, t);
});

test('Woertliche Platzhalter mehrerer Kategorien zugleich bleiben unterscheidbar', () => {
  const t = '{{EMAIL_1}} {{IBAN_1}} {{TEL_1}} {{DATUM_1}} / test.person@example.invalid DE89 3704 0044 0532 0130 00 Tel. 089 123456 12.03.2024';
  assert.equal(rt(t).back, t);
});

test('Woertliches Fremdtoken ohne Zuordnung bleibt bei der Rueckuebersetzung stehen', () => {
  const t = 'Mail test.person@example.invalid und Vorlage {{EMAIL_7}}.';
  assert.equal(rt(t).back, t);
});

test('Zweiter Durchlauf ueber bereits anonymisierten Text mit neuer Adresse: Rueckuebersetzung stellt Eingabe wieder her', () => {
  const r1 = D.anonymize('Mail test.person@example.invalid.');
  const t2 = r1.text + ' und neu: zweite.person@example.invalid';
  const r2 = D.anonymize(t2);
  assert.ok(!r2.text.includes('neu: {{EMAIL_1}}'), 'neue Adresse darf nicht {{EMAIL_1}} erhalten');
  assert.equal(D.deanonymize(r2.text, r2.state), t2);
});

test('state-Weitergabe: zweites Dokument mit woertlichem Platzhalter aus Dokument 1', () => {
  const st = D.createState();
  const d1 = 'Mail test.person@example.invalid.';
  const d2 = 'Hinweis: im ersten Dokument stand {{EMAIL_1}}; neu: zweite.person@example.invalid.';
  const r1 = D.anonymize(d1, { state: st });
  const r2 = D.anonymize(d2, { state: st });
  assert.equal(D.deanonymize(r1.text, st), d1);
  assert.equal(D.deanonymize(r2.text, st), d2);
});

test('state-Weitergabe: Dokument 1 mit woertlichem {{EMAIL_2}}, Dokument 2 vergibt neue Adressen', () => {
  const st = D.createState();
  const d1 = 'Platzhalter {{EMAIL_2}} und a.person@example.invalid.';
  const d2 = 'x.person@example.invalid und y.person@example.invalid.';
  const r1 = D.anonymize(d1, { state: st });
  const r2 = D.anonymize(d2, { state: st });
  assert.equal(D.deanonymize(r1.text, st), d1);
  assert.equal(D.deanonymize(r2.text, st), d2);
});

test('Zuordnung (store/cnt) eines Laufs reicht zur Wiederherstellung des Originals, auch nach JSON-Rundlauf', () => {
  const t = 'Kontakt: test.person@example.invalid. Bereits vorhanden: {{EMAIL_1}}.';
  const r = D.anonymize(t);
  const st = JSON.parse(JSON.stringify({ store: r.state.store, cnt: r.state.cnt }));
  assert.equal(D.deanonymize(r.text, st), t);
});

test('Span mit Platzhalter mitten im Wert: Rundlauf stimmt', () => {
  const t = 'Konto IBAN DE89 3704 0044 0532 0130 00 und Name Anna {{NAME_9}} Weber.';
  assert.equal(rt(t).back, t);
});

test('Projektmodus: Dokument 2 enthaelt woertlich einen Platzhalter, den Dokument 1 vergeben hat', async () => {
  const p = P.create({ shared: true });
  const d1 = 'Mail test.person@example.invalid.';
  const d2 = 'Im ersten Dokument stand {{EMAIL_1}}; neu: zweite.person@example.invalid.';
  P.add(p, { name: 'A.txt', text: d1 });
  P.add(p, { name: 'B.txt', text: d2 });
  const r = await P.run(p, { anonymize: D.anonymize });
  assert.equal(D.deanonymize(r.results[0].text, r.state), d1);
  assert.equal(D.deanonymize(r.results[1].text, r.state), d2);
});

test('Projektmodus: Dokument 1 enthaelt woertlich {{EMAIL_2}}, Dokument 2 vergibt Adressen (Vorab-Reservierung ueber alle Dokumente)', async () => {
  const p = P.create({ shared: true });
  const d1 = 'Platzhalter {{EMAIL_2}} und a.person@example.invalid.';
  const d2 = 'x.person@example.invalid und y.person@example.invalid.';
  P.add(p, { name: 'A.txt', text: d1 });
  P.add(p, { name: 'B.txt', text: d2 });
  const r = await P.run(p, { anonymize: D.anonymize });
  assert.equal(D.deanonymize(r.results[0].text, r.state), d1);
  assert.equal(D.deanonymize(r.results[1].text, r.state), d2);
});

test('Projektmodus: Rueckuebersetzung des Gesamtergebnisses aller Dokumente stellt jedes Original wieder her', async () => {
  const p = P.create({ shared: true });
  const docs = [
    'Kontakt test.person@example.invalid, Vorlage {{EMAIL_1}}.',
    'Vorlage {{TEL_1}} und Tel. 089 123456.',
    'Noch einmal test.person@example.invalid und {{EMAIL_2}} sowie zweite.person@example.invalid.',
  ];
  docs.forEach((t, i) => P.add(p, { name: 'D' + i + '.txt', text: t }));
  const r = await P.run(p, { anonymize: D.anonymize });
  r.results.forEach((res, i) => assert.equal(D.deanonymize(res.text, r.state), docs[i], 'Dokument ' + (i + 1)));
});
