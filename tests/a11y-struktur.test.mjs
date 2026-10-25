// D2.1: Barrierefreiheit (WCAG 2.1 AA), Teil 1: Struktur, Beschriftung, Tastatur, Ansagen.
// Spezifikation: V2-D-bedienung.md, Abschnitt D2 (Test D2.1) und Entscheidung D49 (Nachholpunkte aus D3).
// Rot zuerst: die Verstoesse in der Oberflaeche (Beschriftung, Landmarken, Fokusring, Fokusfalle ...) sind noch nicht behoben.
//
// 1. axe-core (nur Entwicklungsabhaengigkeit) mit der Regelliste aus D2.1 (runOnly), 0 Verstoesse in allen Schweregraden,
//    je Ansicht und je Frame (Werkzeug und Huelle). Die Meldung nennt Regel, Ansicht und Knoten (nur CSS-Pfade, keine Inhalte).
// 2. Tastaturtest (page.keyboard): (a) Tab-Reihenfolge enthaelt jedes sichtbare bedienbare Element, (b) Fokusring mindestens 2 px,
//    (c) Fokusfalle sowie Esc und Fokus-Rueckgabe in Passwort- und Info-Dialog, (d) reiner Tastaturablauf bis "Kopieren".
// 3. D49: Info-Dialog mit offener Lizenzliste bei 1280 x 800 (Aktionsknoepfe sichtbar), Hintergrund bei offenem Dialog inert oder
//    aria-hidden (damit auch die Leiste mit z-index 9998 ueber dem Overlay 9997), keine doppelten Eintraege in preload.js.
//
// Annahmen ausser den in der Spezifikation genannten Kennungen:
//   * "sichtbar bedienbar" = button, input (nicht hidden), select, textarea, a[href], [role=button], summary sowie Elemente mit onclick (div/span/p ohne
//     echtes Bedienelement darin: "echte button statt div onclick"); nicht deaktiviert, nicht inert,
//     checkVisibility() (display, visibility, opacity, content-visibility), Groesse > 0, nicht ausserhalb des Dokuments (z. B. versteckter Sprunglink)
//   * Namen im Tastaturablauf (d): "Jetzt starten", "Dateien auswählen", "Anonymisieren" (genau), "Kopieren" (genau), jeweils als zugaenglicher Name
//   * Dialoge: Passwortdialog #PWDLG (Werkzeug, geoeffnet ueber "Zuordnung speichern" #btn-map-save), Info-Dialog #info-dialog (Huelle, #btn-info)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { launchApp, toolFrame, setFiles, ROOT } from './helpers.mjs';

const require = createRequire(import.meta.url);
const AXE_PFAD = require.resolve('axe-core/axe.min.js');

const REGELN = ('label button-name image-alt input-image-alt link-name frame-title html-has-lang html-lang-valid landmark-one-main region '
  + 'page-has-heading-one heading-order aria-allowed-attr aria-required-attr aria-valid-attr aria-valid-attr-value aria-roles aria-hidden-focus '
  + 'aria-dialog-name aria-input-field-name duplicate-id duplicate-id-aria document-title bypass tabindex nested-interactive scrollable-region-focusable').split(' ');

const POLICY = JSON.stringify({
  version: 1, name: 'Kanzlei Beispiel',
  rules: [
    { id: 'kunde', label: 'Kundennummer', type: 'regex', pattern: 'K-\\d{6}', flags: '', category: 'EIGEN', profiles: ['*'] },
    { id: 'projekte', label: 'Projektnamen', type: 'list', terms: ['Projekt Falke', 'Alpha-Programm'], caseSensitive: false, category: 'EIGEN', profiles: ['standard', 'strict'] },
  ],
});
const txt = (name, text = 'Herr Thomas Müller wohnt in Berlin.') => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
const LEAK_TEXT = 'Bitte melden unter max@firma.de';

// ---------------------------------------------------------------------------------------------------------------------------
// Start und Ansichten

