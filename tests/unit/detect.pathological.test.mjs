// F5, Kern-Leistung bei pathologischen Eingaben (V2-F, Abschnitt F5).
// Jede Eingabe laeuft in einem eigenen Kindprozess mit hartem Abbruch: Regex-Rücksetzen blockiert synchron,
// ein Zeitlimit von node:test koennte es nicht unterbrechen. Gemessen wird im Kind mit performance.now()
// nur um PSDetect.anonymize(text, { wordlists: true }); Grenze laut Spezifikation 2.000 ms.
import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './_load.mjs';

const GRENZE_MS = 2000;     // Spezifikation
const ABBRUCH_MS = 12000;   // Kind wird beendet (Fehler ist Minuten, nicht Sekunden)
const DETECT = path.join(ROOT, 'app', 'lib', 'detect.js');

const CHILD = `
const { performance } = require('node:perf_hooks');
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { buf += c; });
process.stdin.on('end', () => {
  const text = JSON.parse(buf);
  const out = { ok: false };
  try {
    const D = require(${JSON.stringify(DETECT)});
    const t0 = performance.now();
    const r = D.anonymize(text, { wordlists: true });
    out.ms = performance.now() - t0;
    out.roundtrip = D.deanonymize(r.text, r.state) === text;
    out.wellFormed = r.text.isWellFormed();
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

async function pruefe(text) {
  const r = await laufe(text);
  assert.ok(!r.killed, `Abbruch nach ${ABBRUCH_MS} ms: Erkennung rechnet viel zu lange`);
  assert.ok(r.ok, 'Ausnahme: ' + r.error);
  assert.ok(r.ms < GRENZE_MS, `${Math.round(r.ms)} ms, Grenze ${GRENZE_MS} ms`);
  assert.equal(r.roundtrip, true, 'deanonymize(anonymize(x).text, state) muss x ergeben');
  assert.equal(r.wellFormed, true, 'Ausgabe muss wohlgeformt sein (isWellFormed)');
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

suite('F5: pathologische Eingaben', { concurrency: 3 }, () => {
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

test('Korpus unveraendert: diff-reference.mjs --node meldet 0 Abweichungen (alle 212 Faelle)', { timeout: 120000 }, () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tests', 'eval', 'diff-reference.mjs'), '--node'], { cwd: ROOT, encoding: 'utf8', timeout: 100000 });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').slice(-8).join('\n'));
  assert.match(r.stdout, /Abweichungen: 0 von/);
});
