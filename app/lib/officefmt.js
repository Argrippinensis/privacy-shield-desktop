// Office-Formate (B2.m2): Textauszug aus XLSX, ODF, PPTX und Zusatzteilen von DOCX.
// Reines Modul, kein DOM, kein Speicherzugriff. XML ohne Entitaetserweiterung (DOCTYPE wird verworfen).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./formats.js'));
  else { root.PSLib = root.PSLib || {}; root.PSLib.officefmt = factory(root.PSLib.formats); }
})(typeof self !== 'undefined' ? self : this, function (formats) {
  'use strict';

  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

  // Nur die fuenf Standardentitaeten und Zahlenreferenzen; alles andere (z. B. &a;) bleibt stehen
  function decode(s) {
    return s.replace(/&(#[xX][0-9a-fA-F]{1,8}|#[0-9]{1,8}|[A-Za-z]{2,4});/g, function (m, e) {
      if (e[0] === '#') {
        const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : m;
      }
      return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : m;
    });
  }

  // Zerlegt XML in Tokens {k:'open'|'close'|'text', n:Name, a:Attribute, s:selbstschliessend}
  function tokens(xml) {
    xml = xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<\?[\s\S]*?\?>/g, '')
      .replace(/<!DOCTYPE(?:[^>[]|\[[\s\S]*?\])*>/gi, '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, function (m, t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); });
    const out = [];
    const re = /<(\/?)([A-Za-z_][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)/g;
    let m;
    while ((m = re.exec(xml))) {
      if (m[4] !== undefined) { out.push({ k: 'text', t: decode(m[4]) }); continue; }
      if (m[1]) { out.push({ k: 'close', n: m[2] }); continue; }
      const a = {};
      const ar = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let x;
      while ((x = ar.exec(m[3]))) a[x[1]] = decode(x[2] !== undefined ? x[2] : x[3]);
      const s = /\/\s*$/.test(m[3]);
      out.push({ k: 'open', n: m[2], a, s });
      if (s) out.push({ k: 'close', n: m[2] });
    }
    return out;
  }

  async function read(zip, name) {
    const f = zip.file(name);
    return f ? tokens(await f.async('string')) : null;
  }

  // Dateinamen nach Muster, numerisch nach der Nummer sortiert
  function numbered(zip, re) {
    const r = [];
    for (const n of Object.keys(zip.files)) {
      const m = re.exec(n);
      if (m && !zip.files[n].dir) r.push({ n, i: parseInt(m[1], 10) });
    }
    return r.sort((a, b) => a.i - b.i).map((x) => x.n);
  }

  // Absaetze (pn) mit Text (tn) als nicht leere Zeilen
  function paragraphs(toks, pn, tn) {
    const lines = [];
    let cur = null;
    let inT = false;
    for (const t of toks) {
      if (t.k === 'open' && t.n === pn) cur = '';
      else if (t.k === 'close' && t.n === pn) { if (cur) lines.push(cur); cur = null; }
      else if (t.k === 'open' && t.n === tn) inT = true;
      else if (t.k === 'close' && t.n === tn) inT = false;
      else if (t.k === 'text' && inT && cur !== null) cur += t.t;
    }
    return lines;
  }

  // ---- XLSX -----------------------------------------------------------------------------

  function colIndex(ref) {
    const m = /^([A-Za-z]+)/.exec(ref || '');
    if (!m) return -1;
    let n = 0;
    for (const c of m[1].toUpperCase()) n = n * 26 + c.charCodeAt(0) - 64;
    return n - 1;
  }

  function sharedStrings(toks) {
    const list = [];
    let cur = null;
    let inT = false;
    let skip = 0;
    for (const t of toks) {
      if (t.k === 'open' && t.n === 'si') cur = '';
      else if (t.k === 'close' && t.n === 'si') { list.push(cur || ''); cur = null; }
      else if (t.n === 'rPh') skip += t.k === 'open' ? 1 : -1;
      else if (t.k === 'open' && t.n === 't') inT = true;
      else if (t.k === 'close' && t.n === 't') inT = false;
      else if (t.k === 'text' && inT && cur !== null && !skip) cur += t.t;
    }
    return list;
  }

  function sheetText(toks, sst) {
    const rows = [];
    let row = null;
    let cell = null;
    let field = '';
    for (const t of toks) {
      if (t.k === 'open' && t.n === 'row') row = [];
      else if (t.k === 'close' && t.n === 'row') {
        while (row.length && row[row.length - 1] === '') row.pop();
        rows.push(row.join('\t'));
        row = null;
      } else if (t.k === 'open' && t.n === 'c' && row) {
        cell = { i: colIndex(t.a.r), t: t.a.t || '', v: '' };
        if (cell.i < 0) cell.i = row.length;
      } else if (t.k === 'close' && t.n === 'c' && cell) {
        let v = cell.v;
        if (cell.t === 's') v = sst[parseInt(v, 10)] || '';
        else if (cell.t === 'b') v = v.trim() === '1' ? 'TRUE' : 'FALSE';
        if (cell.i < 100000) { while (row.length < cell.i) row.push(''); row[cell.i] = v; }
        cell = null;
      } else if (t.k === 'open' && (t.n === 'v' || t.n === 't') && cell) field = t.n;
      else if (t.k === 'close' && (t.n === 'v' || t.n === 't')) field = '';
      else if (t.k === 'text' && field && cell) cell.v += t.t;
    }
    return rows.join('\n');
  }

  async function extractXlsx(zip) {
    formats.guard(zip);
    const sstToks = await read(zip, 'xl/sharedStrings.xml');
    const sst = sstToks ? sharedStrings(sstToks) : [];
    const names = numbered(zip, /^xl\/worksheets\/sheet(\d+)\.xml$/);
    const blocks = [];
    for (let k = 0; k < names.length; k++) {
      blocks.push('== Blatt ' + (k + 1) + ' ==\n' + sheetText(await read(zip, names[k]), sst));
    }
    return { text: blocks.join('\n\n').replace(/\n+$/, ''), sheets: names.length };
  }

  // ---- ODF ------------------------------------------------------------------------------

  async function extractOdf(zip) {
    formats.guard(zip);
    const toks = await read(zip, 'content.xml');
    if (!toks) return { text: '' };
    const lines = [];
    let para = null;
    let cellParas = null;
    let rowCells = null;
    for (const t of toks) {
      if (t.k === 'open') {
        if (t.n === 'text:p' || t.n === 'text:h') para = '';
        else if (t.n === 'table:table-row') rowCells = [];
        else if (t.n === 'table:table-cell') cellParas = [];
        else if (para !== null && t.n === 'text:s') para += ' '.repeat(Math.min(parseInt(t.a['text:c'] || '1', 10) || 1, 10000));
        else if (para !== null && t.n === 'text:tab') para += '\t';
        else if (para !== null && t.n === 'text:line-break') para += '\n';
      } else if (t.k === 'close') {
        if (t.n === 'text:p' || t.n === 'text:h') {
          if (para !== null) { if (cellParas) { if (para) cellParas.push(para); } else lines.push(para); }
          para = null;
        } else if (t.n === 'table:table-cell' && cellParas) {
          if (rowCells) rowCells.push(cellParas.join(' '));
          cellParas = null;
        } else if (t.n === 'table:table-row' && rowCells) { lines.push(rowCells.join('\t')); rowCells = null; }
      } else if (para !== null) para += t.t;
    }
    return { text: lines.join('\n').trim() };
  }

  // ---- PPTX -----------------------------------------------------------------------------

  async function extractPptx(zip) {
    formats.guard(zip);
    const names = numbered(zip, /^ppt\/slides\/slide(\d+)\.xml$/);
    const blocks = [];
    for (let k = 0; k < names.length; k++) {
      const n = /slide(\d+)\.xml$/.exec(names[k])[1];
      let s = '== Folie ' + (k + 1) + ' ==\n' + paragraphs(await read(zip, names[k]), 'a:p', 'a:t').join('\n');
      const nt = await read(zip, 'ppt/notesSlides/notesSlide' + n + '.xml');
      const notes = nt ? paragraphs(nt, 'a:p', 'a:t') : [];
      if (notes.length) s += '\n-- Notizen --\n' + notes.join('\n');
      blocks.push(s);
    }
    return { text: blocks.join('\n\n'), slides: names.length };
  }

  // ---- DOCX-Zusatzteile -----------------------------------------------------------------

  async function extractDocxExtras(zip) {
    formats.guard(zip);
    const groups = [
      ['== Kopfzeile ==', numbered(zip, /^word\/header(\d*)\.xml$/)],
      ['== Fußzeile ==', numbered(zip, /^word\/footer(\d*)\.xml$/)],
      ['== Fußnoten ==', ['word/footnotes.xml']],
      ['== Endnoten ==', ['word/endnotes.xml']],
      ['== Kommentare ==', ['word/comments.xml']],
    ];
    const parts = [];
    for (const [title, files] of groups) {
      const lines = [];
      for (const f of files) {
        const toks = await read(zip, f);
        if (toks) lines.push(...paragraphs(toks, 'w:p', 'w:t'));
      }
      if (lines.length) parts.push(title + '\n' + lines.join('\n'));
    }
    return { text: parts.join('\n\n'), parts: parts.length };
  }

  return { extractXlsx, extractOdf, extractPptx, extractDocxExtras };
});
