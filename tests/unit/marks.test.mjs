// PSLib.marks (M1.m): manuelle Markierungen als Daten
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const M = loadLib('marks');

test('create liefert ein leeres, JSON-faehiges Objekt', () => {
  const m = M.create();
  assert.deepEqual(m, { items: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(m)), m);
});

test('add: gueltiger Eintrag wird angenommen und gespeichert', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' }), true);
  assert.equal(m.items.length, 1);
  assert.equal(m.items[0].value, 'Zwiebelbaum');
  assert.equal(m.items[0].pfx, 'NAME');
});

test('add: doppelter Eintrag (gleicher Wert und Typ) wird mit false abgelehnt', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' }), true);
  assert.equal(M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' }), false);
  assert.equal(m.items.length, 1);
});

test('add: gleicher Wert mit anderem Typ ist kein Duplikat', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' }), true);
  assert.equal(M.add(m, { value: 'Zwiebelbaum', pfx: 'ORT' }), true);
  assert.equal(m.items.length, 2);
});

test('add: zu kurzer Wert (1 Zeichen) wird abgelehnt', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: 'a', pfx: 'NAME' }), false);
  assert.equal(m.items.length, 0);
});

test('add: Wert mit 2 Zeichen ist die untere Grenze und gueltig', () => {
  assert.equal(M.add(M.create(), { value: 'ab', pfx: 'NAME' }), true);
});

test('add: Wert mit 200 Zeichen ist die obere Grenze und gueltig', () => {
  assert.equal(M.add(M.create(), { value: 'a'.repeat(200), pfx: 'NAME' }), true);
});

test('add: Wert mit 201 Zeichen wird abgelehnt', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: 'a'.repeat(201), pfx: 'NAME' }), false);
  assert.equal(m.items.length, 0);
});

test('add: Wert mit Zeilenumbruch wird abgelehnt', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: 'x\ny', pfx: 'NAME' }), false);
  assert.equal(m.items.length, 0);
});

test('add: Wert, der ein Platzhalter ist ({{NAME_1}}), wird abgelehnt', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: '{{NAME_1}}', pfx: 'NAME' }), false);
  assert.equal(m.items.length, 0);
});

test('add: Wert mit Klammerpaar }} wird abgelehnt', () => {
  assert.equal(M.add(M.create(), { value: 'abc}}def', pfx: 'NAME' }), false);
});

test('add: Typ in Kleinbuchstaben (name) wird abgelehnt', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: 'Zwiebelbaum', pfx: 'name' }), false);
  assert.equal(m.items.length, 0);
});

test('add: leerer Typ wird abgelehnt', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: 'Zwiebelbaum', pfx: '' }), false);
  assert.equal(m.items.length, 0);
});

test('add: Wert wird nicht getrimmt', () => {
  const m = M.create();
  assert.equal(M.add(m, { value: ' Anna ', pfx: 'NAME' }), true);
  assert.equal(m.items[0].value, ' Anna ');
});

test('items behalten die Reihenfolge des Hinzufuegens', () => {
  const m = M.create();
  M.add(m, { value: 'Anna', pfx: 'NAME' });
  M.add(m, { value: 'Anna Mueller', pfx: 'NAME' });
  M.add(m, { value: 'Berlin', pfx: 'ORT' });
  assert.deepEqual(m.items.map((i) => i.value), ['Anna', 'Anna Mueller', 'Berlin']);
});

test('remove: vorhandener Eintrag wird entfernt und liefert true', () => {
  const m = M.create();
  M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' });
  assert.equal(M.remove(m, { value: 'Zwiebelbaum', pfx: 'NAME' }), true);
  assert.equal(m.items.length, 0);
});

test('remove: unbekannter Eintrag liefert false und aendert nichts', () => {
  const m = M.create();
  M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' });
  assert.equal(M.remove(m, { value: 'Zwiebelbaum', pfx: 'ORT' }), false);
  assert.equal(M.remove(m, { value: 'Anderer', pfx: 'NAME' }), false);
  assert.equal(m.items.length, 1);
});

