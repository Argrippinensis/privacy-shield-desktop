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
import { pathToFileURL } from 'node:url';
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
const nichtGefunden = []; // lokale Pfade, die der Testserver nicht kennt (jeder Eintrag ist ein Fehler)

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
      if (!f.startsWith(dir + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { nichtGefunden.push(p); res.writeHead(404).end('nicht gefunden'); return; }
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

// Startet den Browser-Ersatz (Electron ohne preload) auf dem Testserver. userData: vorhandenes Profil weiterverwenden.
async function browser({ hf, userData: vorhanden } = {}) {
  const userData = vorhanden || fs.mkdtempSync(path.join(os.tmpdir(), 'ps-webbeta-ud-'));
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
    if (!vorhanden) fs.rmSync(userData, { recursive: true, force: true });
    throw e;
  }
  const errors = [];
  win.on('pageerror', (e) => errors.push({ typ: 'pageerror', text: e.message, url: '' }));
  win.on('console', (m) => { if (m.type() === 'error') errors.push({ typ: 'console', text: m.text(), url: (m.location() && m.location().url) || '' }); });
  nichtGefunden.length = 0;
  return {
    app, win, errors, userData,
    requests: () => app.evaluate(() => globalThis.__psReq.map((r) => ({ ...r }))),
    async close() {
      const child = app.process();
      const exited = child.exitCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve));
      await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
      await exited;
      if (!vorhanden) fs.rmSync(userData, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    },
  };
}

const istHF = (h) => /(^|\.)(huggingface\.co|hf\.co)$/.test(h);
// Erlaubt sind nur Fehler, die zum nicht erreichbaren Modell gehoeren (Meldung des Werkzeugs oder URL bei huggingface/hf.co).
function unerwartet(errors) {
  return errors.filter((e) => {
    if (e.typ === 'pageerror') return true;
    if (/NER-Modell konnte nicht geladen werden/.test(e.text)) return false;
    try { if (e.url && istHF(new URL(e.url).hostname)) return false; } catch (x) { /* keine URL */ }
    return true;
  }).map((e) => e.typ + ': ' + e.text + (e.url ? ' [' + e.url + ']' : ''));
}
const keine404 = () => assert.deepEqual([...nichtGefunden], [], 'lokale Pfade nicht gefunden (404)');

// Haekchen "KI-Erkennung verwenden" im Werkzeug einschalten (Klick wie ein Nutzer)
const kiEinschalten = (f) => f.evaluate(() => { loadTestDoc(); const t = document.getElementById('aiAutoToggle'); t.click(); return t.checked; });

// Vom Werkzeug per <script> geladene lib-Dateien (ohne CLI- und Leser-Module, die es im Browser nicht gibt)
const LIB = ['placeholder', 'coref', 'leakcheck', 'marks', 'report', 'policy', 'detect', 'history', 'review', 'hygiene', 'psmap', 'project', 'formats', 'officefmt'].map((n) => 'lib/' + n + '.js');
const MODELL_REV = 'c2a4dbf593c57f47004c5bc2d3770d311aee9c43';

