// compareItems aus tests/eval/diff-reference.mjs (F2, Punkt 0) mit erfundenen Elementen
// Q1.fix: Ausnahmen (reference-allow.json) sind an den genehmigten Stand gebunden. Eintragsformat:
//   { mode, key, reason, outSha256, storeSha256, entities }  (genehmigter NEUER Stand des Falls)
// Die Ausnahme gilt nur, wenn der aktuelle Lauf genau diese drei Werte liefert; "fehlt" und "eingabe" sind nie erlaubbar;
// keine Platzhalter '*'; reason Pflicht. Eintraege, die nicht greifen, stehen in `unused`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './_load.mjs';

const { compareItems, collectItemsNode, exitCodeOf, reportLines, proposeEntries } = await import('../eval/diff-reference.mjs');

const item = (mode, key, o = {}) => ({ mode, key, profile: 'standard', inputSha256: 'a'.repeat(64), outSha256: 'b'.repeat(64), storeSha256: 'c'.repeat(64), entities: 3, ...o });
const ref = () => [item('w0', 'k1'), item('w0', 'k2'), item('w1', 'k1')];
const has = (list, s) => JSON.stringify(list).includes(s);

test('compareItems: gleiche Elemente ergeben keine Abweichung', () => {
  const r = compareItems(ref(), ref(), []);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.allowed.length, 0);
  assert.equal(r.unused.length, 0);
});

test('compareItems: geaenderter outSha256 ergibt genau eine Abweichung', () => {
  const cur = ref(); cur[1] = item('w0', 'k2', { outSha256: 'd'.repeat(64) });
  const r = compareItems(ref(), cur, []);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'k2'));
});

// genehmigter Stand = aktueller Stand des Elements, als Ausnahmeeintrag festgehalten
const approve = (it, o = {}) => ({ mode: it.mode, key: it.key, reason: 'Test, Paket X', outSha256: it.outSha256, storeSha256: it.storeSha256, entities: it.entities, ...o });
const changed = (mode, key, o = {}) => item(mode, key, { outSha256: 'd'.repeat(64), storeSha256: 'e'.repeat(64), entities: 5, ...o });
const withK2 = (it) => { const cur = ref(); cur[1] = it; return cur; };

test('compareItems: genehmigte Abweichung mit passendem Text-/Zuordnungshash und Anzahl bleibt erlaubt', () => {
  const k2 = changed('w0', 'k2');
  const r = compareItems(ref(), withK2(k2), [approve(k2)]);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.allowed.length, 1);
  assert.ok(has(r.allowed, 'Test, Paket X'));
  assert.equal(r.unused.length, 0);
});

test('compareItems: Nullabweichung ohne Ausnahmen ist in Ordnung', () => {
  const r = compareItems(ref(), ref(), []);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.allowed.length, 0);
});

test('Q1a: genehmigter Fall mit anderem Text-/Zuordnungshash und leerer Zuordnung wird als Abweichung gemeldet', () => {
  const approved = changed('w0', 'k2');
  const garbage = item('w0', 'k2', { outSha256: '0'.repeat(64), storeSha256: '1'.repeat(64), entities: 0 });
  const r = compareItems(ref(), withK2(garbage), [approve(approved)]);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'k2'));
  assert.equal(r.allowed.length, 0);
  assert.equal(r.unused.length, 1, 'nicht greifender Eintrag ist ungenutzt');
});

test('Q1a2: nur der Textstand stimmt, die Zuordnung ist eine andere -> Abweichung', () => {
  const approved = changed('w0', 'k2');
  const cur = changed('w0', 'k2', { storeSha256: '9'.repeat(64) });
  const r = compareItems(ref(), withK2(cur), [approve(approved)]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1a3: nur die Zuordnung stimmt, der Text ist ein anderer -> Abweichung', () => {
  const approved = changed('w0', 'k2');
  const cur = changed('w0', 'k2', { outSha256: '9'.repeat(64) });
  const r = compareItems(ref(), withK2(cur), [approve(approved)]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1a4: Hashes stimmen, aber die Anzahl der Zuordnungen weicht vom genehmigten Stand ab -> Abweichung', () => {
  const approved = changed('w0', 'k2');
  const cur = changed('w0', 'k2', { entities: 0 });
  const r = compareItems(ref(), withK2(cur), [approve(approved)]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1a5: Rueckfall auf den Referenzstand (Ausnahme nicht mehr noetig) ist keine Abweichung, der Eintrag gilt als ungenutzt', () => {
  const approved = changed('w0', 'k2');
  const r = compareItems(ref(), ref(), [approve(approved)]);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.unused.length, 1);
});

test('Q1a6: spaetere Aenderung nach der Genehmigung (zweite Verschlechterung desselben Falls) wird gemeldet', () => {
  const approved = changed('w0', 'k2');
  const later = changed('w0', 'k2', { outSha256: 'f'.repeat(64) });
  const r = compareItems(ref(), withK2(later), [approve(approved)]);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'text'));
});

