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
