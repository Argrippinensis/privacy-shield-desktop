import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),D=require('../../app/lib/detect.js'),S=require('../../app/lib/ai-services.js');
const text=fs.readFileSync(new URL('../fixtures/employment/synthetic-contract.txt',import.meta.url),'utf8');
const output=opts=>D.anonymize(text,opts);
for(const wordlists of [false,true]) test('Employment profile covers employer fragments, conditions and qualifications; wordlists='+wordlists,()=>{
  const r=output({profile:'employment',wordlists});
  for(const value of ['apoBank','Bank der Gesundheit','Deutsche Apotheker','Arztebank','Ärztebank','Hedwig-Oskar-Beispiel','Düsseldorf','apoBalance','Team II','Tarifgruppe C2','Berufsjahr 1','39 h','30 Urlaubstage','6 Monate','2 Jahre','Herrn','Bachelor of Arts','B.A.'])assert.ok(!r.text.includes(value),'unmasked '+value+' in '+r.text);
  for(const word of ['Befristung','Probezeit','Freistellung','Arbeitsverhältnis','Geschäftsgeheimnisse','§ 8','§ 23 GeschGehG'])assert.ok(r.text.includes(word),'readability: '+word);
  assert.ok(r.text.includes('{{KONDITION_'));assert.ok(r.text.includes('{{MERKMAL_'));assert.ok(r.text.includes('{{ADRESSE_'));
  assert.equal(D.deanonymize(r.text,r.state),text,'exact roundtrip including fragments/newlines');
});
test('Standard fixes identifying employer/address variants but leaves optional employment conditions selected by the user',()=>{
  const r=output({profile:'standard',wordlists:false});assert.ok(!/apoBank|apoBalance|Bank der Gesundheit|Hedwig-Oskar-Beispiel/.test(r.text));
  for(const value of ['Tarifgruppe C2','39 h','30 Urlaubstage','6 Monate','2 Jahre','Bachelor of Arts'])assert.ok(r.text.includes(value),value);
});
test('Isolated generic fragments are not treated as the known employer without a strong brand or full-name anchor',()=>{
  const t='Bank der Gesundheit. Deutsche Apotheker- und andere Berufe. Team II.';
  assert.ok(!D.detect(t,{ents:['org'],wordlists:false}).some(s=>s.meth.startsWith('Arbeitgeber-Variante')));
});
test('All-caps repeated employer headers and split legal names are masked independently of the NER model',()=>{
  const t='APOBANK\nBank der Gesundheit\nDeutsche Apotheker-\nund Ärztebank eG\nAPOBANK';
  const r=D.anonymize(t,{ents:['org'],wordlists:false});assert.ok(!/APOBANK|Apotheker|Ärztebank|Gesundheit/.test(r.text));assert.equal(D.deanonymize(r.text,r.state),t);
});
test('An NER model labelling generic contract language or laws as names/organizations cannot remove that language',()=>{
  const t='Befristung Probezeit Freistellung Arbeitsverhältnis Geschäftsgeheimnisse GeschGehG';
  const aiSpans=t.split(' ').map(w=>({start:t.indexOf(w),end:t.indexOf(w)+w.length,pfx:w==='GeschGehG'?'ORG':'NAME',col:'#000'}));
  assert.equal(D.anonymize(t,{aiSpans}).text,t);
});
test('Paragraphs are not money, including erroneous model labels; real euro and dollar values remain protected',()=>{
  const t='nach § 8 und § 23 GeschGehG. Zahlung: 8 EUR und $ 23.';
  const a=t.indexOf('§ 8'),b=t.indexOf('§ 23');
  const r=D.anonymize(t,{profile:'employment',aiSpans:[{start:a,end:a+3,pfx:'BETRAG',col:'#000'},{start:b,end:b+12,pfx:'ORG',col:'#000'}]});
  assert.ok(r.text.includes('§ 8'));assert.ok(r.text.includes('§ 23 GeschGehG'));assert.ok(!r.text.includes('8 EUR'));assert.ok(!r.text.includes('$ 23'));
});
for(const surname of ['Aydin','Befristung','Probezeit','Freistellung'])test('Masking the salutation never leaves the surname '+surname+' behind',()=>{
  const t='gegen Herrn '+surname+'.';const r=D.anonymize(t,{profile:'employment',wordlists:true});assert.ok(!r.text.includes(surname));assert.equal(D.deanonymize(r.text,r.state),t);
});
test('Date-line city remains protected even when NER provides an empty result',()=>{
  const t='Düsseldorf, 12.10.2042';const r=D.anonymize(t,{aiSpans:[],wordlists:false});assert.ok(!r.text.includes('Düsseldorf'));assert.ok(!r.text.includes('12.10.2042'));
});
test('Hyphenated street names with nonbreaking hyphens keep exact offsets and roundtrip',()=>{
  const t='Anschrift: Hedwig‑Oskar‑Beispiel‑Straße 42';const r=D.anonymize(t,{ents:['addr'],wordlists:false});assert.ok(!r.text.includes('Beispiel'));assert.equal(D.deanonymize(r.text,r.state),t);
});
test('Explicit manual marks still protect a generic contract word',()=>{
  const t='Probezeit';const r=D.anonymize(t,{extraSpans:[{start:0,end:t.length,pfx:'NAME',prio:0,meth:'Manuelle Markierung'}]});assert.notEqual(r.text,t);
});
test('Employer opt-out and exact whitelist remain effective',()=>{
  assert.equal(D.anonymize('apoBank',{ents:[],wordlists:false}).text,'apoBank');
  assert.equal(D.anonymize('apoBank',{ents:['org'],wordlists:false,whitelist:['apoBank']}).text,'apoBank');
});
test('Additional categories are in both public profiles and parser options',()=>{
  assert.equal(D.PROFILES[0].id,'standard');const p=D.PROFILES.find(p=>p.id==='employment');assert.ok(p.ents.includes('identity'));assert.ok(p.ents.includes('employment'));assert.ok(!p.ents.includes('paragraf'));
});
test('Eight fixed destinations have no prompt/text or arbitrary caller URL; Android uses matching app package and web fallback',()=>{
  assert.equal(S.services.length,8);for(const s of S.services){assert.equal(new URL(s.web).protocol,'https:');assert.equal(new URL(s.web).search,'');const a=S.appURL(s.id,'android');assert.ok(a.includes('package='+s.android+';'));assert.ok(a.includes(encodeURIComponent(s.web)));assert.ok(!/[\r\n]/.test(a));}
  for(const x of ['__proto__','https://evil.invalid','chatgpt?text=secret'])assert.equal(S.get(x),null);
  assert.equal(S.appURL('claude','ios'),'https://claude.ai/new');assert.equal(S.appURL('chatgpt','ios'),'https://chatgpt.com/open-app');
});
