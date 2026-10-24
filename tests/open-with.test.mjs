// E2: "Oeffnen mit" und Einzelinstanz (E2E, echte App).
// Auf Linux ohne Display: xvfb-run -a node --test --test-concurrency=1 tests/open-with.test.mjs
// Zweite Instanz und CLI-Laeufe werden per child_process.spawn gestartet; nach jedem Test wird die ganze Prozessgruppe beendet.
// Alle Testdaten sind erfunden und werden im Test erzeugt.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchApp, toolFrame, ROOT, PACKAGED, sleep } from './helpers.mjs';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const TRUSTED = 'app://ps/index.html';
const EVIL = 'https://evil.example/';

const tmpDirs = [];
function tmp(prefix = 'ps-ow-') {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}
after(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });

// Startet das Programm als eigenen Prozess (eigene Prozessgruppe). Liefert { code, signal, timedOut, all, ms }.
function runProc(args, { env = {}, timeout = 30000 } = {}) {
  return new Promise((resolve) => {
    const argv = [...(PACKAGED ? [] : [ROOT]), '--no-sandbox', ...args];
    const childEnv = { ...process.env, PS_BLOCK_EXTERNAL: '1', ...env };
    delete childEnv.ELECTRON_RUN_AS_NODE;
    const t0 = Date.now();
    const child = spawn(PACKAGED || electronPath, argv, { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    let out = '', timedOut = false, done = false;
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const killAll = () => { try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL'); } catch (e) { /* schon beendet */ } };
    const timer = setTimeout(() => { timedOut = true; killAll(); }, timeout);
    const finish = (code, signal) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      killAll();
      resolve({ code, signal, timedOut, all: out, ms: Date.now() - t0 });
    };
    child.on('error', (e) => { out += 'spawn: ' + e.message; finish(-1, null); });
    child.on('close', finish);
  });
}

const items = (f) => f.$$eval('#PRJPANEL button.prj-item', (els) => els.map((e) => e.textContent));
const toastText = (f) => f.evaluate(() => (document.getElementById('TT') || {}).textContent || '');
async function waitToast(f, re, timeout = 12000) {
  const t0 = Date.now();
  let t = await toastText(f);
  while (!re.test(t) && Date.now() - t0 < timeout) { await sleep(150); t = await toastText(f); }
  return t;
}

// ---------------------------------------------------------------- (1) Start mit Dateiargument

test('(1) Start mit Dateiargument laedt die Datei: #IT enthaelt den Text', async () => {
  const dir = tmp();
  const file = path.join(dir, 'Notiz.txt');
  fs.writeFileSync(file, 'Frau Erika Beispiel hat am Montag angerufen.');
  const a = await launchApp({ offline: true, extraArgs: [file] });
  try {
    const f = await toolFrame(a.win);
    await f.waitForFunction(() => /Erika Beispiel/.test((document.getElementById('IT') || {}).value || ''), null, { timeout: 12000 });
    assert.match(await f.inputValue('#IT'), /Erika Beispiel hat am Montag angerufen/);
  } finally { await a.close(); }
});

// ---------------------------------------------------------------- (2) Zweite Instanz

test('(2) zweiter Start mit gleichem userData und weiterer Datei: zweiter Prozess endet mit 0 (unter 10 s), erste App hat beide Dateien in der Projektliste und genau ein Fenster', async () => {
  const dir = tmp();
  const userData = tmp('ps-ow-ud-');
  const f1 = path.join(dir, 'Datei1.txt'), f2 = path.join(dir, 'Datei2.txt');
  fs.writeFileSync(f1, 'Herr Max Mustermann, Datei eins.');
  fs.writeFileSync(f2, 'Frau Erika Beispiel, Datei zwei.');
  const a = await launchApp({ offline: true, userDataDir: userData, extraArgs: [f1] });
  try {
    const f = await toolFrame(a.win);
    await f.waitForFunction(() => /Datei eins/.test((document.getElementById('IT') || {}).value || ''), null, { timeout: 12000 });
    const r = await runProc([`--user-data-dir=${userData}`, f2], { timeout: 20000 });
    assert.equal(r.timedOut, false, 'zweiter Prozess haengt: ' + r.all.slice(-300));
    assert.equal(r.code, 0, 'Exit-Code der zweiten Instanz: ' + r.code + ' ' + r.all.slice(-300));
    assert.ok(r.ms < 10000, `zweiter Prozess brauchte ${r.ms} ms`);
    await f.waitForFunction(() => document.querySelectorAll('#PRJPANEL button.prj-item').length === 2, null, { timeout: 12000 });
    const list = (await items(f)).join(' | ');
    assert.match(list, /Datei1/);
    assert.match(list, /Datei2/);
    const n = await a.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
    assert.equal(n, 1, 'genau ein Fenster');
  } finally { await a.close(); }
});

// ---------------------------------------------------------------- (3) Unbekannte Endung

test('(3) unbekannte Endung (x.exe) ergibt die Meldung "Dateityp nicht unterstuetzt" und keine Liste', async () => {
  const dir = tmp();
  const file = path.join(dir, 'x.exe');
  fs.writeFileSync(file, 'MZ erfundener Inhalt');
  const a = await launchApp({ offline: true, extraArgs: [file] });
  try {
    const f = await toolFrame(a.win);
    const t = await waitToast(f, /Dateityp nicht unterst/);
    assert.match(t, /Dateityp nicht unterst.tzt/);
    assert.deepEqual(await items(f), []);
    assert.equal(await f.inputValue('#IT'), '');
    assert.ok(!t.includes(dir), 'Meldung darf keinen Pfad enthalten');
  } finally { await a.close(); }
});

// ---------------------------------------------------------------- (4) Zu grosse Datei

test('(4) Datei ueber 30 MB ergibt die Meldung "Datei zu gross"', async () => {
  const dir = tmp();
  const file = path.join(dir, 'gross.txt');
  fs.writeFileSync(file, Buffer.alloc(31 * 1024 * 1024, 0x61));
  const a = await launchApp({ offline: true, extraArgs: [file] });
  try {
    const f = await toolFrame(a.win);
    const t = await waitToast(f, /Datei zu gro/, 15000);
    assert.match(t, /Datei zu gro.* \(max 30 MB\)/);
    assert.deepEqual(await items(f), []);
    assert.ok(!t.includes(dir), 'Meldung darf keinen Pfad enthalten');
  } finally { await a.close(); }
});

// ---------------------------------------------------------------- (5) CLI ohne Einzelinstanz-Sperre

test('(5) im CLI-Modus keine Einzelinstanz-Sperre: zwei gleichzeitige CLI-Laeufe mit verschiedenen --out gelingen beide', async () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'a.txt'), 'Frau Erika Beispiel, erfundener Text.');
  const out1 = path.join(tmp(), 'o1'), out2 = path.join(tmp(), 'o2');
  const [r1, r2] = await Promise.all([
    runProc(['--cli', '--in', dir, '--out', out1, '--ai', 'off', '--quiet']),
    runProc(['--cli', '--in', dir, '--out', out2, '--ai', 'off', '--quiet']),
  ]);
  for (const [r, out] of [[r1, out1], [r2, out2]]) {
    assert.equal(r.timedOut, false, 'CLI-Lauf haengt: ' + r.all.slice(-300));
    assert.equal(r.code, 0, 'CLI-Exit-Code ' + r.code + ': ' + r.all.slice(-300));
    assert.ok(fs.existsSync(out) && fs.readdirSync(out).length > 0, 'keine Ausgabe in ' + path.basename(out));
  }
});

