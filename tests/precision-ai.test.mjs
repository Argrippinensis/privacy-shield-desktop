import test from 'node:test';
import assert from 'node:assert/strict';
import {launchApp, toolFrame, runAnon} from './helpers.mjs';

// Transcribed business terms from the beta screenshot, surrounded by synthetic
// contact data. This is a text-layer regression, not a PDF/OCR accuracy claim.
const headings = ['Digital Engineering', 'Customer Restricted', 'Implementation Support',
  'Agile Software Development Target Operating Model', 'Semiconductor Technology Leader',
  'Agile Software Development Operating Model Transformation', 'Business Unit Target Operating Model',
  'Advanced Packaging Systems', 'Operating Model Transformation', 'Minimum Viable Organization',
  'Automotive Software', 'Agile Operating Model Transformation', 'Lean Portfolio Management'];
const text = 'Christoph Stich Executive Vice President\n+49 30 12345678\n' + headings.join('\n') +
  '\nRenz Vice President\nanna@example.org\nDigital Engineering GmbH';

test('Beta business document: exact persons, readable headings, contacts protected, offline model', {timeout:120000}, async () => {
  const a = await launchApp({offline:true});
  try {
    const f = await toolFrame(a.win);
    for (const mode of ['off','auto']) {
      await f.evaluate(async mode => {setAIMode(mode);if(mode==='auto')await loadAIModel();},mode);
      if(mode==='auto') assert.equal(await f.evaluate(()=>!!nerPipeline),true);
      const r=await runAnon(f,text);
      for(const heading of headings)assert.ok(r.out.includes(heading), `${mode}: ${heading}`);
      for(const value of ['Christoph','Stich','Renz','12345678','anna@example.org','Digital Engineering GmbH'])assert.ok(!r.out.includes(value),`${mode}: leaked ${value}`);
      assert.ok(r.out.includes('Executive Vice President')); assert.ok(r.out.includes('Vice President'));
      assert.equal(await f.evaluate(({out,store})=>PSDetect.deanonymize(out,{store}),r),text);
    }
    assert.deepEqual(await a.app.evaluate(()=>globalThis.__psBlocked),[]);
  } finally {await a.close();}
});