test('1 Bau: exakte Dateiliste, byteidentische Kopien, Browser-Worker mit Pin, Groessen, deterministisch', () => {
  const dateien = alleDateien(out);
  // erwartete Liste (Allowlist): Huelle, Shim, Anpassung, Worker, Werkzeug, Hinweise, Markerdatei, css, lib (nur geladene), vendor (ohne .map/.md)
  const vendor = alleDateien(path.join(ROOT, 'app', 'vendor')).filter((f) => !/\.(map|md)$/.test(f)).map((f) => 'vendor/' + f);
  const erwartet = ['.web-beta-build', 'THIRD_PARTY_NOTICES.md', 'browser-api.js', 'css/tailwind.css', 'index.html', ...LIB, 'ui/build-identity.js', 'ui/evidence-ui.js', 'ui/local-status.js', 'offline-controller.js', 'offline-data.js', 'offline-worker.js', 'manifest.webmanifest', 'app-icon.png', 'ner-worker.js', 'privacy-shield.html', 'tool-anpassung.js', ...vendor].sort();
  assert.deepEqual(dateien, erwartet, 'Dateiliste des Baus weicht von der Allowlist ab');
  const gleich = (rel, quelle) => assert.equal(hash(path.join(out, rel)), hash(path.join(ROOT, quelle)), rel + ' muss byteidentisch zu ' + quelle + ' sein');
  gleich('privacy-shield.html', 'app/privacy-shield.html');
  gleich('THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md');
  gleich('css/tailwind.css', 'app/css/tailwind.css');
  for (const f of [...LIB, ...vendor]) gleich(f, 'app/' + f);
  const worker = fs.readFileSync(path.join(out, 'ner-worker.js'), 'utf8');
  assert.match(worker, /env\.allowRemoteModels = true/);
  assert.match(worker, /env\.allowLocalModels = false/);
  assert.match(worker, /env\.useBrowserCache = true/);
  assert.doesNotMatch(worker, /localModelPath/);
  assert.match(worker, /wasmPaths = new URL\('vendor\/transformers\/'/, 'wasmPaths bleibt lokal');
  assert.match(worker, new RegExp("revision: '" + MODELL_REV + "'"), 'Modell ist auf den Commit gepinnt');
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'vendor.lock.json'), 'utf8'));
  assert.ok(lock.files.filter((f) => f.dest.startsWith('models/')).every((f) => f.url.includes('/resolve/' + MODELL_REV + '/')), 'Pin passt zu vendor.lock.json');
  const shell = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.match(shell, /<meta name="robots" content="noindex"/);
  assert.match(shell, /allow="clipboard-write"/);
  assert.doesNotMatch(shell, /clipboard-read|viewport-fit/);
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
  assert.deepEqual(Array.from(await api.takeOpenedFiles()), []); // Array stammt aus dem vm-Kontext
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
    const sel = '#PS-VERSION-LABEL';
    await f.waitForSelector(sel, { state: 'attached', timeout: 10000 });
    await f.waitForFunction(([s, v]) => document.querySelector(s).textContent.trim() === 'v' + v, [sel, VERSION], { timeout: 10000 });
    const kopf = await a.win.evaluate(() => ({
      titel: document.title,
      text: document.body.textContent.replace(/\s+/g, ' '),
      links: [...document.querySelectorAll('a')].map((l) => l.getAttribute('href')),
      iframe: { id: document.getElementById('tool-frame').id, title: document.getElementById('tool-frame').title },
    }));
    assert.match(kopf.text, /PrivacyShield 2\.0 Beta \(Browser\)/);
    assert.match(kopf.text, /Alte stabile Webfassung/);
    assert.match(kopf.text, /Desktop 2.0/);
    assert.ok(kopf.links.includes('/tools/privacyshield-redesigned.html'));
    assert.ok(kopf.links.includes('/desktop/#neu'));
    assert.equal(kopf.iframe.title, 'PrivacyShield Werkzeug');
    assert.ok(kopf.text.includes('Vorabversion zum Ausprobieren, nicht für wichtige Dokumente. Ihre Dokumente bleiben im Browser; Bibliotheken und optional das KI-Modell werden separat geladen.'), 'Zusammenfassung des Hinweises');
    for (const satz of [
      'Ihre Dokumente werden ausschließlich in Ihrem Browser verarbeitet und weder an uns noch an Dritte gesendet.',
      'ca. 135 MB, besser im WLAN',
      'von huggingface.co',
      'Dabei erfährt Hugging Face Ihre IP-Adresse, aber keine Inhalte.',
      'Browser können zwischengespeicherte Ressourcen eigenständig löschen.',
      'Ohne Modell arbeitet die Standard-Erkennung (Regeln und Wortlisten).',
      'Eigene Regeln werden ebenfalls in den Websitedaten dieses Browsers gespeichert.',
      'Browser-App einschließlich PDF/OCR ausdrücklich offline vorbereiten',
      'KI-Erkennung',
    ]) assert.ok(kopf.text.includes(satz), 'Langtext fehlt: ' + satz);
    // Das Werkzeug blendet den Update-Knopf nicht als Knopf ein: die Version bleibt, ist aber nicht bedienbar
    assert.equal(await f.evaluate(() => document.getElementById('PS-VERSION-LABEL').disabled), true);
    assert.deepEqual(unerwartet(a.errors), []);
    keine404();
  } finally { await a.close(); }
});

