// PSLib.cliargs (E1.m): Argumente aus process.argv, Kommandozeilenmodus und "Oeffnen mit"
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const C = loadLib('cliargs');

test('parse: Playwright-Aufruf mit Chromium-Schaltern ergibt die eigenen Optionen', () => {
  const r = C.parse(['/x/electron', '--inspect=0', '--remote-debugging-port=0', '/app', '--no-sandbox',
    '--cli', '--in', 'C:\\Users\\a b\\Doku', '--out=/tmp/o', '--report']);
  assert.equal(r.cli, true);
  assert.equal(r.opts.in, 'C:\\Users\\a b\\Doku');
  assert.equal(r.opts.out, '/tmp/o');
  assert.equal(r.opts.report, true);
  assert.equal(r.code, 0);
  assert.deepEqual(r.errors, []);
});

test('parse: ohne --cli ist cli false, opts leer, keine Fehler, code 0', () => {
  const r = C.parse(['/x/electron', '/app', '--no-sandbox', '/home/u/a.docx']);
  assert.equal(r.cli, false);
  assert.deepEqual(r.opts, {});
  assert.deepEqual(r.errors, []);
  assert.equal(r.code, 0);
});

test('parse: Schreibweise "--in x" und "--in=x" sind gleichwertig', () => {
  const a = C.parse(['p', '--cli', '--in', 'x', '--out', 'y']);
  const b = C.parse(['p', '--cli', '--in=x', '--out=y']);
  assert.equal(a.opts.in, 'x');
  assert.equal(b.opts.in, 'x');
  assert.equal(a.opts.out, 'y');
  assert.equal(b.opts.out, 'y');
  assert.equal(a.code, 0);
  assert.equal(b.code, 0);
});

test('parse: Standardwerte (profile standard, ai auto, Schalter false)', () => {
  const r = C.parse(['p', '--cli', '--in', 'x', '--out', 'y']);
  assert.equal(r.opts.profile, 'standard');
  assert.equal(r.opts.ai, 'auto');
  for (const k of ['report', 'passwordStdin', 'failOnFindings', 'recursive', 'quiet']) {
    assert.equal(r.opts[k], false, k);
  }
  for (const k of ['policy', 'map', 'passwordEnv', 'log']) {
    assert.equal(r.opts[k], undefined, k);
  }
});

test('parse: --profile maximal ist ein Alias fuer strict', () => {
  const r = C.parse(['p', '--cli', '--in', 'x', '--out', 'y', '--profile', 'maximal']);
  assert.equal(r.opts.profile, 'strict');
  assert.equal(r.code, 0);
});

for (const pr of ['standard', 'finance', 'medical', 'strict']) {
  test(`parse: --profile ${pr} ist gueltig`, () => {
    const r = C.parse(['p', '--cli', '--in', 'x', '--out', 'y', '--profile=' + pr]);
    assert.equal(r.opts.profile, pr);
    assert.equal(r.code, 0);
  });
}

test('parse: --ai off wird als off uebernommen', () => {
  const r = C.parse(['p', '--cli', '--in', 'x', '--out', 'y', '--ai', 'off']);
  assert.equal(r.opts.ai, 'off');
  assert.equal(r.code, 0);
});

test('parse: alle Optionen und Schalter landen in opts', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--policy', 'pol.json', '--map', 'm.psmap',
    '--password-env', 'PS_PW', '--log', 'l.txt', '--report', '--fail-on-findings', '--recursive', '--quiet']);
  assert.equal(r.code, 0);
  assert.equal(r.opts.policy, 'pol.json');
  assert.equal(r.opts.map, 'm.psmap');
  assert.equal(r.opts.passwordEnv, 'PS_PW');
  assert.equal(r.opts.log, 'l.txt');
  assert.equal(r.opts.report, true);
  assert.equal(r.opts.failOnFindings, true);
  assert.equal(r.opts.recursive, true);
  assert.equal(r.opts.quiet, true);
});

test('parse: --password-stdin mit --map ist gueltig', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--map', 'x.psmap', '--password-stdin']);
  assert.equal(r.code, 0);
  assert.equal(r.opts.passwordStdin, true);
});

test('parse: bekannte Chromium-Schalter (--no-sandbox, --inspect=0, --user-data-dir=...) werden ignoriert', () => {
  const r = C.parse(['p', '--cli', '--no-sandbox', '--inspect=0', '--user-data-dir=/u', '--in', 'a', '--out', 'b']);
  assert.equal(r.code, 0);
  assert.deepEqual(r.errors, []);
  assert.equal(r.opts.in, 'a');
});

test('parse: vertipptes --profil wird abgelehnt statt mit Standardprofil fortzufahren', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--profil', 'strict']);
  assert.equal(r.code, 2);
  assert.equal(r.opts.profile, 'standard');
  assert.match(r.errors.join('\n'), /--profil/);
});

test('parse: unbekannter eigener Schalter mit Wert wird ohne den Wert gemeldet', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--geheim=/vertraulicher/pfad']);
  assert.equal(r.code, 2);
  assert.match(r.errors.join('\n'), /--geheim/);
  assert.equal(r.errors.join('\n').includes('/vertraulicher/pfad'), false);
});

