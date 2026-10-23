// Rauchtest des Unit-Testlaeufers (F2): Node-Testlaeufer funktioniert, Lader und Vendor-Bibliotheken sind erreichbar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadVendor } from './_load.mjs';

test('Testlaeufer: node:test und node:assert/strict arbeiten ohne Electron', () => {
  assert.equal(1 + 1, 2);
  assert.deepEqual({ a: [1] }, { a: [1] });
});

test('Lader: ROOT zeigt auf das Projektverzeichnis mit package.json und app/lib', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'package.json')));
  assert.ok(fs.existsSync(path.join(ROOT, 'app')));
});

test('Vendor: jszip ist ohne Electron ladbar', () => {
  assert.equal(typeof loadVendor('jszip').loadAsync, 'function');
});

test('package.json: test:unit und test verweisen auf den Node-Testlaeufer mit tests/unit', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['test:unit'], 'node --test tests/unit/*.test.mjs');
  assert.equal(pkg.scripts.test, 'node --test --test-concurrency=1 tests/*.test.mjs tests/unit/*.test.mjs');
});

test('ci.yml: eigener Schritt Unit-Tests nach fetch-vendor und vor den Electron-Tests', () => {
  const ci = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
  const iFetch = ci.indexOf('npm run fetch-vendor');
  const iUnit = ci.indexOf('npm run test:unit');
  assert.ok(ci.includes('- name: Unit-Tests'), 'Schritt "Unit-Tests" fehlt');
  assert.ok(iFetch >= 0 && iUnit > iFetch, 'Unit-Tests muessen nach fetch-vendor laufen');
  const iElectron = ci.search(/npm test\b(?!:)/);
  assert.ok(iElectron < 0 || iUnit < iElectron, 'Unit-Tests muessen vor den Electron-Tests laufen');
});
