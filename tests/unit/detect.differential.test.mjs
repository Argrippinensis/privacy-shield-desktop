// F1.a, Differenztest: PSDetect (Node) muss die Ausgabe der unveraenderten App 1.8.0 bitgleich reproduzieren.
// Referenz: tests/golden/reference-v1.8.json (F2). Eingaben: dieselben Quellen wie tests/eval/dump-reference.mjs.
// Laufzeit: Sekunden (ein Prozess, kein Electron). Bis app/lib/detect.js existiert, ist dieser Test rot (Modul fehlt).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadLib, ROOT } from './_load.mjs';
import { buildInputs, sha256, MODES } from '../eval/dump-reference.mjs';

const reference = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'golden', 'reference-v1.8.json'), 'utf8'));
const inputs = await buildInputs();
const byKey = new Map(inputs.map((i) => [i.key, i]));
const itemsOf = (mode) => reference.items.filter((it) => it.mode === mode);

// Optionen je Modus (Spezifikation F1, Schritt 1)
function optsFor(item) {
  const o = { profile: item.profile };
  o.wordlists = item.mode !== 'w0';
  if (item.mode === 'ki') o.aiSpans = item.aiSpans;
  return o;
}

function runMode(mode) {
  const PSDetect = loadLib('detect'); // wirft, solange das Modul fehlt
  const abweichungen = [];
  for (const item of itemsOf(mode)) {
    const inp = byKey.get(item.key);
    if (!inp) { abweichungen.push(`${mode}/${item.key}: Eingabe fehlt`); continue; }
    if (sha256(inp.text) !== item.inputSha256) { abweichungen.push(`${mode}/${item.key}: Eingabe driftet`); continue; }
    const r = PSDetect.anonymize(inp.text, optsFor(item));
    const a = [];
    if (sha256(r.text) !== item.outSha256) a.push('text');
    if (sha256(JSON.stringify(r.state.store)) !== item.storeSha256) a.push('zuordnung');
    if (Object.keys(r.state.store).length !== item.entities) a.push('anzahl');
    if (a.length) abweichungen.push(`${mode}/${item.key}: ${a.join('+')} abweichend`);
  }
  return abweichungen;
}

test('Referenz: enthaelt alle drei Modi mit je gleichen Eingabeschluesseln (Aufbau der Referenzdatei)', () => {
  assert.equal(reference.version, 1);
  assert.deepEqual(MODES, ['w0', 'w1', 'ki']);
  for (const m of MODES) assert.ok(itemsOf(m).length >= 212, `Modus ${m} hat zu wenige Elemente`);
  assert.equal(itemsOf('w0').length, itemsOf('w1').length);
});

test('Eingabe driftet nicht: inputSha256 der Referenz stimmt mit den aktuell erzeugten Eingaben ueberein', () => {
  const drift = [];
  for (const item of reference.items) {
    const inp = byKey.get(item.key);
    if (!inp || sha256(inp.text) !== item.inputSha256) drift.push(`${item.mode}/${item.key}`);
  }
  assert.deepEqual(drift, [], 'Eingabe driftet');
});

test('Differenz Modus w0 (nur Regeln, wordlists false): Text und Zuordnung bitgleich zu Version 1.8.0 fuer alle Faelle', () => {
  assert.deepEqual(runMode('w0'), []);
});

test('Differenz Modus w1 (Regeln plus Wortlisten, wordlists true): Text und Zuordnung bitgleich zu Version 1.8.0', () => {
  assert.deepEqual(runMode('w1'), []);
});

test('Differenz Modus ki (wordlists true, aufgezeichnete aiSpans eingespielt): Text und Zuordnung bitgleich zu 1.8.0', () => {
  assert.ok(itemsOf('ki').some((i) => i.aiSpans && i.aiSpans.length > 0), 'Referenz ohne KI-Spans');
  assert.deepEqual(runMode('ki'), []);
});

test('Differenz: zweiter Lauf mit frischem Zustand liefert dieselben Hashes (kein versteckter Zustand zwischen Aufrufen)', () => {
  const PSDetect = loadLib('detect');
  const items = itemsOf('w1').filter((i) => !i.key.startsWith('stress-')).slice(0, 40);
  for (const item of items) {
    const t = byKey.get(item.key).text;
    const r1 = PSDetect.anonymize(t, optsFor(item));
    const r2 = PSDetect.anonymize(t, optsFor(item));
    assert.equal(r2.text, r1.text, item.key);
    assert.equal(JSON.stringify(r2.state.store), JSON.stringify(r1.state.store), item.key);
  }
});
