// Prueft ein veroeffentlichtes Release unabhaengig vom Build (Assets, Groessen, Update-Dateien, feste Links, Upgrade-Pfad).
//
//   node scripts/verify-release.mjs v1.8.0                         feste Dateinamen (ab v1.8.0)
//   node scripts/verify-release.mjs v1.7.0 --names versioned       Dateinamen mit Versionsnummer (bis v1.7.0)
//   node scripts/verify-release.mjs v1.8.0 --upgrade-from v1.7.0   zusaetzlich: echtes Update einer alten AppImage-Installation
//                                                                  (nur Linux; benoetigt xvfb-run: xvfb-run -a node scripts/verify-release.mjs ...)
//   --deep                                                         zusaetzlich SHA-512 aller Installer herunterladen und pruefen
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const REPO = `${pkg.build.publish.owner}/${pkg.build.publish.repo}`;

const args = process.argv.slice(2);
const tag = args.find((a) => /^v\d/.test(a));
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const names = opt('--names') || 'stable';
const upgradeFrom = opt('--upgrade-from');
const deep = args.includes('--deep');
if (!tag) { console.error('Aufruf: node scripts/verify-release.mjs vX.Y.Z [--names stable|versioned] [--upgrade-from vA.B.C] [--deep]'); process.exit(2); }
const version = tag.slice(1);

let failures = 0;
const ok = (m) => console.log('  ok   ' + m);
const fail = (m) => { failures++; console.log('  FEHLER ' + m); };
const check = (cond, good, bad) => (cond ? ok(good) : fail(bad));

const api = async (p) => { const r = await fetch(`https://api.github.com/repos/${REPO}/${p}`, { headers: { 'User-Agent': 'verify-release' } }); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); };
const sha = async (file, algo = 'sha512', enc = 'base64') => { const h = crypto.createHash(algo); await pipeline(fs.createReadStream(file), h); return h.digest(enc); };
async function download(url, file) { const r = await fetch(url, { redirect: 'follow' }); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(file)); }

const expected = names === 'stable'
  ? ['PrivacyShield-Setup.exe', 'PrivacyShield-Setup.exe.blockmap', 'PrivacyShield-mac-arm64.zip', 'PrivacyShield-mac-x64.zip', 'PrivacyShield.AppImage', 'PrivacyShield.deb', 'latest.yml', 'latest-mac.yml', 'latest-linux.yml', 'SHA256SUMS.txt']
  : [`PrivacyShield-Setup-${version}.exe`, `PrivacyShield-${version}.zip`, `PrivacyShield-${version}.AppImage`, `PrivacyShield-${version}.deb`, 'latest.yml', 'latest-mac.yml', 'latest-linux.yml'];

