// C2.w, rote Tests: Verknuepfung derselben Person in PSDetect.anonymize (V2-C, Abschnitt C2.w; D19 Platzhalterformat mit Endung,
// D24: personKey null = keine Verknuepfung, Span laeuft wie bisher durch tok()).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const D = () => loadLib('detect');
const OPT = { wordlists: true };
const run = (t) => { const r = D().anonymize(t, OPT); return { ...r, back: D().deanonymize(r.text, r.state) }; };

test('Hans Mueller und Herr Mueller: VOLL und NACHNAME teilen die Nummer', () => {
  const t = 'Hans Müller wohnt in Berlin. Herr Müller zahlt.';
  const r = run(t);
  assert.equal(r.text, '{{NAME_1}} wohnt in {{ORT_1}}. Herr {{NAME_1.NACHNAME}} zahlt.');
  assert.equal(r.back, t);
});

test('Frau Dr. Anna Weber, Frau Weber, Anna: VOLL, NACHNAME und VORNAME mit gleicher Nummer', () => {
  const t = 'Frau Dr. Anna Weber ist Ärztin. Frau Weber hat angerufen. Anna kommt morgen.';
  const r = run(t);
  assert.equal(r.text, 'Frau {{NAME_1}} ist Ärztin. Frau {{NAME_1.NACHNAME}} hat angerufen. {{NAME_1.VORNAME}} kommt morgen.');
  assert.equal(r.back, t);
});

test('zwei Personen mit Nachnamen Mueller: nichts wird verknuepft, Ergebnis wie bisher', () => {
  const t = 'Heike Müller und Hans Müller waren da. Herr Müller sagte nichts. H. Müller blieb.';
  const r = run(t);
  assert.equal(r.text, '{{NAME_4}} und {{NAME_3}} waren da. Herr {{NAME_2}} sagte nichts. {{NAME_1}} blieb.');
  assert.equal(r.back, t);
});

test('store enthaelt je Platzhalter mit Endung die Schreibweise, Typ NAME, Farbe und Methode', () => {
  const r = run('Hans Müller wohnt in Berlin. Herr Müller zahlt.');
  const e = r.state.store['{{NAME_1.NACHNAME}}'];
  assert.ok(e, 'Eintrag fuer {{NAME_1.NACHNAME}} fehlt');
  assert.equal(e.v, 'Müller');
  assert.equal(e.t, 'NAME');
  assert.equal(typeof e.c, 'string');
  assert.equal(typeof e.m, 'string');
  assert.equal(r.state.store['{{NAME_1}}'].v, 'Hans Müller');
});

