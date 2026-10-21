// P0 (a): PBKDF2-HMAC-SHA-256 und AES-GCM in Node (crypto.subtle).   node pbkdf2-node.mjs
import os from 'node:os';
const enc = new TextEncoder();
async function derive(iter) {
  const t0 = performance.now();
  const key = await crypto.subtle.importKey('raw', enc.encode('ein-langes-Passwort-123'), 'PBKDF2', false, ['deriveKey']);
  const aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: crypto.getRandomValues(new Uint8Array(16)), iterations: iter }, key, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  return performance.now() - t0;
}
await derive(1000); // Aufwaermen
const res = {};
for (const iter of [1000, 100000, 600000, 5000000, 100000000]) {
  if (iter === 100000000) { res[iter] = 'uebersprungen (nur Zeit der Hochrechnung)'; continue; }
  const ts = []; const n = iter >= 5000000 ? 1 : 5;
  for (let i = 0; i < n; i++) ts.push(Math.round(await derive(iter)));
  res[iter] = ts;
}
console.log(JSON.stringify(res));
console.log('node', process.version, 'cpus', os.cpus().length, os.cpus()[0].model);
// AES-GCM 5 MB Nutzlast
const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
const iv = crypto.getRandomValues(new Uint8Array(12));
const big = new Uint8Array(5 * 1024 * 1024).fill(97);
let t0 = performance.now();
const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new Uint8Array(38) }, key, big);
const t1 = performance.now();
await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: new Uint8Array(38) }, key, ct);
console.log('AES-GCM 5MB encrypt ms', Math.round(t1 - t0), 'decrypt ms', Math.round(performance.now() - t1));
// JSON.stringify/parse einer 5 MB Nutzlast (Zuordnung mit vielen Eintraegen)
const payload = { v: 1, created: new Date().toISOString(), state: { store: {}, cnt: {} }, docs: [] };
for (let i = 0; i < 40000; i++) payload.state.store['{{NAME_' + i + '}}'] = { v: 'Wert ' + i + ' ' + 'x'.repeat(100), t: 'NAME', c: '#f59e0b', m: 'KI' };
t0 = performance.now(); const js = JSON.stringify(payload); const t2 = performance.now(); JSON.parse(js);
console.log('payload bytes', js.length, 'stringify ms', Math.round(t2 - t0), 'parse ms', Math.round(performance.now() - t2));
