// A4.m: Dateinamen-Hygiene (PSLib.hygiene.safeName). Rote Tests aus der Spezifikation V2-A, Abschnitt A4.m.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

const safeName = (...a) => loadLib('hygiene').safeName(...a);

test('Standard: Originalname geht nicht ein, Muster anonymisiert_NNN.txt', () => {
  assert.equal(safeName('Müller_Hans_Kündigung.docx', 3, {}), 'anonymisiert_003.txt');
});

test('Standard: ext .pdf wird uebernommen', () => {
  assert.equal(safeName('Müller_Hans_Kündigung.docx', 3, { ext: '.pdf' }), 'anonymisiert_003.pdf');
});

test('Standard: Index 1000 ergibt anonymisiert_1000.txt', () => {
  assert.equal(safeName('x.docx', 1000, {}), 'anonymisiert_1000.txt');
});

test('Standard: Optionen duerfen fehlen', () => {
  assert.equal(safeName('x.docx', 1), 'anonymisiert_001.txt');
});

test('Erlaubte Endungen: .txt .pdf .json .zip .psmap', () => {
  for (const ext of ['.txt', '.pdf', '.json', '.zip', '.psmap']) {
    assert.equal(safeName('x', 7, { ext }), 'anonymisiert_007' + ext);
  }
});

test('Index 0 wirft RangeError', () => {
  assert.throws(() => safeName('x', 0, {}), RangeError);
});

test('Index -1 wirft RangeError', () => {
  assert.throws(() => safeName('x', -1, {}), RangeError);
});

test('Index 1.5 wirft RangeError', () => {
  assert.throws(() => safeName('x', 1.5, {}), RangeError);
});

test("Index 'a' wirft RangeError", () => {
  assert.throws(() => safeName('x', 'a', {}), RangeError);
});

test('ext .exe wirft RangeError', () => {
  assert.throws(() => safeName('x', 1, { ext: '.exe' }), RangeError);
});

test('keepName: Pfadangriff ../../etc/passwd enthaelt weder Schraegstrich noch Doppelpunkt', () => {
  const r = safeName('../../etc/passwd', 2, { keepName: true });
  assert.ok(!r.includes('/'), r);
  assert.ok(!r.includes(':'), r);
  assert.ok(r.endsWith('_anonymisiert.txt'), r);
});

test('keepName: Name mit 200 Zeichen wird auf 80 gekuerzt', () => {
  assert.equal(safeName('a'.repeat(200) + '.docx', 1, { keepName: true }), 'a'.repeat(80) + '_anonymisiert.txt');
});

test('keepName: Kuerzung zaehlt Codepunkte, nicht UTF-16-Einheiten', () => {
  const r = safeName('\u{1F600}'.repeat(100) + '.docx', 1, { keepName: true });
  assert.equal(r, '\u{1F600}'.repeat(80) + '_anonymisiert.txt');
});

test('keepName: CON.txt wird _CON_anonymisiert.txt', () => {
  assert.equal(safeName('CON.txt', 1, { keepName: true }), '_CON_anonymisiert.txt');
});

test('keepName: reservierte Namen ohne Beachtung der Gross-/Kleinschreibung (lpt1, Com9)', () => {
  assert.equal(safeName('lpt1.docx', 1, { keepName: true }), '_lpt1_anonymisiert.txt');
  assert.equal(safeName('Com9.docx', 1, { keepName: true }), '_Com9_anonymisiert.txt');
});

test('keepName: normaler Name bleibt erhalten, Endung wird ersetzt', () => {
  assert.equal(safeName('Bericht.docx', 4, { keepName: true, ext: '.pdf' }), 'Bericht_anonymisiert.pdf');
});

test('keepName: verbotene Zeichen werden zu _ und Folgen zu einem _', () => {
  assert.equal(safeName('a\\b/c:d*e?f"g<h>i|j.docx', 1, { keepName: true }), 'a_b_c_d_e_f_g_h_i_j_anonymisiert.txt');
  assert.equal(safeName('a///b.docx', 1, { keepName: true }), 'a_b_anonymisiert.txt');
});

test('keepName: Steuerzeichen U+0000 bis U+001F und U+007F werden ersetzt', () => {
  const r = safeName('a\u0000b\u001fc\u007fd.docx', 1, { keepName: true });
  assert.equal(r, 'a_b_c_d_anonymisiert.txt');
});

test('keepName: Leerzeichen und Punkte am Rand werden entfernt', () => {
  assert.equal(safeName('  ..Name.. .docx', 1, { keepName: true }), 'Name_anonymisiert.txt');
});

test('keepName: nur die letzte Endung wird abgetrennt', () => {
  assert.equal(safeName('a.b.docx', 1, { keepName: true }), 'a.b_anonymisiert.txt');
});

test('keepName: bleibt nichts uebrig, gilt der Standardname', () => {
  assert.equal(safeName('???.docx', 5, { keepName: true }), 'anonymisiert_005.txt');
  assert.equal(safeName('', 5, { keepName: true }), 'anonymisiert_005.txt');
});

test('NFC-Normalisierung: zerlegtes e + Akzent wird zu einem Zeichen', () => {
  const r = safeName('Ame\u0301lie.docx', 1, { keepName: true });
  assert.equal(r, 'Am\u00e9lie_anonymisiert.txt');
  assert.equal(r, r.normalize('NFC'));
});

test('Ergebnis enthaelt nie einen Pfadtrenner (viele boese Eingaben, beide Modi)', () => {
  const inputs = ['../../etc/passwd', '..\\..\\Windows\\system32', 'a/b\\c', '/abs/path.docx', 'C:\\x\\y.txt', '....//....//x', '\u0000/x'];
  for (const name of inputs) {
    for (const keepName of [false, true]) {
      const r = safeName(name, 1, { keepName });
      assert.ok(!/[\\/]/.test(r), name + ' -> ' + r);
    }
  }
});
