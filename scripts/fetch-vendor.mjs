// Laedt die gebuendelten Bibliotheken und das KI-Modell (siehe vendor.lock.json) nach app/vendor und app/models.
// Die Dateien sind per .gitignore vom Repository ausgeschlossen (Modell: 135 MB, GitHub-Limit 100 MB pro Datei),
// werden aber vor jedem Start/Build bereitgestellt und per SHA-256 geprueft.
//
//   node scripts/fetch-vendor.mjs               fehlende Dateien laden, alle pruefen
//   node scripts/fetch-vendor.mjs --check       nur pruefen, nichts laden (Exit-Code 1 bei Problem)
//   node scripts/fetch-vendor.mjs --update-lock Pruefsummen neu schreiben (nach bewusstem Versionswechsel)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = path.join(ROOT, 'scripts', 'vendor.lock.json');
const APP = path.join(ROOT, 'app');
const args = new Set(process.argv.slice(2));
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));

async function sha256(file) {
  const h = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(file), h);
  return h.digest('hex');
}

async function download(url, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.part';
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
      fs.renameSync(tmp, file);
      return;
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      if (attempt >= 3) throw new Error(`${url}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

let problems = 0;
const queue = [...lock.files];
async function worker() {
  while (queue.length) {
    const f = queue.shift();
    const file = path.join(APP, f.dest);
    try {
      let have = fs.existsSync(file) ? await sha256(file) : null;
      const want = args.has('--update-lock') ? null : f.sha256;
      if (have && (!want || have === want)) { /* vorhanden und korrekt */ }
      else if (args.has('--check')) {
        throw new Error(have ? 'Pruefsumme stimmt nicht' : 'fehlt');
      } else {
        process.stdout.write(`lade ${f.dest}\n`);
        await download(f.url, file);
        have = await sha256(file);
        if (want && have !== want) { fs.rmSync(file, { force: true }); throw new Error(`Pruefsumme ${have} != ${want}`); }
      }
      f.sha256 = have;
      f.size = fs.statSync(file).size;
    } catch (e) {
      problems++;
      console.error(`FEHLER ${f.dest}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

// Manifest fuer die Programmpruefung zur Laufzeit (main.js: check-assets): Pfad, Groesse, SHA-256 je mitgelieferter Datei.
// Erkennt, ob Modell oder Bibliotheken nach der Installation fehlen oder beschaedigt sind (z. B. durch einen Virenschutz).
if (!problems) {
  fs.writeFileSync(path.join(APP, 'vendor-manifest.json'), JSON.stringify({ files: lock.files.map((f) => ({ path: f.dest, size: f.size, sha256: f.sha256 })) }) + '\n');
}
if (args.has('--update-lock') && !problems) {
  fs.writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n');
  console.log('vendor.lock.json aktualisiert');
}
if (problems) { console.error(`${problems} Problem(e)`); process.exit(1); }
console.log(`OK: ${lock.files.length} Dateien vorhanden und geprueft`);
