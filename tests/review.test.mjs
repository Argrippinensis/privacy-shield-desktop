// D1.w1: Seitenleiste "Funde" und Entscheidungen (Wert freigeben/maskieren) gegen die echte App.
// Spezifikation: V2-D-bedienung.md, Abschnitt D1.w1. Rot zuerst: die Seitenleiste existiert noch nicht.
//
// Angenommene Kennungen ausser den in der Spezifikation genannten (#FUNDE, #FUNDEBTN, toggleFunde(open), #FUNDELIST,
// li[data-key], button.fund-toggle, button.fund-jump, Gruppenschalter "alle dieses Typs ..."):
//   * data-key hat die Form "<TYP>|<exakter Wert>" (so heisst `key` in PSLib.review.build)
//   * globale Variable `released` (Eintraege { pfx, value }) im Werkzeug, wie `whitelist` und `manualMarks`
//   * der Gruppenschalter ist eine <button> innerhalb der Gruppe, deren Text "alle dieses Typs" enthaelt
//   * der Platzhalter eines Eintrags steht als Text im li (z. B. {{NAME_1}}), Anzahl als Zahl im Text
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, captureDownloads, getDownloads } from './helpers.mjs';

const ANTON = 'Anton Beispiel';
const TEXT_ANTON = 'Herr Anton Beispiel und Anton Beispiel';
const TEXT_BERLIN = 'Ich wohne in Berlin und arbeite in Berlin. Berliner Allee 5';
const TEXT_GRUPPE = 'Herr Anton Beispiel und Frau Berta Muster. Anton Beispiel meldet sich unter anton@beispiel-firma.de.';

// Neue App starten, Tool-Frame holen, KI aus (deterministische Erkennung).
async function startApp() {
  const a = await launchApp();
  const f = await toolFrame(a.win);
  await f.evaluate(() => { window.confirm = () => true; window.alert = () => {}; setAIMode('off'); });
  return { a, f };
}
async function mitApp(fn) {
  const { a, f } = await startApp();
  try { return await fn(f, a); } finally { await a.close(); }
}
// Text laden und anonymisieren wie ein Nutzer
const lade = (f, t) => f.evaluate(async (v) => {
  document.getElementById('IT').value = v;
  aiCache = { key: null, spans: [] };
  await anon();
}, t);
const at = (f) => f.evaluate(() => document.getElementById('AT').value);
// Erwartung aus der Erkennung des Werkzeugs (ohne Freigaben), gruppiert nach (Typ, exaktem Wert)
const erwartung = (f, t) => f.evaluate((v) => {
  const spans = PSDetect.detect(v, { ents: activeEntIds(), cvars: cvars.concat(PSLib.marks.toCvars(manualMarks)), whitelist: [], released: [], wordlists: localAIMode, aiSpans: null });
  const g = {};
  for (const s of spans) {
    const k = s.pfx + '|' + v.slice(s.start, s.end);
    (g[k] = g[k] || { key: k, count: 0, firstStart: s.start, end: s.end, type: s.pfx, value: v.slice(s.start, s.end) });
    g[k].count++;
    g[k].firstStart = Math.min(g[k].firstStart, s.start);
  }
  return Object.values(g);
}, t);
const oeffneFunde = async (f) => {
  await f.evaluate(() => toggleFunde(true));
  await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
};
const li = (key) => `#FUNDELIST li[data-key="${key}"]`;
const warteAT = (f, fn, arg) => f.waitForFunction(fn, arg, { timeout: 8000 });

// Gruppenschalter "alle dieses Typs ..." der Gruppe, die den Eintrag mit Typ-Praefix <typ> enthaelt (und nur diesen Typ)
function gruppenSchalter(f, typ) {
  return f.evaluate((t) => {
    const eintrag = document.querySelector('#FUNDELIST li[data-key^="' + t + '|"]');
    if (!eintrag) return { ok: false, grund: 'kein Eintrag vom Typ ' + t };
    for (let el = eintrag.parentElement; el && el.id !== 'FUNDELIST'; el = el.parentElement) {
      const bs = Array.from(el.querySelectorAll('button')).filter((b) => /alle dieses Typs/i.test(b.textContent));
      const nurTyp = Array.from(el.querySelectorAll('li[data-key]')).every((l) => l.dataset.key.startsWith(t + '|'));
      if (bs.length && nurTyp) { bs[0].click(); return { ok: true }; }
    }
    return { ok: false, grund: 'kein Gruppenschalter "alle dieses Typs" fuer ' + t };
  }, typ);
}

