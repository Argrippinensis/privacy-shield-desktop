// PSLib.policy (C3.m): Richtliniendatei und sichere Regex-Teilmenge (Entscheidung F4)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const P = loadLib('policy');

const regelRegex = (o = {}) => ({ id: 'kunde', label: 'Kundennummer', type: 'regex', pattern: 'K-\\d{6}', flags: '', category: 'EIGEN', profiles: ['*'], ...o });
const regelListe = (o = {}) => ({ id: 'projekte', label: 'Projektnamen', type: 'list', terms: ['Projekt Falke', 'Alpha-Programm'], caseSensitive: false, category: 'EIGEN', profiles: ['standard', 'strict'], ...o });
const datei = (rules, o = {}) => JSON.stringify({ version: 1, name: 'Kanzlei Beispiel', rules, ...o });
const gueltig = () => datei([regelRegex(), regelListe()]);
const parseOk = (rules, o) => {
  const r = P.parse(datei(rules, o));
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  return r.policy;
};

// ---- parse: Grundfaelle ----

test('parse: gueltige Datei wird angenommen und liefert die Regeln', () => {
  const r = P.parse(gueltig());
  assert.equal(r.ok, true);
  assert.equal(r.policy.version, 1);
  assert.equal(r.policy.name, 'Kanzlei Beispiel');
  assert.equal(r.policy.rules.length, 2);
  assert.equal(r.policy.rules[0].id, 'kunde');
  assert.equal(r.policy.rules[0].pattern, 'K-\\d{6}');
  assert.deepEqual(r.policy.rules[1].terms, ['Projekt Falke', 'Alpha-Programm']);
});

test('parse: Standardwerte (category EIGEN, profiles ["*"], enabled true, caseSensitive false)', () => {
  const p = parseOk([{ id: 'a', label: 'A', type: 'regex', pattern: 'K-\\d{6}', flags: '' }, { id: 'b', label: 'B', type: 'list', terms: ['Falke'] }]);
  for (const r of p.rules) {
    assert.equal(r.category, 'EIGEN');
    assert.deepEqual(r.profiles, ['*']);
    assert.notEqual(r.enabled, false);
  }
  assert.equal(p.rules[1].caseSensitive, false);
});

test('parse: kein JSON ergibt ok:false mit deutscher Fehlerzeile', () => {
  const r = P.parse('{ das ist kein json');
  assert.equal(r.ok, false);
  assert.ok(Array.isArray(r.errors) && r.errors.length >= 1);
  assert.equal(typeof r.errors[0], 'string');
});

test('parse: Version 2 wird abgelehnt', () => {
  const r = P.parse(datei([regelRegex()], { version: 2 }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.length >= 1);
});

test('parse: fehlendes Feld (rules) wird abgelehnt', () => {
  const r = P.parse(JSON.stringify({ version: 1, name: 'X' }));
  assert.equal(r.ok, false);
});

test('parse: fehlendes Feld in einer Regel (label) nennt die Regel-Id', () => {
  const regel = regelRegex(); delete regel.label;
  const r = P.parse(datei([regel]));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('kunde')), r.errors.join('|'));
});

test('parse: fehlendes Feld pattern bei type regex wird abgelehnt', () => {
  const regel = regelRegex(); delete regel.pattern;
  assert.equal(P.parse(datei([regel])).ok, false);
});

test('parse: fehlendes Feld terms bei type list wird abgelehnt', () => {
  const regel = regelListe(); delete regel.terms;
  assert.equal(P.parse(datei([regel])).ok, false);
});

test('parse: fehlender name wird abgelehnt', () => {
  assert.equal(P.parse(JSON.stringify({ version: 1, rules: [regelRegex()] })).ok, false);
});

test('parse: doppelte id wird abgelehnt und die id genannt', () => {
  const r = P.parse(datei([regelRegex(), regelListe({ id: 'kunde' })]));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('kunde')));
});

test('parse: Grenzen von id (Format)', () => {
  for (const id of ['', 'A', '1abc', 'ab cd', 'a'.repeat(33), 'ä']) {
    assert.equal(P.parse(datei([regelRegex({ id })])).ok, false, 'id ' + JSON.stringify(id));
  }
  for (const id of ['a', 'a'.repeat(32), 'k_1-x']) {
    assert.equal(P.parse(datei([regelRegex({ id })])).ok, true, 'id ' + id);
  }
});

