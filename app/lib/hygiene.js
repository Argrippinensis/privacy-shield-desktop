// Dateinamen-Hygiene (A4.m): reines Modul, kein DOM, kein Speicherzugriff.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.hygiene = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const EXTS = ['.txt', '.pdf', '.json', '.zip', '.psmap'];
  const RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

  // Bereinigt einen Namen ohne Endung; leerer String, wenn nichts uebrig bleibt
  function clean(name) {
    let s = name.normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_').replace(/_+/g, '_');
    s = s.replace(/^[ .]+|[ .]+$/g, '');
    s = Array.from(s).slice(0, 80).join('').replace(/^[ .]+|[ .]+$/g, '');
    if (!s.replace(/_/g, '')) return '';
    return RESERVED.test(s) ? '_' + s : s;
  }

  // safeName(original, index, { keepName, ext }) -> Dateiname ohne Pfadtrenner
  function safeName(original, index, opts) {
    const o = opts || {};
    const ext = o.ext === undefined ? '.txt' : o.ext;
    if (!Number.isInteger(index) || index < 1) throw new RangeError('index muss eine ganze Zahl >= 1 sein');
    if (!EXTS.includes(ext)) throw new RangeError('ext nicht erlaubt: ' + ext);
    const std = 'anonymisiert_' + String(index).padStart(3, '0') + ext;
    if (!o.keepName) return std;
    let base = String(original == null ? '' : original);
    const dot = base.lastIndexOf('.');
    if (dot >= 0 && !/[\\/:]/.test(base.slice(dot))) base = base.slice(0, dot);
    const c = clean(base);
    return c ? c + '_anonymisiert' + ext : std;
  }

  return { safeName };
});
