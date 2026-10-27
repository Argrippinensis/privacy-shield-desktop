import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright-core';
import {launchApp,toolFrame,ROOT} from './helpers.mjs';
let server,browser,url;
test.before(async()=>{
 execFileSync(process.execPath,['scripts/build-web-beta.mjs'],{cwd:ROOT});const root=path.join(ROOT,'dist-web-beta');
 server=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname;const file=path.join(root,name.endsWith('/')?name+'index.html':name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:process.env.PS_CHROMIUM||undefined,args:['--no-sandbox']});
});
test.after(async()=>{await browser?.close();server?.closeAllConnections();await new Promise(r=>server.close(r));});
async function open(host,text){
 let f,close;
 if(host==='desktop'){const app=await launchApp({offline:true});f=await toolFrame(app.win);close=()=>app.close();}
 else{const p=await browser.newPage();await p.goto(url);f=await(await p.$('#tool-frame')).contentFrame();await f.waitForFunction(()=>typeof anon==='function');close=async()=>{await f.evaluate(()=>{psLeaving=true;psSyncProtection();});await p.close();};}
 await f.evaluate(()=>{startApp();setAIMode('off');});await f.fill('#IT',text);await f.evaluate(()=>anon());await f.click('#ANBTN');return {f,close};
}
for(const host of ['desktop','web']){
 test(host+': automatic whole entities release/remask without duplicate marks and keep evidence honest',async()=>{
  const text='Thomas Müller wohnt hier. Kontakt: synthetic@example.invalid. Nochmals synthetic@example.invalid. Literal {{NAME_77}}.';const {f,close}=await open(host,text);
  try{
   const email=f.locator('#ANOVERLAY [data-pfx="EMAIL"]');assert.equal(await email.count(),2);
   const literal=f.locator('#ANOVERLAY span').filter({hasText:/^\{\{NAME_77\}\}$/});assert.equal(await literal.getAttribute('role'),null);assert.equal(await literal.evaluate(n=>getComputedStyle(n).cursor),'default');
   await email.first().click();await f.waitForFunction(()=>psCurrent()&&document.getElementById('AT').value.includes('synthetic@example.invalid'));
   assert.equal(await email.first().getAttribute('aria-pressed'),'false');
   const proof=await f.evaluate(()=>psEvidence());assert.ok(proof.documents[0].check.released>=1);assert.match(proof.humanReview,/nicht bestätigt/);
   await email.first().press('Enter');await f.waitForFunction(()=>psCurrent()&&!document.getElementById('AT').value.includes('synthetic@example.invalid'));
   const same=await f.evaluate(()=>{const run=psRun;addManualMark('synthetic@example.invalid','EMAIL');addManualMark('SYNTHETIC@EXAMPLE.INVALID','EMAIL');return {marks:manualMarks.items.length,same:psRun===run,current:psCurrent()};});assert.deepEqual(same,{marks:0,same:true,current:true});
   const name=f.locator('#ANOVERLAY [data-pfx="NAME"]').filter({hasText:'Thomas Müller'});assert.equal(await name.count(),1);
   await name.click();await f.waitForFunction(()=>psCurrent()&&document.getElementById('AT').value.includes('Thomas Müller'));
   assert.equal(await f.evaluate(()=>manualMarks.items.length),0);
  }finally{await close();}
 });
 test(host+': manual marks release, undo, redo and normalized duplicate prevention through real controls',async()=>{
  const {f,close}=await open(host,'intern gilt zzqyyk als code.');
  try{
   await f.locator('#ANOVERLAY [role="button"]').filter({hasText:/^zzqyyk$/}).click();await f.locator('#AMP button[onclick*="selectAnnotateType"]').first().click();await f.evaluate(()=>anon());
   assert.equal(await f.evaluate(()=>manualMarks.items.length),1);
   const marked=f.locator('#ANOVERLAY [data-pfx="NAME"]').filter({hasText:/^zzqyyk$/});await marked.click();await f.waitForFunction(()=>psCurrent()&&document.getElementById('AT').value.includes('zzqyyk'));
   await marked.focus();await marked.press((await f.evaluate(()=>fundeMac())?'Meta':'Control')+'+z');await f.waitForFunction(()=>psCurrent()&&!document.getElementById('AT').value.includes('zzqyyk'));
   await f.click('#ANREDO');await f.waitForFunction(()=>psCurrent()&&document.getElementById('AT').value.includes('zzqyyk'));
   await marked.click();await f.waitForFunction(()=>psCurrent()&&!document.getElementById('AT').value.includes('zzqyyk'));
   await f.evaluate(()=>{addManualMark('ZZQYYK','NAME');addManualMark('ｚｚｑｙｙｋ','NAME');});assert.equal(await f.evaluate(()=>manualMarks.items.length),1);
   assert.equal(await marked.getAttribute('aria-pressed'),'true');
  }finally{await close();}
 });
}
