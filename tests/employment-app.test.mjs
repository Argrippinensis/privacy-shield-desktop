// Genuine shared UI/model, no original employment documents and no external service launched.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright-core';
import {launchApp,toolFrame} from './helpers.mjs';
const text=fs.readFileSync(new URL('./fixtures/employment/synthetic-contract.txt',import.meta.url),'utf8');
function verify(out){for(const s of ['apoBank','apoBalance','Bank der Gesundheit','Apotheker','Ärztebank','Arztebank','Beispiel-Straße','Düsseldorf','Tarifgruppe C2','Berufsjahr 1','Team II','39 h','30 Urlaubstage','6 Monate','2 Jahre','Bachelor of Arts'])assert.ok(!out.includes(s),'unmasked '+s);for(const s of ['Probezeit','Befristung','Freistellung','Arbeitsverhältnis','Geschäftsgeheimnisse','§ 8','§ 23 GeschGehG'])assert.ok(out.includes(s),'readability: '+s);}
for(const model of [false,true])test('Desktop: synthetic contract, current evidence and exact roundtrip with real NER='+model,{timeout:120000},async()=>{
  const a=await launchApp({offline:true});try{
    const f=await toolFrame(a.win);await f.evaluate(()=>startApp());await f.locator('#ps-contract-review summary').click();await f.getByRole('button',{name:'Profil Arbeitsvertrag verwenden',exact:true}).click();
    await f.evaluate(async enabled=>{setAIMode(enabled?'auto':'off');if(enabled)await loadAIModel();},model);
    if(model)assert.equal(await f.evaluate(()=>!!nerPipeline),true);
    await f.fill('#IT',text);await f.evaluate(()=>anon());verify(await f.inputValue('#AT'));assert.equal(await f.evaluate(()=>psCurrent()),true);
    const proof=await f.evaluate(()=>psEvidence());assert.equal(proof.profile,'employment');assert.ok(proof.categories.includes('employment'));assert.ok(proof.categories.includes('identity'));assert.ok(!JSON.stringify(proof).includes('apoBank'));
    const roundtrip=await f.evaluate(()=>PSDetect.deanonymize(document.getElementById('AT').value,{store}));assert.equal(roundtrip,text);
    await f.evaluate(()=>{setAIMode('off');});assert.equal(await f.evaluate(()=>psCurrent()),false,'changing mode invalidates evidence');
    assert.deepEqual(await a.app.evaluate(()=>globalThis.__psBlocked),[]);
  }finally{await a.close();}
});

test('Desktop: actual provider link launches immediately and uses only fixed service IDs',{timeout:90000},async()=>{
 const a=await launchApp({offline:true});try{const f=await toolFrame(a.win);await f.evaluate(()=>{startApp();setAIMode('off');});await f.fill('#IT','Kontakt synthetic@example.invalid.');await f.evaluate(()=>anon());
  const before=await a.app.evaluate(()=>globalThis.__psExternal.length);await f.locator('[data-ps-ai="claude"]').click();
  await a.win.waitForTimeout(100);assert.equal(await a.app.evaluate(()=>globalThis.__psExternal.length),before+1);assert.equal(await f.locator('.ps-local-dialog[open]').count(),0);
  assert.equal(await f.locator('[data-ps-ai]').count(),8);
 }finally{await a.close();}
});

test('Mobile browser: first click requests direct app link before clipboard finishes; explicit web fallback, no prompt URL or second modal',{timeout:90000},async()=>{
 execFileSync(process.execPath,['scripts/build-web-beta.mjs']);const root=path.resolve('dist-web-beta');const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm'};
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://local').pathname;const file=path.join(root,p.endsWith('/')?p+'index.html':p);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.PS_CHROMIUM||undefined,headless:true,args:['--no-sandbox']});
 try{for(const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1','Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36']){
  const c=await browser.newContext({viewport:{width:390,height:844},userAgent:ua});try{const p=await c.newPage();await p.goto('http://127.0.0.1:'+server.address().port+'/');const f=await(await p.$('#tool-frame')).contentFrame();await f.waitForFunction(()=>typeof anon==='function');await f.evaluate(()=>{startApp();setAIMode('off');});await f.fill('#IT','Kontakt synthetic@example.invalid.');await f.evaluate(()=>anon());
   await p.evaluate(()=>{electronAPI.copyText=t=>new Promise(resolve=>{window.__clipboard=t;window.__finishClipboard=resolve;});});
   // Observe the requested default action without starting a real third-party app or HTTP request.
   await f.evaluate(()=>{window.__launches=[];document.addEventListener('click',e=>{const a=e.target.closest('[data-ps-ai]');if(a){window.__launches.push({href:a.href,blocked:e.defaultPrevented});e.preventDefault();}});});
   for(const id of ['chatgpt','claude','gemini','grok','deepseek']){await f.locator('[data-ps-ai="'+id+'"]').click();const request=await f.evaluate(()=>window.__launches.at(-1));assert.equal(request.blocked,false);assert.ok(!request.href.includes('synthetic'));assert.ok(!request.href.includes('EMAIL'));assert.ok(ua.includes('Android')?request.href.startsWith('intent://'):request.href.startsWith('https://'));assert.equal(await f.locator('.ps-local-dialog[open]').count(),0);}
   assert.match(await f.locator('#ps-handoff-status').textContent(),/App-Öffnung/);assert.equal(await p.evaluate(()=>window.__clipboard),await f.inputValue('#AT'));await p.evaluate(()=>window.__finishClipboard());
   assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await f.fill('#IT','geändert');await f.locator('[data-ps-ai="claude"]').click();assert.equal(await f.evaluate(()=>window.__launches.at(-1).blocked),true,'stale result blocks default app action');
  }finally{await c.close();}}
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('New optional review categories follow the explicit selection; existing comprehensive checks remain active',async()=>{
 const a=await launchApp({offline:true});try{const f=await toolFrame(a.win);const r=await f.evaluate(()=>{
   setAIMode('off');applyProfile(PROFILES.find(p=>p.id==='standard'));
   const standard=leakScan('Herrn 39 h');const legacy=leakScan('synthetic@example.invalid');
   applyProfile(PROFILES.find(p=>p.id==='employment'));
   const contract=leakScan('Herrn 39 h');
   return {standard,legacy,contract};
 });assert.ok(!r.standard.findings.some(x=>['MERKMAL','KONDITION'].includes(x.type)));assert.ok(r.contract.findings.some(x=>x.type==='MERKMAL'));assert.ok(r.contract.findings.some(x=>x.type==='KONDITION'));assert.ok(r.legacy.findings.some(x=>x.type==='EMAIL'));
 }finally{await a.close();}
});