async function starte() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => { window.confirm = () => true; window.alert = () => {}; setAIMode('off'); });
  return { a, f };
}
const arbeitsbereich = (f) => f.evaluate(() => startApp());
async function mitErgebnis(f) {
  await arbeitsbereich(f);
  await f.evaluate(async () => { loadTestDoc(); await anon(); });
  await f.waitForFunction(() => document.getElementById('AT').value.length > 0, null, { timeout: 15000 });
}
async function oeffnePasswort(f) {
  await mitErgebnis(f);
  await f.evaluate(() => psMapSave());
  await f.waitForFunction(() => getComputedStyle(document.getElementById('PWDLG')).display !== 'none', null, { timeout: 5000 });
}
async function oeffneInfo(a) {
  await a.win.click('#btn-info');
  await a.win.waitForFunction(() => { const d = document.getElementById('info-dialog'); return d && d.getBoundingClientRect().width > 0; }, null, { timeout: 10000 });
  await a.win.waitForFunction(() => { const p = document.getElementById('info-licenses'); return p && p.textContent.length > 100; }, null, { timeout: 10000 });
}

// scope: Dialog, auf den sich die Tastaturtests beschraenken (Hintergrund ist bei einem modalen Dialog nicht bedienbar)
const ANSICHTEN = [
  { name: 'Willkommen', setup: async () => {} },
  { name: 'Arbeitsbereich leer', setup: async ({ f }) => { await arbeitsbereich(f); } },
  { name: 'Mit Ergebnis', setup: async ({ f }) => { await mitErgebnis(f); } },
  {
    name: 'Gegenprüfungsliste',
    setup: async ({ f }) => {
      await arbeitsbereich(f);
      await f.evaluate(async (t) => {
        ENTS.find((e) => e.id === 'email').on = false;
        document.getElementById('IT').value = t;
        aiCache = { key: null, spans: [] };
        await anon();
        ENTS.find((e) => e.id === 'email').on = true;
        runLeakCheck();
        toggleLCList();
      }, LEAK_TEXT);
      await f.waitForFunction(() => getComputedStyle(document.getElementById('LCLIST')).display !== 'none' && document.getElementById('LCLIST').textContent.length > 0, null, { timeout: 5000 });
    },
  },
  {
    name: 'Prüfansicht',
    setup: async ({ f }) => {
      await mitErgebnis(f);
      await f.evaluate(() => toggleFunde(true));
      await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
    },
  },
  { name: 'Passwortdialog', setup: async ({ f }) => { await oeffnePasswort(f); }, dialog: { frame: 'werkzeug', sel: '#PWDLG' } },
  { name: 'Info-Dialog', setup: async ({ a }) => { await oeffneInfo(a); }, dialog: { frame: 'huelle', sel: '#info-dialog' } },
  {
    name: 'Projektliste',
    setup: async ({ f }) => {
      await arbeitsbereich(f);
      await setFiles(f, [txt('eins.txt'), txt('zwei.txt', 'Frau Anna Schmidt')]);
      await f.waitForFunction(() => document.querySelectorAll('#PRJPANEL button.prj-item').length === 2, null, { timeout: 20000 });
    },
  },
  {
    name: 'Eigene Regeln',
    setup: async ({ f }) => {
      await arbeitsbereich(f);
      await f.setInputFiles('#policy-file', [{ name: 'policy.json', mimeType: 'application/json', buffer: Buffer.from(POLICY, 'utf8') }]);
      await f.waitForFunction(() => document.querySelectorAll('#policy-rules input[type=checkbox]').length >= 2, null, { timeout: 5000 });
      await f.evaluate(() => document.getElementById('policy-section').scrollIntoView());
    },
  },
];

async function mitAnsicht(ansicht, fn) {
  const { a, f } = await starte();
  try {
    await ansicht.setup({ a, f });
    return await fn({ a, f });
  } finally { await a.close(); }
}

// ---------------------------------------------------------------------------------------------------------------------------
// axe-core

const FRAMES = [
  { key: 'werkzeug', name: 'Werkzeug', get: ({ f }) => f },
  { key: 'huelle', name: 'Hülle', get: ({ a }) => a.win },
];