test('Seitenleiste #FUNDE laesst sich ueber toggleFunde und den Knopf #FUNDEBTN ein- und ausklappen', async () => {
  await mitApp(async (f) => {
    assert.equal(await f.locator('#FUNDEBTN').count(), 1, 'Knopf #FUNDEBTN fehlt');
    assert.equal(await f.locator('#FUNDE').count(), 1, 'Seitenleiste #FUNDE fehlt');
    assert.equal(await f.locator('#FUNDELIST').count(), 1, 'Liste #FUNDELIST fehlt');
    assert.match((await f.textContent('#FUNDEBTN')) || '', /Funde/);
    await f.evaluate(() => toggleFunde(true));
    assert.ok(await f.isVisible('#FUNDE'), 'toggleFunde(true) zeigt die Leiste nicht');
    await f.evaluate(() => toggleFunde(false));
    assert.ok(!(await f.isVisible('#FUNDE')), 'toggleFunde(false) blendet die Leiste nicht aus');
    await f.click('#FUNDEBTN');
    assert.ok(await f.isVisible('#FUNDE'), 'Knopf #FUNDEBTN oeffnet die Leiste nicht');
    await f.click('#FUNDEBTN');
    assert.ok(!(await f.isVisible('#FUNDE')), 'zweiter Klick auf #FUNDEBTN schliesst die Leiste nicht');
  });
});

test('Liste zeigt den Eintrag NAME "Anton Beispiel" mit Platzhalter, Wert und der Zaehlung der Erkennung', async () => {
  await mitApp(async (f) => {
    const exp = (await erwartung(f, TEXT_ANTON)).find((e) => e.key === 'NAME|' + ANTON);
    assert.ok(exp, 'Voraussetzung: Erkennung liefert NAME "Anton Beispiel" (Herr gehoert nicht zum Wert)');
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    assert.equal(await f.locator('#FUNDELIST li[data-key]').count(), 1, 'genau ein Eintrag erwartet (beide Vorkommen gruppiert)');
    assert.equal(await f.locator(li('NAME|' + ANTON)).count(), 1, 'Eintrag li[data-key="NAME|Anton Beispiel"] fehlt');
    const txt = await f.textContent(li('NAME|' + ANTON));
    const token = await f.evaluate((v) => Object.keys(store).find((k) => store[k].v === v), ANTON);
    assert.ok(token, 'Voraussetzung: store enthaelt einen Platzhalter fuer den Wert');
    assert.ok(txt.includes(token), 'Platzhalter fehlt im Eintrag: ' + JSON.stringify(txt));
    assert.ok(txt.includes(ANTON), 'Originalwert fehlt im Eintrag: ' + JSON.stringify(txt));
    const rest = txt.split(token).join(' ').split(ANTON).join(' ');
    assert.ok(new RegExp('(^|\\D)' + exp.count + '(\\D|$)').test(rest), 'Zaehler ' + exp.count + ' fehlt im Eintrag: ' + JSON.stringify(txt));
    assert.ok(await f.locator(li('NAME|' + ANTON) + ' button.fund-toggle').count() === 1, 'button.fund-toggle fehlt');
    assert.ok(await f.locator(li('NAME|' + ANTON) + ' button.fund-jump').count() === 1, 'button.fund-jump fehlt');
  });
});

test('Wert freigeben: #AT enthaelt ihn im Klartext, Gegenpruefung zaehlt ihn als Freigabe und nicht als Fund', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_ANTON);
    assert.ok(!(await at(f)).includes(ANTON), 'Voraussetzung: Wert ist zunaechst maskiert');
    await oeffneFunde(f);
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    assert.equal(await at(f), TEXT_ANTON, 'ganzer Text muss im Klartext stehen');
    const rel = await f.evaluate(() => JSON.parse(JSON.stringify(released)));
    assert.deepEqual(rel, [{ pfx: 'NAME', value: ANTON }], 'released enthaelt nicht genau den Eintrag { pfx, value }');
    const r = await f.evaluate(() => { const x = runLeakCheck(); return { count: x.count, whitelisted: x.whitelisted, findings: x.findings.map((q) => q.type), band: document.getElementById('LCBAND').textContent }; });
    assert.ok(r.whitelisted >= 2, 'Gegenpruefung zaehlt die Freigabe nicht (whitelisted): ' + JSON.stringify(r));
    assert.equal(r.count, 0, 'freigegebener Wert darf kein Fund der Gegenpruefung sein: ' + JSON.stringify(r));
    assert.match(r.band, /keine Auffälligkeiten/);
  });
});