test('Q1b: genehmigter Fall fehlt im aktuellen Lauf -> Abweichung "fehlt", nie ueber die Ausnahme erlaubt', () => {
  const approved = changed('w0', 'k2');
  const cur = ref().filter((i) => i.key !== 'k2');
  const r = compareItems(ref(), cur, [approve(approved)]);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'fehlt'));
  assert.equal(r.allowed.length, 0);
  assert.equal(r.unused.length, 1);
});

test('Q1b2: fehlender Fall bleibt Abweichung, auch wenn der Eintrag die Hashes der Referenz traegt', () => {
  const r = compareItems(ref(), ref().slice(0, 2), [approve(item('w1', 'k1'))]);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'fehlt'));
  assert.equal(r.allowed.length, 0);
});

test('Q1b3: abweichende Eingabe wird nie ueber eine Ausnahme erlaubt, auch nicht bei passenden Ergebnishashes', () => {
  const cur = changed('w0', 'k2', { inputSha256: 'f'.repeat(64) });
  const r = compareItems(ref(), withK2(cur), [approve(cur)]);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'eingabe'));
  assert.equal(r.allowed.length, 0);
});

test('Q1c: Eintrag ohne reason erlaubt nichts', () => {
  const k2 = changed('w0', 'k2');
  const e = approve(k2); delete e.reason;
  const r = compareItems(ref(), withK2(k2), [e]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1c2: Eintrag mit leerem reason erlaubt nichts', () => {
  const k2 = changed('w0', 'k2');
  const r = compareItems(ref(), withK2(k2), [approve(k2, { reason: '' })]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1d: Eintrag ohne Hashes (alte Form {mode, key, reason}) erlaubt nichts', () => {
  const k2 = changed('w0', 'k2');
  const r = compareItems(ref(), withK2(k2), [{ mode: 'w0', key: 'k2', reason: 'Test, Paket X' }]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
  assert.equal(r.unused.length, 1);
});

test('Q1d2: Eintrag mit fehlendem Hashfeld (nur outSha256) erlaubt nichts', () => {
  const k2 = changed('w0', 'k2');
  const e = approve(k2); delete e.storeSha256; delete e.entities;
  const r = compareItems(ref(), withK2(k2), [e]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1e: Platzhalter key "*" deckt keinen Fall, auch nicht bei passenden Hashes', () => {
  const k2 = changed('w0', 'k2');
  const r = compareItems(ref(), withK2(k2), [approve(k2, { key: '*' })]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1e2: Platzhalter mode "*" deckt keinen Fall, auch nicht bei passenden Hashes', () => {
  const k2 = changed('w0', 'k2');
  const r = compareItems(ref(), withK2(k2), [approve(k2, { mode: '*' })]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1e3: Eintrag mode "*" und key "*" deckt nicht mehrere Faelle', () => {
  const cur = [changed('w0', 'k1'), changed('w0', 'k2'), item('w1', 'k1', { entities: 9 })];
  const r = compareItems(ref(), cur, [approve(changed('w0', 'k1'), { mode: '*', key: '*' })]);
  assert.equal(r.deviations.length, 3);
  assert.equal(r.allowed.length, 0);
});

test('Q1f: Eintrag eines anderen Modus erlaubt die Abweichung nicht, auch bei gleichem key und gleichen Hashes', () => {
  const k2 = changed('w0', 'k2');
  const r = compareItems(ref(), withK2(k2), [approve(k2, { mode: 'w1' })]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
  assert.equal(r.unused.length, 1);
});

test('Q1g: ein Eintrag mit passenden Hashes erlaubt nur seinen eigenen Fall, ein zweiter Fall mit denselben Hashes nicht', () => {
  const a = changed('w0', 'k1'), b = changed('w0', 'k2');
  const r = compareItems(ref(), [a, b, item('w1', 'k1')], [approve(a)]);
  assert.equal(r.allowed.length, 1);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'k2'));
});

test('Q1h: mehrere genehmigte Faelle mit je eigenem Stand sind alle erlaubt', () => {
  const a = changed('w0', 'k1'), b = changed('w0', 'k2', { outSha256: '7'.repeat(64) });
  const r = compareItems(ref(), [a, b, item('w1', 'k1')], [approve(a), approve(b)]);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.allowed.length, 2);
  assert.equal(r.unused.length, 0);
});

// Echte Dateien: reference-allow.json gegen reference-v1.8.json
const refFile = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'golden', 'reference-v1.8.json'), 'utf8')).items;
const realAllow = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'golden', 'reference-allow.json'), 'utf8'));
const HEX = /^[0-9a-f]{64}$/;

