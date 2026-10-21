// P0 (g): axe-core 4.14.0 per addScriptTag in der echten App, Ist-Zustand in drei Ansichten des Werkzeugs (Willkommen, Arbeitsbereich leer, mit Ergebnis).
//   AXE=<Pfad zu axe.min.js> xvfb-run -a node axe-views.mjs <electron-binary> [<repo-ordner>]
import { createRequire } from 'module';
import fs from 'fs'; import os from 'os'; import path from 'path';
const root = process.argv[3] || (process.env.PS_REPO || (process.env.HOME + '/projects/ps-v2'));
const require = createRequire(root + '/package.json');
const { _electron } = require('playwright-core');
const exe = process.argv[2];
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-p0b-ud-'));
const app = await _electron.launch({ executablePath: exe, args: [root, '--no-sandbox', `--user-data-dir=${userData}`, '--proxy-server=http://127.0.0.1:9'], env: { ...process.env, PS_BLOCK_EXTERNAL: '1' } });
const win = await app.firstWindow(); await win.reload({ waitUntil: 'load' });
let f; for (let i = 0; i < 100 && !f; i++) { f = win.frames().find((x) => x.url().includes('privacy-shield.html')); if (!f) await win.waitForTimeout(100); }
await f.waitForFunction(() => document.readyState === 'complete' && typeof anon === 'function');
await f.addScriptTag({ path: process.env.AXE });
const run = (label) => f.evaluate(async (label) => {
  const res = await axe.run(document, { resultTypes: ['violations'] });
  const by = {}; for (const v of res.violations) by[v.impact] = (by[v.impact] || 0) + 1;
  return { label, byImpact: by, rules: res.violations.map((v) => v.id + ':' + v.impact + ':' + v.nodes.length) };
}, label);
console.log(JSON.stringify(await run('willkommen')));
await f.evaluate(() => startApp());
console.log(JSON.stringify(await run('arbeitsbereich-leer')));
await f.evaluate(async () => { setAIMode('off'); loadTestDoc(); await anon(); });
console.log(JSON.stringify(await run('mit-ergebnis')));
await app.close(); fs.rmSync(userData, { recursive: true, force: true });