test('parse: Grenzen von name (bis 80 Zeichen) und label (bis 80 Zeichen)', () => {
  assert.equal(P.parse(datei([regelRegex()], { name: 'n'.repeat(80) })).ok, true);
  assert.equal(P.parse(datei([regelRegex()], { name: 'n'.repeat(81) })).ok, false);
  assert.equal(P.parse(datei([regelRegex({ label: 'l'.repeat(80) })])).ok, true);
  assert.equal(P.parse(datei([regelRegex({ label: 'l'.repeat(81) })])).ok, false);
});

test('parse: hoechstens 100 Regeln', () => {
  const viele = n => Array.from({ length: n }, (_, i) => regelRegex({ id: 'r' + i }));
  assert.equal(P.parse(datei(viele(100))).ok, true);
  assert.equal(P.parse(datei(viele(101))).ok, false);
});

test('parse: category muss ^[A-Z][A-Z0-9_]{1,19}$ erfuellen', () => {
  for (const category of ['eigen', 'E', '1AB', 'AB CD', 'A'.repeat(21)]) {
    assert.equal(P.parse(datei([regelRegex({ category })])).ok, false, category);
  }
  for (const category of ['AB', 'A'.repeat(20), 'KUNDE_2']) {
    assert.equal(P.parse(datei([regelRegex({ category })])).ok, true, category);
  }
});

test('parse: unbekannter type wird abgelehnt', () => {
  assert.equal(P.parse(datei([regelRegex({ type: 'glob' })])).ok, false);
});

test('parse: Listenbegriffe, Grenzen (1 bis 200 Zeichen, Beginn mit Buchstabe oder Ziffer, nicht leer)', () => {
  assert.equal(P.parse(datei([regelListe({ terms: [] })])).ok, false);
  assert.equal(P.parse(datei([regelListe({ terms: [''] })])).ok, false);
  assert.equal(P.parse(datei([regelListe({ terms: ['-Falke'] })])).ok, false);
  assert.equal(P.parse(datei([regelListe({ terms: [' Falke'] })])).ok, false);
  assert.equal(P.parse(datei([regelListe({ terms: ['a'.repeat(201)] })])).ok, false);
  assert.equal(P.parse(datei([regelListe({ terms: ['a'.repeat(200)] })])).ok, true);
  assert.equal(P.parse(datei([regelListe({ terms: ['7Zwerge', 'Ärger'] })])).ok, true);
});

test('parse: hoechstens 5000 Begriffe je Datei insgesamt (ueber alle Listenregeln)', () => {
  const terme = (n, p) => Array.from({ length: n }, (_, i) => p + 'begriff' + i);
  assert.equal(P.parse(datei([regelListe({ terms: terme(5000, 'x') })])).ok, true);
  assert.equal(P.parse(datei([regelListe({ terms: terme(5001, 'x') })])).ok, false);
  const verteilt = [regelListe({ id: 'l1', terms: terme(3000, 'a') }), regelListe({ id: 'l2', terms: terme(2001, 'b') })];
  assert.equal(P.parse(datei(verteilt)).ok, false);
});

test('parse: unzulaessiges Regex-Muster in der Datei ergibt eine Fehlerzeile mit Regel-Id', () => {
  const r = P.parse(datei([regelRegex({ id: 'boese', pattern: '(a+)+$' })]));
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.includes('boese')), r.errors.join('|'));
});

test('parse: Fehlerzeilen nennen nie den Inhalt eines Begriffs', () => {
  const geheim = 'Geheimprojekt-Zeta';
  const r = P.parse(datei([regelListe({ id: 'liste', terms: [geheim, '-ungueltig'] })]));
  assert.equal(r.ok, false);
  assert.ok(r.errors.every(e => !e.includes(geheim) && !e.includes('-ungueltig')), r.errors.join('|'));
});

test('parse: Datei ueber 1 MiB wird abgelehnt', () => {
  const gross = datei([regelRegex()], { name: 'x' }) .replace('"rules"', '"zusatz":"' + 'x'.repeat(1024 * 1024 + 10) + '","rules"');
  assert.ok(gross.length > 1024 * 1024);
  assert.equal(P.parse(gross).ok, false);
});

// ---- parse: Prototype-Pollution ----

test('parse: __proto__ auf oberster Ebene wird als "Verbotener Schluessel" abgelehnt', () => {
  const r = P.parse('{"version":1,"name":"x","rules":[],"__proto__":{"polluted":true}}');
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /Verbotener Schl/.test(e)), r.errors.join('|'));
  assert.equal(({}).polluted, undefined);
});