test('Freigabe von "Berlin" (ORT) gibt "Berliner Allee 5" nicht frei (exakter Vergleich statt Teilzeichenfolge)', async () => {
  await mitApp(async (f) => {
    const ex = await erwartung(f, TEXT_BERLIN);
    const ort = ex.find((e) => e.key === 'ORT|Berlin');
    const anderer = ex.find((e) => e.value !== 'Berlin' && e.value.includes('Berlin'));
    assert.ok(ort && anderer, 'Voraussetzung: ORT "Berlin" und ein weiterer Fund mit "Berlin" im Wert: ' + JSON.stringify(ex.map((e) => e.key)));
    await lade(f, TEXT_BERLIN);
    assert.ok(!(await at(f)).includes('Berlin'), 'Voraussetzung: alles maskiert: ' + (await at(f)));
    await oeffneFunde(f);
    await f.click(li('ORT|Berlin') + ' button.fund-toggle');
    await warteAT(f, () => document.getElementById('AT').value.includes('wohne in Berlin und arbeite in Berlin.'));
    const out = await at(f);
    assert.ok(!out.includes(anderer.value), 'Wert "' + anderer.value + '" wurde mit "Berlin" mitfreigegeben: ' + out);
    assert.match(out, /\{\{[A-Z]+_\d+\}\}/, 'Platzhalter fuer den anderen Fund fehlt: ' + out);
    const rel = await f.evaluate(() => JSON.parse(JSON.stringify(released)));
    assert.deepEqual(rel, [{ pfx: 'ORT', value: 'Berlin' }]);
    assert.equal(await f.evaluate(() => whitelist.length), 0, 'die Freigabeliste "Whitelist" bleibt unveraendert');
  });
});

test('Erneutes Maskieren stellt den Platzhalter wieder her', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_ANTON);
    const vorher = await at(f);
    await oeffneFunde(f);
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), ANTON);
    const nachher = await at(f);
    assert.match(nachher, /\{\{NAME_\d+\}\}/, 'Platzhalter fehlt: ' + nachher);
    assert.equal(nachher, vorher, 'Maskierung nach erneutem Maskieren weicht vom Ausgangsstand ab');
    assert.equal(await f.evaluate(() => released.length), 0, 'released muss wieder leer sein');
    assert.ok(Object.values(await f.evaluate(() => JSON.parse(JSON.stringify(store)))).some((d) => d.v === ANTON), 'Zuordnung wird neu aufgebaut: Wert fehlt im store');
  });
});

test('Reload der Seite verwirft den Zustand: keine Freigaben, keine Funde, nichts in Speicher oder Ablage', async () => {
  const { a, f } = await startApp();
  try {
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    assert.equal(await f.evaluate(() => released.length), 1);
    await a.win.reload({ waitUntil: 'load' });
    const g = await toolFrame(a.win);
    await g.evaluate(() => { window.confirm = () => true; window.alert = () => {}; setAIMode('off'); });
    assert.equal(await g.evaluate(() => Array.isArray(released) && released.length), 0, 'released nach Reload nicht leer');
    const ablage = await g.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
    assert.ok(!ablage.includes('Beispiel'), 'Fund oder Entscheidung in localStorage/sessionStorage: ' + ablage);
    await lade(g, TEXT_ANTON);
    assert.ok(!(await at(g)).includes(ANTON), 'Wert nach Reload noch freigegeben: ' + (await at(g)));
    await oeffneFunde(g);
    assert.equal(await g.locator(li('NAME|' + ANTON)).count(), 1);
  } finally { await a.close(); }
});

test('fund-jump markiert die erste Fundstelle in #IT, Fokus bleibt am Eintrag', async () => {
  await mitApp(async (f) => {
    const t = 'Notiz vom Montag. ' + TEXT_ANTON;
    const exp = (await erwartung(f, t)).find((e) => e.key === 'NAME|' + ANTON);
    assert.ok(exp && exp.count === 2, 'Voraussetzung: zwei Fundstellen');
    await lade(f, t);
    await oeffneFunde(f);
    await f.click(li('NAME|' + ANTON) + ' button.fund-jump');
    const s = await f.evaluate(() => { const e = document.getElementById('IT'); const a = document.activeElement; return { s: e.selectionStart, e: e.selectionEnd, inLi: !!(a && a.closest && a.closest('li[data-key="NAME|Anton Beispiel"]')), tag: a && a.tagName, id: a && a.id }; });
    assert.equal(s.s, exp.firstStart, 'selectionStart ist nicht der Beginn der ersten Fundstelle: ' + JSON.stringify(s));
    assert.equal(s.e, exp.end, 'selectionEnd ist nicht das Ende der ersten Fundstelle: ' + JSON.stringify(s));
    assert.equal(t.slice(s.s, s.e), ANTON);
    assert.ok(s.inLi, 'Fokus liegt nicht mehr am Eintrag: ' + JSON.stringify(s));
  });
});

