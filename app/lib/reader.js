// Dateien in Text umwandeln (PSLib.reader), ohne Oberflaeche: dieselben Formate und Grenzen wie die Projektliste.
// Die Bibliotheken (pdf.js, mammoth, JSZip) werden hineingereicht; fuer gescannte PDFs gibt es keine Texterkennung.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./formats.js'), require('./officefmt.js'));
  else { root.PSLib = root.PSLib || {}; root.PSLib.reader = factory(root.PSLib.formats, root.PSLib.officefmt); }
})(typeof self !== 'undefined' ? self : this, function (F, O) {
  'use strict';
  const ZIP_KINDS = ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'];
  const SCAN_MIN_CHARS = 50; // wie in der Oberflaeche: darunter gilt ein PDF als gescannt

  class PSReadError extends Error {
    constructor(code) { super(code); this.name = 'PSReadError'; this.code = code; }
  }

  // Liest nur das Zentralverzeichnis (ohne Entpacken) in die Form, die formats.guard erwartet
  function zipDirOf(b) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength), files = {};
    let e = b.length - 22;
    while (e >= 0 && e > b.length - 65558 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0 || v.getUint32(e, true) !== 0x06054b50) return { files };
    const n = v.getUint16(e + 10, true);
    let p = v.getUint32(e + 16, true);
    for (let i = 0; i < n && p + 46 <= b.length && v.getUint32(p, true) === 0x02014b50; i++) {
      files['e' + i] = { _data: { compressedSize: v.getUint32(p + 20, true), uncompressedSize: v.getUint32(p + 24, true) } };
      p += 46 + v.getUint16(p + 28, true) + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
    return { files };
  }

  // deps: { pdfjsLib, mammoth, JSZip }
  function create(deps) {
    const d = deps || {};

    async function pdfText(bytes) {
      if (!d.pdfjsLib) throw new PSReadError('CORRUPT');
      const pdf = await d.pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
      let out = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const c = await page.getTextContent();
        let lastY = null, lastX = null;
        for (const it of c.items) {
          const y = Array.isArray(it.transform) ? Math.round(it.transform[5]) : null;
          const x = Array.isArray(it.transform) ? Math.round(it.transform[4]) : null;
          const sameRow = lastY !== null && y !== null && Math.abs(y - lastY) <= 2;
          if (!sameRow && lastY !== null) out += '\n';
          else if (sameRow && lastX !== null && x !== null && x - lastX > 50) out += '\n';
          if (/^[-=]{3,}$/.test(it.str.trim())) out += '\n';
          out += it.str;
          out += it.hasEOL ? '\n' : ' ';
          if (y !== null) lastY = y;
          if (x !== null) lastX = x + it.str.length * 5;
        }
        out += '\n';
      }
      out = out.trim();
      if (out.length < SCAN_MIN_CHARS && pdf.numPages > 0) throw new PSReadError('SCAN');
      return out;
    }

    async function docxText(bytes, zip) {
      if (!d.mammoth) throw new PSReadError('CORRUPT');
      // Trockenlauf: Mammoth oeffnet das Archiv mit eigener JSZip-Kopie ohne Grenze, daher vorher zaehlend entpacken
      const bud = { used: 0, max: F.MAX_TOTAL };
      for (const nm of Object.keys(zip.files)) {
        if (!zip.files[nm].dir && /\.(xml|rels)$/i.test(nm)) await F.boundedRead(zip, nm, { budget: bud, as: 'count' });
      }
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      const base = (await d.mammoth.extractRawText({ arrayBuffer: ab })).value;
      const extra = await O.extractDocxExtras(zip);
      return extra.text ? base + '\n\n' + extra.text : base;
    }

    // name: nur fuer die Endung; bytes: Uint8Array. Wirft PSReadError mit festem Code, nie mit Dateiinhalt.
    async function readText(name, bytes) {
      const kind = F.detect(name, bytes.slice(0, 512));
      if (kind === 'doc' || kind === 'xls' || kind === 'ppt') throw new PSReadError('OLD_FORMAT');
      if (kind === 'unknown') throw new PSReadError('UNKNOWN');
      try {
        if (kind === 'pdf') return await pdfText(bytes);
        if (ZIP_KINDS.includes(kind)) {
          F.guard(zipDirOf(bytes)); // vor dem Entpacken: gefaelschte Groessen im Zentralverzeichnis abfangen
          const zip = await d.JSZip.loadAsync(bytes);
          F.guard(zip);
          if (kind === 'docx') return await docxText(bytes, zip);
          if (kind === 'xlsx') return (await O.extractXlsx(zip)).text;
          if (kind === 'pptx') return (await O.extractPptx(zip)).text;
          return (await O.extractOdf(zip)).text;
        }
        if (kind === 'eml') return F.extractEml(bytes).text;
        const txt = F.decodeText(bytes).text;
        if (kind === 'html') return F.extractHtml(txt).text;
        if (kind === 'rtf') return F.extractRtf(txt).text;
        return txt;
      } catch (err) {
        if (err instanceof PSReadError) throw err;
        if (err instanceof F.PSFormatError && ['TOO_BIG', 'TOO_MANY', 'RATIO'].includes(err.code)) throw new PSReadError(err.code);
        throw new PSReadError('CORRUPT'); // nie err.message
      }
    }

    return { readText };
  }

  return { create, zipDirOf, PSReadError };
});