test('parse: __proto__ innerhalb einer Regel wird abgelehnt', () => {
  const json = '{"version":1,"name":"x","rules":[{"id":"a","label":"A","type":"regex","pattern":"K-\\\\d{6}","flags":"","__proto__":{"polluted":true}}]}';
  const r = P.parse(json);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /Verbotener Schl/.test(e)));
  assert.equal(({}).polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
});

test('parse: constructor und prototype an beliebiger Stelle werden abgelehnt', () => {
  for (const json of [
    '{"version":1,"name":"x","rules":[],"constructor":{"prototype":{"polluted":true}}}',
    '{"version":1,"name":"x","rules":[],"prototype":{"a":1}}',
    '{"version":1,"name":"x","rules":[{"id":"a","label":"A","type":"list","terms":["Falke"],"extra":{"deep":{"constructor":1}}}]}',
  ]) {
    const r = P.parse(json);
    assert.equal(r.ok, false, json);
    assert.ok(r.errors.some(e => /Verbotener Schl/.test(e)), json);
  }
  assert.equal(({}).polluted, undefined);
});

test('parse: Ergebnisobjekt wird neu aufgebaut, unbekannte Felder werden verworfen', () => {
  const r = P.parse(datei([regelRegex({ unbekannt: 'x' })], { zusatz: 'y' }));
  assert.equal(r.ok, true);
  assert.equal(r.policy.zusatz, undefined);
  assert.equal(r.policy.rules[0].unbekannt, undefined);
  assert.equal(Object.getPrototypeOf(r.policy), Object.prototype);
});

// ---- checkPattern: angenommen ----

for (const muster of ['K-\\d{6}', 'VTR-\\d{4,8}', '[A-Z]{2}\\d{5,10}', '(?:Projekt|Vorgang)[ -]\\d{3,6}', '\\d{3}\\.\\d{3}\\.\\d{3}', 'ab(cd)?ef']) {
  test(`checkPattern: angenommen ${muster}`, () => {
    const r = P.checkPattern(muster, '');
    assert.equal(r.ok, true, JSON.stringify(r));
  });
}

test('checkPattern: Flag i ist erlaubt', () => {
  assert.equal(P.checkPattern('K-\\d{6}', 'i').ok, true);
});

test('checkPattern: fehlende Flags (undefined) zaehlen wie leer', () => {
  assert.equal(P.checkPattern('K-\\d{6}').ok, true);
});

// ---- checkPattern: abgelehnt ----

const abgelehnt = [
  ['K-\\d+', 'unbegrenztes +'],
  ['\\w*x', 'unbegrenztes *'],
  ['(a+)+$', 'klassisch boesartig'],
  ['(a|aa)+$', 'Alternation mit Gruppenquantor'],
  ['(a|b){1,5}', 'Quantor auf Gruppe'],
  ['(\\d{1,3}){1,3}', 'geschachtelte Quantoren'],
  ['(?=x)y', 'Vorausschau'],
  ['(?!x)y', 'negative Vorausschau'],
  ['(?<=x)y', 'Rueckschau'],
  ['(?<!x)y', 'negative Rueckschau'],
  ['(a)\\1', 'Rueckverweis'],
  ['(?<n>a)\\k<n>', 'benannte Gruppe mit Rueckverweis'],
  ['(?<n>a)', 'benannte Gruppe'],
  ['a{1,65}', 'obere Grenze ueber 64'],
  ['a{1,10}b{1,10}c{1,10}d{1,2}', 'Produkt 2000'],
  ['(', 'Syntaxfehler'],
  ['a{2,}', 'offenes {n,}'],
  ['(?:ab)*', 'Gruppe mit *'],
  ['(?:ab){2}', 'Gruppe mit {n}'],
  ['a*?', 'traege Variante von *'],
  ['a+?', 'traege Variante von +'],
];
for (const [muster, grund] of abgelehnt) {
  test(`checkPattern: abgelehnt ${muster} (${grund})`, () => {
    const t0 = Date.now();
    const r = P.checkPattern(muster, '');
    assert.ok(Date.now() - t0 < 500, 'Pruefung selbst muss sofort fertig sein');
    assert.equal(r.ok, false);
    assert.equal(typeof r.error, 'string');
    assert.ok(r.error.length > 0);
  });
}