test('4 Handy-Breite 390x844: kein horizontales Scrollen, Hauptbedienelemente sichtbar', async () => {
  const a = await browser();
  try {
    await a.app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].setContentSize(390, 844); });
    await a.win.waitForFunction(() => window.innerWidth === 390, null, { timeout: 5000 });
    const f = await toolFrame(a.win);
    await f.evaluate(() => loadTestDoc()); // Arbeitsbereich zeigen (vorher ist er ausgeblendet)
    await a.win.waitForTimeout(500);
    const masse = await a.win.evaluate(() => {
      const fr = document.getElementById('tool-frame');
      const d = fr.contentDocument.documentElement;
      return {
        schale: { sw: document.documentElement.scrollWidth, iw: window.innerWidth },
        tool: { sw: Math.max(d.scrollWidth, fr.contentDocument.body.scrollWidth), iw: fr.contentWindow.innerWidth }, // body.scrollWidth: das Werkzeug blendet Ueberlaenge mit overflow-x hidden aus
        rahmen: fr.getBoundingClientRect().toJSON(),
        hoehe: window.innerHeight,
      };
    });
    assert.ok(masse.schale.sw <= masse.schale.iw, 'Huelle scrollt horizontal: ' + JSON.stringify(masse.schale));
    assert.ok(masse.tool.sw <= masse.tool.iw, 'Werkzeug scrollt horizontal: ' + JSON.stringify(masse.tool));
    assert.ok(masse.rahmen.width <= 390 && masse.rahmen.height > 300, 'Iframe-Mass: ' + JSON.stringify(masse.rahmen));
    assert.ok(masse.rahmen.bottom <= masse.hoehe + 1, 'Iframe ragt unten heraus');
    // Bedienelemente pruefen
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

test('5 Ende-zu-Ende ohne Modell (Standard beim ersten Besuch): Platzhalter, Rueckuebersetzung', async () => {
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
    assert.deepEqual(unerwartet(a.errors), []);
    keine404();
  } finally { await a.close(); }
});

test('6 Netzpolitik: erster Besuch ohne huggingface-Anfrage; nach Einschalten der KI nur GET an das gepinnte Modell, Standard-Erkennung laeuft weiter', async () => {
  const a = await browser();
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(async () => { loadTestDoc(); aiCache = { key: null, spans: [] }; await anon(); });
    await a.win.waitForTimeout(1500);
    let log = await a.requests();
    assert.ok(log.length > 10, 'Anfragen protokolliert: ' + log.length);
    assert.deepEqual(log.filter((r) => !r.lokal).map((r) => r.url), [], 'beim ersten Besuch geht nichts ausser 127.0.0.1 hinaus');
    // KI einschalten (Haekchen): jetzt versucht der Browser das Modell zu laden; das Fixture bricht es ab
    assert.equal(await kiEinschalten(f), true);
    const r = await f.evaluate(async () => { aiCache = { key: null, spans: [] }; await anon(); return document.getElementById('AT').value; });
    await a.win.waitForTimeout(2500);
    log = await a.requests();
    const fremd = log.filter((x) => !x.lokal && !x.hf).map((x) => x.url);
    assert.deepEqual(fremd, [], 'Anfragen an fremde Hosts');
    const hf = log.filter((x) => x.hf);
    assert.ok(hf.length > 0, 'nach dem Einschalten startet der Modell-Ladeversuch');
    for (const x of hf) {
      assert.equal(x.method, 'GET', 'nur GET: ' + x.url);
      assert.equal(x.body, false, 'kein Body: ' + x.url);
      assert.match(x.host, /(^|\.)(huggingface\.co|hf\.co)$/);
      if (x.host === 'huggingface.co') {
        const pfad = new URL(x.url).pathname;
        assert.ok(pfad.startsWith('/Xenova/distilbert-base-multilingual-cased-ner-hrl/'), 'Pfad ausserhalb des Modells: ' + pfad);
        assert.ok(pfad.includes('/resolve/' + MODELL_REV + '/'), 'nicht auf den Commit gepinnt: ' + pfad);
      }
    }
    assert.match(r, /\{\{EMAIL_1\}\}/, 'Standard-Erkennung laeuft trotz fehlendem Modell');
    assert.deepEqual(unerwartet(a.errors), []);
    keine404();
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
    assert.deepEqual(shim, [text, 'probe-text'], 'Shim copyText nicht aufrufbar');
    // Windows liefert die Zwischenablage mit \r\n: Zeilenenden vor dem Vergleich angleichen
    if (echt) assert.equal(echt.replace(/\r\n/g, '\n'), text.replace(/\r\n/g, '\n'), 'Zwischenablage enthaelt nicht den anonymisierten Text');
    else console.error('Hinweis: Zwischenablage in dieser Umgebung nicht lesbar; Ersatzpruefung ueber den Shim');
  } finally { await a.close(); }
});

