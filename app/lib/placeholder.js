// Platzhalter-Grammatik an einem Ort (PSLib.placeholder), reines Modul ohne Oberflaechenzugriff.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.placeholder = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TOKEN_SOURCE = '\\{\\{[A-ZÄÖÜ][A-ZÄÖÜ0-9_.\\-]{0,63}\\}\\}';

  // -> [{ start, end, token }], nach start sortiert, ueberlappungsfrei
  function find(text) {
    const re = new RegExp(TOKEN_SOURCE, 'g');
    const out = [];
    let m;
    while ((m = re.exec(String(text))) !== null) out.push({ start: m.index, end: m.index + m[0].length, token: m[0] });
    return out;
  }

  // ganze Zeichenkette ist genau ein Platzhalter
  function isToken(s) {
    return new RegExp('^' + TOKEN_SOURCE + '$').test(String(s));
  }

  // gleiche Laenge; jeder Platzhalter wird zeichenweise durch ch ersetzt (ch: genau ein UTF-16-Zeichen)
  function mask(text, ch) {
    const c = ch === undefined ? '\u0000' : ch;
    return String(text).replace(new RegExp(TOKEN_SOURCE, 'g'), (m) => c.repeat(m.length));
  }

  return { TOKEN_SOURCE, find, isToken, mask };
});