test('parse: unbekannte Laufzeitoption vor --cli bleibt dem Programmstart vorbehalten', () => {
  const r = C.parse(['p', '--zukuenftige-electron-option=x', '--cli', '--in', 'a', '--out', 'b']);
  assert.equal(r.code, 0);
  assert.deepEqual(r.errors, []);
});

test('parse: --map allein (ohne Passwortquelle) ist ein Fehler mit code 2', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--map', 'x.psmap']);
  assert.equal(r.code, 2);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /--password-env/);
  assert.match(r.errors[0], /--password-stdin/);
});

test('parse: --map mit beiden Passwortquellen ist ein Fehler mit code 2', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--map', 'x.psmap',
    '--password-env', 'PW', '--password-stdin']);
  assert.equal(r.code, 2);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /--password-env/);
  assert.match(r.errors[0], /--password-stdin/);
});

test('parse: --password geheim ist ein Fehler und die Meldung enthaelt "geheim" nicht', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--password', 'geheim']);
  assert.equal(r.code, 2);
  assert.ok(r.errors.length >= 1);
  const text = r.errors.join('\n');
  assert.equal(text.includes('geheim'), false);
  assert.match(text, /--password-env/);
  assert.match(text, /--password-stdin/);
});

test('parse: --passwort=geheim ist ebenfalls ein Fehler ohne den Wert in der Meldung', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--passwort=geheim']);
  assert.equal(r.code, 2);
  assert.equal(r.errors.join('\n').includes('geheim'), false);
});

test('parse: --profile foo ist ein Fehler mit code 2', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--profile', 'foo']);
  assert.equal(r.code, 2);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /--profile/);
});

test('parse: --ai maybe ist ein Fehler mit code 2', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--ai', 'maybe']);
  assert.equal(r.code, 2);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /--ai/);
});

test('parse: --out am Ende ohne Wert ist ein Fehler mit code 2', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out']);
  assert.equal(r.code, 2);
  assert.ok(r.errors.some((e) => /--out/.test(e)));
});

test('parse: --password-env 1ABC (ungueltiger Variablenname) ist ein Fehler mit code 2', () => {
  const r = C.parse(['p', '--cli', '--in', 'a', '--out', 'b', '--password-env', '1ABC']);
  assert.equal(r.code, 2);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /--password-env/);
});

test('parse: fehlendes --in ist ein Fehler mit code 2', () => {
  const r = C.parse(['p', '--cli', '--out', 'b']);
  assert.equal(r.code, 2);
  assert.ok(r.errors.some((e) => /--in/.test(e)));
});

test('parse: fehlendes --out ist ein Fehler mit code 2', () => {
  const r = C.parse(['p', '--cli', '--in', 'a']);
  assert.equal(r.code, 2);
  assert.ok(r.errors.some((e) => /--out/.test(e)));
});

test('parse: Fehlermeldungen enthalten keine Pfadinhalte', () => {
  const r = C.parse(['p', '--cli', '--in', '/geheim/Pfad/Mueller', '--map', '/geheim/Pfad/x.psmap']);
  assert.equal(r.code, 2);
  const text = r.errors.join('\n');
  assert.equal(text.includes('Mueller'), false);
  assert.equal(text.includes('/geheim'), false);
});

test('fileArgs: Windows-Aufruf der installierten Programmdatei liefert die Datei', () => {
  const r = C.fileArgs(['C:\\PS\\PrivacyShield.exe', 'C:\\a b\\x.txt', '--flag'],
    { appPath: 'C:\\PS\\resources\\app.asar', defaultApp: false });
  assert.deepEqual(r, ['C:\\a b\\x.txt']);
});

test('fileArgs: Entwicklungsaufruf (defaultApp) liefert beide Dateien in Reihenfolge', () => {
  const r = C.fileArgs(['/e/electron', '--inspect=0', '--remote-debugging-port=0', '/app', '--no-sandbox',
    '--user-data-dir=/u', '/home/u/a.docx', '/home/u/b.txt'], { appPath: '/app', defaultApp: true });
  assert.deepEqual(r, ['/home/u/a.docx', '/home/u/b.txt']);
});

test('fileArgs: appPath mit abschliessendem Schrägstrich wird ebenfalls ausgeschlossen', () => {
  const r = C.fileArgs(['/e/electron', '/app/', '/home/u/a.docx'], { appPath: '/app', defaultApp: true });
  assert.deepEqual(r, ['/home/u/a.docx']);
});

test('fileArgs: macOS-Aufruf ohne Argumente ergibt eine leere Liste', () => {
  assert.deepEqual(C.fileArgs(['/Applications/PrivacyShield.app/Contents/MacOS/PrivacyShield'],
    { appPath: '/Applications/PrivacyShield.app/Contents/Resources/app.asar', defaultApp: false }), []);
});

test('fileArgs: Token mit fuehrendem Minus werden nie als Datei geliefert', () => {
  const r = C.fileArgs(['/x/ps', '--cli', '-v', '--in=a'], { appPath: '/app', defaultApp: false });
  assert.deepEqual(r, []);
});
