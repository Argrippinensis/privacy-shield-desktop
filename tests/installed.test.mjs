// F4.b: Pruefung der INSTALLIERTEN App (Windows-Job von build.yml, nach der stillen Installation nach C:\PS-Test).
// Nur aktiv mit PS_INSTALLED=1 (ohne die Variable uebersprungen). Mit PS_INSTALLED=1 muss PS_PACKAGED_BIN auf die installierte
// Programmdatei zeigen, sonst schlaegt der Lauf fehl.
// Das Manifest der Bibliotheken liegt im Archiv und ist von aussen nicht lesbar: die installierte App prueft sich selbst.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { launchApp } from './helpers.mjs';

const BIN = process.env.PS_PACKAGED_BIN;
const ACTIVE = process.env.PS_INSTALLED === '1';
const MISSING = ACTIVE && (!BIN || !fs.existsSync(BIN));
const SKIP = !ACTIVE ? 'nur mit PS_INSTALLED=1 (installierte App, siehe build.yml)' : false;
if (SKIP) console.log('  installed.test: uebersprungen - ' + SKIP);

// Mit PS_INSTALLED=1 darf die Pruefung nie stillschweigend entfallen: fehlt die installierte Datei, ist der Lauf rot.
test('Installierte App: PS_PACKAGED_BIN zeigt auf eine vorhandene Datei', { skip: SKIP }, () => {
  if (MISSING) assert.fail('PS_INSTALLED=1, aber PS_PACKAGED_BIN fehlt oder zeigt nicht auf eine vorhandene Datei: ' + BIN);
});

test('Installierte App: checkAssets(true) meldet alle Dateien vollstaendig und unverfaelscht', { skip: SKIP || (MISSING ? 'siehe vorherigen Fehler' : false) }, async () => {
  const a = await launchApp({ offline: true });
  try {
    const r = await a.win.evaluate(() => window.electronAPI.checkAssets(true));
    assert.equal(r.manifest, true, 'Manifest der Installation nicht lesbar: ' + JSON.stringify(r));
    assert.deepEqual({ missing: r.missing, wrongSize: r.wrongSize, corrupt: r.corrupt }, { missing: [], wrongSize: [], corrupt: [] });
    assert.equal(r.ok, true, 'Installation unvollstaendig: ' + JSON.stringify(r));
  } finally { await a.close(); }
});
