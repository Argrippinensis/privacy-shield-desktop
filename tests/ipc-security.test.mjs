// F2.h: Haertung der Bruecke zwischen Oberflaeche und Hauptprozess.
// Kanaele pruefen den Absender, Argumente werden validiert, postMessage ist an den Ursprung gebunden,
// Berechtigungen sind auf das Kopieren beschraenkt.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchApp, toolFrame, ROOT } from './helpers.mjs';

const CHANNELS = [
  'save-file', 'open-file', 'get-app-version', 'get-system-stats', 'dismiss-update', 'copy-text',
  'check-assets', 'get-update-mode', 'open-download-page', 'start-download', 'check-for-updates', 'quit-app',
];
const TRUSTED = 'app://ps/index.html';
const EVIL = 'https://evil.example/';

// Ruft einen Kanal im Hauptprozess ueber den Testhaken auf. Seiteneffekte (Dialoge, Browser, Beenden) sind ersetzt.
async function invoke(a, channel, senderFrame, args = []) {
  return a.app.evaluate(async ({ app, dialog, shell }, { channel, senderFrame, args }) => {
    dialog.showSaveDialog = async () => { globalThis.__saveCalls = (globalThis.__saveCalls || 0) + 1; return { canceled: true }; };
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
    shell.openExternal = async () => {};
    const origQuit = app.quit, origExit = app.exit;
    app.quit = () => {}; app.exit = () => {};
    if (!globalThis.__psIpc) { app.quit = origQuit; app.exit = origExit; return { ok: false, err: 'kein Testhaken __psIpc' }; }
    try {
      const r = await globalThis.__psIpc.invoke(channel, { senderFrame }, ...args);
      return { ok: true, result: r === undefined ? null : JSON.parse(JSON.stringify(r)) };
    } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
    finally { app.quit = origQuit; app.exit = origExit; }
  }, { channel, senderFrame, args });
}

test('Testhaken __psIpc existiert mit PS_TEST_HOOKS=1 und listet alle 12 Kanaele', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const ch = await a.app.evaluate(() => globalThis.__psIpc ? [...globalThis.__psIpc.channels].sort() : null);
    assert.deepEqual(ch, [...CHANNELS].sort());
  } finally { await a.close(); }
});

test('Ohne PS_TEST_HOOKS existiert der Testhaken nicht', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '' } });
  try {
    assert.equal(await a.app.evaluate(() => typeof globalThis.__psIpc), 'undefined');
  } finally { await a.close(); }
});

for (const ch of CHANNELS) {
  test(`Kanal ${ch} lehnt fremden Absender (https://evil.example/) ab`, async () => {
    const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
    try {
      const r = await invoke(a, ch, { url: EVIL });
      assert.equal(r.ok, false, 'Aufruf haette scheitern muessen');
      assert.match(r.err, /untrusted sender/);
    } finally { await a.close(); }
  });

  test(`Kanal ${ch} lehnt fehlenden Absenderrahmen (senderFrame null) ab`, async () => {
    const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
    try {
      const r = await invoke(a, ch, null);
      assert.equal(r.ok, false, 'Aufruf haette scheitern muessen');
      assert.match(r.err, /untrusted sender/);
    } finally { await a.close(); }
  });

  test(`Kanal ${ch} akzeptiert den Absender app://ps/index.html`, async () => {
    const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
    try {
      const valid = {
        'save-file': [{ defaultName: 'x.txt', data: 'aGFsbG8=', mimeType: 'text/plain' }],
        'dismiss-update': ['1.2.3'], 'copy-text': ['x'], 'check-assets': [false],
      }[ch] || [];
      const r = await invoke(a, ch, { url: TRUSTED }, valid);
      assert.ok(r.ok || !/untrusted sender/.test(r.err), 'vertrauenswuerdiger Absender abgelehnt: ' + r.err);
      assert.ok(r.err !== 'kein Testhaken __psIpc', r.err);
    } finally { await a.close(); }
  });
}

test('save-file mit Zahl als defaultName wirft invalid argument und schreibt nichts', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const r = await invoke(a, 'save-file', { url: TRUSTED }, [{ defaultName: 123, data: 'aGFsbG8=', mimeType: 'text/plain' }]);
    assert.equal(r.ok, false);
    assert.match(r.err, /invalid argument/);
    assert.equal(await a.app.evaluate(() => globalThis.__saveCalls || 0), 0, 'kein Speicherdialog erwartet');
  } finally { await a.close(); }
});

