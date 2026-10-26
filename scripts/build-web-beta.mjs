// Baut die Browser-Fassung der 2.0 Beta nach dist-web-beta/ (oder --out <Ordner>).
// Keine Abhaengigkeiten. Das Werkzeug (privacy-shield.html) wird unveraendert kopiert; nur die Huelle,
// der Shim (window.electronAPI), die Laufzeit-Anpassung und der KI-Worker unterscheiden sich von der Desktop-App.
// Der Bau ist deterministisch (sortierte Reihenfolge, keine Zeitstempel im Inhalt).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_DATEI = 25 * 1024 * 1024; // Cloudflare Pages: Dateien muessen kleiner als 25 MiB sein
const MAX_DATEIEN = 2000;           // Cloudflare Pages: hoechstens 2000 Dateien (kostenloser Tarif: 20000, hier bewusst enger)
const MARKER = '.web-beta-build';   // Markerdatei: nur Ordner mit diesem Marker (oder leere) werden ueberschrieben
const MODELL_BYTES = 135359829;     // model_quantized.onnx laut vendor.lock.json (Plausibilitaetspruefung)

class BauFehler extends Error {}
const fehler = (msg) => { throw new BauFehler(msg); };

const istInnen = (kind, eltern) => kind === eltern || kind.startsWith(eltern.endsWith(path.sep) ? eltern : eltern + path.sep);
function echt(p) { // realpath, soweit der Pfad existiert (sonst der aufgeloeste Pfad)
  let r = path.resolve(p);
  const rest = [];
  while (!fs.existsSync(r) && path.dirname(r) !== r) { rest.unshift(path.basename(r)); r = path.dirname(r); }
  try { r = fs.realpathSync(r); } catch (e) { /* unveraendert */ }
  return path.join(r, ...rest);
}

// Prueft das Ziel, BEVOR irgendetwas geloescht wird: nie Wurzel, Projektordner, Vorfahren, Home; vorhandene Ordner nur mit Marker oder leer.
export function pruefeZiel(out, { root = ROOT, home = os.homedir() } = {}) {
  const z = echt(out), r = echt(root), h = echt(home);
  if (z === path.parse(z).root) fehler('--out darf nicht das Wurzelverzeichnis sein: ' + z);
  if (z === r) fehler('--out darf nicht der Projektordner sein: ' + z);
  if (istInnen(r, z)) fehler('--out darf kein Vorfahr des Projektordners sein: ' + z);
  if (z === h || istInnen(h, z)) fehler('--out darf nicht das Home-Verzeichnis oder dessen Vorfahr sein: ' + z);
  if (fs.existsSync(z)) {
    if (!fs.statSync(z).isDirectory()) fehler('--out ist keine Ordner: ' + z);
    if (fs.readdirSync(z).length > 0 && !fs.existsSync(path.join(z, MARKER))) {
      fehler(`--out ist ein nicht leerer Ordner ohne Markerdatei ${MARKER} (kein frueherer Bau?): ${z}`);
    }
  }
  return z;
}

// Gezielter Textersatz: schlaegt er fehl (Quelle hat sich geaendert), bricht der Bau ab.
function ersetze(text, von, nach, quelle) {
  if (!text.includes(von)) fehler(`Ersatz nicht anwendbar in ${quelle}: "${von.trim()}" nicht gefunden (Quelle geaendert?)`);
  return text.replace(von, () => nach);
}