test('checkPattern: Muster mit 201 Zeichen wird abgelehnt, mit 200 angenommen', () => {
  assert.equal(P.checkPattern('a'.repeat(201), '').ok, false);
  assert.equal(P.checkPattern('a'.repeat(200), '').ok, true);
});

test('checkPattern: Flags g, u, m, s, y und Kombinationen werden abgelehnt', () => {
  for (const flags of ['g', 'u', 'm', 's', 'y', 'gi', 'iu', 'ii']) {
    assert.equal(P.checkPattern('K-\\d{6}', flags).ok, false, 'Flags ' + flags);
  }
});

test('checkPattern: Meldung fuer * und + nennt Beispiel {1,20}', () => {
  const r = P.checkPattern('K-\\d+', '');
  assert.equal(r.ok, false);
  assert.match(r.error, /Unbegrenzte Wiederholungen/);
  assert.match(r.error, /\{1,20\}/);
});

// ---- checkPattern: Grenzfaelle der Teilmenge ----

test('checkPattern: obere Grenze genau 64 ist erlaubt, 65 nicht', () => {
  assert.equal(P.checkPattern('a{1,64}', '').ok, true);
  assert.equal(P.checkPattern('a{64}', '').ok, true);
  assert.equal(P.checkPattern('a{0,64}', '').ok, true);
  assert.equal(P.checkPattern('a{1,65}', '').ok, false);
  assert.equal(P.checkPattern('a{65}', '').ok, false);
});

test('checkPattern: ? und {n} sind erlaubt', () => {
  assert.equal(P.checkPattern('colou?r', '').ok, true);
  assert.equal(P.checkPattern('\\d{4}-\\d{2}', '').ok, true);
});

test('checkPattern: Produkt der oberen Grenzen genau 1000 erlaubt, 1001 abgelehnt', () => {
  assert.equal(P.checkPattern('a{1,10}b{1,10}c{1,10}', '').ok, true);
  assert.equal(P.checkPattern('a{1,10}b{1,10}c{1,10}d?', '').ok, false, '1000 * 2 = 2000');
  assert.equal(P.checkPattern('a{1,10}b{1,10}c{1,10}d{1}', '').ok, true, '{n} zaehlt 1: Produkt 1000');
  assert.equal(P.checkPattern('a{1,10}b{1,10}c{1,10}d{1,2}', '').ok, false, 'Produkt 2000');
  assert.equal(P.checkPattern('a{1,10}b{1,10}c{1,11}', '').ok, false, 'Produkt 1100');
});

test('checkPattern: ? zaehlt als 2 im Produkt', () => {
  // 2^10 = 1024 > 1000
  assert.equal(P.checkPattern('a?b?c?d?e?f?g?h?i?j?', '').ok, false);
  // 2^9 = 512
  assert.equal(P.checkPattern('a?b?c?d?e?f?g?h?i?', '').ok, true);
});

test('checkPattern: ? auf einer Gruppe ist erlaubt, andere Gruppenquantoren nicht', () => {
  assert.equal(P.checkPattern('ab(cd)?ef', '').ok, true);
  assert.equal(P.checkPattern('ab(?:cd)?ef', '').ok, true);
  assert.equal(P.checkPattern('ab(cd){1}ef', '').ok, false);
  assert.equal(P.checkPattern('ab(cd){0,1}ef', '').ok, false);
});

test('checkPattern: Alternation auf oberster Ebene und in Gruppen ohne Quantor erlaubt', () => {
  assert.equal(P.checkPattern('Projekt|Vorgang', '').ok, true);
  assert.equal(P.checkPattern('(?:Projekt|Vorgang)-\\d{3}', '').ok, true);
});

test('checkPattern: escapte Zeichen sind keine Quantoren', () => {
  assert.equal(P.checkPattern('a\\+b', '').ok, true);
  assert.equal(P.checkPattern('a\\*b', '').ok, true);
  assert.equal(P.checkPattern('\\(x\\)', '').ok, true);
  assert.equal(P.checkPattern('a\\\\+', '').ok, false, 'Rueckwaertsschraegstrich-Paar, danach echtes +');
});

test('checkPattern: Zeichenklassen mit * + ( ) { sind keine Quantoren', () => {
  assert.equal(P.checkPattern('[*+(){]x', '').ok, true);
  assert.equal(P.checkPattern('[a-z]{2,5}', '').ok, true);
  assert.equal(P.checkPattern('[\\]+]x', '').ok, true);
});

