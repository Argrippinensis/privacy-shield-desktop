// F4.a, Eigenschaftstests fuer den Kern PSDetect (V2-F, Abschnitt F4.a, Aufgabe 1).
// Ausnahme von der 5-Sekunden-Regel: bis 60 s je Datei erlaubt (Spezifikation F4.a). Begruendung: 200 synthetische
// Dokumente (generateDocs(40, Seed) fuer die Seeds 1 bis 5) laufen durch 4 Profile mit je mehreren Erkennungslaeufen.
// Jede Eigenschaft ist ein eigener test(); bei Fehlschlag nennt die Meldung Eigenschaft, Seed, Profil und Dokumentnummer.
// Rote Faelle sind echte Befunde und werden nicht abgeschwaecht.
import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { loadLib } from './_load.mjs';
import { generateDocs } from '../eval/generate.mjs';

const T_START = performance.now();
const D = loadLib('detect');
const PH = loadLib('placeholder');

const SEEDS = [1, 2, 3, 4, 5];
const PROFILES = ['standard', 'finance', 'medical', 'strict'];
const ANZAHL = 40;
const BUDGET_MS = 60000;

// [{ seed, nr, doc }], 5 x 40 = 200 Dokumente; nr = laufende Nummer im Seed (0 bis 39)
const DOKUMENTE = [];
for (const seed of SEEDS) generateDocs(ANZAHL, seed).forEach((doc, nr) => DOKUMENTE.push({ seed, nr, doc }));

const opts = (profile, extra) => Object.assign({ profile, wordlists: true }, extra);
const ort = (eig, seed, profil, nr) => `[${eig}] Seed ${seed}, Profil ${profil}, Dokument ${nr}`;
const kurz = (s) => JSON.stringify(String(s).length > 160 ? String(s).slice(0, 160) + '...' : String(s));

// Fehler sammeln und am Ende gesammelt melden (alle Verstoesse sichtbar, nicht nur der erste)
function sammle(eig, pruefung) {
  const fehler = [];
  let n = 0;
  for (const profil of PROFILES) {
    for (const { seed, nr, doc } of DOKUMENTE) {
      n++;
      let msg = null;
      try { msg = pruefung(doc, profil, seed, nr); } catch (e) { msg = 'Ausnahme: ' + (e && e.message || e); }
      if (msg) fehler.push(`${ort(eig, seed, profil, nr)} (Vorlage ${doc.template}): ${msg}`);
    }
  }
  assert.equal(fehler.length, 0, `${fehler.length} von ${n} Laeufen verletzen die Eigenschaft:\n` + fehler.slice(0, 10).join('\n'));
}

test('Testmenge: 200 Dokumente aus 5 Seeds mal 40, 4 Profile', () => {
  assert.equal(DOKUMENTE.length, 200);
  assert.deepEqual(PROFILES.map((p) => D.PROFILES.some((x) => x.id === p)), [true, true, true, true]);
});

test('Rundlauf: deanonymize(anonymize(x).text, state) ergibt exakt x', () => {
  sammle('Rundlauf', (doc, profil) => {
    const r = D.anonymize(doc.text, opts(profil));
    const back = D.deanonymize(r.text, r.state);
    return back === doc.text ? null : `Rueckweg weicht ab (Eingabe ${doc.text.length} Zeichen, Rueckweg ${back.length}); anonymisiert: ${kurz(r.text)}`;
  });
});

