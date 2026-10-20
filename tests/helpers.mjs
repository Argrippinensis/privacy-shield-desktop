// Gemeinsame Helfer fuer die Electron-Tests (Playwright-Core, echte App).
// Auf Linux ohne Display: xvfb-run -a npm test
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { _electron } = require('playwright-core');
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronPath = require('electron');

export async function launchApp({ offline = false, env = {}, appDir = ROOT, extraArgs = [], files = {} } = {}) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-test-'));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(userData, name), content);
  // PS_PACKAGED_BIN=<Pfad zur gepackten Anwendung>: Tests gegen das fertige Paket statt gegen den Quellbaum.
  const packaged = process.env.PS_PACKAGED_BIN;
  const args = [...(packaged ? [] : [appDir]), '--no-sandbox', `--user-data-dir=${userData}`, ...extraArgs];
  // Kein Netz: toter Proxy. Betrifft Chromium und electron-updater gleichermassen.
  if (offline) args.push('--proxy-server=http://127.0.0.1:9');
  const app = await _electron.launch({ executablePath: packaged || electronPath, args, env: { ...process.env, PS_BLOCK_EXTERNAL: '1', ...env } });
  const win = await app.firstWindow();
  // Playwright haengt sich bei schnellem Start erst nach dem Laden ein und kennt dann den Tool-Iframe nicht
  // (frames() liefert nur den leeren Hauptframe). Ein Reload macht die Frame-Struktur sichtbar.
  await win.reload({ waitUntil: 'load' });
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
      fs.rmSync(userData, { recursive: true, force: true });
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
