// Actual browser restart without network, real PDF/OCR and model files; synthetic documents only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { launchApp, toolFrame } from './helpers.mjs';
const root = process.cwd(), prefix = '/tools/privacyshield-2-beta/';
let server, base, profile, context, corruptDownload = false;
const network = [];
const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.wasm':'application/wasm', '.css':'text/css', '.gz':'application/gzip', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png' };
async function browser(offline = false, options = {}) {
  if (context) await closeBrowser();
  context = await chromium.launchPersistentContext(profile, { executablePath: process.env.PS_CHROMIUM || undefined, headless:true, args:['--no-sandbox'], ...options });
  await context.setOffline(offline); return context;
}
async function closeBrowser() {
  if (!context) return;
  const closing = context; context = null;
  for (const page of closing.pages()) for (const frame of page.frames()) await frame.evaluate(() => { if (typeof psSyncProtection === 'function') { psLeaving = true; psSyncProtection(); } }).catch(() => {});
  await closing.setOffline(false).catch(() => {});
  await closing.close();
}
async function open() {
  const p = await context.newPage(); await p.goto(base + prefix);
  const f = await p.locator('#tool-frame').elementHandle().then(e => e.contentFrame());
  await f.waitForFunction(() => typeof anon === 'function'); return { p, f };
}
async function work(f) { await f.evaluate(() => { document.getElementById('OB').style.display='none'; document.getElementById('WS').style.display='block'; setAIMode('off'); }); }
test.before(async () => {
  execFileSync(process.execPath, ['scripts/build-web-beta.mjs']);
  profile = fs.mkdtempSync(path.join(os.tmpdir(),'ps-local-browser-'));
  server = http.createServer((req,res) => {
    network.push(req.url);
    if (corruptDownload && req.url.endsWith('/css/tailwind.css')) { res.setHeader('Content-Type','text/css'); return res.end('/* synthetic incomplete download */'); }
    if (req.url.startsWith('/test-model/')) { const file = path.join(root,'app/models',decodeURIComponent(req.url.slice('/test-model/'.length))); if (!fs.existsSync(file)) return res.writeHead(404).end(); res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Content-Type','application/octet-stream'); return fs.createReadStream(file).pipe(res); }
    if (!req.url.startsWith(prefix)) return res.writeHead(404).end();
    const rel = new URL(req.url,'http://local').pathname.slice(prefix.length) || 'index.html';
    const file = path.resolve(root,'dist-web-beta',rel);
    if (!file.startsWith(path.join(root,'dist-web-beta') + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0,'127.0.0.1',r)); base = 'http://127.0.0.1:' + server.address().port;
});
test.afterEach(async () => { await closeBrowser(); });
test.after(async () => { await closeBrowser(); server.closeAllConnections(); await new Promise(r => server.close(r)); fs.rmSync(profile,{recursive:true,force:true,maxRetries:20,retryDelay:100}); });

test('Browser: first visit has no automatic preparation or model download; explicit preparation preserves unrelated caches', async () => {
  await browser(); const {p,f} = await open();
  assert.equal((await p.evaluate(() => PSOffline.status())).core,false);
  assert.equal(await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),0);
  assert.equal(await f.locator('.ps-local-pill').isVisible(),true);
  await p.evaluate(async () => { await caches.open('unrelated-tool-keep'); await caches.open('transformers-cache'); });
  await f.locator('.ps-local-pill').click();
  await f.getByRole('button',{name:'Offline vorbereiten',exact:true}).click();
  await p.evaluate(() => PSOffline.prepare());
  assert.equal((await p.evaluate(() => PSOffline.status())).core,true);
  const keys = await p.evaluate(() => caches.keys()); assert.ok(keys.includes('unrelated-tool-keep')); assert.ok(keys.includes('transformers-cache'));
  assert.equal((await p.evaluate(() => PSOffline.status())).model,false);
  assert.ok(network.every(u => !/model_quantized|huggingface/.test(u)));
  await f.getByRole('button',{name:'Schließen',exact:true}).click();
  await work(f); await f.fill('#IT','Synthetisches Geheimnis: mail@example.invalid.'); await f.evaluate(() => anon());
  assert.match(await f.inputValue('#AT'),/\{\{EMAIL_1\}\}/);
  await closeBrowser();
});

test('Browser: full restart offline, text processing, actual scanned PDF OCR, DOCX and evidence without server requests', {timeout:120000}, async () => {
  const before = network.length; await browser(true); const {p,f} = await open();
  assert.equal(await p.evaluate(() => navigator.onLine),false);
  assert.equal((await p.evaluate(() => PSOffline.status())).core,true);
  assert.equal(await f.inputValue('#IT'),'','document is not persisted'); await work(f);
  const pdf = fs.readFileSync('tests/fixtures/issue-1/scan.pdf').toString('base64');
  const text = await f.evaluate(async b64 => exPDF(new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))],'synthetic.pdf',{type:'application/pdf'})),pdf);
  assert.match(text,/example\.invalid/);
  await f.fill('#IT',text); await f.evaluate(() => anon());
  assert.ok(await f.evaluate(() => psCurrent()));
  const proof = await f.evaluate(() => psEvidence()); assert.ok(proof); assert.ok(!JSON.stringify(proof).includes('example.invalid'));
  const docx = await f.evaluate(async () => {
    const z = new JSZip(); z.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>SYNTHETIC OFFICE TEXT</w:t></w:r></w:p></w:body></w:document>');
    return exDOCX(new File([await z.generateAsync({type:'uint8array'})],'synthetic.docx'));
  }); assert.match(docx,/SYNTHETIC OFFICE TEXT/);
  assert.equal(network.length,before,'offline tasks must not reach the server');
  await closeBrowser();
});

