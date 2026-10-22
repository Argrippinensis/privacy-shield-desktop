// S1: gefaelschte ZIP-Groessen. Arg: Wurzel via Umgebungsvariable PSROOT (Standard v2)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const ROOT = process.env.PSROOT || '/tmp/triage/v2';
const require = createRequire(import.meta.url);
const JSZip = require(path.join(ROOT, 'app/vendor/jszip/jszip.min.js'));
const F = require(path.join(ROOT, 'app/lib/formats.js'));
const O = require(path.join(ROOT, 'app/lib/officefmt.js'));
const MB = 1048576;

async function makeZip(realBytes, fakeSize) {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<Types/>');
  z.file('xl/sharedStrings.xml', '<sst>' + 'A'.repeat(realBytes) + '</sst>', { compression: 'DEFLATE' });
  const buf = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let e = buf.length - 22; while (v.getUint32(e, true) !== 0x06054b50) e--;
  let p = v.getUint32(e + 16, true); const n = v.getUint16(e + 10, true);
  for (let i = 0; i < n; i++) {
    const nameLen = v.getUint16(p + 28, true);
    const name = Buffer.from(buf.subarray(p + 46, p + 46 + nameLen)).toString();
    if (name === 'xl/sharedStrings.xml' && fakeSize != null) v.setUint32(p + 24, fakeSize, true);
    p += 46 + nameLen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return buf;
}

test('S1 Kontrolle: ehrliche Groesse 300 MB wird von guard abgelehnt', async () => {
  // Kopfgroesse echt gross: wir faelschen nach oben, um den Schutz an sich zu belegen
  const buf = await makeZip(4 * MB, 300 * MB);
  const zip = await JSZip.loadAsync(buf);
  assert.throws(() => F.guard(zip), (e) => e.code === 'TOO_BIG');
});

test('S1 ROT: 4-MiB-Eintrag mit deklarierter Groesse 32 Byte muss abgelehnt werden', async () => {
  const buf = await makeZip(4 * MB, 32);
  console.log('Archivgroesse (Byte):', buf.length);
  const zip = await JSZip.loadAsync(buf);
  let gerejected = null;
  try { F.guard(zip); } catch (e) { gerejected = e.code; }
  console.log('guard-Ergebnis:', gerejected || 'akzeptiert');
  // was passiert beim Lesen
  let len = null, err = null;
  const t0 = Date.now();
  try { len = (await zip.file('xl/sharedStrings.xml').async('string')).length; } catch (e) { err = e.message; }
  console.log('async(string): Laenge', len, 'Fehler', err, 'ms', Date.now() - t0);
  // xlsx-Pfad
  let x = null; try { x = await O.extractXlsx(zip); } catch (e) { x = 'Fehler ' + e.message; }
  console.log('extractXlsx:', typeof x === 'string' ? x : 'ok, Textlaenge ' + (x.text||'').length);
  assert.ok(gerejected, 'guard haette das gefaelschte Archiv ablehnen muessen');
});

test('S1 ROT: gefaelscht klein bei 300 MB tatsaechlich, Speicher/Zeit', async () => {
  const before = process.memoryUsage().rss;
  const buf = await makeZip(300 * MB, 32);
  console.log('Archiv', buf.length, 'Byte (tatsaechlich 300 MiB entpackt)');
  const zip = await JSZip.loadAsync(buf);
  let ok = true; try { F.guard(zip); } catch (e) { ok = false; console.log('guard lehnt ab:', e.code); }
  console.log('guard akzeptiert:', ok);
  let peak = 0; const iv = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 20);
  const t0 = Date.now(); let len = null, err = null;
  if (ok) { try { len = (await zip.file('xl/sharedStrings.xml').async('string')).length; } catch (e) { err = e.message; } }
  clearInterval(iv);
  console.log('Entpackt (Zeichen):', len, 'Fehler:', err, 'ms', Date.now() - t0, 'RSS-Zuwachs MB', Math.round((peak - before) / MB));
  assert.ok(!ok, 'Archiv mit 300 MiB tatsaechlicher Menge haette abgelehnt werden muessen');
});