test('toCvars: C++ (Beta) trifft genau den Text, nicht in xC++ (Beta)y', () => {
  const m = M.create();
  M.add(m, { value: 'C++ (Beta)', pfx: 'PRODUKT' });
  const cv = M.toCvars(m);
  assert.equal(cv.length, 1);
  assert.equal(cv[0].n, 'PRODUKT');
  const re = new RegExp(cv[0].p, 'g');
  assert.deepEqual('Wir nutzen C++ (Beta) hier'.match(re), ['C++ (Beta)']);
  assert.equal(new RegExp(cv[0].p, 'g').test('xC++ (Beta)y'), false);
});

test('toCvars: Muster beachtet Gross-/Kleinschreibung', () => {
  const m = M.create();
  M.add(m, { value: 'Anna', pfx: 'NAME' });
  const re = new RegExp(M.toCvars(m)[0].p, 'g');
  assert.equal(re.test('anna'), false);
  assert.equal(new RegExp(M.toCvars(m)[0].p, 'g').test('Hallo Anna!'), true);
});

test('toCvars: Wortgrenze verhindert Treffer in Annabelle', () => {
  const m = M.create();
  M.add(m, { value: 'Anna', pfx: 'NAME' });
  assert.equal(new RegExp(M.toCvars(m)[0].p, 'g').test('Annabelle'), false);
});

test('toCvars: Muster enthaelt die Wortgrenzen im Stil der Kernregeln', () => {
  const m = M.create();
  M.add(m, { value: 'Anna', pfx: 'NAME' });
  const p = M.toCvars(m)[0].p;
  assert.ok(p.startsWith('(?<![A-Za-z0-9_À-ɏ])'));
  assert.ok(p.endsWith('(?![A-Za-z0-9_À-ɏ])'));
});

test('toCvars: laengere Werte stehen zuerst (Anna Mueller vor Anna)', () => {
  const m = M.create();
  M.add(m, { value: 'Anna', pfx: 'NAME' });
  M.add(m, { value: 'Anna Mueller', pfx: 'NAME' });
  M.add(m, { value: 'Bo', pfx: 'NAME' });
  const cv = M.toCvars(m);
  assert.equal(cv.length, 3);
  assert.ok(new RegExp(cv[0].p, 'g').test('Anna Mueller'));
  assert.ok(new RegExp(cv[1].p, 'g').test('Anna'));
  assert.ok(new RegExp(cv[2].p, 'g').test('Bo'));
});

test('toCvars: schuetzt alle Regex-Sonderzeichen', () => {
  const m = M.create();
  const v = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o';
  assert.equal(M.add(m, { value: v, pfx: 'SONDER' }), true);
  const re = new RegExp(M.toCvars(m)[0].p, 'g');
  assert.deepEqual(('Text ' + v + ' Ende').match(re), [v]);
  assert.equal(re.test('axb'), false);
});

test('snapshot ist eine tiefe Kopie (Aenderung am Original wirkt nicht zurueck)', () => {
  const m = M.create();
  M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' });
  const s = M.snapshot(m);
  M.add(m, { value: 'Berlin', pfx: 'ORT' });
  m.items[0].value = 'Veraendert';
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].value, 'Zwiebelbaum');
});

test('restore stellt den Stand des Snapshots wieder her, ohne ihn zu teilen', () => {
  const m = M.create();
  M.add(m, { value: 'Zwiebelbaum', pfx: 'NAME' });
  const s = M.snapshot(m);
  M.add(m, { value: 'Berlin', pfx: 'ORT' });
  M.restore(m, s);
  assert.deepEqual(m.items, [{ value: 'Zwiebelbaum', pfx: 'NAME' }]);
  M.add(m, { value: 'Paris', pfx: 'ORT' });
  assert.equal(s.items.length, 1);
});
