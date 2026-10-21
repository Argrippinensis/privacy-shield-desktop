// Verschluesselte Zuordnung (.psmap, PSLib.psmap): AES-256-GCM + PBKDF2-SHA-256 nur ueber Web Crypto.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.psmap = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const HEAD = 38, TAG = 16, MIN_IT = 100000, MAX_IT = 5000000, STD_IT = 600000, MIN_PW = 10;
  const MAGIC = [0x50, 0x53, 0x4d, 0x31];
  const MSG = {
    WEAK_PASSWORD: 'Das Passwort muss mindestens 10 Zeichen lang sein.',
    WRONG_PASSWORD: 'Passwort falsch oder Datei beschädigt.',
    CORRUPT: 'Die Datei ist beschädigt.',
    UNSUPPORTED_VERSION: 'Diese Zuordnung stammt aus einer neueren Programmversion.',
    NOT_PSMAP: 'Das ist keine PrivacyShield-Zuordnung.',
  };

  class PSMapError extends Error {
    constructor(code) { super(MSG[code]); this.name = 'PSMapError'; this.code = code; }
  }

  const subtle = () => globalThis.crypto.subtle;

  // Passwort pruefen und NFC-normalisiert als Bytes liefern
  function pwBytes(pw) {
    if (typeof pw !== 'string') throw new PSMapError('WEAK_PASSWORD');
    const n = pw.normalize('NFC');
    if ([...n].length < MIN_PW) throw new PSMapError('WEAK_PASSWORD');
    return new TextEncoder().encode(n);
  }

  async function key(pw, salt, iterations, use) {
    const base = await subtle().importKey('raw', pw, 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base,
      { name: 'AES-GCM', length: 256 }, false, [use]);
  }

  // Test-Hooks nur als eigene Eigenschaft, Uint8Array exakter Laenge; sonst Zufall
  function hook(o, name, len) {
    if (!Object.hasOwn(o, name)) return globalThis.crypto.getRandomValues(new Uint8Array(len));
    const v = o[name];
    if (!(v instanceof Uint8Array) || v.length !== len) throw new PSMapError('CORRUPT');
    return v;
  }

  async function encrypt(payload, password, opts) {
    const o = opts || {};
    const pw = pwBytes(password);
    const iterations = o.iterations === undefined ? STD_IT : o.iterations;
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_IT) throw new PSMapError('CORRUPT');
    const salt = hook(o, '_salt', 16);
    const iv = hook(o, '_iv', 12);
    let json;
    try { json = JSON.stringify(payload); } catch (e) { throw new PSMapError('CORRUPT'); }
    if (typeof json !== 'string') throw new PSMapError('CORRUPT');
    const head = new Uint8Array(HEAD);
    head.set(MAGIC, 0);
    head[4] = 1; head[5] = 1;
    new DataView(head.buffer).setUint32(6, iterations, false);
    head.set(salt, 10);
    head.set(iv, 26);
    const k = await key(pw, salt, iterations, 'encrypt');
    const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: head }, k,
      new TextEncoder().encode(json)));
    const out = new Uint8Array(HEAD + ct.length);
    out.set(head, 0);
    out.set(ct, HEAD);
    return out;
  }

  async function decrypt(input, password) {
    let b = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
    if (!(b instanceof Uint8Array) || b.length < 4 || MAGIC.some((m, i) => b[i] !== m)) throw new PSMapError('NOT_PSMAP');
    if (b.length < HEAD + TAG) throw new PSMapError('CORRUPT');
    if (b[4] !== 1 || b[5] !== 1) throw new PSMapError('UNSUPPORTED_VERSION');
    const iterations = new DataView(b.buffer, b.byteOffset, b.length).getUint32(6, false);
    if (iterations < MIN_IT || iterations > MAX_IT) throw new PSMapError('CORRUPT');
    const pw = pwBytes(password);
    const head = b.slice(0, HEAD);
    let plain;
    const k = await key(pw, head.slice(10, 26), iterations, 'decrypt');
    try {
      plain = await subtle().decrypt({ name: 'AES-GCM', iv: head.slice(26, 38), additionalData: head }, k, b.slice(HEAD));
    } catch (e) { throw new PSMapError('WRONG_PASSWORD'); }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plain)); }
    catch (e) { throw new PSMapError('CORRUPT'); }
  }

  return { encrypt, decrypt, PSMapError };
});