test('fund-jump scrollt #IT zur ersten Fundstelle in einem langen Text', async () => {
  await mitApp(async (f) => {
    const t = Array.from({ length: 300 }, (_, i) => 'Zeile ' + i + ' ohne Besonderheiten.').join('\n') + '\n' + TEXT_ANTON;
    await lade(f, t);
    const vor = await f.evaluate(() => { const e = document.getElementById('IT'); e.scrollTop = 0; return { sh: e.scrollHeight, ch: e.clientHeight, top: e.scrollTop }; });
    assert.ok(vor.sh > vor.ch, 'Voraussetzung: #IT ist scrollbar: ' + JSON.stringify(vor));
    await oeffneFunde(f);
    await f.click(li('NAME|' + ANTON) + ' button.fund-jump');
    const top = await f.evaluate(() => document.getElementById('IT').scrollTop);
    assert.ok(top > 0, 'Bildlauf zur Fundstelle fehlt (scrollTop ' + top + ')');
  });
});

test('Originalwert ist nur in der Seitenleiste sichtbar, nicht in Ergebnis, Gegenpruefung und Bericht', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    assert.ok((await f.textContent('#FUNDE')).includes(ANTON), 'Seitenleiste zeigt den Originalwert nicht');
    assert.ok(!(await at(f)).includes(ANTON), 'Originalwert im Ergebnis');
    const lc = await f.evaluate(() => { runLeakCheck(); return (document.getElementById('LCBAND').textContent || '') + (document.getElementById('LCLIST').textContent || ''); });
    assert.ok(!lc.includes('Beispiel'), 'Originalwert in der Gegenpruefung: ' + lc);
    await captureDownloads(f);
    await f.evaluate(() => saveReport());
    const dls = await getDownloads(f);
    const rep = dls.find((d) => /bericht/i.test(d.name));
    assert.ok(rep, 'Bericht wurde nicht erzeugt: ' + JSON.stringify(dls.map((d) => d.name)));
    const body = Buffer.from(rep.base64, 'base64').toString('utf8');
    assert.ok(!body.includes('Anton') && !body.includes('Beispiel'), 'Originalwert im Bericht');
  });
});

test('Gruppenschalter "alle dieses Typs" gibt alle Eintraege eines Typs frei und maskiert sie wieder, andere Typen bleiben unberuehrt', async () => {
  await mitApp(async (f) => {
    const ex = await erwartung(f, TEXT_GRUPPE);
    const keys = ex.map((e) => e.key).sort();
    assert.deepEqual(keys, ['EMAIL|anton@beispiel-firma.de', 'NAME|Anton Beispiel', 'NAME|Berta Muster'], 'Voraussetzung: Erkennung der Testdaten ' + JSON.stringify(keys));
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    const r1 = await gruppenSchalter(f, 'NAME');
    assert.ok(r1.ok, r1.grund);
    await warteAT(f, () => { const v = document.getElementById('AT').value; return v.includes('Anton Beispiel') && v.includes('Berta Muster'); });
    const frei = await at(f);
    assert.ok(!frei.includes('anton@beispiel-firma.de'), 'E-Mail darf nicht mitfreigegeben werden: ' + frei);
    assert.equal(await f.evaluate(() => released.filter((r) => r.pfx === 'NAME').length), 2);
    assert.equal(await f.evaluate(() => released.filter((r) => r.pfx !== 'NAME').length), 0);
    const r2 = await gruppenSchalter(f, 'NAME');
    assert.ok(r2.ok, r2.grund);
    await warteAT(f, () => { const v = document.getElementById('AT').value; return !v.includes('Anton Beispiel') && !v.includes('Berta Muster'); });
    assert.equal(await f.evaluate(() => released.length), 0, 'zweiter Klick maskiert nicht alle Eintraege des Typs wieder');
  });
});

test('Zaehlung der Liste fuer rund 6.000 Entitaeten dauert unter 300 ms', async () => {
  await mitApp(async (f) => {
    const r = await f.evaluate(() => {
      if (!window.PSLib || !PSLib.review || typeof PSLib.review.build !== 'function') return { fehlt: true };
      const blk = (i) => `Vertrag Nr. ${100000 + i}: Herr Thomas Muster${i} (geb. ${(i % 28) + 1}.0${(i % 9) + 1}.19${60 + (i % 40)}), wohnhaft Musterstraße ${(i % 200) + 1}, ${10000 + (i % 80000)} Beispielstadt, erreichbar unter user${i}@beispiel-${i}.de oder +49 89 ${1000000 + i}. IBAN DE89 3704 0044 0532 ${String(i).padStart(4, '0')} 00. Die Firma Beispiel${i} GmbH zahlt ${i},50 EUR. Frau Anna Schmidt${i} unterschreibt am 12.03.20${10 + (i % 15)}.\n`;
      const text = Array.from({ length: 1000 }, (_, i) => blk(i)).join('');
      const spans = PSDetect.detect(text, { ents: activeEntIds(), cvars: [], whitelist: [], released: [], wordlists: localAIMode, aiSpans: null });
      const t0 = performance.now();
      const list = PSLib.review.build(spans, text, { tokenOf: () => null, released: [], whitelist: [] });
      const ms = performance.now() - t0;
      return { fehlt: false, spans: spans.length, eintraege: list.length, ms: Math.round(ms) };
    });
    assert.ok(!r.fehlt, 'PSLib.review ist in der App nicht geladen (script lib/review.js fehlt in der HTML)');
    assert.ok(r.spans >= 5000, 'Voraussetzung: Stresstext liefert rund 6.000 Funde, geliefert ' + r.spans);
    assert.ok(r.eintraege >= 3000, 'zu wenige Eintraege: ' + r.eintraege);
    assert.ok(r.ms < 300, 'Listenberechnung zu langsam: ' + r.ms + ' ms');
  });
});