test('reference-allow.json: jeder Eintrag traegt genehmigten Text-Hash, Zuordnungs-Hash und Anzahl', () => {
  assert.ok(realAllow.length > 0);
  const bad = realAllow.filter((e) => !(HEX.test(e.outSha256) && HEX.test(e.storeSha256) && Number.isInteger(e.entities) && e.entities >= 0)).map((e) => `${e.mode}/${e.key}`);
  assert.deepEqual(bad, []);
});

test('reference-allow.json: keine Platzhalter, reason Pflicht, jedes mode/key hoechstens einmal', () => {
  for (const e of realAllow) {
    assert.ok(e.mode !== '*' && e.key !== '*', `Platzhalter: ${e.mode}/${e.key}`);
    assert.ok(typeof e.reason === 'string' && e.reason.trim().length > 0, `ohne reason: ${e.mode}/${e.key}`);
  }
  const ids = realAllow.map((e) => e.mode + '/' + e.key);
  assert.equal(new Set(ids).size, ids.length, 'doppelter Eintrag');
});

test('reference-allow.json: jeder Eintrag verweist auf einen Fall der Referenz 1.8.0', () => {
  const ids = new Set(refFile.map((i) => i.mode + '/' + i.key));
  assert.deepEqual(realAllow.map((e) => e.mode + '/' + e.key).filter((id) => !ids.has(id)), []);
});

test('reference-allow.json: echter Lauf (collectItemsNode ueber den Korpus) gegen die echte Datei: 0 Abweichungen, alle Eintraege genutzt', { timeout: 120000 }, async () => {
  const cur = await collectItemsNode(refFile);
  const r = compareItems(refFile, cur, realAllow);
  assert.deepEqual(r.deviations.map((d) => d.line), []);
  assert.deepEqual(r.unused.map((e) => e.mode + '/' + e.key), [], 'ein Eintrag greift nicht mehr');
  assert.equal(r.allowed.length, realAllow.length);
});

test('Q1a (echte Dateien): w1/n12 mit voellig anderen Hashes und leerer Zuordnung ist eine Abweichung', () => {
  const f = refFile.find((i) => i.mode === 'w1' && i.key === 'n12');
  const cur = [{ ...f, outSha256: '0'.repeat(64), storeSha256: '1'.repeat(64), entities: 0 }];
  const r = compareItems([f], cur, realAllow);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1b (echte Dateien): w1/n12 fehlt im aktuellen Lauf -> Abweichung statt "erlaubt: fehlt"', () => {
  const f = refFile.find((i) => i.mode === 'w1' && i.key === 'n12');
  const r = compareItems([f], [], realAllow);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('Q1c (echte Dateien): Eintrag ohne reason erlaubt auch den echten Fall w1/n12 nicht', () => {
  const f = refFile.find((i) => i.mode === 'w1' && i.key === 'n12');
  const neu = { outSha256: '2'.repeat(64), storeSha256: '3'.repeat(64), entities: f.entities + 1 };
  const r = compareItems([f], [{ ...f, ...neu }], [{ mode: 'w1', key: 'n12', ...neu }]);
  assert.equal(r.deviations.length, 1);
  assert.equal(r.allowed.length, 0);
});

test('compareItems: fehlendes Element im aktuellen Lauf ist eine Abweichung "fehlt"', () => {
  const cur = ref().slice(0, 2);
  const r = compareItems(ref(), cur, []);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'fehlt'));
  assert.ok(has(r.deviations, 'k1'));
});

test('compareItems: unused listet nicht benutzte Eintraege', () => {
  const allow = [approve(changed('w0', 'k1'), { reason: 'ungenutzt' }), approve(changed('ki', 'k9'), { reason: 'auch ungenutzt' })];
  const r = compareItems(ref(), ref(), allow);
  assert.equal(r.deviations.length, 0);
  assert.equal(r.unused.length, 2);
});

