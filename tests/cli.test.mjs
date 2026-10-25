// E1.w: Kommandozeilenmodus (Stapel ohne Oberflaeche), echte App.
// Start: electron <App-Ordner> --no-sandbox --cli ... bzw. PS_PACKAGED_BIN --no-sandbox --cli ... per child_process.spawn.
// Auf Linux ohne Display: xvfb-run -a node --test --test-concurrency=1 tests/cli.test.mjs
// Zeitgrenze je Aufruf 60 s (zum Eingrenzen ueber PS_CLI_TEST_TIMEOUT_MS kuerzbar); danach wird die ganze Prozessgruppe beendet.
// Alle Testdaten sind erfunden. Dateien (TXT, DOCX, PDF) werden im Test erzeugt, es werden keine Binaerdateien eingecheckt.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, PACKAGED, makeAppVariant } from './helpers.mjs';
import { loadLib, loadVendor } from './unit/_load.mjs';

const require = createRequire(import.meta.url);
const electronPath = require('electron');
const JSZip = loadVendor('jszip');
const PSMAP = loadLib('psmap');
const PSDetect = loadLib('detect');

const TIMEOUT_MS = Number(process.env.PS_CLI_TEST_TIMEOUT_MS) || 60000;
const PASSWORD = 'korrektes Pferd Batterie';
const PW_ENV = 'PS_TEST_PW';

// ---------------------------------------------------------------- Hilfen: Temp-Ordner und Prozessstart

const tmpDirs = [];
function tmp(prefix = 'ps-cli-') {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpDirs.push(d);
  return d;
}
after(() => { for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true }); });

// Startet die App im CLI-Modus. Liefert { code, signal, timedOut, stdout, stderr, all, ms }.
// stdin: Zeichenkette (wird geschrieben, dann geschlossen) oder undefined (Standardeingabe geschlossen).
function runCli(args, { env = {}, stdin, appDir = ROOT, timeout = TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const argv = [...(PACKAGED ? [] : [appDir]), '--no-sandbox', '--cli', ...args];
    const exe = process.env.PS_PACKAGED_BIN || electronPath;
    const childEnv = { ...process.env, PS_BLOCK_EXTERNAL: '1', ...env };
    delete childEnv.ELECTRON_RUN_AS_NODE;
    const t0 = Date.now();
    const child = spawn(exe, argv, {
      env: childEnv,
      stdio: [stdin === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      detached: process.platform !== 'win32', // eigene Prozessgruppe, damit Kindprozesse mit beendet werden
    });
    let stdout = '', stderr = '', timedOut = false, done = false;
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const killAll = () => {
      try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL'); } catch (e) { /* schon beendet */ }
    };
    const timer = setTimeout(() => { timedOut = true; killAll(); }, timeout);
    const finish = (code, signal) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      killAll(); // uebriggebliebene Kindprozesse (GPU, Zygote) nach dem Ende aufraeumen
      resolve({ code, signal, timedOut, stdout, stderr, all: stdout + '\n' + stderr, ms: Date.now() - t0 });
    };
    child.on('error', (e) => { stderr += 'spawn: ' + e.message; finish(-1, null); });
    child.on('close', finish);
    if (stdin !== undefined) {
      child.stdin.on('error', () => {});
      child.stdin.end(stdin);
    }
  });
}

// Prozess hat sich selbst beendet (kein Haengenbleiben) und den erwarteten Code geliefert
function expectCode(r, code, was) {
  assert.equal(r.timedOut, false, `${was || 'Aufruf'}: Prozess hing und wurde nach ${TIMEOUT_MS} ms beendet (Ausgabe: ${r.all.slice(-400)})`);
  assert.equal(r.code, code, `${was || 'Aufruf'}: erwartet Code ${code}, erhalten ${r.code} (Signal ${r.signal}); Ausgabe: ${r.all.slice(-600)}`);
}

// ---------------------------------------------------------------- Hilfen: Testdokumente (erfunden, im Test erzeugt)

