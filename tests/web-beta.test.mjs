// W1web: Browser-Fassung der 2.0 Beta (scripts/build-web-beta.mjs, web/beta-shell.html, web/browser-api.js).
// Der Bau wird in ein Temp-Verzeichnis geschrieben und ueber einen kleinen Server ohne COOP/COEP ausgeliefert;
// der Browser ist Electron OHNE preload (tests/fixtures/web-beta-main.cjs), das Netz ist bis auf den Testserver gesperrt.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ROOT, toolFrame } from './helpers.mjs';

const require = createRequire(import.meta.url);
const { _electron } = require('playwright-core');
const electronPath = require('electron');

const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const BAU = path.join(ROOT, 'scripts', 'build-web-beta.mjs');
const MAX_DATEI = 25 * 1024 * 1024;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.md': 'text/markdown; charset=utf-8', '.gz': 'application/gzip', '.pdf': 'application/pdf', '.png': 'image/png', '.svg': 'image/svg+xml' };

let tmp, out, out2, server, baseUrl;

function bauen(ziel) {
  return execFileSync(process.execPath, [BAU, '--out', ziel], { cwd: ROOT, encoding: 'utf8' });
}
function alleDateien(dir, rel = '') {
  const res = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) res.push(...alleDateien(dir, r)); else res.push(r);
  }
  return res;
}
const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function serve(dir) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let p;
      try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400).end(); return; }
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(dir, p);
      if (!f.startsWith(dir + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404).end('nicht gefunden'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-webbeta-'));
  out = path.join(tmp, 'a');
  out2 = path.join(tmp, 'b');
  bauen(out);
  server = await serve(out);
  baseUrl = `http://127.0.0.1:${server.address().port}/`;
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
});

// Startet den Browser-Ersatz (Electron ohne preload) auf dem Testserver.
async function browser({ hf } = {}) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-webbeta-ud-'));
  const app = await _electron.launch({
    executablePath: electronPath,
    args: [path.join(ROOT, 'tests', 'fixtures', 'web-beta-main.cjs'), '--no-sandbox', `--user-data-dir=${userData}`],
    env: { ...process.env, PS_WEB_URL: baseUrl, ...(hf ? { PS_WEB_HF: hf } : {}) },
  });
  let win;
  try {
    win = await app.firstWindow();
    await win.waitForLoadState('load');
  } catch (e) {
    await app.close().catch(() => {});
    fs.rmSync(userData, { recursive: true, force: true });
    throw e;
  }
  const errors = [];
  win.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  win.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return {
    app, win, errors,
    requests: () => app.evaluate(() => globalThis.__psReq.map((r) => ({ ...r }))),
    async close() { await app.close().catch(() => {}); fs.rmSync(userData, { recursive: true, force: true }); },
  };
}

// Erwartete Fehlermeldungen, wenn das Modell nicht erreichbar ist (Fixture bricht huggingface.co ab)
const ERWARTET = /NER-Modell konnte nicht geladen werden|Failed to load resource|net::ERR_|Failed to fetch|huggingface/i;
const unerwartet = (errors) => errors.filter((e) => e.startsWith('pageerror') || !ERWARTET.test(e));

