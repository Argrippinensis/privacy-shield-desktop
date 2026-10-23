// Formate (B2.m1): Erkennung, ZIP-Pruefung, Textauszug aus Text, HTML, EML und RTF.
// Reines Modul, kein DOM, kein Speicherzugriff. Keine Entitaetserweiterung, keine Ausfuehrung.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.formats = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class PSFormatError extends Error {
    constructor(code, message) {
      super(message || code);
      this.name = 'PSFormatError';
      this.code = code;
    }
  }

  const MAX_ENTRIES = 2000;
  const MAX_TOTAL = 209715200;
  const MAX_ENTRY = 52428800; // je Eintrag beim Lesen (Tokenliste waechst mit der Menge)
  const RATIO_FROM = 1048576;
  const RATIO_MAX = 100;

  // ---- detect ---------------------------------------------------------------------------

  const ZIP_EXT = ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'];
  const OLE_EXT = ['doc', 'xls', 'ppt'];
  const TEXT_EXT = ['eml', 'html', 'htm', 'txt', 'csv', 'md', 'json'];
  const OLE_SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

  function startsWith(b, sig) {
    if (!b || b.length < sig.length) return false;
    for (let i = 0; i < sig.length; i++) if (b[i] !== sig[i]) return false;
    return true;
  }

  function detect(filename, firstBytes) {
    const name = String(filename == null ? '' : filename);
    const dot = name.lastIndexOf('.');
    if (dot < 0) return 'unknown';
    const ext = name.slice(dot + 1).toLowerCase();
    const b = firstBytes || new Uint8Array(0);
    if (ZIP_EXT.includes(ext)) {
      return startsWith(b, [0x50, 0x4b, 0x03, 0x04]) || startsWith(b, [0x50, 0x4b, 0x05, 0x06]) ? ext : 'unknown';
    }
    if (ext === 'pdf') return startsWith(b, [0x25, 0x50, 0x44, 0x46]) ? 'pdf' : 'unknown';
    if (ext === 'rtf') return startsWith(b, [0x7b, 0x5c, 0x72, 0x74, 0x66]) ? 'rtf' : 'unknown';
    if (OLE_EXT.includes(ext)) return startsWith(b, OLE_SIG) ? ext : 'unknown';
    if (TEXT_EXT.includes(ext)) {
      const n = Math.min(b.length, 512);
      for (let i = 0; i < n; i++) if (b[i] === 0) return 'unknown';
      return ext === 'htm' ? 'html' : ext;
    }
    return 'unknown';
  }

  // ---- guard ----------------------------------------------------------------------------

  // Prueft nur die Kopfgroessen, ohne zu entpacken (JSZip: _data.uncompressedSize/compressedSize)
  function guard(zip) {
    const files = (zip && zip.files) || {};
    const names = Object.keys(files);
    if (names.length > MAX_ENTRIES) throw new PSFormatError('TOO_MANY');
    const sizes = [];
    let total = 0;
    for (const n of names) {
      const f = files[n];
      if (f && f.dir) continue;
      const d = f && f._data;
      if (!d || typeof d.uncompressedSize !== 'number' || typeof d.compressedSize !== 'number' ||
          !(d.uncompressedSize >= 0) || !(d.compressedSize >= 0)) throw new PSFormatError('CORRUPT');
      sizes.push(d);
      total += d.uncompressedSize;
    }
    if (total > MAX_TOTAL) throw new PSFormatError('TOO_BIG');
    for (const d of sizes) {
      if (d.uncompressedSize > RATIO_FROM &&
          (d.compressedSize === 0 || d.uncompressedSize / d.compressedSize > RATIO_MAX)) throw new PSFormatError('RATIO');
    }
  }

  // ---- boundedRead ----------------------------------------------------------------------

  // Liest einen ZIP-Eintrag und zaehlt die tatsaechlich entpackten Bytes beim Entpacken (der Kopf kann luegen).
  // opts: { max (je Eintrag, Standard MAX_ENTRY 50 MiB), budget ({ used, max }, geteilt ueber mehrere Eintraege), as: 'string'|'uint8array'|'count' (nur zaehlen, nichts behalten) }
  // Ueberschreitung -> PSFormatError TOO_BIG (Entpacken wird angehalten); fehlender Eintrag -> null; sonstige Fehler -> CORRUPT
  function boundedRead(zip, name, opts) {
    const o = opts || {};
    const f = zip && typeof zip.file === 'function' ? zip.file(name) : null;
    if (!f) return Promise.resolve(null);
    const max = typeof o.max === 'number' ? o.max : MAX_ENTRY;
    const budget = o.budget || null;
    return new Promise(function (resolve, reject) {
      const chunks = [];
      let n = 0;
      let done = false;
      let h;
      function fail(err) {
        if (done) return;
        done = true;
        try { if (h) h.pause(); } catch (e) { /* Strom schon zu Ende */ }
        reject(err);
      }
      try {
        h = f.internalStream('uint8array');
      } catch (e) { fail(new PSFormatError('CORRUPT', String(e && e.message || e))); return; }
      h.on('data', function (c) {
        if (done) return;
        n += c.length;
        if (budget) budget.used += c.length;
        if (n > max || (budget && budget.used > budget.max)) { fail(new PSFormatError('TOO_BIG')); return; }
        if (o.as !== 'count') chunks.push(c);
      });
      h.on('error', function (e) { fail(new PSFormatError('CORRUPT', String(e && e.message || e))); });
      h.on('end', function () {
        if (done) return;
        done = true;
        if (o.as === 'count') { resolve(n); return; }
        let all;
        if (chunks.length === 1) all = chunks[0];
        else {
          all = new Uint8Array(n);
          let p = 0;
          for (const c of chunks) { all.set(c, p); p += c.length; }
        }
        if (o.as === 'uint8array') resolve(all);
        else {
          try { resolve(new TextDecoder('utf-8', { ignoreBOM: true }).decode(all)); }
          catch (e) { reject(new PSFormatError('CORRUPT', String(e && e.message || e))); }
        }
      });
      h.resume();
    });
  }

  // ---- decodeText -----------------------------------------------------------------------

  function utf16(bytes, start, le) {
    let s = '';
    const parts = [];
    for (let i = start; i + 1 < bytes.length; i += 2) {
      s += String.fromCharCode(le ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1]);
      if (s.length > 8192) { parts.push(s); s = ''; }
    }
    parts.push(s);
    return parts.join('');
  }

  function decodeText(bytes) {
    const b = bytes || new Uint8Array(0);
    if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
      return { text: new TextDecoder('utf-8').decode(b.subarray(3)), encoding: 'utf-8' };
    }
    if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return { text: utf16(b, 2, true), encoding: 'utf-16le' };
    if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return { text: utf16(b, 2, false), encoding: 'utf-16be' };
    try {
      return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), encoding: 'utf-8' };
    } catch (e) {
      return { text: new TextDecoder('windows-1252').decode(b), encoding: 'windows-1252' };
    }
  }

  // ---- extractHtml ----------------------------------------------------------------------

  const NAMED = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', euro: '€',
    copy: '\u00a9', ndash: '–', mdash: '—', hellip: '…', bdquo: '„', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»'
  };

  function validCp(cp) {
    return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff);
  }

  // Nur bekannte Entitaeten; alles andere bleibt unveraendert stehen
  function decodeEntities(s) {
    return s.replace(/&(#[xX][0-9a-fA-F]{1,8}|#[0-9]{1,8}|[A-Za-z]{2,8});/g, function (m, e) {
      if (e[0] === '#') {
        const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return validCp(cp) ? String.fromCodePoint(cp) : m;
      }
      return Object.prototype.hasOwnProperty.call(NAMED, e) ? NAMED[e] : m;
    });
  }

  const BLOCK = new Set(['p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table',
    'section', 'article', 'header', 'footer', 'blockquote', 'pre']);
  const SKIP_TAGS = new Set(['script', 'style', 'noscript']);

  // Index hinter dem Ende des Tags ab i (Anfuehrungszeichen beachtet), -1 wenn offen
  function tagEnd(h, i) {
    let q = '';
    for (let k = i; k < h.length; k++) {
      const c = h[k];
      if (q) { if (c === q) q = ''; } else if (c === '"' || c === "'") q = c;
      else if (c === '>') return k + 1;
    }
    return -1;
  }

  function extractHtmlRaw(html) {
    const h = String(html == null ? '' : html);
    let out = '';
    let pending = false;
    let i = 0;
    const n = h.length;
    function text(t) {
      t = t.replace(/\s+/g, ' ');
      if (!t) return;
      if (t === ' ' && (pending || !out || /[\s]$/.test(out))) return;
      t = decodeEntities(t);
      if (pending) {
        if (out && out[out.length - 1] !== '\n') out += '\n';
        pending = false;
      }
      out += t;
    }
    while (i < n) {
      const lt = h.indexOf('<', i);
      if (lt < 0) { text(h.slice(i)); break; }
      if (lt > i) text(h.slice(i, lt));
      const c = h[lt + 1];
      if (h.startsWith('<!--', lt)) {
        const e = h.indexOf('-->', lt + 4);
        i = e < 0 ? n : e + 3;
      } else if (c === '!' || c === '?') {
        // DOCTYPE samt inneren Deklarationen (eckige Klammern) und ENTITY ueberspringen
        let depth = 0;
        let k = lt + 2;
        for (; k < n; k++) {
          const ch = h[k];
          if (ch === '[') depth++;
          else if (ch === ']') { if (depth > 0) depth--; }
          else if (ch === '>' && depth === 0) break;
        }
        i = k < n ? k + 1 : n;
      } else if (c === '/' || (c !== undefined && /[A-Za-z]/.test(c))) {
        const m = /^<(\/?)([A-Za-z][A-Za-z0-9]*)/.exec(h.slice(lt, lt + 40));
        if (!m) {
          // "</" ohne Namen: bis zum Ende des Tags verwerfen
          const e = tagEnd(h, lt + 1);
          i = e < 0 ? n : e;
          continue;
        }
        const closing = m[1] === '/';
        const name = m[2].toLowerCase();
        const end = tagEnd(h, lt + m[0].length);
        if (end < 0) { i = n; break; }
        i = end;
        if (!closing && SKIP_TAGS.has(name)) {
          const re = new RegExp('</' + name + '[^>]*>', 'ig');
          re.lastIndex = i;
          const x = re.exec(h);
          i = x ? re.lastIndex : n;
        } else if (name === 'br') {
          out += '\n';
          pending = false;
        } else if (BLOCK.has(name)) {
          pending = true;
        } else if (closing && (name === 'td' || name === 'th')) {
          out += '\t';
        }
      } else {
        text('<');
        i = lt + 1;
      }
    }
    return out
      .split('\n')
      .map(function (l) { return l.replace(/ {2,}/g, ' ').replace(/^ +/, '').replace(/[ \t]+$/, ''); })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ---- Hilfen fuer EML ------------------------------------------------------------------

  function bytesToBin(b) {
    const parts = [];
    for (let i = 0; i < b.length; i += 8192) parts.push(String.fromCharCode.apply(null, b.subarray(i, i + 8192)));
    return parts.join('');
  }

  function binToBytes(s) {
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255;
    return b;
  }

  function decodeCharset(bytes, cs) {
    const c = String(cs || '').toLowerCase().trim();
    if (c === 'iso-8859-1' || c === 'latin1' || c === 'windows-1252' || c === 'cp1252' || c === 'us-ascii') {
      return new TextDecoder('windows-1252').decode(bytes);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  // Tolerante Base64-Dekodierung (ungueltige Zeichen werden uebersprungen)
  function b64decode(s) {
    const out = [];
    let acc = 0;
    let bits = 0;
    for (let i = 0; i < s.length; i++) {
      const v = B64.indexOf(s[i]);
      if (v < 0) continue;
      acc = (acc << 6) | v;
      bits += 6;
      if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); acc &= (1 << bits) - 1; }
    }
    return Uint8Array.from(out);
  }

  // Quoted-printable auf Binaerzeichenkette -> Bytes
  function qpDecode(s, header) {
    if (header) s = s.replace(/_/g, ' ');
    else s = s.replace(/=[ \t]*\r?\n/g, '');
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
        out.push(parseInt(s.slice(i + 1, i + 3), 16));
        i += 2;
      } else out.push(s.charCodeAt(i) & 255);
    }
    return Uint8Array.from(out);
  }

  function decodeHeaderValue(bin) {
    let v = decodeText(binToBytes(bin)).text;
    v = v.replace(/(\?=)\s+(?==\?)/g, '$1');
    return v.replace(/=\?([^?\s]+)\?([bBqQ])\?([^?\s]*)\?=/g, function (m, cs, enc, data) {
      try {
        const bytes = enc.toLowerCase() === 'b' ? b64decode(data) : qpDecode(data, true);
        return decodeCharset(bytes, cs.replace(/\*.*$/, ''));
      } catch (e) { return m; }
    });
  }

  function splitMessage(bin) {
    const m = /\r?\n\r?\n/.exec(bin);
    let head, body;
    if (/^\r?\n/.test(bin)) { head = ''; body = bin.replace(/^\r?\n/, ''); }
    else if (m) { head = bin.slice(0, m.index); body = bin.slice(m.index + m[0].length); }
    else { head = bin; body = ''; }
    const headers = {};
    head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(function (line) {
      const c = line.indexOf(':');
      if (c <= 0) return;
      const k = line.slice(0, c).trim().toLowerCase();
      if (!(k in headers)) headers[k] = line.slice(c + 1).trim();
    });
    return { headers: headers, body: body };
  }

  function param(v, name) {
    const m = new RegExp(name + '\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))', 'i').exec(v || '');
    return m ? (m[1] !== undefined ? m[1] : m[2]) : null;
  }

  const MAX_DEPTH = 5;

  // Liefert { text, html } fuer Teile; zaehlt Anhaenge in ctx, liest sie nicht
  function readPart(part, depth, ctx) {
    const h = part.headers;
    const ct = (h['content-type'] || 'text/plain').toLowerCase();
    const type = ct.split(';')[0].trim();
    const disp = h['content-disposition'] || '';
    if (/^\s*attachment/i.test(disp) || /filename\*?\s*=/i.test(disp) || /filename\*?\s*=/i.test(ct)) {
      ctx.count++;
      return null;
    }
    if (type.indexOf('multipart/') === 0) {
      if (depth >= MAX_DEPTH) return null;
      const bd = param(h['content-type'], 'boundary');
      if (!bd) return null;
      const delim = '--' + bd;
      const kids = [];
      let cur = null;
      for (const line of part.body.split(/\r?\n/)) {
        if (line.slice(0, delim.length) === delim) {
          if (cur) kids.push(cur.join('\n'));
          if (line.slice(delim.length, delim.length + 2) === '--') { cur = null; break; }
          cur = [];
        } else if (cur) cur.push(line);
      }
      if (cur) kids.push(cur.join('\n'));
      const res = [];
      for (const k of kids) {
        const r = readPart(splitMessage(k), depth + 1, ctx);
        if (r && r.text) res.push(r);
      }
      if (type === 'multipart/alternative') {
        const plain = res.filter(function (r) { return !r.html; });
        const pick = plain.length ? plain[0] : res[0];
        return pick || null;
      }
      return { text: res.map(function (r) { return r.text; }).join('\n\n'), html: false };
    }
    if (type.indexOf('text/') !== 0) return null;
    const cte = (h['content-transfer-encoding'] || '7bit').toLowerCase().trim();
    let bytes;
    if (cte === 'base64') bytes = b64decode(part.body);
    else if (cte === 'quoted-printable') bytes = qpDecode(part.body, false);
    else bytes = binToBytes(part.body);
    let t = decodeCharset(bytes, param(h['content-type'], 'charset'));
    const isHtml = type === 'text/html';
    if (isHtml) t = extractHtmlRaw(t);
    return { text: t.replace(/\r\n?/g, '\n'), html: isHtml };
  }

  const EML_HEAD = [['from', 'Von'], ['to', 'An'], ['cc', 'Cc'], ['subject', 'Betreff'], ['date', 'Datum']];

  function extractEmlRaw(bytes) {
    const msg = splitMessage(bytesToBin(bytes || new Uint8Array(0)));
    const lines = [];
    for (const [k, label] of EML_HEAD) {
      if (msg.headers[k] !== undefined) lines.push(label + ': ' + decodeHeaderValue(msg.headers[k]));
    }
    const ctx = { count: 0 };
    const r = readPart(msg, 0, ctx);
    const body = r ? r.text.replace(/\s+$/, '') : '';
    const text = lines.length ? lines.join('\n') + '\n\n' + body : body;
    return { text: text, hadAttachments: ctx.count > 0, attachmentCount: ctx.count };
  }

  // ---- extractRtf -----------------------------------------------------------------------

  const SKIP_DEST = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object']);
  const KEEP_DEST = new Set(['header', 'footer', 'footnote']);
  const CODEPAGES = { 1250: 'windows-1250', 1251: 'windows-1251', 1252: 'windows-1252', 1253: 'windows-1253', 1254: 'windows-1254' };

  function extractRtfRaw(rtf) {
    const s = String(rtf == null ? '' : rtf);
    const n = s.length;
    const out = [];
    let outEnd = '';
    let cp = 1252;
    let st = { skip: false, uc: 1 };
    let skipN = 0;
    const stack = [];
    const decoders = {};
    function emit(t) {
      if (st.skip || !t) return;
      out.push(t);
      outEnd = t[t.length - 1];
    }
    function cpChar(byte) {
      const label = CODEPAGES[cp] || CODEPAGES[1252];
      const d = decoders[label] || (decoders[label] = new TextDecoder(label));
      return d.decode(Uint8Array.of(byte));
    }
    let i = 0;
    while (i < n) {
      const c = s[i];
      if (skipN > 0) {
        // Ersatzzeichen nach \uN ueberspringen (ein Zeichen oder \'hh)
        if (c === '\\' && s[i + 1] === "'") { i += 4; skipN--; continue; }
        if (c !== '\\' && c !== '{' && c !== '}') { i++; skipN--; continue; }
        skipN = 0;
      }
      if (c === '{') { stack.push(st); st = { skip: st.skip, uc: st.uc }; i++; }
      else if (c === '}') { if (stack.length) st = stack.pop(); i++; }
      else if (c === '\\') {
        const d = s[i + 1];
        if (d === undefined) { i++; continue; }
        if (/[A-Za-z]/.test(d)) {
          let j = i + 1;
          while (j < n && /[A-Za-z]/.test(s[j])) j++;
          const word = s.slice(i + 1, j);
          let num = null;
          const pm = /^-?\d{1,10}/.exec(s.slice(j, j + 12));
          if (pm) { num = parseInt(pm[0], 10); j += pm[0].length; }
          if (s[j] === ' ') j++;
          i = j;
          if (SKIP_DEST.has(word)) st.skip = true;
          else if (KEEP_DEST.has(word)) { if (!st.skip && out.length && outEnd !== '\n') emit('\n'); }
          else if (word === 'par' || word === 'line') emit('\n');
          else if (word === 'tab') emit('\t');
          else if (word === 'ansicpg') { if (num !== null) cp = CODEPAGES[num] ? num : 1252; }
          else if (word === 'uc') { if (num !== null) st.uc = Math.max(0, Math.min(num, 100)); }
          else if (word === 'u' && num !== null) {
            emit(String.fromCharCode(((num % 65536) + 65536) % 65536));
            skipN = st.uc;
          }
        } else if (d === "'") {
          const hx = s.slice(i + 2, i + 4);
          if (/^[0-9A-Fa-f]{2}$/.test(hx)) { emit(cpChar(parseInt(hx, 16))); i += 4; } else i += 2;
        } else {
          if (d === '\\' || d === '{' || d === '}') emit(d);
          else if (d === '~') emit(' ');
          else if (d === '_') emit('-');
          else if (d === '*') st.skip = true;
          else if (d === '\n' || d === '\r') emit('\n');
          i += 2;
        }
      } else {
        if (c !== '\n' && c !== '\r') emit(c);
        i++;
      }
    }
    return out.join('').trim();
  }

  // Alle extract*: nur PSFormatError oder Ergebnis
  function wrap(fn) {
    return function (x) {
      try { return fn(x); } catch (e) {
        if (e instanceof PSFormatError) throw e;
        throw new PSFormatError('CORRUPT', String(e && e.message || e));
      }
    };
  }

  const extractHtml = wrap(function (h) { return { text: extractHtmlRaw(h) }; });
  const extractEml = wrap(extractEmlRaw);
  const extractRtf = wrap(function (r) { return { text: extractRtfRaw(r) }; });

  return { detect, guard, boundedRead, MAX_TOTAL, decodeText, extractHtml, extractEml, extractRtf, PSFormatError };
});
