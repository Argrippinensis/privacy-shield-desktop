// PSLib.report (A2.m): Anonymisierungsbericht, rein und ohne personenbezogene Werte
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';
import { generateDocs } from '../eval/generate.mjs';

const R = loadLib('report');
const SHA = 'a'.repeat(64);

function basis() {
  return {
    appVersion: '2.0.0',
    profileId: 'standard',
    aiMode: 'auto',
    startedAt: '2026-10-21T08:15:30.123Z',
    durationMs: 1234,
    documents: [{
      index: 1, chars: 5000,
      counts: { NAME: 12, EMAIL: 3, IBAN: 1 },
      resultSha256: SHA,
      leak: { count: 0, hoch: 0, mittel: 0 },
    }],
    whitelistSize: 4,
    customRuleCount: 2,
  };
}

// Eingebettete Zaehlertabelle (unabhaengig vom Kern)
const TABELLE = [{ NAME: 12, EMAIL: 3 }, { IBAN: 1, PHONE: 2, NAME: 5 }, { ADDRESS: 7 }];
function hex(i) { return (i.toString(16).padStart(2, '0')).repeat(32); }

test('Kein Leck: kein Fragment (mind. 5 Zeichen) der 42 Testdokumente steht in toText oder toJson', () => {
  const docs = generateDocs(42);
  const input = basis();
  input.documents = docs.map((d, i) => ({
    index: i + 1,
    chars: d.text.length,
    counts: { ...TABELLE[i % TABELLE.length] },
    resultSha256: hex(i),
    leak: { count: i % 2, hoch: i % 2, mittel: 0 },
  }));
  const rep = R.build(input);
  const text = R.toText(rep);
  const json = R.toJson(rep);
  let geprueft = 0;
  for (const d of docs) for (const t of d.truth) for (const f of t.frags) {
    if (f.length < 5) continue;
    geprueft++;
    assert.equal(text.includes(f), false, 'toText enthaelt Fragment');
    assert.equal(json.includes(f), false, 'toJson enthaelt Fragment');
  }
  assert.ok(geprueft > 0);
});

test('Unbekannte Felder (Dokumentebene "name", Top-Level "kunde") werden ignoriert und nie kopiert', () => {
  const input = basis();
  input.kunde = 'Müller';
  input.documents[0].name = 'Müller';
  const rep = R.build(input);
  assert.equal(R.toText(rep).includes('Müller'), false);
  assert.equal(R.toJson(rep).includes('Müller'), false);
  assert.equal(JSON.stringify(rep).includes('Müller'), false);
});

test('toJson ist deterministisch, auch bei anderer Schluesselreihenfolge der Eingabe', () => {
  const a = basis();
  const b = {};
  for (const k of Object.keys(a).reverse()) b[k] = a[k];
  b.documents = [{ leak: { mittel: 0, hoch: 0, count: 0 }, resultSha256: SHA, counts: { IBAN: 1, EMAIL: 3, NAME: 12 }, chars: 5000, index: 1 }];
  assert.equal(R.toJson(R.build(a)), R.toJson(R.build(b)));
  assert.equal(R.toJson(R.build(a)), R.toJson(R.build(a)));
});

test('toJson beginnt mit der Formatkennung und ist JSON.stringify mit 2 Leerzeichen', () => {
  const rep = R.build(basis());
  const json = R.toJson(rep);
  assert.ok(json.startsWith('{\n  "format": "privacyshield-report/1"'));
  assert.equal(json, JSON.stringify(rep, null, 2));
});

test('build: Schluesselreihenfolge des Berichts entspricht der Spezifikation', () => {
  const input = basis();
  input.localTime = '21.10.2026, 10:15:30';
  input.modelId = 'modell/v1';
  const rep = R.build(input);
  assert.deepEqual(Object.keys(rep), ['format', 'program', 'appVersion', 'startedAt', 'localTime', 'durationMs',
    'profileId', 'aiMode', 'modelId', 'whitelistSize', 'customRuleCount', 'documents', 'totals']);
  assert.equal(rep.program, 'PrivacyShield');
  assert.deepEqual(Object.keys(rep.documents[0]), ['index', 'chars', 'counts', 'resultSha256', 'leak']);
});