const OOXML_RELS = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
const OOXML_CT = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function makeDocx(paragraphs) {
  const z = new JSZip();
  z.file('[Content_Types].xml', OOXML_CT);
  z.file('_rels/.rels', OOXML_RELS);
  const body = paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${xmlEsc(p)}</w:t></w:r></w:p>`).join('');
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return z.generateAsync({ type: 'nodebuffer' });
}

// Minimales PDF mit Textzeilen (Helvetica, WinAnsi; Umlaute als Oktal-Escape), Kreuzverweistabelle korrekt berechnet
function makePdf(lines) {
  const esc = (s) => [...s].map((ch) => {
    const c = ch.charCodeAt(0);
    if (ch === '\\' || ch === '(' || ch === ')') return '\\' + ch;
    return c < 128 ? ch : '\\' + c.toString(8).padStart(3, '0');
  }).join('');
  const content = 'BT /F1 12 Tf 72 760 Td 18 TL ' + lines.map((l) => `(${esc(l)}) Tj T*`).join(' ') + ' ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let out = '%PDF-1.4\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

// Dateinamen sind absichtlich kennzeichnend (duerfen nie in der Ausgabe stehen) und nach Codepunkten
// anders sortiert als nach Sprachregeln: 'Alpha_Vertrag.docx' < 'Zeta_Gutachten.txt' < 'mitte_Rechnung.pdf' (Grossbuchstaben vor Kleinbuchstaben).
const NAMES = { docx: 'Alpha_Vertrag.docx', txt: 'Zeta_Gutachten.txt', pdf: 'mitte_Rechnung.pdf' };
const ORDER = [NAMES.docx, NAMES.txt, NAMES.pdf];
const MARKERS = ['notiz eins', 'notiz zwei', 'notiz drei']; // in Dateireihenfolge ORDER; bleiben bei der Anonymisierung stehen
const SECRETS = ['Müller', 'Mueller', 'Weber', 'thomas.mueller@beispiel-firma.de', 'max@firma.de'];

const TXT_DOC = 'notiz zwei: Herr Thomas Müller und Frau Anna Weber telefonieren heute.';
const DOCX_PARAS = ['notiz eins: Herr Thomas Müller meldet sich unter thomas.mueller@beispiel-firma.de.'];
const PDF_LINES = ['notiz drei: Herr Thomas Müller bestaetigt den Termin.'];

async function makeInputDir() {
  const dir = path.join(tmp(), 'Eingang_Kunde');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, NAMES.txt), TXT_DOC);
  fs.writeFileSync(path.join(dir, NAMES.docx), await makeDocx(DOCX_PARAS));
  fs.writeFileSync(path.join(dir, NAMES.pdf), makePdf(PDF_LINES));
  return dir;
}

const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const listDir = (d) => fs.readdirSync(d).sort();
const baseName = (n) => n.replace(/\.[^.]+$/, '');

// Pruefung: keine Dateinamen, Ordnernamen, Dokumentfragmente (und Passwort) in einem Text
function assertClean(text, was, extra = []) {
  const bad = [...Object.values(NAMES), ...Object.values(NAMES).map(baseName), 'Eingang_Kunde', ...SECRETS, PASSWORD, ...extra];
  for (const b of bad) assert.ok(!text.includes(b), `${was}: enthaelt "${b}"`);
}

// Gemeinsamer Lauf fuer mehrere Tests: Ordner mit 3 Dateien, Bericht an, KI aus (Wortlisten; deterministisch und ohne Modellstart)
let baseRun;
function getBaseRun() {
  if (!baseRun) {
    baseRun = (async () => {
      const dir = await makeInputDir();
      const out = path.join(tmp(), 'Ausgang');
      const logFile = path.join(tmp(), 'lauf.log');
      const r = await runCli(['--in', dir, '--out', out, '--report', '--ai', 'off', '--log', logFile]);
      return { dir, out, logFile, r };
    })();
  }
  return baseRun;
}

// ---------------------------------------------------------------- Tests: Stapel mit 3 Dateien

test('Ordner mit TXT, DOCX und PDF ergibt 3 Ausgabedateien, bericht.txt, bericht.json und Code 0', async () => {
  const { out, r } = await getBaseRun();
  expectCode(r, 0, 'Stapellauf');
  assert.deepEqual(listDir(out), ['anonymisiert_001.txt', 'anonymisiert_002.txt', 'anonymisiert_003.txt', 'bericht.json', 'bericht.txt']);
  for (const f of ['anonymisiert_001.txt', 'anonymisiert_002.txt', 'anonymisiert_003.txt']) {
    assert.ok(read(out, f).trim().length > 0, `${f} ist leer`);
    assert.match(read(out, f), /\{\{[A-ZÄÖÜ][A-ZÄÖÜ0-9.\-]*_\d+\}\}/, `${f} enthaelt keinen Platzhalter`);
  }
  const rep = JSON.parse(read(out, 'bericht.json'));
  assert.equal(rep.format, 'privacyshield-report/1');
  assert.ok(read(out, 'bericht.txt').trim().length > 0, 'bericht.txt ist leer');
  assert.ok(!fs.existsSync(path.join(out, 'zuordnung.psmap')), 'ohne --map darf keine Zuordnung entstehen');
});

test('Reihenfolge der Dateien ist stabil: Sortierung nach Codepunkten, bei zweitem Lauf identische Ausgabe', async () => {
  const { dir, out, r } = await getBaseRun();
  expectCode(r, 0, 'Stapellauf');
  // erwartete Reihenfolge nach Codepunkten: Alpha_Vertrag.docx, Zeta_Gutachten.txt, mitte_Rechnung.pdf
  assert.deepEqual([...ORDER].sort(), ORDER, 'Testannahme: ORDER ist nach Codepunkten sortiert');
  ORDER.forEach((_, i) => {
    const txt = read(out, `anonymisiert_00${i + 1}.txt`);
    assert.ok(txt.includes(MARKERS[i]), `anonymisiert_00${i + 1}.txt sollte "${MARKERS[i]}" enthalten, Inhalt: ${txt.slice(0, 200)}`);
    MARKERS.filter((_, j) => j !== i).forEach((m) => assert.ok(!txt.includes(m), `anonymisiert_00${i + 1}.txt enthaelt fremde Marke "${m}"`));
  });
  const out2 = path.join(tmp(), 'Ausgang2');
  const r2 = await runCli(['--in', dir, '--out', out2, '--report', '--ai', 'off']);
  expectCode(r2, 0, 'zweiter Lauf');
  for (let i = 1; i <= 3; i++) {
    const f = `anonymisiert_00${i}.txt`;
    assert.equal(read(out2, f), read(out, f), `${f} unterscheidet sich zwischen zwei Laeufen`);
  }
});

test('dieselbe Person in drei Dateien (TXT, DOCX, PDF) hat denselben Platzhalter (gemeinsamer Platzhalterraum)', async () => {
  const { out, r } = await getBaseRun();
  expectCode(r, 0, 'Stapellauf');
  const o1 = read(out, 'anonymisiert_001.txt'); // DOCX
  const o2 = read(out, 'anonymisiert_002.txt'); // TXT
  const o3 = read(out, 'anonymisiert_003.txt'); // PDF
  const T = '(\\{\\{NAME_\\d+\\}\\})';
  const m1 = new RegExp('Herr ' + T).exec(o1);
  const m2 = new RegExp('Herr ' + T + ' und Frau ' + T).exec(o2);
  const m3 = new RegExp('Herr ' + T).exec(o3);
  assert.ok(m1, 'DOCX: Person nicht ersetzt: ' + o1);
  assert.ok(m2, 'TXT: Personen nicht ersetzt: ' + o2);
  assert.ok(m3, 'PDF: Person nicht ersetzt: ' + o3);
  assert.equal(m2[1], m1[1], 'TXT hat einen anderen Platzhalter fuer dieselbe Person als DOCX');
  assert.equal(m3[1], m1[1], 'PDF hat einen anderen Platzhalter fuer dieselbe Person als DOCX');
  assert.notEqual(m2[2], m2[1], 'zwei verschiedene Personen duerfen nicht denselben Platzhalter haben');
  const email1 = /\{\{EMAIL_\d+\}\}/.exec(o1);
  assert.ok(email1, 'DOCX: E-Mail-Adresse nicht ersetzt');
});

test('Ausgabe, Bericht und Protokoll enthalten weder Dateinamen noch Fragmente der Testdokumente noch das Passwort', async () => {
  const { out, logFile, r } = await getBaseRun();
  expectCode(r, 0, 'Stapellauf');
  assertClean(r.stdout, 'Standardausgabe');
  assertClean(r.stderr, 'Standardfehler');
  assertClean(read(logFile), 'Protokolldatei');
  assertClean(read(out, 'bericht.txt'), 'bericht.txt');
  assertClean(read(out, 'bericht.json'), 'bericht.json');
  for (const f of ['anonymisiert_001.txt', 'anonymisiert_002.txt', 'anonymisiert_003.txt']) assertClean(read(out, f), f);
});

test('Fortschritt ohne Dateinamen und Zusammenfassung mit Zaehlern; Protokolldatei enthaelt dieselben Meldungen', async () => {
  const { r, logFile } = await getBaseRun();
  expectCode(r, 0, 'Stapellauf');
  assert.match(r.all, /Datei 1 von 3 verarbeitet/);
  assert.match(r.all, /Datei 3 von 3 verarbeitet/);
  assert.match(r.all, /3 Dateien, \d+ Funde, Gegenpr[uü]fung: /);
  const log = read(logFile);
  assert.match(log, /Datei 3 von 3 verarbeitet/);
  assert.match(log, /3 Dateien, \d+ Funde/);
});

test('--quiet unterdrueckt den Fortschritt, der Lauf gelingt', async () => {
  const dir = await makeInputDir();
  const out = path.join(tmp(), 'Ausgang');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--quiet']);
  expectCode(r, 0, '--quiet');
  assert.ok(!/Datei \d+ von \d+ verarbeitet/.test(r.all), 'Fortschritt trotz --quiet: ' + r.all.slice(-400));
  assert.equal(listDir(out).filter((f) => /^anonymisiert_/.test(f)).length, 3);
});

test('einzelne Datei als Eingabe liefert anonymisiert_001.txt', async () => {
  const dir = await makeInputDir();
  const out = path.join(tmp(), 'Ausgang');
  const r = await runCli(['--in', path.join(dir, NAMES.txt), '--out', out, '--ai', 'off']);
  expectCode(r, 0, 'Einzeldatei');
  assert.deepEqual(listDir(out), ['anonymisiert_001.txt']);
  assert.ok(read(out, 'anonymisiert_001.txt').includes('notiz zwei'));
  assert.ok(!read(out, 'anonymisiert_001.txt').includes('Müller'));
});

test('Ordner ohne --recursive: nur oberste Ebene; mit --recursive auch Unterordner; Dateien ohne unterstuetzte Endung werden uebergangen', async () => {
  const dir = path.join(tmp(), 'Eingang');
  fs.mkdirSync(path.join(dir, 'unter'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'oben.txt'), 'notiz oben: Herr Thomas Müller meldet sich.');
  fs.writeFileSync(path.join(dir, 'unter', 'tief.txt'), 'notiz tief: Frau Anna Weber meldet sich.');
  fs.writeFileSync(path.join(dir, 'ignoriert.xyz'), 'notiz fremd: kein Dokument');
  const out1 = path.join(tmp(), 'A1');
  const r1 = await runCli(['--in', dir, '--out', out1, '--ai', 'off']);
  expectCode(r1, 0, 'ohne --recursive');
  assert.deepEqual(listDir(out1), ['anonymisiert_001.txt']);
  assert.ok(read(out1, 'anonymisiert_001.txt').includes('notiz oben'));
  const out2 = path.join(tmp(), 'A2');
  const r2 = await runCli(['--in', dir, '--out', out2, '--ai', 'off', '--recursive']);
  expectCode(r2, 0, 'mit --recursive');
  assert.deepEqual(listDir(out2), ['anonymisiert_001.txt', 'anonymisiert_002.txt']);
  // Sortierung der relativen Pfade nach Codepunkten: "oben.txt" vor "unter/tief.txt"
  assert.ok(read(out2, 'anonymisiert_001.txt').includes('notiz oben'));
  assert.ok(read(out2, 'anonymisiert_002.txt').includes('notiz tief'));
  for (const f of listDir(out2)) { assert.ok(!read(out2, f).includes('fremd'), 'Datei ohne unterstuetzte Endung wurde verarbeitet'); }
});

test('Ausgabeordner wird angelegt (auch verschachtelt), vorhandene Dateien gleichen Namens werden ueberschrieben', async () => {
  const dir = await makeInputDir();
  const out = path.join(tmp(), 'neu', 'unter', 'ordner');
  const r1 = await runCli(['--in', path.join(dir, NAMES.txt), '--out', out, '--ai', 'off']);
  expectCode(r1, 0, 'neuer Ausgabeordner');
  assert.ok(fs.existsSync(path.join(out, 'anonymisiert_001.txt')));
  fs.writeFileSync(path.join(out, 'anonymisiert_001.txt'), 'ALTER INHALT');
  const r2 = await runCli(['--in', path.join(dir, NAMES.txt), '--out', out, '--ai', 'off']);
  expectCode(r2, 0, 'Ueberschreiben');
  assert.notEqual(read(out, 'anonymisiert_001.txt'), 'ALTER INHALT');
  assert.ok(read(out, 'anonymisiert_001.txt').includes('notiz zwei'));
});

// ---------------------------------------------------------------- Tests: Rueckgabecodes

test('falsches Profil ergibt Code 2 und eine Meldung ohne Pfadinhalte', async () => {
  const dir = await makeInputDir();
  const out = path.join(tmp(), 'Ausgang');
  const r = await runCli(['--in', dir, '--out', out, '--profile', 'foo']);
  expectCode(r, 2, 'falsches Profil');
  assert.match(r.all, /--profile/);
  assert.ok(!r.all.includes('Eingang_Kunde'), 'Meldung enthaelt Pfadinhalt');
  assert.ok(!fs.existsSync(out), 'bei Argumentfehlern darf nichts geschrieben werden');
});

test('vertipptes --profil ergibt Code 2, ohne einen Ausgabeordner anzulegen', async () => {
  const dir = await makeInputDir();
  const out = path.join(tmp(), 'Ausgang');
  const r = await runCli(['--in', dir, '--out', out, '--profil', 'strict', '--ai', 'off']);
  expectCode(r, 2, 'unbekannte Option');
  assert.match(r.all, /--profil/);
  assert.ok(!r.all.includes('Eingang_Kunde'), 'Meldung enthaelt Pfadinhalt');
  assert.ok(!fs.existsSync(out), 'bei Argumentfehlern darf nichts geschrieben werden');
});

test('fehlendes --out ergibt Code 2', async () => {
  const dir = await makeInputDir();
  const r = await runCli(['--in', dir]);
  expectCode(r, 2, 'fehlendes --out');
  assert.match(r.all, /--out/);
});

test('--password als Argument ergibt Code 2 und das Passwort erscheint nirgends in der Ausgabe', async () => {
  const dir = await makeInputDir();
  const out = path.join(tmp(), 'Ausgang');
  const r = await runCli(['--in', dir, '--out', out, '--password', 'geheim-wert-4711']);
  expectCode(r, 2, '--password');
  assert.ok(!r.all.includes('geheim-wert-4711'), 'Passwort in der Ausgabe');
  assert.match(r.all, /--password-env|--password-stdin/);
});

test('fehlende Eingabe (Datei oder Ordner existiert nicht) ergibt Code 3', async () => {
  const out = path.join(tmp(), 'Ausgang');
  const r = await runCli(['--in', path.join(tmp(), 'gibt-es-nicht'), '--out', out, '--ai', 'off']);
  expectCode(r, 3, 'fehlende Eingabe');
  assert.ok(r.all.trim().length > 0, 'keine Meldung');
  assert.ok(!r.all.includes('gibt-es-nicht'), 'Meldung enthaelt Pfadinhalt');
});

test('Ordner ohne unterstuetztes Dokument ergibt Code 3', async () => {
  const dir = path.join(tmp(), 'Leer');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'nur.xyz'), 'kein Dokument');
  const r = await runCli(['--in', dir, '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off']);
  expectCode(r, 3, 'kein unterstuetztes Dokument');
});

test('kaputtes Dokument (DOCX ohne gueltiges Archiv) ergibt Code 3', async () => {
  const dir = path.join(tmp(), 'Kaputt');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'defekt.docx'), 'das ist kein zip-archiv');
  const r = await runCli(['--in', dir, '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off']);
  expectCode(r, 3, 'kaputtes Format');
  assert.ok(!r.all.includes('defekt'), 'Meldung enthaelt Dateinamen');
});

test('Datei ueber 30 MB ergibt Code 3', async () => {
  const dir = tmp();
  const big = path.join(dir, 'gross.txt');
  fs.writeFileSync(big, Buffer.alloc(31 * 1024 * 1024, 'a'));
  const r = await runCli(['--in', big, '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off']);
  expectCode(r, 3, 'zu grosse Datei');
});

test('ungueltige --policy ergibt Code 3', async () => {
  const dir = await makeInputDir();
  const pol = path.join(tmp(), 'policy.json');
  fs.writeFileSync(pol, '{ das ist kein json');
  const r = await runCli(['--in', path.join(dir, NAMES.txt), '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off', '--policy', pol]);
  expectCode(r, 3, 'ungueltige Richtlinie');
});

test('--out innerhalb des Eingabeordners ergibt Code 3 und es wird nichts in den Eingabeordner geschrieben', async () => {
  const dir = await makeInputDir();
  const before = listDir(dir);
  const out = path.join(dir, 'ausgabe');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off']);
  expectCode(r, 3, '--out im Eingabeordner');
  assert.deepEqual(listDir(dir), before, 'Eingabeordner wurde veraendert');
  assert.ok(!fs.existsSync(out));
});

// ---------------------------------------------------------------- Tests: Gegenpruefung (Testhaken)

async function leakDir() {
  const dir = path.join(tmp(), 'Leck');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'kontakt.txt'), 'notiz vier: schreiben Sie bitte an max@firma.de zurueck.');
  return dir;
}
const HOOK = { PS_TEST_HOOKS: '1', PS_CLI_TEST_FIRST_PASS_OFF: 'email' };

test('--fail-on-findings: Leck fuer die Gegenpruefung ergibt Code 4, dieselbe Datei ohne Testhaken Code 0', async () => {
  const dir = await leakDir();
  const r4 = await runCli(['--in', dir, '--out', path.join(tmp(), 'A1'), '--ai', 'off', '--fail-on-findings'], { env: HOOK });
  expectCode(r4, 4, 'mit Leck');
  assert.match(r4.all, /Gegenpr[uü]fung: 1 Dat/);
  assert.ok(!r4.all.includes('max@firma.de'), 'Fund im Klartext in der Ausgabe');
  assert.ok(!r4.all.includes('kontakt'), 'Dateiname in der Ausgabe');
  const r0 = await runCli(['--in', dir, '--out', path.join(tmp(), 'A2'), '--ai', 'off', '--fail-on-findings']);
  expectCode(r0, 0, 'ohne Testhaken');
});

test('Testhaken wirkt nur mit PS_TEST_HOOKS=1; ohne --fail-on-findings bleibt der Code 0 trotz Resten', async () => {
  const dir = await leakDir();
  const ohneSchalter = await runCli(['--in', dir, '--out', path.join(tmp(), 'A1'), '--ai', 'off', '--fail-on-findings'], { env: { PS_CLI_TEST_FIRST_PASS_OFF: 'email' } });
  expectCode(ohneSchalter, 0, 'Variable ohne PS_TEST_HOOKS');
  const ohneOption = await runCli(['--in', dir, '--out', path.join(tmp(), 'A2'), '--ai', 'off'], { env: HOOK });
  expectCode(ohneOption, 0, 'Leck ohne --fail-on-findings');
  assert.match(ohneOption.all, /Gegenpr[uü]fung: 1 Dat/, 'Zusammenfassung soll die Reste melden');
});

// ---------------------------------------------------------------- Tests: KI

test('KI gefordert (Standard --ai auto), Modell fehlt: Code 5 mit klarer Meldung, kein stilles Zurueckfallen', { skip: PACKAGED ? 'Quelltext-Variante (makeAppVariant) greift nicht im gepackten Programm' : false }, async () => {
  const v = makeAppVariant({ dropModel: true });
  try {
    const dir = await makeInputDir();
    const out = path.join(tmp(), 'Ausgang');
    const r = await runCli(['--in', dir, '--out', out], { appDir: v.dir });
    expectCode(r, 5, 'Modell fehlt');
    assert.match(r.all, /KI|Modell/, 'Meldung nennt weder KI noch Modell: ' + r.all.slice(-400));
    assert.ok(!fs.existsSync(out) || listDir(out).filter((f) => /^anonymisiert_/.test(f)).length === 0, 'es duerfen keine Ergebnisse ohne KI entstehen');
    assertClean(r.all, 'Meldung bei fehlendem Modell');
    const rAuto = await runCli(['--in', dir, '--out', out, '--ai', 'auto'], { appDir: v.dir });
    expectCode(rAuto, 5, 'ausdrueckliches --ai auto');
  } finally { v.cleanup(); }
});

test('Modell fehlt, aber --ai off: Code 0', { skip: PACKAGED ? 'Quelltext-Variante (makeAppVariant) greift nicht im gepackten Programm' : false }, async () => {
  const v = makeAppVariant({ dropModel: true });
  try {
    const dir = await makeInputDir();
    const out = path.join(tmp(), 'Ausgang');
    const r = await runCli(['--in', dir, '--out', out, '--ai', 'off'], { appDir: v.dir });
    expectCode(r, 0, '--ai off ohne Modell');
    assert.equal(listDir(out).filter((f) => /^anonymisiert_/.test(f)).length, 3);
  } finally { v.cleanup(); }
});

// ---------------------------------------------------------------- Tests: Zuordnung (.psmap) und Passwort

const RT_FILES = {
  'Akte_A.txt': 'notiz a: Herr Thomas Müller schrieb an thomas.mueller@beispiel-firma.de.',
  'Akte_B.txt': 'notiz b: Frau Anna Weber und Herr Thomas Müller trafen sich in Berlin.',
};

async function makeRoundtripDir() {
  const dir = path.join(tmp(), 'Rundlauf');
  fs.mkdirSync(dir);
  for (const [n, t] of Object.entries(RT_FILES)) fs.writeFileSync(path.join(dir, n), t);
  return dir;
}

async function assertRoundtrip(out, r, MAP) {
  assert.ok(fs.existsSync(MAP), 'zuordnung.psmap fehlt');
  const bytes = new Uint8Array(fs.readFileSync(MAP));
  const payload = await PSMAP.decrypt(bytes, PASSWORD);
  assert.ok(payload && payload.state && payload.state.store, 'Nutzlast ohne state.store');
  assert.equal(payload.v, 1);
  assert.deepEqual(payload.docs.map((d) => d.name), Object.keys(RT_FILES).sort(), 'docs soll die Originalnamen in Verarbeitungsreihenfolge enthalten');
  assert.deepEqual(payload.docs.map((d) => d.index), [1, 2]);
  const names = Object.keys(RT_FILES).sort();
  names.forEach((n, i) => {
    const anon = read(out, `anonymisiert_00${i + 1}.txt`);
    assert.ok(!anon.includes('Müller') && !anon.includes('beispiel-firma'), `${n}: Klartext im Ergebnis`);
    const back = PSDetect.deanonymize(anon, payload.state);
    assert.equal(back, RT_FILES[n], `${n}: Rundlauf stellt den Originaltext nicht exakt her`);
  });
  // dieselbe Person: genau ein Platzhalter fuer "Thomas Müller" im gemeinsamen Speicher
  const keys = Object.entries(payload.state.store).filter(([, e]) => e.v === 'Thomas Müller').map(([k]) => k);
  assert.equal(keys.length, 1, 'Thomas Müller soll genau einen Platzhalter haben: ' + JSON.stringify(keys));
  assert.ok(read(out, 'anonymisiert_001.txt').includes(keys[0]) && read(out, 'anonymisiert_002.txt').includes(keys[0]));
  assertClean(r.all, 'Ausgabe beim Erzeugen der Zuordnung');
}

test('--map ohne Passwortquelle ergibt Code 2', async () => {
  const dir = await makeRoundtripDir();
  const out = path.join(tmp(), 'Ausgang');
  const MAP = path.join(tmp(), 'zuordnung.psmap');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--map', MAP]);
  expectCode(r, 2, '--map ohne Passwortquelle');
  assert.match(r.all, /--password-env|--password-stdin/);
});

test('--map mit beiden Passwortquellen zugleich ergibt Code 2', async () => {
  const dir = await makeRoundtripDir();
  const out = path.join(tmp(), 'Ausgang');
  const MAP = path.join(tmp(), 'zuordnung.psmap');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--map', MAP, '--password-env', PW_ENV, '--password-stdin'], { env: { [PW_ENV]: PASSWORD }, stdin: PASSWORD + '\n' });
  expectCode(r, 2, 'beide Passwortquellen');
  assert.ok(!r.all.includes(PASSWORD));
});

test('--map mit --password-env: zuordnung.psmap wird geschrieben, entschluesselt und stellt die Texte im Rundlauf exakt wieder her', async () => {
  const dir = await makeRoundtripDir();
  const out = path.join(tmp(), 'Ausgang');
  const MAP = path.join(tmp(), 'zuordnung.psmap');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--map', MAP, '--password-env', PW_ENV], { env: { [PW_ENV]: PASSWORD } });
  expectCode(r, 0, '--password-env');
  await assertRoundtrip(out, r, MAP);
  await assert.rejects(PSMAP.decrypt(new Uint8Array(fs.readFileSync(MAP)), 'ganz anderes Passwort'), 'falsches Passwort darf nicht entschluesseln');
});

// Windows: Sowohl Electron im Quelltextlauf als auch die gebaute GUI-exe haben keine nutzbare Standardeingabe.
test('--map mit --password-stdin ist gleichwertig (eine Zeile von der Standardeingabe)', { skip: process.platform === 'win32' && 'Windows-Electron ohne Standardeingabe (siehe docs/kommandozeile.md)' }, async () => {
  const dir = await makeRoundtripDir();
  const out = path.join(tmp(), 'Ausgang');
  const MAP = path.join(tmp(), 'zuordnung.psmap');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--map', MAP, '--password-stdin'], { stdin: PASSWORD + '\n' });
  expectCode(r, 0, '--password-stdin');
  await assertRoundtrip(out, r, MAP);
});

test('Windows: --password-stdin meldet Code 2 und schreibt keine Zuordnung', { skip: process.platform !== 'win32' }, async () => {
  const dir = await makeRoundtripDir();
  const out = path.join(tmp(), 'Ausgang');
  const MAP = path.join(tmp(), 'zuordnung.psmap');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--map', MAP, '--password-stdin'], { stdin: PASSWORD + '\n' });
  expectCode(r, 2, 'Windows ohne Standardeingabe');
  assert.match(r.all, /Standardeingabe/);
  assert.ok(!fs.existsSync(MAP), 'ohne Passwort darf keine Zuordnung entstehen');
});

test('Zuordnung mit DOCX und PDF: docs enthaelt die Originalnamen und der Rundlauf stellt Person und E-Mail wieder her', async () => {
  const dir = await makeInputDir();
  const out = path.join(tmp(), 'Ausgang');
  const MAP = path.join(tmp(), 'zuordnung.psmap');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--map', MAP, '--password-env', PW_ENV], { env: { [PW_ENV]: PASSWORD } });
  expectCode(r, 0, 'Zuordnung mit drei Formaten');
  const payload = await PSMAP.decrypt(new Uint8Array(fs.readFileSync(MAP)), PASSWORD);
  assert.deepEqual(payload.docs.map((d) => d.name), ORDER);
  const back = PSDetect.deanonymize(read(out, 'anonymisiert_001.txt'), payload.state);
  assert.ok(back.includes('Herr Thomas Müller'), 'DOCX: Person nicht wiederhergestellt: ' + back);
  assert.ok(back.includes('thomas.mueller@beispiel-firma.de'), 'DOCX: E-Mail nicht wiederhergestellt');
  assert.ok(PSDetect.deanonymize(read(out, 'anonymisiert_003.txt'), payload.state).includes('Herr Thomas Müller'), 'PDF: Person nicht wiederhergestellt');
  assertClean(r.all, 'Ausgabe');
});

test('zu kurzes Passwort fuer die Zuordnung ergibt einen Fehler (nicht 0) ohne Passwort in der Ausgabe', async () => {
  const dir = await makeRoundtripDir();
  const out = path.join(tmp(), 'Ausgang');
  const MAP = path.join(tmp(), 'zuordnung.psmap');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--map', MAP, '--password-env', PW_ENV], { env: { [PW_ENV]: 'kurz' } });
  assert.equal(r.timedOut, false, 'Prozess hing');
  assert.notEqual(r.code, 0, 'zu kurzes Passwort darf nicht zum Erfolg fuehren: ' + r.all.slice(-300));
  assert.ok(!fs.existsSync(MAP), 'es darf keine Zuordnung mit schwachem Passwort entstehen');
});

// ---------------------------------------------------------------- Tests: Pruefermaengel (Reparaturzyklus E1.w)

const DONT_RUN_ON_WIN = process.platform === 'win32' ? 'Verknuepfungen brauchen unter Windows besondere Rechte' : false;

test('Standardfall --ai auto mit vorhandenem Modell: Exit 0 und der Personenname ist maskiert', { skip: PACKAGED ? 'Modellpfad im gepackten Programm nicht pruefbar' : (fs.existsSync(path.join(ROOT, 'app', 'models', 'Xenova')) ? false : 'Modell nicht im Arbeitsbaum') }, async () => {
  const dir = path.join(tmp(), 'KI_Eingang');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'protokoll.txt'), 'notiz ki: Die Besprechung mit Thomas Müller aus Berlin findet morgen statt.');
  const out = path.join(tmp(), 'Ausgang');
  const r = await runCli(['--in', dir, '--out', out], { timeout: 240000 });
  expectCode(r, 0, '--ai auto mit Modell');
  assert.deepEqual(listDir(out), ['anonymisiert_001.txt']);
  const txt = read(out, 'anonymisiert_001.txt');
  assert.ok(txt.includes('notiz ki'), 'Text fehlt: ' + txt);
  assert.ok(!txt.includes('Müller'), 'Name nicht maskiert: ' + txt);
});

test('Einzeldatei als --in mit --out im selben Ordner: Code 3, Eingabedatei bleibt unveraendert (auch bei Namen anonymisiert_001.txt)', async () => {
  const dir = path.join(tmp(), 'Einzel');
  fs.mkdirSync(dir);
  const f = path.join(dir, 'anonymisiert_001.txt');
  fs.writeFileSync(f, 'notiz original: Herr Thomas Müller meldet sich.');
  const before = fs.readFileSync(f, 'utf8');
  const r = await runCli(['--in', f, '--out', dir, '--ai', 'off']);
  expectCode(r, 3, 'Einzeldatei, --out im Eingabeordner');
  assert.equal(fs.readFileSync(f, 'utf8'), before, 'Eingabedatei wurde veraendert');
  assert.deepEqual(listDir(dir), ['anonymisiert_001.txt'], 'im Eingabeordner darf nichts dazukommen');
  const r2 = await runCli(['--in', f, '--out', path.join(dir, 'unter'), '--ai', 'off']);
  expectCode(r2, 3, 'Einzeldatei, --out unterhalb des Eingabeordners');
  assert.ok(!fs.existsSync(path.join(dir, 'unter')));
});

test('--map zeigt auf die Eingabedatei oder in den Eingabeordner: Code 3, Datei unveraendert', async () => {
  const dir = path.join(tmp(), 'MapEin');
  fs.mkdirSync(dir);
  const f = path.join(dir, 'akte.txt');
  fs.writeFileSync(f, 'notiz map: Herr Thomas Müller meldet sich.');
  const before = fs.readFileSync(f, 'utf8');
  const env = { [PW_ENV]: PASSWORD };
  const r = await runCli(['--in', f, '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off', '--map', f, '--password-env', PW_ENV], { env });
  expectCode(r, 3, '--map gleich Eingabedatei');
  assert.equal(fs.readFileSync(f, 'utf8'), before, 'Eingabedatei wurde ueberschrieben');
  const r2 = await runCli(['--in', f, '--out', path.join(tmp(), 'Ausgang2'), '--ai', 'off', '--map', path.join(dir, 'z.psmap'), '--password-env', PW_ENV], { env });
  expectCode(r2, 3, '--map im Ordner der Eingabedatei');
  assert.ok(!fs.existsSync(path.join(dir, 'z.psmap')));
  const r3 = await runCli(['--in', dir, '--out', path.join(tmp(), 'Ausgang3'), '--ai', 'off', '--map', f, '--password-env', PW_ENV], { env });
  expectCode(r3, 3, '--map gleich Datei im Eingabeordner');
  assert.equal(fs.readFileSync(f, 'utf8'), before, 'Datei im Eingabeordner wurde ueberschrieben');
});

test('--log gleich Eingabedatei oder im Eingabeordner: Code 3, nichts wird in den Eingabeordner geschrieben', async () => {
  const dir = path.join(tmp(), 'LogEin');
  fs.mkdirSync(dir);
  const f = path.join(dir, 'akte.txt');
  fs.writeFileSync(f, 'notiz log: Herr Thomas Müller meldet sich.');
  const before = fs.readFileSync(f, 'utf8');
  const r = await runCli(['--in', f, '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off', '--log', f]);
  expectCode(r, 3, '--log gleich Eingabedatei');
  assert.equal(fs.readFileSync(f, 'utf8'), before, 'Eingabedatei wurde durch das Protokoll veraendert');
  const r2 = await runCli(['--in', dir, '--out', path.join(tmp(), 'Ausgang2'), '--ai', 'off', '--log', path.join(dir, 'lauf.log')]);
  expectCode(r2, 3, '--log im Eingabeordner');
  assert.deepEqual(listDir(dir), ['akte.txt'], 'im Eingabeordner darf kein Protokoll entstehen');
  const r3 = await runCli(['--in', f, '--out', path.join(tmp(), 'Ausgang3'), '--ai', 'off', '--log', path.join(dir, 'lauf.log')]);
  expectCode(r3, 3, '--log im Ordner der Eingabedatei');
  assert.deepEqual(listDir(dir), ['akte.txt']);
});

test('verknuepfte Datei im Eingabeordner, die aus dem Ordner herauszeigt, wird uebersprungen und nicht gelesen', { skip: DONT_RUN_ON_WIN }, async () => {
  const base = tmp();
  const outside = path.join(base, 'extern.txt');
  fs.writeFileSync(outside, 'notiz extern: GEHEIMMARKE Herr Thomas Müller steht nur ausserhalb.');
  const dir = path.join(base, 'MitLink');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'eigen.txt'), 'notiz eigen: Frau Anna Weber meldet sich.');
  fs.symlinkSync(outside, path.join(dir, 'link.txt'));
  const out = path.join(tmp(), 'Ausgang');
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off']);
  expectCode(r, 0, 'Ordner mit Verknuepfung');
  assert.deepEqual(listDir(out), ['anonymisiert_001.txt'], 'die verknuepfte Datei darf nicht verarbeitet werden');
  assert.ok(read(out, 'anonymisiert_001.txt').includes('notiz eigen'));
  assert.ok(!r.all.includes('GEHEIMMARKE') && !read(out, 'anonymisiert_001.txt').includes('GEHEIMMARKE'));
  const nur = path.join(base, 'NurLink');
  fs.mkdirSync(nur);
  fs.symlinkSync(outside, path.join(nur, 'link.txt'));
  const r2 = await runCli(['--in', nur, '--out', path.join(tmp(), 'Ausgang2'), '--ai', 'off']);
  expectCode(r2, 3, 'Ordner nur mit Verknuepfung');
});

test('Lesefehler mitten im Stapel (2. Datei kaputtes DOCX): Code 3 und keine anonymisiert_*-Dateien im Ausgabeordner', async () => {
  const dir = path.join(tmp(), 'Halb');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'a_gut.txt'), 'notiz a: Herr Thomas Müller meldet sich.');
  fs.writeFileSync(path.join(dir, 'b_kaputt.docx'), 'das ist kein zip-archiv');
  fs.writeFileSync(path.join(dir, 'c_gut.txt'), 'notiz c: Frau Anna Weber meldet sich.');
  const out = path.join(tmp(), 'Ausgang');
  fs.mkdirSync(out);
  const r = await runCli(['--in', dir, '--out', out, '--ai', 'off', '--report']);
  expectCode(r, 3, 'Lesefehler mitten im Stapel');
  assert.deepEqual(listDir(out).filter((n) => /^anonymisiert_/.test(n)), [], 'es duerfen keine Teilergebnisse stehen bleiben');
});

async function waitFor(cond, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (cond()) return true; await new Promise((res) => setTimeout(res, 100)); }
  return cond();
}
const runDirs = (d) => fs.readdirSync(d).filter((n) => n.startsWith('psc-run-'));
const tmpEnv = (d) => ({ TMPDIR: d, TMP: d, TEMP: d });

test('nach einem Lauf bleibt kein psc-run-*-Ordner im Temp-Ordner liegen', async () => {
  const t = tmp('ps-cli-tmpdir-');
  const dir = await makeInputDir();
  const r = await runCli(['--in', path.join(dir, NAMES.txt), '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off'], { env: tmpEnv(t) });
  expectCode(r, 0, 'Lauf mit eigenem TMPDIR');
  assert.ok(await waitFor(() => runDirs(t).length === 0), 'uebrig geblieben: ' + runDirs(t).join(', '));
});

test('Aufraeumen alter psc-run-*-Ordner: ein unlesbarer Eintrag stoppt das Aufraeumen der anderen nicht', { skip: DONT_RUN_ON_WIN }, async () => {
  const t = tmp('ps-cli-tmpdir-');
  const old = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const olds = [];
  for (let i = 0; i < 10; i++) {
    const d = path.join(t, `psc-run-alt${i}`);
    fs.mkdirSync(d);
    fs.writeFileSync(path.join(d, 'x'), 'x');
    fs.utimesSync(d, old, old);
    olds.push(d);
  }
  for (let i = 0; i < 10; i++) fs.symlinkSync(path.join(t, 'gibt-es-nicht'), path.join(t, `psc-run-kaputt${i}`));
  const dir = await makeInputDir();
  const r = await runCli(['--in', path.join(dir, NAMES.txt), '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off'], { env: tmpEnv(t) });
  expectCode(r, 0, 'Lauf mit Altlasten');
  assert.ok(await waitFor(() => olds.every((d) => !fs.existsSync(d))), 'alte Ordner blieben liegen: ' + olds.filter((d) => fs.existsSync(d)).length);
});

test('--password-env mit Namen aus der Objekt-Kette (constructor) gilt als nicht gesetzt: Code 2 mit klarer Meldung', async () => {
  const dir = await makeRoundtripDir();
  const r = await runCli(['--in', dir, '--out', path.join(tmp(), 'Ausgang'), '--ai', 'off', '--map', path.join(tmp(), 'z.psmap'), '--password-env', 'constructor']);
  expectCode(r, 2, '--password-env constructor');
  assert.match(r.all, /nicht gesetzt oder leer/);
});
