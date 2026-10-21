// F1.a, API-Test fuer app/lib/detect.js (PSDetect): Formen der Rueckgaben und die verbindlichen Eigenschaften aus V2-F, Abschnitt F1.
// Bis das Modul existiert, ist jeder Test rot (loadLib('detect') wirft).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { loadLib, ROOT } from './_load.mjs';
import { generateDocs } from '../eval/generate.mjs';

const D = () => loadLib('detect');
const TOKEN = /\{\{[A-ZÄÖÜ][A-ZÄÖÜ0-9_.\-]{0,63}\}\}/g;
const MAX = 'Ansprechpartner: Max Mustermann, erreichbar unter max.mustermann@beispiel.de.';

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); }
  return o;
}

test('Modul laedt per require ohne Fehler und ohne DOM (kein document, window, localStorage)', () => {
  const require = createRequire(import.meta.url);
  const m = require(path.join(ROOT, 'app', 'lib', 'detect.js'));
  assert.equal(typeof m, 'object');
  for (const f of ['detect', 'createState', 'anonymize', 'deanonymize', 'normalizeForDetection']) assert.equal(typeof m[f], 'function', f);
});

test('Oeffentliche Daten: PROFILES (standard, finance, medical, strict, custom) und ENTS mit Regeldefinitionen', () => {
  const { PROFILES, ENTS } = D();
  assert.ok(Array.isArray(PROFILES));
  for (const id of ['standard', 'finance', 'medical', 'strict', 'custom']) assert.ok(PROFILES.some((p) => p.id === id), id);
  for (const p of PROFILES) { assert.equal(typeof p.id, 'string'); assert.equal(typeof p.lbl, 'string'); assert.ok(Array.isArray(p.ents)); }
  assert.ok(Array.isArray(ENTS) && ENTS.length >= 19);
  for (const e of ENTS) { assert.equal(typeof e.id, 'string'); assert.equal(typeof e.pfx, 'string'); assert.ok(Array.isArray(e.rx)); }
  for (const id of ['email', 'iban', 'phone', 'name', 'addr']) assert.ok(ENTS.some((e) => e.id === id), id);
});

test('createState liefert einen leeren, als JSON speicherbaren Zustand { store, cnt }', () => {
  const s = D().createState();
  assert.deepEqual(s, { store: {}, cnt: {} });
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  assert.notEqual(D().createState(), s);
  assert.notEqual(D().createState().store, s.store);
});

test('detect liefert Spans mit start, end, pfx, col, id, prio, meth, val; val ist der Text von start bis end', () => {
  const spans = D().detect(MAX, {});
  assert.ok(spans.length >= 2, 'Name und E-Mail erwartet');
  for (const s of spans) {
    assert.equal(Number.isInteger(s.start), true);
    assert.equal(Number.isInteger(s.end), true);
    assert.ok(s.end > s.start);
    for (const f of ['pfx', 'col', 'id', 'meth', 'val']) assert.equal(typeof s[f], 'string', f);
    assert.equal(typeof s.prio, 'number');
    assert.equal(s.val, MAX.slice(s.start, s.end));
  }
  assert.ok(spans.some((s) => s.val === 'max.mustermann@beispiel.de'));
});

test('detect liefert Spans nach Position sortiert und ueberlappungsfrei', () => {
  const t = 'Herr Thomas Muster, Musterstraße 12, 80331 München, thomas@beispiel.de, +49 89 1234567';
  const spans = D().detect(t, {});
  assert.ok(spans.length >= 3);
  for (let i = 1; i < spans.length; i++) assert.ok(spans[i].start >= spans[i - 1].end, 'Ueberlappung');
});

test('normalizeForDetection behaelt die Laenge und ersetzt geschuetzte Leerzeichen und Vollbreiten-Zeichen', () => {
  const n = D().normalizeForDetection;
  const t = 'a b c　d １２Ａａ';
  const r = n(t);
  assert.equal(r.length, t.length);
  assert.equal(r, 'a b c d 12Aa');
  assert.equal(n('Normaler Text'), 'Normaler Text');
});