test('checkPattern: Rueckverweis \\1 bis \\9 ausserhalb von Klassen verboten', () => {
  for (let i = 1; i <= 9; i++) {
    assert.equal(P.checkPattern('(a)(b)(c)(d)(e)(f)(g)(h)(i)\\' + i, '').ok, false, '\\' + i);
  }
});

test('checkPattern: nicht-uebergebene Typen (kein String) werden sauber abgelehnt', () => {
  for (const v of [undefined, null, 42, {}, []]) {
    const r = P.checkPattern(v, '');
    assert.equal(r.ok, false);
    assert.equal(typeof r.error, 'string');
  }
});

test('checkPattern: leeres Muster wird abgelehnt', () => {
  assert.equal(P.checkPattern('', '').ok, false);
});

test('checkPattern: Pruefung boesartiger Muster haengt nicht (alle sofort fertig)', () => {
  const t0 = Date.now();
  for (const m of ['(a+)+$', '(a|aa)+$', '(.*)*x', '(a*)*b', '(x+x+)+y', '.*.*.*b', '(a|a)*$']) {
    assert.equal(P.checkPattern(m, '').ok, false, m);
  }
  assert.ok(Date.now() - t0 < 1000);
});

// ---- toSpans ----

test('toSpans: Regex-Regel liefert Spans mit allen Feldern', () => {
  const p = parseOk([regelRegex()]);
  const text = 'Kunde K-123456 ist bekannt.';
  const s = P.toSpans(p, text, 'standard');
  assert.equal(s.length, 1);
  assert.deepEqual(s[0], { start: 6, end: 14, pfx: 'EIGEN', col: '#ff3b30', id: 'custom', prio: 0, meth: 'Eigene Regel', hard: true, val: 'K-123456' });
});

test('toSpans: pfx entspricht der category der Regel', () => {
  const p = parseOk([regelRegex({ category: 'KUNDE' })]);
  assert.equal(P.toSpans(p, 'K-123456', 'standard')[0].pfx, 'KUNDE');
});

test('toSpans: Regel mit profiles ["strict"] greift nur im Profil strict', () => {
  const p = parseOk([regelRegex({ profiles: ['strict'] })]);
  assert.equal(P.toSpans(p, 'K-123456', 'strict').length, 1);
  assert.equal(P.toSpans(p, 'K-123456', 'standard').length, 0);
});

test('toSpans: profiles ["*"] greift in jedem Profil', () => {
  const p = parseOk([regelRegex({ profiles: ['*'] })]);
  for (const prof of ['standard', 'strict', 'lenient', 'irgendeins']) {
    assert.equal(P.toSpans(p, 'K-123456', prof).length, 1, prof);
  }
});

test('toSpans: Regel mit enabled false wird uebersprungen', () => {
  const p = parseOk([regelRegex({ enabled: false })]);
  assert.equal(P.toSpans(p, 'K-123456', 'standard').length, 0);
});

test('toSpans: mehrere Treffer einer Regel, nach start sortiert', () => {
  const p = parseOk([regelRegex()]);
  const s = P.toSpans(p, 'K-111111 und K-222222 und K-333333', 'standard');
  assert.deepEqual(s.map(x => x.val), ['K-111111', 'K-222222', 'K-333333']);
  assert.ok(s.every((x, i) => i === 0 || s[i - 1].start <= x.start));
});

test('toSpans: Treffer verschiedener Regeln sind insgesamt nach start sortiert und duerfen sich ueberschneiden', () => {
  const p = parseOk([
    regelRegex({ id: 'spaet', pattern: 'Falke \\d{3}', category: 'AA' }),
    regelRegex({ id: 'frueh', pattern: 'Projekt Falke', category: 'BB' }),
  ]);
  const s = P.toSpans(p, 'Projekt Falke 123', 'standard');
  assert.equal(s.length, 2);
  assert.ok(s[0].start <= s[1].start);
  assert.equal(s[0].val, 'Projekt Falke');
  assert.equal(s[1].val, 'Falke 123');
  assert.ok(s[0].end > s[1].start, 'Ueberschneidung bleibt erhalten');
});

test('toSpans: Regex-Flag i ignoriert die Gross-/Kleinschreibung', () => {
  const p = parseOk([regelRegex({ pattern: 'k-\\d{6}', flags: 'i' })]);
  assert.equal(P.toSpans(p, 'K-123456', 'standard').length, 1);
  const q = parseOk([regelRegex({ pattern: 'k-\\d{6}', flags: '' })]);
  assert.equal(P.toSpans(q, 'K-123456', 'standard').length, 0);
});

