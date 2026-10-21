// C2.m: Verknuepfung derselben Person (PSLib.coref.link). Rote Tests aus der Spezifikation V2-C, Abschnitt C2.m.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const coref = loadLib('coref');

// Spans aus Teilstrings bauen: je Eintrag [Teilstring] oder [Teilstring, Typ]; Suche laeuft von links nach rechts weiter.
function mk(text, items) {
  let from = 0;
  return items.map((it) => {
    const [s, pfx = 'NAME'] = Array.isArray(it) ? it : [it];
    const start = text.indexOf(s, from);
    assert.ok(start >= 0, 'Teilstring nicht gefunden: ' + s);
    from = start + s.length;
    return { start, end: from, pfx };
  });
}
const keys = (r) => r.map((s) => s.personKey);
const forms = (r) => r.map((s) => s.form);

test('Hans Mueller, Herr Mueller, Muellers Auto: Schluessel hans|mueller, Formen VOLL/NACHNAME/NACHNAME', () => {
  const text = 'Hans Müller wohnt hier. Herr Müller zahlt. Müllers Auto steht da.';
  const r = coref.link(mk(text, ['Hans Müller', 'Müller', 'Müllers']), text);
  assert.deepEqual(forms(r), ['VOLL', 'NACHNAME', 'NACHNAME']);
  assert.deepEqual(keys(r), ['hans|müller', 'hans|müller', 'hans|müller']);
});

test('zwei verschiedene Mueller: alleinstehender Nachname hat personKey null, Form bleibt NACHNAME', () => {
  const text = 'Hans Müller und Heike Müller waren da. Herr Müller sagte nichts.';
  const r = coref.link(mk(text, ['Hans Müller', 'Heike Müller', 'Müller']), text);
  assert.deepEqual(forms(r), ['VOLL', 'VOLL', 'NACHNAME']);
  assert.equal(r[0].personKey, 'hans|müller');
  assert.equal(r[1].personKey, 'heike|müller');
  assert.equal(r[2].personKey, null);
});

test('H. Mueller mit genau einer Person Hans Mueller: KURZ mit demselben personKey', () => {
  const text = 'Hans Müller kam. Später blieb H. Müller allein.';
  const r = coref.link(mk(text, ['Hans Müller', 'H. Müller']), text);
  assert.equal(r[1].form, 'KURZ');
  assert.equal(r[1].personKey, 'hans|müller');
  assert.equal(r[1].personKey, r[0].personKey);
});

test('H. Mueller mit Hans Mueller und Heike Mueller: personKey null (zwei Vornamen mit H)', () => {
  // Spezifikation: mit "Hans Müller", "Heike Müller" und "H. Müller" ist das Ergebnis null (beide Vornamen beginnen mit H).
  const text = 'Hans Müller und Heike Müller waren da. H. Müller blieb.';
  const r = coref.link(mk(text, ['Hans Müller', 'Heike Müller', 'H. Müller']), text);
  assert.equal(r[2].form, 'KURZ');
  assert.equal(r[2].personKey, null);
});

test('Anna Mueller und Hans Mueller bleiben zwei Personen', () => {
  const text = 'Anna Müller und Hans Müller kamen.';
  const r = coref.link(mk(text, ['Anna Müller', 'Hans Müller']), text);
  assert.equal(r[0].personKey, 'anna|müller');
  assert.equal(r[1].personKey, 'hans|müller');
  assert.notEqual(r[0].personKey, r[1].personKey);
});

test('Hans Mueller und Hans-Peter Mueller sind verschiedene Personen (kein Raetselraten)', () => {
  const text = 'Hans Müller und Hans-Peter Müller kamen.';
  const r = coref.link(mk(text, ['Hans Müller', 'Hans-Peter Müller']), text);
  assert.notEqual(r[0].personKey, r[1].personKey);
  assert.equal(r[0].personKey, 'hans|müller');
  assert.equal(r[1].personKey, 'hans-peter|müller');
});

test('Schmidt allein verknuepft nicht mit Schmidt-Weber', () => {
  const text = 'Eva Schmidt-Weber kam. Herr Schmidt blieb.';
  const r = coref.link(mk(text, ['Eva Schmidt-Weber', 'Schmidt']), text);
  assert.equal(r[0].form, 'VOLL');
  assert.equal(r[0].personKey, 'eva|schmidt-weber');
  assert.equal(r[1].personKey, null);
});

test('Frau Dr. Anna Weber, Frau Weber, Anna allein: VOLL, NACHNAME, VORNAME mit gleichem Schluessel', () => {
  const text = 'Frau Dr. Anna Weber ist Ärztin. Frau Weber hat angerufen. Anna kommt morgen.';
  const r = coref.link(mk(text, ['Dr. Anna Weber', 'Weber', 'Anna']), text);
  assert.deepEqual(forms(r), ['VOLL', 'NACHNAME', 'VORNAME']);
  assert.deepEqual(keys(r), ['anna|weber', 'anna|weber', 'anna|weber']);
});

