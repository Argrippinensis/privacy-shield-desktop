// F5, Kern-Leistung bei pathologischen Eingaben (V2-F, Abschnitt F5).
// Jede Eingabe laeuft in einem eigenen Kindprozess mit hartem Abbruch: Regex-Rücksetzen blockiert synchron,
// ein Zeitlimit von node:test koennte es nicht unterbrechen. Gemessen wird im Kind mit performance.now()
// nur um PSDetect.anonymize(text, { wordlists: true }); Grenze laut Spezifikation 2.000 ms.
import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, loadLib } from './_load.mjs';

const GRENZE_MS = 2000;     // Spezifikation
const ABBRUCH_MS = 12000;   // Kind wird beendet (Fehler ist Minuten, nicht Sekunden)
const DETECT = path.join(ROOT, 'app', 'lib', 'detect.js');

const CHILD = `
const { performance } = require('node:perf_hooks');
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => {
  const eingabe = JSON.parse(buf);
  const text = typeof eingabe === 'string' ? eingabe : eingabe.text;
  const namen = typeof eingabe === 'string' ? [] : eingabe.namen;
  const out = { ok: false };
  try {
    const D = require(${JSON.stringify(DETECT)});
    const t0 = performance.now();
    const r = D.anonymize(text, { wordlists: true });
    out.ms = performance.now() - t0;
    out.roundtrip = D.deanonymize(r.text, r.state) === text;
    out.wellFormed = r.text.isWellFormed();
    out.uebrig = namen.filter((w) => new RegExp('(?<![\\p{L}])' + w + '(?![\\p{L}])', 'u').test(r.text));
    out.anonym = r.text;
    out.ok = true;
  } catch (e) { out.error = String(e && e.message || e); }
  process.stdout.write(JSON.stringify(out));
});
`;

function laufe(text) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['-e', CHILD], { stdio: ['pipe', 'pipe', 'pipe'] });
    let o = '';
    let killed = false;
    const timer = setTimeout(() => { killed = true; p.kill('SIGKILL'); }, ABBRUCH_MS);
    p.stdout.on('data', (c) => { o += c; });
    p.stderr.on('data', () => {});
    p.on('close', () => {
      clearTimeout(timer);
      if (killed) return resolve({ killed: true });
      try { resolve(JSON.parse(o)); } catch { resolve({ ok: false, error: 'keine Ausgabe' }); }
    });
    p.stdin.end(JSON.stringify(text));
  });
}