test('Nummerierung ohne Luecken: verknuepfte Person verbraucht genau eine NAME-Nummer', () => {
  const r = run('Hans Müller kam. Herr Müller ging. Anna Weber blieb.');
  assert.equal(r.state.cnt.NAME, 2);
  const nums = Object.keys(r.state.store).map((k) => k.match(/^\{\{NAME_(\d+)/)).filter(Boolean).map((m) => Number(m[1]));
  assert.deepEqual([...new Set(nums)].sort(), [1, 2]);
});

test('Text ohne verknuepfbare Formen liefert dasselbe wie bisher (zwei verschiedene Personen, kein Punkt im Platzhalter)', () => {
  const t = 'Hans Müller und Anna Müller. Herr Müller kam.';
  const r = run(t);
  assert.equal(r.text, '{{NAME_3}} und {{NAME_2}}. Herr {{NAME_1}} kam.');
  assert.ok(!/\{\{NAME_\d+\./.test(r.text));
  assert.equal(r.back, t);
});

test('Rundlauf VOLL, NACHNAME, VORNAME, KURZ: deanonymize ergibt den Originaltext und alle Formen sind verknuepft', () => {
  const t = 'Hans Müller kam. Herr Müller ging. H. Müller blieb. Hans sagte nichts.';
  const r = run(t);
  assert.equal(r.back, t);
  assert.match(r.text, /\{\{NAME_1\}\}/);
  assert.match(r.text, /\{\{NAME_1\.NACHNAME\}\}/);
  assert.match(r.text, /\{\{NAME_1\.VORNAME\}\}/);
  assert.match(r.text, /\{\{NAME_1\.KURZ\}\}/);
});

test('Rundlauf mit Genitiv: Weber und Webers, exakte Rueckuebersetzung', () => {
  const t = 'Anna Weber kam. Frau Weber ging. Webers Tasche blieb liegen.';
  const r = run(t);
  assert.equal(r.back, t);
  assert.match(r.text, /\{\{NAME_1\.NACHNAME\}\}/);
});

test('zwei verschiedene Personen mit gleichem Nachnamen: alleinstehender Nachname und Kurzform ohne falsche Verknuepfung', () => {
  const t = 'Hans Müller und Heike Müller kamen. Herr Müller blieb. H. Müller ging.';
  const r = run(t);
  assert.equal(r.back, t);
  assert.ok(!/\{\{NAME_\d+\.(NACHNAME|KURZ)\}\}/.test(r.text), r.text);
});

test('Vorname einer Person, die zweimal als Nachname auftritt, erzeugt keine Verknuepfung mit der falschen Person', () => {
  const t = 'Hans Müller und Anna Müller. Herr Müller. Hans lacht.';
  const r = run(t);
  assert.equal(r.back, t);
  // Hans ist eindeutig die VOLL-Person Hans Mueller, der alleinstehende Nachname jedoch nicht eindeutig
  assert.ok(!/Herr \{\{NAME_\d+\.NACHNAME\}\}/.test(r.text), r.text);
  assert.match(r.text, /\{\{NAME_\d+\.VORNAME\}\} lacht/);
});

test('Namen in verschiedenen Absaetzen werden verknuepft, Rundlauf exakt', () => {
  const t = 'Anna Weber kam.\n\nFrau Weber ging. Anna blieb.\n\nEnde.';
  const r = run(t);
  assert.equal(r.back, t);
  assert.match(r.text, /^\{\{NAME_1\}\} kam\.\n\nFrau \{\{NAME_1\.NACHNAME\}\} ging\. \{\{NAME_1\.VORNAME\}\} blieb\.\n\nEnde\.$/);
});

test('bereits vorhandene Platzhalter im Text werden nicht mit vergebenen verwechselt', () => {
  const t = 'Vorlage {{NAME_1}} und {{ORT_1}}. Hans Müller kam. Herr Müller ging.';
  const r = run(t);
  assert.match(r.text, /Vorlage \{\{NAME_1\}\} und \{\{ORT_1\}\}\./, 'vorhandene Platzhalter bleiben unveraendert');
  assert.match(r.text, /\{\{NAME_\d+\.NACHNAME\}\}/);
  // die vergebene Nummer darf nicht die des vorhandenen Platzhalters sein
  const num = r.text.match(/\{\{NAME_(\d+)\.NACHNAME\}\}/)[1];
  assert.notEqual(num, '1');
  assert.equal(r.back, t);
});

test('Dokument ohne Namen: keine Endungs-Platzhalter, Rundlauf exakt', () => {
  const t = 'Rechnung an max@beispiel.de, IBAN DE89370400440532013000.';
  const r = run(t);
  assert.ok(!/\{\{[A-Z]+_\d+\.[A-Z]+\}\}/.test(r.text));
  assert.equal(r.back, t);
});

// ---- Weitergabe von state von Lauf zu Lauf (Projektmodus, mehrere Dateien) ----
// Ein mehrdeutiger Nachname/Initial (personKey null) darf nicht ueber den Rueckwaertsindex Wert-zu-Token auf einen
// frueheren Endungs-Platzhalter gelegt werden, der eine bestimmte andere Person meint.
function runs(texts) {
  const state = D().createState();
  return texts.map((t) => {
    const r = D().anonymize(t, { ...OPT, state });
    return { in: t, text: r.text, back: D().deanonymize(r.text, state) };
  });
}
const ENDUNG = /\{\{NAME_\d+\.[A-Z]+\}\}/;

test('Zwei Laeufe: mehrdeutiger Nachname im zweiten Lauf (zwei Mueller) erhaelt keinen Endungs-Platzhalter des ersten Laufs', () => {
  const [a, b] = runs(['Hans Müller wohnt hier. Herr Müller kam.', 'Hans Müller wohnt hier. Peter Müller wohnt hier. Herr Müller kam.']);
  assert.match(a.text, /Herr \{\{NAME_1\.NACHNAME\}\}/, 'Lauf 1 verknuepft eindeutig');
  assert.ok(!ENDUNG.test(b.text), b.text);
  assert.equal(a.back, a.in);
  assert.equal(b.back, b.in);
});

test('Zwei Laeufe: zwei Schmidt im zweiten Lauf, Herr Schmidt bleibt ohne Endung statt auf die Person aus Lauf 1 zu zeigen', () => {
  const [a, b] = runs(['Hans Schmidt kam. Herr Schmidt ging.', 'Heike Schmidt kam. Hans Schmidt kam. Herr Schmidt ging.']);
  assert.match(a.text, /Herr \{\{NAME_1\.NACHNAME\}\}/);
  assert.ok(!ENDUNG.test(b.text), b.text);
  assert.equal(a.back, a.in);
  assert.equal(b.back, b.in);
});

test('Zwei Laeufe: Rueckweg ueber beide Laeufe mit gemeinsamem state ist exakt, auch bei mehrdeutigem Span', () => {
  const state = D().createState();
  const t1 = 'Hans Müller wohnt hier. Herr Müller kam.';
  const t2 = 'Hans Müller wohnt hier. Peter Müller wohnt hier. Herr Müller kam.';
  const r1 = D().anonymize(t1, { ...OPT, state });
  const r2 = D().anonymize(t2, { ...OPT, state });
  assert.equal(D().deanonymize(r1.text, state), t1);
  assert.equal(D().deanonymize(r2.text, state), t2);
});

test('Gegenprobe: dieselbe, nun eindeutige Person kehrt im Folgelauf mit stabiler Nummer wieder', () => {
  const [a, b] = runs(['Hans Müller wohnt hier. Herr Müller kam.', 'Hans Müller kam wieder. Herr Müller ging.']);
  assert.equal(a.text, '{{NAME_1}} wohnt hier. Herr {{NAME_1.NACHNAME}} kam.');
  assert.equal(b.text, '{{NAME_1}} kam wieder. Herr {{NAME_1.NACHNAME}} ging.');
  assert.equal(a.back, a.in);
  assert.equal(b.back, b.in);
});

test('Gegenprobe: im Folgelauf neu hinzukommende Person erhaelt eine neue Nummer, die alte Person behaelt ihre', () => {
  const [, b] = runs(['Hans Müller wohnt hier. Herr Müller kam.', 'Hans Müller und Anna Weber. Frau Weber sprach.']);
  assert.match(b.text, /^\{\{NAME_1\}\} und \{\{NAME_2\}\}\. Frau \{\{NAME_2\.NACHNAME\}\} sprach\.$/);
  assert.equal(b.back, b.in);
});

test('Drei Laeufe: eindeutig, dann mehrdeutig, dann wieder eindeutig; keine Fehlverknuepfung, Nummern stabil, Rueckweg exakt', () => {
  const [a, b, c] = runs([
    'Hans Müller wohnt hier. Herr Müller kam.',
    'Hans Müller wohnt hier. Peter Müller wohnt hier. Herr Müller kam.',
    'Hans Müller kam wieder. Herr Müller ging.',
  ]);
  assert.match(a.text, /^\{\{NAME_1\}\} wohnt hier\. Herr \{\{NAME_1\.NACHNAME\}\} kam\.$/);
  assert.ok(!ENDUNG.test(b.text), b.text);
  assert.match(c.text, /^\{\{NAME_1\}\} kam wieder\. Herr \{\{NAME_1\.NACHNAME\}\} ging\.$/);
  for (const r of [a, b, c]) assert.equal(r.back, r.in);
});

test('Drei Laeufe: mehrdeutige Initiale im dritten Lauf erhaelt kein .KURZ der Person aus dem ersten Lauf', () => {
  const [a, , c] = runs([
    'Hans Müller wohnt hier. H. Müller kam.',
    'Anna Weber kam.',
    'Hans Müller und Heike Müller. H. Müller schwieg.',
  ]);
  assert.match(a.text, /\{\{NAME_1\.KURZ\}\}/);
  assert.ok(!/\{\{NAME_\d+\.KURZ\}\}/.test(c.text), c.text);
  for (const r of runs(['Hans Müller wohnt hier. H. Müller kam.', 'Anna Weber kam.', 'Hans Müller und Heike Müller. H. Müller schwieg.'])) assert.equal(r.back, r.in);
});
