// Lader tests/unit/_load.mjs (F2, Punkt 2)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadLib, loadVendor } from './_load.mjs';

test('loadLib: Wegwerfmodul mit module.exports = {} liefert ein leeres Objekt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-loadlib-'));
  try {
    fs.writeFileSync(path.join(tmp, 'leer.js'), 'module.exports = {};\n');
    assert.deepEqual(loadLib('leer', tmp), {});
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('loadLib: unbekannter Name wirft', () => {
  assert.throws(() => loadLib('gibt-es-nicht-xyz'));
});

test('loadVendor: jszip hat Version 3.10.2 und loadAsync', () => {
  const z = loadVendor('jszip');
  assert.equal(z.version, '3.10.2');
  assert.equal(typeof z.loadAsync, 'function');
});

test('loadVendor: mammoth hat extractRawText', () => {
  assert.equal(typeof loadVendor('mammoth').extractRawText, 'function');
});
