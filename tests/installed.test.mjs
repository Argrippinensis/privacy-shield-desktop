// F4.b: Pruefung der INSTALLIERTEN App (Windows-Job von build.yml, nach der stillen Installation nach C:\PS-Test).
// Nur aktiv mit PS_INSTALLED=1 und PS_PACKAGED_BIN=<Pfad zur installierten Programmdatei>; sonst uebersprungen.
// Das Manifest der Bibliotheken liegt im Archiv und ist von aussen nicht lesbar: die installierte App prueft sich selbst.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchApp } from './helpers.mjs';

const BIN = process.env.PS_PACKAGED_BIN;
const SKIP = process.env.PS_INSTALLED !== '1' ? 'nur mit PS_INSTALLED=1 (installierte App, siehe build.yml)'
  : !BIN || !fs.existsSync(BIN) ? 'PS_PACKAGED_BIN zeigt nicht auf eine vorhandene installierte Datei: ' + BIN
  : false;
if (SKIP) console.log('  installed.test: uebersprungen - ' + SKIP);

test('Installierte App: checkAssets(true) meldet alle Dateien vollstaendig und unverfaelscht', { skip: SKIP }, async () => {
  const a = await launchApp({ offline: true });
  try {
    const r = await a.win.evaluate(() => window.electronAPI.checkAssets(true));
    assert.equal(r.manifest, true, 'Manifest der Installation nicht lesbar: ' + JSON.stringify(r));
    assert.deepEqual({ missing: r.missing, wrongSize: r.wrongSize, corrupt: r.corrupt }, { missing: [], wrongSize: [], corrupt: [] });
    assert.equal(r.ok, true, 'Installation unvollstaendig: ' + JSON.stringify(r));
  } finally { await a.close(); }
});
