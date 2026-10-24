// KI-Erkennung ohne Oberflaeche (PSLib.ner): Worker starten, Text in Abschnitte teilen, Treffer zu Spans machen.
// Entspricht der Anbindung in der Oberflaeche (Namen, Organisationen, Orte); der Erkennungskern bleibt PSDetect.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.ner = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const AI_MAP = {
    PER: { pfx: 'NAME', col: '#f59e0b' },
    ORG: { pfx: 'ORG', col: '#8b5cf6' },
    LOC: { pfx: 'ORT', col: '#3b82f6' },
  };

  function chunkText(text, maxLen) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + maxLen, text.length);
      if (end < text.length) {
        const nl = text.lastIndexOf('\n', end);
        if (nl > start) end = nl + 1;
      }
      chunks.push({ str: text.slice(start, end), off: start });
      start = end;
    }
    return chunks;
  }

  function aggregate(tokens) {
    const ents = [];
    let cur = null;
    for (const t of tokens) {
      const m = /^([BI])-([A-Z]+)$/.exec(t.entity || '');
      const sub = typeof t.word === 'string' && t.word.indexOf('##') === 0;
      if (!m || (t.score || 0) < 0.9) {
        if (cur) { ents.push(cur); cur = null; }
        continue;
      }
      const piece = sub ? t.word.slice(2) : t.word;
      if (cur && cur.tag === m[2] && (m[1] === 'I' || sub)) cur.pieces.push({ piece: piece, sub: sub });
      else {
        if (cur) ents.push(cur);
        cur = { tag: m[2], pieces: [{ piece: piece, sub: false }] };
      }
    }
    if (cur) ents.push(cur);
    return ents;
  }

  function locate(chunkStr, pieces, cursor) {
    let pat = '';
    for (let i = 0; i < pieces.length; i++) {
      const esc = pieces[i].piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pat += (i === 0 ? '' : pieces[i].sub ? '' : '[ \\t]{0,3}') + esc;
    }
    let rx;
    try { rx = new RegExp(pat); } catch (e) { return null; }
    const m = chunkStr.slice(cursor).match(rx);
    if (!m) return null;
    return { start: cursor + m.index, end: cursor + m.index + m[0].length };
  }

  // plain: Text mit unkenntlich gemachten harten Treffern; run: Text -> Token-Liste; isStopword wie PSDetect.isStopword
  async function collectSpans(plain, run, isStopword, beat) {
    const spans = [];
    const chunks = chunkText(plain, 1e3);
    for (let ci = 0; ci < chunks.length; ci++) {
      if (beat) beat(ci + 1, chunks.length);
      const out = await run(chunks[ci].str);
      let cursor = 0;
      for (const ent of aggregate(out)) {
        const t = AI_MAP[ent.tag];
        if (!t) continue;
        const loc = locate(chunks[ci].str, ent.pieces, cursor);
        if (!loc) continue;
        cursor = loc.end;
        const entityText = chunks[ci].str.slice(loc.start, loc.end).trim();
        if (entityText.indexOf(' ') === -1 && (isStopword(entityText) || isStopword(entityText.toLowerCase()))) continue;
        spans.push({ start: chunks[ci].off + loc.start, end: chunks[ci].off + loc.end, pfx: t.pfx, col: t.col });
      }
    }
    return spans;
  }

  // Startet ner-worker.js in einem eigenen Thread; liefert eine Funktion Text -> Token-Liste (mit .worker)
  function createPipeline(modelId, workerUrl) {
    return new Promise(function (resolve, reject) {
      const worker = new Worker(workerUrl, { type: 'module' });
      const pending = new Map();
      let seq = 0, ready = false;
      function failAll(err) { pending.forEach((p) => p.rej(err)); pending.clear(); }
      worker.onmessage = function (ev) {
        const m = ev.data;
        if (m.type === 'ready') {
          ready = true;
          const call = function (text) {
            return new Promise(function (res, rej) {
              const id = ++seq;
              pending.set(id, { res: res, rej: rej });
              worker.postMessage({ type: 'run', id: id, text: text });
            });
          };
          call.worker = worker;
          resolve(call);
        } else if (m.type === 'result') {
          const p = pending.get(m.id);
          if (p) { pending.delete(m.id); p.res(m.out); }
        } else if (m.type === 'error') {
          const err = new Error('NER');
          if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); p.rej(err); }
          else reject(err);
        }
      };
      worker.onerror = function () {
        const err = new Error('NER');
        if (ready) failAll(err); else reject(err);
      };
      worker.postMessage({ type: 'load', modelId: modelId });
    });
  }

  return { chunkText, aggregate, locate, collectSpans, createPipeline };
});