test('compareItems: geaenderter storeSha256 ist eine Abweichung', () => {
  const cur = ref(); cur[0] = item('w0', 'k1', { storeSha256: 'f'.repeat(64) });
  assert.equal(compareItems(ref(), cur, []).deviations.length, 1);
});

test('compareItems: geaenderter inputSha256 ist eine Abweichung (Eingabe abweichend)', () => {
  const cur = ref(); cur[0] = item('w0', 'k1', { inputSha256: 'f'.repeat(64) });
  const r = compareItems(ref(), cur, []);
  assert.equal(r.deviations.length, 1);
  assert.ok(has(r.deviations, 'eingabe'));
});

// Q1.fix Nachtests: ungenutzte Ausnahmen sind im CLI Fehler; --propose erzeugt Eintragskoepfe
const CLI = path.join(ROOT, 'tests', 'eval', 'diff-reference.mjs');

test('exitCodeOf: ungenutzte Ausnahme ist ein Fehler (Exit 1), sonst 0', () => {
  const k2 = changed('w0', 'k2');
  assert.equal(exitCodeOf(compareItems(ref(), withK2(k2), [approve(k2)])), 0);
  assert.equal(exitCodeOf(compareItems(ref(), ref(), [approve(k2)])), 1, 'ungenutzt');
  assert.equal(exitCodeOf(compareItems(ref(), withK2(k2), [])), 1, 'Abweichung');
});

test('reportLines: ungenutzter Eintrag erscheint als Fehler mit mode/key', () => {
  const k2 = changed('w0', 'k2');
  const lines = reportLines(compareItems(ref(), ref(), [approve(k2)]), 3);
  assert.ok(lines.some((l) => /^Fehler: ungenutzt: w0\/k2/.test(l)), lines.join('\n'));
});

test('proposeEntries: nur unerlaubte Abweichungen, mit mode/key/outSha256/storeSha256/entities und ohne reason', () => {
  const k2 = changed('w0', 'k2'), k1 = changed('w1', 'k1');
  const cur = [item('w0', 'k1'), k2, k1];
  const r = compareItems(ref(), cur, [approve(k2)]);
  const p = proposeEntries(r, cur);
  assert.deepEqual(p, [{ mode: 'w1', key: 'k1', outSha256: k1.outSha256, storeSha256: k1.storeSha256, entities: k1.entities }]);
});

test('proposeEntries: fehlende Faelle und geaenderte Eingabe werden nicht vorgeschlagen', () => {
  const cur = [item('w0', 'k1', { inputSha256: 'f'.repeat(64) }), item('w1', 'k1')];
  const p = proposeEntries(compareItems(ref(), cur, []), cur);
  assert.deepEqual(p, []);
});

const tmpAllow = (entries) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'q1-')), 'allow.json'); fs.writeFileSync(f, JSON.stringify(entries)); return f; };

test('CLI: ungenutzter Eintrag in der Allow-Datei ergibt Exit 1 und nennt mode/key', { timeout: 120000 }, () => {
  const extra = { mode: 'w0', key: 'n12', reason: 'Test, ungenutzt', outSha256: '1'.repeat(64), storeSha256: '2'.repeat(64), entities: 0 };
  const f = tmpAllow([...realAllow, extra]);
  const r = spawnSync(process.execPath, [CLI, '--node', '--allow', f], { cwd: ROOT, encoding: 'utf8', timeout: 100000 });
  assert.equal(r.status, 1, r.stdout.split('\n').slice(-5).join('\n'));
  assert.match(r.stdout, /Fehler: ungenutzt: w0\/n12/);
  assert.match(r.stdout, /Abweichungen: 0 von/);
});

test('CLI --propose: ohne Allow-Datei gibt genau die Eintragskoepfe des heutigen Stands aus (= genehmigte Hashes der echten Datei)', { timeout: 120000 }, () => {
  const f = tmpAllow([]);
  const r = spawnSync(process.execPath, [CLI, '--node', '--propose', '--allow', f], { cwd: ROOT, encoding: 'utf8', timeout: 100000 });
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.ok(out.every((e) => !('reason' in e) && HEX.test(e.outSha256) && HEX.test(e.storeSha256) && Number.isInteger(e.entities)));
  const strip = (e) => ({ mode: e.mode, key: e.key, outSha256: e.outSha256, storeSha256: e.storeSha256, entities: e.entities });
  const key = (e) => e.mode + '/' + e.key;
  assert.deepEqual(out.map(strip).sort((a, b) => key(a).localeCompare(key(b))), realAllow.map(strip).sort((a, b) => key(a).localeCompare(key(b))));
});