test('Anreden und Titel vor dem Namen werden bei der Zerlegung entfernt (Prof. Dipl.-Ing., Herr)', () => {
  const text = 'Herr Prof. Dipl.-Ing. Karl Braun kam. Braun ging.';
  const r = coref.link(mk(text, ['Prof. Dipl.-Ing. Karl Braun', 'Braun']), text);
  assert.equal(r[0].form, 'VOLL');
  assert.equal(r[0].personKey, 'karl|braun');
  assert.equal(r[1].personKey, 'karl|braun');
});

test('Namenszusaetze gehoeren zum Nachnamen (von Humboldt)', () => {
  const text = 'Alexander von Humboldt reiste. Herr von Humboldt schrieb.';
  const r = coref.link(mk(text, ['Alexander von Humboldt', 'von Humboldt']), text);
  assert.equal(r[0].form, 'VOLL');
  assert.equal(r[1].form, 'NACHNAME');
  assert.equal(r[0].personKey, r[1].personKey);
  assert.ok(r[0].personKey);
});

test('Genitiv Webers verknuepft, wenn Weber als Nachname einer VOLL-Form vorkommt', () => {
  const text = 'Anna Weber kam. Webers Auto steht da.';
  const r = coref.link(mk(text, ['Anna Weber', 'Webers']), text);
  assert.equal(r[1].form, 'NACHNAME');
  assert.equal(r[1].personKey, 'anna|weber');
});

test('Genitiv Webers verknuepft nicht, wenn Weber nirgends als Nachname vorkommt', () => {
  const text = 'Anna Maier kam. Webers Auto steht da.';
  const r = coref.link(mk(text, ['Anna Maier', 'Webers']), text);
  assert.equal(r[1].personKey, null);
});

test('Vorname allein ohne passende VOLL-Person bleibt ohne Verknuepfung', () => {
  const text = 'Hans Müller kam. Peter ging.';
  const r = coref.link(mk(text, ['Hans Müller', 'Peter']), text);
  assert.equal(r[1].personKey, null);
});

test('Vorname allein bei zwei Personen mit demselben Vornamen: personKey null, Form VORNAME', () => {
  const text = 'Anna Weber und Anna Braun kamen. Anna ging.';
  const r = coref.link(mk(text, ['Anna Weber', 'Anna Braun', 'Anna']), text);
  assert.equal(r[2].form, 'VORNAME');
  assert.equal(r[2].personKey, null);
});

test('Spans anderer Typen (ORG) bleiben unveraendert, auch mit Namenswort', () => {
  const text = 'Hans Müller arbeitet bei Müller GmbH.';
  const spans = mk(text, ['Hans Müller', ['Müller GmbH', 'ORG']]);
  const r = coref.link(spans, text);
  assert.deepEqual(r[1], spans[1]);
  assert.equal('personKey' in r[1], false);
  assert.equal('form' in r[1], false);
});

test('andere Felder eines NAME-Spans bleiben erhalten', () => {
  const text = 'Hans Müller kam.';
  const spans = [{ start: 0, end: 11, pfx: 'NAME', conf: 0.9, src: 'regel' }];
  const r = coref.link(spans, text);
  assert.equal(r[0].conf, 0.9);
  assert.equal(r[0].src, 'regel');
  assert.equal(r[0].start, 0);
  assert.equal(r[0].end, 11);
});

test('Eingabeliste und Spans werden nicht veraendert; Ergebnis ist eine Kopie', () => {
  const text = 'Hans Müller kam. Herr Müller ging.';
  const spans = mk(text, ['Hans Müller', 'Müller']);
  const snap = JSON.stringify(spans);
  const r = coref.link(spans, text);
  assert.equal(JSON.stringify(spans), snap);
  assert.notEqual(r, spans);
  assert.equal(r.length, spans.length);
  assert.notEqual(r[0], spans[0]);
});

test('leere Liste und Liste ohne Namen ergeben unveraenderte Kopie', () => {
  assert.deepEqual(coref.link([], ''), []);
  const text = 'Die Firma Acme zahlt.';
  const spans = mk(text, [['Acme', 'ORG']]);
  assert.deepEqual(coref.link(spans, text), spans);
});

test('Ergebnis behaelt Reihenfolge und Anzahl der Spans (auch gemischte Typen)', () => {
  const text = 'Hans Müller bei Acme. Herr Müller.';
  const spans = mk(text, ['Hans Müller', ['Acme', 'ORG'], 'Müller']);
  const r = coref.link(spans, text);
  assert.deepEqual(r.map((s) => [s.start, s.end, s.pfx]), spans.map((s) => [s.start, s.end, s.pfx]));
});