// Handy-Layout: alle Bedienelemente im sichtbaren Bereich. Liefert die Liste der Verstoesse (leer = in Ordnung).
// Geprueft werden Schaltflaechen, Eingabefelder, Auswahllisten, Links und die vier Schrittreiter im Arbeitsbereich:
// vollstaendig innerhalb der Fensterbreite UND innerhalb jedes abschneidenden Vorfahren (overflow hidden); Elemente in
// Scrollbereichen (overflow auto/scroll) gelten als erreichbar. Dazu: keine Inhalte, die in Kopfzeilen, Panels und der
// Schrittleiste ueber den eigenen Rand laufen, und Schaltflaechen der Klasse btn mindestens 40 px hoch.
function layoutProbe(frame) {
  return frame.evaluate(() => {
    const iw = window.innerWidth, probs = [];
    const name = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/)[0] : '')) + ' "' + (el.textContent || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 28) + '"';
    const sichtbar = (el) => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0 && r.height > 0 && +cs.opacity > 0; };
    const ausgenommen = (el) => !!el.closest('#FUNDE, #FUNDEBTN, #TOAST, .sr-only, .skip-link');
    const inScroller = (el) => { for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) if (/^(auto|scroll)$/.test(getComputedStyle(a).overflowX)) return true; return false; };
    for (const el of document.querySelectorAll('#WS button, #WS input:not([type=hidden]):not([type=file]), #WS select, #WS textarea, #WS a[href], #WS .step-tab')) {
      if (!sichtbar(el) || ausgenommen(el) || inScroller(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.left < -0.5 || r.right > iw + 0.5) { probs.push('ausserhalb Fenster: ' + name(el) + ' L' + Math.round(r.left) + ' R' + Math.round(r.right)); continue; }
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        if (!/^(hidden|clip)$/.test(getComputedStyle(a).overflowX)) continue;
        const ar = a.getBoundingClientRect();
        if (r.left < ar.left - 1 || r.right > ar.right + 1) { probs.push('abgeschnitten von ' + name(a) + ': ' + name(el) + ' R' + Math.round(r.right) + ' > ' + Math.round(ar.right)); break; }
      }
      if (el.tagName === 'BUTTON' && /\bbtn/.test(String(el.className)) && r.height < 39.5) probs.push('zu niedrig (' + Math.round(r.height) + ' px): ' + name(el));
    }
    for (const el of document.querySelectorAll('#WS .steps-bar, #WS .step-tab, #WS .tool-panel, #WS .tool-panel-header')) {
      if (!sichtbar(el) || ausgenommen(el)) continue;
      if (el.scrollWidth > el.clientWidth + 1) probs.push('Inhalt laeuft ueber: ' + name(el) + ' scrollWidth ' + el.scrollWidth + ' > ' + el.clientWidth);
    }
    const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    if (sw > iw) probs.push('Seite scrollt horizontal: ' + sw + ' > ' + iw);
    return [...new Set(probs)];
  });
}

