// Konfigurationspruefung F2.e: Electron 44, Fuses, asarUnpack (liest nur package.json, ohne Electron).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './_load.mjs';

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const build = pkg.build || {};
const fuses = build.electronFuses;

const ERWARTET = {
  runAsNode: false,
  enableNodeOptionsEnvironmentVariable: false,
  grantFileProtocolExtraPrivileges: false,
  onlyLoadAppFromAsar: true,
  enableEmbeddedAsarIntegrityValidation: true,
};

test('Electron: devDependencies.electron ist angegeben', () => {
  assert.equal(typeof pkg.devDependencies.electron, 'string');
});

test('Electron: Hauptversion von devDependencies.electron ist mindestens 44', () => {
  const m = /(\d+)\.\d+\.\d+/.exec(pkg.devDependencies.electron || '');
  assert.ok(m, 'keine Versionsnummer in ' + pkg.devDependencies.electron);
  assert.ok(Number(m[1]) >= 44, 'Hauptversion ' + m[1] + ' ist kleiner als 44');
});

test('Fuses: build.electronFuses ist ein Objekt', () => {
  assert.equal(typeof fuses, 'object');
  assert.notEqual(fuses, null);
});

test('Fuses: enthaelt genau die fuenf vorgesehenen Schalter', () => {
  assert.deepEqual(Object.keys(fuses || {}).sort(), Object.keys(ERWARTET).sort());
});

for (const [name, wert] of Object.entries(ERWARTET)) {
  test('Fuses: ' + name + ' steht auf ' + wert, () => {
    assert.ok(fuses && name in fuses, name + ' fehlt');
    assert.equal(fuses[name], wert);
  });
}

test('Fuses: enableNodeCliInspectArguments ist nicht gesetzt (Playwright startet mit Inspektor-Argumenten)', () => {
  assert.equal(Object.prototype.hasOwnProperty.call(fuses || {}, 'enableNodeCliInspectArguments'), false);
  assert.ok(fuses, 'electronFuses fehlt');
});

test('asarUnpack: enthaelt weiter app/vendor/**/*', () => {
  assert.ok(Array.isArray(build.asarUnpack));
  assert.ok(build.asarUnpack.includes('app/vendor/**/*'));
});

test('asarUnpack: enthaelt weiter app/models/**/*', () => {
  assert.ok(Array.isArray(build.asarUnpack));
  assert.ok(build.asarUnpack.includes('app/models/**/*'));
});
