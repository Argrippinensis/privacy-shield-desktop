// Updater: Nutzer werden nie ausgesperrt; wo Installieren nicht geht, gibt es einen manuellen Weg.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, startUpdateServer, MAC } from './helpers.mjs';

const FORCED_STATE = JSON.stringify({ version: '99.0.0', dismissCount: 3 });
const css = (win, id) => win.evaluate((i) => getComputedStyle(document.getElementById(i)).display, id);

test('Manueller Modus: Hinweis statt Zwangs-Dialog, Download-Seite oeffnet im Browser', async () => {
  const srv = await startUpdateServer({ notes: 'Neu: Erkennung verbessert' });
  const a = await launchApp({ env: { PS_FORCE_DEV_UPDATE: '1', PS_UPDATE_FEED: srv.url, PS_FORCE_MANUAL_UPDATE: '1' }, files: { 'update-state.json': FORCED_STATE } });
  try {
    await toolFrame(a.win);
    await a.win.waitForFunction(() => getComputedStyle(document.getElementById('update-banner')).display === 'flex', null, { timeout: 20000 });
    assert.equal(await css(a.win, 'forced-update-overlay'), 'none', 'Zwangs-Dialog darf im manuellen Modus nie erscheinen');
    assert.match(await a.win.textContent('#banner-notes'), /Erkennung verbessert/);
    assert.equal(await a.win.textContent('#btn-update'), 'Jetzt herunterladen');
    await a.win.click('#btn-update');
    await a.win.waitForTimeout(500);
    assert.deepEqual(await a.app.evaluate(() => globalThis.__psExternal), ['https://arcangeli.eu/desktop/']);
  } finally { await a.close(); await srv.close(); }
});

test('Automatischer Modus: nach 3x Spaeter kommt der Pflicht-Dialog, bei Fehlschlag gibt es einen Ausweg', { skip: MAC && 'macOS: manueller Update-Weg (unsigniert)' }, async () => {
  const srv = await startUpdateServer();
  const a = await launchApp({ env: { PS_FORCE_DEV_UPDATE: '1', PS_UPDATE_FEED: srv.url, APPIMAGE: '/tmp/ps-fake.AppImage' }, files: { 'update-state.json': FORCED_STATE } });
  try {
    await toolFrame(a.win);
    await a.win.waitForFunction(() => getComputedStyle(document.getElementById('forced-update-overlay')).display === 'flex', null, { timeout: 20000 });
    await a.win.click('#btn-force-update'); // Installer existiert auf dem Mock-Server nicht -> Download scheitert
    await a.win.waitForFunction(() => getComputedStyle(document.getElementById('download-error-msg')).display === 'block', null, { timeout: 20000 });
    assert.notEqual(await css(a.win, 'btn-continue'), 'none', '"Ohne Update fortfahren" fehlt');
    assert.notEqual(await css(a.win, 'btn-manual'), 'none', '"Manuell herunterladen" fehlt');
    await a.win.click('#btn-continue');
    assert.equal(await css(a.win, 'forced-update-overlay'), 'none', 'Nutzer bleibt ausgesperrt');
  } finally { await a.close(); await srv.close(); }
});

test('Ohne gespeicherte Ablehnungen erscheint nur das Banner mit Zaehler', { skip: MAC && 'macOS: manueller Update-Weg (unsigniert)' }, async () => {
  const srv = await startUpdateServer();
  const a = await launchApp({ env: { PS_FORCE_DEV_UPDATE: '1', PS_UPDATE_FEED: srv.url, APPIMAGE: '/tmp/ps-fake.AppImage' } });
  try {
    await toolFrame(a.win);
    await a.win.waitForFunction(() => getComputedStyle(document.getElementById('update-banner')).display === 'flex', null, { timeout: 20000 });
    assert.equal(await css(a.win, 'forced-update-overlay'), 'none');
    assert.match(await a.win.textContent('#btn-later'), /Später \(3×\)/);
  } finally { await a.close(); await srv.close(); }
});