test('save-file mit Pfadtrenner im defaultName wirft invalid argument', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    for (const name of ['../x.txt', 'a/b.txt', 'a\\b.txt']) {
      const r = await invoke(a, 'save-file', { url: TRUSTED }, [{ defaultName: name, data: 'aGFsbG8=', mimeType: 'text/plain' }]);
      assert.equal(r.ok, false, name);
      assert.match(r.err, /invalid argument/, name);
    }
    assert.equal(await a.app.evaluate(() => globalThis.__saveCalls || 0), 0);
  } finally { await a.close(); }
});

test('save-file mit defaultName ueber 120 Zeichen wirft invalid argument', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const r = await invoke(a, 'save-file', { url: TRUSTED }, [{ defaultName: 'a'.repeat(121), data: 'aGFsbG8=', mimeType: 'text/plain' }]);
    assert.equal(r.ok, false);
    assert.match(r.err, /invalid argument/);
  } finally { await a.close(); }
});

test('save-file mit data, das keine Zeichenkette ist, wirft invalid argument', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const r = await invoke(a, 'save-file', { url: TRUSTED }, [{ defaultName: 'x.txt', data: { length: 3 }, mimeType: 'text/plain' }]);
    assert.equal(r.ok, false);
    assert.match(r.err, /invalid argument/);
    assert.equal(await a.app.evaluate(() => globalThis.__saveCalls || 0), 0);
  } finally { await a.close(); }
});

test('save-file mit mimeType ausserhalb der festen Liste wirft invalid argument', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const r = await invoke(a, 'save-file', { url: TRUSTED }, [{ defaultName: 'x.exe', data: 'aGFsbG8=', mimeType: 'application/x-msdownload' }]);
    assert.equal(r.ok, false);
    assert.match(r.err, /invalid argument/);
    assert.equal(await a.app.evaluate(() => globalThis.__saveCalls || 0), 0);
  } finally { await a.close(); }
});

test('save-file ohne Argumentobjekt wirft invalid argument', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const r = await invoke(a, 'save-file', { url: TRUSTED }, []);
    assert.equal(r.ok, false);
    assert.match(r.err, /invalid argument/);
  } finally { await a.close(); }
});

test('copy-text mit Zahl wirft invalid argument und laesst die Zwischenablage unveraendert', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    await a.app.evaluate(({ clipboard }) => clipboard.writeText('vorher'));
    const r = await invoke(a, 'copy-text', { url: TRUSTED }, [42]);
    assert.equal(r.ok, false);
    assert.match(r.err, /invalid argument/);
    assert.equal(await a.app.evaluate(({ clipboard }) => clipboard.readText()), 'vorher');
  } finally { await a.close(); }
});

test('copy-text mit mehr als 5000 Zeichen wirft invalid argument', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    await a.app.evaluate(({ clipboard }) => clipboard.writeText('vorher'));
    const r = await invoke(a, 'copy-text', { url: TRUSTED }, ['x'.repeat(5001)]);
    assert.equal(r.ok, false);
    assert.match(r.err, /invalid argument/);
    assert.equal(await a.app.evaluate(({ clipboard }) => clipboard.readText()), 'vorher');
  } finally { await a.close(); }
});

test('dismiss-update akzeptiert nur Versionen der Form 1.2.3', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    for (const bad of ['1.2', 'x.y.z', '1.2.3-beta', '1.2.3\n', 7, null, { v: '1.2.3' }]) {
      const r = await invoke(a, 'dismiss-update', { url: TRUSTED }, [bad]);
      assert.equal(r.ok, false, JSON.stringify(bad));
      assert.match(r.err, /invalid argument/, JSON.stringify(bad));
    }
  } finally { await a.close(); }
});

test('check-assets mit einer Zeichenkette statt Boolean wirft invalid argument', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const r = await invoke(a, 'check-assets', { url: TRUSTED }, ['true']);
    assert.equal(r.ok, false);
    assert.match(r.err, /invalid argument/);
  } finally { await a.close(); }
});

test('main.js enthaelt ipcMain.handle( genau einmal (nur in der Hilfsfunktion handle)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  assert.equal(src.split('ipcMain.handle(').length - 1, 1);
});

test('main.js und preload.js kennen save-metadata nicht mehr', () => {
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'), /save-metadata/);
  const pre = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  assert.doesNotMatch(pre, /save-metadata|saveMetadata/);
});