for (const [breite, hoehe] of [[390, 844], [360, 740]]) {
  test(`8 Handy-Layout ${breite}x${hoehe}: jedes Bedienelement und die vier Schrittreiter liegen im sichtbaren Bereich`, async () => {
    const a = await browser();
    try {
      await a.app.evaluate(({ BrowserWindow }, [w, h]) => { BrowserWindow.getAllWindows()[0].setContentSize(w, h); }, [breite, hoehe]);
      await a.win.waitForFunction((w) => window.innerWidth === w, breite, { timeout: 5000 });
      const f = await toolFrame(a.win);
      // Arbeitsbereich mit anonymisiertem Testdokument und Rueckuebersetzung (alle Panels sichtbar)
      await f.evaluate(async () => { loadTestDoc(); aiCache = { key: null, spans: [] }; await anon(); document.getElementById('AR').value = document.getElementById('AT').value; deanon(); });
      await a.win.waitForTimeout(800);
      assert.equal(await f.evaluate(() => document.querySelectorAll('.step-tab').length), 4);
      const probs = await layoutProbe(f);
      assert.deepEqual(probs, [], `${breite}x${hoehe}:\n  ` + probs.join('\n  '));
      assert.equal(await a.win.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Huelle scrollt horizontal');
    } finally { await a.close(); }
  });
}

test('9 Erster Besuch: Hinweis aufgeklappt, KI aus (ps_ai_mode=off), danach eingeklappt und KI-Einstellung bleibt', async () => {
  const a = await browser();
  try {
    const f = await toolFrame(a.win);
    assert.equal(await a.win.evaluate(() => document.getElementById('hinweis').open), true, 'Hinweis beim ersten Besuch aufgeklappt');
    const schluessel = await a.win.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('psweb_')));
    assert.ok(schluessel.length >= 1, 'Zustand der Huelle unter psweb_*: ' + schluessel);
    assert.ok(await a.win.evaluate(() => /KI-Erkennung/.test(document.getElementById('hinweis').textContent)), 'Hinweis nennt die KI-Erkennung');
    assert.equal(await f.evaluate(() => localStorage.getItem('ps_ai_mode')), 'off');
    await f.evaluate(() => loadTestDoc());
    assert.equal(await f.evaluate(() => document.getElementById('aiAutoToggle').checked), false, 'Haekchen KI-Erkennung ist aus');
    await f.evaluate(async () => { await anon(); });
    await a.win.waitForTimeout(1000);
    assert.deepEqual((await a.requests()).filter((x) => x.hf).map((x) => x.url), [], 'keine huggingface-Anfrage ohne Einschalten');
    // zweiter Besuch (Neuladen): eingeklappt; eine vorhandene Einstellung wird nicht ueberschrieben
    await f.evaluate(() => localStorage.setItem('ps_ai_mode', 'auto'));
    // This test covers persisted preferences. Reload with an already backed-up map;
    // actual unsaved reload handling is exercised in real Chromium in processing-evidence.test.mjs.
    await f.evaluate(() => { mapSaved = true; psSyncProtection(); });
    await a.win.reload({ waitUntil: 'load' });
    const f2 = await toolFrame(a.win);
    assert.equal(await a.win.evaluate(() => document.getElementById('hinweis').open), false, 'Hinweis beim zweiten Besuch eingeklappt');
    assert.equal(await f2.evaluate(() => localStorage.getItem('ps_ai_mode')), 'auto', 'vorhandene Einstellung bleibt');
    assert.deepEqual(unerwartet(a.errors), []);
    keine404();
  } finally { await a.close(); }
});

const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
const textKnoten = (frame) => frame.evaluate(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const t = []; for (let n = w.nextNode(); n; n = w.nextNode()) t.push(n.nodeValue);
  return t.join(' ');
});