test('build: localTime und modelId fehlen im Bericht, wenn nicht angegeben', () => {
  const rep = R.build(basis());
  assert.equal('localTime' in rep, false);
  assert.equal('modelId' in rep, false);
});

test('build: counts sind alphabetisch sortiert', () => {
  const rep = R.build(basis());
  assert.deepEqual(Object.keys(rep.documents[0].counts), ['EMAIL', 'IBAN', 'NAME']);
});

test('build: totals summieren Dokumente, Zeichen und Funde', () => {
  const input = basis();
  input.documents.push({ index: 2, chars: 100, counts: { NAME: 2, PHONE: 5 }, resultSha256: SHA, leak: { count: 1, hoch: 1, mittel: 0 } });
  const rep = R.build(input);
  assert.deepEqual(rep.totals, { documents: 2, chars: 5100, entities: 23 });
});

test('toText enthaelt die geforderten Zeilen (Programm, Profil, NAME mit 4 Leerzeichen, Dokument 1)', () => {
  const lines = R.toText(R.build(basis())).split('\n');
  assert.equal(lines[0], 'PrivacyShield Anonymisierungsbericht');
  assert.ok(lines.includes('Programm: PrivacyShield 2.0.0'));
  assert.ok(lines.includes('Zeitpunkt (UTC): 2026-10-21T08:15:30.123Z'));
  assert.ok(lines.includes('Dauer: 1234 ms'));
  assert.ok(lines.includes('Profil: standard'));
  assert.ok(lines.includes('KI-Modus: auto'));
  assert.ok(lines.includes('Freigaben (Whitelist): 4'));
  assert.ok(lines.includes('Eigene Regeln: 2'));
  assert.ok(lines.includes('Dokument 1'));
  assert.ok(lines.includes('  Zeichen: 5000'));
  assert.ok(lines.includes('  Funde: 16'));
  assert.ok(lines.includes('    NAME: 12'));
  assert.ok(lines.includes('  SHA-256 des Ergebnistextes: ' + SHA));
  assert.ok(lines.includes('Gesamt: 1 Dokument(e), 16 Funde'));
});

test('toText: Kategorien alphabetisch, Leerzeile vor "Dokument" und vor "Gesamt"', () => {
  const t = R.toText(R.build(basis()));
  assert.ok(t.indexOf('    EMAIL: 3') < t.indexOf('    IBAN: 1'));
  assert.ok(t.indexOf('    IBAN: 1') < t.indexOf('    NAME: 12'));
  assert.ok(t.includes('\n\nDokument 1\n'));
  assert.ok(t.includes('\n\nGesamt: '));
  assert.equal(t.includes('\r'), false);
});

test('toText: Zeilen "Zeitpunkt (lokal)" und "Modell" nur wenn angegeben', () => {
  assert.equal(R.toText(R.build(basis())).includes('Zeitpunkt (lokal)'), false);
  assert.equal(R.toText(R.build(basis())).includes('Modell:'), false);
  const input = basis();
  input.localTime = '21.10.2026, 10:15:30';
  input.modelId = 'modell/v1';
  const t = R.toText(R.build(input));
  assert.ok(t.includes('Zeitpunkt (lokal): 21.10.2026, 10:15:30\n'));
  assert.ok(t.includes('Modell: modell/v1\n'));
});

test('toText: Gegenpruefungszeile ohne Auffaelligkeiten (leak.count 0)', () => {
  const t = R.toText(R.build(basis()));
  assert.ok(t.includes('  Gegenprüfung: keine Auffälligkeiten'));
  assert.equal(t.includes('mögliche Reste'), false);
});

