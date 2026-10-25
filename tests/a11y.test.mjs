// D2.2: Barrierefreiheit (WCAG 2.1 AA), Teil 2: Kontrast, Bewegung, Zoom, Gesamtprüfung.
// Spezifikation: V2-D-bedienung.md, Abschnitt D2 (Test D2.2) und Entscheidung D57.
// Rot zuerst: Kontrastfehler, fehlende prefers-reduced-motion-Regeln und Zoom-Überlauf sind noch nicht behoben.
//
// 1. Vollständiger axe.run (Tags wcag2a wcag2aa wcag21a wcag21aa, alle Regeln dieser Tags) in denselben 9 Ansichten und beiden
//    Frames (Werkzeug, Hülle) wie D2.1: 0 Verstöße mit impact serious oder critical. moderate und minor werden gezählt und nur
//    ausgegeben (Konsole und Fehlermeldung), damit docs/a11y-backlog.md daraus geschrieben werden kann; sie lassen den Test nicht
//    scheitern. Zusätzlich läuft je Ansicht und Frame ein zweiter Lauf mit dem Tag best-practice (Landmarken, Überschriften,
//    Region ...), der nur berichtet und nie prüft (die Regeln "region", "landmark-one-main", "page-has-heading-one" gehören zu
//    best-practice und fehlen sonst im Backlog).
// 2. prefers-reduced-motion (page.emulateMedia): danach hat in beiden Frames kein Element (und kein ::before/::after) eine
//    Animations- oder Übergangsdauer über 0,01 s (getComputedStyle über alle Elemente), in Willkommen, Arbeitsbereich leer,
//    Mit Ergebnis und Info-Dialog.
// 3. Zoom 200 Prozent (webContents.setZoomFactor(2)) bei Fenster 1280 x 800: im Werkzeug-Frame scrollWidth <= clientWidth in
//    Willkommen, Arbeitsbereich leer, Mit Ergebnis und Prüfansicht.
//
// Meldungen enthalten nur Regel, Impact, Ansicht, Frame und CSS-Pfade (keine Dokumentinhalte); bei Kontrast zusätzlich
// Vordergrund, Hintergrund und Verhältnis (ohne Textinhalt).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { launchApp, toolFrame, setFiles } from './helpers.mjs';

const require = createRequire(import.meta.url);
const AXE_PFAD = require.resolve('axe-core/axe.min.js');

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

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
// Start und Ansichten (wie in a11y-struktur.test.mjs)

async function starte({ reduziereBewegung = false } = {}) {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => { window.confirm = () => true; window.alert = () => {}; setAIMode('off'); });
  if (reduziereBewegung) await a.win.emulateMedia({ reducedMotion: 'reduce' });
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

const A_WILLKOMMEN = { name: 'Willkommen', setup: async () => {} };
const A_LEER = { name: 'Arbeitsbereich leer', setup: async ({ f }) => { await arbeitsbereich(f); } };
const A_ERGEBNIS = { name: 'Mit Ergebnis', setup: async ({ f }) => { await mitErgebnis(f); } };
const A_PRUEF = {
  name: 'Prüfansicht',
  setup: async ({ f }) => {
    await mitErgebnis(f);
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
  },
};
const A_INFO = { name: 'Info-Dialog', setup: async ({ a }) => { await oeffneInfo(a); } };

