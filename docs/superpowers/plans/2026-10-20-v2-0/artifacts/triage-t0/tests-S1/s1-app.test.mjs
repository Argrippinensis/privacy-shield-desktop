// S1 App-Test: gefaelschtes Archiv durch die echte Oberflaeche (Renderer). APP=/tmp/triage/v2|v18
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const APP = process.env.APP || '/tmp/triage/v2';
const { launchApp, toolFrame } = await import(APP + '/tests/helpers.mjs');
const require = createRequire(import.meta.url);
const JSZip = require('/tmp/triage/v2/app/vendor/jszip/jszip.min.js');
const MB = 1048576;
async function makeZip(kind, chars, fake) {
  const z = new JSZip();
  if (kind === 'xlsx') z.file('xl/sharedStrings.xml', '<sst>' + 'A'.repeat(chars) + '</sst>', { compression: 'DEFLATE' });
  else {
    z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    z.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hallo</w:t></w:r></w:p><!--' + 'A'.repeat(chars) + '--></w:body></w:document>', { compression: 'DEFLATE' });
  }
  const buf = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  if (fake != null) {
    const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let e = buf.length - 22; while (v.getUint32(e, true) !== 0x06054b50) e--;
    let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true);
    for (let i = 0; i < n; i++) {
      const nl = v.getUint16(p + 28, true);
      const nm = Buffer.from(buf.subarray(p + 46, p + 46 + nl)).toString();
      if (nm === 'xl/sharedStrings.xml' || nm === 'word/document.xml') v.setUint32(p + 24, fake, true);
      p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
  }
  return Buffer.from(buf).toString('base64');
}
for (const kind of (process.env.KINDS || 'xlsx,docx').split(',')) {
  test(`S1 App ${kind}: 300 MiB tatsaechlich, deklariert 32 Byte (${APP})`, async () => {
    const b64 = await makeZip(kind, 300 * MB, 32);
    const a = await launchApp({ offline: true });
    try {
      const f = await toolFrame(a.win);
      const r = await f.evaluate(async ({ b64, kind }) => {
        const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        const file = new File([u], 'synthetisch.' + kind);
        let maxGap = 0, last = performance.now();
        const iv = setInterval(() => { const n = performance.now(); maxGap = Math.max(maxGap, n - last); last = n; }, 50);
        const t0 = performance.now(); let out = null, err = null;
        try { out = typeof readTextOf === 'function' ? await readTextOf(file) : await exDOCX(file); } catch (e) { err = e.message; }
        const dt = performance.now() - t0; clearInterval(iv);
        return { fnName: typeof readTextOf === 'function' ? 'readTextOf' : 'exDOCX', out: out === null ? null : String(out).length, err, ms: Math.round(dt), maxGapMs: Math.round(maxGap), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / MB_) : null };
        function MB_() {}
      }, { b64, kind });
      console.log(JSON.stringify(r));
      assert.ok(r.err && /zu gro|verdächtig|zu viele/i.test(r.err), 'Archiv haette VOR dem Entpacken mit Groessenfehler abgelehnt werden muessen; war: ' + r.err + ' nach ' + r.ms + ' ms');
    } finally { await a.close(); }
  });
}