test('Kopieren-Knopf legt den anonymisierten Text in die Zwischenablage (Berechtigung clipboard-sanitized-write)', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => { startApp(); document.getElementById('IT').value = 'Herr Thomas Mueller wohnt in Berlin.'; return anon(); });
    await a.app.evaluate(({ clipboard }) => clipboard.writeText(''));
    const expected = await f.evaluate(() => document.getElementById('AT').value);
    assert.ok(expected.length > 0, 'anonymisierter Text fehlt');
    await a.win.bringToFront();
    await f.click('button[onclick="cpAnon()"]');
    await a.win.waitForTimeout(800);
    assert.equal(await a.app.evaluate(({ clipboard }) => clipboard.readText()), expected);
  } finally { await a.close(); }
});

test('Berechtigungspruefung erlaubt nur clipboard-sanitized-write', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const res = await f.evaluate(async () => {
      const q = async (n) => { try { return (await navigator.permissions.query({ name: n })).state; } catch (e) { return 'err'; } };
      return { clip: await q('clipboard-write'), geo: await q('geolocation'), notif: await q('notifications') };
    });
    assert.notEqual(res.geo, 'granted');
    assert.notEqual(res.notif, 'granted');
    assert.equal(res.clip, 'granted');
  } finally { await a.close(); }
});

test('getUserMedia wird mit NotAllowedError abgelehnt', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const name = await f.evaluate(async () => {
      try { await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); return 'erlaubt'; } catch (e) { return e.name; }
    });
    assert.equal(name, 'NotAllowedError');
  } finally { await a.close(); }
});

// Zaehler fuer den Datei-Oeffnen-Dialog der Huelle
async function countOpenDialog(a) {
  await a.app.evaluate(({ dialog }) => {
    globalThis.__openCalls = 0;
    dialog.showOpenDialog = async () => { globalThis.__openCalls++; return { canceled: true, filePaths: [] }; };
  });
}
const openCalls = (a) => a.app.evaluate(() => globalThis.__openCalls);

test('Huelle ignoriert eine message eines fremden Ursprungs und oeffnet keinen Dateidialog', async () => {
  const a = await launchApp({ offline: true });
  try {
    await toolFrame(a.win);
    await countOpenDialog(a);
    await a.win.evaluate(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'electron-open-file' }, origin: 'https://evil.example' })));
    await a.win.waitForTimeout(800);
    assert.equal(await openCalls(a), 0);
  } finally { await a.close(); }
});

test('Huelle ignoriert eine message mit richtigem Ursprung, aber fremder Quelle (nicht das Werkzeug-Frame)', async () => {
  const a = await launchApp({ offline: true });
  try {
    await toolFrame(a.win);
    await countOpenDialog(a);
    await a.win.evaluate(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'electron-open-file' }, origin: 'app://ps', source: null })));
    await a.win.waitForTimeout(800);
    assert.equal(await openCalls(a), 0);
  } finally { await a.close(); }
});

test('Huelle bedient weiterhin eine echte Nachricht des Werkzeug-Frames (Kontrolle)', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await countOpenDialog(a);
    await f.evaluate(() => window.parent.postMessage({ type: 'electron-open-file' }, '*'));
    await a.win.waitForTimeout(1000);
    assert.equal(await openCalls(a), 1);
  } finally { await a.close(); }
});

test('Antwort der Huelle an das Werkzeug geht mit Zielursprung app://ps statt *', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await countOpenDialog(a);
    await f.evaluate(() => {
      window.__replyOrigin = null;
      window.addEventListener('message', (e) => { if (e.data && e.data.type === 'electron-open-result') window.__replyOrigin = e.origin; });
    });
    // Zielursprung der Antwort mitschneiden: postMessage des Werkzeug-Fensters in der Huelle umhaengen
    await a.win.evaluate(() => {
      const cw = document.getElementById('tool-frame').contentWindow;
      window.__targets = [];
      const orig = cw.postMessage.bind(cw);
      cw.postMessage = (msg, target, ...r) => { window.__targets.push(target); return orig(msg, target, ...r); };
    });
    await f.evaluate(() => window.parent.postMessage({ type: 'electron-open-file' }, '*'));
    await a.win.waitForTimeout(1000);
    const targets = await a.win.evaluate(() => window.__targets);
    assert.ok(targets.length >= 1, 'keine Antwort mitgeschnitten');
    assert.ok(targets.every((t) => t === 'app://ps'), 'Zielursprung: ' + JSON.stringify(targets));
  } finally { await a.close(); }
});

test('Werkzeug sendet die Update-Anfrage an app://ps statt *', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const target = await f.evaluate(() => {
      let t = null;
      const orig = window.parent.postMessage.bind(window.parent);
      window.parent.postMessage = (msg, target, ...r) => { t = target; return orig(msg, target, ...r); };
      checkForUpdate();
      return t;
    });
    assert.equal(target, 'app://ps');
  } finally { await a.close(); }
});
