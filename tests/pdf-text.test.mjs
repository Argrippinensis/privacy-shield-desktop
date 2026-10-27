// Regression PDFs came from an actual failing Mac print run; no generated stand-ins.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {pdfText,pdfPageCount} from './pdf-text.mjs';
const fixture=name=>fileURLToPath(new URL('./fixtures/pdf-portability/'+name,import.meta.url));
const expected=JSON.parse(fs.readFileSync(fixture('provenance.json'),'utf8'));
test('Actual Mac PDF retains complete words, exact DOM identity/hash and genuine word spaces',async()=>{
 const file=fixture('mac-proof.pdf'),text=await pdfText(file);
 assert.equal(await pdfPageCount(file),1);
 for(const value of ['arcangeli.eu','ReguSafe','Verarbeitungsnachweis','Profil Standard',expected.id,expected.resultSha256,'Menschliche Sichtprüfung: nicht bestätigt'])assert.ok(text.includes(value),value);
 assert.ok(!text.includes('synthetic@example.invalid'));
});
test('Actual multi-page Mac PDF retains document 24 and an inert custom label',async()=>{
 const file=fixture('mac-long.pdf'),text=await pdfText(file);
 assert.ok(await pdfPageCount(file)>1);
 for(const value of ['Dokument 1 ·','Dokument 24 ·','<img src=x onerror=alert(1)>','keine digitale Signatur'])assert.ok(text.includes(value),value);
 assert.ok(!text.includes('SECRET_ORIGINAL'));
});