function bauen(OUT) {
  const lies = (rel) => {
    const f = path.join(ROOT, rel);
    if (!fs.existsSync(f)) fehler('Quelle fehlt: ' + rel + (rel.startsWith('app/vendor') ? ' (npm run fetch-vendor ausfuehren)' : ''));
    return fs.readFileSync(f);
  };
  const pkg = JSON.parse(lies('package.json').toString('utf8'));
  const VERSION = pkg.version;
  if (!/^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/.test(VERSION)) fehler('Version in package.json hat ein unerwartetes Format: ' + VERSION);

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
  lege('index.html', lies('web/beta-shell.html').toString('utf8').split('__PS_VERSION__').join(VERSION));
  const shim = lies('web/browser-api.js').toString('utf8');
  if (!shim.includes('__PS_VERSION__')) fehler('Platzhalter __PS_VERSION__ fehlt in web/browser-api.js');
  lege('browser-api.js', shim.split('__PS_VERSION__').join(VERSION));
  lege('tool-anpassung.js', lies('web/tool-anpassung.js'));

  // Werkzeug unveraendert; lib/ nur, was das Werkzeug per <script> laedt (keine CLI-Module)
  const werkzeug = lies('app/privacy-shield.html');
  lege('privacy-shield.html', werkzeug);
  const html = werkzeug.toString('utf8');
  const libs = [...new Set([...html.matchAll(/<script src="(lib\/[A-Za-z0-9_-]+\.js)"/g)].map((m) => m[1]))];
  if (libs.length < 10) fehler('Zu wenige lib-Skripte im Werkzeug gefunden (' + libs.length + '): Format geaendert?');
  for (const l of libs) lege(l, lies('app/' + l));
  kopiereBaum('app/css', 'css');
  kopiereBaum('app/vendor', 'vendor', (r) => !/\.(map|md)$/.test(r));
  lege('THIRD_PARTY_NOTICES.md', lies('THIRD_PARTY_NOTICES.md'));

  // Modell-Commit aus vendor.lock.json (alle Modelldateien muessen denselben Commit haben)
  const lock = JSON.parse(lies('scripts/vendor.lock.json').toString('utf8'));
  const modellDateien = lock.files.filter((f) => f.dest.startsWith('models/'));
  const revs = new Set(modellDateien.map((f) => (/\/resolve\/([0-9a-f]{40})\//.exec(f.url) || [])[1]));
  if (!modellDateien.length || revs.size !== 1 || revs.has(undefined)) fehler('vendor.lock.json: Modelldateien ohne einheitlichen Commit');
  const REV = [...revs][0];
  const onnx = modellDateien.find((f) => /model_quantized\.onnx$/.test(f.dest));
  if (!onnx || onnx.size !== MODELL_BYTES) fehler(`vendor.lock.json: model_quantized.onnx hat ${onnx && onnx.size} statt ${MODELL_BYTES} Bytes`);

  // KI-Worker: Modell kommt im Browser von Hugging Face (und aus dem Browser-Zwischenspeicher), Laufzeit bleibt lokal
  let worker = lies('app/ner-worker.js').toString('utf8');
  const W = 'app/ner-worker.js';
  worker = ersetze(worker, '// Die Seite bleibt waehrend der Analyse bedienbar; Modell und Laufzeit kommen\n// ausschliesslich aus der Installation (app/models, app/vendor), nie aus dem Netz.', '// BROWSER-VARIANTE (aus app/ner-worker.js erzeugt, nicht von Hand aendern): Die Seite bleibt waehrend der\n// Analyse bedienbar; die Laufzeit kommt lokal (vendor/), das Modell einmalig von Hugging Face (dann im Browser-Cache).', W);
  worker = ersetze(worker, 'env.allowRemoteModels = false;', 'env.allowRemoteModels = true;', W);
  worker = ersetze(worker, 'env.allowLocalModels = true;', 'env.allowLocalModels = false;', W);
  worker = ersetze(worker, /env\.localModelPath = [^\n]*\n/.exec(worker)?.[0] ?? 'env.localModelPath = ', '', W);
  worker = ersetze(worker, 'env.useBrowserCache = false;', 'env.useBrowserCache = true;', W);
  // Modell auf den geprueften Commit festlegen (kein "main": eine spaetere Aenderung bei Hugging Face greift nicht)
  worker = ersetze(worker, "dtype: 'q8',", `revision: '${REV}',\n          dtype: 'q8',`, W);
  if (/localModelPath/.test(worker)) fehler('localModelPath ist nach dem Ersatz noch in ner-worker.js');
  if (!worker.includes("env.backends.onnx.wasm.wasmPaths = new URL('vendor/transformers/', BASE).href;")) fehler('wasmPaths-Zeile in ner-worker.js hat sich geaendert');
  lege('ner-worker.js', worker);
  lege(MARKER, 'Ordner wurde von scripts/build-web-beta.mjs erzeugt und darf von ihm ueberschrieben werden.\n');

  // Jede lokal eingebundene Datei des Werkzeugs muss im Bau liegen
  for (const m of html.matchAll(/(?:src|href)="((?:vendor|lib|css)\/[^"#?]+)"/g)) {
    if (!dateien.has(m[1])) fehler('Das Werkzeug bindet ' + m[1] + ' ein, die Datei fehlt im Bau');
  }

  // Grenzen pruefen
  const sortiert = [...dateien.keys()].sort();
  if (sortiert.length > MAX_DATEIEN) fehler(`zu viele Dateien: ${sortiert.length} (Grenze ${MAX_DATEIEN})`);
  let gesamt = 0;
  for (const rel of sortiert) {
    const n = dateien.get(rel).length;
    if (n >= MAX_DATEI) fehler(`Datei zu gross fuer Cloudflare Pages: ${rel} (${(n / 1048576).toFixed(1)} MiB, Grenze 25 MiB)`);
    gesamt += n;
  }

  // Schreiben (nur ein geprueftes Ziel wird geleert)
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const rel of sortiert) {
    const ziel = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.writeFileSync(ziel, dateien.get(rel));
  }
  console.log(`Browser-Beta ${VERSION} gebaut: ${OUT}`);
  console.log(`${sortiert.length} Dateien, ${(gesamt / 1048576).toFixed(1)} MiB gesamt; Modell nicht enthalten (Commit ${REV.slice(0, 7)}, ${MODELL_BYTES} Bytes)`);
}

function main() {
  try {
    const argv = process.argv.slice(2);
    const oi = argv.indexOf('--out');
    if (oi >= 0 && !argv[oi + 1]) fehler('--out braucht einen Ordner');
    const OUT = path.resolve(process.cwd(), oi >= 0 ? argv[oi + 1] : path.join(ROOT, 'dist-web-beta'));
    pruefeZiel(OUT);
    bauen(OUT);
  } catch (e) {
    if (!(e instanceof BauFehler)) throw e;
    console.error('FEHLER (build-web-beta): ' + e.message);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
