// Pruefung: laesst sich die TATSAECHLICH entpackte Menge in JSZip begrenzen?
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const JSZip = require('/tmp/triage/v2/app/vendor/jszip/jszip.min.js');
const MB = 1048576;
test('internalStream mit Zaehler bricht bei 8 MiB ab (Archiv entpackt 300 MiB)', async () => {
  const z = new JSZip();
  z.file('a.xml', 'A'.repeat(300 * MB), { compression: 'DEFLATE' });
  const buf = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const v = new DataView(buf.buffer); let e = buf.length - 22; while (v.getUint32(e, true) !== 0x06054b50) e--;
  v.setUint32(v.getUint32(e + 16, true) + 24, 32, true); // gefaelschte Kopfgroesse
  const zip = await JSZip.loadAsync(buf);
  const LIMIT = 8 * MB; let seen = 0; const t0 = Date.now();
  const r = await new Promise((res) => {
    const h = zip.file('a.xml').internalStream('uint8array');
    h.on('data', (chunk) => { seen += chunk.length; if (seen > LIMIT) { h.pause(); res('abgebrochen'); } })
     .on('error', (er) => res('Fehler ' + er.message))
     .on('end', () => res('Ende'))
     .resume();
  });
  console.log('Ergebnis:', r, 'gelesene Byte:', seen, 'ms', Date.now() - t0);
  assert.equal(r, 'abgebrochen');
  assert.ok(seen < 40 * MB, 'Abbruch muss frueh greifen, gelesen ' + seen);
});