test('toSpans: Listenbegriff "Alpha-Programm" trifft "alpha-programm" bei caseSensitive false', () => {
  const p = parseOk([regelListe({ profiles: ['*'] })]);
  const text = 'Das alpha-programm laeuft.';
  const s = P.toSpans(p, text, 'standard');
  assert.equal(s.length, 1);
  assert.equal(s[0].val, 'alpha-programm');
  assert.equal(text.slice(s[0].start, s[0].end), 'alpha-programm');
});

test('toSpans: Listenbegriff trifft nicht "Alpha-Programmierer" und nicht "xAlpha-Programm"', () => {
  const p = parseOk([regelListe({ profiles: ['*'] })]);
  assert.equal(P.toSpans(p, 'Alpha-Programmierer', 'standard').length, 0);
  assert.equal(P.toSpans(p, 'xAlpha-Programm', 'standard').length, 0);
  assert.equal(P.toSpans(p, 'Alpha-Programm_2', 'standard').length, 0, 'Unterstrich ist Wortzeichen');
  assert.equal(P.toSpans(p, 'Alpha-Programm7', 'standard').length, 0, 'Ziffer ist Wortzeichen');
  assert.equal(P.toSpans(p, 'ÄAlpha-Programm', 'standard').length, 0, 'Unicode-Buchstabe davor');
  assert.equal(P.toSpans(p, 'Alpha-Programmé', 'standard').length, 0, 'Unicode-Buchstabe danach');
});

test('toSpans: Listenbegriff am Rand, vor Satzzeichen und Leerraum', () => {
  const p = parseOk([regelListe({ profiles: ['*'] })]);
  assert.equal(P.toSpans(p, 'Alpha-Programm', 'standard').length, 1);
  assert.equal(P.toSpans(p, '(Alpha-Programm), Alpha-Programm.\nAlpha-Programm', 'standard').length, 3);
});

test('toSpans: caseSensitive true unterscheidet Gross-/Kleinschreibung', () => {
  const p = parseOk([regelListe({ caseSensitive: true, profiles: ['*'] })]);
  assert.equal(P.toSpans(p, 'alpha-programm', 'standard').length, 0);
  assert.equal(P.toSpans(p, 'Alpha-Programm', 'standard').length, 1);
});

test('toSpans: Mehrwortbegriff "Projekt Falke" wird gefunden, auch wenn das erste Wort mehrfach vorkommt', () => {
  const p = parseOk([regelListe({ profiles: ['*'] })]);
  const text = 'Projekt Beta und Projekt Falke sowie Projekt Falkenhorst';
  const s = P.toSpans(p, text, 'standard');
  assert.equal(s.length, 1);
  assert.equal(s[0].val, 'Projekt Falke');
  assert.equal(s[0].start, text.indexOf('Projekt Falke'));
});

test('toSpans: Positionen beziehen sich auf den Originaltext bei Kleinschreibung mit U+0130', () => {
  const p = parseOk([regelListe({ terms: ['Falke'], profiles: ['*'] })]);
  const text = 'İİİ Falke İİİ falke';
  const s = P.toSpans(p, text, 'standard');
  assert.equal(s.length, 2);
  for (const x of s) assert.equal(text.slice(x.start, x.end), x.val);
  assert.deepEqual(s.map(x => x.val), ['Falke', 'falke']);
});

test('toSpans: Listenregel mit profiles ["strict"] greift nur im Profil strict', () => {
  const p = parseOk([regelListe({ profiles: ['strict'] })]);
  assert.equal(P.toSpans(p, 'Projekt Falke', 'strict').length, 1);
  assert.equal(P.toSpans(p, 'Projekt Falke', 'standard').length, 0);
});

test('toSpans: Spans enthalten nie einen Platzhalterbereich ({{NAME_1}})', () => {
  const p = parseOk([
    regelRegex({ id: 'alles', pattern: '[A-Z_]{1,10}\\d?', category: 'XX' }),
    regelListe({ id: 'l', terms: ['NAME_1', 'NAME'], profiles: ['*'] }),
  ]);
  const text = 'Hallo {{NAME_1}} und NAME_2.';
  const s = P.toSpans(p, text, 'standard');
  const platz = text.indexOf('{{NAME_1}}');
  for (const x of s) {
    assert.ok(x.end <= platz || x.start >= platz + '{{NAME_1}}'.length, `Span ${x.start}-${x.end} (${x.val}) liegt im Platzhalter`);
    assert.ok(!x.val.includes('\u0000'));
  }
  assert.ok(s.some(x => x.val.startsWith('NAME_2') || x.val === 'NAME_2'), 'Treffer ausserhalb bleibt erhalten');
});