test('Browser: optional pinned model preparation avoids loading a session; after offline restart actual model runs', {timeout:180000}, async () => {
  await browser(); const {p,f} = await open();
  const lock = JSON.parse(fs.readFileSync('scripts/vendor.lock.json'));
  await context.route('https://huggingface.co/**', async route => {
    const file = lock.files.find(f => f.url === route.request().url());
    if (!file) return route.fulfill({status:404,body:''});
    await route.fulfill({status:302,headers:{'Location':base + '/test-model/' + file.dest.replace('models/', ''),'Access-Control-Allow-Origin':'*'}});
  });
  await p.evaluate(() => PSOffline.prepareModel());
  assert.equal(await f.evaluate(() => !!nerPipeline),false,'preparation must not allocate an inference session');
  assert.equal(await f.evaluate(() => aiMode()),'off');
  assert.equal((await p.evaluate(() => PSOffline.status())).model,true);
  await closeBrowser();
  await browser(true); const offline = await open(); await work(offline.f);
  const loaded = await offline.f.evaluate(async () => { await loadAIModel(); return {ready:!!nerPipeline, info:nerPipeline?.info}; });
  assert.equal(loaded.ready,true,'real multilingual model must load with the network disconnected');
  await offline.f.fill('#IT','Thomas Mueller wohnt in Berlin. Kontakt: synthetic@example.invalid.'); await offline.f.evaluate(() => anon());
  assert.equal(await offline.f.evaluate(() => psCurrent()),true);
  await closeBrowser();
});

test('Browser: cache deletion revokes readiness; incomplete download never becomes ready and preserves other tools and model', {timeout:90000}, async () => {
  await browser(); const {p} = await open();
  const missing = await p.evaluate(async () => {
    const c = await caches.open(PS_OFFLINE.cache), url = new URL('css/tailwind.css', location.href).href;
    await c.delete(url); return PSOffline.status();
  });
  assert.equal(missing.core,false); assert.equal(missing.model,true);
  corruptDownload = true;
  try { await assert.rejects(p.evaluate(() => PSOffline.prepare()), /Download|Prüfsumme|Offline/); }
  finally { corruptDownload = false; }
  assert.equal((await p.evaluate(() => PSOffline.status())).core,false);
  const keys = await p.evaluate(() => caches.keys()); assert.ok(keys.includes('unrelated-tool-keep')); assert.ok(keys.includes('transformers-cache'));
  await p.evaluate(() => PSOffline.prepare()); assert.equal((await p.evaluate(() => PSOffline.status())).core,true);
  await closeBrowser();
});

