// E1.fix App-Test: manuelle Markierung (Annotieren), eigene Variablen und Treffer-Rueckmeldung gegen die Normalisierung.
// Wert "zzqyyk": keine Erkennungsregel schlaegt von selbst an.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame } from './helpers.mjs';

const FW = 'ｚｚｑｙｙｋ'; // Vollbreitenschreibung von "zzqyyk"
const PRE = 'Intern gilt der Code ';

async function mitApp(fn) {
  const a = await launchApp();
  try { return await fn(await toolFrame(a.win)); } finally { await a.close(); }
}

test('Vollbreitenwort ueber Annotieren markieren, dann Anonymisieren: Wert verschwindet aus dem Ergebnis', async () => {
  const r = await mitApp((f) => f.evaluate(async ([fw, pre]) => {
    document.getElementById('IT').value = pre + fw + ' fuer den Fall.';
    aiCache = { key: null, spans: [] };
    tokenizeAnnotateWord(pre.length, fw, 'NAME', '#f59e0b');
    await anon();
    return document.getElementById('AT').value;
  }, [FW, PRE]));
  assert.ok(!r.includes(FW), 'Vollbreiten-Wert im Ergebnis: ' + JSON.stringify(r));
});

test('Eigene Variable mit geschuetztem Leerzeichen im Muster wird im Ergebnis ersetzt', async () => {
  const r = await mitApp((f) => f.evaluate(async (pre) => {
    const v = 'zzq yyk';
    document.getElementById('IT').value = pre + v + ' fuer den Fall.';
    aiCache = { key: null, spans: [] };
    cvars.push({ n: 'PROJ', p: v });
    await anon();
    return document.getElementById('AT').value;
  }, PRE));
  assert.ok(!r.includes('zzq'), 'Wert im Ergebnis: ' + JSON.stringify(r));
});

test('Markierung mit geschuetztem Leerzeichen wird beim Anonymisieren ersetzt', async () => {
  const r = await mitApp((f) => f.evaluate(async (pre) => {
    const v = 'zzq yyk';
    document.getElementById('IT').value = pre + v + ' fuer den Fall.';
    aiCache = { key: null, spans: [] };
    PSLib.marks.add(manualMarks, { value: v, pfx: 'NAME' });
    await anon();
    return document.getElementById('AT').value;
  }, PRE));
  assert.ok(!r.includes('zzq'), 'Wert im Ergebnis: ' + JSON.stringify(r));
});

test('Markierung mit Treffer meldet die Trefferzahl nach dem Lauf', async () => {
  const msg = await mitApp((f) => f.evaluate(async (pre) => {
    const v = 'zzq yyk';
    document.getElementById('IT').value = pre + v + ' und nochmals ' + v + '.';
    aiCache = { key: null, spans: [] };
    addManualMark(v, 'NAME');
    await reanon();
    return document.getElementById('TT').textContent;
  }, PRE));
  assert.match(msg, /Treffer/i, 'Rueckmeldung nennt keine Treffer: ' + JSON.stringify(msg));
  assert.match(msg, /\b2\b/, 'Trefferzahl 2 fehlt: ' + JSON.stringify(msg));
});

test('Markierung ohne Treffer meldet 0 Treffer sichtbar statt stiller Annahme', async () => {
  const msg = await mitApp((f) => f.evaluate(async (pre) => {
    document.getElementById('IT').value = pre + 'etwas ganz anderes.';
    aiCache = { key: null, spans: [] };
    addManualMark('qqwwee', 'NAME');
    await reanon();
    return document.getElementById('TT').textContent;
  }, PRE));
  assert.match(msg, /Treffer/i, 'Rueckmeldung nennt keine Treffer: ' + JSON.stringify(msg));
  assert.match(msg, /\b0\b|kein/i, 'Meldung zeigt 0 Treffer nicht: ' + JSON.stringify(msg));
  assert.ok(!/wird beim Anonymisieren ersetzt/.test(msg), 'stille Annahme statt Meldung: ' + JSON.stringify(msg));
});
