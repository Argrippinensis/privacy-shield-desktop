// Paket A: Update-Dialog bei Offline, Navigation nach aussen, Skriptfehler.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame } from './helpers.mjs';

test('Start ohne Skriptfehler (Shell und Tool)', async () => {
  const a = await launchApp();
  try {
    await toolFrame(a.win);
    await a.win.waitForTimeout(2500);
    const real = a.errors.filter((e) => !/ERR_NAME_NOT_RESOLVED|net::ERR_/.test(e));
    assert.deepEqual(real, []);
  } finally { await a.close(); }
});

test('Offline: fehlgeschlagene automatische Update-Pruefung sperrt die App nicht', async () => {
  const a = await launchApp({ offline: true, env: { PS_FORCE_DEV_UPDATE: '1' } });
  try {
    await toolFrame(a.win);
    await a.win.waitForTimeout(10000); // Auto-Pruefung startet nach 5 s
    const overlay = await a.win.evaluate(() => getComputedStyle(document.getElementById('forced-update-overlay')).display);
    assert.equal(overlay, 'none', 'Vollbild-Dialog "Update erforderlich" darf bei Pruefungsfehler nicht erscheinen');
  } finally { await a.close(); }
});

test('Links zu arcangeli.eu oeffnen extern und lassen das Tool intakt', async () => {
  const a = await launchApp();
  try {
    const f = await toolFrame(a.win);
    await a.app.evaluate(({ shell }) => { globalThis.__ext = []; shell.openExternal = async (u) => { globalThis.__ext.push(u); }; });
    await f.click('a[href*="arcangeli.eu"] >> nth=0');
    await a.win.waitForTimeout(2000);
    const still = a.win.frames().some((fr) => fr.url().includes('privacy-shield.html'));
    assert.ok(still, 'Tool-Frame wurde durch die Navigation ersetzt');
    const ext = await a.app.evaluate(() => globalThis.__ext);
    assert.ok(ext.length === 1 && ext[0].startsWith('https://arcangeli.eu'), 'Link muss im System-Browser geoeffnet werden: ' + JSON.stringify(ext));
  } finally { await a.close(); }
});

test('Offline: ein vom Nutzer gestarteter Update-Download meldet den Fehler weiterhin', async () => {
  const a = await launchApp({ offline: true, env: { PS_FORCE_DEV_UPDATE: '1' } });
  try {
    await toolFrame(a.win);
    await a.win.evaluate(() => window.electronAPI.startDownload());
    await a.win.waitForTimeout(1500);
    const st = await a.win.evaluate(() => ({
      overlay: getComputedStyle(document.getElementById('forced-update-overlay')).display,
      msg: getComputedStyle(document.getElementById('download-error-msg')).display,
    }));
    assert.deepEqual(st, { overlay: 'flex', msg: 'block' });
  } finally { await a.close(); }
});
