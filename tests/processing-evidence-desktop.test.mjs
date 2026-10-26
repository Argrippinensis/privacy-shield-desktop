import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {launchApp,toolFrame,runAnon,stubSaves,saveLog} from './helpers.mjs';
test('F2 native save dialog: changed revision never writes an evidence file; cancel does not succeed',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-evidence-dialog-')),a=await launchApp({offline:true});
  try{
    const f=await toolFrame(a.win);await runAnon(f,'Kontakt: erika@example.invalid.');
    await stubSaves(a.app,{dir,delayMs:600});
    const pending=f.evaluate(async()=>{const run=psRun; const e=await psEvidence();return psSaveRun('proof.json',JSON.stringify(e),'application/json',run);});
    await a.win.waitForTimeout(200);await f.fill('#IT','Geänderte Eingabe');assert.equal(await pending,false);assert.ok(!fs.existsSync(path.join(dir,'proof.json')));
    await runAnon(f,'Kontakt: erika@example.invalid.');await stubSaves(a.app,{dir,mode:'cancel'});
    assert.equal(await f.evaluate(()=>psSaveRun('proof.json','{}','application/json')),false);assert.ok(!fs.existsSync(path.join(dir,'proof.json')));
    assert.ok((await saveLog(a.app)).length);
  }finally{await a.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('evidence records actual local NER use and keeps model history after unloading',async()=>{
  const a=await launchApp({offline:true});
  try {
    const f=await toolFrame(a.win);await f.evaluate(()=>setAIMode('auto'));await runAnon(f,'Erika Schulz wohnt in Berlin. Kontakt: erika@example.invalid.');
    const e=await f.evaluate(()=>psEvidence());assert.match(e.mode,/NER-Modell/);assert.equal(e.modelId,'Xenova/distilbert-base-multilingual-cased-ner-hrl');assert.match(e.modelRevision,/^[a-f0-9]{40}$/);
    await f.evaluate(()=>unloadAIModel(true));const after=await f.evaluate(()=>psEvidence());assert.equal(after.modelId,e.modelId);assert.equal(after.mode,e.mode);assert.equal(after.id,e.id);
  } finally {await a.close();}
});
