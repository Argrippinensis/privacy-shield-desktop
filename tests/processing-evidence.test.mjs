// Real Chromium, actual PDF.js/Tesseract; synthetic fixtures only. Run from repository root.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { pdfText } from './pdf-text.mjs';
const root = process.cwd(), artifacts = path.join(root, 'docs/issue-1/examples');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.gz':'application/gzip'};
let browser, server, page, f, base;
test.before(async () => {
  execFileSync(process.execPath, ['scripts/build-web-beta.mjs']); fs.mkdirSync(artifacts,{recursive:true});
  server = http.createServer((req,res) => {
    const url = new URL(req.url,'http://local');
    if(url.pathname==='/tools/privacyshield-redesigned.html') {res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Synthetic stable page</title>');}
    const file = path.join(root,'dist-web-beta',url.pathname.endsWith('/') ? url.pathname+'index.html' : url.pathname);
    if (!fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream'); fs.createReadStream(file).pipe(res);
  }); await new Promise(r=>server.listen(0,'127.0.0.1',r)); base = 'http://127.0.0.1:'+server.address().port;
  browser = await chromium.launch({executablePath:process.env.PS_CHROMIUM || undefined,headless:true,args:['--no-sandbox']});
});
test.after(async()=>{await browser?.close(); await new Promise(r=>server?.close(r));});
async function fresh() {
  await page?.close(); page = await browser.newPage();
  await page.route('**/*',r=>new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await page.goto(base+'/'); f=page.frames().find(f=>f.url().endsWith('privacy-shield.html'));
  await f.waitForFunction(()=>typeof psCapture==='function' && typeof PSDetect!=='undefined');
  await f.evaluate(()=>{document.getElementById('OB').style.display='none';document.getElementById('WS').style.display='block';});
}
async function run(text='Erika Schulz schreibt an text@example.invalid. Wiederholung text@example.invalid.') {
  await f.fill('#IT',text); await f.evaluate(()=>anon()); assert.equal(await f.evaluate(()=>psCurrent()),true);
}
async function pdf(kind) {
  return f.evaluate(kind=>{
    const doc=new jspdf.jsPDF();
    function scan() {const c=document.createElement('canvas');c.width=1000;c.height=500;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,1000,500);x.fillStyle='black';x.font='40px sans-serif';x.fillText('Erika Schulz',50,150);x.fillText('scan@example.invalid',50,240); doc.addImage(c.toDataURL('image/png'),'PNG',10,10,190,95);}
    if(kind==='scan'||kind==='limit') scan(); else if(kind==='graphic'){doc.setFillColor(0);doc.rect(10,10,50,50,'F');} else if(kind!=='blank')doc.text('Native page: text@example.invalid',10,20);
    if(kind==='mixed'){doc.addPage();scan();}
    if(kind==='limit')for(let i=1;i<21;i++){doc.addPage();scan();}
    return Array.from(new Uint8Array(doc.output('arraybuffer')));
  },kind);
}
async function importPdf(bytes) {return f.evaluate(async b=>{try {const text=await readTextOf(new File([new Uint8Array(b)],'SECRET_FILENAME.pdf'));return {text,coverage:psImport};}catch(e){return {error:e.message};}},bytes);}
test('F1: native, mixed, scan, blank, unclear graphic and corrupt real PDFs',async()=>{
  await fresh();
  for(const kind of ['native','mixed','scan','blank','graphic']) {
    const bytes=Array.from(fs.readFileSync('tests/fixtures/issue-1/'+kind+'.pdf'));
    const r=await importPdf(bytes);
    if(kind==='graphic')assert.match(r.error,/Grafik|unklar/);
    else {assert.equal(r.coverage.complete,true);if(kind==='mixed'){assert.match(r.text,/text@example.invalid/);assert.match(r.text,/scan@example.invalid/);assert.equal(r.coverage.pages.length,2);}if(kind==='scan')assert.match(r.text,/scan@example.invalid/);if(kind==='blank')assert.match(r.coverage.pages[0].method,/Leerseite/);}
  }
  assert.match((await importPdf(Array.from(Buffer.from('%PDF-broken')))).error,/beschädigt/);
  assert.match((await importPdf(await pdf('limit'))).error,/mehr als 20/);
});
test('F2 and evidence: all setting groups, hashing race, immutable model history, private allowlist and PDF/JSON examples',async()=>{
  await fresh(); await run();
  let e=await f.evaluate(()=>psEvidence());const out=await f.inputValue('#AT');
  assert.equal(e.documents[0].result.sha256,crypto.createHash('sha256').update(out).digest('hex'));assert.match(e.humanReview,/nicht bestätigt/);
  assert.ok(e.documents[0].replacements.EMAIL>=2);
  for(const mutation of [()=>{curProf='changed';},()=>{ENTS[0].on=!ENTS[0].on;},()=>{cvars.push({p:'SECRET_RULE',t:'SECRET'});},()=>{whitelist.push('SECRET_ALLOW');},()=>{released.push({value:'SECRET_RELEASE',pfx:'EMAIL'});},()=>{PSLib.marks.add(manualMarks,{value:'SECRET_MARK',pfx:'EMAIL'});},()=>{localStorage.setItem('ps_ai_mode','changed');},()=>{document.getElementById('AT').value+='edit';}]) {
    await fresh();await run();await f.evaluate('('+mutation.toString()+')()');assert.equal(await f.evaluate(()=>psCurrent()),false);
  }
  await fresh(); await run();
  assert.equal(await f.evaluate(async()=>{const original=shaHex;shaHex=async t=>{document.getElementById('IT').value+='race';return original(t);};try{await psEvidence();return false;}catch{return true;}finally{shaHex=original;}}),true);
  await fresh();await run();
  fs.writeFileSync(path.join(artifacts, 'pseudonymisiertes-ergebnis.txt'), await f.inputValue('#AT'), 'utf8');
  // Both outputs are derived from exactly the same allowlist, and independently extracted below.
  for(const confirmed of [false,true]) {
    const data=await f.evaluate(async confirmed=>{psHuman=confirmed;const e=await psEvidence();return {e,text:psEvidenceText(e)};},confirmed);
    const name=confirmed?'confirmed':'unconfirmed';fs.writeFileSync(path.join(artifacts,name+'.json'),JSON.stringify(data.e,null,2)+'\n');
    const print=await browser.newPage();await print.setContent('<style>@page{size:A4;margin:16mm}pre{font:10pt/1.35 sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}</style><pre></pre>');await print.locator('pre').evaluate((el,text)=>el.textContent=text,data.text);
    await print.pdf({path:path.join(artifacts,name+'.pdf'),preferCSSPageSize:true});await print.close();
    const extracted=await pdfText(path.join(artifacts,name+'.pdf'));
    for(const expected of [data.e.id,data.e.documents[0].result.sha256,data.e.humanReview,'Pseudonymisierung'])assert.ok(extracted.includes(expected));
    for(const secret of ['Erika Schulz','text@example.invalid','SECRET_FILENAME','SECRET_RULE'])assert.ok(!extracted.includes(secret)&&!JSON.stringify(data.e).includes(secret));
  }
  // No model needed here: controlled model-use metadata, followed by unload, must stay historical.
  await f.evaluate(()=>{psUsedAI=true;psCapture();nerPipeline=null;});assert.equal((await f.evaluate(()=>psEvidence())).modelId,'Xenova/distilbert-base-multilingual-cased-ner-hrl');
});
test('F6: actual main button with denied and absent API; manual fallback without unhandled rejection',async()=>{
  for(const absent of [false,true]) {
    await fresh();await run();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.evaluate(absent=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:absent?undefined:{writeText:()=>Promise.reject(new DOMException('denied','NotAllowedError'))}});document.execCommand=()=>false;},absent);
    await f.click('button[onclick="cpAnon()"]');await page.waitForTimeout(100);assert.match(await f.locator('#TT').textContent(),/manuell kopieren/);assert.deepEqual(errors,[]);
  }
  await fresh();await run();await page.evaluate(()=>{window.__copied='';electronAPI.copyText=async t=>{window.__copied=t;};});await f.click('button[onclick="cpAnon()"]');assert.equal(await page.evaluate(()=>window.__copied),await f.inputValue('#AT'));
});
test('F3: outer link, stay/download/cancel and deliberate navigation; conditional beforeunload',async()=>{
  await fresh();await run();await page.waitForTimeout(200);assert.equal(await f.evaluate(()=>psUnloadActive),true);
  await page.locator('a[href="/tools/privacyshield-redesigned.html"]').click();await f.getByRole('button',{name:'Bleiben',exact:true}).click();assert.equal(page.url(),base+'/');
  await page.locator('a[href="/tools/privacyshield-redesigned.html"]').click();await f.getByRole('button',{name:'Zuordnung herunterladen',exact:true}).click();await f.evaluate(()=>psPwClose());assert.equal(await f.evaluate(()=>psMapUnsaved()),true);
  await page.locator('a[href="/tools/privacyshield-redesigned.html"]').click();await f.getByRole('button',{name:'Bewusst verlassen',exact:true}).click();await page.waitForURL('**/tools/privacyshield-redesigned.html');
});
test('F5: missing PDF worker resource differs from damaged document; prepared offline import',async()=>{
  await fresh(); const bytes=await pdf('native');
  await page.route('**/pdf.worker.min.js',r=>r.abort());assert.match((await importPdf(bytes)).error,/Ressourcen.*nicht verfügbar/);
  await page.unroute('**/pdf.worker.min.js');assert.match((await importPdf(bytes)).text,/text@example.invalid/);
  await page.context().setOffline(true);assert.match((await importPdf(bytes)).text,/text@example.invalid/);await page.context().setOffline(false);
});
test('project revision: edits/removal/partial imports block proof, successful complete project yields neutral indexes',async()=>{
  await fresh();
  await f.locator('#FI').setInputFiles([{name:'SECRET_ONE.txt',mimeType:'text/plain',buffer:Buffer.from('Kontakt: one@example.invalid.')},{name:'SECRET_TWO.txt',mimeType:'text/plain',buffer:Buffer.from('Kontakt: two@example.invalid.')}]);
  await f.waitForFunction(()=>prj && prj.docs.length===2 && !prjBusy);await f.evaluate(()=>prjShow(prj.docs[0].id));await f.evaluate(()=>prjRun());
  assert.equal(await f.evaluate(()=>psCurrent()),true);assert.equal((await f.evaluate(()=>psEvidence())).documentCount,2);
  await f.evaluate(()=>prjShow(prj.docs[1].id));assert.equal(await f.evaluate(()=>psCurrent()),true);
  await f.fill('#IT','Sichtbar geändert');assert.equal(await f.evaluate(()=>prj.docs.find(d=>d.id===prjSel).text),'Sichtbar geändert');assert.equal(await f.evaluate(()=>psCurrent()),false);
  await f.evaluate(()=>prjRun());assert.equal(await f.evaluate(()=>psCurrent()),true);
  await f.evaluate(()=>prjDel(prj.docs[0].id));assert.equal(await f.evaluate(()=>psCurrent()),false);assert.equal(await f.locator('#PRJZIP').isDisabled(),true);
  await f.evaluate(()=>{psProjectImportFailed=true;});await f.evaluate(()=>prjRun());assert.equal(await f.evaluate(()=>psCurrent()),false);
});
test('released findings remain explicit; preview confirmation resets on relevant changes; print button opens same text',async()=>{
  await fresh();await f.evaluate(()=>whitelist.push('text@example.invalid'));await run();
  const e=await f.evaluate(()=>psEvidence());assert.ok(e.documents[0].check.released>=2);
  await f.evaluate(()=>psPreview());const cb=f.locator('dialog input[type=checkbox]');assert.equal(await cb.isChecked(),false);await cb.check();
  assert.match(await f.locator('dialog pre').textContent(),/Sichtprüfung vom Nutzer bestätigt/);
  await f.evaluate(()=>{window.__prints=[];const append=document.body.append.bind(document.body);document.body.append=(...nodes)=>{append(...nodes);for(const n of nodes)if(n.tagName==='IFRAME')n.contentWindow.print=()=>window.__prints.push(n.contentDocument.body.textContent);};});
  await f.getByRole('button',{name:'Drucken / als PDF speichern',exact:true}).click();await f.waitForFunction(()=>window.__prints.length===1);assert.match(await f.evaluate(()=>window.__prints[0]),/bewusst freigegeben\/ignoriert: 2/);
  await f.getByRole('button',{name:'Schließen',exact:true}).click();await f.fill('#IT','Neu');assert.equal(await f.evaluate(()=>psHuman),false);assert.equal(await f.evaluate(()=>psCurrent()),false);
  await page.setViewportSize({width:390,height:844});await run();await f.evaluate(()=>psPreview());assert.equal(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});
test('F5 cache removal and download interruption remain resource failures',async()=>{
  await fresh();const bytes=await pdf('native');assert.match((await importPdf(bytes)).text,/text@example.invalid/);
  await f.evaluate(()=>caches.delete('ps2-import-resources-v1'));await page.context().setOffline(true);
  assert.match((await importPdf(bytes)).error,/Ressourcen.*nicht verfügbar/);await page.context().setOffline(false);
});
test('F3 reload/tab close and aborted download confirmation retain unsaved protection',async()=>{
  await fresh();await run();await f.click('button[onclick="cpAnon()"]');
  let dialogs=0;const dismiss=async d=>{assert.equal(d.type(),'beforeunload');dialogs++;await d.dismiss();};page.on('dialog',dismiss);
  await page.reload({timeout:3000}).catch(e=>assert.match(e.message,/ERR_ABORTED|Timeout/));assert.ok(dialogs>=1);assert.equal(await f.evaluate(()=>psMapUnsaved()),true);
  page.removeListener('dialog',dismiss);
  await f.evaluate(async()=>{const c=window.confirm;window.confirm=()=>false;mapAfterSave(Promise.resolve(true),stateRev,'ok','failed');await new Promise(r=>setTimeout(r,0));window.confirm=c;});assert.equal(await f.evaluate(()=>psMapUnsaved()),true);
  await f.evaluate(()=>{mapSaved=true;psSyncProtection();});assert.equal(await f.evaluate(()=>psUnloadActive),false);
  await f.evaluate(()=>{stateTouch();psSyncProtection();});assert.equal(await f.evaluate(()=>psUnloadActive),true);
});

test('fallback reason belongs to the completed run, including memory hint after a previous unrelated error',async()=>{
  await fresh();await f.evaluate(()=>{setAIMode('auto');aiFailedAt=0;lastAIError={code:'NETWORK',reason:'Previous unrelated error'};checkMemoryHint=async()=>true;});await run();
  const e=await f.evaluate(()=>psEvidence());assert.match(e.fallback,/Arbeitsspeicher/);assert.ok(!e.fallback.includes('Previous'));assert.equal(e.modelId,null);
  await f.evaluate(()=>{lastAIError={reason:'Later error'};});assert.equal((await f.evaluate(()=>psEvidence())).fallback,e.fallback);
});