const ANSICHTEN = [
  A_WILLKOMMEN,
  A_LEER,
  A_ERGEBNIS,
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
  A_PRUEF,
  { name: 'Passwortdialog', setup: async ({ f }) => { await oeffnePasswort(f); } },
  A_INFO,
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

async function mitAnsicht(ansicht, fn, opts) {
  const { a, f } = await starte(opts);
  try {
    await ansicht.setup({ a, f });
    return await fn({ a, f });
  } finally { await a.close(); }
}

const FRAMES = [
  { key: 'werkzeug', name: 'Werkzeug', get: ({ f }) => f },
  { key: 'huelle', name: 'Hülle', get: ({ a }) => a.win },
];

// ---------------------------------------------------------------------------------------------------------------------------
// 1. axe-core, vollständiger Lauf

// Läuft im Frame. Gibt je Verstoß Regel, Impact und je Knoten CSS-Pfad (bei Kontrast Farben und Verhältnis) zurück, keine Inhalte.
async function axeImFrame(optionen) {
  const r = await axe.run(document, optionen);
  const farbe = (v) => (typeof v === 'string' ? v : '');
  return r.violations.map((v) => ({
    id: v.id, impact: v.impact, tags: v.tags.filter((t) => /^wcag\d|^best-practice$/.test(t)),
    nodes: v.nodes.map((n) => {
      const k = { pfad: n.target.join(' >> ') };
      if (v.id === 'color-contrast' || v.id === 'color-contrast-enhanced') {
        const d = ((n.any || []).concat(n.all || [], n.none || [])).map((c) => c.data).find((x) => x && (x.fgColor || x.contrastRatio)) || {};
        k.fg = farbe(d.fgColor); k.bg = farbe(d.bgColor); k.verhaeltnis = d.contrastRatio; k.soll = d.expectedContrastRatio;
        k.schrift = d.fontSize ? `${d.fontSize}, Gewicht ${d.fontWeight}` : '';
      }
      return k;
    }),
  }));
}

async function axeLauf(frame, tagListe) {
  // Playwright schleust den Skripttext inline ein; die strenge CSP erlaubt das ('unsafe-inline' in script-src)
  if (!(await frame.evaluate(() => typeof window.axe !== 'undefined'))) await frame.addScriptTag({ path: AXE_PFAD });
  return frame.evaluate(axeImFrame, { runOnly: { type: 'tag', values: tagListe }, iframes: false, resultTypes: ['violations'] });
}

const knotenZahl = (vs) => vs.reduce((s, v) => s + v.nodes.length, 0);
const kurz = (vs) => (vs.length ? vs.map((v) => `${v.id}:${v.nodes.length}`).join(', ') : 'keine');

function knotenZeilen(v, max = 6) {
  const zeilen = v.nodes.slice(0, max).map((n) => `    ${n.pfad.slice(0, 160)}`
    + (n.verhaeltnis !== undefined ? `  Vordergrund ${n.fg || '?'}, Hintergrund ${n.bg || '?'}, Verhältnis ${n.verhaeltnis} (Soll ${n.soll || '?'}; ${n.schrift || '?'})` : ''));
  if (v.nodes.length > max) zeilen.push(`    ... ${v.nodes.length - max} weitere Knoten`);
  return zeilen;
}
// Kontrastpaare gruppiert (Vordergrund/Hintergrund/Verhältnis), schlechteste zuerst
function kontrastPaare(vs) {
  const m = new Map();
  for (const v of vs.filter((x) => x.id === 'color-contrast')) {
    for (const n of v.nodes) {
      const k = `${n.fg || '?'} auf ${n.bg || '?'}: ${n.verhaeltnis} (Soll ${n.soll || '?'})`;
      m.set(k, (m.get(k) || 0) + 1);
    }
  }
  return [...m.entries()].sort((x, y) => parseFloat(x[0].split(': ')[1]) - parseFloat(y[0].split(': ')[1]));
}

function meldung(ansicht, frameName, schwer, leicht, hinweise) {
  const teile = [`axe-Verstösse (serious/critical) in Ansicht "${ansicht}", Frame ${frameName}: ${schwer.length} Regeln, ${knotenZahl(schwer)} Knoten`];
  for (const v of schwer) { teile.push(`  ${v.id} (${v.impact}): ${v.nodes.length} Knoten`); teile.push(...knotenZeilen(v)); }
  const paare = kontrastPaare(schwer);
  if (paare.length) teile.push('  Kontrastpaare (schlechteste zuerst): ' + paare.slice(0, 10).map(([k, z]) => `${k} x${z}`).join(' | '));
  teile.push(`Nur gezählt, kein Fehler: moderate/minor in den WCAG-Tags: ${kurz(leicht)}; best-practice-Lauf: ${kurz(hinweise)}`);
  return teile.join('\n');
}

for (const ansicht of ANSICHTEN) {
  for (const fr of FRAMES) {
    test(`axe vollständig: Ansicht "${ansicht.name}", Frame ${fr.name}: 0 Verstöße mit Impact serious oder critical`, { timeout: 120000 }, async () => {
      await mitAnsicht(ansicht, async (ctx) => {
        const frame = fr.get(ctx);
        const alle = await axeLauf(frame, TAGS);
        const hinweise = await axeLauf(frame, ['best-practice']);
        const schwer = alle.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        const leicht = alle.filter((v) => v.impact !== 'serious' && v.impact !== 'critical');
        // Bilanz für den Backlog (docs/a11y-backlog.md): Regel, Impact, Ansicht, Frame, Knotenzahl
        console.log(`A11Y-BILANZ | ${ansicht.name} | ${fr.name} | serious/critical: ${schwer.map((v) => `${v.id}(${v.impact}):${v.nodes.length}`).join(', ') || 'keine'}`
          + ` | moderate/minor (WCAG-Tags): ${leicht.map((v) => `${v.id}(${v.impact}):${v.nodes.length}`).join(', ') || 'keine'}`
          + ` | best-practice-Lauf: ${hinweise.map((v) => `${v.id}(${v.impact}):${v.nodes.length}`).join(', ') || 'keine'}`);
        assert.equal(schwer.length, 0, meldung(ansicht.name, fr.name, schwer, leicht, hinweise));
      });
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// 2. prefers-reduced-motion

// Läuft im Frame: alle Elemente (und ::before/::after) mit Animations- oder Übergangsdauer über 0,01 s
function langeDauern() {
  const sek = (liste) => String(liste).split(',').map((s) => s.trim()).filter(Boolean).map((s) => (s.endsWith('ms') ? parseFloat(s) / 1000 : parseFloat(s)));
  const pfad = (el) => {
    const teile = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 3; e = e.parentElement, i++) {
      let t = e.tagName.toLowerCase();
      if (e.id) { teile.unshift(t + '#' + e.id); break; }
      const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      if (c.length) t += '.' + c.join('.');
      teile.unshift(t);
    }
    return teile.join(' > ');
  };
  const schlecht = [];
  let gepruft = 0;
  const alle = [document.documentElement, ...document.querySelectorAll('*')];
  for (const el of alle) {
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      gepruft++;
      const a = Math.max(0, ...sek(cs.animationDuration));
      const u = Math.max(0, ...sek(cs.transitionDuration));
      if (a > 0.01 || u > 0.01) schlecht.push({ pfad: pfad(el) + (pseudo || ''), animation: a, uebergang: u, name: cs.animationName });
    }
  }
  return { gepruft, reduziert: matchMedia('(prefers-reduced-motion: reduce)').matches, schlecht };
}

const A_BEWEGUNG = [A_WILLKOMMEN, A_LEER, A_ERGEBNIS, A_INFO];
for (const ansicht of A_BEWEGUNG) {
  for (const fr of FRAMES) {
    test(`Bewegung: Ansicht "${ansicht.name}", Frame ${fr.name}: bei prefers-reduced-motion hat kein Element eine Animations- oder Übergangsdauer über 0,01 s`, { timeout: 120000 }, async () => {
      await mitAnsicht(ansicht, async (ctx) => {
        const frame = fr.get(ctx);
        // Medium kann erst nach dem Laden wirken; kurz warten, bis die Abfrage im Frame ankommt
        await frame.waitForFunction(() => matchMedia('(prefers-reduced-motion: reduce)').matches, null, { timeout: 5000 }).catch(() => {});
        const r = await frame.evaluate(langeDauern);
        console.log(`A11Y-BEWEGUNG | ${ansicht.name} | ${fr.name} | geprüft ${r.gepruft} (Element/Pseudo) | reduce aktiv: ${r.reduziert} | Verstöße: ${r.schlecht.length}`);
        assert.equal(r.reduziert, true, `prefers-reduced-motion: reduce ist im Frame ${fr.name} nicht aktiv (emulateMedia wirkt nicht)`);
        const gruppen = new Map();
        for (const s of r.schlecht) {
          const k = `${s.pfad.replace(/ > .*> /, ' > ... > ')} (Animation ${s.animation} s${s.name && s.name !== 'none' ? ' "' + s.name + '"' : ''}, Übergang ${s.uebergang} s)`;
          gruppen.set(k, (gruppen.get(k) || 0) + 1);
        }
        assert.equal(r.schlecht.length, 0,
          `Bewegung nicht reduziert in Ansicht "${ansicht.name}", Frame ${fr.name}: ${r.schlecht.length} Elemente mit Dauer über 0,01 s\n`
          + [...gruppen.entries()].slice(0, 12).map(([k, z]) => `  ${k}${z > 1 ? ' x' + z : ''}`).join('\n')
          + (gruppen.size > 12 ? `\n  ... ${gruppen.size - 12} weitere Gruppen` : ''));
      }, { reduziereBewegung: true });
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------
// 3. Zoom 200 Prozent

// Läuft im Frame: Überlauf messen; liefert zusätzlich die am weitesten herausragenden Elemente (nur CSS-Pfade)
function ueberlauf() {
  const de = document.documentElement;
  const pfad = (el) => {
    const teile = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 3; e = e.parentElement, i++) {
      let t = e.tagName.toLowerCase();
      if (e.id) { teile.unshift(t + '#' + e.id); break; }
      const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
      if (c.length) t += '.' + c.join('.');
      teile.unshift(t);
    }
    return teile.join(' > ');
  };
  const raus = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > de.clientWidth + 1) raus.push({ pfad: pfad(el), rechts: Math.round(r.right) });
  }
  raus.sort((x, y) => y.rechts - x.rechts);
  return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, innerWidth: window.innerWidth, zoomDpr: window.devicePixelRatio, raus: raus.slice(0, 8), anzahl: raus.length };
}

const A_ZOOM = [A_WILLKOMMEN, A_LEER, A_ERGEBNIS, A_PRUEF];
for (const ansicht of A_ZOOM) {
  test(`Zoom 200 %: Ansicht "${ansicht.name}", Werkzeug-Frame: kein horizontales Scrollen bei 1280 x 800`, { timeout: 120000 }, async () => {
    await mitAnsicht(ansicht, async (ctx) => {
      const { a, f } = ctx;
      await a.app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].setContentSize(1280, 800); });
      await a.win.waitForFunction(() => window.innerWidth === 1280 && window.innerHeight === 800, null, { timeout: 5000 });
      await a.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(2));
      await a.win.waitForFunction(() => window.innerWidth <= 660, null, { timeout: 5000 });
      await f.waitForFunction(() => document.documentElement.clientWidth <= 660, null, { timeout: 5000 });
      await a.win.waitForTimeout(500);
      const r = await f.evaluate(ueberlauf);
      const huelle = await a.win.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      console.log(`A11Y-ZOOM | ${ansicht.name} | Werkzeug scrollWidth ${r.scrollWidth}, clientWidth ${r.clientWidth} (innerWidth ${r.innerWidth}) | Hülle scrollWidth ${huelle.scrollWidth}, clientWidth ${huelle.clientWidth}`);
      assert.ok(r.clientWidth < 1000, `Zoom 200 % hat nicht gewirkt (clientWidth ${r.clientWidth} px bei Fenster 1280 px)`);
      assert.ok(r.scrollWidth <= r.clientWidth,
        `Horizontales Scrollen bei 200 % Zoom in Ansicht "${ansicht.name}", Werkzeug-Frame: scrollWidth ${r.scrollWidth} px > clientWidth ${r.clientWidth} px `
        + `(Hülle: scrollWidth ${huelle.scrollWidth}, clientWidth ${huelle.clientWidth}). Am weitesten rechts (${r.anzahl} Elemente ragen heraus): `
        + r.raus.map((x) => `${x.pfad} (rechts ${x.rechts} px)`).join(' | '));
    });
  });
}
