// Baut die Browser-Fassung der 2.0 Beta nach dist-web-beta/ (oder --out <Ordner>).
// Keine Abhaengigkeiten. Das Werkzeug (privacy-shield.html) wird unveraendert kopiert; nur die Huelle,
// der Shim (window.electronAPI) und der KI-Worker unterscheiden sich von der Desktop-App.
// Der Bau ist deterministisch (sortierte Reihenfolge, keine Zeitstempel im Inhalt).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_DATEI = 25 * 1024 * 1024; // Cloudflare Pages: Dateien muessen kleiner als 25 MiB sein
const MAX_DATEIEN = 2000;           // Cloudflare Pages: hoechstens 2000 Dateien (kostenloser Tarif: 20000, hier bewusst enger)

function fehler(msg) {
  console.error('FEHLER (build-web-beta): ' + msg);
  process.exit(1);
}

const argv = process.argv.slice(2);
const oi = argv.indexOf('--out');
const OUT = path.resolve(ROOT, oi >= 0 && argv[oi + 1] ? argv[oi + 1] : 'dist-web-beta');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;
if (!/^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/.test(VERSION)) fehler('Version in package.json hat ein unerwartetes Format: ' + VERSION);

const lies = (rel) => {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) fehler('Quelle fehlt: ' + rel + (rel.startsWith('app/vendor') ? ' (npm run fetch-vendor ausfuehren)' : ''));
  return fs.readFileSync(f);
};

// Gezielter Textersatz: schlaegt er fehl (Quelle hat sich geaendert), bricht der Bau ab.
function ersetze(text, von, nach, quelle) {
  if (!text.includes(von)) fehler(`Ersatz nicht anwendbar in ${quelle}: "${von.trim()}" nicht gefunden (Quelle geaendert?)`);
  return text.replace(von, () => nach);
}

// Ausgabe: Map relativer Pfad -> Buffer
const dateien = new Map();
const lege = (rel, inhalt) => dateien.set(rel, Buffer.isBuffer(inhalt) ? inhalt : Buffer.from(inhalt, 'utf8'));

function kopiereBaum(quelleRel, zielRel, filter = () => true) {
  const wurzel = path.join(ROOT, quelleRel);
  if (!fs.existsSync(wurzel)) fehler('Ordner fehlt: ' + quelleRel + (quelleRel === 'app/vendor' ? ' (npm run fetch-vendor ausfuehren)' : ''));
  const gehe = (rel) => {
    for (const e of fs.readdirSync(path.join(wurzel, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) gehe(r);
      else if (e.isFile() && filter(r)) lege(zielRel + '/' + r, fs.readFileSync(path.join(wurzel, r)));
    }
  };
  gehe('');
}

// Huelle und Shim: Platzhalter __PS_VERSION__ durch die Version aus package.json ersetzen
const huelle = lies('web/beta-shell.html').toString('utf8');
lege('index.html', huelle.split('__PS_VERSION__').join(VERSION));
const shim = lies('web/browser-api.js').toString('utf8');
if (!shim.includes('__PS_VERSION__')) fehler('Platzhalter __PS_VERSION__ fehlt in web/browser-api.js');
lege('browser-api.js', shim.split('__PS_VERSION__').join(VERSION));

// Werkzeug unveraendert
lege('privacy-shield.html', lies('app/privacy-shield.html'));
kopiereBaum('app/lib', 'lib', (r) => r.endsWith('.js'));
kopiereBaum('app/css', 'css');
kopiereBaum('app/vendor', 'vendor');
lege('THIRD_PARTY_NOTICES.md', lies('THIRD_PARTY_NOTICES.md'));

// KI-Worker: Modell kommt im Browser von Hugging Face (und aus dem Browser-Zwischenspeicher), Laufzeit bleibt lokal
let worker = lies('app/ner-worker.js').toString('utf8');
const W = 'app/ner-worker.js';
worker = ersetze(worker, '// Die Seite bleibt waehrend der Analyse bedienbar; Modell und Laufzeit kommen\n// ausschliesslich aus der Installation (app/models, app/vendor), nie aus dem Netz.', '// BROWSER-VARIANTE (aus app/ner-worker.js erzeugt, nicht von Hand aendern): Die Seite bleibt waehrend der\n// Analyse bedienbar; die Laufzeit kommt lokal (vendor/), das Modell einmalig von Hugging Face (dann im Browser-Cache).', W);
worker = ersetze(worker, 'env.allowRemoteModels = false;', 'env.allowRemoteModels = true;', W);
worker = ersetze(worker, 'env.allowLocalModels = true;', 'env.allowLocalModels = false;', W);
worker = ersetze(worker, /env\.localModelPath = [^\n]*\n/.exec(worker)?.[0] ?? 'env.localModelPath = ', '', W);
worker = ersetze(worker, 'env.useBrowserCache = false;', 'env.useBrowserCache = true;', W);
if (/localModelPath/.test(worker)) fehler('localModelPath ist nach dem Ersatz noch in ner-worker.js');
if (!worker.includes("env.backends.onnx.wasm.wasmPaths = new URL('vendor/transformers/', BASE).href;")) fehler('wasmPaths-Zeile in ner-worker.js hat sich geaendert');
lege('ner-worker.js', worker);

// Grenzen pruefen
const sortiert = [...dateien.keys()].sort();
if (sortiert.length > MAX_DATEIEN) fehler(`zu viele Dateien: ${sortiert.length} (Grenze ${MAX_DATEIEN})`);
let gesamt = 0;
for (const rel of sortiert) {
  const n = dateien.get(rel).length;
  if (n >= MAX_DATEI) fehler(`Datei zu gross fuer Cloudflare Pages: ${rel} (${(n / 1048576).toFixed(1)} MiB, Grenze 25 MiB)`);
  gesamt += n;
}

// Schreiben (Ordner vorher leeren)
fs.rmSync(OUT, { recursive: true, force: true });
for (const rel of sortiert) {
  const ziel = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.writeFileSync(ziel, dateien.get(rel));
}

console.log(`Browser-Beta ${VERSION} gebaut: ${OUT}`);
console.log(`${sortiert.length} Dateien, ${(gesamt / 1048576).toFixed(1)} MiB gesamt`);
