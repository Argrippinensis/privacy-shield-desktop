// Manuelle Markierungen als Daten (PSLib.marks), reines Modul ohne Oberflaechenzugriff.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.marks = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VOR = '(?<![A-Za-z0-9_À-ɏ])';
  const NACH = '(?![A-Za-z0-9_À-ɏ])';
  const METH = 'Manuelle Markierung';
  const PFX_RE = /^[A-Z][A-Z0-9_]{1,19}$/;

  function gueltig(e) {
    if (!e || typeof e.value !== 'string' || typeof e.pfx !== 'string') return false;
    const v = e.value;
    if (v.length < 2 || v.length > 200) return false;
    if (/[\r\n]/.test(v) || v.includes('{{') || v.includes('}}')) return false;
    return PFX_RE.test(e.pfx);
  }

  function index(m, e) {
    return m.items.findIndex((i) => i.value === e.value && i.pfx === e.pfx);
  }

  function create() { return { items: [] }; }

  function add(m, e) {
    if (!gueltig(e) || index(m, e) >= 0) return false;
    m.items.push({ value: e.value, pfx: e.pfx });
    return true;
  }

  function remove(m, e) {
    if (!e) return false;
    const i = index(m, e);
    if (i < 0) return false;
    m.items.splice(i, 1);
    return true;
  }

  function maskiere(s) { return s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&'); }

  // NFC und NFD des Werts als Alternativen (Text kann in beiden Formen vorliegen); sonst nur der Wert
  function formen(v) {
    const a = v.normalize('NFC'), b = v.normalize('NFD');
    const alle = [v];
    if (!alle.includes(a)) alle.push(a);
    if (!alle.includes(b)) alle.push(b);
    return alle.length === 1 ? maskiere(v) : '(?:' + alle.map(maskiere).join('|') + ')';
  }

  // laengere Werte zuerst (stabil), Eingabe fuer die eigenen Variablen des Kerns.
  // f = 'i': Gross-/Kleinschreibung egal; m: Herkunft fuer die Trefferzaehlung. Leerraum und Vollbreite gleicht der Kern an.
  function toCvars(m) {
    return m.items
      .map((i, k) => ({ i, k }))
      .sort((a, b) => b.i.value.length - a.i.value.length || a.k - b.k)
      .map(({ i }) => ({ n: i.pfx, p: VOR + formen(i.value) + NACH, f: 'i', m: METH }));
  }

  function snapshot(m) { return JSON.parse(JSON.stringify(m)); }

  function restore(m, s) { m.items = snapshot(s).items; }

  return { create, add, remove, toCvars, snapshot, restore };
});