// ---------------------------------------------------------------------------------------------
// Nachtests nach Pruefung (nur ergaenzt, bestehende Tests unveraendert).
// Weitere angenommene Namen: #FUNDECNT (Abzeichen am Knopf), prjStale/prjBusy/prjZipBusy/prjAgain (vorhandene Projektzustaende),
// #PRJLIST button.prj-item, #PRJRUN, #PRJSUM, aiErrorDetailsText() (Diagnose-Kopie), expMap() (CSV-Export).
// ---------------------------------------------------------------------------------------------
import { setFiles } from './helpers.mjs';

const spyToast = (f) => f.evaluate(() => {
  window.__toasts = [];
  const orig = window.toast;
  window.toast = function (msg, type) { window.__toasts.push(String(msg)); return orig.apply(this, arguments); };
});
const toasts = (f) => f.evaluate(() => window.__toasts.slice());
const pause = (f, ms) => f.waitForTimeout(ms);
const txtFile = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
const PRJ_A = 'Herr Thomas Müller, max@firma.de wohnt in Berlin.';
const PRJ_B = 'Frau Anna Weber schreibt an anna.weber@beispiel.de. Herr Thomas Müller antwortet.';
const keysIn = (f) => f.evaluate(() => Array.from(document.querySelectorAll('#FUNDELIST li[data-key]')).map((x) => x.dataset.key));

async function startPrj() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => { window.confirm = () => true; window.alert = () => {}; startApp(); setAIMode('off'); });
  await spyToast(f);
  await setFiles(f, [txtFile('eins.txt', PRJ_A), txtFile('zwei.txt', PRJ_B)]);
  await f.waitForFunction(() => document.querySelectorAll('#PRJPANEL button.prj-item').length === 2, null, { timeout: 20000 });
  await f.click('#PRJRUN');
  await f.waitForFunction(() => {
    const els = Array.from(document.querySelectorAll('#PRJPANEL button.prj-item'));
    return els.length === 2 && els.every((e) => /fertig/i.test(e.textContent));
  }, null, { timeout: 60000 });
  return { a, f };
}
const prjItem = (f, i) => f.locator('#PRJPANEL button.prj-item').nth(i);

test('N1 clearAll bei geschlossener Leiste: released leer, Liste ohne Eintraege, Abzeichen leer', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    assert.match(await f.textContent('#FUNDECNT'), /1/, 'Voraussetzung: Abzeichen zeigt die Zahl der Funde');
    await f.evaluate(() => toggleFunde(false));
    await f.evaluate(() => clearAll());
    assert.equal(await f.evaluate(() => released.length), 0, 'released nach clearAll nicht leer');
    assert.equal(await f.locator('#FUNDELIST li[data-key]').count(), 0, 'Liste zeigt nach clearAll noch Funde (Originalwerte bleiben im DOM)');
    assert.ok(!(await f.textContent('#FUNDELIST')).includes(ANTON), 'Originalwert nach clearAll noch im DOM');
    const badge = ((await f.textContent('#FUNDECNT')) || '').trim();
    assert.ok(badge === '' || badge === '0', 'Abzeichen nach clearAll nicht leer: ' + JSON.stringify(badge));
  });
});

test('N2a Freigabe klicken und sofort zuruecksetzen: kein Fehler-Toast "Kein Text vorhanden"', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    await spyToast(f);
    await f.evaluate(() => { document.querySelector('#FUNDELIST li[data-key="NAME|Anton Beispiel"] button.fund-toggle').click(); clearAll(); });
    await pause(f, 900);
    const t = await toasts(f);
    assert.ok(!t.some((m) => /Kein Text vorhanden/.test(m)), 'Fehler-Toast nach Zuruecksetzen: ' + JSON.stringify(t));
  });
});

test('N2b Freigabe klicken, sofort zuruecksetzen, neuen Text einfuegen: keine automatische Anonymisierung', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    await f.evaluate(() => {
      document.querySelector('#FUNDELIST li[data-key="NAME|Anton Beispiel"] button.fund-toggle').click();
      clearAll();
      document.getElementById('IT').value = 'Neuer Text mit Frau Berta Muster.';
    });
    await pause(f, 900);
    assert.equal(await at(f), '', 'nach Zuruecksetzen wurde der neue Text ohne Nutzeraktion anonymisiert: ' + (await at(f)));
  });
});

