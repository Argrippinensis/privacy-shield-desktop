// E1 App-Test: APP=/tmp/triage/v2 oder /tmp/triage/v18 (Wert "zzqyyk": keine Regel schlaegt von selbst an)
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame } from '/tmp/triage/v2/tests/helpers.mjs';
const APP = process.env.APP || '/tmp/triage/v2';
const FW = 'ｚｚｑｙｙｋ'; // Vollbreite "zzqyyk"
const PRE = 'Intern gilt der Code ';
test('Kontrolle ' + APP + ': ohne Markierung bleibt der Wert stehen (keine Regel greift)', async () => {
  const a = await launchApp({ appDir: APP });
  try {
    const f = await toolFrame(a.win);
    const r = await f.evaluate(async ([fw, pre]) => {
      document.getElementById('IT').value = pre + fw + ' fuer den Fall.';
      aiCache = { key: null, spans: [] };
      await anon();
      return document.getElementById('AT').value;
    }, [FW, PRE]);
    console.log('   Kontrolle AT =', JSON.stringify(r));
  } finally { await a.close(); }
});
test('E1 App ' + APP + ': Vollbreitenwort ueber Annotieren markieren, dann anonymisieren', async () => {
  const a = await launchApp({ appDir: APP });
  try {
    const f = await toolFrame(a.win);
    const r = await f.evaluate(async ([fw, pre]) => {
      document.getElementById('IT').value = pre + fw + ' fuer den Fall.';
      aiCache = { key: null, spans: [] };
      tokenizeAnnotateWord(pre.length, fw, 'NAME', '#f59e0b');
      await anon();
      return { it: document.getElementById('IT').value, at: document.getElementById('AT').value };
    }, [FW, PRE]);
    console.log('   AT =', JSON.stringify(r.at), ' IT =', JSON.stringify(r.it));
    assert.ok(!r.at.includes(FW), 'Vollbreiten-Wert im Ergebnis: ' + JSON.stringify(r.at));
  } finally { await a.close(); }
});
test('E1 App ' + APP + ': Eigene Variable (literales Muster) mit NBSP', async () => {
  const a = await launchApp({ appDir: APP });
  try {
    const f = await toolFrame(a.win);
    const r = await f.evaluate(async (pre) => {
      const v = 'zzq yyk';
      document.getElementById('IT').value = pre + v + ' fuer den Fall.';
      aiCache = { key: null, spans: [] };
      cvars.push({ n: 'PROJ', p: v });
      await anon();
      return document.getElementById('AT').value;
    }, PRE);
    console.log('   AT =', JSON.stringify(r));
    assert.ok(!r.includes('zzq'), 'Wert im Ergebnis: ' + JSON.stringify(r));
  } finally { await a.close(); }
});
test('E1 App ' + APP + ': Markierung (v2: PSLib.marks) mit NBSP-Wert', async () => {
  const a = await launchApp({ appDir: APP });
  try {
    const f = await toolFrame(a.win);
    const r = await f.evaluate(async (pre) => {
      const v = 'zzq yyk';
      document.getElementById('IT').value = pre + v + ' fuer den Fall.';
      aiCache = { key: null, spans: [] };
      if (typeof manualMarks === 'undefined') return 'N/A (1.8.0 hat keine manualMarks)';
      const ok = PSLib.marks.add(manualMarks, { value: v, pfx: 'NAME' });
      await anon();
      return { ok, at: document.getElementById('AT').value };
    }, PRE);
    console.log('   AT =', JSON.stringify(r));
    if (typeof r === 'object') assert.ok(!r.at.includes('zzq'), 'Wert im Ergebnis: ' + JSON.stringify(r.at));
  } finally { await a.close(); }
});
