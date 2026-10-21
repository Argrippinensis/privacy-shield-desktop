// Richtliniendatei und sichere Regex-Teilmenge (PSLib.policy), reines Modul ohne Oberflaechenzugriff.
// Sicherheitsgrenze: eine laufende JS-Regex laesst sich nicht abbrechen. Deshalb werden nur Muster
// zugelassen, deren Laufzeit linear mit dem Text waechst (kein Rueckverfolgungs-Explosionsrisiko).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./placeholder.js'));
  else { root.PSLib = root.PSLib || {}; root.PSLib.policy = factory(root.PSLib.placeholder); }
})(typeof self !== 'undefined' ? self : this, function (placeholder) {
  'use strict';

  const MAX_BYTES = 1024 * 1024;
  const MAX_RULES = 100;
  const MAX_TERMS = 5000;
  const MAX_PATTERN = 200;
  const MAX_UPPER = 64;
  const MAX_PRODUCT = 1000;
  const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];
  const ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;
  const CATEGORY_RE = /^[A-Z][A-Z0-9_]{1,19}$/;
  const TERM_START_RE = /^[\p{L}\p{N}]/u;
  const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
  const WORD_RUN_RE = /[\p{L}\p{N}_]+/gu;

  // ---- Regex-Pruefer: echter Parser der sicheren Teilmenge ----

  class Abgelehnt extends Error {}
  const nein = (msg) => { throw new Abgelehnt(msg); };

  const MSG_UNBEGRENZT = 'Unbegrenzte Wiederholungen (* und +) sind nicht erlaubt. Schreiben Sie z. B. {1,20}.';

  // Zerlegt das (bereits syntaktisch gueltige) Muster; wirft Abgelehnt bei Verstoss.
  function pruefeTeilmenge(p) {
    const n = p.length;
    let i = 0;
    let produkt = 1;
    const mal = (f) => {
      produkt *= f;
      if (produkt > MAX_PRODUCT) nein('Die Wiederholungen sind zu verschachtelt (Produkt der Obergrenzen über ' + MAX_PRODUCT + '). Verwenden Sie kleinere Grenzen.');
    };

    // Alternative (a|b|...) -> Anzahl der Zweige
    function alternative(tiefe) {
      let zweige = 0;
      for (;;) {
        folge(tiefe);
        zweige++;
        if (p[i] === '|') { i++; continue; }
        return zweige;
      }
    }

    function folge(tiefe) {
      while (i < n && p[i] !== '|' && !(p[i] === ')' && tiefe > 0)) {
        const gruppe = atom(tiefe);
        quantor(gruppe);
      }
    }

    // -> null (kein Gruppenatom) oder { zweige }
    function atom(tiefe) {
      const c = p[i];
      if (c === '\\') {
        const d = p[i + 1];
        if (d !== undefined && (/[1-9]/.test(d) || d === 'k')) nein('Rückverweise sind nicht erlaubt.');
        i += 2;
        return null;
      }
      if (c === '[') {
        i++;
        if (p[i] === '^') i++;
        while (i < n) {
          if (p[i] === '\\') i += 2;
          else if (p[i] === ']') { i++; break; }
          else i++;
        }
        return null;
      }
      if (c === '(') {
        i++;
        if (p[i] === '?') {
          if (p[i + 1] !== ':') nein('Vorausschau, Rückschau und benannte Gruppen sind nicht erlaubt.');
          i += 2;
        }
        const zweige = alternative(tiefe + 1);
        if (p[i] !== ')') nein('Ungültige Regex-Syntax.');
        i++;
        if (zweige > 1) mal(zweige);
        return { zweige };
      }
      i++; // Zeichen, ".", "^", "$" oder ein einzelnes "{" ohne Quantorform
      return null;
    }

    function quantor(gruppe) {
      const c = p[i];
      if (c === '*' || c === '+') nein(MSG_UNBEGRENZT);
      let faktor = 0;
      let nurFrage = false;
      if (c === '?') {
        i++;
        faktor = 2;
        nurFrage = true;
      } else if (c === '{') {
        const m = /^\{(\d+)(?:(,)(\d*))?\}/.exec(p.slice(i, i + 24));
        if (!m) return; // Klammer ohne Quantorform ist ein Literal
        if (m[2] && m[3] === '') nein(MSG_UNBEGRENZT);
        const oben = Number(m[2] ? m[3] : m[1]);
        if (oben > MAX_UPPER) nein('Die Obergrenze einer Wiederholung darf höchstens ' + MAX_UPPER + ' sein.');
        faktor = m[2] ? Math.max(oben, 1) : 1;
        i += m[0].length;
      } else return;
      if (gruppe && !nurFrage) nein('Wiederholungen auf Gruppen sind nicht erlaubt (nur ?).');
      if (gruppe && gruppe.zweige > 1) nein('Alternativen in einer Gruppe mit Wiederholung sind nicht erlaubt.');
      if (p[i] === '?') i++; // genügsame Variante, gleiche Obergrenze
      mal(faktor);
    }

    alternative(0);
  }

  function checkPattern(pattern, flags) {
    if (typeof pattern !== 'string') return { ok: false, error: 'Das Muster fehlt oder ist kein Text.' };
    if (pattern.length === 0) return { ok: false, error: 'Das Muster darf nicht leer sein.' };
    if (pattern.length > MAX_PATTERN) return { ok: false, error: 'Das Muster ist zu lang (höchstens ' + MAX_PATTERN + ' Zeichen).' };
    const f = flags === undefined ? '' : flags;
    if (f !== '' && f !== 'i') return { ok: false, error: 'Zulässige Flags sind nur "" und "i".' };
    try { new RegExp(pattern, f); } catch (e) { return { ok: false, error: 'Ungültige Regex-Syntax.' }; }
    try { pruefeTeilmenge(pattern); } catch (e) {
      if (e instanceof Abgelehnt) return { ok: false, error: e.message };
      throw e;
    }
    return { ok: true };
  }

  // ---- parse ----

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  function byteLaenge(s) {
    return new TextEncoder().encode(s).length;
  }

  // Sucht verbotene Schluessel an beliebiger Stelle (iterativ, kein Stapelueberlauf)
  function verbotenerSchluessel(wurzel) {
    const stapel = [wurzel];
    while (stapel.length) {
      const v = stapel.pop();
      if (v === null || typeof v !== 'object') continue;
      if (Array.isArray(v)) { for (const x of v) stapel.push(x); continue; }
      for (const k of Object.keys(v)) {
        if (FORBIDDEN_KEYS.includes(k)) return k;
        stapel.push(v[k]);
      }
    }
    return null;
  }

  function parse(jsonString) {
    if (typeof jsonString !== 'string') return { ok: false, errors: ['Die Richtlinie ist kein Text.'] };
    if (jsonString.length > MAX_BYTES || (jsonString.length * 3 > MAX_BYTES && byteLaenge(jsonString) > MAX_BYTES)) {
      return { ok: false, errors: ['Die Richtliniendatei ist größer als 1 MiB.'] };
    }
    let data;
    try { data = JSON.parse(jsonString); } catch (e) { return { ok: false, errors: ['Die Datei ist kein gültiges JSON.'] }; }
    const verboten = verbotenerSchluessel(data);
    if (verboten !== null) return { ok: false, errors: ['Verbotener Schlüssel: ' + verboten] };
    if (!isObj(data)) return { ok: false, errors: ['Die Richtlinie muss ein Objekt sein.'] };

    const errors = [];
    if (data.version !== 1) errors.push('Nicht unterstützte Version (erwartet: 1).');
    if (typeof data.name !== 'string') errors.push('Feld "name" fehlt oder ist kein Text.');
    else if (data.name.length > 80) errors.push('Feld "name" ist länger als 80 Zeichen.');
    if (!Array.isArray(data.rules)) errors.push('Feld "rules" fehlt oder ist keine Liste.');
    else if (data.rules.length > MAX_RULES) errors.push('Mehr als ' + MAX_RULES + ' Regeln.');

    const rules = [];
    if (Array.isArray(data.rules) && data.rules.length <= MAX_RULES) {
      const gesehen = new Set();
      let termSumme = 0;
      data.rules.forEach((r, idx) => {
        const hat = (typeof r === 'object' && r !== null && !Array.isArray(r) && typeof r.id === 'string' && ID_RE.test(r.id));
        const wer = hat ? 'Regel "' + r.id + '"' : 'Regel Nr. ' + (idx + 1);
        const fehl = (msg) => errors.push(wer + ': ' + msg);
        if (!isObj(r)) return fehl('ist kein Objekt.');
        if (!hat) fehl('Feld "id" fehlt oder entspricht nicht ^[a-z][a-z0-9_-]{0,31}$.');
        else if (gesehen.has(r.id)) fehl('doppelte id.');
        else gesehen.add(r.id);
        if (typeof r.label !== 'string') fehl('Feld "label" fehlt oder ist kein Text.');
        else if (r.label.length > 80) fehl('Feld "label" ist länger als 80 Zeichen.');
        const out = { id: hat ? r.id : '', label: typeof r.label === 'string' ? r.label : '', type: r.type };

        if (r.type === 'regex') {
          const flags = r.flags === undefined ? '' : r.flags;
          const chk = checkPattern(r.pattern, flags);
          if (!chk.ok) fehl(chk.error);
          out.pattern = r.pattern;
          out.flags = flags;
        } else if (r.type === 'list') {
          if (!Array.isArray(r.terms)) fehl('Feld "terms" fehlt oder ist keine Liste.');
          else if (r.terms.length < 1) fehl('Feld "terms" ist leer.');
          else {
            termSumme += r.terms.length;
            let bad = 0;
            r.terms.forEach((t, k) => {
              if (typeof t === 'string' && t.length >= 1 && t.length <= 200 && TERM_START_RE.test(t)) return;
              if (++bad <= 5) fehl('Begriff Nr. ' + (k + 1) + ' ist ungültig (1 bis 200 Zeichen, beginnt mit Buchstabe oder Ziffer).');
            });
            if (bad > 5) fehl((bad - 5) + ' weitere ungültige Begriffe.');
          }
          if (r.caseSensitive !== undefined && typeof r.caseSensitive !== 'boolean') fehl('Feld "caseSensitive" muss wahr oder falsch sein.');
          out.terms = Array.isArray(r.terms) ? r.terms.filter((t) => typeof t === 'string') : [];
          out.caseSensitive = r.caseSensitive === true;
        } else {
          fehl('Feld "type" muss "regex" oder "list" sein.');
        }

        const category = r.category === undefined ? 'EIGEN' : r.category;
        if (typeof category !== 'string' || !CATEGORY_RE.test(category)) fehl('Feld "category" entspricht nicht ^[A-Z][A-Z0-9_]{1,19}$.');
        out.category = category;

        const profiles = r.profiles === undefined ? ['*'] : r.profiles;
        if (!Array.isArray(profiles) || profiles.length < 1 || !profiles.every((x) => typeof x === 'string' && x.length >= 1 && x.length <= 64)) {
          fehl('Feld "profiles" muss eine nicht leere Liste von Profil-Ids sein.');
        }
        out.profiles = Array.isArray(profiles) ? profiles.filter((x) => typeof x === 'string') : ['*'];

        if (r.enabled !== undefined && typeof r.enabled !== 'boolean') fehl('Feld "enabled" muss wahr oder falsch sein.');
        out.enabled = r.enabled !== false;
        rules.push(out);
      });
      if (termSumme > MAX_TERMS) errors.push('Insgesamt höchstens ' + MAX_TERMS + ' Begriffe je Datei erlaubt.');
    }

    if (errors.length) return { ok: false, errors };
    return { ok: true, policy: { version: 1, name: data.name, rules } };
  }

  // ---- toSpans ----

  const wortZeichen = (c) => c !== undefined && c !== '' && WORD_CHAR_RE.test(c);

  // Kleinschreibung, die die Laenge erhaelt (z. B. U+0130 bleibt unveraendert)
  function klein(s) {
    const low = s.toLowerCase();
    if (low.length === s.length) return low;
    let out = '';
    for (const ch of s) {
      const l = ch.toLowerCase();
      out += l.length === ch.length ? l : ch;
    }
    return out;
  }

  // Kompakter Trie je erstem Wort: Blaetter speichern den Rest als Zeichenkette
  function trieNeu() { return { kids: undefined, end: undefined, tail: undefined }; }
  function trieEinfuegen(knoten, s) {
    let i = 0;
    for (;;) {
      if (i === s.length) { knoten.end = s.length; return; }
      if (knoten.kids === undefined && knoten.end === undefined && knoten.tail === undefined) { knoten.tail = s.slice(i); return; }
      if (knoten.tail !== undefined) {
        const t = knoten.tail;
        knoten.tail = undefined;
        knoten.kids = new Map();
        const k = trieNeu();
        if (t.length === 1) k.end = 1; else k.tail = t.slice(1);
        knoten.kids.set(t[0], k);
      }
      if (!knoten.kids) knoten.kids = new Map();
      let k = knoten.kids.get(s[i]);
      if (!k) { k = trieNeu(); knoten.kids.set(s[i], k); }
      knoten = k;
      i++;
    }
  }

  // Alle Begriffe, die ab pos in text (Kleinform) beginnen -> Laengen (aufsteigend)
  function trieSuche(wurzel, text, pos) {
    const laengen = [];
    let knoten = wurzel;
    let i = pos;
    for (;;) {
      if (knoten.end !== undefined) laengen.push(i - pos);
      if (knoten.tail !== undefined) {
        if (text.startsWith(knoten.tail, i)) laengen.push(i - pos + knoten.tail.length);
        return laengen;
      }
      if (!knoten.kids || i >= text.length) return laengen;
      knoten = knoten.kids.get(text[i]);
      if (!knoten) return laengen;
      i++;
    }
  }

  function erstesWort(t) {
    const m = /^[\p{L}\p{N}_]+/u.exec(t);
    return m ? m[0] : '';
  }

  // Index je Listenregel, am Regelobjekt zwischengespeichert (Richtlinie selbst bleibt unveraendert)
  const indexCache = new WeakMap();
  function listenIndex(regel) {
    let idx = indexCache.get(regel);
    if (idx) return idx;
    idx = new Map();
    for (const t of regel.terms) {
      const s = regel.caseSensitive ? t : klein(t);
      const w = erstesWort(s);
      if (!w) continue;
      let wurzel = idx.get(w);
      if (!wurzel) { wurzel = trieNeu(); idx.set(w, wurzel); }
      trieEinfuegen(wurzel, s);
    }
    indexCache.set(regel, idx);
    return idx;
  }

  function spanVon(regel, text, start, end) {
    return { start, end, pfx: regel.category, col: '#ff3b30', id: 'custom', prio: 0, meth: 'Eigene Regel', hard: true, val: text.slice(start, end) };
  }

  function sucheRegex(regel, maskiert, text, out) {
    if (!checkPattern(regel.pattern, regel.flags).ok) return; // nie ungeprueft ausfuehren
    const re = new RegExp(regel.pattern, 'g' + (regel.flags || ''));
    let m;
    while ((m = re.exec(maskiert)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      if (m[0].indexOf('\u0000') === -1) out.push(spanVon(regel, text, m.index, m.index + m[0].length));
    }
  }

  function sucheListe(regel, maskiert, text, out) {
    const idx = listenIndex(regel);
    if (idx.size === 0) return;
    const heu = regel.caseSensitive ? maskiert : klein(maskiert);
    const lauf = new RegExp(WORD_RUN_RE.source, 'gu');
    let frei = 0; // Treffer derselben Regel ueberlappen nicht
    let w;
    while ((w = lauf.exec(maskiert)) !== null) {
      const s = w.index;
      if (s < frei) continue;
      const wurzel = idx.get(heu.slice(s, s + w[0].length));
      if (!wurzel) continue;
      const laengen = trieSuche(wurzel, heu, s);
      for (let k = laengen.length - 1; k >= 0; k--) {
        const e = s + laengen[k];
        if (wortZeichen(maskiert[e])) continue; // Wortgrenze danach
        if (maskiert.slice(s, e).indexOf('\u0000') !== -1) continue;
        out.push(spanVon(regel, text, s, e));
        frei = e;
        break;
      }
    }
  }

  function toSpans(policy, text, profileId) {
    const t = typeof text === 'string' ? text : '';
    const out = [];
    if (!policy || !Array.isArray(policy.rules) || t === '') return out;
    const maskiert = placeholder.mask(t);
    for (const r of policy.rules) {
      if (!r || r.enabled === false) continue;
      if (!Array.isArray(r.profiles) || !(r.profiles.includes('*') || r.profiles.includes(profileId))) continue;
      if (r.type === 'regex') sucheRegex(r, maskiert, t, out);
      else if (r.type === 'list') sucheListe(r, maskiert, t, out);
    }
    return out.sort((a, b) => a.start - b.start); // stabil: gleiche Starts behalten die Regelreihenfolge
  }

  return { parse, checkPattern, toSpans };
});
