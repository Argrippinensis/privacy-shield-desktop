import test from 'node:test';
import assert from 'node:assert/strict';
import {loadLib} from './_load.mjs';
const D = loadLib('detect');
const N = loadLib('ner');
const phrases = [
  'tech', 'Digital Engineering', 'Customer Restricted', 'Implementation Support',
  'Agile Software Development Target Operating Model', 'Semiconductor Technology Leader',
  'Agile Software Development Operating Model Transformation', 'Business Unit Target Operating Model',
  'Advanced Packaging Systems', 'Operating Model Transformation', 'Minimum Viable Organization',
  'Automotive Software', 'Agile Operating Model Transformation', 'Lean Portfolio Management',
  'Cloud Platform Services', 'Global Vice President', 'Product Strategy', 'Quality Management',
];
for (const phrase of phrases) test(`Business prose remains readable: ${phrase}`, () => {
  for (const wordlists of [false, true]) for (const pfx of [null, 'NAME', 'ORG']) {
    const opts = {wordlists, ...(pfx ? {aiSpans: [{start: 0, end: phrase.length, pfx, col: '#000'}]} : {})};
    assert.deepEqual(D.detect(phrase, opts), [], JSON.stringify(opts));
  }
});
for (const [name, role] of [
  ['Christoph Stich', 'Executive Vice President'], ['Renz', 'Vice President'],
  ['Zeynep Öztürk', 'Senior Software Engineer'], ['Xanthe Quispe', 'Managing Director'],
  ['Anna Weber', 'Digital Engineering'], ['Hans Müller', 'Implementation Support'],
]) test(`Exact name boundary: ${name} / ${role}`, () => {
  const text = `${name} ${role}`;
  for (const aiSpans of [undefined, [{start: 0, end: text.length, pfx: 'NAME'}]]) {
    const r = D.anonymize(text, {aiSpans});
    assert.deepEqual(r.spans.map(s=>s.val), [name]);
    assert.ok(r.text.endsWith(` ${role}`));
    assert.equal(D.deanonymize(r.text, r.state), text);
  }
});
test('Separate lines do not merge unrelated names or headings', () => {
  const text = 'Anna Weber\nChristoph Stich\nImplementation Support\nCustomer Restricted';
  assert.deepEqual(D.detect(text).map(s=>s.val), ['Anna Weber', 'Christoph Stich']);
});
test('Explicit marks are exact and can mask business terms', () => {
  const text = 'Implementation Support Team';
  const r = D.detect(text, {extraSpans: [{start: 0, end: 22, pfx:'NAME', meth:'Manuelle Markierung'}]});
  assert.equal(r[0].val, 'Implementation Support');
});
test('Legal company names and hard identifiers remain protected', () => {
  const text = 'Digital Engineering GmbH; Advanced Packaging Systems AG; anna@example.org; +49 30 12345678; DE89 3704 0044 0532 0130 00';
  const r = D.anonymize(text);
  for (const value of ['Digital Engineering', 'Advanced Packaging', 'anna@example.org', '12345678', '0532']) assert.ok(!r.text.includes(value), value);
  assert.equal(D.deanonymize(r.text, r.state), text);
});
test('Model organization evidence beats a capitalization-only person guess', () => {
  for (const text of ['Capgemini Invent', 'Noventis Labs']) {
    const r = D.detect(text, {aiSpans:[{start:0,end:text.length,pfx:'ORG'}]});
    assert.equal(r.length, 1); assert.equal(r[0].pfx, 'ORG'); assert.equal(r[0].val, text);
  }
});
test('Incomplete or surname-conflicting model output must not erase names', () => {
  for (const [text, start, end] of [['Sonnenhof Pflegedienst e.V.', 0, 11], ['ich P. von der Yıldız', 15, 20]]) {
    assert.ok(D.detect(text, {aiSpans:[...(text.startsWith('ich') ? [{start:4,end:14,pfx:'NAME'}] : []), {start,end,pfx:'ORG'}]}).some(s=>s.val.includes(text.startsWith('ich') ? 'Yıldız' : 'Sonnenhof')));
  }
});
test('No model hit is not a veto: unfamiliar names still protected by explicit context', () => {
  for (const text of ['Frau Xanthe Quispe', 'Herr Quispe', 'Dr. Xanthe Quispe']) {
    assert.ok(D.anonymize(text, {aiSpans:[]}).text.indexOf('Quispe') === -1);
  }
});
test('NER aligns repeated words before filtering non-entity and low-confidence tokens', async () => {
  const text = 'Jordan met Jordan and Jordan.';
  const run = async () => [
    {word:'Jordan', entity:'O', score:.99,index:1},
    {word:'met', entity:'O',score:.99,index:2},
    {word:'Jordan', entity:'B-PER',score:.55,index:3},
    {word:'and', entity:'O',score:.99,index:4},
    {word:'Jordan', entity:'B-PER',score:.97,index:5},
  ];
  const spans = await N.collectSpans(text,run,()=>false);
  assert.equal(spans.length,1); assert.equal(spans[0].start,22); assert.equal(spans[0].score,.97);
});
test('NER does not join entities across missing tokens; retains minimum score', () => {
  const ents=N.aggregate([{word:'Anna',entity:'B-PER',score:.99,index:1},{word:'Weber',entity:'I-PER',score:.94,index:2},{word:'Müller',entity:'I-PER',score:.99,index:5}]);
  assert.equal(ents.length,2);assert.equal(ents[0].score,.94);
});

test('Uncertain subwords do not produce misleading partial organization spans', async () => {
  const out=await N.collectSpans('Noventis',async()=>[
    {word:'No',entity:'B-ORG',score:.99,index:1},
    {word:'##ven',entity:'I-ORG',score:.85,index:2},
    {word:'##tis',entity:'I-ORG',score:.99,index:3},
  ],()=>false);
  assert.equal(out.length,0);
});

test('Explicit identity context wins over ambiguous business words', () => {
  assert.ok(D.detect('Frau Senior').some(s=>s.val === 'Senior'));
  const text='Firma: Digital Engineering';
  assert.ok(D.detect(text, {aiSpans:[{start:7,end:text.length,pfx:'ORG'}]}).some(s=>s.val === 'Digital Engineering'));
});