test('10 Irrefuehrende Aussagen des Werkzeugs werden in der Huelle ersetzt (Originalsaetze existieren im Tool)', async () => {
  const anp = require(path.join(ROOT, 'web', 'tool-anpassung.js'));
  assert.ok(Array.isArray(anp.TEXTE) && anp.TEXTE.length >= 10, 'Ersetzungsliste');
  const quelle = norm(fs.readFileSync(path.join(ROOT, 'app', 'privacy-shield.html'), 'utf8'));
  for (const r of anp.TEXTE) assert.ok(quelle.includes(norm(r.von)), 'Originalsatz existiert nicht (mehr) im Tool: ' + r.von);
  for (const must of ['Kein Datenaustausch mit dem Internet', 'Flugmodus', 'Kein Serverkontakt', 'ohne eine einzige Serveranfrage', 'funktioniert ohne Internet', 'neu installieren', 'Virenschutz']) {
    assert.ok(anp.TEXTE.some((r) => r.von.includes(must)), 'keine Ersetzung fuer: ' + must);
  }
  const a = await browser();
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => loadTestDoc());
    await a.win.waitForTimeout(500);
    const text = norm(await textKnoten(f));
    for (const r of anp.TEXTE.filter((x) => !x.dyn)) {
      assert.ok(!text.includes(norm(r.von)), 'noch sichtbar: ' + r.von);
      assert.ok(text.includes(norm(r.nach)), 'Ersatz fehlt: ' + r.nach);
    }
    assert.doesNotMatch(text, /Flugmodus|Serverkontakt|Server-Kontakte|ohne Internet|aus der Installation|neu installieren|Virenschutz/, 'Rest irrefuehrender Aussagen');
    // Update-Knopf der Fusszeile: nicht bedienbar; tote Testdokument-Links: nicht sichtbar
    assert.equal(await f.evaluate(() => { const b = document.getElementById('PS-VERSION-LABEL'); return b.disabled && !b.getAttribute('title'); }), true);
    assert.equal(await f.evaluate(() => [...document.querySelectorAll('a[href^="../tests/"]')].every((l) => l.getBoundingClientRect().width === 0)), true, 'Links ../tests/*.pdf ausgeblendet');
    // Dynamische Texte: Text beim Einschalten der KI und Fehlertexte (Modelldatei fehlt/beschaedigt)
    await kiEinschalten(f);
    const ki = await f.evaluate(() => document.getElementById('aiDefaultText').textContent);
    assert.doesNotMatch(ki, /ca\. 2 Sekunden/);
    assert.match(ki, /135 MB/);
    const grund = await f.evaluate(async () => {
      const e = await diagnoseAIError(new Error('Could not locate file: 404'));
      document.getElementById('aiErrorReason').textContent = e.reason;
      await new Promise((r) => setTimeout(r, 300));
      return document.getElementById('aiErrorReason').textContent;
    });
    assert.doesNotMatch(grund, /neu installieren|Virenschutz|Installation/);
    assert.match(grund, /Seite neu laden/);
    assert.deepEqual(unerwartet(a.errors), []);
    keine404();
  } finally { await a.close(); }
});