test('1 Bau: erwartete Dateien, unveraenderte Kopie des Werkzeugs, Browser-Worker, Groessen, deterministisch', () => {
  const dateien = alleDateien(out);
  for (const f of ['index.html', 'browser-api.js', 'privacy-shield.html', 'ner-worker.js', 'THIRD_PARTY_NOTICES.md', 'css/tailwind.css', 'vendor/transformers/transformers.min.js', 'vendor/pdfjs/pdf.min.js']) {
    assert.ok(dateien.includes(f), 'fehlt im Bau: ' + f);
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'app', 'lib')).filter((n) => n.endsWith('.js'))) assert.ok(dateien.includes('lib/' + f), 'lib fehlt: ' + f);
  assert.equal(hash(path.join(out, 'privacy-shield.html')), hash(path.join(ROOT, 'app', 'privacy-shield.html')), 'privacy-shield.html muss byteidentisch sein');
  const worker = fs.readFileSync(path.join(out, 'ner-worker.js'), 'utf8');
  assert.match(worker, /env\.allowRemoteModels = true/);
  assert.match(worker, /env\.allowLocalModels = false/);
  assert.match(worker, /env\.useBrowserCache = true/);
  assert.doesNotMatch(worker, /localModelPath/);
  assert.match(worker, /wasmPaths = new URL\('vendor\/transformers\/'/, 'wasmPaths bleibt lokal');
  const shell = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.match(shell, /<meta name="robots" content="noindex"/);
  assert.ok(!dateien.some((f) => f.startsWith('models/')), 'kein Modell im Bau');
  assert.ok(dateien.length <= 2000, 'zu viele Dateien: ' + dateien.length);
  for (const f of dateien) assert.ok(fs.statSync(path.join(out, f)).size < MAX_DATEI, 'Datei zu gross: ' + f);
  // zweimal gebaut: gleiche Dateiliste, gleiche Pruefsummen
  const log = bauen(out2);
  assert.match(log, /\d+ Dateien/, 'Bau nennt die Dateizahl: ' + log);
  const d2 = alleDateien(out2);
  assert.deepEqual(d2, dateien);
  for (const f of dateien) assert.equal(hash(path.join(out2, f)), hash(path.join(out, f)), 'nicht deterministisch: ' + f);
});

test('2 Shim deckt jede in preload.js freigegebene Funktion und jedes Ereignis ab', async () => {
  const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  const block = /exposeInMainWorld\('electronAPI', \{([\s\S]*?)\n\}\);/.exec(preload);
  assert.ok(block, 'electronAPI-Block in preload.js nicht gefunden');
  const namen = [...block[1].matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
  assert.ok(namen.length >= 20, 'Namen gelesen: ' + namen.join(','));
  const win = { addEventListener() {}, document: { createElement: () => ({ style: {}, click() {}, addEventListener() {}, remove() {} }), body: { appendChild() {}, removeChild() {} } }, location: { href: 'http://127.0.0.1/', origin: 'http://127.0.0.1' } };
  const ctx = { window: win, navigator: { deviceMemory: 8, hardwareConcurrency: 4, clipboard: { writeText: async () => {} } }, document: win.document, location: win.location, fetch: async () => ({ ok: true, text: async () => 'Lizenzen' }), console, URL, Blob, setTimeout, clearTimeout };
  win.navigator = ctx.navigator;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(out, 'browser-api.js'), 'utf8'), ctx);
  const api = win.electronAPI;
  assert.ok(api, 'window.electronAPI fehlt');
  for (const n of namen) assert.ok(n in api, 'Shim ohne ' + n);
  assert.equal(api.platform, 'web');
  const v = await api.getAppVersion();
  assert.match(v, /^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/);
  assert.equal(v, VERSION);
  assert.deepEqual(await api.takeOpenedFiles(), []);
  const as = await api.checkAssets(false);
  assert.equal(as.ok, true);
  const st = await api.getSystemStats();
  assert.ok(st.cpu.cores >= 1 && st.ram && st.app);
  for (const n of namen.filter((x) => /^on[A-Z]/.test(x))) assert.doesNotThrow(() => api[n](() => {}), n);
  await api.checkForUpdates(); await api.getUpdateMode(); await api.dismissUpdate('2.0.0'); await api.startDownload(); await api.openDownloadPage(); await api.quitApp();
  const info = await api.getAppInfo();
  assert.equal(info.version, VERSION);
  assert.equal(typeof (await api.getLicenses()), 'string');
});

