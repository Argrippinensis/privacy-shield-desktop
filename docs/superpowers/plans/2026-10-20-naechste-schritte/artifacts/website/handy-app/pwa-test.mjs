// Handy-App-Test (Chromium-Emulation): Installierbarkeit, Service Worker, Offline-Start, Hinweis auf Handys, kein Emoji.
// Aus dem Wurzelverzeichnis der Website nach `node build.js` ausfuehren:  node tests/pwa.mjs
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium, devices } = require('playwright');
const ROOT = process.cwd(); const URL_ = 'http://localhost:8874/tools/privacyshield-redesigned.html';
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); fs.createReadStream(p).pipe(r); }).listen(8874);
const b = await chromium.launch();
let fails = 0; const ok = (c, m) => { console.log((c ? '  ok    ' : '  FEHLER ') + m); if (!c) fails++; };
{
  const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(3500);
  const swState = await p.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return reg.active && reg.active.state; });
  ok(swState === 'activated', 'Service Worker aktiv: ' + swState);
  const cdp = await ctx.newCDPSession(p);
  const inst = await cdp.send('Page.getInstallabilityErrors');
  ok(inst.installabilityErrors.length === 0, 'Installierbarkeit: keine Fehler ' + JSON.stringify(inst.installabilityErrors));
  const man = await cdp.send('Page.getAppManifest');
  ok(!man.errors.length && /standalone/.test(man.data), 'Manifest gueltig, display standalone ' + JSON.stringify(man.errors));
  const hintVisible = await p.evaluate(() => !document.getElementById('ps-install-hint').hidden);
  const hintText = await p.evaluate(() => document.getElementById('ps-ih-body').textContent);
  ok(hintVisible, 'Installationshinweis auf Android sichtbar: "' + hintText.slice(0, 70) + '"');
  const sys = await p.evaluate(() => getComputedStyle(document.getElementById('ps-sysmon')).display);
  ok(sys === 'none', 'System-Monitor auf dem Handy ausgeblendet');
  await p.waitForTimeout(1500);
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
  const off = await p.evaluate(() => ({ title: document.title, hasAnon: typeof anon === 'function', tailwind: typeof tailwind })).catch((e) => ({ err: String(e).slice(0, 80) }));
  ok(off.hasAnon && /PrivacyShield/.test(off.title), 'Offline-Start aus dem Cache: ' + JSON.stringify(off));
  ok(errs.length === 0, 'keine Skriptfehler ' + JSON.stringify(errs.slice(0, 2)));
  await ctx.close();
}
{
  const ctx = await b.newContext({ ...devices['iPhone 14'] }); const p = await ctx.newPage();
  await p.goto(URL_); await p.waitForTimeout(3500);
  const t = await p.evaluate(() => ({ vis: !document.getElementById('ps-install-hint').hidden, text: document.getElementById('ps-ih-body').textContent }));
  ok(t.vis && /Zum Home-Bildschirm/.test(t.text) && /Teilen/.test(t.text), 'iPhone: Anleitung "Teilen -> Zum Home-Bildschirm" sichtbar');
  await p.screenshot({ path: '/tmp/pwa-iphone-hint.png' });
  await p.click('#ps-ih-close'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => Number(localStorage.getItem('ps_install_hint_until')) > Date.now()), 'Schliessen merkt sich 30 Tage');
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  await p.goto(URL_); await p.waitForTimeout(3500);
  ok(await p.evaluate(() => document.getElementById('ps-install-hint').hidden), 'Desktop: kein Installationshinweis');
  const label = await p.evaluate(() => document.getElementById('ps-manual-check-btn').textContent.trim());
  ok(!/[\u{1F300}-\u{1FAFF}]/u.test(label), 'Update-Knopf ohne Emoji: "' + label + '"');
  await ctx.close();
}
await b.close(); srv.close();
console.log(fails ? `\n${fails} Fehler` : '\nalles ok'); process.exit(fails ? 1 : 0);
