// C2.w, statischer Test: Platzhalter nur ueber PSLib.placeholder erkennen (V2-00 Regel 10). Das alte Muster ohne Punkt
// erlaubt keine Endungen ({{NAME_1.NACHNAME}}); es darf ausser in app/lib/placeholder.js und vendor nirgends mehr stehen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './_load.mjs';

const OLD = ['[A-Z_0-9]+\\}\\}', '[A-Z]+_[A-Za-z0-9\\-_]+\\}\\}'];
const EXT = new Set(['.js', '.mjs', '.cjs', '.html', '.htm']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name === 'vendor' || e.name === 'node_modules') continue; walk(p, out); }
    else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
function hits(files) {
  const bad = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    for (const o of OLD) if (txt.includes(o)) bad.push(rel(f) + ' enthaelt ' + o);
  }
  return bad;
}

test('keine Datei unter app/ (ausser app/lib/placeholder.js und vendor) enthaelt das alte Platzhaltermuster', () => {
  const files = walk(path.join(ROOT, 'app'), []).filter((f) => rel(f) !== 'app/lib/placeholder.js');
  assert.ok(files.length > 5, 'Dateiliste unplausibel');
  assert.deepEqual(hits(files), []);
});

test('keine Datei unter tests/eval/ enthaelt das alte Platzhaltermuster', () => {
  const files = walk(path.join(ROOT, 'tests', 'eval'), []);
  assert.ok(files.length > 0);
  assert.deepEqual(hits(files), []);
});

test('der Harness (tests/eval/run-eval.mjs) nutzt PSLib.placeholder.TOKEN_SOURCE oder find fuer die Platzhalterzaehlung', () => {
  const txt = fs.readFileSync(path.join(ROOT, 'tests', 'eval', 'run-eval.mjs'), 'utf8');
  assert.match(txt, /TOKEN_SOURCE|placeholder[\s\S]{0,40}\.find|\.find\(/);
  assert.match(txt, /placeholder/);
});
