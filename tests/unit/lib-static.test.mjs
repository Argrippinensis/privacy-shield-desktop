// Statische Pruefung aller app/lib/*.js (F2, Punkt 4; Architekturregel 1)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './_load.mjs';

const dir = path.join(ROOT, 'app', 'lib');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort() : [];

test('app/lib enthaelt mindestens das Platzhaltermodul', () => {
  assert.ok(files.includes('placeholder.js'), 'app/lib/placeholder.js fehlt');
});

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]|\p{Extended_Pictographic}/u;
const FORBIDDEN = ['document.', 'window.document', 'localStorage', 'sessionStorage', 'getElementById'];

for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  test(`${f}: keine Emojis`, () => { assert.ok(!EMOJI.test(src)); });
  for (const w of FORBIDDEN) {
    test(`${f}: kein Zugriff auf ${w}`, () => { assert.ok(!src.includes(w), `${w} gefunden`); });
  }
  test(`${f}: enthaelt module.exports und PSLib`, () => {
    assert.ok(src.includes('module.exports'));
    assert.ok(src.includes('PSLib'));
  });
  test(`${f}: UMD-Huelle (typeof module === 'object' und root.PSLib)`, () => {
    assert.ok(src.includes("typeof module === 'object'"));
    assert.ok(src.includes('root.PSLib'));
  });
}