async function axeLauf(frame) {
  // Playwright schleust den Skripttext inline ein; die strenge CSP erlaubt das ('unsafe-inline' in script-src)
  await frame.addScriptTag({ path: AXE_PFAD });
  return frame.evaluate(async (opts) => {
    const r = await axe.run(document, opts);
    // nur Regel, Schweregrad und CSS-Pfade (keine Seiteninhalte)
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' >> ')) }));
  }, { runOnly: { type: 'rule', values: REGELN }, iframes: false, resultTypes: ['violations'] });
}
function meldung(ansicht, frameName, verstoesse) {
  const zeilen = verstoesse.map((v) => `  ${v.id} (${v.impact}): ${v.nodes.length} Knoten: ${v.nodes.slice(0, 5).join(' | ').slice(0, 300)}${v.nodes.length > 5 ? ' | ...' : ''}`);
  return `axe-Verstösse in Ansicht "${ansicht}", Frame ${frameName}: ${verstoesse.length} Regeln, ${verstoesse.reduce((s, v) => s + v.nodes.length, 0)} Knoten\n${zeilen.join('\n')}`;
}

for (const ansicht of ANSICHTEN) {
  for (const fr of FRAMES) {
    test(`axe Struktur: Ansicht "${ansicht.name}", Frame ${fr.name}: 0 Verstöße in allen Schweregraden`, { timeout: 120000 }, async () => {
      await mitAnsicht(ansicht, async (ctx) => {
        const v = await axeLauf(fr.get(ctx));
        assert.equal(v.length, 0, meldung(ansicht.name, fr.name, v));
      });
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// Tastatur: gemeinsame Helfer

// im Frame: sichtbare bedienbare Elemente suchen und mit data-ax markieren. scope: nur innerhalb dieses Selektors
function sammeln({ prefix, scope }) {
  const root = scope ? document.querySelector(scope) : document;
  if (!root) return [];
  const SEL = 'button, input:not([type=hidden]), select, textarea, a[href], [role=button], summary, [onclick]';
  const out = [];
  let n = 0;
  const sx = window.scrollX, sy = window.scrollY, docW = document.documentElement.scrollWidth;
  for (const el of root.querySelectorAll(SEL)) {
    if (el.disabled || el.closest('[inert]')) continue;
    // [onclick] auf Wrappern mit echtem Bedienelement darin (Ereignisweitergabe) zaehlt nicht; auf div/span/p/li ohne solches schon
    if (el.hasAttribute('onclick') && !el.matches('button, input, select, textarea, a[href], [role=button], summary')
      && el.querySelector('button, input, select, textarea, a[href], [role=button], summary')) continue;
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right + sx <= 0 || r.bottom + sy <= 0 || r.left + sx >= docW) continue;
    n++;
    el.setAttribute('data-ax', prefix + n);
    out.push({ ax: prefix + n, tag: el.tagName.toLowerCase(), id: el.id, cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').split(/\s+/)[0], klick: el.hasAttribute('onclick') ? el.getAttribute('onclick').slice(0, 30) : '' });
  }
  return out;
}

// im Frame: aktives Element beschreiben (ohne Textinhalte ausser dem zugaenglichen Namen von Bedienelementen)
function aktivBeschreiben(scope) {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return { tag: 'BODY' };
  const cs = getComputedStyle(e);
  const name = (e.getAttribute('aria-label')
    || (e.getAttribute('aria-labelledby') || '').split(/\s+/).map((i) => (document.getElementById(i) || {}).textContent || '').join(' ')
    || (e.labels && e.labels[0] && e.labels[0].textContent)
    || e.textContent || e.value || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  return {
    tag: e.tagName, id: e.id, ax: e.getAttribute('data-ax'), name,
    cls: String(e.className || '').split(/\s+/)[0],
    outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle,
    inScope: scope ? !!e.closest(scope) : true,
  };
}

// tief aktives Element ueber beide Frames
async function aktiv(ctx, scope = {}) {
  const h = await ctx.a.win.evaluate(aktivBeschreiben, scope.huelle || null);
  if (h.tag === 'IFRAME' && h.id === 'tool-frame') {
    const w = await ctx.f.evaluate(aktivBeschreiben, scope.werkzeug || null);
    return { frame: 'werkzeug', ...w };
  }
  return { frame: 'huelle', ...h };
}
const beschr = (s) => `${s.frame}:${(s.tag || '').toLowerCase()}${s.id ? '#' + s.id : ''}${!s.id && s.cls ? '.' + s.cls : ''}`;

async function tab(ctx, { shift = false } = {}) {
  await ctx.a.win.keyboard.press(shift ? 'Shift+Tab' : 'Tab');
}

// Ausgangslage: Fokus im Dokument zuruecksetzen (Frames beginnen am Anfang)
async function fokusZuruecksetzen(ctx) {
  await ctx.f.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await ctx.a.win.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
}

// Kandidaten markieren; bei Dialogansichten nur der Dialog
async function kandidaten(ctx, ansicht) {
  const d = ansicht.dialog;
  const h = await ctx.a.win.evaluate(sammeln, { prefix: 'h', scope: d && d.frame === 'huelle' ? d.sel : (d ? '#__keiner__' : null) });
  const w = await ctx.f.evaluate(sammeln, { prefix: 'w', scope: d && d.frame === 'werkzeug' ? d.sel : (d ? '#__keiner__' : null) });
  return { huelle: h, werkzeug: w, alle: [...h.map((x) => ({ ...x, frame: 'huelle' })), ...w.map((x) => ({ ...x, frame: 'werkzeug' }))] };
}

// Mit Tab durchlaufen, bis alle Kandidaten besucht sind (oder die Obergrenze erreicht ist). Liefert die besuchten Elemente.
async function durchlaufen(ctx, ansicht, kand) {
  const d = ansicht.dialog;
  const scope = d ? { [d.frame]: d.sel } : {};
  const besucht = [];
  const gesehen = new Set();
  const merke = (s, ausTab) => {
    if (s.tag === 'BODY') return;
    besucht.push({ ...s, ausTab });
    if (s.ax) gesehen.add(s.frame + ':' + s.ax);
  };
  if (d) merke(await aktiv(ctx, scope), false); // Dialog setzt den Fokus selbst
  else await fokusZuruecksetzen(ctx);
  const grenze = kand.alle.length + 30;
  for (let i = 0; i < grenze; i++) {
    if (kand.alle.every((k) => gesehen.has(k.frame + ':' + k.ax))) break;
    await tab(ctx);
    merke(await aktiv(ctx, scope), true);
  }
  const fehlend = kand.alle.filter((k) => !gesehen.has(k.frame + ':' + k.ax));
  return { besucht, fehlend };
}

// ---------------------------------------------------------------------------------------------------------------------------
// Tastaturtest (a) und (b)

for (const ansicht of ANSICHTEN) {
  test(`Tastatur (a): Ansicht "${ansicht.name}": jedes sichtbare bedienbare Element liegt in der Tab-Reihenfolge`, { timeout: 120000 }, async () => {
    await mitAnsicht(ansicht, async (ctx) => {
      const kand = await kandidaten(ctx, ansicht);
      assert.ok(kand.alle.length > 0, 'keine bedienbaren Elemente gefunden (Annahme zur Ansicht prüfen)');
      const { fehlend } = await durchlaufen(ctx, ansicht, kand);
      assert.equal(fehlend.length, 0,
        `nicht per Tab erreichbar (${fehlend.length} von ${kand.alle.length}) in Ansicht "${ansicht.name}": `
        + fehlend.slice(0, 12).map((k) => `${k.frame}:${k.tag}${k.id ? '#' + k.id : k.cls ? '.' + k.cls : ''}${k.klick ? ' onclick=' + k.klick : ''}`).join(', ') + (fehlend.length > 12 ? ', ...' : ''));
    });
  });

  test(`Tastatur (b): Ansicht "${ansicht.name}": Fokusring nach Tastaturfokus mindestens 2 px`, { timeout: 120000 }, async () => {
    await mitAnsicht(ansicht, async (ctx) => {
      const kand = await kandidaten(ctx, ansicht);
      assert.ok(kand.alle.length > 0, 'keine bedienbaren Elemente gefunden (Annahme zur Ansicht prüfen)');
      const { besucht } = await durchlaufen(ctx, ansicht, kand);
      const stops = besucht.filter((s) => s.ausTab && s.tag !== 'IFRAME');
      assert.ok(stops.length > 0, 'Tab hat kein Element erreicht');
      const schlecht = stops.filter((s) => s.outlineStyle === 'none' || !(parseFloat(s.outlineWidth) >= 2));
      const eindeutig = [...new Map(schlecht.map((s) => [s.frame + ':' + s.ax, `${beschr(s)} (outline ${s.outlineStyle} ${s.outlineWidth})`])).values()];
      assert.equal(eindeutig.length, 0,
        `Fokusring unter 2 px in Ansicht "${ansicht.name}" bei ${eindeutig.length} Elementen: ${eindeutig.slice(0, 12).join(', ')}${eindeutig.length > 12 ? ', ...' : ''}`);
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Tastaturtest (c): Fokusfalle, Esc, Rueckgabe des Fokus

const imScope = (s, d) => s.frame === d.frame && s.inScope === true;

async function fokusfalle(ctx, d) {
  const scope = { [d.frame]: d.sel };
  const raus = [];
  for (let i = 1; i <= 25; i++) {
    await tab(ctx);
    const s = await aktiv(ctx, scope);
    if (!imScope(s, d)) raus.push(`Tab ${i}: ${beschr(s)}`);
  }
  for (let i = 1; i <= 25; i++) {
    await tab(ctx, { shift: true });
    const s = await aktiv(ctx, scope);
    if (!imScope(s, d)) raus.push(`Shift+Tab ${i}: ${beschr(s)}`);
  }
  return raus;
}

const DIALOG_PW = { name: 'Passwortdialog', frame: 'werkzeug', sel: '#PWDLG', opener: '#btn-map-save' };
const DIALOG_INFO = { name: 'Info-Dialog', frame: 'huelle', sel: '#info-dialog', opener: '#btn-info' };

// Dialog ueber die Tastatur oeffnen: Fokus auf den Knopf, Enter
async function oeffneMitTastatur(ctx, d) {
  if (d === DIALOG_PW) {
    await mitErgebnis(ctx.f);
    await ctx.f.focus(d.opener);
    await ctx.a.win.keyboard.press('Enter');
    await ctx.f.waitForFunction(() => getComputedStyle(document.getElementById('PWDLG')).display !== 'none', null, { timeout: 5000 });
  } else {
    await ctx.a.win.focus(d.opener);
    await ctx.a.win.keyboard.press('Enter');
    await ctx.a.win.waitForFunction(() => { const x = document.getElementById('info-dialog'); return x && x.getBoundingClientRect().width > 0; }, null, { timeout: 10000 });
  }
}

for (const d of [DIALOG_PW, DIALOG_INFO]) {
  test(`Tastatur (c): ${d.name}: 25-mal Tab und Shift+Tab, der Fokus bleibt im Dialog (Fokusfalle)`, { timeout: 120000 }, async () => {
    const ctx = await starte();
    try {
      await oeffneMitTastatur(ctx, d);
      const start = await aktiv(ctx, { [d.frame]: d.sel });
      assert.ok(imScope(start, d), `nach dem Öffnen liegt der Fokus nicht im Dialog: ${beschr(start)}`);
      const raus = await fokusfalle(ctx, d);
      assert.equal(raus.length, 0, `Fokus verlässt ${d.name}: ${raus.slice(0, 6).join('; ')}${raus.length > 6 ? '; ...' : ''}`);
    } finally { await ctx.a.close(); }
  });

  test(`Tastatur (c): ${d.name}: Esc schließt den Dialog, der Fokus liegt wieder auf dem auslösenden Knopf`, { timeout: 120000 }, async () => {
    const ctx = await starte();
    try {
      await oeffneMitTastatur(ctx, d);
      await ctx.a.win.keyboard.press('Tab'); // Esc auch aus der Mitte des Dialogs
      await ctx.a.win.keyboard.press('Escape');
      const frame = d.frame === 'werkzeug' ? ctx.f : ctx.a.win;
      await frame.waitForFunction((sel) => {
        const x = document.querySelector(sel);
        return !x || getComputedStyle(x).display === 'none' || x.getBoundingClientRect().width === 0
          || getComputedStyle(x.closest('#info-overlay') || x).display === 'none';
      }, d.sel, { timeout: 5000 }).catch(() => {});
      const zu = await frame.evaluate((sel) => {
        const x = document.querySelector(sel);
        return !x || getComputedStyle(x).display === 'none' || x.getBoundingClientRect().width === 0
          || getComputedStyle(x.closest('#info-overlay') || x).display === 'none';
      }, d.sel);
      assert.equal(zu, true, `Esc schließt ${d.name} nicht`);
      const s = await aktiv(ctx, {});
      assert.equal(s.id, d.opener.slice(1), `Fokus nach Esc nicht auf ${d.opener}, sondern ${beschr(s)}`);
      assert.equal(s.frame, d.frame);
    } finally { await ctx.a.close(); }
  });
}

// ---------------------------------------------------------------------------------------------------------------------------
// Tastaturtest (d): reiner Tastaturablauf bis Kopieren

async function tabBis(ctx, passt, beschreibung, max = 120) {
  for (let i = 0; i < max; i++) {
    await tab(ctx);
    const s = await aktiv(ctx, {});
    if (s.tag !== 'BODY' && passt(s)) return s;
  }
  throw new Error(`Tab erreicht nach ${max} Schritten nicht: ${beschreibung}`);
}

test('Tastatur (d): reiner Tastaturablauf von "Jetzt starten" über "Dateien auswählen" und "Anonymisieren" bis "Kopieren"', { timeout: 180000 }, async () => {
  const ctx = await starte();
  try {
    const { a, f } = ctx;
    await fokusZuruecksetzen(ctx);
    await tabBis(ctx, (s) => /Jetzt starten/i.test(s.name), 'Jetzt starten');
    await a.win.keyboard.press('Enter');
    await f.waitForFunction(() => getComputedStyle(document.getElementById('WS')).display !== 'none', null, { timeout: 5000 });
    await tabBis(ctx, (s) => /Dateien auswählen/i.test(s.name), 'Dateien auswählen');
    // Datei wird ueber die Testumgebung eingegeben (kein nativer Dateidialog)
    await setFiles(f, [txt('akte.txt', 'Herr Thomas Müller wohnt in Berlin.')]);
    await f.waitForFunction(() => document.getElementById('IT').value.includes('Thomas'), null, { timeout: 15000 });
    await tabBis(ctx, (s) => /^Anonymisieren$/i.test(s.name), 'Anonymisieren');
    await a.win.keyboard.press('Enter');
    await f.waitForFunction(() => /\{\{[A-Z_]+\d*\}\}/.test(document.getElementById('AT').value), null, { timeout: 20000 });
    await tabBis(ctx, (s) => /^Kopieren$/i.test(s.name), 'Kopieren');
    await a.app.evaluate(({ clipboard }) => clipboard.writeText('LEER'));
    await a.win.keyboard.press('Enter');
    const erwartet = await f.evaluate(() => document.getElementById('AT').value);
    let zw = 'LEER';
    for (let i = 0; i < 20 && zw === 'LEER'; i++) {
      await a.win.waitForTimeout(250);
      zw = await a.app.evaluate(({ clipboard }) => clipboard.readText());
    }
    assert.equal(zw, erwartet, 'Zwischenablage enthält nicht den anonymisierten Text');
    assert.match(zw, /\{\{[A-Z_]+\d*\}\}/);
  } finally { await ctx.a.close(); }
});

// ---------------------------------------------------------------------------------------------------------------------------
// D49: Nachholpunkte aus D3

test('D49: Info-Dialog mit geöffneter Lizenzliste bei 1280 x 800: Aktionsknöpfe liegen im sichtbaren Bereich', { timeout: 120000 }, async () => {
  const ctx = await starte();
  try {
    await ctx.a.app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setContentSize(1280, 800); });
    await ctx.a.win.waitForFunction(() => window.innerWidth === 1280 && window.innerHeight === 800, null, { timeout: 5000 });
    await oeffneInfo(ctx.a);
    await ctx.a.win.click('#info-dialog summary');
    await ctx.a.win.waitForFunction(() => document.querySelector('#info-dialog details').open, null, { timeout: 3000 });
    await ctx.a.win.waitForTimeout(300);
    const r = await ctx.a.win.evaluate(() => {
      const dlg = document.getElementById('info-dialog');
      const dr = dlg.getBoundingClientRect();
      const out = [];
      for (const name of ['Diagnose kopieren', 'Auf Updates prüfen', 'Schließen']) {
        const b = Array.from(dlg.querySelectorAll('button')).find((x) => x.textContent.replace(/\s+/g, ' ').trim() === name);
        if (!b) { out.push({ name, vorhanden: false }); continue; }
        const br = b.getBoundingClientRect();
        const mx = br.left + br.width / 2, my = br.top + br.height / 2;
        const oben = document.elementFromPoint(mx, my);
        out.push({
          name, vorhanden: true,
          imFenster: br.top >= 0 && br.left >= 0 && br.bottom <= window.innerHeight && br.right <= window.innerWidth,
          imDialog: br.top >= dr.top - 0.5 && br.bottom <= dr.bottom + 0.5,
          nichtVerdeckt: !!oben && (oben === b || b.contains(oben)),
          top: Math.round(br.top), bottom: Math.round(br.bottom),
        });
      }
      return { innerHeight: window.innerHeight, dialog: { top: Math.round(dr.top), bottom: Math.round(dr.bottom) }, out };
    });
    const schlecht = r.out.filter((x) => !x.vorhanden || !x.imFenster || !x.imDialog || !x.nichtVerdeckt);
    assert.equal(schlecht.length, 0,
      `Aktionsknöpfe nicht sichtbar bei 1280x800 (Fenster ${r.innerHeight} px hoch, Dialog ${r.dialog.top}..${r.dialog.bottom}): ${JSON.stringify(schlecht)}`);
  } finally { await ctx.a.close(); }
});

test('D49: Hintergrund ist bei geöffnetem Info-Dialog inert oder aria-hidden (auch die Leiste über dem Overlay)', { timeout: 120000 }, async () => {
  const ctx = await starte();
  try {
    await oeffneInfo(ctx.a);
    const r = await ctx.a.win.evaluate(() => {
      const overlay = document.getElementById('info-overlay');
      const verdeckt = (el) => !!el.closest('[inert],[aria-hidden="true"]');
      const offen = [];
      for (const el of document.body.children) {
        if (el === overlay || el.contains(overlay) || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') continue;
        if (getComputedStyle(el).display === 'none') continue;
        if (!verdeckt(el)) offen.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''));
      }
      const gezielt = ['#tool-frame', '#update-check-btn', '#btn-info', '#btn-diag'].map((s) => {
        const el = document.querySelector(s);
        return { sel: s, vorhanden: !!el, verdeckt: el ? verdeckt(el) : false };
      });
      return { offen, gezielt };
    });
    assert.deepEqual(r.gezielt.filter((x) => x.vorhanden && !x.verdeckt), [], 'Hintergrundelemente nicht inert/aria-hidden: ' + JSON.stringify(r.gezielt));
    assert.deepEqual(r.offen, [], 'Wurzelelemente außerhalb des Dialogs weder inert noch aria-hidden: ' + r.offen.join(', '));
  } finally { await ctx.a.close(); }
});

test('D49: preload.js enthält keine doppelten Einträge (getAppInfo, getLicenses)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  const keys = [...src.matchAll(/^\s{2}(\w+)\s*:/gm)].map((m) => m[1]);
  const doppelt = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
  assert.deepEqual(doppelt, [], 'doppelte Schlüssel in preload.js: ' + doppelt.join(', '));
});