console.log(`Release ${tag} (${REPO}), Namensschema: ${names}`);
const rel = await api(`releases/tags/${tag}`);
check(!rel.draft && !rel.prerelease, 'veroeffentlicht (kein Entwurf, keine Vorabversion)', 'Release ist Entwurf oder Vorabversion');
const latest = await api('releases/latest');
check(latest.tag_name === tag, `ist "latest"`, `"latest" ist ${latest.tag_name}, nicht ${tag}`);
check((rel.body || '').trim().length > 0, 'hat Release-Text', 'Release-Text ist leer');
const assets = Object.fromEntries(rel.assets.map((a) => [a.name, a]));
for (const n of expected) check(assets[n] && assets[n].size > 0, `${n} (${assets[n] ? (assets[n].size / 1e6).toFixed(1) + ' MB' : ''})`, `${n} fehlt`);
const small = Object.values(assets).filter((a) => /\.(exe|zip|AppImage|deb)$/.test(a.name) && a.size < 50e6);
check(small.length === 0, 'alle Installer sind plausibel gross (>= 50 MB)', 'verdaechtig kleine Installer: ' + small.map((a) => a.name).join(', '));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-verify-'));
try {
  // Update-Dateien: Versionsnummer, Verweis auf vorhandene Datei, Groesse stimmt
  for (const y of ['latest.yml', 'latest-mac.yml', 'latest-linux.yml']) {
    if (!assets[y]) continue;
    const text = await (await fetch(assets[y].browser_download_url)).text();
    const v = (text.match(/^version:\s*(\S+)/m) || [])[1];
    check(v === version, `${y}: Version ${v}`, `${y}: Version ${v} statt ${version}`);
    for (const m of text.matchAll(/- url:\s*(\S+)\n\s+sha512:\s*(\S+)\n\s+size:\s*(\d+)/g)) {
      const [, url, , size] = m;
      check(assets[url] && assets[url].size === Number(size), `${y}: ${url} vorhanden, Groesse stimmt`, `${y}: ${url} fehlt oder Groesse weicht ab`);
      if (deep && assets[url]) { const f = path.join(tmp, url); await download(assets[url].browser_download_url, f); check((await sha(f)) === m[2], `${url}: SHA-512 stimmt`, `${url}: SHA-512 weicht von ${y} ab`); fs.rmSync(f); }
    }
  }
  // Feste Links (releases/latest/download/<Name>) muessen ohne Umwege funktionieren
  if (names === 'stable') {
    for (const n of expected) {
      const r = await fetch(`https://github.com/${REPO}/releases/latest/download/${n}`, { method: 'HEAD', redirect: 'follow' });
      check(r.status === 200, `Link latest/download/${n} -> 200`, `Link latest/download/${n} -> HTTP ${r.status}`);
    }
  }
  // Echter Upgrade-Pfad (Linux/AppImage): alte Version starten, Update ueber die Oberflaeche ausloesen, neue Version muss laufen
  if (upgradeFrom) {
    console.log(`Upgrade-Test ${upgradeFrom} -> ${tag} (AppImage)`);
    const { _electron } = require('playwright-core');
    const old = await api(`releases/tags/${upgradeFrom}`);
    const oldAsset = old.assets.find((a) => a.name.endsWith('.AppImage'));
    const app = path.join(tmp, 'PrivacyShield.AppImage');
    await download(oldAsset.browser_download_url, app);
    fs.chmodSync(app, 0o755);
    const ud = path.join(tmp, 'userdata');
    let electron = await _electron.launch({ executablePath: app, args: ['--no-sandbox', `--user-data-dir=${ud}`], timeout: 60000 });
    let win = await electron.firstWindow();
    await win.waitForTimeout(3000);
    check((await win.evaluate(() => document.getElementById('version-label').textContent)) === 'v' + upgradeFrom.slice(1), `alte Version ${upgradeFrom} startet`, 'alte Version meldet falsche Versionsnummer');
    let banner = null;
    for (let i = 0; i < 60 && !banner; i++) { await win.waitForTimeout(1000); banner = await win.evaluate(() => (getComputedStyle(document.getElementById('update-banner')).display === 'flex' ? document.getElementById('banner-title').textContent : null)).catch(() => null); }
    check(!!banner && banner.includes(version), `Update-Hinweis erscheint: "${banner}"`, 'kein Update-Hinweis fuer ' + version);
    let closed = false; electron.on('close', () => { closed = true; });
    await win.evaluate(() => window.electronAPI.startDownload()).catch(() => {});
    for (let i = 0; i < 300 && !closed; i++) await new Promise((r) => setTimeout(r, 2000));
    await new Promise((r) => setTimeout(r, 15000)); // Updater ersetzt die Datei und startet neu
    const want = assets['latest-linux.yml'] ? (await (await fetch(assets['latest-linux.yml'].browser_download_url)).text()).match(/^sha512:\s*(\S+)/m)[1] : null;
    check(want && (await sha(app)) === want, 'AppImage wurde durch die neue Version ersetzt (SHA-512 stimmt)', 'AppImage entspricht nicht der neuen Version');
    // neue Version starten und Versionsnummer lesen
    electron = await _electron.launch({ executablePath: app, args: ['--no-sandbox', `--user-data-dir=${path.join(tmp, 'userdata2')}`], timeout: 60000 });
    win = await electron.firstWindow(); await win.waitForTimeout(3000);
    check((await win.evaluate(() => document.getElementById('version-label').textContent)) === 'v' + version, `neue Version ${version} startet`, 'neue Version meldet falsche Versionsnummer');
    await electron.close();
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log(failures ? `\n${failures} Problem(e)` : '\nAlles in Ordnung');
process.exit(failures ? 1 : 0);
