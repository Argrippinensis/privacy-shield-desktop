// Richtliniendatei und sichere Regex-Teilmenge (PSLib.policy), reines Modul ohne Oberflaechenzugriff.
// Sicherheitsgrenze: eine laufende JS-Regex laesst sich nicht abbrechen. Deshalb werden nur Muster
// zugelassen, deren Laufzeit linear mit dem Text waechst (kein Rueckverfolgungs-Explosionsrisiko).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./placeholder.js'));
  else { root.PSLib = root.PSLib || {}; root.PSLib.policy = factory(root.PSLib.placeholder); }
})(typeof self !== 'undefined' ? self : this, function (placeholder) {
  'use strict';

  // Alle deutschen Texte des Moduls (spaeter mechanisch auf t() umstellbar)
  const TEXT = {
    unbegrenzt: 'Unbegrenzte Wiederholungen (* und +) sind nicht erlaubt. Schreiben Sie z. B. {1,20}.',
    aufwand: 'Das Muster ist zu aufwendig (Wiederholungen mal feste Zeichenfolge). Verwenden Sie kleinere Grenzen oder weniger feste Zeichen nach den Wiederholungen.',
    verschachtelt: (max) => 'Die Wiederholungen sind zu verschachtelt (Produkt der Obergrenzen über ' + max + '). Verwenden Sie kleinere Grenzen.',
    rueckverweis: 'Rückverweise sind nicht erlaubt.',
    vorausschau: 'Vorausschau, Rückschau und benannte Gruppen sind nicht erlaubt.',
    syntax: 'Ungültige Regex-Syntax.',
    obergrenze: (max) => 'Die Obergrenze einer Wiederholung darf höchstens ' + max + ' sein.',
    gruppeQuantor: 'Wiederholungen auf Gruppen sind nicht erlaubt (nur ?).',
    gruppeAlternative: 'Alternativen in einer Gruppe mit Wiederholung sind nicht erlaubt.',
    musterFehlt: 'Das Muster fehlt oder ist kein Text.',
    musterLeer: 'Das Muster darf nicht leer sein.',
    musterLang: (max) => 'Das Muster ist zu lang (höchstens ' + max + ' Zeichen).',
    flags: 'Zulässige Flags sind nur "" und "i".',
    keinText: 'Die Richtlinie ist kein Text.',
    zuGross: 'Die Richtliniendatei ist größer als 1 MiB.',
    keinJson: 'Die Datei ist kein gültiges JSON.',
    verbotenerSchluessel: (k) => 'Verbotener Schlüssel: ' + k,
    keinObjekt: 'Die Richtlinie muss ein Objekt sein.',
    version: 'Nicht unterstützte Version (erwartet: 1).',
    nameFehlt: 'Feld "name" fehlt oder ist kein Text.',
    nameLang: 'Feld "name" ist länger als 80 Zeichen.',
    rulesFehlt: 'Feld "rules" fehlt oder ist keine Liste.',
    zuvieleRegeln: (max) => 'Mehr als ' + max + ' Regeln.',
    regelId: (id) => 'Regel "' + id + '"',
    regelNr: (nr) => 'Regel Nr. ' + nr,
    regelKeinObjekt: 'ist kein Objekt.',
    idFehlt: 'Feld "id" fehlt oder entspricht nicht ^[a-z][a-z0-9_-]{0,31}$.',
    idDoppelt: 'doppelte id.',
    labelFehlt: 'Feld "label" fehlt oder ist kein Text.',
    labelLang: 'Feld "label" ist länger als 80 Zeichen.',
    termsFehlt: 'Feld "terms" fehlt oder ist keine Liste.',
    termsLeer: 'Feld "terms" ist leer.',
    begriffUngueltig: (nr) => 'Begriff Nr. ' + nr + ' ist ungültig (1 bis 200 Zeichen, beginnt mit Buchstabe oder Ziffer).',
    weitereBegriffe: (anz) => anz + ' weitere ungültige Begriffe.',
    caseSensitive: 'Feld "caseSensitive" muss wahr oder falsch sein.',
    typ: 'Feld "type" muss "regex" oder "list" sein.',
    kategorie: 'Feld "category" entspricht nicht ^[A-Z][A-Z0-9_]{1,19}$.',
    profile: 'Feld "profiles" muss eine nicht leere Liste von Profil-Ids sein.',
    enabled: 'Feld "enabled" muss wahr oder falsch sein.',
    zuvieleBegriffe: (max) => 'Insgesamt höchstens ' + max + ' Begriffe je Datei erlaubt.',
    methode: 'Eigene Regel',
    regelUngueltig: (nr) => 'Die Richtlinie enthält eine ungültige Regel (Nr. ' + nr + ') und kann nicht angewendet werden.',
  };

  const MAX_BYTES = 1024 * 1024;
  const MAX_RULES = 100;
  const MAX_TERMS = 5000;
  const MAX_PATTERN = 200;
  const MAX_UPPER = 64;
  const MAX_PRODUCT = 1000;
  const MAX_AUFWAND = 3000; // Produkt der Obergrenzen mal feste Laenge (gemessen: 1000 Einheiten bis ca. 0,65 s je 100.000 Zeichen)
  const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];
  const ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;
  const CATEGORY_RE = /^[A-Z][A-Z0-9_]{1,19}$/;
  const TERM_START_RE = /^[\p{L}\p{N}]/u;
  const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
  const WORD_RUN_RE = /[\p{L}\p{N}_]+/gu;
  const QUANTOR_RE = /\{(\d+)(?:(,)(\d*))?\}/y;

  // ---- Regex-Pruefer: echter Parser der sicheren Teilmenge ----

  const EINZEL = { zweige: 0, laenge: 1 };
  const NULL_LAENGE = { zweige: 0, laenge: 0 };

  class Abgelehnt extends Error {}
  const nein = (msg) => { throw new Abgelehnt(msg); };

  // Zerlegt das (bereits syntaktisch gueltige) Muster; wirft Abgelehnt bei Verstoss.
  function pruefeTeilmenge(p) {
    const n = p.length;
    let i = 0;
    let produkt = 1;
    const mal = (f) => {
      produkt *= f;
      if (produkt > MAX_PRODUCT) nein(TEXT.verschachtelt(MAX_PRODUCT));
    };

    // Alternative (a|b|...) -> { zweige, laenge } (laenge = feste Strecke, die je Wahlmoeglichkeit erneut geprueft wird)
    function alternative(tiefe) {
      let zweige = 0;
      let laenge = 0;
      for (;;) {
        laenge = Math.max(laenge, folge(tiefe));
        zweige++;
        if (p[i] === '|') { i++; continue; }
        return { zweige, laenge };
      }
    }

    // -> feste Strecke der Folge
    function folge(tiefe) {
      let summe = 0;
      while (i < n && p[i] !== '|' && !(p[i] === ')' && tiefe > 0)) {
        const gruppe = atom(tiefe);
        const oben = quantor(gruppe);
        summe += gruppe.laenge * oben;
      }
      return summe;
    }

    // -> { zweige, laenge }; zweige ist 0 bei Nicht-Gruppen
    function atom(tiefe) {
      const c = p[i];
      if (c === '\\') {
        const d = p[i + 1];
        if (d !== undefined && (/[1-9]/.test(d) || d === 'k')) nein(TEXT.rueckverweis);
        i += 2;
        return EINZEL;
      }
      if (c === '[') {
        i++;
        if (p[i] === '^') i++;
        while (i < n) {
          if (p[i] === '\\') i += 2;
          else if (p[i] === ']') { i++; break; }
          else i++;
        }
        return EINZEL;
      }
      if (c === '(') {
        i++;
        if (p[i] === '?') {
          if (p[i + 1] !== ':') nein(TEXT.vorausschau);
          i += 2;
        }
        const { zweige, laenge } = alternative(tiefe + 1);
        if (p[i] !== ')') nein(TEXT.syntax);
        i++;
        if (zweige > 1) mal(zweige);
        return { zweige, laenge };
      }
      i++; // Zeichen, ".", "^", "$" oder ein einzelnes "{" ohne Quantorform
      return c === '^' || c === '$' ? NULL_LAENGE : EINZEL;
    }

    // -> Faktor fuer die feste Strecke: 1 ohne Quantor, n bei {n}, 0 bei veraenderlichen Teilen (die zaehlt das Produkt)
    function quantor(gruppe) {
      const c = p[i];
      if (c === '*' || c === '+') nein(TEXT.unbegrenzt);
      let faktor = 0;
      let wdh = 1;
      let nurFrage = false;
      if (c === '?') {
        i++;
        faktor = 2;
        wdh = 0;
        nurFrage = true;
      } else if (c === '{') {
        QUANTOR_RE.lastIndex = i; // klebend: ganze Zahl lesen, nie abschneiden (wie V8)
        const m = QUANTOR_RE.exec(p);
        if (!m) return 1; // Klammer ohne Quantorform ist ein Literal
        if (m[2] && m[3] === '') nein(TEXT.unbegrenzt);
        const oben = Number(m[2] ? m[3] : m[1]);
        if (!(oben <= MAX_UPPER)) nein(TEXT.obergrenze(MAX_UPPER));
        // Spezifikation: {m,n} zaehlt n, {n} zaehlt 1. Bei m = 0 gibt es n + 1 Moeglichkeiten
        // (wie bei ?), das gilt als Faktor, sonst wuerde a{0,2} 9-mal durchgehen.
        faktor = m[2] ? (Number(m[1]) === 0 ? oben + 1 : Math.max(oben, 1)) : 1;
        wdh = !m[2] || m[1] === m[3] ? oben : 0;
        i += m[0].length;
      } else return 1;
      if (gruppe.zweige > 0 && !nurFrage) nein(TEXT.gruppeQuantor);
      if (gruppe.zweige > 1) nein(TEXT.gruppeAlternative);
      if (gruppe.zweige > 0) wdh = 1; // Inhalt der optionalen Gruppe wird je Wahl erneut geprueft
      if (p[i] === '?') i++; // genügsame Variante, gleiche Obergrenze
      mal(faktor);
      return wdh;
    }

    const gesamt = alternative(0);
    if (produkt * (gesamt.laenge + 1) > MAX_AUFWAND) nein(TEXT.aufwand);
  }

  function checkPattern(pattern, flags) {
    if (typeof pattern !== 'string') return { ok: false, error: TEXT.musterFehlt };
    if (pattern.length === 0) return { ok: false, error: TEXT.musterLeer };
    if (pattern.length > MAX_PATTERN) return { ok: false, error: TEXT.musterLang(MAX_PATTERN) };
    const f = flags === undefined ? '' : flags;
    if (f !== '' && f !== 'i') return { ok: false, error: TEXT.flags };
    try { new RegExp(pattern, f); } catch (e) { return { ok: false, error: TEXT.syntax }; }
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
    if (typeof jsonString !== 'string') return { ok: false, errors: [TEXT.keinText] };
    if (jsonString.length > MAX_BYTES || (jsonString.length * 3 > MAX_BYTES && byteLaenge(jsonString) > MAX_BYTES)) {
      return { ok: false, errors: [TEXT.zuGross] };
    }
    let data;
    try { data = JSON.parse(jsonString); } catch (e) { return { ok: false, errors: [TEXT.keinJson] }; }
    const verboten = verbotenerSchluessel(data);
    if (verboten !== null) return { ok: false, errors: [TEXT.verbotenerSchluessel(verboten)] };
    if (!isObj(data)) return { ok: false, errors: [TEXT.keinObjekt] };

    const errors = [];
    if (data.version !== 1) errors.push(TEXT.version);
    if (typeof data.name !== 'string') errors.push(TEXT.nameFehlt);
    else if (data.name.length > 80) errors.push(TEXT.nameLang);
    if (!Array.isArray(data.rules)) errors.push(TEXT.rulesFehlt);
    else if (data.rules.length > MAX_RULES) errors.push(TEXT.zuvieleRegeln(MAX_RULES));

    const rules = [];
    if (Array.isArray(data.rules) && data.rules.length <= MAX_RULES) {
      const gesehen = new Set();
      let termSumme = 0;
      data.rules.forEach((r, idx) => {
        const hat = (typeof r === 'object' && r !== null && !Array.isArray(r) && typeof r.id === 'string' && ID_RE.test(r.id));
        const wer = hat ? TEXT.regelId(r.id) : TEXT.regelNr(idx + 1);
        const fehl = (msg) => errors.push(wer + ': ' + msg);
        if (!isObj(r)) return fehl(TEXT.regelKeinObjekt);
        if (!hat) fehl(TEXT.idFehlt);
        else if (gesehen.has(r.id)) fehl(TEXT.idDoppelt);
        else gesehen.add(r.id);
        if (typeof r.label !== 'string') fehl(TEXT.labelFehlt);
        else if (r.label.length > 80) fehl(TEXT.labelLang);
        const out = { id: hat ? r.id : '', label: typeof r.label === 'string' ? r.label : '', type: r.type };

        if (r.type === 'regex') {
          const flags = r.flags === undefined ? '' : r.flags;
          const chk = checkPattern(r.pattern, flags);
          if (!chk.ok) fehl(chk.error);
          out.pattern = r.pattern;
          out.flags = flags;
        } else if (r.type === 'list') {
          if (!Array.isArray(r.terms)) fehl(TEXT.termsFehlt);
          else if (r.terms.length < 1) fehl(TEXT.termsLeer);
          else {
            termSumme += r.terms.length;
            let bad = 0;
            r.terms.forEach((t, k) => {
              if (typeof t === 'string' && t.length >= 1 && t.length <= 200 && TERM_START_RE.test(t)) return;
              if (++bad <= 5) fehl(TEXT.begriffUngueltig(k + 1));
            });
            if (bad > 5) fehl(TEXT.weitereBegriffe(bad - 5));
          }
          if (r.caseSensitive !== undefined && typeof r.caseSensitive !== 'boolean') fehl(TEXT.caseSensitive);
          out.terms = Array.isArray(r.terms) ? r.terms.filter((t) => typeof t === 'string') : [];
          out.caseSensitive = r.caseSensitive === true;
        } else {
          fehl(TEXT.typ);
        }

        const category = r.category === undefined ? 'EIGEN' : r.category;
        if (typeof category !== 'string' || !CATEGORY_RE.test(category)) fehl(TEXT.kategorie);
        out.category = category;

        const profiles = r.profiles === undefined ? ['*'] : r.profiles;
        if (!Array.isArray(profiles) || profiles.length < 1 || !profiles.every((x) => typeof x === 'string' && x.length >= 1 && x.length <= 64)) {
          fehl(TEXT.profile);
        }
        out.profiles = Array.isArray(profiles) ? profiles.filter((x) => typeof x === 'string') : ['*'];

        if (r.enabled !== undefined && typeof r.enabled !== 'boolean') fehl(TEXT.enabled);
        out.enabled = r.enabled !== false;
        rules.push(out);
      });
      if (termSumme > MAX_TERMS) errors.push(TEXT.zuvieleBegriffe(MAX_TERMS));
    }

    if (errors.length) return { ok: false, errors };
    for (const r of rules) { Object.freeze(r.terms); Object.freeze(r.profiles); Object.freeze(r); }
    return { ok: true, policy: Object.freeze({ version: 1, name: data.name, rules: Object.freeze(rules) }) };
  }

  // ---- toSpans ----

  // Wortzeichen an Position e (ganzes Zeichen, auch ausserhalb der BMP)
  const wortZeichenAn = (t, e) => {
    const cp = t.codePointAt(e);
    return cp !== undefined && WORD_CHAR_RE.test(String.fromCodePoint(cp));
  };

  // Kleinschreibung zeichenweise und laengenerhaltend (z. B. U+0130 bleibt unveraendert, Sigma stets gleich)
  function klein(s) {
    let out = '';
    for (const ch of s) {
      const l = ch.toLowerCase();
      out += l.length === ch.length ? l : ch;
    }
    return out;
  }

  // Laengengleiche Angleichung wie normalizeForDetection des Kerns (Positionen bleiben gueltig)
  function normalisiere(t) {
    return t
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      .replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
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
    for (const t0 of regel.terms) {
      const t = normalisiere(t0); // wie der Kern den Text: Leerraumvarianten und Vollbreite
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
    return { start, end, pfx: regel.category, col: '#ff3b30', id: 'custom', prio: 0, meth: TEXT.methode, hard: true, val: text.slice(start, end) };
  }

  function sucheRegex(regel, maskiert, text, out) {
    const re = new RegExp(regel.pattern, 'g' + (regel.flags || ''));
    let m;
    while ((m = re.exec(maskiert)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      if (m[0].indexOf('\u0000') === -1) out.push(spanVon(regel, text, m.index, m.index + m[0].length));
      else re.lastIndex = m.index + 1; // verworfener Treffer darf einen echten spaeteren nicht verdecken
    }
  }

  function sucheListe(regel, maskiert, text, out) {
    const idx = listenIndex(regel);
    if (idx.size === 0) return;
    const heu = regel.caseSensitive ? maskiert : klein(maskiert);
    const lauf = new RegExp(WORD_RUN_RE.source, 'gu');
    let w;
    while ((w = lauf.exec(maskiert)) !== null) {
      const s = w.index;
      const wurzel = idx.get(heu.slice(s, s + w[0].length));
      if (!wurzel) continue;
      const laengen = trieSuche(wurzel, heu, s);
      for (let k = laengen.length - 1; k >= 0; k--) { // je Start der laengste Treffer; Ueberlappung loest der Kern
        const e = s + laengen[k];
        if (wortZeichenAn(maskiert, e)) continue; // Wortgrenze danach
        if (maskiert.slice(s, e).indexOf('\u0000') !== -1) continue;
        out.push(spanVon(regel, text, s, e));
        break;
      }
    }
  }

  // Regeln, die nicht aus parse stammen, werden vor der Ausfuehrung erneut geprueft
  function regelGueltig(r) {
    if (r.type === 'regex') return checkPattern(r.pattern, r.flags).ok;
    if (r.type === 'list') return Array.isArray(r.terms) && r.terms.every((x) => typeof x === 'string');
    return false;
  }

  function toSpans(policy, text, profileId) {
    const t = typeof text === 'string' ? text : '';
    const out = [];
    if (!policy || !Array.isArray(policy.rules) || t === '') return out;
    const maskiert = placeholder.mask(t);
    policy.rules.forEach((r, idx) => {
      if (!r || r.enabled === false) return;
      if (!Array.isArray(r.profiles) || !(r.profiles.includes('*') || r.profiles.includes(profileId))) return;
      if (!regelGueltig(r)) throw new Error(TEXT.regelUngueltig(idx + 1)); // nie ungeprueft ausfuehren, nie still ueberspringen
      if (r.type === 'regex') sucheRegex(r, maskiert, t, out);
      else sucheListe(r, maskiert, t, out);
    });
    return out.sort((a, b) => a.start - b.start); // stabil: gleiche Starts behalten die Regelreihenfolge
  }

  return { parse, checkPattern, toSpans };
});