test('toSpans: K-123456 innerhalb von {{...}} bleibt unberuehrt, ausserhalb wird es gefunden', () => {
  const p = parseOk([regelRegex()]);
  const text = '{{K-123456}} und K-654321';
  const s = P.toSpans(p, text, 'standard');
  assert.equal(s.length, 1);
  assert.equal(s[0].val, 'K-654321');
  assert.equal(s[0].start, text.indexOf('K-654321'));
});

test('toSpans: Treffer, der einen Platzhalter ueberspannt, entfaellt', () => {
  const p = parseOk([regelRegex({ pattern: 'Kunde [^.]{1,30}' })]);
  const s = P.toSpans(p, 'Kunde {{NAME_1}} fertig.', 'standard');
  assert.equal(s.length, 0);
});

test('toSpans: Eingabetext und Richtlinie bleiben unveraendert', () => {
  const p = parseOk([regelRegex(), regelListe()]);
  const kopie = JSON.stringify(p);
  const text = 'K-123456 Projekt Falke';
  P.toSpans(p, text, 'standard');
  assert.equal(JSON.stringify(p), kopie);
  assert.equal(text, 'K-123456 Projekt Falke');
});

test('toSpans: leerer Text und Richtlinie ohne Regeln ergeben leere Liste', () => {
  assert.deepEqual(P.toSpans(parseOk([regelRegex()]), '', 'standard'), []);
  assert.deepEqual(P.toSpans(parseOk([]), 'K-123456', 'standard'), []);
});

// ---- Laufzeit ----

test('Laufzeit: unguenstigstes zulaessiges Muster a{1,10}a{1,10}a{1,10}b auf 100.000 x a unter 3 s', () => {
  assert.equal(P.checkPattern('a{1,10}a{1,10}a{1,10}b', '').ok, true);
  const p = parseOk([regelRegex({ pattern: 'a{1,10}a{1,10}a{1,10}b' })]);
  const text = 'a'.repeat(100000);
  const t0 = Date.now();
  const s = P.toSpans(p, text, 'standard');
  const dt = Date.now() - t0;
  assert.equal(s.length, 0);
  assert.ok(dt < 3000, 'Dauer ' + dt + ' ms');
});

function begriffe(n) {
  return Array.from({ length: n }, (_, i) => 'Begriff' + i + ' Zusatz' + (i % 7));
}
function langerText(n, terme) {
  const teile = [];
  let len = 0, i = 0;
  while (len < n) {
    const w = i % 5 === 0 ? terme[(i * 37) % terme.length] : 'wort' + (i % 13);
    teile.push(w); len += w.length + 1; i++;
  }
  return teile.join(' ').padEnd(n, ' ').slice(0, n);
}

for (const anzahl of [1000, 5000]) {
  test(`Laufzeit: ${anzahl} Begriffe auf 100.000 Zeichen unter 500 ms`, () => {
    const terme = begriffe(anzahl);
    const p = parseOk([regelListe({ terms: terme, profiles: ['*'] })]);
    const text = langerText(100000, terme);
    assert.equal(text.length, 100000);
    P.toSpans(p, 'warmup Begriff1 Zusatz1', 'standard');
    const t0 = Date.now();
    const s = P.toSpans(p, text, 'standard');
    const dt = Date.now() - t0;
    assert.ok(s.length > 0, 'es muss Treffer geben');
    assert.ok(dt < 500, 'Dauer ' + dt + ' ms');
  });
}

test('Laufzeit: Pruefung und Suche mit Tausenden gleichen Anfangswoertern bleiben schnell', () => {
  const terme = Array.from({ length: 2000 }, (_, i) => 'Projekt Nummer' + i);
  const p = parseOk([regelListe({ terms: terme, profiles: ['*'] })]);
  const text = 'Projekt '.repeat(12000);
  const t0 = Date.now();
  P.toSpans(p, text, 'standard');
  assert.ok(Date.now() - t0 < 2000);
});