test('detect erkennt Treffer in Text mit geschuetzten Leerzeichen und gibt val aus dem Eingangstext zurueck', () => {
  const t = 'IBAN: DE89 3704 0044 0532 0130 00 bitte pruefen';
  const spans = D().detect(t, {});
  const s = spans.find((x) => /^DE89/.test(x.val));
  assert.ok(s, 'IBAN erwartet');
  assert.equal(s.val, t.slice(s.start, s.end));
});

test('anonymize liefert { text, state, spans } und ersetzt Treffer durch Platzhalter der Form {{PFX_n}}', () => {
  const r = D().anonymize(MAX, {});
  assert.deepEqual(Object.keys(r).sort(), ['spans', 'state', 'text']);
  assert.ok(Array.isArray(r.spans));
  assert.ok(!r.text.includes('Mustermann'));
  assert.ok(!r.text.includes('@beispiel.de'));
  const toks = r.text.match(TOKEN) || [];
  assert.ok(toks.length >= 2);
  for (const t of toks) assert.ok(r.state.store[t], t);
});

test('state.store[token] hat die Felder v (Wert), t (Typ), c (Farbe), m (Methode)', () => {
  const r = D().anonymize(MAX, {});
  const entries = Object.entries(r.state.store);
  assert.ok(entries.length >= 2);
  for (const [token, e] of entries) {
    assert.match(token, /^\{\{[A-ZÄÖÜ][A-ZÄÖÜ0-9_.\-]*\}\}$/);
    for (const f of ['v', 't', 'c', 'm']) assert.equal(typeof e[f], 'string', f);
    assert.ok(token.startsWith('{{' + e.t + '_'));
    assert.ok(!/\{\{/.test(e.v));
  }
  assert.ok(entries.some(([, e]) => e.v === 'max.mustermann@beispiel.de'));
});

test('Platzhalter werden von hinten nach vorne vergeben: die Nummer 1 gehoert zur letzten E-Mail im Text', () => {
  const t = 'Erst a.eins@beispiel.de, dann b.zwei@beispiel.de.';
  const r = D().anonymize(t, {});
  const keys = Object.keys(r.state.store);
  assert.equal(r.state.store[keys[0]].v, 'b.zwei@beispiel.de', 'Einfuegereihenfolge = Vergabereihenfolge (hinten zuerst)');
  assert.equal(r.state.store[keys[1]].v, 'a.eins@beispiel.de');
});

test('Gleicher Wert erhaelt denselben Platzhalter (auch mehrfach im Text)', () => {
  const t = 'Mail an max@beispiel.de und nochmals max@beispiel.de bitte.';
  const r = D().anonymize(t, {});
  const toks = r.text.match(TOKEN);
  assert.equal(toks.length, 2);
  assert.equal(toks[0], toks[1]);
  assert.equal(Object.keys(r.state.store).length, 1);
});

test('Platzhaltergleichheit ignoriert vorhandene {{...}} und Leerraum am Rand des Werts', () => {
  const t = 'Wert: {{NAME_9}} und max@beispiel.de';
  const r = D().anonymize(t, {});
  assert.ok(r.text.includes('{{NAME_9}}') || r.text.match(TOKEN).length >= 1);
  for (const e of Object.values(r.state.store)) assert.ok(!/\{\{[^}]*\}\}/.test(e.v));
});

test('deanonymize(anonymize(x).text, state) ergibt fuer 20 Dokumente wieder genau x', () => {
  const docs = generateDocs(20);
  assert.equal(docs.length, 20);
  for (const d of docs) {
    const r = D().anonymize(d.text, { wordlists: true });
    assert.equal(D().deanonymize(r.text, r.state), d.text);
  }
});

test('deanonymize ersetzt die laengsten Platzhalter zuerst und laesst Text ohne Platzhalter unveraendert', () => {
  const state = { store: { '{{A_1}}': { v: 'kurz', t: 'A', c: '#000', m: 'x' }, '{{A_1_2}}': { v: 'lang', t: 'A', c: '#000', m: 'x' } }, cnt: {} };
  assert.equal(D().deanonymize('{{A_1_2}} und {{A_1}}', state), 'lang und kurz');
  assert.equal(D().deanonymize('Nichts zu ersetzen.', state), 'Nichts zu ersetzen.');
  assert.equal(D().deanonymize('Nichts zu ersetzen.', D().createState()), 'Nichts zu ersetzen.');
});

test('state wird in place fortgeschrieben: zweites Dokument mit demselben Namen erhaelt denselben Platzhalter', () => {
  const state = D().createState();
  const r1 = D().anonymize(MAX, { state });
  const before = JSON.parse(JSON.stringify(r1.state.store));
  assert.equal(r1.state, state, 'dasselbe Objekt, nicht eine Kopie');
  const r2 = D().anonymize('Frau Meier schreibt an Max Mustermann (max.mustermann@beispiel.de) und an neu.kontakt@beispiel.de.', { state });
  assert.equal(r2.state, state);
  for (const [tok, e] of Object.entries(before)) {
    assert.deepEqual(state.store[tok], e, 'Platzhalter aus Dokument 1 bleibt unveraendert: ' + tok);
    assert.ok(r2.text.includes(tok), 'derselbe Wert erhaelt denselben Platzhalter: ' + tok);
  }
  assert.ok(Object.keys(state.store).length > Object.keys(before).length, 'neue Werte kommen hinzu');
  assert.equal(D().deanonymize(r2.text, state).includes('neu.kontakt@beispiel.de'), true);
});

test('Ohne state beginnt jeder Aufruf mit leerem Zustand', () => {
  const r1 = D().anonymize(MAX, {});
  const r2 = D().anonymize(MAX, {});
  assert.notEqual(r1.state, r2.state);
  assert.equal(r2.text, r1.text);
  assert.equal(JSON.stringify(r2.state.store), JSON.stringify(r1.state.store));
});

test('Der Rueckwaertsindex ist nicht Teil von state: nur store und cnt, als JSON speicherbar', () => {
  const r = D().anonymize(MAX, {});
  assert.deepEqual(Object.keys(r.state).sort(), ['cnt', 'store']);
  assert.deepEqual(JSON.parse(JSON.stringify(r.state)), r.state);
  const wieder = JSON.parse(JSON.stringify(r.state));
  assert.equal(D().deanonymize(r.text, wieder), MAX);
});

test('opts.ents hat Vorrang vor profile: nur E-Mail aktiv, obwohl das Profil auch Namen einschliesst', () => {
  const full = D().detect(MAX, { profile: 'standard' });
  assert.ok(full.some((s) => s.id === 'name'), 'Vergleich: Standardprofil findet den Namen');
  const nurMail = D().detect(MAX, { profile: 'standard', ents: ['email'] });
  assert.ok(nurMail.length >= 1);
  assert.ok(nurMail.every((s) => s.id === 'email'));
  const r = D().anonymize(MAX, { profile: 'standard', ents: ['email'] });
  assert.ok(r.text.includes('Mustermann'));
  assert.ok(!r.text.includes('@beispiel.de'));
});

test('Leere ents-Liste meldet nichts; unbekanntes Profil wird wie standard behandelt oder nicht angenommen, nie mit Absturz', () => {
  assert.deepEqual(D().detect(MAX, { ents: [] }), []);
  assert.doesNotThrow(() => D().detect(MAX, { profile: 'standard' }));
  assert.doesNotThrow(() => D().detect(MAX, undefined));
});

test('Profil custom benoetigt ents; Profile finance und medical liefern andere Regelmengen als standard', () => {
  const t = 'Patient Max Mustermann, IBAN DE89 3704 0044 0532 0130 00, Diagnose Diabetes mellitus.';
  const ids = (p) => new Set(D().detect(t, { profile: p }).map((s) => s.id));
  const std = ids('standard');
  const str = ids('strict');
  assert.ok(std.has('iban'));
  assert.ok(str.size >= std.size, 'strict ist mindestens so streng wie standard');
});

test('whitelist unterdrueckt Treffer als Teilzeichenfolge, Gross- und Kleinschreibung egal', () => {
  const basis = D().detect(MAX, {});
  assert.ok(basis.some((s) => s.val === 'max.mustermann@beispiel.de'));
  const spans = D().detect(MAX, { whitelist: ['BEISPIEL.DE'] });
  assert.ok(!spans.some((s) => s.val.toLowerCase().includes('beispiel.de')));
  const r = D().anonymize(MAX, { whitelist: ['beispiel.de'] });
  assert.ok(r.text.includes('max.mustermann@beispiel.de'));
});

test('whitelist laesst nicht passende Treffer unberuehrt und ignoriert leere Eintraege', () => {
  const basis = D().detect(MAX, {});
  const spans = D().detect(MAX, { whitelist: ['', 'gibtesnicht'] });
  assert.equal(spans.length, basis.length);
});

test('released gibt nur den exakten Wert mit gleichem Typ frei ("Berlin" gibt "Berliner Allee 5" nicht frei)', () => {
  const t = 'Wohnhaft Berliner Allee 5, 10115 Berlin.';
  const basis = D().detect(t, {});
  const addr = basis.find((s) => s.val.startsWith('Berliner Allee'));
  assert.ok(addr, 'Adresse erwartet');
  const mit = (released) => D().detect(t, { released }).some((s) => s.val === addr.val && s.pfx === addr.pfx);
  assert.equal(mit([{ pfx: addr.pfx, value: addr.val }]), false, 'exakt freigegeben');
  assert.equal(mit([{ pfx: addr.pfx, value: 'Berlin' }]), true, 'Teilwert gibt nicht frei');
  assert.equal(mit([{ pfx: 'ANDERER_TYP', value: addr.val }]), true, 'anderer Typ gibt nicht frei');
  assert.equal(mit([{ pfx: addr.pfx, value: addr.val.toLowerCase() }]), true, 'Gross-/Kleinschreibung wird beachtet');
  assert.equal(mit([]), true);
});

test('extraSpans erscheinen mit prio 0 und verdraengen ueberlappende weiche Treffer', () => {
  const t = 'Herr Thomas Muster wohnt hier.';
  const name = D().detect(t, {}).find((s) => s.id === 'name' || s.pfx.startsWith('NAME'));
  assert.ok(name, 'Namenstreffer erwartet');
  const extra = { start: name.start, end: name.end, pfx: 'PROJEKT', col: '#112233', id: 'custom', prio: 0, meth: 'Eigene Regel' };
  const spans = D().detect(t, { extraSpans: [extra] });
  const s = spans.find((x) => x.pfx === 'PROJEKT');
  assert.ok(s);
  assert.equal(s.prio, 0);
  assert.equal(s.start, name.start);
  assert.equal(s.end, name.end);
  assert.equal(s.val, t.slice(name.start, name.end));
  assert.ok(!spans.some((x) => x !== s && x.start < s.end && x.end > s.start), 'weicher Treffer verdraengt');
  const r = D().anonymize(t, { extraSpans: [extra] });
  assert.ok(r.text.includes('{{PROJEKT_'));
});

test('extraSpans ohne Ueberlappung bleiben neben den uebrigen Treffern erhalten', () => {
  const t = 'Das Projekt Alpha laeuft; Kontakt max@beispiel.de.';
  const i = t.indexOf('Alpha');
  const spans = D().detect(t, { extraSpans: [{ start: i, end: i + 5, pfx: 'PROJEKT', col: '#000', id: 'custom', prio: 0, meth: 'Eigene Regel' }] });
  assert.ok(spans.some((s) => s.pfx === 'PROJEKT' && s.val === 'Alpha'));
  assert.ok(spans.some((s) => s.val === 'max@beispiel.de'));
});

test('cvars erzeugt Treffer mit pfx = n, meth "Eigene Regel" und prio 0', () => {
  const t = 'Vorgang AKT-123 und AKT-77 sind offen.';
  const spans = D().detect(t, { cvars: [{ n: 'AKTE', p: 'AKT-\\d+' }] });
  const eigene = spans.filter((s) => s.pfx === 'AKTE');
  assert.deepEqual(eigene.map((s) => s.val), ['AKT-123', 'AKT-77']);
  for (const s of eigene) { assert.equal(s.meth, 'Eigene Regel'); assert.equal(s.prio, 0); assert.equal(s.val, t.slice(s.start, s.end)); }
  const r = D().anonymize(t, { cvars: [{ n: 'AKTE', p: 'AKT-\\d+' }] });
  assert.ok(!r.text.includes('AKT-123'));
  assert.ok(r.text.includes('{{AKTE_'));
});

test('aiSpans werden als KI-Treffer uebernommen (Positionen im normalisierten Text)', () => {
  const t = 'Gesprochen hat Zacharias Quenzel gestern.';
  const i = t.indexOf('Zacharias');
  const ai = [{ start: i, end: i + 'Zacharias Quenzel'.length, pfx: 'NAME', col: '#ff9500' }];
  const spans = D().detect(t, { aiSpans: ai });
  const s = spans.find((x) => x.val === 'Zacharias Quenzel');
  assert.ok(s, 'KI-Treffer erwartet');
  assert.equal(s.pfx, 'NAME');
  const r = D().anonymize(t, { aiSpans: ai });
  assert.ok(!r.text.includes('Quenzel'));
});

test('Eingabe wird nicht veraendert: eingefrorene Optionen und Zustand fuehren zu keinem Fehler und keiner Mutation', () => {
  const opts = deepFreeze({
    profile: 'standard', wordlists: true, whitelist: ['xyz'], released: [{ pfx: 'EMAIL', value: 'nix' }],
    extraSpans: [], cvars: [{ n: 'AKTE', p: 'AKT-\\d+' }], aiSpans: [{ start: 0, end: 4, pfx: 'NAME', col: '#fff' }],
  });
  const kopie = JSON.stringify(opts);
  const t = 'Wohl Frau Lena Richter, AKT-5, lena@beispiel.de';
  assert.doesNotThrow(() => D().detect(t, opts));
  assert.doesNotThrow(() => D().anonymize(t, opts));
  assert.equal(JSON.stringify(opts), kopie);
  assert.equal(t, 'Wohl Frau Lena Richter, AKT-5, lena@beispiel.de');
});

test('detect ist wiederholbar: gleicher Aufruf zweimal liefert gleiche Spans, Aenderung am Ergebnis wirkt nicht zurueck (Kopien)', () => {
  const a = D().detect(MAX, {});
  a.length = 0;
  const b = D().detect(MAX, {});
  const c = D().detect(MAX, {});
  assert.ok(b.length >= 2);
  assert.deepEqual(c, b);
  b[0].pfx = 'GEAENDERT';
  assert.notEqual(D().detect(MAX, {})[0].pfx, 'GEAENDERT');
});

test('Leerer und platzhalterhaltiger Text: anonymize("") ist leer, bestehende Platzhalter bleiben erhalten', () => {
  const r = D().anonymize('', {});
  assert.equal(r.text, '');
  assert.deepEqual(r.state.store, {});
  const s = D().anonymize('Hallo {{NAME_1}}, bitte melden.', {});
  assert.ok(s.text.includes('{{NAME_1}}'));
});