test('N3a Projektmodus: Leiste zeigt nach Dokumentwechsel die Funde des aktuellen Dokuments', async () => {
  const { a, f } = await startPrj();
  try {
    await prjItem(f, 0).click();
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
    let k = await keysIn(f);
    assert.ok(k.includes('EMAIL|max@firma.de') && !k.includes('EMAIL|anna.weber@beispiel.de'), 'Dokument 1: ' + JSON.stringify(k));
    await prjItem(f, 1).click();
    await pause(f, 700);
    k = await keysIn(f);
    assert.ok(k.includes('EMAIL|anna.weber@beispiel.de'), 'Dokument 2 fehlt in der Liste: ' + JSON.stringify(k));
    assert.ok(!k.includes('EMAIL|max@firma.de'), 'Liste zeigt noch die Funde des vorherigen Dokuments: ' + JSON.stringify(k));
    await prjItem(f, 0).click();
    await pause(f, 700);
    k = await keysIn(f);
    assert.ok(k.includes('EMAIL|max@firma.de') && !k.includes('EMAIL|anna.weber@beispiel.de'), 'Rueckwechsel zu Dokument 1: ' + JSON.stringify(k));
  } finally { await a.close(); }
});

test('N3b Projektmodus: Freigabe gilt in beiden Dokumenten', async () => {
  const { a, f } = await startPrj();
  try {
    await prjItem(f, 0).click();
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector(li('NAME|Thomas Müller'), { timeout: 8000 });
    await f.click(li('NAME|Thomas Müller') + ' button.fund-toggle');
    await pause(f, 900);
    await f.waitForFunction(() => !anonBusy && !prjBusy, null, { timeout: 20000 });
    assert.equal(await f.evaluate(() => released.some((r) => r.pfx === 'NAME' && r.value === 'Thomas Müller')), true, 'released fehlt');
    // Ergebnisse muessen die Freigabe widerspiegeln: entweder automatisch neu gerechnet oder nach erneutem Lauf
    if (await f.evaluate(() => prjStale)) { await f.click('#PRJRUN'); }
    await f.waitForFunction(() => {
      const els = Array.from(document.querySelectorAll('#PRJPANEL button.prj-item'));
      return !prjBusy && els.length === 2 && els.every((e) => /fertig/i.test(e.textContent));
    }, null, { timeout: 60000 });
    for (const i of [0, 1]) {
      await prjItem(f, i).click();
      await pause(f, 300);
      const out = await at(f);
      assert.ok(out.includes('Thomas Müller'), 'Dokument ' + (i + 1) + ': Freigabe wirkt nicht: ' + out);
    }
  } finally { await a.close(); }
});

test('N4 fund-jump nach manuellem Bearbeiten von #IT (Text davor eingefuegt): Auswahl trifft weiter den Wert', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    await f.fill('#IT', 'Vorspann, der nachtraeglich eingefuegt wurde. ' + TEXT_ANTON);
    await pause(f, 800);
    await f.click(li('NAME|' + ANTON) + ' button.fund-jump');
    const sel = await f.evaluate(() => { const e = document.getElementById('IT'); return e.value.slice(e.selectionStart, e.selectionEnd); });
    assert.equal(sel, ANTON, 'Auswahl trifft nicht den Wert: ' + JSON.stringify(sel));
  });
});

test('N5 Liste ist nach Konfigurationsaenderung aktuell: ausgeschaltete Entitaet verschwindet nach Schliessen und Oeffnen', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    assert.ok((await keysIn(f)).includes('EMAIL|anton@beispiel-firma.de'), 'Voraussetzung: EMAIL-Eintrag vorhanden');
    await f.evaluate(() => { ENTS.find((e) => e.id === 'email').on = false; curProf = 'custom'; });
    await f.evaluate(() => toggleFunde(false));
    await f.evaluate(() => toggleFunde(true));
    await pause(f, 300);
    const k = await keysIn(f);
    assert.ok(!k.some((x) => x.startsWith('EMAIL|')), 'ausgeschaltete Entitaet noch in der Liste: ' + JSON.stringify(k));
    assert.ok(k.includes('NAME|' + ANTON), 'andere Eintraege muessen bleiben');
  });
});