// ---------------------------------------------------------------- Kanal take-opened-files und statische Pruefung

const mainSrc = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');

test('statisch: kein Kanal ausser save-file/open-file liest einen Dateipfad aus Argumenten der Seite', () => {
  const re = /^handle\(\s*'([a-z0-9-]+)'\s*,\s*(async\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/gm;
  const heads = [];
  let m;
  while ((m = re.exec(mainSrc))) heads.push({ name: m[1], params: (m[3] !== undefined ? m[3] : m[4] || '').split(',').map((s) => s.trim()).filter(Boolean), start: m.index });
  assert.ok(heads.length >= 10, 'Kanaele nicht gefunden: ' + heads.length);
  const ALLOWED = ['save-file', 'open-file'];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    if (ALLOWED.includes(h.name)) continue;
    const rest = mainSrc.slice(h.start, i + 1 < heads.length ? heads[i + 1].start : undefined);
    const end = rest.search(/\n\}\);?[ \t]*(\n|$)/); // Handler endet mit "});" am Zeilenanfang (oder ist einzeilig)
    const body = end < 0 ? rest.split('\n')[0] : rest.slice(0, end);
    const extra = h.params.slice(1); // erster Parameter ist das Ereignis
    if (!extra.length) continue; // ohne Argument von der Seite
    assert.ok(!/\bfs\b|readFile|createReadStream|statSync|openPath|showItemInFolder/.test(body.replace(/\/\/.*$/gm, '')),
      `Kanal ${h.name} nimmt Argumente (${extra.join(', ')}) und greift auf Dateien zu`);
  }
  assert.ok(heads.some((h) => h.name === 'take-opened-files'), "main.js enthaelt keinen Kanal 'take-opened-files'");
  const take = heads.find((h) => h.name === 'take-opened-files');
  assert.deepEqual(take && take.params.slice(1), [], 'take-opened-files darf kein Argument von der Seite lesen');
});

async function invoke(a, channel, senderFrame, args = []) {
  return a.app.evaluate(async (_, { channel, senderFrame, args }) => {
    if (!globalThis.__psIpc) return { ok: false, err: 'kein Testhaken __psIpc' };
    try {
      const r = await globalThis.__psIpc.invoke(channel, { senderFrame }, ...args);
      return { ok: true, result: r === undefined ? null : JSON.parse(JSON.stringify(r)) };
    } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
  }, { channel, senderFrame, args });
}

test('Kanal take-opened-files: in der Kanalliste, fremder Absender abgelehnt, vertrauter liefert Liste, Pfad-Argument der Seite wird ignoriert', async () => {
  const dir = tmp();
  const secret = path.join(dir, 'geheim.txt');
  fs.writeFileSync(secret, 'darf nie ueber die Bruecke gelesen werden');
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const ch = await a.app.evaluate(() => globalThis.__psIpc ? [...globalThis.__psIpc.channels] : null);
    assert.ok(ch && ch.includes('take-opened-files'), 'Kanal take-opened-files fehlt');
    const bad = await invoke(a, 'take-opened-files', { url: EVIL });
    assert.equal(bad.ok, false);
    assert.match(bad.err, /untrusted sender/);
    const none = await invoke(a, 'take-opened-files', null);
    assert.equal(none.ok, false);
    const good = await invoke(a, 'take-opened-files', { url: TRUSTED }, [secret]);
    assert.equal(good.ok, true, good.err);
    assert.deepEqual(good.result, [], 'ohne vorgemerkte Dateien muss die Liste leer sein, auch bei Pfad-Argument');
    const again = await invoke(a, 'take-opened-files', { url: TRUSTED }, [{ path: secret }]);
    assert.deepEqual(again.result, []);
  } finally { await a.close(); }
});
