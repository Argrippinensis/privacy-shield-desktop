// Pruefansicht (D1.m): Funde nach Typ und exaktem Wert gruppieren, sortieren, Entscheidung ableiten.
// Reines Modul, kein DOM, kein Speicherzugriff.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.review = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TYPE_ORDER = ['NAME', 'ORG', 'ORT', 'ADRESSE', 'EMAIL', 'TEL', 'IBAN', 'BIC', 'KARTE', 'KONTO', 'KENNNR', 'DATUM', 'BETRAG', 'KFZ', 'IP', 'GERAET', 'STANDORT', 'ROLLE', 'MEDIZIN', 'SENSIBEL', 'PARAGRAF'];
  const SOFT = new Set(['NAME', 'ORG', 'ORT', 'ADRESSE', 'ROLLE', 'MEDIZIN', 'SENSIBEL']);
  const CTX = 20;
  const MAX_EX = 60;

  function example(text, s) {
    let e = text.slice(Math.max(0, s.start - CTX), s.end + CTX).replace(/\s+/g, ' ').trim();
    if (e.length > MAX_EX) e = e.slice(0, MAX_EX - 1) + '…';
    return e;
  }

  function rank(t) {
    const i = TYPE_ORDER.indexOf(t);
    return i < 0 ? TYPE_ORDER.length : i;
  }

  function build(spans, text, o) {
    o = o || {};
    const tokenOf = o.tokenOf || function () { return null; };
    const released = new Set((o.released || []).map(function (r) { return r.pfx + '|' + r.value; }));
    const wl = (o.whitelist || []).map(function (w) { return String(w).toLowerCase(); });
    const groups = new Map();
    const sorted = spans.slice().sort(function (a, b) { return a.start - b.start; });
    for (const s of sorted) {
      const value = text.slice(s.start, s.end);
      const key = s.pfx + '|' + value;
      let g = groups.get(key);
      if (!g) {
        const low = value.toLowerCase();
        g = {
          key: key, type: s.pfx, value: value, count: 0,
          token: tokenOf(value, s.pfx), firstStart: s.start, examples: [],
          decision: released.has(key) || wl.some(function (w) { return low.indexOf(w) !== -1; }) ? 'freigeben' : 'maskieren',
          soft: SOFT.has(s.pfx)
        };
        groups.set(key, g);
      }
      g.count++;
      if (g.examples.length < 3) g.examples.push(example(text, s));
    }
    return Array.from(groups.values()).sort(function (a, b) {
      const ra = rank(a.type), rb = rank(b.type);
      if (ra !== rb) return ra - rb;
      if (ra === TYPE_ORDER.length && a.type !== b.type) return a.type < b.type ? -1 : 1;
      if (a.count !== b.count) return b.count - a.count;
      return a.firstStart - b.firstStart;
    });
  }

  return { build, TYPE_ORDER };
});
