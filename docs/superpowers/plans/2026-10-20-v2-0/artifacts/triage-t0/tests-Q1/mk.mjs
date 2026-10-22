import fs from 'fs';
const { buildInputs } = await import('/tmp/triage/Q1/copy/tests/eval/dump-reference.mjs');
const ins = await buildInputs();
const want = ['n12','ga03','syn0'];
const o = {};
for (const k of want) o[k] = ins.find(i => i.key === k).text;
fs.writeFileSync('/tmp/triage/Q1/texts.json', JSON.stringify(o));
console.log(want.map(k => k + ':' + o[k].length));