async function pruefe(text, namen) {
  const r = await laufe(namen ? { text, namen } : text);
  assert.ok(!r.killed, `Abbruch nach ${ABBRUCH_MS} ms: Erkennung rechnet viel zu lange`);
  assert.ok(r.ok, 'Ausnahme: ' + r.error);
  assert.ok(r.ms < GRENZE_MS, `${Math.round(r.ms)} ms, Grenze ${GRENZE_MS} ms`);
  assert.equal(r.roundtrip, true, 'deanonymize(anonymize(x).text, state) muss x ergeben');
  assert.equal(r.wellFormed, true, 'Ausgabe muss wohlgeformt sein (isWellFormed)');
  if (namen) assert.deepEqual(r.uebrig, [], `Leck, Namen im Klartext geblieben: ${r.uebrig.join(', ')} in ${JSON.stringify(r.anonym)}`);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function zufall(seed, laenge) {
  const alphabet = ['a', 'A', '1', ' ', '.', ',', ':', '-', '\n', '\t', '@'];
  const rnd = mulberry32(seed);
  let s = '';
  for (let i = 0; i < laenge; i++) s += alphabet[Math.floor(rnd() * alphabet.length)];
  return s;
}

// Sequenziell: gemessen wird im Kind nur der detect-Aufruf, aber parallele Kinder verfaelschen die Zeit unter Last.
suite('F5: pathologische Eingaben', { concurrency: 1 }, () => {
  const faelle = [
    ['100.000 mal A', () => 'A'.repeat(100000)],
    ['100.000 mal a', () => 'a'.repeat(100000)],
    ['100.000 mal 1', () => '1'.repeat(100000)],
    ['"Wort " 20.000 mal', () => 'Wort '.repeat(20000)],
    ['"Hans " 20.000 mal', () => 'Hans '.repeat(20000)],
    ['"Berlin " 20.000 mal', () => 'Berlin '.repeat(20000)],
    ['": " 50.000 mal', () => ': '.repeat(50000)],
    ['"a-" 50.000 mal', () => 'a-'.repeat(50000)],
    ['x, 100.000 Leerzeichen, y', () => 'x' + ' '.repeat(100000) + 'y'],
    ['x, 100.000 Tabulatoren, y', () => 'x' + '\t'.repeat(100000) + 'y'],
    ['Vertrag und 100.000 Leerzeilen vor Ende', () => 'Vertrag\n' + '\n'.repeat(100000) + 'Ende'],
    ['50.000 Zeilenwechsel \\r\\n mit Text davor und danach', () => 'Anfang\n' + '\r\n'.repeat(50000) + 'Ende'],
    ['50.000 mal Leerzeichen plus Zeilenwechsel mit Text davor und danach', () => 'Anfang\n' + ' \n'.repeat(50000) + 'Ende'],
  ];
  for (const [name, gen] of faelle) {
    test(`${name}: unter ${GRENZE_MS} ms, ohne Ausnahme, Rueckweg gleich, wohlgeformt`, { timeout: ABBRUCH_MS + 5000 }, () => pruefe(gen()));
  }
  for (const seed of [20261021, 20261022, 20261023]) {
    test(`Zufallsfolge (Seed ${seed}, 100.000 Zeichen aus "aA1 .,:-\\n\\t@"): unter ${GRENZE_MS} ms, Rueckweg gleich, wohlgeformt`, { timeout: ABBRUCH_MS + 5000 }, () => pruefe(zufall(seed, 100000)));
  }
});

// Spaltenabstaende aus PDF/Formularen sind realistisch: Der Wert hinter einem Stichwort muss unabhaengig von der
// Breite des Leerraums ersetzt werden (Verhalten wie bei einem Leerzeichen), sonst bleibt ein Leck.
suite('F5: Leerraum zwischen Stichwort und Wert', () => {
  const D = loadLib('detect');
  const stichworte = [
    ['Name', 'Name:', 'Mustermann', 'ein Name-Wert hinter breitem Spaltenabstand ist genauso personenbezogen wie hinter einem Leerzeichen'],
    ['Passwort', 'Passwort:', 'Geheim1234!', 'ein Passwort hinter breitem Spaltenabstand darf nie im Klartext bleiben'],
    ['Benutzername', 'Benutzername:', 'mmuster84', 'ein Benutzername hinter breitem Spaltenabstand identifiziert die Person weiterhin'],
    ['Kundennummer', 'Kundennummer:', 'KD-4711-0815', 'eine Kundennummer hinter breitem Spaltenabstand bleibt eine Kennung'],
    ['Seriennummer', 'Seriennummer:', 'A7B3C9', 'ein nur ueber das Stichwort erkennbarer Seriennummer-Wert darf bei breitem Spaltenabstand nicht durchrutschen'],
  ];
  for (const [bez, kw, wert, grund] of stichworte) {
    const vorher = (sep) => D.anonymize(kw + sep + wert, { wordlists: true }).text;
    test(`${bez}: Referenz mit 1 Leerzeichen wird ersetzt`, () => {
      assert.ok(!vorher(' ').includes(wert), 'Beispielwert muss mit 1 Leerzeichen erkannt werden');
    });
    for (const [label, sep] of [['41 Leerzeichen', ' '.repeat(41)], ['120 Leerzeichen', ' '.repeat(120)]]) {
      test(`${bez}: ${label} zwischen Stichwort und Wert, Wert ersetzt (${grund})`, () => {
        const r = D.anonymize(kw + sep + wert, { wordlists: true });
        assert.ok(!r.text.includes(wert), `Wert im Klartext geblieben: ${JSON.stringify(r.text)}`);
        assert.equal(D.deanonymize(r.text, r.state), kw + sep + wert);
      });
    }
  }
  test('Name: 41 Tabulatoren zwischen Stichwort und Wert, Wert ersetzt (Tabellenexport trennt Spalten mit Tabs, gleiche Schutzwirkung wie bei Leerzeichen)', () => {
    const r = D.anonymize('Name:' + '\t'.repeat(41) + 'Mustermann', { wordlists: true });
    assert.ok(!r.text.includes('Mustermann'), `Wert im Klartext geblieben: ${JSON.stringify(r.text)}`);
  });
});

// Namensketten ueber 200 Zeichen: Die Zahl der Platzhalter darf von der Kette mit einem Platzhalter abweichen
// (die Erkennung begrenzt die Kettenlaenge zum Schutz vor Laufzeitexplosion, mehrere Platzhalter sind ein
// bewusst hingenommener Unterschied). Kein Teil der Kette darf dabei aber im Klartext stehen bleiben, sonst ist es ein Teilleck.
test('Namenskette ueber 200 Zeichen: kein Namensteil bleibt ungeschwaerzt, Platzhalterzahl darf abweichen', () => {
  const D = loadLib('detect');
  const namen = ['Meier', 'Schulze', 'Kowalski', 'Nowak', 'Wagner', 'Becker', 'Hoffmann', 'Schaefer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krueger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Krause', 'Meier'];
  const rest = ['Michalski', 'Adamczyk', 'Dudek', 'Zajac', 'Wieczorek'];
  const kette = namen.concat(rest).join('-');
  assert.ok(kette.length > 200);
  const text = 'Name: ' + kette;
  const r = D.anonymize(text, { wordlists: true });
  const uebrig = namen.concat(rest).filter((n) => r.text.includes(n));
  assert.deepEqual(uebrig, [], `Teilleck, im Klartext geblieben: ${uebrig.join(', ')} in ${JSON.stringify(r.text)}`);
  assert.ok(/\{\{NAME_\d+\}\}/.test(r.text), 'mindestens ein Namens-Platzhalter erwartet');
  assert.equal(D.deanonymize(r.text, r.state), text);
});

// Regressionsschutz gegen die Kettenbegrenzung (MAX_NAME_SPAN): Namensketten ab etwa 125 Zeichen ohne Komma wurden
// mit v2/main (ohne F5) vollstaendig als NAME erkannt; jeder einzelne Name muss weiterhin ersetzt werden.
// Die Fälle sind per Skript gegen v2/main ausgewaehlt: dort blieb in jedem von ihnen kein Name im Klartext.
const VORNAMEN = ['Hans', 'Peter', 'Anna', 'Maria', 'Thomas', 'Michael', 'Sabine', 'Klaus', 'Petra', 'Jürgen', 'Monika', 'Stefan', 'Andrea', 'Frank', 'Claudia', 'Wolfgang', 'Birgit', 'Uwe', 'Heike', 'Dieter'];
const NACHNAMEN = ['Meier', 'Schulze', 'Müller', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Hartmann', 'Lange', 'Schmitt', 'Werner'];
function namenListe(n, va, vo, nm, no) {
  const l = [];
  for (let i = 0; i < n; i++) l.push(VORNAMEN[(i * va + vo) % 20] + ' ' + NACHNAMEN[(i * nm + no) % 20]);
  return l;
}
suite('F5: Namensketten ohne Leck (kein Rueckschritt gegenueber v2/main)', { concurrency: 1 }, () => {
  const faelle = [];
  // mit Bindestrich getrennt: v2/main schwaerzte alle Namen (Kette ab 20 Namen / 275 Zeichen betroffen)
  for (const n of [5, 10, 20, 40, 80]) {
    for (const kw of ['', 'Teilnehmer: ', 'Unterzeichner: ']) {
      for (const o of [0, 3]) {
        faelle.push([`${n} Namen mit Bindestrich getrennt${kw ? ', Stichwort "' + kw.trim() + '"' : ''} (Variante ${o ? 'B' : 'A'})`, kw, '-', namenListe(n, 1, o, 7, o)]);
      }
    }
  }
  // mit Leerzeichen getrennt: nur Eingaben, die v2/main komplett schwaerzte (Kette ab 10 Namen / 135 Zeichen)
  for (const kw of ['', 'Teilnehmer: ', 'Unterzeichner: ']) {
    for (const b of [8, 14]) {
      faelle.push([`10 Namen mit Leerzeichen getrennt${kw ? ', Stichwort "' + kw.trim() + '"' : ''} (Variante ${b === 8 ? 'A' : 'B'})`, kw, ' ', namenListe(10, 2, b, 3, b + 2)]);
    }
  }
  for (const [name, kw, sep, liste] of faelle) {
    const text = kw + liste.join(sep);
    const namen = [...new Set(liste.flatMap((x) => x.split(' ')))];
    test(`Namenskette ${name}, ${text.length} Zeichen: kein Name im Klartext, Rueckweg gleich, unter ${GRENZE_MS} ms`, { timeout: ABBRUCH_MS + 5000 }, () => pruefe(text, namen));
  }
});

test('Korpus unveraendert: diff-reference.mjs --node meldet 0 Abweichungen (alle 212 Faelle)', { timeout: 120000 }, () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tests', 'eval', 'diff-reference.mjs'), '--node'], { cwd: ROOT, encoding: 'utf8', timeout: 100000 });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').slice(-8).join('\n'));
  assert.match(r.stdout, /Abweichungen: 0 von/);
});