test('toText: Gegenpruefungszeile mit moeglichen Resten', () => {
  const input = basis();
  input.documents[0].leak = { count: 5, hoch: 2, mittel: 3 };
  const t = R.toText(R.build(input));
  assert.ok(t.includes('  Gegenprüfung: 5 mögliche Reste (hoch 2, mittel 3)'));
  assert.equal(t.includes('keine Auffälligkeiten'), false);
});

test('toText: keine Zeichen im Emoji-Bereich', () => {
  const t = R.toText(R.build(basis()));
  assert.equal(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(t), false);
});

test('toText: letzte Zeile ist der Schlusssatz', () => {
  const t = R.toText(R.build(basis()));
  const lines = t.split('\n');
  const last = lines[lines.length - 1] === '' ? lines[lines.length - 2] : lines[lines.length - 1];
  assert.equal(last, 'Dieser Bericht enthält keine personenbezogenen Daten der verarbeiteten Dokumente. Er ersetzt keine rechtliche Bewertung.');
});

test('PSReportError ist ueber PSLib.report erreichbar und eine Error-Klasse', () => {
  assert.equal(typeof R.PSReportError, 'function');
  assert.ok(new R.PSReportError('x') instanceof Error);
});

// Ungueltige Eingaben: [Name, Aenderung, erwartetes Feld, Wert der nicht in der Meldung stehen darf]
const UNGUELTIG = [
  ['negativer Zaehler', (i) => { i.documents[0].counts.NAME = -7; }, 'documents[0].counts.NAME', '-7'],
  ['documents fehlt', (i) => { delete i.documents; }, 'documents', null],
  ['leere documents', (i) => { i.documents = []; }, 'documents', null],
  ['resultSha256 mit 63 Zeichen', (i) => { i.documents[0].resultSha256 = 'b'.repeat(63); }, 'documents[0].resultSha256', 'b'.repeat(63)],
  ['profileId Standard (grossgeschrieben)', (i) => { i.profileId = 'Standard'; }, 'profileId', 'Standard'],
  ['startedAt ohne Z', (i) => { i.startedAt = '2026-10-21T08:15:30'; }, 'startedAt', '2026-10-21T08:15:30'],
  ['Kategorie name (klein)', (i) => { i.documents[0].counts = { name: 3 }; }, 'documents[0].counts.name', null],
];
for (const [name, mut, field, wert] of UNGUELTIG) {
  test('Ungültige Eingabe: ' + name + ' wirft PSReportError INVALID_INPUT mit passendem Feld', () => {
    const i = basis();
    mut(i);
    assert.throws(() => R.build(i), (e) => {
      assert.ok(e instanceof R.PSReportError);
      assert.equal(e.code, 'INVALID_INPUT');
      assert.equal(e.field, field);
      assert.equal(e.message, 'Ungültiges Feld: ' + field);
      if (wert !== null) assert.equal(e.message.includes(wert), false);
      return true;
    });
  });
}

test('Ungültige Eingabe: freier Text als Wert landet nie in der Fehlermeldung', () => {
  const i = basis();
  i.aiMode = 'Müller Geheim';
  assert.throws(() => R.build(i), (e) => e.field === 'aiMode' && !e.message.includes('Müller'));
});

test('Ungültige Eingabe: mehr als 200 Dokumente und mehr als 50 Kategorien werden abgelehnt', () => {
  const viele = basis();
  viele.documents = Array.from({ length: 201 }, (_, k) => ({ ...basis().documents[0], index: k + 1 }));
  assert.throws(() => R.build(viele), (e) => e.code === 'INVALID_INPUT' && e.field === 'documents');
  const kat = basis();
  kat.documents[0].counts = {};
  for (let k = 0; k < 51; k++) kat.documents[0].counts['KAT' + k] = 1;
  assert.throws(() => R.build(kat), (e) => e.code === 'INVALID_INPUT');
});
