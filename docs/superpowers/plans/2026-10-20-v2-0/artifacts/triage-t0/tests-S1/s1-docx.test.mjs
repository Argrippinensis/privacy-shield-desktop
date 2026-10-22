import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const ROOT = process.env.PSROOT || '/tmp/triage/v2';
const require = createRequire(import.meta.url);
const JSZip = require(path.join('/tmp/triage/v2', 'app/vendor/jszip/jszip.min.js'));
const mammoth = require(path.join(ROOT, 'app/vendor/mammoth/mammoth.browser.min.js'));
const MB = 1048576;
async function makeDocx(realChars, fake) {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hallo</w:t></w:r></w:p><!--' + 'A'.repeat(realChars) + '--></w:body></w:document>', { compression: 'DEFLATE' });
  const buf = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  if (fake != null) {
    const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let e = buf.length - 22; while (v.getUint32(e, true) !== 0x06054b50) e--;
    let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true);
    for (let i = 0; i < n; i++) {
      const nl = v.getUint16(p + 28, true);
      if (Buffer.from(buf.subarray(p + 46, p + 46 + nl)).toString() === 'word/document.xml') v.setUint32(p + 24, fake, true);
      p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
  }
  return buf;
}
test('S1 docx/mammoth: 300 MiB tatsaechlich, deklariert 32 Byte', async () => {
  const buf = await makeDocx(300 * MB, 32);
  console.log('Archiv', buf.length, 'Byte');
  const before = process.resourceUsage().maxRSS * 1024; let peak = 0;
  const iv = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 20);
  const t0 = Date.now(); let r = null, err = null;
  try { r = await mammoth.extractRawText({ arrayBuffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }); } catch (e) { err = e.message; }
  clearInterval(iv);
  console.log('mammoth Ergebnis:', r && JSON.stringify(r.value), 'Fehler:', err, 'ms', Date.now() - t0, 'RSS-Zuwachs MB', Math.round((Math.max(peak, process.resourceUsage().maxRSS * 1024) - before) / MB));
  assert.ok(err, 'haette vor/waehrend dem Entpacken abbrechen muessen');
});
test('S1 docx/mammoth: EHRLICHES Archiv 300 MiB (ohne Faelschung)', async () => {
  const buf = await makeDocx(300 * MB, null);
  const before = process.resourceUsage().maxRSS * 1024; let peak = 0;
  const iv = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 20);
  const t0 = Date.now(); let r = null, err = null;
  try { r = await mammoth.extractRawText({ arrayBuffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }); } catch (e) { err = e.message; }
  clearInterval(iv);
  console.log('ehrlich: Ergebnis:', r && JSON.stringify(r.value), 'Fehler:', err, 'ms', Date.now() - t0, 'RSS-Zuwachs MB', Math.round((Math.max(peak, process.resourceUsage().maxRSS * 1024) - before) / MB));
  assert.ok(err);
});
