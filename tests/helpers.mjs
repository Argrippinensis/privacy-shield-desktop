// Gemeinsame Helfer fuer die Electron-Tests (Playwright-Core, echte App).
// Auf Linux ohne Display: xvfb-run -a npm test
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { _electron } = require('playwright-core');
// Plattform- und Paketmerkmale fuer Tests, die nur dort sinnvoll sind
export const PACKAGED = !!process.env.PS_PACKAGED_BIN;          // gebautes Programm statt Quelltext: Quelltext-Varianten (makeAppVariant) greifen nicht
export const MAC = process.platform === 'darwin';               // unsigniert: manueller Update-Weg, kein automatischer Installer
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronPath = require('electron');

export async function launchApp({ offline = false, env = {}, appDir = ROOT, extraArgs = [], files = {}, userDataDir } = {}) {
  // userDataDir: vorgegebener Ordner (bleibt beim close() erhalten); sonst neuer Temp-Ordner (wird geloescht)
  const userData = userDataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'ps-test-'));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(userData, name), content);
  // PS_PACKAGED_BIN=<Pfad zur gepackten Anwendung>: Tests gegen das fertige Paket statt gegen den Quellbaum.
  const packaged = process.env.PS_PACKAGED_BIN;
  const args = [...(packaged ? [] : [appDir]), '--no-sandbox', `--user-data-dir=${userData}`, ...extraArgs];
  // Kein Netz: toter Proxy. Betrifft Chromium und electron-updater gleichermassen.
  if (offline) args.push('--proxy-server=http://127.0.0.1:9');
  const app = await _electron.launch({ executablePath: packaged || electronPath, args, env: { ...process.env, PS_BLOCK_EXTERNAL: '1', ...env } });
  let win;
  try {
    win = await app.firstWindow();
    // Playwright haengt sich bei schnellem Start erst nach dem Laden ein und kennt dann den Tool-Iframe nicht
    // (frames() liefert nur den leeren Hauptframe). Ein Reload macht die Frame-Struktur sichtbar.
    // Mit neueren Electron-Versionen (unter Windows gemessen: etwa jeder dritte Start nach dem ersten in einer Sitzung)
    // liefert firstWindow() die Seite, bevor sie aktiv angebunden ist; Page.reload meldet dann
    // "Not attached to an active page". Ein erneuter Versuch kurz danach gelingt. Nur dieser Fehler wird wiederholt.
    for (let versuch = 1; ; versuch++) {
      try {
        await win.reload({ waitUntil: 'load' });
        break;
      } catch (e) {
        if (versuch >= 10 || !/Not attached to an active page/i.test(String(e && e.message))) throw e;
        console.error(`launchApp: Reload-Versuch ${versuch} fehlgeschlagen (Seite noch nicht aktiv, url=${JSON.stringify(win.url())}); neuer Versuch`);
        await sleep(300);
      }
    }
  } catch (e) {
    // Sonst bliebe der Electron-Prozess stehen und der Testlauf haengt bis zum Zeitlimit.
    await app.close().catch(() => {});
    if (!userDataDir) fs.rmSync(userData, { recursive: true, force: true });
    throw e;
  }
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push('console: ' + m.text());
    });
  };
  watch(win);
  const requests = [];
  win.on('request', (r) => requests.push(r.url()));
  return {
    app, win, errors, requests, userData,
    async close() {
      await app.close().catch(() => {});
      if (!userDataDir) fs.rmSync(userData, { recursive: true, force: true });
    },
  };
}

export async function toolFrame(win, timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const f = win.frames().find((fr) => fr.url().includes('privacy-shield.html'));
    if (f) {
      // Erst zurueckgeben, wenn das Tool-Skript geladen ist (sonst Wettlauf mit dem Seitenaufbau).
      await f.waitForFunction(() => document.readyState === 'complete' && typeof anon === 'function', null, { timeout });
      return f;
    }
    await win.waitForTimeout(100);
  }
  throw new Error('Tool-Frame nicht gefunden; Frames: ' + JSON.stringify(win.frames().map((fr) => fr.url())));
}

// Downloads des Werkzeugs abfangen, ohne einen echten Download auszuloesen (Blob-Anker mit download-Attribut).
export function captureDownloads(frame) {
  return frame.evaluate(() => {
    window.__dls = [];
    const blobs = new Map();
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (b) => { const u = create(b); blobs.set(u, b); return u; };
    HTMLAnchorElement.prototype.click = function () {
      if (this.hasAttribute('download')) window.__dls.push({ name: this.getAttribute('download'), blob: blobs.get(this.href) });
    };
  });
}