test('N6a Entscheidung waehrend ZIP-Erstellung markiert Projektergebnisse als veraltet', async () => {
  const { a, f } = await startPrj();
  try {
    await prjItem(f, 0).click();
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector(li('NAME|Thomas Müller'), { timeout: 8000 });
    await f.evaluate(() => { prjZipBusy = true; });
    await f.click(li('NAME|Thomas Müller') + ' button.fund-toggle');
    await pause(f, 700);
    const s = await f.evaluate(() => ({ stale: prjStale, sum: document.getElementById('PRJSUM').textContent }));
    await f.evaluate(() => { prjZipBusy = false; });
    assert.ok(s.stale || /veraltet/i.test(s.sum), 'Ergebnisse nicht als veraltet markiert: ' + JSON.stringify(s));
  } finally { await a.close(); }
});

test('N6b Entscheidung waehrend laufendem Projektlauf: Ergebnisse veraltet oder erneuter Lauf vorgemerkt', async () => {
  const { a, f } = await startPrj();
  try {
    await prjItem(f, 0).click();
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector(li('NAME|Thomas Müller'), { timeout: 8000 });
    await f.evaluate(() => { prjBusy = true; });
    await f.click(li('NAME|Thomas Müller') + ' button.fund-toggle');
    await pause(f, 700);
    const s = await f.evaluate(() => ({ stale: prjStale, again: prjAgain }));
    await f.evaluate(() => { prjBusy = false; });
    assert.ok(s.stale || s.again, 'weder veraltet noch erneuter Lauf vorgemerkt: ' + JSON.stringify(s));
  } finally { await a.close(); }
});

test('N7 Freigabe ohne vorherige Anonymisierung (#AT leer) startet keine Anonymisierung', async () => {
  await mitApp(async (f) => {
    await f.evaluate((t) => { document.getElementById('IT').value = t; aiCache = { key: null, spans: [] }; }, TEXT_ANTON);
    await oeffneFunde(f);
    assert.equal(await at(f), '', 'Voraussetzung: noch nicht anonymisiert');
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await pause(f, 900);
    assert.equal(await at(f), '', 'Freigabe hat ungefragt eine Anonymisierung gestartet: ' + (await at(f)));
    assert.equal(await f.evaluate(() => getComputedStyle(document.getElementById('resultArea')).display), 'none', 'Ergebnisbereich wurde geoeffnet');
  });
});

test('N8 Sicherheit: Fundwert mit HTML und Anfuehrungszeichen erzeugt kein Element und zerstoert data-key nicht', async () => {
  await mitApp(async (f) => {
    const v = '<img src=x onerror="window.__pwn=1">';
    await f.evaluate((x) => { window.__pwn = undefined; PSLib.marks.add(manualMarks, { value: x, pfx: 'NAME' }); PSLib.marks.add(manualMarks, { value: 'Zwiebelbaum', pfx: 'NAME' }); }, v);
    await lade(f, 'Danke ' + v + ' und Zwiebelbaum.');
    await oeffneFunde(f);
    await pause(f, 400);
    assert.equal(await f.locator('#FUNDE img').count(), 0, 'img-Element im DOM der Seitenleiste');
    assert.equal(await f.evaluate(() => window.__pwn), undefined, 'Skript aus dem Fundwert wurde ausgefuehrt');
    const k = await keysIn(f);
    assert.deepEqual(k.slice().sort(), ['NAME|' + v, 'NAME|Zwiebelbaum'].sort(), 'data-key unvollstaendig oder zerstoert: ' + JSON.stringify(k));
    assert.equal(await f.locator('#FUNDELIST li[data-key]').count(), 2);
    const vollerWert = await f.evaluate(() => Array.from(document.querySelectorAll('#FUNDELIST .fund-jump')).map((b) => b.textContent));
    assert.ok(vollerWert.includes(v), 'Wert wird nicht als Text angezeigt: ' + JSON.stringify(vollerWert));
  });
});

test('N9a Gross-/Kleinschreibung: Freigabe von "Zwiebelbaum" gibt "zwiebelbaum" nicht frei', async () => {
  await mitApp(async (f) => {
    await f.evaluate(() => { PSLib.marks.add(manualMarks, { value: 'Zwiebelbaum', pfx: 'NAME' }); PSLib.marks.add(manualMarks, { value: 'zwiebelbaum', pfx: 'NAME' }); });
    await lade(f, 'Zwiebelbaum trifft zwiebelbaum.');
    await oeffneFunde(f);
    assert.deepEqual((await keysIn(f)).sort(), ['NAME|Zwiebelbaum', 'NAME|zwiebelbaum']);
    await f.click(li('NAME|Zwiebelbaum') + ' button.fund-toggle');
    await warteAT(f, () => document.getElementById('AT').value.includes('Zwiebelbaum'));
    const out = await at(f);
    assert.ok(!out.includes('zwiebelbaum'), 'Kleinschreibung wurde mitfreigegeben: ' + out);
    assert.match(out, /\{\{NAME_\d+\}\}/);
  });
});

