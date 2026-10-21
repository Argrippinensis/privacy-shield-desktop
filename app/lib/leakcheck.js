// Gegenpruefung des Ergebnisses (PSLib.leakcheck), reines Modul ohne Oberflaechenzugriff.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./placeholder.js'));
  else { root.PSLib = root.PSLib || {}; root.PSLib.leakcheck = factory(root.PSLib.placeholder); }
})(typeof self !== 'undefined' ? self : this, function (PH) {
  'use strict';
  const HARD_PFX = new Set(['EMAIL', 'IBAN', 'BIC', 'KARTE', 'TEL', 'IP', 'KFZ', 'GERAET', 'KONTO', 'KENNNR', 'STANDORT']);
  const UMG = 15;

  function schwere(s) {
    if (s.hard === true) return 'hoch';
    if (s.hard === false) return 'mittel';
    return HARD_PFX.has(s.pfx) ? 'hoch' : 'mittel';
  }

  function scan(text, opts) {
    const o = opts || {};
    const t = typeof text === 'string' ? text : '';
    const leer = { clean: true, count: 0, whitelisted: 0, findings: [] };
    if (!t) return leer;
    let spans;
    try {
      spans = o.detect(PH.mask(t, '\u0000'));
      if (!Array.isArray(spans)) throw new Error('detect');
    } catch (e) {
      return { clean: false, count: 0, whitelisted: 0, findings: [], error: 'DETECT_FAILED' };
    }
    const toks = PH.find(t);
    const wl = (o.whitelist || []).map((w) => String(w).toLowerCase()).filter(Boolean);
    const rel = o.released || [];
    const findings = [];
    let whitelisted = 0;
    for (const s of spans) {
      if (toks.some((k) => s.start < k.end && s.end > k.start)) continue;
      const wert = t.slice(s.start, s.end);
      const low = wert.toLowerCase();
      if (wl.some((w) => low.includes(w)) || rel.some((r) => r.pfx === s.pfx && r.value === wert)) {
        whitelisted++;
        continue;
      }
      const snippet = t.slice(Math.max(0, s.start - UMG), Math.min(t.length, s.end + UMG)).replace(/[\r\n\t]/g, ' ');
      findings.push({ type: s.pfx, start: s.start, end: s.end, severity: schwere(s), snippet });
    }
    findings.sort((a, b) => a.start - b.start);
    return { clean: findings.length === 0, count: findings.length, whitelisted, findings };
  }

  return { scan, HARD_PFX };
});