test('Tokenstabilitaet: derselbe Wert hat im selben Dokument genau einen Platzhalter, zwei verschiedene Werte nie denselben', () => {
  sammle('Tokenstabilitaet', (doc, profil) => {
    const r = D.anonymize(doc.text, opts(profil));
    const store = r.state.store;
    // Platzhalter je Wert eindeutig: derselbe Wert unter zwei Platzhaltern waere ein Bruch der Stabilitaet.
    // Platzhalter mit Endung ({{NAME_1.NACH}} usw.) bezeichnen laut Kern eine bestimmte Form einer Person und
    // werden mit dem vollen Platzhalter derselben Person nicht verwechselt; sie zaehlen als eigener Wert nur gegen ihresgleichen.
    const proWert = new Map();
    for (const [tok, d] of Object.entries(store)) {
      if (typeof d.v !== 'string' || d.v === '') return `Eintrag ohne Wert: ${tok}`;
      const gruppe = tok.includes('.') ? 'form' : 'voll';
      const key = gruppe + '\u0000' + d.v;
      if (proWert.has(key)) return `derselbe Wert unter zwei Platzhaltern: ${proWert.get(key)} und ${tok} (${gruppe})`;
      proWert.set(key, tok);
    }
    // jeder Platzhalter im Text steht im Speicher; jeder Speichereintrag kommt im Text vor
    const imText = new Set(PH.find(r.text).map((h) => h.token));
    for (const t of imText) if (!Object.hasOwn(store, t)) return `Platzhalter im Text ohne Eintrag im Speicher: ${t}`;
    for (const t of Object.keys(store)) if (!imText.has(t)) return `Eintrag im Speicher ohne Vorkommen im Text: ${t}`;
    // Werte je Platzhalter eindeutig: jedes Vorkommen eines Platzhalters steht fuer denselben Wert, also
    // ergibt das Ersetzen jedes Vorkommens durch den Speicherwert den Originaltext (Rundlauf ueber die Positionen)
    const vorkommen = PH.find(r.text);
    let rebuilt = '';
    let pos = 0;
    for (const h of vorkommen) { rebuilt += r.text.slice(pos, h.start) + store[h.token].v; pos = h.end; }
    rebuilt += r.text.slice(pos);
    if (rebuilt !== doc.text) return 'Ersetzen jedes Vorkommens durch den Speicherwert ergibt nicht den Originaltext';
    return null;
  });
});

test('Tokenstabilitaet ueber zwei Aufrufe mit gemeinsamem state: derselbe Wert behaelt seinen Platzhalter, nichts wird ueberschrieben', () => {
  sammle('Tokenstabilitaet (state wiederverwendet)', (doc, profil) => {
    const state = D.createState();
    const a = D.anonymize(doc.text, opts(profil, { state }));
    const gesichert = JSON.parse(JSON.stringify(state.store));
    const b = D.anonymize(doc.text, opts(profil, { state }));
    for (const [tok, d] of Object.entries(gesichert)) {
      if (!state.store[tok] || state.store[tok].v !== d.v) return `Eintrag ${tok} wurde im zweiten Lauf veraendert oder entfernt`;
    }
    if (D.deanonymize(a.text, state) !== doc.text) return 'Rueckweg des ersten Laufs weicht ab';
    if (D.deanonymize(b.text, state) !== doc.text) return 'Rueckweg des zweiten Laufs weicht ab';
    return null;
  });
});