test('Browser: mobile layout and reduced motion; AI destination links carry no text and stale results block handoff', async () => {
  await browser(false,{viewport:{width:390,height:844},reducedMotion:'reduce',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  const {p,f} = await open(); await work(f);
  await p.evaluate(() => { electronAPI.copyText = async text => { window.__copied = text; }; });
  await f.fill('#IT','Kontakt synthetic@example.invalid.'); await f.evaluate(() => anon());
  await f.evaluate(() => copyAndOpenAI('https://gemini.google.com'));
  await f.getByRole('link',{name:'App bevorzugen',exact:true}).waitFor();
  assert.equal(await f.getByRole('link',{name:'App bevorzugen',exact:true}).getAttribute('href'),'https://gemini.google.com/app/download/mobile');
  const urls = await f.locator('[data-ps-service]').evaluateAll(a => a.map(x => x.href)); assert.ok(urls.every(u => !u.includes('synthetic') && !u.includes('EMAIL')));
  assert.equal(await p.evaluate(() => window.__copied),await f.inputValue('#AT'));
  assert.equal(await f.locator('.ps-local-orbit').evaluate(e => getComputedStyle(e).animationName),'none');
  assert.ok(await f.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await f.evaluate(() => { document.getElementById('IT').value += ' changed'; document.getElementById('IT').dispatchEvent(new Event('input',{bubbles:true})); });
  const popups = []; p.on('popup',x => popups.push(x)); await f.getByRole('link',{name:'App bevorzugen',exact:true}).click();
  assert.match(await f.locator('dialog[open]').innerText(),/Ergebnis veraltet/); assert.equal(popups.length,0);
  await p.screenshot({path:'/tmp/privacyshield-mobile-offline.png',fullPage:true});
  await closeBrowser();
});

test('Desktop: offline status verified from installed resources; app handler preferred, missing handler and failure fall back to fixed web URLs', async () => {
  const a = await launchApp({offline:true,env:{PS_TEST_HOOKS:'1'}});
  try {
    const f = await toolFrame(a.win); await f.locator('.ps-local-pill').click();
    await f.waitForFunction(() => document.querySelector('[data-core]').textContent.includes('offline vorbereitet'));
    const r = await a.app.evaluate(async ({app,shell}) => {
      const ev = {senderFrame:{url:'app://ps/index.html'}};
      const name = app.getApplicationNameForProtocol; app.getApplicationNameForProtocol = () => 'Synthetic installed handler';
      globalThis.__psExternal = [];
      await globalThis.__psIpc.invoke('open-ai-service',ev,'chatgpt',true);
      await globalThis.__psIpc.invoke('open-ai-service',ev,'claude',true);
      app.getApplicationNameForProtocol = () => '';
      await globalThis.__psIpc.invoke('open-ai-service',ev,'chatgpt',true);
      await globalThis.__psIpc.invoke('open-ai-service',ev,'gemini',true);
      const urls = [...globalThis.__psExternal];
      const previousBlock = process.env.PS_BLOCK_EXTERNAL, previousOpen = shell.openExternal;
      process.env.PS_BLOCK_EXTERNAL = ''; app.getApplicationNameForProtocol = () => 'Synthetic handler';
      const failedLaunches = [];
      shell.openExternal = async url => { failedLaunches.push(url); if (url.startsWith('claude:')) throw Error('Synthetic launch failure'); };
      try { await globalThis.__psIpc.invoke('open-ai-service',ev,'claude',true); } finally { shell.openExternal = previousOpen; process.env.PS_BLOCK_EXTERNAL = previousBlock; } 
      const invalid = [];
      for (const args of [['https://evil.invalid',true],['__proto__',true],['chatgpt','yes']]) { try { await globalThis.__psIpc.invoke('open-ai-service',ev,...args); invalid.push(false); } catch { invalid.push(true); } }
      app.getApplicationNameForProtocol = name;
      return {urls,invalid,failedLaunches};
    });
    assert.deepEqual(r.urls,['chatgpt://','claude://claude.ai/new','https://chatgpt.com/','https://gemini.google.com/app']); assert.deepEqual(r.invalid,[true,true,true]); assert.deepEqual(r.failedLaunches,['claude://claude.ai/new','https://claude.ai/new']);
    assert.deepEqual(await a.app.evaluate(() => globalThis.__psBlocked),[]);
  } finally { await a.close(); }
});
