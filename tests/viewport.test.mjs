import test from 'node:test';import assert from 'node:assert/strict';import {launchApp,toolFrame} from './helpers.mjs';
test('Actual desktop renderer supports the requested 1280x800 viewport on smaller CI displays',async()=>{
 const a=await launchApp({offline:true});
 try{
  await toolFrame(a.win);
  const geometry=await a.app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1280,800);return {display:screen.getPrimaryDisplay().workAreaSize,content:w.getContentBounds()};});
  console.log('VIEWPORT',JSON.stringify(geometry));
  await a.win.waitForFunction(()=>innerWidth===1280&&innerHeight===800,null,{timeout:10000});
  assert.deepEqual(await a.win.evaluate(()=>[innerWidth,innerHeight]),[1280,800]);
 }finally{await a.close();}
});
