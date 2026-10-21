// PSLib.leakcheck (A1.m): Gegenpruefung des Ergebnisses (Restrisiko-Scan)
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLib } from './_load.mjs';

// Lazy laden, damit jeder Testfall einzeln rot wird, solange das Modul fehlt.
const L = () => loadLib('leakcheck');

// Stub-Erkennung: feste Spans, protokolliert den erhaltenen Text
function stub(spans) {
  const calls = [];
  const detect = (t) => { calls.push(t); return spans.map((s) => ({ ...s })); };
  detect.calls = calls;
  return detect;
}
const at = (text, sub, pfx, extra = {}) => {
  const start = text.indexOf(sub);
  return { start, end: start + sub.length, pfx, ...extra };
};

test('Text nur aus Platzhaltern und Fuelltext ist sauber; detect erhaelt maskierten Text', () => {
  const text = 'Hallo {{NAME_1}}, Ihre Mail {{EMAIL_1}} wurde an {{ORG_2}} gesendet.';
  const d = stub([]);
  const r = L().scan(text, { detect: d });
  assert.equal(r.clean, true);
  assert.equal(r.count, 0);
  assert.equal(d.calls.length, 1);
  assert.ok(!d.calls[0].includes('{{'));
  assert.ok(d.calls[0].includes('\u0000'));
  assert.equal(d.calls[0].length, text.length);
  assert.ok(!d.calls[0].includes('x'.repeat(3)));
});

test('E-Mail im Ergebnis ergibt einen Fund der Schwere hoch mit richtigen Positionen', () => {
  const text = 'Bitte melden unter max@firma.de';
  const sp = at(text, 'max@firma.de', 'EMAIL');
  const r = L().scan(text, { detect: stub([sp]) });
  assert.equal(r.clean, false);
  assert.equal(r.count, 1);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].type, 'EMAIL');
  assert.equal(r.findings[0].severity, 'hoch');
  assert.equal(r.findings[0].start, sp.start);
  assert.equal(r.findings[0].end, sp.end);
});

test('Fund, der einen Platzhalter ueberlappt, wird verworfen', () => {
  const text = 'Kontakt: {{EMAIL_1}} bitte';
  const sp = at(text, '{{EMAIL_1}}', 'EMAIL');
  const teil = { start: sp.start + 3, end: sp.end + 3, pfx: 'NAME' };
  const r = L().scan(text, { detect: stub([sp, teil]) });
  assert.equal(r.count, 0);
  assert.equal(r.clean, true);
});

test('{{max@firma.de}} ist kein Platzhalter und bleibt im maskierten Text sichtbar', () => {
  const text = 'Mail {{max@firma.de}} hier';
  const d = stub([]);
  L().scan(text, { detect: d });
  assert.ok(d.calls[0].includes('max@firma.de'));
  assert.equal(d.calls[0].length, text.length);
});

test('Whitelist wirkt als Teilzeichenfolge ohne Beachtung der Gross-/Kleinschreibung und zaehlt', () => {
  const text = 'Bitte melden unter max@firma.de';
  const sp = at(text, 'max@firma.de', 'EMAIL');
  const r = L().scan(text, { detect: stub([sp]), whitelist: ['FIRMA.de'] });
  assert.equal(r.count, 0);
  assert.equal(r.clean, true);
  assert.equal(r.whitelisted, 1);
});

test('released gibt exakt gleichen Wert gleichen Typs frei, nicht Annabelle und nicht anna', () => {
  const text = 'Anna und Annabelle und anna';
  const spans = [at(text, 'Anna', 'NAME'), at(text, 'Annabelle', 'NAME'), at(text, 'anna', 'NAME')];
  const r = L().scan(text, { detect: stub(spans), released: [{ pfx: 'NAME', value: 'Anna' }] });
  assert.equal(r.whitelisted, 1);
  assert.equal(r.count, 2);
  assert.deepEqual(r.findings.map((f) => text.slice(f.start, f.end)), ['Annabelle', 'anna']);
});

test('released mit anderem Typ gibt nicht frei', () => {
  const text = 'Anna';
  const r = L().scan(text, { detect: stub([at(text, 'Anna', 'ORT')]), released: [{ pfx: 'NAME', value: 'Anna' }] });
  assert.equal(r.count, 1);
  assert.equal(r.whitelisted, 0);
});