test('N9b Typbindung: Freigabe { ORG, Berlin } gibt den ORT "Berlin" nicht frei', async () => {
  await mitApp(async (f) => {
    await f.evaluate(() => { released.push({ pfx: 'ORG', value: 'Berlin' }); });
    await lade(f, TEXT_BERLIN);
    assert.ok(!(await at(f)).includes('Berlin'), 'Freigabe eines anderen Typs wirkt auf ORT: ' + (await at(f)));
    await oeffneFunde(f);
    await f.click(li('ORT|Berlin') + ' button.fund-toggle');
    await warteAT(f, () => document.getElementById('AT').value.includes('wohne in Berlin und arbeite in Berlin.'));
    assert.equal(await f.evaluate(() => released.filter((r) => r.value === 'Berlin').length), 2, 'ORG- und ORT-Freigabe sind getrennte Eintraege');
  });
});

test('N10a Tastatur: Enter und Leertaste am fund-toggle schalten, Fokus bleibt am selben Eintrag', async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    const sel = li('NAME|' + ANTON) + ' button.fund-toggle';
    const fokus = () => f.evaluate(() => { const x = document.activeElement; const l = x && x.closest && x.closest('li[data-key]'); return { key: l && l.dataset.key, cls: x && x.className }; });
    await f.focus(sel);
    await a.win.keyboard.press('Enter');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    let fk = await fokus();
    assert.equal(fk.key, 'NAME|' + ANTON, 'Fokus nach Enter nicht am Eintrag: ' + JSON.stringify(fk));
    assert.match(String(fk.cls), /fund-toggle/, 'Fokus nach Enter nicht am Schalter');
    await a.win.keyboard.press('Space');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), ANTON);
    fk = await fokus();
    assert.equal(fk.key, 'NAME|' + ANTON, 'Fokus nach Leertaste nicht am Eintrag: ' + JSON.stringify(fk));
  });
});

test('N10b aria: Gruppenschalter traegt ein aria-label mit dem Typ, #FUNDELIST ist keine aria-live-Region', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    const r = await f.evaluate(() => {
      const li0 = document.querySelector('#FUNDELIST li[data-key^="NAME|"]');
      let b = null;
      for (let el = li0.parentElement; el && el.id !== 'FUNDELIST' && !b; el = el.parentElement) b = Array.from(el.querySelectorAll('button')).find((x) => /alle dieses Typs/i.test(x.textContent));
      const ent = ENTS.find((e) => e.pfx === 'NAME');
      return { label: b && b.getAttribute('aria-label'), lbl: ent && ent.lbl, live: document.getElementById('FUNDELIST').getAttribute('aria-live') };
    });
    assert.ok(r.label, 'Gruppenschalter ohne aria-label');
    assert.ok(/NAME/i.test(r.label) || (r.lbl && r.label.toLowerCase().includes(String(r.lbl).toLowerCase())), 'aria-label nennt den Typ nicht: ' + JSON.stringify(r));
    assert.equal(r.live, null, '#FUNDELIST hat aria-live (jede Neuberechnung wuerde vorgelesen): ' + r.live);
  });
});

test('N11 Originalwert steht weder in Toasts noch in der Diagnose-Kopie noch in Dateinamen von Downloads', async () => {
  await mitApp(async (f) => {
    await spyToast(f);
    await captureDownloads(f);
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), ANTON);
    await f.evaluate(() => { try { expMap(); } catch (e) { /* ignorieren */ } try { saveReport(); } catch (e) { /* ignorieren */ } });
    await pause(f, 600);
    const t = await toasts(f);
    assert.ok(!t.some((m) => /Anton|Beispiel/.test(m)), 'Originalwert im Toast: ' + JSON.stringify(t));
    const diag = await f.evaluate(() => aiErrorDetailsText());
    assert.ok(!/Anton|Beispiel/.test(diag), 'Originalwert in der Diagnose-Kopie');
    const names = (await getDownloads(f)).map((d) => d.name);
    assert.ok(names.length > 0, 'Voraussetzung: Downloads ausgeloest');
    assert.ok(!names.some((n) => /Anton|Beispiel/i.test(n)), 'Originalwert im Dateinamen: ' + JSON.stringify(names));
    const tt = await f.evaluate(() => document.title + '|' + document.getElementById('TT').textContent);
    assert.ok(!/Anton|Beispiel/.test(tt), 'Originalwert in Titel oder Toast-Text');
  });
});

test('N12 Persistenz: localStorage und sessionStorage enthalten schon VOR dem Reload keinen Fundwert', async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_ANTON);
    await oeffneFunde(f);
    await f.click(li('NAME|' + ANTON) + ' button.fund-toggle');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    await f.click(li('NAME|' + ANTON) + ' button.fund-jump');
    await pause(f, 600);
    const ablage = await f.evaluate(() => JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]));
    assert.ok(!/Anton|Beispiel/.test(ablage), 'Fundwert in der Browserablage: ' + ablage);
  });
});
