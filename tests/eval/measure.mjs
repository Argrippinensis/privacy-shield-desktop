// Q2.fix: Leckmessung der Erkennungsauswertung. Reine Funktionen ohne Seiteneffekte, gemeinsam genutzt von
// run-eval.mjs (summarize) und tests/realdocs.test.mjs. Ergebnisse nennen nur Typ und Art, nie Klartextwerte.
//
// Begriffe: Ein Wert (truth-Eintrag) hat Fragmente, die nach dem Anonymisieren verschwunden sein muessen.
//   importiert  alle (gemessenen) Fragmente stehen im input (Import/OCR hat sie erhalten); nur diese stehen im Nenner
//   verloren    mindestens ein Fragment fehlt im input
//   undicht     importierter Wert, von dem in der Ausgabe etwas steht: voll (Fragment), kopf (Anfang bleibt vor dem
//               Platzhalter), rumpf (Ende bleibt nach dem Platzhalter)

// Benannte Schwellen
export const MIN_PART = 4;     // Mindestlaenge (alphanumerische Zeichen) eines Teilrests vor/nach einem Platzhalter
export const MIN_OCR_LEN = 4;  // Mindestlaenge eines verlorenen Fragments, damit eine OCR-Variante gesucht wird
export const MAX_EDIT = 1;     // Editierdistanz der OCR-Variante (Zeichenverwechslung, ein Zeichen mehr oder weniger)

// Allgemeinwoerter (Anreden, Titel, Strassenarten, Artikel/Praepositionen in Namen, Rechtsformen): ein Rest, der nur aus
// ihnen besteht, ist kein Teilrest des Werts; es zaehlt erst, wenn Name, Hausnummer oder Stamm davor/danach steht.
export const GENERAL_WORDS = new Set([
  'herr', 'herrn', 'frau', 'fraeulein', 'fräulein', 'dr', 'prof', 'dipl', 'ing', 'med', 'mag', 'mr', 'mrs', 'ms', 'madame', 'monsieur', 'sig', 'sigra', 'senor', 'señor', 'senora', 'señora',
  'strasse', 'straße', 'str', 'weg', 'platz', 'allee', 'gasse', 'ring', 'damm', 'ufer', 'steig', 'pfad', 'markt', 'street', 'road', 'avenue', 'lane', 'calle', 'rue', 'via', 'ul', 'plaza', 'corso', 'avenida', 'viale', 'piazza',
  'am', 'an', 'der', 'die', 'das', 'dem', 'im', 'in', 'zu', 'zum', 'zur', 'von', 'van', 'vom', 'de', 'del', 'di', 'la', 'le', 'du', 'des', 'the', 'of',
  'gmbh', 'ag', 'kg', 'ug', 'mbh', 'co', 'ev', 'praxis', 'kanzlei', 'firma',
]);
const onlyGeneral = (s) => {
  const toks = s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  return toks.length > 0 && toks.every((t) => GENERAL_WORDS.has(t));
};

const PLACEHOLDER = /\{\{[A-Z_0-9.]+\}\}/g;
const ALNUM = /[\p{L}\p{N}]/u;
const alnumCount = (s) => (s.match(/[\p{L}\p{N}]/gu) || []).length;
const isAlnum = (c) => c !== undefined && c !== '' && ALNUM.test(c);

// Ziffernwert (IBAN, Karte, Telefon, Steuer-ID): Fragment aus Grossbuchstaben, Ziffern und Leerzeichen mit mindestens einer Ziffer
const isDigitValue = (f) => /^[0-9A-Z][0-9A-Z ]*$/.test(f) && /\d/.test(f);

// Links vom Fragment im input stehender Wertkopf (zusammenhaengende Gruppen aus Grossbuchstaben/Ziffern, durch einzelne Leerzeichen getrennt)
function headOf(input, frag) {
  const at = input.indexOf(frag);
  if (at <= 0) return '';
  const w = (c) => /[0-9A-Z]/.test(c);
  let i = at;
  while (i > 0 && w(input[i - 1])) i--;
  while (i > 1 && input[i - 1] === ' ' && w(input[i - 2])) { i--; while (i > 0 && w(input[i - 1])) i--; }
  return input.slice(i, at);
}

