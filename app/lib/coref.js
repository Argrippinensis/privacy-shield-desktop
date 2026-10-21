// Verknuepfung derselben Person (C2.m): ordnet NAME-Spans einer Person zu (personKey) und benennt die Form.
// Reines Modul, kein DOM, kein Speicherzugriff. Nur eindeutige Zuordnungen, sonst personKey null.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.PSLib = root.PSLib || {}; root.PSLib.coref = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Anreden und Titel am Anfang (mit oder ohne Punkt, wo ueblich)
  const TITLE = /^(herr|frau|hr\.|fr\.|dr\.?|prof\.?|dipl\.-ing\.|mag\.|ing\.|med\.|jur\.|rer\.|nat\.)$/i;
  const PARTICLE = new Set(['von', 'van', 'de', 'zu', 'zur', 'vom', 'ter', 'ten', 'di', 'da', 'le', 'la', 'bin', 'ibn', 'der', 'den', 'dem']);
  const INITIAL = /^\p{L}\.$/u;

  const norm = (s) => s.normalize('NFC').toLowerCase();

  // Zerlegung eines Namenstexts in { given: [Woerter], surname: 'text', initial: 'x'|null }; null bei leerem Rest
  function parse(str) {
    const words = str.normalize('NFC').split(/\s+/).filter(Boolean);
    while (words.length && TITLE.test(words[0])) words.shift();
    if (!words.length) return null;
    let i = words.length - 1; // letztes Wort ist Nachname, davor stehende Zusaetze gehoeren dazu
    while (i > 0 && PARTICLE.has(words[i - 1].toLowerCase())) i--;
    const given = words.slice(0, i);
    const surname = norm(words.slice(i).join(' '));
    const names = given.filter((w) => !INITIAL.test(w)).map(norm);
    const initials = given.filter((w) => INITIAL.test(w));
    return { given: names, initial: initials.length ? norm(initials[0])[0] : null, hasGiven: given.length > 0, surname };
  }

  function link(spans, text) {
    const infos = spans.map((s) => (s && s.pfx === 'NAME' ? parse(String(text).slice(s.start, s.end)) : null));

    // VOLL-Personen: mindestens ein ausgeschriebener Vorname plus Nachname
    const persons = new Map();
    infos.forEach((p) => {
      if (p && p.given.length) persons.set(p.given.join(' ') + '|' + p.surname, p);
    });
    const list = [...persons.entries()].map(([key, p]) => ({ key, given: p.given, surname: p.surname }));
    const bySurname = (sn) => list.filter((q) => q.surname === sn);
    const uniq = (arr) => (arr.length === 1 ? arr[0].key : null);

    return spans.map((s, idx) => {
      const p = infos[idx];
      if (!p) return Object.assign({}, s);
      let form = null;
      let personKey = null;
      if (p.given.length) {
        form = 'VOLL';
        personKey = p.given.join(' ') + '|' + p.surname;
      } else if (p.hasGiven) {
        // nur Initiale(n) plus Nachname
        form = 'KURZ';
        const m = bySurname(p.surname).filter((q) => q.given.some((g) => g[0] === p.initial));
        personKey = uniq(m);
      } else {
        const w = p.surname;
        let m = bySurname(w);
        if (!m.length && w.length - 1 > 3 && w.endsWith('s')) m = bySurname(w.slice(0, -1)); // Genitiv-s
        if (m.length) {
          form = 'NACHNAME';
          personKey = uniq(m);
        } else {
          m = list.filter((q) => q.given.includes(w));
          if (m.length) {
            form = 'VORNAME';
            personKey = uniq(m);
          }
        }
      }
      return Object.assign({}, s, { personKey, form });
    });
  }

  return { link };
});
