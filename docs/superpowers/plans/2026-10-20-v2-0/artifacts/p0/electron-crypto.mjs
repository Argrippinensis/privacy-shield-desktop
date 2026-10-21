// P0 (a)+(b): crypto.subtle, isSecureContext, PBKDF2-Zeiten in der echten App (Werkzeug-Frame und Huelle) unter xvfb.
//   xvfb-run -a node electron-crypto.mjs <electron-binary> [<repo-ordner>]   Repo-Ordner: Kopie/Klon mit app/vendor, app/models, node_modules
// Misst crypto.subtle / PBKDF2 / Worker / isSecureContext in der echten App (Werkzeug-Frame und Huelle).
import { createRequire } from 'module';
import fs from 'fs'; import os from 'os'; import path from 'path';
const root = process.argv[3] || (process.env.PS_REPO || (process.env.HOME + '/projects/ps-v2'));
const require = createRequire(root + '/package.json');
const { _electron } = require('playwright-core');
const exe = process.argv[2];
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p0b-ud-'));
const app = await _electron.launch({ executablePath: exe, args: [root, '--no-sandbox', `--user-data-dir=${userData}`, '--proxy-server=http://127.0.0.1:9'], env: { ...process.env, PS_BLOCK_EXTERNAL: '1' } });
const win = await app.firstWindow();
await win.reload({ waitUntil: 'load' });
let f; for (let i = 0; i < 100 && !f; i++) { f = win.frames().find((x) => x.url().includes('privacy-shield.html')); if (!f) await win.waitForTimeout(100); }
await f.waitForFunction(() => typeof anon === 'function');
const probe = async (page) => page.evaluate(async () => {
  const enc = new TextEncoder();
  async function derive(iter) {
    const t0 = performance.now();
    const key = await crypto.subtle.importKey('raw', enc.encode('ein-langes-Passwort-123'), 'PBKDF2', false, ['deriveKey']);
    await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: crypto.getRandomValues(new Uint8Array(16)), iterations: iter }, key, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return Math.round(performance.now() - t0);
  }
  const out = { href: location.href, isSecureContext, subtle: typeof (crypto && crypto.subtle), crossOriginIsolated, ua: navigator.userAgent.match(/Electron\/[\d.]+/)[0], chrome: navigator.userAgent.match(/Chrome\/[\d.]+/)[0] };
  await derive(1000);
  out.pbkdf2_100k_ms = [await derive(100000), await derive(100000), await derive(100000)];
  out.pbkdf2_600k_ms = [await derive(600000), await derive(600000), await derive(600000)];
  out.pbkdf2_5M_ms = await derive(5000000);
  try {
    const src = `self.onmessage = async () => { const t0 = performance.now(); const k = await crypto.subtle.importKey('raw', new TextEncoder().encode('ein-langes-Passwort-123'), 'PBKDF2', false, ['deriveBits']); await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(16), iterations: 600000 }, k, 256); postMessage({ ms: Math.round(performance.now() - t0), subtle: typeof crypto.subtle }); };`;
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    out.worker600k = await new Promise((res, rej) => { w.onmessage = (e) => res(e.data); w.onerror = (e) => rej(new Error(String(e.message))); w.postMessage(1); });
  } catch (e) { out.worker600k = 'Fehler: ' + e.message; }
  // Hauptfaden-Blockade? Messe Dauer, in der ein 10-ms-Zeitgeber nicht feuert, waehrend PBKDF2 laeuft
  let maxGap = 0, last = performance.now(); const iv = setInterval(() => { const n = performance.now(); maxGap = Math.max(maxGap, n - last); last = n; }, 10);
  await derive(600000); clearInterval(iv); out.maxTimerGapDuring600k_ms = Math.round(maxGap);
  return out;
});
console.log('TOOLFRAME', JSON.stringify(await probe(f)));
console.log('SHELL', JSON.stringify(await probe(win)));
console.log('versions', JSON.stringify(await app.evaluate(() => ({ electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node }))));
await app.close(); fs.rmSync(userData, { recursive: true, force: true });