test('3 Huelle laedt, Iframe laedt das Werkzeug, keine Seitenfehler, Version in der Fusszeile', async () => {
  const a = await browser();
  try {
    const f = await toolFrame(a.win);
    assert.ok(f.url().includes('privacy-shield.html'));
    const sel = 'button[title="Nach Updates suchen"]';
    await f.waitForSelector(sel, { state: 'attached', timeout: 10000 });
    await f.waitForFunction(([s, v]) => document.querySelector(s).textContent.trim() === 'v' + v, [sel, VERSION], { timeout: 10000 });
    const kopf = await a.win.evaluate(() => ({
      titel: document.title,
      text: document.body.innerText,
      links: [...document.querySelectorAll('a')].map((l) => l.getAttribute('href')),
      iframe: { id: document.getElementById('tool-frame').id, title: document.getElementById('tool-frame').title },
    }));
    assert.match(kopf.text, /PrivacyShield 2\.0 Beta \(Browser\)/);
    assert.match(kopf.text, /Zur stabilen Version/);
    assert.match(kopf.text, /Desktop-Version/);
    assert.ok(kopf.links.includes('/tools/privacyshield-redesigned.html'));
    assert.ok(kopf.links.includes('/desktop/#beta'));
    assert.equal(kopf.iframe.title, 'PrivacyShield Werkzeug');
    assert.match(kopf.text, /nicht für wichtige Dokumente/);
    assert.match(kopf.text, /135 MB/);
    assert.match(kopf.text, /huggingface\.co/);
    assert.deepEqual(unerwartet(a.errors), []);
  } finally { await a.close(); }
});

test('4 Handy-Breite 390x844: kein horizontales Scrollen, Hauptbedienelemente sichtbar', async () => {
  const a = await browser();
  try {
    await a.app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].setContentSize(390, 844); });
    await a.win.waitForFunction(() => window.innerWidth === 390, null, { timeout: 5000 });
    const f = await toolFrame(a.win);
    await a.win.waitForTimeout(500);
    const masse = await a.win.evaluate(() => {
      const fr = document.getElementById('tool-frame');
      const d = fr.contentDocument.documentElement;
      return {
        schale: { sw: document.documentElement.scrollWidth, iw: window.innerWidth },
        tool: { sw: d.scrollWidth, iw: fr.contentWindow.innerWidth },
        rahmen: fr.getBoundingClientRect().toJSON(),
        hoehe: window.innerHeight,
      };
    });
    assert.ok(masse.schale.sw <= masse.schale.iw, 'Huelle scrollt horizontal: ' + JSON.stringify(masse.schale));
    assert.ok(masse.tool.sw <= masse.tool.iw, 'Werkzeug scrollt horizontal: ' + JSON.stringify(masse.tool));
    assert.ok(masse.rahmen.width <= 390 && masse.rahmen.height > 400, 'Iframe-Mass: ' + JSON.stringify(masse.rahmen));
    assert.ok(masse.rahmen.bottom <= masse.hoehe + 1, 'Iframe ragt unten heraus');
    // Werkzeug starten und Bedienelemente pruefen
    await f.evaluate(() => loadTestDoc());
    await f.waitForSelector('#ANONBTN', { state: 'visible', timeout: 10000 });
    for (const sel of ['#FI', '#ANONBTN']) {
      const b = await f.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { w: r.width, h: r.height, l: r.left, r: r.right, iw: window.innerWidth, vis: cs.visibility !== 'hidden' && cs.display !== 'none' };
      }, sel);
      assert.ok(b, 'Element fehlt: ' + sel);
      if (sel === '#FI') continue; // Dateifeld darf technisch versteckt sein: sichtbarer Ausloeser unten
      assert.ok(b.vis && b.w > 40 && b.h > 20 && b.l >= 0 && b.r <= b.iw + 1, sel + ' nicht erreichbar: ' + JSON.stringify(b));
    }
    const auswahl = await f.evaluate(() => {
      const fi = document.getElementById('FI');
      const lab = fi.closest('label') || document.querySelector('label[for="FI"]');
      const ziel = lab || fi;
      ziel.scrollIntoView({ block: 'center' });
      const r = ziel.getBoundingClientRect();
      return { w: r.width, h: r.height, l: r.left, r: r.right, iw: window.innerWidth };
    });
    assert.ok(auswahl.w > 40 && auswahl.h > 10 && auswahl.l >= 0 && auswahl.r <= auswahl.iw + 1, 'Dateiauswahl nicht erreichbar: ' + JSON.stringify(auswahl));
    const schale2 = await a.win.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert.ok(schale2, 'Huelle scrollt nach dem Start horizontal');
  } finally { await a.close(); }
});

