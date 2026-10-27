// A1.w: Gegenpruefung (Restrisiko-Scan) in der Oberflaeche und manuelle Markierungen als Daten.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame } from './helpers.mjs';

// Neue App starten, Tool-Frame holen, KI aus (deterministische Erkennung).
async function startApp() {
  const a = await launchApp();
  const f = await toolFrame(a.win);
  await f.evaluate(() => { window.confirm = () => true; window.alert = () => {}; setAIMode('off'); });
  return { a, f };
}
const setIT = (f, v) => f.evaluate((t) => { document.getElementById('IT').value = t; aiCache = { key: null, spans: [] }; }, v);
const text = (f, sel) => f.evaluate((s) => (document.querySelector(s) || {}).textContent || '', sel);
const val = (f, sel) => f.evaluate((s) => document.querySelector(s).value, sel);

test('Gegenpruefung: sauberes Ergebnis zeigt gruenes Band "keine Auffaelligkeiten"', async () => {
  const { a, f } = await startApp();
  try {
    await setIT(f, 'Bitte melden unter max@firma.de');
    await f.evaluate(() => anon());
    await f.waitForSelector('#LCBAND', { timeout: 5000 });
    const band = await text(f, '#LCBAND');
    assert.ok(band.includes('keine Auffälligkeiten'), band);
    assert.equal(await f.getAttribute('#LCBAND', 'role'), 'status');
    assert.equal(await f.getAttribute('#LCBAND', 'aria-live'), 'polite');
  } finally { await a.close(); }
});

test('Gegenpruefung: absichtlich verfehlter Wert wird gemeldet und per "Maskieren" behoben', async () => {
  const { a, f } = await startApp();
  try {
    await f.evaluate(() => { ENTS.find((e) => e.id === 'email').on = false; });
    await setIT(f, 'Bitte melden unter max@firma.de');
    await f.evaluate(() => anon());
    assert.ok((await val(f, '#AT')).includes('max@firma.de'), 'E-Mail muss im Klartext im Ergebnis stehen');
    await f.evaluate(() => { ENTS.find((e) => e.id === 'email').on = true; return runLeakCheck(); });
    assert.ok((await text(f, '#LCBAND')).includes('1 möglicher Rest'));
    await f.click('#LCBAND');
    const list = await text(f, '#LCLIST');
    assert.ok(list.includes('EMAIL'), list);
    assert.ok(list.includes('max@firma.de'), list);
    await f.click('#LCLIST >> text=Maskieren');
    await f.waitForFunction(() => document.getElementById('AT').value.includes('{{EMAIL_1}}'), null, { timeout: 8000 });
    const marks = await f.evaluate(() => JSON.stringify(manualMarks));
    assert.ok(marks.includes('max@firma.de'), marks);
    const at = await val(f, '#AT');
    assert.ok(!at.includes('max@firma.de'));
    await f.waitForFunction(() => /keine Auffälligkeiten/.test(document.getElementById('LCBAND').textContent), null, { timeout: 5000 });
  } finally { await a.close(); }
});

test('Gegenpruefung: Whitelist-Freigabe unterdrueckt den Fund und wird gezaehlt', async () => {
  const { a, f } = await startApp();
  try {
    await f.evaluate(() => { ENTS.find((e) => e.id === 'email').on = false; whitelist.push('firma.de'); });
    await setIT(f, 'Bitte melden unter max@firma.de');
    await f.evaluate(() => anon());
    const r = await f.evaluate(() => runLeakCheck());
    assert.ok(r.whitelisted >= 1, JSON.stringify(r));
    assert.ok((await text(f, '#LCBAND')).includes('keine Auffälligkeiten'));
  } finally { await a.close(); }
});

test('Regression Datenverlust: manuelle Markierung ueberlebt anon() und deanon() stellt den Text her', async () => {
  const { a, f } = await startApp();
  try {
    const orig = 'Der Kunde Zwiebelbaum meldet sich unter max@firma.de.';
    await setIT(f, orig);
    await f.evaluate(() => PSLib.marks.add(manualMarks, { value: 'Zwiebelbaum', pfx: 'NAME' }));
    await f.evaluate(() => anon());
    assert.ok((await val(f, '#AT')).includes('{{NAME_1}}'));
    assert.equal(await f.evaluate(() => store['{{NAME_1}}'] && store['{{NAME_1}}'].v), 'Zwiebelbaum');
    assert.equal(await val(f, '#IT'), orig, 'IT darf nicht veraendert werden');
    await f.evaluate(() => { document.getElementById('AR').value = document.getElementById('AT').value; deanon(); });
    const back = await f.evaluate(() => {
      const el = document.getElementById('RT') || document.getElementById('DT') || document.getElementById('AR');
      return { rt: (document.getElementById('RT') || {}).value, dt: (document.getElementById('DT') || {}).value, it: document.getElementById('IT').value };
    });
    assert.ok(back.rt === orig || back.dt === orig || back.it === orig, JSON.stringify(back));
  } finally { await a.close(); }
});

test('Annotieren-Modus: tokenizeAnnotateWord laesst IT unveraendert und legt eine Markierung an', async () => {
  const { a, f } = await startApp();
  try {
    // Deliberately unrecognized lowercase value: an existing automatic entity now
    // toggles release instead of creating the duplicate this regression forbids.
    const orig = 'intern gilt zzqyyk als code.';
    await setIT(f, orig);
    assert.equal(await f.evaluate(() => fundeSpans(document.getElementById('IT').value).some(e => e.start <= 12 && e.end > 12)), false);
    const n0 = await f.evaluate(() => (typeof manualMarks !== 'undefined' && manualMarks.items ? manualMarks.items.length : -1));
    await f.evaluate(() => tokenizeAnnotateWord(12, 'zzqyyk', 'NAME', '#f59e0b'));
    assert.equal(await val(f, '#IT'), orig);
    const items = await f.evaluate(() => manualMarks.items);
    assert.equal(items.length, n0 + 1);
    assert.ok(items.some((i) => i.value === 'zzqyyk' && i.pfx === 'NAME'), JSON.stringify(items));
  } finally { await a.close(); }
});
