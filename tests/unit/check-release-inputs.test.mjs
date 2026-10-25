import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkReleaseInputs, REQUIRED_FILES } from '../../scripts/check-release-inputs.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-release-'));
  fs.mkdirSync(path.join(root, 'dist'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '2.0.0' }));
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '## [2.0.0] - 2026-10-25\n\n- Test\n');
  for (const file of REQUIRED_FILES) fs.writeFileSync(path.join(root, 'dist', file), 'test');
  return root;
}

test('Release-Gate akzeptiert alle fuenf Artefakte mit passendem Tag und Changelog', (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(checkReleaseInputs('v2.0.0', root).version, '2.0.0');
});

test('fehlendes Intel-Mac-ZIP stoppt den Release vor der Veroeffentlichung', (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.rmSync(path.join(root, 'dist', 'PrivacyShield-mac-x64.zip'));
  assert.throws(() => checkReleaseInputs('v2.0.0', root), /PrivacyShield-mac-x64.zip/);
});

test('falsche Paketversion und undatierter Changelog stoppen den Release', (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => checkReleaseInputs('v2.0.1', root), /package.json/);
  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), '## [Unreleased] (2.0.0)\n');
  assert.throws(() => checkReleaseInputs('v2.0.0', root), /CHANGELOG.md/);
});

test('leerer Installer stoppt den Release', (t) => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'dist', 'PrivacyShield-Setup.exe'), '');
  assert.throws(() => checkReleaseInputs('v2.0.0', root), /PrivacyShield-Setup.exe/);
});