// -> [{ name, type, size, base64 }] in der Reihenfolge der Klicks
export function getDownloads(frame) {
  return frame.evaluate(async () => {
    const out = [];
    for (const d of window.__dls || []) {
      const bytes = new Uint8Array(await d.blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      out.push({ name: d.name, type: d.blob.type, size: bytes.length, base64: btoa(bin) });
    }
    return out;
  });
}

// Dateien wie ueber die Dateiauswahl des Werkzeugs laden: [{ name, mimeType, buffer }]
export function setFiles(frame, files) {
  return frame.setInputFiles('#FI', files);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wiederholt fn(), bis cond(Ergebnis) gilt oder die Zeit ablaeuft; liefert den letzten Wert. Fuer Speicher-Messungen,
// die nach dem Beenden eines Workers etwas Zeit brauchen.
export async function waitFor(fn, cond, { timeout = 15000, interval = 500 } = {}) {
  const t0 = Date.now();
  let v = await fn();
  while (!cond(v) && Date.now() - t0 < timeout) { await sleep(interval); v = await fn(); }
  return v;
}

import { readFileSync } from 'fs';
export const GOLDEN = JSON.parse(readFileSync(path.join(ROOT, 'tests', 'golden', 'baseline.json'), 'utf8'));
export const SAMPLE = readFileSync(path.join(ROOT, 'tests', 'golden', 'sample.txt'), 'utf8');

// Text anonymisieren wie ein Nutzer (Eingabefeld -> anon()) und Ergebnis lesen.
export function runAnon(frame, text) {
  return frame.evaluate(async (v) => {
    document.getElementById('IT').value = v;
    aiCache = { key: null, spans: [] };
    await anon();
    return { out: document.getElementById('AT').value, store: JSON.parse(JSON.stringify(store)) };
  }, text);
}

// PDF im Hauptprozess aus HTML erzeugen (Base64).
export function makePdf(app, html) {
  return app.evaluate(async ({ BrowserWindow }, h) => {
    const w = new BrowserWindow({ show: false });
    await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(h));
    const buf = await w.webContents.printToPDF({ pageSize: 'A4' });
    w.destroy();
    return buf.toString('base64');
  }, html);
}

// Lokaler Update-Server (Mock) fuer Updater-Tests: liefert latest*.yml, Installer-Dateien gibt es nicht (404).
import http from 'http';
export function startUpdateServer({ version = '99.0.0', notes = '' } = {}) {
  const hits = [];
  const sha = Buffer.alloc(64, 1).toString('base64');
  const name = `PrivacyShield-${version}.AppImage`;
  const yml = `version: ${version}\nfiles:\n  - url: ${name}\n    sha512: ${sha}\n    size: 1000\npath: ${name}\nsha512: ${sha}\nreleaseDate: '2026-10-20T00:00:00.000Z'\n` + (notes ? `releaseNotes: ${JSON.stringify(notes)}\n` : '');
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    if (/latest.*\.yml$/.test(req.url.split('?')[0])) { res.writeHead(200, { 'Content-Type': 'text/yaml' }); return res.end(yml); }
    res.writeHead(404); res.end('nicht vorhanden');
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}`, hits, close: () => new Promise((r) => server.close(r)) })));
}

// Kopie des Programms mit absichtlich beschaedigter Installation (fuer Fehlerdiagnose-Tests).
// dropModel: Modelldatei fehlt; truncateModelTo: Modelldatei auf n Bytes gekuerzt; dropManifest: vendor-manifest.json fehlt.
// Alles andere wird verknuepft (Verzeichnisse als "junction": unter Windows ohne Administratorrechte moeglich).
export function makeAppVariant({ dropModel = false, truncateModelTo = null, dropManifest = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-variant-'));
  for (const f of ['main.js', 'preload.js', 'package.json']) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  for (const d of ['node_modules', 'assets']) fs.symlinkSync(path.join(ROOT, d), path.join(dir, d), 'junction');
  fs.mkdirSync(path.join(dir, 'app'));
  for (const e of fs.readdirSync(path.join(ROOT, 'app'))) {
    if (e === 'models' || (e === 'vendor-manifest.json' && dropManifest)) continue;
    const src = path.join(ROOT, 'app', e);
    if (fs.statSync(src).isDirectory()) fs.symlinkSync(src, path.join(dir, 'app', e), 'junction');
    else fs.copyFileSync(src, path.join(dir, 'app', e));
  }
  const rel = path.join('models', 'Xenova', 'distilbert-base-multilingual-cased-ner-hrl');
  fs.mkdirSync(path.join(dir, 'app', rel, 'onnx'), { recursive: true });
  for (const f of fs.readdirSync(path.join(ROOT, 'app', rel))) if (f !== 'onnx') fs.copyFileSync(path.join(ROOT, 'app', rel, f), path.join(dir, 'app', rel, f));
  if (!dropModel) {
    const src = path.join(ROOT, 'app', rel, 'onnx', 'model_quantized.onnx'), dst = path.join(dir, 'app', rel, 'onnx', 'model_quantized.onnx');
    if (truncateModelTo) { const b = Buffer.alloc(truncateModelTo); const fd = fs.openSync(src, 'r'); fs.readSync(fd, b, 0, b.length, 0); fs.closeSync(fd); fs.writeFileSync(dst, b); }
    else fs.copyFileSync(src, dst);
  }
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