test('Schwere je Typ: hoch fuer harte Typen', () => {
  const hoch = ['EMAIL', 'IBAN', 'BIC', 'KARTE', 'TEL', 'IP', 'KFZ', 'GERAET', 'KONTO', 'KENNNR', 'STANDORT'];
  for (const p of hoch) {
    const r = L().scan('abc', { detect: stub([{ start: 0, end: 3, pfx: p }]) });
    assert.equal(r.findings[0].severity, 'hoch', p);
    assert.equal(r.findings[0].type, p);
  }
  assert.deepEqual([...L().HARD_PFX].sort(), [...hoch].sort());
});

test('Schwere je Typ: mittel fuer weiche und eigene Typen', () => {
  const mittel = ['NAME', 'ORG', 'ORT', 'ADRESSE', 'ROLLE', 'MEDIZIN', 'SENSIBEL', 'DATUM', 'BETRAG', 'PARAGRAF', 'EIGENER'];
  for (const p of mittel) {
    const r = L().scan('abc', { detect: stub([{ start: 0, end: 3, pfx: p }]) });
    assert.equal(r.findings[0].severity, 'mittel', p);
  }
});

test('hard: true auf NAME ergibt hoch, hard: false auf EMAIL ergibt mittel', () => {
  const a = L().scan('abc', { detect: stub([{ start: 0, end: 3, pfx: 'NAME', hard: true }]) });
  assert.equal(a.findings[0].severity, 'hoch');
  const b = L().scan('abc', { detect: stub([{ start: 0, end: 3, pfx: 'EMAIL', hard: false }]) });
  assert.equal(b.findings[0].severity, 'mittel');
});

test('Leerer Text liefert das feste Ergebnis', () => {
  assert.deepEqual(L().scan('', { detect: stub([]) }), { clean: true, count: 0, whitelisted: 0, findings: [] });
});

test('50.000 Zeichen Fuelltext in unter 200 ms', () => {
  const text = 'Lorem ipsum dolor sit amet. '.repeat(1800).slice(0, 50000);
  const t0 = performance.now();
  const r = L().scan(text, { detect: stub([{ start: 10, end: 15, pfx: 'NAME' }]) });
  assert.ok(performance.now() - t0 < 200);
  assert.equal(r.count, 1);
});

test('snippet: ohne Zeilenumbruch und Tab, hoechstens 15 + Fund + 15 Zeichen', () => {
  const text = 'Zeile eins\nZeile\tzwei max@firma.de\nnoch eine Zeile danach\tende';
  const sp = at(text, 'max@firma.de', 'EMAIL');
  const f = L().scan(text, { detect: stub([sp]) }).findings[0];
  assert.ok(!/[\n\r\t]/.test(f.snippet));
  assert.ok(f.snippet.length <= 15 + 12 + 15);
  assert.ok(f.snippet.includes('max@firma.de'));
});

test('snippet am Textrand ist kuerzer; Platzhalter in der Umgebung bleiben unveraendert', () => {
  const text = 'a {{NAME_1}} max@firma.de';
  const f = L().scan(text, { detect: stub([at(text, 'max@firma.de', 'EMAIL')]) }).findings[0];
  assert.equal(f.snippet, text);
  assert.ok(f.snippet.includes('{{NAME_1}}'));
});

test('Funde sind nach start sortiert und count entspricht findings.length', () => {
  const text = 'eins zwei drei';
  const spans = [at(text, 'drei', 'NAME'), at(text, 'eins', 'ORT'), at(text, 'zwei', 'EMAIL')];
  const r = L().scan(text, { detect: stub(spans) });
  assert.deepEqual(r.findings.map((f) => f.start), [0, 5, 10]);
  assert.equal(r.count, r.findings.length);
  assert.equal(r.clean, r.count === 0);
});

test('werfender detect ergibt error DETECT_FAILED, clean false, keine Ausnahme', () => {
  const r = L().scan('Text', { detect: () => { throw new Error('boom'); } });
  assert.equal(r.error, 'DETECT_FAILED');
  assert.equal(r.clean, false);
  assert.deepEqual(r.findings, []);
});