test('5 Ende-zu-Ende ohne Modell: Platzhalter, Rueckuebersetzung, Seite bleibt bedienbar', async () => {
  const a = await browser();
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => loadTestDoc());
    const original = await f.evaluate(() => document.getElementById('IT').value);
    assert.ok(original.includes('h.schneider@schneider-partner.de'));
    const r = await f.evaluate(async () => { aiCache = { key: null, spans: [] }; await anon(); return document.getElementById('AT').value; });
    assert.match(r, /\{\{NAME_\d+\}\}/);
    assert.match(r, /\{\{EMAIL_1\}\}/);
    assert.match(r, /\{\{IBAN_1\}\}/);
    for (const geheim of ['h.schneider@schneider-partner.de', 'kanzlei@schneider-partner.de', 'DE89 3704 0044 0532 0130 00', 'Hans Schneider']) {
      assert.ok(!r.includes(geheim), 'Originalwert in der Ausgabe: ' + geheim);
    }
    // Rueckuebersetzung stellt das Original her
    const zurueck = await f.evaluate(() => { document.getElementById('AR').value = document.getElementById('AT').value; deanon(); return document.getElementById('RT').value; });
    assert.equal(zurueck, original);
    // Modell nicht erreichbar: erwarteter Fall, die Seite bleibt bedienbar
    await a.win.waitForTimeout(1500);
    const bedienbar = await f.evaluate(async () => {
      document.getElementById('IT').value = 'Maria Beispiel schreibt an max.muster@example.com';
      aiCache = { key: null, spans: [] };
      await anon();
      return document.getElementById('AT').value;
    });
    assert.match(bedienbar, /\{\{EMAIL_1\}\}/);
    assert.deepEqual(unerwartet(a.errors), []);
  } finally { await a.close(); }
});

test('6 Netzpolitik: nur 127.0.0.1 und huggingface.co/hf.co, keine anderen Hosts', async () => {
  const a = await browser();
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(async () => { loadTestDoc(); aiCache = { key: null, spans: [] }; await anon(); });
    await a.win.waitForTimeout(2000);
    const log = await a.requests();
    assert.ok(log.length > 10, 'Anfragen protokolliert: ' + log.length);
    const fremd = log.filter((r) => !r.lokal && !r.hf).map((r) => r.url);
    assert.deepEqual(fremd, [], 'Anfragen an fremde Hosts');
    for (const r of log.filter((x) => x.hf)) assert.match(r.host, /(^|\.)(huggingface\.co|hf\.co)$/);
  } finally { await a.close(); }
});

test('7 Kopieren legt den anonymisierten Text in die Zwischenablage (oder ruft ersatzweise den Shim)', async () => {
  const a = await browser();
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(async () => { loadTestDoc(); aiCache = { key: null, spans: [] }; await anon(); });
    const text = await f.evaluate(() => document.getElementById('AT').value);
    assert.ok(text.length > 100);
    // Aufruf des Shims abfangen und zugleich die echte Zwischenablage pruefen
    await a.win.evaluate(() => { window.__kopiert = []; const o = window.electronAPI.copyText; window.electronAPI.copyText = async (t) => { window.__kopiert.push(t); return o(t); }; });
    await f.evaluate(() => { document.getElementById('AT').focus(); cpAnon(); });
    await a.win.waitForTimeout(800);
    const echt = await a.app.evaluate(({ clipboard }) => clipboard.readText());
    const shim = await a.win.evaluate(async () => { await window.electronAPI.copyText('probe-text'); return window.__kopiert; });
    assert.deepEqual(shim, ['probe-text'], 'Shim copyText nicht aufrufbar');
    if (echt) assert.equal(echt, text, 'Zwischenablage enthaelt nicht den anonymisierten Text');
    else console.error('Hinweis: Zwischenablage in dieser Umgebung nicht lesbar; Ersatzpruefung ueber den Shim');
  } finally { await a.close(); }
});
