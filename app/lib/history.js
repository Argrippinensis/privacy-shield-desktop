// Verlauf (D1.m): Rueckgaengig/Wiederholen fuer Entscheidungs-Schnappschuesse.
// Reines Modul, kein DOM, kein Speicherzugriff. Schnappschuesse sind tiefe Kopien.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.history = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function create(opts) {
    const limit = Math.max(1, (opts && opts.limit) || 100);
    let stack = [];
    let idx = -1;
    const copy = function (s) { return structuredClone(s); };

    return {
      push(s) {
        stack = stack.slice(0, idx + 1);
        stack.push(copy(s));
        if (stack.length > limit) stack.shift();
        idx = stack.length - 1;
      },
      undo() { if (idx <= 0) return null; idx--; return copy(stack[idx]); },
      redo() { if (idx >= stack.length - 1) return null; idx++; return copy(stack[idx]); },
      current() { return idx < 0 ? null : copy(stack[idx]); },
      canUndo() { return idx > 0; },
      canRedo() { return idx < stack.length - 1; },
      size() { return stack.length; },
      clear() { stack = []; idx = -1; }
    };
  }

  return { create };
});
