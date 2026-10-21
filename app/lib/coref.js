// Verknuepfung derselben Person (C2.m): ordnet NAME-Spans einer Person zu (personKey) und benennt die Form.
// Reines Modul, kein DOM, kein Speicherzugriff. Nur eindeutige Zuordnungen, sonst personKey null.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.coref = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Anreden und Titel am Anfang (mit oder ohne Punkt, wo ueblich)
  const TITLE = /^(herr|herrn|frau|hr\.|hrn\.|fr\.|frl\.|dr\.?|dr\.-ing\.|prof\.?|dipl\.-ing\.|dipl\.-kfm\.|mag\.|ing\.|med\.|jur\.|rer\.|nat\.)$/i;
  const PARTICLE = new Set(['von', 'van', 'de', 'zu', 'zur', 'vom', 'ter', 'ten', 'di', 'da', 'le', 'la', 'bin', 'ibn', 'der', 'den', 'dem']);
  // Initiale: "H." oder mit Bindestrich "H.-P."
  const INITIAL = /^\p{L}\.(?:-\p{L}\.)*$/u;

  const norm = (s) => s.normalize('NFC').toLowerCase();

  // Zerlegung in { toks: Vornamen-Woerter samt Initialen, parts: Bindestrichteile, given: ausgeschriebene Vornamen, surname }
  function parse(str) {
    const words = str.normalize('NFC').split(/\s+/).filter(Boolean);
    while (words.length && TITLE.test(words[0])) words.shift();
    if (!words.length || INITIAL.test(words[words.length - 1])) return null;
    let i = words.length - 1; // letztes Wort ist Nachname, davor stehende Zusaetze gehoeren dazu
    while (i > 0 && PARTICLE.has(words[i - 1].toLowerCase())) i--;
    const raw = words.slice(0, i);
    const toks = raw.map(norm);
    const parts = [];
    raw.forEach((w) => norm(w).split('-').forEach((x) => { if (x) parts.push(x); }));
    return {
      toks,
      parts,
      given: raw.filter((w) => !INITIAL.test(w)).map(norm),
      initials: raw.length > 0 && raw.every((w) => INITIAL.test(w)),
      surname: norm(words.slice(i).join(' ')),
    };
  }

  function link(spans, text) {
    const infos = spans.map((s) => {
      if (!s || s.pfx !== 'NAME') return null;
      const t = typeof text === 'string' && s.end > s.start ? text.slice(s.start, s.end) : '';
      return parse(t);
    });

    // VOLL-Personen: mindestens ein ausgeschriebener Vorname plus Nachname (Mittelinitialen zaehlen zum Schluessel)
    const persons = new Map();
    infos.forEach((p) => {
      if (p && p.given.length) {
        const key = p.toks.join(' ') + '|' + p.surname;
        if (!persons.has(key)) persons.set(key, { key, given: p.given, parts: p.parts, surname: p.surname });
      }
    });
    const list = [...persons.values()];
    const bySurname = (sn) => list.filter((q) => q.surname === sn);
    const byGiven = (g) => list.filter((q) => q.given.includes(g));
    const uniq = (arr) => (arr.length === 1 ? arr[0].key : null);

    return spans.map((s, idx) => {
      if (!s || s.pfx !== 'NAME') return Object.assign({}, s);
      const p = infos[idx];
      let form = null;
      let personKey = null;
      if (!p) {
        // nur Titel, leer oder unbrauchbar: ohne Verknuepfung
      } else if (p.given.length) {
        form = 'VOLL';
        personKey = p.toks.join(' ') + '|' + p.surname;
      } else if (p.initials) {
        // nur Initialen plus Nachname: alle Initialen muessen der Reihe nach passen
        form = 'KURZ';
        const m = bySurname(p.surname).filter((q) => p.parts.length <= q.parts.length && p.parts.every((x, k) => x[0] === q.parts[k][0]));
        personKey = uniq(m);
      } else {
        const w = p.surname;
        let sn = bySurname(w);
        let gv = byGiven(w);
        // Genitiv-s nur, wenn das Wort selbst weder Nachname noch Vorname ist
        if (!sn.length && !gv.length && w.length - 1 > 3 && w.endsWith('s')) {
          const stem = w.slice(0, -1);
          sn = bySurname(stem);
          gv = byGiven(stem);
        }
        if (sn.length) {
          form = 'NACHNAME';
          personKey = gv.length ? null : uniq(sn); // Doppelrolle: nicht eindeutig
        } else if (gv.length) {
          form = 'VORNAME';
          personKey = uniq(gv);
        }
      }
      return Object.assign({}, s, { personKey, form });
    });
  }

  return { link };
});