test('Platzhalter bleiben erhalten: jeder Platzhalter aus p1 steht unveraendert in anonymize(p1), ohne verschachtelte Platzhalter', () => {
  sammle('Platzhalter bleiben erhalten', (doc, profil) => {
    const p1 = D.anonymize(doc.text, opts(profil)).text;
    const r2 = D.anonymize(p1, opts(profil));
    const tokens = PH.find(p1).map((h) => h.token);
    const vorher = new Map();
    for (const t of tokens) vorher.set(t, (vorher.get(t) || 0) + 1);
    const nachher = new Map();
    for (const h of PH.find(r2.text)) nachher.set(h.token, (nachher.get(h.token) || 0) + 1);
    for (const [t, n] of vorher) {
      if (!r2.text.includes(t)) return `Platzhalter ${t} fehlt im zweiten Durchlauf: ${kurz(r2.text)}`;
      if ((nachher.get(t) || 0) < n) return `Platzhalter ${t} kommt ${n}-mal in p1, aber nur ${nachher.get(t) || 0}-mal im zweiten Durchlauf vor`;
    }
    if (/\{\{[^{}]*\{\{/.test(r2.text)) return `verschachtelter Platzhalter im zweiten Durchlauf: ${kurz(r2.text.match(/\{\{[^{}]*\{\{[^]{0,40}/)[0])}`;
    // der zweite Durchlauf muss mit dem eigenen state ebenfalls rueckgaengig zu machen sein
    if (D.deanonymize(r2.text, r2.state) !== p1) return 'Rueckweg des zweiten Durchlaufs ergibt nicht p1';
    return null;
  });
});

// Whitelist: Teilzeichenfolgen-basiert und ohne Beachtung der Gross-/Kleinschreibung.
// E = ein Fragment aus truth.frags (mindestens 4 Zeichen), je Dokument ein fester, ueber alle Dokumente verteilter Eintrag.
function whitelistLauf(doc, profil, seed, nr) {
  const kandidaten = [...new Set(doc.truth.flatMap((t) => t.frags).filter((f) => typeof f === 'string' && f.length >= 4))];
  if (!kandidaten.length) return null;
  const E = kandidaten[(seed * 7 + nr) % kandidaten.length];
  const eLow = E.toLowerCase();
  const basis = D.anonymize(doc.text, opts(profil));
  const mit = D.anonymize(doc.text, opts(profil, { whitelist: [E] }));
  const basisWerte = Object.values(basis.state.store).map((d) => d.v);
  return {
    E, basis, mit,
    erwartetSichtbar: [...new Set(basisWerte.filter((v) => v.toLowerCase().includes(eLow)))],
    erwartetErsetzt: [...new Set(basisWerte.filter((v) => !v.toLowerCase().includes(eLow)))],
    mitWerte: [...new Set(Object.values(mit.state.store).map((d) => d.v))],
    eLow,
  };
}

test('Whitelist: kein Fund, dessen Wert E enthaelt, bleibt ersetzt; jeder andere Fund bleibt ersetzt; Rueckweg exakt', () => {
  sammle('Whitelist', (doc, profil, seed, nr) => {
    const w = whitelistLauf(doc, profil, seed, nr);
    if (!w) return null;
    const zuViel = w.mitWerte.filter((v) => v.toLowerCase().includes(w.eLow));
    if (zuViel.length) return `E=${kurz(w.E)}: Werte mit E sind trotz Whitelist ersetzt: ${kurz(zuViel.join(' | '))}`;
    // Mengenvergleich der Werte: die Nummerierung der Platzhalter darf nachruecken
    const fehlt = w.erwartetErsetzt.filter((v) => !w.mitWerte.includes(v));
    if (fehlt.length) return `E=${kurz(w.E)}: nicht betroffene Funde sind nicht mehr ersetzt (Leck): ${kurz(fehlt.join(' | '))}`;
    if (D.deanonymize(w.mit.text, w.mit.state) !== doc.text) return `E=${kurz(w.E)}: Rueckweg weicht ab`;
    const imText = new Set(PH.find(w.mit.text).map((h) => h.token));
    for (const t of Object.keys(w.mit.state.store)) if (!imText.has(t)) return `E=${kurz(w.E)}: Platzhalter ${t} fehlt im Text`;
    return null;
  });
});

test('Whitelist (genau): die Funde mit E stehen vollstaendig im Klartext, es entstehen keine Zusatzfunde aus ihren Teilen', () => {
  sammle('Whitelist genau', (doc, profil, seed, nr) => {
    const w = whitelistLauf(doc, profil, seed, nr);
    if (!w) return null;
    const neu = w.mitWerte.filter((v) => !w.erwartetErsetzt.includes(v));
    if (neu.length) {
      return `E=${kurz(w.E)}: Fund(e) mit E ${kurz(w.erwartetSichtbar.join(' | '))} sichtbar gemacht, aber Teile daraus als neue Funde ersetzt: ${kurz(neu.join(' | '))}`;
    }
    for (const v of w.erwartetSichtbar) {
      if (!w.mit.text.includes(v)) return `E=${kurz(w.E)}: Wert ${kurz(v)} ist nicht im Klartext sichtbar`;
    }
    return null;
  });
});

test('Whitelist: Eintrag ohne Treffer in den Funden (kein Fund enthaelt E) aendert die Ausgabe nicht', () => {
  sammle('Whitelist ohne Treffer', (doc, profil) => {
    const E = 'Zzyzx-Nirgends';
    const a = D.anonymize(doc.text, opts(profil));
    const b = D.anonymize(doc.text, opts(profil, { whitelist: [E] }));
    return a.text === b.text ? null : 'Ausgabe weicht ab, obwohl kein Fund E enthaelt';
  });
});

test(`Zeitbudget der Datei: unter ${BUDGET_MS / 1000} s`, () => {
  const ms = performance.now() - T_START;
  assert.ok(ms < BUDGET_MS, `${Math.round(ms)} ms, Budget ${BUDGET_MS} ms`);
});
