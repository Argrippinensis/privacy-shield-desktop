// Tests fuer app/lib/psmap.js (A3.m): verschluesselte Zuordnung (.psmap), nur Web Crypto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const PW = 'korrektes Pferd Batterie';
const IT = 100000;
const payload = () => ({
  v: 1,
  created: '2026-10-21T00:00:00Z',
  state: { store: { '{{NAME_1}}': { v: 'Müller', t: 'NAME', c: '#f59e0b', m: 'KI' } }, cnt: { NAME: 1 } },
  docs: [],
});
const lib = () => loadLib('psmap');
const enc = (p = payload(), pw = PW, opts = { iterations: IT }) => lib().encrypt(p, pw, opts);

async function code(promise) {
  try { await promise; } catch (e) { return e; }
  return null;
}
async function assertCode(promise, expected) {
  const e = await code(promise);
  assert.ok(e, 'Fehler erwartet: ' + expected);
  assert.equal(e.code, expected);
  assert.ok(e instanceof lib().PSMapError, 'Fehler ist PSMapError');
}
const patchIter = (bytes, n) => {
  const c = new Uint8Array(bytes);
  new DataView(c.buffer).setUint32(6, n, false);
  return c;
};

test('Rundlauf: Nutzlast mit Umlauten und Sonderzeichen wird exakt wiederhergestellt', async () => {
  const p = payload();
  p.state.store['{{NAME_2}}'] = { v: 'Straße ñ ç Ä Ö Ü ß', t: 'NAME', c: '#000', m: 'Regel' };
  const bytes = await enc(p);
  assert.ok(bytes instanceof Uint8Array);
  assert.deepEqual(await lib().decrypt(bytes, PW), p);
});

test('Rundlauf: ein Eintrag mit 5 MB Text bleibt unverfaelscht', async () => {
  const p = payload();
  p.state.store['{{GROSS_1}}'] = { v: 'äß'.repeat(2.5 * 1024 * 1024 / 2 | 0) + 'x'.repeat(1024 * 1024), t: 'X', c: '#fff', m: 'KI' };
  const back = await lib().decrypt(await enc(p), PW);
  assert.equal(back.state.store['{{GROSS_1}}'].v, p.state.store['{{GROSS_1}}'].v);
});

test('Zwei Verschluesselungen derselben Nutzlast ergeben verschiedene Bytes, Salz und Nonce', async () => {
  const a = await enc();
  const b = await enc();
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(a.slice(10, 26), b.slice(10, 26), 'Salz');
  assert.notDeepEqual(a.slice(26, 38), b.slice(26, 38), 'Nonce');
});

test('Header: Magic PSM1, Version 1, KDF 1, Iterationen als uint32 Big-Endian', async () => {
  const a = await enc(payload(), PW, { iterations: 123456 });
  assert.deepEqual([...a.slice(0, 4)], [0x50, 0x53, 0x4d, 0x31]);
  assert.equal(a[4], 1);
  assert.equal(a[5], 1);
  assert.equal(new DataView(a.buffer, a.byteOffset).getUint32(6, false), 123456);
  assert.ok(a.length >= 38 + 16);
});

test('Standard-Iterationen: ohne opts steht 600000 im Header, Dauer unter 3 s', async () => {
  const t0 = Date.now();
  const a = await lib().encrypt(payload(), PW);
  assert.equal(new DataView(a.buffer, a.byteOffset).getUint32(6, false), 600000);
  assert.ok(Date.now() - t0 < 3000, 'Ableitung zu langsam');
  assert.deepEqual(await lib().decrypt(a, PW), payload());
});

test('Falsches Passwort: WRONG_PASSWORD', async () => {
  const a = await enc();
  await assertCode(lib().decrypt(a, 'ganz anderes Passwort'), 'WRONG_PASSWORD');
});

test('Ein veraendertes Byte im Chiffretext: WRONG_PASSWORD', async () => {
  const a = await enc();
  const c = new Uint8Array(a);
  c[40] ^= 0x01;
  await assertCode(lib().decrypt(c, PW), 'WRONG_PASSWORD');
});

test('Verändertes Iterationsbyte (100000 auf 100001): WRONG_PASSWORD', async () => {
  const a = await enc();
  await assertCode(lib().decrypt(patchIter(a, 100001), PW), 'WRONG_PASSWORD');
});

test('Auf 20 Bytes gekuerzte Datei: CORRUPT', async () => {
  const a = await enc();
  await assertCode(lib().decrypt(a.slice(0, 20), PW), 'CORRUPT');
});

test('Um 1 Byte gekuerzte Datei: WRONG_PASSWORD', async () => {
  const a = await enc();
  await assertCode(lib().decrypt(a.slice(0, a.length - 1), PW), 'WRONG_PASSWORD');
});