// Gemeinsames Suffix zweier Zeichenketten
function commonSuffix(a, b) {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}
function commonPrefix(a, b) {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

// Steht ein Anfang des Werts (V = Kopf + Fragment) unmittelbar vor einem Platzhalter?
function hasHead(out, V, headLen, spaceOk) {
  PLACEHOLDER.lastIndex = 0;
  let m;
  while ((m = PLACEHOLDER.exec(out))) {
    let B = out.slice(0, m.index);
    if (spaceOk && B.endsWith(' ')) B = B.slice(0, -1);
    for (let j = Math.max(headLen, 1); j < V.length; j++) {
      const L = commonSuffix(B, V.slice(0, j));
      if (L === 0 || alnumCount(B.slice(B.length - L)) < MIN_PART) continue;
      if (isAlnum(B[B.length - L - 1])) continue; // Wortgrenze links
      if (onlyGeneral(B.slice(B.length - L))) continue; // nur Anrede/Strassenart steht davor
      return true;
    }
  }
  return false;
}

// Steht ein Ende des Fragments unmittelbar nach einem Platzhalter?
function hasTail(out, f) {
  PLACEHOLDER.lastIndex = 0;
  let m;
  while ((m = PLACEHOLDER.exec(out))) {
    const A = out.slice(m.index + m[0].length);
    for (let i = 1; i < f.length; i++) {
      const L = commonPrefix(A, f.slice(i));
      if (L === 0 || alnumCount(A.slice(0, L)) < MIN_PART) continue;
      if (isAlnum(A[L])) continue; // Wortgrenze rechts
      if (onlyGeneral(A.slice(0, L))) continue; // nur Strassenart/Rechtsform steht danach
      return true;
    }
  }
  return false;
}

// Editierabstand hoechstens 1 (Ersetzung, Einfuegung, Loeschung)?
function withinOne(a, b) {
  if (Math.abs(a.length - b.length) > MAX_EDIT) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
  return a.slice(i) === b.slice(i + 1);
}

// Steht eine leicht veraenderte Form des Fragments unmaskiert in der Ausgabe?
function variantIn(out, f) {
  if (f.length < MIN_OCR_LEN) return false;
  for (let len = f.length - MAX_EDIT; len <= f.length + MAX_EDIT; len++) {
    for (let p = 0; p + len <= out.length; p++) {
      if (withinOne(f, out.slice(p, p + len))) return true;
    }
  }
  return false;
}

// Art des Lecks eines Fragments: 'voll' | 'kopf' | 'rumpf' | null
function fragKind(out, input, f) {
  if (out.includes(f)) return 'voll';
  const digit = isDigitValue(f);
  const head = digit && input ? headOf(input, f) : '';
  if (hasHead(out, head + f, head.length, digit)) return 'kopf';
  if (hasTail(out, f)) return 'rumpf';
  return null;
}
const RANK = { voll: 3, kopf: 2, rumpf: 1 };

export function measureDoc(doc, out, { input, minFrag = 0 } = {}) {
  const inp = input ?? doc.text; // undefined: jeder Wert gilt als importiert
  const res = { imported: 0, lost: 0, leaked: 0, hits: [], ocrChanged: 0, unmeasured: 0 };
  for (const t of doc.truth || []) {
    const frags = t.frags.filter((x) => x.length >= minFrag);
    if (!frags.length) { res.unmeasured++; continue; }
    const missing = inp === undefined ? [] : frags.filter((x) => !inp.includes(x));
    if (missing.length) {
      res.lost++;
      if (missing.some((x) => variantIn(out, x))) res.ocrChanged++;
      continue;
    }
    res.imported++;
    let best = null;
    for (const f of frags) {
      const k = fragKind(out, inp, f);
      if (k && (!best || RANK[k] > RANK[best])) best = k;
    }
    if (best) { res.leaked++; res.hits.push({ type: t.type, kind: best }); }
  }
  return res;
}

export function mergeResults(list) {
  const m = { imported: 0, lost: 0, leaked: 0, hits: [], ocrChanged: 0, unmeasured: 0 };
  for (const r of list) {
    for (const k of ['imported', 'lost', 'leaked', 'ocrChanged', 'unmeasured']) m[k] += r[k] || 0;
    m.hits.push(...(r.hits || []));
  }
  return m;
}

export function rates(res) {
  const all = res.imported + res.lost;
  return {
    importRate: all ? res.imported / all : 1,
    leakRate: res.imported ? res.leaked / res.imported : 0,
  };
}

// TXT, DOCX, PDF mit Textebene: der Import muss alle Werte erhalten. OCR: Verlust erlaubt, aber eigene Fehlerklasse.
export function assessImport(format, res) {
  if (format === 'OCR') return { ok: true, errorClass: res.lost > 0 ? 'ocr' : null };
  return res.lost > 0 ? { ok: false, errorClass: 'import' } : { ok: true, errorClass: null };
}