test('11 Bauskript: gefaehrliche --out-Ziele werden abgelehnt, nichts wird geloescht (nur Wegwerf-Verzeichnisse)', async () => {
  const bau = await import(pathToFileURL(BAU).href);
  assert.equal(typeof bau.pruefeZiel, 'function', 'pruefeZiel ist exportiert');
  const root = '/tmp/ps-fiktiv/projekt', home = '/tmp/ps-fiktiv-home';
  for (const schlecht of ['/', root, '/tmp/ps-fiktiv', '/tmp', home]) assert.throws(() => bau.pruefeZiel(schlecht, { root, home }), undefined, 'abgelehnt: ' + schlecht);
  assert.doesNotThrow(() => bau.pruefeZiel(path.join(root, 'dist-web-beta'), { root, home }));
  // Ablauf ueber die Kommandozeile mit einem fiktiven Projektordner (Symlinks auf app/ und web/; nur Wegwerf-Pfade)
  const aussen = fs.mkdtempSync(path.join(tmp, 'sicher-'));
  fs.writeFileSync(path.join(aussen, 'canary.txt'), 'bleibt');
  const fake = path.join(aussen, 'projekt');
  fs.mkdirSync(path.join(fake, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(fake, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'assets/icon.png'), path.join(fake, 'assets/icon.png'));
  for (const [von, nach] of [['scripts/build-identity.mjs', 'scripts/build-identity.mjs'], ['scripts/build-web-beta.mjs', 'scripts/build-web-beta.mjs'], ['scripts/vendor.lock.json', 'scripts/vendor.lock.json'], ['package.json', 'package.json'], ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md']]) fs.copyFileSync(path.join(ROOT, von), path.join(fake, nach));
  fs.symlinkSync(path.join(ROOT, 'app'), path.join(fake, 'app'));
  fs.symlinkSync(path.join(ROOT, 'web'), path.join(fake, 'web'));
  const lauf = (ziel, env = {}) => {
    try { execFileSync(process.execPath, [path.join(fake, 'scripts', 'build-web-beta.mjs'), '--out', ziel], { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, ...env } }); return 0; } catch (e) { return e.status || 1; }
  };
  const heim = fs.mkdtempSync(path.join(tmp, 'heim-'));
  fs.writeFileSync(path.join(heim, 'canary.txt'), 'bleibt');
  const fremd = fs.mkdtempSync(path.join(tmp, 'fremd-'));
  fs.writeFileSync(path.join(fremd, 'canary.txt'), 'bleibt');
  assert.notEqual(lauf(fake), 0, '--out = Projektordner');
  assert.ok(fs.existsSync(path.join(fake, 'package.json')), 'Projektordner unversehrt');
  assert.notEqual(lauf(aussen), 0, '--out = Vorfahr des Projektordners');
  assert.ok(fs.existsSync(path.join(aussen, 'canary.txt')), 'Vorfahr unversehrt');
  assert.notEqual(lauf(heim, { HOME: heim, USERPROFILE: heim }), 0, '--out = Home-Verzeichnis');
  assert.ok(fs.existsSync(path.join(heim, 'canary.txt')), 'Home unversehrt');
  assert.notEqual(lauf(fremd), 0, '--out = vorhandener fremder Ordner ohne Marker');
  assert.ok(fs.existsSync(path.join(fremd, 'canary.txt')), 'fremder Ordner unversehrt');
  // Erlaubt: neuer Ordner, leerer Ordner, frueherer Bau (Marker)
  const neu = path.join(aussen, 'neu');
  assert.equal(lauf(neu), 0, 'neuer Ordner');
  assert.ok(fs.existsSync(path.join(neu, '.web-beta-build')), 'Markerdatei');
  assert.equal(lauf(neu), 0, 'erneuter Bau ueber Marker');
  const leer = path.join(aussen, 'leer'); fs.mkdirSync(leer);
  assert.equal(lauf(leer), 0, 'leerer Ordner');
});

test('12 Bauskript: Worker-Ersatz mit CRLF-Quelle (Windows-Checkout) und Aufruf ueber einen Symlink-Pfad (macOS-Temp-Ordner)', async () => {
  const bau = await import(pathToFileURL(BAU).href);
  assert.equal(typeof bau.erzeugeWorker, 'function', 'erzeugeWorker ist exportiert');
  const quelle = fs.readFileSync(path.join(ROOT, 'app', 'ner-worker.js'), 'utf8').replace(/\r\n/g, '\n');
  const lf = bau.erzeugeWorker(quelle, 'abc123');
  const crlf = bau.erzeugeWorker(quelle.replace(/\n/g, '\r\n'), 'abc123');
  assert.equal(crlf, lf, 'CRLF-Quelle ergibt denselben Worker wie LF-Quelle');
  assert.ok(lf.includes('env.allowRemoteModels = true;') && lf.includes("revision: 'abc123'") && !/localModelPath/.test(lf));
  assert.ok(!lf.includes('\r'), 'der erzeugte Worker hat nur LF-Zeilenenden (plattformunabhaengig, deterministisch)');
  // Aufruf ueber einen Symlink: process.argv[1] ist der Symlink-Pfad, import.meta.url der aufgeloeste (auf macOS ist /var ein Symlink auf /private/var)
  const dir = fs.mkdtempSync(path.join(tmp, 'symlink-'));
  try { fs.symlinkSync(path.join(ROOT, 'scripts'), path.join(dir, 's'), 'dir'); } catch (e) { return; } // Windows ohne Symlink-Recht: nur der Worker-Teil gilt
  const ziel = path.join(dir, 'out');
  execFileSync(process.execPath, [path.join(dir, 's', 'build-web-beta.mjs'), '--out', ziel], { encoding: 'utf8', stdio: 'pipe' });
  assert.ok(fs.existsSync(path.join(ziel, 'index.html')), 'Bau ueber den Symlink-Pfad hat tatsaechlich gebaut (nicht stillschweigend nichts getan)');
});