test('CSV-Text als Eingabe: NOT_PSMAP (als Zeichenkette und als Bytes)', async () => {
  const csv = 'Variable,Originalwert,Typ,Methode\n{{NAME_1}},Müller,NAME,KI\n';
  await assertCode(lib().decrypt(csv, PW), 'NOT_PSMAP');
  await assertCode(lib().decrypt(new TextEncoder().encode(csv), PW), 'NOT_PSMAP');
});

test('Leeres Array als Eingabe: NOT_PSMAP', async () => {
  await assertCode(lib().decrypt(new Uint8Array(0), PW), 'NOT_PSMAP');
  await assertCode(lib().decrypt([], PW), 'NOT_PSMAP');
});

test('Versionsbyte 2 mit gueltigem Magic: UNSUPPORTED_VERSION', async () => {
  const c = new Uint8Array(await enc());
  c[4] = 2;
  await assertCode(lib().decrypt(c, PW), 'UNSUPPORTED_VERSION');
});

test('KDF-Byte 2: UNSUPPORTED_VERSION', async () => {
  const c = new Uint8Array(await enc());
  c[5] = 2;
  await assertCode(lib().decrypt(c, PW), 'UNSUPPORTED_VERSION');
});

test('Passwort mit 9 Zeichen: WEAK_PASSWORD beim Verschluesseln', async () => {
  await assertCode(enc(payload(), '123456789'), 'WEAK_PASSWORD');
});

test('Zerlegte Schreibweise (10 Codepunkte, nach NFC nur 9): WEAK_PASSWORD', async () => {
  await assertCode(enc(payload(), 'MünchenXY'), 'WEAK_PASSWORD');
});

test('Leeres Passwort, null und Zahl: WEAK_PASSWORD', async () => {
  for (const pw of ['', null, 1234567890]) await assertCode(enc(payload(), pw), 'WEAK_PASSWORD');
});

test('Zu schwaches Passwort wird auch beim Entschluesseln abgelehnt', async () => {
  const a = await enc();
  await assertCode(lib().decrypt(a, 'kurz'), 'WEAK_PASSWORD');
});

test('Passwort mit genau 10 Zeichen und 10 Emoji-Codepunkten ist gueltig', async () => {
  for (const pw of ['abcdefghij', '\u{1F600}'.repeat(10)]) {
    assert.deepEqual(await lib().decrypt(await enc(payload(), pw), pw), payload());
  }
});

test('Zusammengesetztes und zerlegtes u-Umlaut im Passwort entschluesseln dieselbe Datei', async () => {
  const a = await enc(payload(), 'MünchenXYZ');
  assert.deepEqual(await lib().decrypt(a, 'MünchenXYZ'), payload());
  const b = await enc(payload(), 'MünchenXYZ');
  assert.deepEqual(await lib().decrypt(b, 'MünchenXYZ'), payload());
});

test('Testvektor: Ausgabe stimmt byteweise mit unabhaengig berechneter Referenz ueberein', async () => {
  const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
  const iv = Uint8Array.from({ length: 12 }, (_, i) => 0xa0 + i);
  const iterations = 1000;
  const obj = { v: 1, x: 'ä' };
  const out = await lib().encrypt(obj, PW, { iterations, _salt: salt, _iv: iv });

  const header = new Uint8Array(38);
  header.set([0x50, 0x53, 0x4d, 0x31, 1, 1], 0);
  new DataView(header.buffer).setUint32(6, iterations, false);
  header.set(salt, 10);
  header.set(iv, 26);
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey('raw', new TextEncoder().encode(PW.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: header }, key, new TextEncoder().encode(JSON.stringify(obj))));
  const expected = new Uint8Array(38 + ct.length);
  expected.set(header, 0);
  expected.set(ct, 38);
  assert.deepEqual(Buffer.from(out), Buffer.from(expected));
});

test('Iterationen 10 oder 100000000 im Header: CORRUPT in unter 500 ms', async () => {
  const a = await enc();
  for (const n of [10, 100000000]) {
    const t0 = Date.now();
    await assertCode(lib().decrypt(patchIter(a, n), PW), 'CORRUPT');
    assert.ok(Date.now() - t0 < 500, 'Pruefung vor der Ableitung noetig (' + n + ')');
  }
});

test('Fehlermeldung enthaelt weder Passwort noch Teile der Nutzlast', async () => {
  const pw = 'geheim-geheim-123';
  const p = payload();
  const a = await enc(p, pw);
  const e = await code(lib().decrypt(a, 'falsch-falsch-4567'));
  assert.ok(e);
  const text = e.message + ' ' + String(e);
  for (const s of [pw, 'falsch-falsch-4567', 'Müller', 'NAME_1', 'Pferd']) assert.ok(!text.includes(s), s);
  const e2 = await code(enc(p, 'zu kurz'));
  assert.ok(e2);
  assert.ok(!(e2.message + String(e2)).includes('zu kurz'));
});
