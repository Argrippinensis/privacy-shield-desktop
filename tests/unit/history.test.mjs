import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const H = loadLib('history');

test('Beispielablauf: push a b c, undo b, undo a, undo null, redo b', () => {
  const h = H.create({ limit: 100 });
  h.push({ n: 'a' }); h.push({ n: 'b' }); h.push({ n: 'c' });
  assert.deepEqual(h.undo(), { n: 'b' });
  assert.deepEqual(h.undo(), { n: 'a' });
  assert.equal(h.undo(), null);
  assert.deepEqual(h.redo(), { n: 'b' });
});

test('push nach undo verwirft den Wiederholen-Zweig', () => {
  const h = H.create({ limit: 100 });
  h.push({ n: 'a' }); h.push({ n: 'b' }); h.push({ n: 'c' });
  h.undo(); h.undo(); h.redo();
  h.push({ n: 'd' });
  assert.equal(h.canRedo(), false);
  assert.deepEqual(h.undo(), { n: 'b' });
});

test('limit 3 verwirft den aeltesten Eintrag', () => {
  const h = H.create({ limit: 3 });
  for (const n of ['a', 'b', 'c', 'd']) h.push({ n });
  assert.equal(h.size(), 3);
  assert.deepEqual(h.undo(), { n: 'c' });
  assert.deepEqual(h.undo(), { n: 'b' });
  assert.equal(h.undo(), null);
});

test('clear leert den Verlauf, current ist null', () => {
  const h = H.create({ limit: 100 });
  h.push({ n: 'a' }); h.push({ n: 'b' });
  h.clear();
  assert.equal(h.current(), null);
  assert.equal(h.size(), 0);
  assert.equal(h.canUndo(), false);
  assert.equal(h.canRedo(), false);
});

test('Aenderung des uebergebenen Objekts nach push veraendert den Stand nicht', () => {
  const h = H.create({ limit: 100 });
  const s = { released: [{ pfx: 'NAME', value: 'Anton' }] };
  h.push(s);
  s.released.push({ pfx: 'ORT', value: 'Bonn' });
  s.released[0].value = 'X';
  assert.deepEqual(h.current(), { released: [{ pfx: 'NAME', value: 'Anton' }] });
});

test('Aenderung des gelieferten Objekts nach undo veraendert den Stand nicht', () => {
  const h = H.create({ limit: 100 });
  h.push({ v: [1] }); h.push({ v: [2] });
  const u = h.undo();
  u.v.push(99);
  assert.deepEqual(h.current(), { v: [1] });
  h.redo();
  const r = h.undo();
  assert.deepEqual(r, { v: [1] });
});

test('undo ohne Eintraege liefert null', () => {
  const h = H.create({ limit: 100 });
  assert.equal(h.undo(), null);
  assert.equal(h.redo(), null);
  assert.equal(h.current(), null);
});

test('canUndo und canRedo folgen dem Zeiger', () => {
  const h = H.create({ limit: 100 });
  assert.equal(h.canUndo(), false);
  h.push({ n: 'a' });
  assert.equal(h.canUndo(), false);
  h.push({ n: 'b' });
  assert.equal(h.canUndo(), true);
  assert.equal(h.canRedo(), false);
  h.undo();
  assert.equal(h.canRedo(), true);
  assert.deepEqual(h.current(), { n: 'a' });
});
