// D1.w2: Rueckgaengig, Tastatur, Filter, grosse Listen der Pruefansicht (Seitenleiste "Funde") gegen die echte App.
// Spezifikation: V2-D-bedienung.md, Abschnitt D1.w2; Entscheidungen D45 und D47 (V2-ENTSCHEIDUNGEN.md).
// Rot zuerst: Knoepfe, Filter, Tastatur, Virtualisierung und die Nachbesserungen aus D47 gibt es noch nicht.
//
// Genannte Kennungen: #FUNDE, #FUNDEBTN, toggleFunde(open), #FUNDELIST, li[data-key], button.fund-toggle, button.fund-jump,
// #FUNDEUNDO, #FUNDEREDO, #FUNDEFILTER, #FUNDEDOUBT, #FUNDESEARCH, #FUNDESTATUS (D1.w1/D1.w2).
// Angenommen (nicht in der Spezifikation festgelegt):
//   * #FUNDEFILTER ist ein <select>; eine Option hat als value den Typ-Praefix (z. B. EMAIL), die Kennung der Entitaet (email)
//     oder tragt die Bezeichnung (ENTS[].lbl) im Text; ein Wechsel loest "change" aus.
//   * #FUNDEDOUBT ist ein Schalter, der sich per Klick umschaltet (Kontrollkaestchen oder Knopf).
//   * #FUNDESEARCH ist ein Eingabefeld; Eingabe loest "input" aus.
//   * Nach einer Entscheidung ist der Stand "vorher" im Verlauf (Grundzustand gehoert zum Verlauf): nach einer Entscheidung
//     und einem Undo ist #FUNDEUNDO deaktiviert und #FUNDEREDO aktiviert.
//   * Pfeiltasten/Pos1/Ende bewegen den Fokus zwischen den Eintraegen (li[data-key]) der Liste; welcher Knopf im Eintrag den
//     Fokus bekommt, ist offen (geprueft wird nur der Eintrag).
//   * Stichprobe der Kuerzel nur fuer Windows/Linux (Control); die macOS-Variante (Cmd, darwin) ist hier nicht pruefbar, weil
//     die Brueckenplattform im Werkzeug nicht ersetzbar ist.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, sleep } from './helpers.mjs';

const ANTON = 'Anton Beispiel';
const BERTA = 'Berta Muster';
const MAIL = 'anton@beispiel-firma.de';
const TEXT_GRUPPE = 'Herr Anton Beispiel und Frau Berta Muster. Anton Beispiel meldet sich unter anton@beispiel-firma.de.';
const TEXT_FILTER = TEXT_GRUPPE + ' IBAN DE89 3704 0044 0532 0130 00.';
const SOFT = ['NAME', 'ORG', 'ORT', 'ADRESSE', 'ROLLE', 'MEDIZIN', 'SENSIBEL'];
const TEXT_KONFIG = 'Herr Anton Beispiel meldet sich unter anton@beispiel-firma.de, IBAN DE89 3704 0044 0532 0130 00. Das Rotkehlchen und die Blaumeise sitzen hier.';
const LANG = { timeout: 120000 };
const KURZ = { timeout: 60000 };
// macOS: Cmd statt Strg, Wiederholen nur mit Cmd+Umschalt+Z (kein Cmd+Y), Dokumentende mit Cmd+Pfeil unten (D1.w2, CI-Probelauf 3).
const MAC = process.platform === 'darwin';
const MOD = MAC ? 'Meta' : 'Control';

// Neue App starten, Tool-Frame holen, KI aus (deterministische Erkennung). Kurze Aktionszeitgrenze: fehlende Elemente schnell melden.
async function startApp() {
  const a = await launchApp();
  a.win.setDefaultTimeout(4000);
  const f = await toolFrame(a.win);
  await f.evaluate(() => { window.confirm = () => true; window.alert = () => {}; setAIMode('off'); });
  return { a, f };
}
async function mitApp(fn) {
  const { a, f } = await startApp();
  try { return await fn(f, a); } finally { await a.close(); }
}
const lade = (f, t) => f.evaluate(async (v) => {
  document.getElementById('IT').value = v;
  aiCache = { key: null, spans: [] };
  await anon();
}, t);
const at = (f) => f.evaluate(() => document.getElementById('AT').value);
const oeffneFunde = async (f) => {
  await f.evaluate(() => toggleFunde(true));
  await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
};
const li = (key) => `#FUNDELIST li[data-key="${key}"]`;
const warteAT = async (f, fn, arg) => {
  try { await f.waitForFunction(fn, arg, { timeout: 6000 }); } catch (e) { assert.fail('Ergebnis #AT hat sich nicht wie erwartet geaendert (6 s): ' + String(e.message).split('\n')[0]); }
};
const braucht = async (f, sel) => assert.equal(await f.locator(sel).count(), 1, 'Element ' + sel + ' fehlt');
const relListe = (f) => f.evaluate(() => released.map((r) => r.pfx + '|' + r.value).sort());
const keysIn = (f) => f.evaluate(() => Array.from(document.querySelectorAll('#FUNDELIST li[data-key]')).map((x) => x.dataset.key));
const fokusKey = (f) => f.evaluate(() => { const x = document.activeElement; const l = x && x.closest && x.closest('li[data-key]'); return l ? l.dataset.key : null; });
const istDeaktiviert = (f, sel) => f.evaluate((s) => { const e = document.querySelector(s); return !!e && (e.disabled === true || e.getAttribute('aria-disabled') === 'true'); }, sel);
const spyToast = (f) => f.evaluate(() => {
  window.__toasts = [];
  const orig = window.toast;
  window.toast = function (msg, type) { window.__toasts.push(String(msg)); return orig.apply(this, arguments); };
});
const toasts = (f) => f.evaluate(() => window.__toasts.slice());

// Eintrag freigeben ueber seinen Schalter und warten, bis das Ergebnis den Klartext zeigt
async function freigeben(f, key, wert) {
  await braucht(f, li(key) + ' button.fund-toggle');
  await f.click(li(key) + ' button.fund-toggle');
  await warteAT(f, (v) => document.getElementById('AT').value.includes(v), wert);
}
// Erwartung der Erkennung (ohne Freigaben), gruppiert nach Typ und exaktem Wert
const erwartungKeys = (f, t) => f.evaluate((v) => {
  const spans = PSDetect.detect(v, { ents: activeEntIds(), cvars: cvars.concat(PSLib.marks.toCvars(manualMarks)), whitelist: [], released: [], wordlists: localAIMode, aiSpans: null });
  return Array.from(new Set(spans.map((s) => s.pfx + '|' + v.slice(s.start, s.end)))).sort();
}, t);
// Wartet, bis die Schluessel der Liste die Bedingung erfuellen; sonst Fehler mit dem letzten Stand
async function warteKeys(f, check, msg, ms = 3000) {
  const t0 = Date.now();
  let k = [];
  while (Date.now() - t0 < ms) {
    k = await keysIn(f);
    if (check(k)) return k;
    await sleep(100);
  }
  assert.fail(msg + '; Liste: ' + JSON.stringify(k.slice(0, 12)) + (k.length > 12 ? ' (+' + (k.length - 12) + ')' : ''));
}
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
async function waehleKategorie(f, pfx) {
  await braucht(f, '#FUNDEFILTER');
  const r = await f.evaluate((p) => {
    const el = document.getElementById('FUNDEFILTER');
    if (el.tagName !== 'SELECT') return { ok: false, grund: '#FUNDEFILTER ist kein select, sondern ' + el.tagName };
    const ent = ENTS.find((e) => e.pfx === p);
    const opt = Array.from(el.options).find((o) => o.value === p || (ent && (o.value === ent.id || o.textContent.includes(ent.lbl))));
    if (!opt) return { ok: false, grund: 'keine Option fuer ' + p + ': ' + JSON.stringify(Array.from(el.options).map((o) => o.value + '=' + o.textContent)) };
    el.value = opt.value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }, pfx);
  assert.ok(r.ok, r.grund);
}

// ---------------------------------------------------------------------------------------------
// Rueckgaengig und Wiederholen
// ---------------------------------------------------------------------------------------------

test('Wert freigeben, Undo ueber #FUNDEUNDO stellt die Maskierung her, Redo ueber #FUNDEREDO gibt wieder frei', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await braucht(f, '#FUNDEUNDO');
    await braucht(f, '#FUNDEREDO');
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    assert.deepEqual(await relListe(f), ['NAME|' + ANTON]);
    await f.click('#FUNDEUNDO');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), ANTON);
    assert.deepEqual(await relListe(f), [], 'Undo stellt released nicht her');
    assert.match(await at(f), /\{\{NAME_\d+\}\}/, 'Platzhalter nach Undo nicht wiederhergestellt: ' + (await at(f)));
    await f.click('#FUNDEREDO');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    assert.deepEqual(await relListe(f), ['NAME|' + ANTON], 'Redo gibt den Wert nicht wieder frei');
    assert.ok((await at(f)).includes(ANTON));
  });
});

test('Knoepfe #FUNDEUNDO und #FUNDEREDO haben ein aria-label und sind je nach Verlauf deaktiviert', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await braucht(f, '#FUNDEUNDO');
    await braucht(f, '#FUNDEREDO');
    for (const id of ['FUNDEUNDO', 'FUNDEREDO']) {
      const label = await f.getAttribute('#' + id, 'aria-label');
      assert.ok(label && label.trim().length > 2, 'aria-label an #' + id + ' fehlt oder ist leer: ' + JSON.stringify(label));
    }
    assert.match(await f.getAttribute('#FUNDEUNDO', 'aria-label'), /r.ckg.ngig|undo/i, 'aria-label von #FUNDEUNDO nennt die Aktion nicht');
    assert.match(await f.getAttribute('#FUNDEREDO', 'aria-label'), /wiederhol|redo|wiederherstell/i, 'aria-label von #FUNDEREDO nennt die Aktion nicht');
    assert.ok(await istDeaktiviert(f, '#FUNDEUNDO'), 'ohne Entscheidung muss #FUNDEUNDO deaktiviert sein');
    assert.ok(await istDeaktiviert(f, '#FUNDEREDO'), 'ohne Entscheidung muss #FUNDEREDO deaktiviert sein');
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    assert.ok(!(await istDeaktiviert(f, '#FUNDEUNDO')), 'nach einer Entscheidung muss #FUNDEUNDO aktiv sein');
    assert.ok(await istDeaktiviert(f, '#FUNDEREDO'), 'ohne rueckgaengig gemachte Entscheidung muss #FUNDEREDO deaktiviert sein');
    await f.click('#FUNDEUNDO');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), ANTON);
    assert.ok(await istDeaktiviert(f, '#FUNDEUNDO'), 'am Anfang des Verlaufs muss #FUNDEUNDO deaktiviert sein');
    assert.ok(!(await istDeaktiviert(f, '#FUNDEREDO')), 'nach Undo muss #FUNDEREDO aktiv sein');
    await f.click('#FUNDEREDO');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    assert.ok(await istDeaktiviert(f, '#FUNDEREDO'), 'am Ende des Verlaufs muss #FUNDEREDO deaktiviert sein');
    assert.ok(!(await istDeaktiviert(f, '#FUNDEUNDO')));
  });
});

test('Control+Z bei Fokus auf einem Eintrag macht die Entscheidung rueckgaengig, der Fokus bleibt am Eintrag', KURZ, async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    await f.focus(li('NAME|' + ANTON) + ' button.fund-toggle');
    await a.win.keyboard.press(MOD + '+Z');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), ANTON);
    assert.deepEqual(await relListe(f), [], 'Control+Z hat die Freigabe nicht zurueckgenommen');
    assert.equal(await f.evaluate(() => document.getElementById('IT').value), TEXT_GRUPPE, 'Control+Z am Eintrag darf den Eingabetext nicht aendern');
    assert.equal(await fokusKey(f), 'NAME|' + ANTON, 'Fokus liegt nach Undo nicht mehr am Eintrag');
  });
});

test('Control+Z bei Fokus auf #IT aendert nur den Text des Eingabefeldes, die Entscheidungen bleiben', KURZ, async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    await f.focus('#IT');
    await a.win.keyboard.press(MAC ? 'Meta+ArrowDown' : 'Control+End');
    await a.win.keyboard.insertText(' Notiz');
    assert.equal(await f.evaluate(() => document.getElementById('IT').value), TEXT_GRUPPE + ' Notiz', 'Voraussetzung: Tastatureingabe im Feld');
    await a.win.keyboard.press(MOD + '+Z');
    await sleep(500);
    assert.equal(await f.evaluate(() => document.getElementById('IT').value), TEXT_GRUPPE, 'Control+Z in #IT muss die Texteingabe zuruecknehmen');
    assert.deepEqual(await relListe(f), ['NAME|' + ANTON], 'Control+Z in #IT darf die Entscheidung nicht zuruecknehmen');
    await braucht(f, '#FUNDEUNDO');
    assert.ok(!(await istDeaktiviert(f, '#FUNDEUNDO')), 'die Entscheidung muss im Verlauf bleiben (#FUNDEUNDO aktiv)');
  });
});

test('Control+Z bei Fokus im Suchfeld #FUNDESEARCH nimmt keine Entscheidung zurueck', KURZ, async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    await braucht(f, '#FUNDESEARCH');
    await f.focus('#FUNDESEARCH');
    await a.win.keyboard.press(MOD + '+Z');
    await sleep(600);
    assert.deepEqual(await relListe(f), ['NAME|' + ANTON], 'Control+Z im Suchfeld darf die Entscheidung nicht zuruecknehmen');
  });
});

test('Strg+Y und Strg+Umschalt+Z wirken als Wiederholen', KURZ, async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await braucht(f, '#FUNDEUNDO');
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    await f.click('#FUNDEUNDO');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), ANTON);
    await f.focus(li('NAME|' + ANTON) + ' button.fund-toggle');
    if (!MAC) {
      await a.win.keyboard.press(MOD + '+Y');
      await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
      assert.deepEqual(await relListe(f), ['NAME|' + ANTON], 'Control+Y gibt nicht wieder frei');
      await f.click('#FUNDEUNDO');
      await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), ANTON);
      await f.focus(li('NAME|' + ANTON) + ' button.fund-toggle');
    }
    await a.win.keyboard.press(MOD + '+Shift+Z');
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v), ANTON);
    assert.deepEqual(await relListe(f), ['NAME|' + ANTON], 'Control+Umschalt+Z gibt nicht wieder frei');
  });
});

test('Drei Entscheidungen, zweimal Undo, neue Entscheidung: Redo ist nicht mehr moeglich', KURZ, async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await braucht(f, '#FUNDEUNDO');
    await braucht(f, '#FUNDEREDO');
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    await freigeben(f, 'NAME|' + BERTA, BERTA);
    await freigeben(f, 'EMAIL|' + MAIL, MAIL);
    assert.deepEqual(await relListe(f), ['EMAIL|' + MAIL, 'NAME|' + ANTON, 'NAME|' + BERTA]);
    await f.click('#FUNDEUNDO');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), MAIL);
    await f.click('#FUNDEUNDO');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v), BERTA);
    assert.deepEqual(await relListe(f), ['NAME|' + ANTON], 'nach zweimal Undo darf nur die erste Entscheidung gelten');
    assert.ok(!(await istDeaktiviert(f, '#FUNDEREDO')), 'Voraussetzung: Redo ist nach Undo moeglich');
    await freigeben(f, 'EMAIL|' + MAIL, MAIL);
    assert.ok(await istDeaktiviert(f, '#FUNDEREDO'), 'neue Entscheidung muss den Wiederholen-Zweig verwerfen (#FUNDEREDO deaktiviert)');
    await f.focus(li('EMAIL|' + MAIL) + ' button.fund-toggle');
    await a.win.keyboard.press(MOD + '+Y');
    await sleep(700);
    assert.deepEqual(await relListe(f), ['EMAIL|' + MAIL, 'NAME|' + ANTON], 'Control+Y darf nach einer neuen Entscheidung nichts mehr wiederholen');
  });
});

test('"Alle dieses Typs" ist eine einzige Entscheidung: ein Undo stellt alle Eintraege des Typs wieder her', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await braucht(f, '#FUNDEUNDO');
    const g = await gruppenSchalter(f, 'NAME');
    assert.ok(g.ok, g.grund);
    await warteAT(f, (v) => document.getElementById('AT').value.includes(v[0]) && document.getElementById('AT').value.includes(v[1]), [ANTON, BERTA]);
    assert.deepEqual(await relListe(f), ['NAME|' + ANTON, 'NAME|' + BERTA]);
    await f.click('#FUNDEUNDO');
    await warteAT(f, (v) => !document.getElementById('AT').value.includes(v[0]) && !document.getElementById('AT').value.includes(v[1]), [ANTON, BERTA]);
    assert.deepEqual(await relListe(f), [], 'ein Undo muss die ganze Gruppenentscheidung zuruecknehmen');
    assert.ok(await istDeaktiviert(f, '#FUNDEUNDO'), 'die Gruppenentscheidung war genau ein Schnappschuss');
  });
});

// ---------------------------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------------------------

test('Filter #FUNDEFILTER nach Kategorie zeigt nur Eintraege dieses Typs', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_FILTER);
    await oeffneFunde(f);
    const alle = await keysIn(f);
    assert.ok(alle.some((k) => k.startsWith('NAME|')) && alle.some((k) => k.startsWith('EMAIL|')) && alle.some((k) => k.startsWith('IBAN|')), 'Voraussetzung: NAME, EMAIL und IBAN gefunden: ' + JSON.stringify(alle));
    await waehleKategorie(f, 'EMAIL');
    const k = await warteKeys(f, (x) => x.length > 0 && x.every((y) => y.startsWith('EMAIL|')), 'Filter EMAIL zeigt andere Typen');
    assert.deepEqual(k, ['EMAIL|' + MAIL]);
    await waehleKategorie(f, 'NAME');
    await warteKeys(f, (x) => x.length === 2 && x.every((y) => y.startsWith('NAME|')), 'Filter NAME zeigt nicht genau die zwei Namen');
  });
});

test('Filter #FUNDEDOUBT zeigt nur Zweifelsfaelle (weiche Typen wie NAME), keine sicheren Typen', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_FILTER);
    await oeffneFunde(f);
    await braucht(f, '#FUNDEDOUBT');
    await f.click('#FUNDEDOUBT');
    const k = await warteKeys(f, (x) => x.length > 0 && x.every((y) => SOFT.includes(y.split('|')[0])), 'nur Zweifelsfaelle erwartet (' + SOFT.join('/') + ')');
    assert.ok(k.includes('NAME|' + ANTON) && k.includes('NAME|' + BERTA), 'Namen fehlen: ' + JSON.stringify(k));
    assert.ok(!k.some((y) => y.startsWith('EMAIL|') || y.startsWith('IBAN|')), 'sichere Typen duerfen nicht erscheinen: ' + JSON.stringify(k));
    await f.click('#FUNDEDOUBT');
    await warteKeys(f, (x) => x.some((y) => y.startsWith('EMAIL|')) && x.some((y) => y.startsWith('IBAN|')), 'nach dem Ausschalten muessen alle Eintraege wieder erscheinen');
  });
});

test('Suchfeld #FUNDESEARCH filtert nach Wert, Gross- und Kleinschreibung egal', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_FILTER);
    await oeffneFunde(f);
    await braucht(f, '#FUNDESEARCH');
    await f.fill('#FUNDESEARCH', 'ANTON');
    const k = await warteKeys(f, (x) => x.length > 0 && x.every((y) => y.slice(y.indexOf('|') + 1).toLowerCase().includes('anton')), 'Suche "ANTON" muss auf Werte mit "anton" einschraenken');
    assert.deepEqual(k.sort(), ['EMAIL|' + MAIL, 'NAME|' + ANTON].sort());
    await f.fill('#FUNDESEARCH', 'berta muster');
    assert.deepEqual(await warteKeys(f, (x) => x.length === 1, 'Suche "berta muster" muss genau einen Eintrag liefern'), ['NAME|' + BERTA]);
    await f.fill('#FUNDESEARCH', 'gibtesnicht');
    await warteKeys(f, (x) => x.length === 0, 'Suche ohne Treffer muss die Liste leeren');
    await f.fill('#FUNDESEARCH', '');
    await warteKeys(f, (x) => x.length === 4, 'leere Suche muss alle vier Eintraege zeigen');
  });
});

// ---------------------------------------------------------------------------------------------
// Grosse Listen, Tastatur
// ---------------------------------------------------------------------------------------------

const GROSSER_TEXT = () => Array.from({ length: 6000 }, (_, i) => `Kontakt ${i}: person${i}@muster-${i}.de`).join('\n');

test('Pfeil auf/ab, Pos1 und Ende bewegen den Fokus zwischen den Eintraegen (kleine Liste)', KURZ, async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_FILTER);
    await oeffneFunde(f);
    const keys = await f.evaluate(() => fundeList.map((e) => e.key));
    assert.ok(keys.length >= 4, 'Voraussetzung: mindestens vier Eintraege: ' + JSON.stringify(keys));
    await f.focus('#FUNDELIST li[data-key] button.fund-jump');
    assert.equal(await fokusKey(f), keys[0], 'Voraussetzung: Fokus am ersten Eintrag');
    await a.win.keyboard.press('ArrowDown');
    await f.waitForFunction((k) => { const l = document.activeElement.closest('li[data-key]'); return l && l.dataset.key === k; }, keys[1], { timeout: 2000 }).catch(() => {});
    assert.equal(await fokusKey(f), keys[1], 'Pfeil ab bewegt den Fokus nicht zum naechsten Eintrag');
    await a.win.keyboard.press('ArrowDown');
    await sleep(150);
    assert.equal(await fokusKey(f), keys[2], 'zweiter Pfeil ab');
    await a.win.keyboard.press('ArrowUp');
    await sleep(150);
    assert.equal(await fokusKey(f), keys[1], 'Pfeil auf bewegt den Fokus nicht zum vorigen Eintrag');
    await a.win.keyboard.press('End');
    await sleep(150);
    assert.equal(await fokusKey(f), keys[keys.length - 1], 'Ende bewegt den Fokus nicht zum letzten Eintrag');
    await a.win.keyboard.press('Home');
    await sleep(150);
    assert.equal(await fokusKey(f), keys[0], 'Pos1 bewegt den Fokus nicht zum ersten Eintrag');
  });
});

test('Liste mit 6.000 Eintraegen hat hoechstens 200 li im DOM und scrollt', LANG, async () => {
  await mitApp(async (f) => {
    await f.evaluate((t) => { document.getElementById('IT').value = t; aiCache = { key: null, spans: [] }; }, GROSSER_TEXT());
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 30000 });
    const n = await f.evaluate(() => fundeList.length);
    assert.ok(n >= 5000, 'Voraussetzung: rund 6.000 Eintraege, berechnet ' + n);
    const dom0 = await f.evaluate(() => document.querySelectorAll('#FUNDELIST li').length);
    assert.ok(dom0 <= 200, 'hoechstens 200 li im DOM erwartet, gefunden ' + dom0);
    const m = await f.evaluate(() => { const b = document.getElementById('FUNDELIST'); return { sh: b.scrollHeight, ch: b.clientHeight, first: document.querySelector('#FUNDELIST li[data-key]').dataset.key }; });
    assert.ok(m.sh > m.ch * 20, 'Liste muss scrollbar sein und die Gesamthoehe aller Eintraege abbilden: ' + JSON.stringify(m));
    await f.evaluate(() => { const b = document.getElementById('FUNDELIST'); b.scrollTop = b.scrollHeight / 2; });
    await f.waitForFunction((k) => { const x = document.querySelector('#FUNDELIST li[data-key]'); return x && x.dataset.key !== k; }, m.first, { timeout: 3000 });
    const dom1 = await f.evaluate(() => document.querySelectorAll('#FUNDELIST li').length);
    assert.ok(dom1 > 0 && dom1 <= 200, 'nach dem Scrollen hoechstens 200 li, gefunden ' + dom1);
    await f.evaluate(() => { const b = document.getElementById('FUNDELIST'); b.scrollTop = b.scrollHeight; });
    const letzter = await f.evaluate(() => fundeList[fundeList.length - 1].key);
    await f.waitForFunction((k) => Array.from(document.querySelectorAll('#FUNDELIST li[data-key]')).some((x) => x.dataset.key === k), letzter, { timeout: 3000 });
    assert.ok((await f.evaluate(() => document.querySelectorAll('#FUNDELIST li').length)) <= 200);
  });
});

test('Liste mit 6.000 Eintraegen: Pfeil auf/ab, Pos1 und Ende bleiben bedienbar', LANG, async () => {
  await mitApp(async (f, a) => {
    await f.evaluate((t) => { document.getElementById('IT').value = t; aiCache = { key: null, spans: [] }; }, GROSSER_TEXT());
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 30000 });
    const keys = await f.evaluate(() => fundeList.map((e) => e.key));
    assert.ok(keys.length >= 5000, 'Voraussetzung: rund 6.000 Eintraege, berechnet ' + keys.length);
    const warteFokus = async (key, msg) => {
      const t0 = Date.now();
      let k = null;
      while (Date.now() - t0 < 3000) { k = await fokusKey(f); if (k === key) return; await sleep(100); }
      assert.fail(msg + ': erwartet ' + key + ', Fokus bei ' + k);
    };
    await f.focus('#FUNDELIST li[data-key] button.fund-jump');
    await warteFokus(keys[0], 'Voraussetzung: Fokus am ersten Eintrag');
    for (let i = 1; i <= 3; i++) await a.win.keyboard.press('ArrowDown');
    await warteFokus(keys[3], 'dreimal Pfeil ab');
    await a.win.keyboard.press('ArrowUp');
    await warteFokus(keys[2], 'Pfeil auf');
    await a.win.keyboard.press('End');
    await warteFokus(keys[keys.length - 1], 'Ende');
    assert.ok((await f.evaluate(() => document.querySelectorAll('#FUNDELIST li').length)) <= 200, 'nach Ende hoechstens 200 li');
    await a.win.keyboard.press('ArrowUp');
    await warteFokus(keys[keys.length - 2], 'Pfeil auf vom Ende');
    await a.win.keyboard.press('Home');
    await warteFokus(keys[0], 'Pos1');
    assert.ok((await f.evaluate(() => document.querySelectorAll('#FUNDELIST li').length)) <= 200, 'nach Pos1 hoechstens 200 li');
  });
});

// ---------------------------------------------------------------------------------------------
// D47 (1): Liste bei offener Leiste auch nach programmatischem Textwechsel neu rechnen
// ---------------------------------------------------------------------------------------------

test('D47-1a loadF bei offener Leiste: Liste zeigt die Funde der neuen Datei', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    assert.ok((await keysIn(f)).includes('NAME|' + ANTON), 'Voraussetzung');
    await f.evaluate(async () => { await loadF(new File(['Frau Doris Neumann schreibt an doris.neumann@beispiel-firma.de.'], 'neu.txt', { type: 'text/plain' })); });
    const k = await warteKeys(f, (x) => x.some((y) => y.startsWith('EMAIL|doris.neumann@')) && !x.includes('NAME|' + ANTON), 'Liste nach loadF nicht neu berechnet', 2500);
    assert.ok(!k.includes('EMAIL|' + MAIL), 'alter Eintrag steht noch in der Liste');
  });
});

test('D47-1b Datei entfernen (FC) bei offener Leiste: Liste und Abzeichen werden leer', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    assert.match(await f.textContent('#FUNDECNT'), /\d/, 'Voraussetzung: Abzeichen zeigt eine Zahl');
    await f.evaluate(() => document.getElementById('FC').click());
    await warteKeys(f, (x) => x.length === 0, 'Liste nach Entfernen der Datei nicht geleert', 2500);
    assert.ok(!(await f.textContent('#FUNDELIST')).includes(ANTON), 'Originalwert steht noch in der Leiste');
    assert.equal(((await f.textContent('#FUNDECNT')) || '').trim(), '', 'Abzeichen nicht geleert');
  });
});

test('D47-1c loadTestDoc bei offener Leiste: Liste zeigt die Funde des Testdokuments', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await f.evaluate(() => loadTestDoc());
    const erw = await erwartungKeys(f, await f.evaluate(() => TEST_DOC));
    assert.ok(erw.length > 5, 'Voraussetzung: Testdokument liefert Funde');
    await warteKeys(f, (x) => JSON.stringify(x.slice().sort()) === JSON.stringify(erw), 'Liste zeigt nach loadTestDoc nicht die Funde des Testdokuments (' + erw.length + ' erwartet)', 2500);
  });
});

test('D47-1d loadTestDocMed bei offener Leiste: Liste zeigt die Funde des Medizin-Testdokuments', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await f.evaluate(() => loadTestDocMed());
    const erw = await erwartungKeys(f, await f.evaluate(() => TEST_DOC_MED));
    assert.ok(erw.length > 5, 'Voraussetzung: Medizin-Testdokument liefert Funde');
    await warteKeys(f, (x) => JSON.stringify(x.slice().sort()) === JSON.stringify(erw), 'Liste zeigt nach loadTestDocMed nicht die Funde des Medizin-Testdokuments (' + erw.length + ' erwartet)', 2500);
  });
});

// ---------------------------------------------------------------------------------------------
// D47 (2): Konfigurationsaenderungen bei offener Leiste sofort neu aufbauen
// ---------------------------------------------------------------------------------------------

test('D47-2a Profilwechsel bei offener Leiste baut die Liste sofort neu auf (IBAN faellt im Profil "medical" weg)', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_KONFIG);
    await oeffneFunde(f);
    assert.ok((await keysIn(f)).some((k) => k.startsWith('IBAN|')), 'Voraussetzung: IBAN-Eintrag im Standardprofil');
    assert.equal(await f.evaluate(() => PSDetect.PROFILES.find((p) => p.id === 'medical').ents.includes('iban')), false, 'Voraussetzung: Profil medical ohne IBAN');
    await f.evaluate(() => document.querySelector('.profile-card[data-pid="medical"]').click());
    await warteKeys(f, (x) => x.length > 0 && !x.some((k) => k.startsWith('IBAN|')), 'Liste nach Profilwechsel nicht neu aufgebaut', 1800);
  });
});

test('D47-2b Entitaet ausschalten bei offener Leiste baut die Liste sofort neu auf', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_KONFIG);
    await oeffneFunde(f);
    assert.ok((await keysIn(f)).includes('EMAIL|' + MAIL), 'Voraussetzung: EMAIL-Eintrag');
    const ok = await f.evaluate(() => {
      if (!document.querySelectorAll('#EL .rule-row').length && typeof initEL === 'function') initEL();
      const rows = document.querySelectorAll('#EL .rule-row');
      const i = ENTS.findIndex((e) => e.id === 'email');
      if (!rows[i]) return false;
      rows[i].click();
      return true;
    });
    assert.ok(ok, 'Voraussetzung: Entitaetenschalter #EL .rule-row fuer email');
    await warteKeys(f, (x) => x.includes('NAME|' + ANTON) && !x.includes('EMAIL|' + MAIL), 'Liste nach Ausschalten der Entitaet nicht neu aufgebaut', 1800);
  });
});

test('D47-2c Manuelle Markierung bei offener Leiste: neuer Eintrag erscheint sofort', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_KONFIG);
    await oeffneFunde(f);
    assert.ok(!(await keysIn(f)).includes('NAME|Rotkehlchen'), 'Voraussetzung');
    await f.evaluate(() => addManualMark('Rotkehlchen', 'NAME'));
    await warteKeys(f, (x) => x.includes('NAME|Rotkehlchen'), 'markierter Wert erscheint nicht in der Liste', 1800);
  });
});

test('D47-2d Eigene Regel bei offener Leiste: Eintrag erscheint sofort; Regelinhalt statt nur Anzahl entscheidet (gleiche Anzahl, anderer Begriff)', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_KONFIG);
    await oeffneFunde(f);
    const ok = await f.evaluate(() => policyAdd({ id: policyNewId('begriffe'), label: 'Begriffe', type: 'list', terms: ['Rotkehlchen'], caseSensitive: false, category: 'EIGEN', profiles: ['*'] }));
    assert.ok(ok, 'Voraussetzung: Regel angenommen');
    await warteKeys(f, (x) => x.some((k) => k.endsWith('|Rotkehlchen')), 'Wert der neuen Regel erscheint nicht in der Liste', 1800);
    // gleiche Zahl aktiver Regeln, anderer Inhalt
    await f.evaluate(() => { policy.rules[0].terms = ['Blaumeise']; policyChanged(); });
    await warteKeys(f, (x) => x.some((k) => k.endsWith('|Blaumeise')) && !x.some((k) => k.endsWith('|Rotkehlchen')), 'Liste folgt dem geaenderten Regelinhalt nicht (Signatur nur nach Anzahl?)', 1800);
  });
});

test('D47-2e Signatur der Funde enthaelt den Regelinhalt (gleiche Regelzahl, anderer Begriff ergibt andere Signatur)', KURZ, async () => {
  await mitApp(async (f) => {
    const r = await f.evaluate(() => {
      policyAdd({ id: policyNewId('begriffe'), label: 'Begriffe', type: 'list', terms: ['Rotkehlchen'], caseSensitive: false, category: 'EIGEN', profiles: ['*'] });
      const a = fundeSig();
      policy.rules[0].terms = ['Blaumeise'];
      const b = fundeSig();
      return { a, b, zahl: policyRuleCount() };
    });
    assert.equal(r.zahl, 1, 'Voraussetzung: genau eine aktive Regel');
    assert.notEqual(r.a, r.b, 'fundeSig() unterscheidet Regeln gleicher Anzahl, aber verschiedenen Inhalts nicht');
  });
});

// ---------------------------------------------------------------------------------------------
// D47 (3): policyFault: kein doppelter Fehler-Toast aus der Funde-Berechnung
// ---------------------------------------------------------------------------------------------

test('D47-3 Bei policyFault ruft die Funde-Berechnung policySpans nicht auf: kein Fehler-Toast "Eigene Regeln fehlerhaft"', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await spyToast(f);
    await f.evaluate(() => policySetFault('Testfehler: gespeicherte Regeln nicht ladbar.'));
    await f.evaluate(() => { window.__toasts.length = 0; });
    await f.evaluate(() => { toggleFunde(false); toggleFunde(true); });
    await sleep(500);
    await f.evaluate(() => { fundeDirty = true; refreshFunde(); });
    await sleep(500);
    await f.evaluate(() => { document.getElementById('IT').value += ' Frau Clara Beispiel.'; fundeTextChanged(); });
    await sleep(900);
    const t = (await toasts(f)).filter((x) => /Eigene Regeln fehlerhaft/.test(x));
    assert.deepEqual(t, [], 'die Berechnung der Funde loest bei policyFault Fehler-Toasts aus (policySpans aufgerufen)');
  });
});

// ---------------------------------------------------------------------------------------------
// D47 (4): #FUNDESTATUS wechselt bei Wiederholung der gleichen Meldung
// ---------------------------------------------------------------------------------------------

test('D47-4 #FUNDESTATUS aendert sich auch bei zweimal gleicher Meldung (Bildschirmleser sprechen sie sonst nicht erneut)', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    const norm = (s) => String(s).replace(/[\s ​]+/g, ' ').trim();
    const roh = () => f.evaluate(() => document.getElementById('FUNDESTATUS').innerHTML);
    const txt = () => f.evaluate(() => document.getElementById('FUNDESTATUS').textContent);
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    const s1 = await roh(), t1 = norm(await txt());
    assert.match(t1, /Freigegeben/, 'Voraussetzung: Statusmeldung nach Freigabe');
    await freigeben(f, 'NAME|' + BERTA, BERTA);
    const s2 = await roh(), t2 = norm(await txt());
    assert.equal(t2, t1, 'Voraussetzung: gleicher sichtbarer Text bei zweiter Freigabe (' + t1 + ' / ' + t2 + ')');
    assert.notEqual(s2, s1, '#FUNDESTATUS ist bei Wiederholung unveraendert: Bildschirmleser melden die zweite Entscheidung nicht');
  });
});

// ---------------------------------------------------------------------------------------------
// D45: Escape, Rueckgabefokus, Ueberlagerung unter 1100 px
// ---------------------------------------------------------------------------------------------

test('D45 Escape schliesst die Leiste, der Fokus kehrt zum oeffnenden Knopf #FUNDEBTN zurueck', KURZ, async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_GRUPPE);
    await f.focus('#FUNDEBTN');
    await a.win.keyboard.press('Enter');
    await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
    assert.ok(await f.isVisible('#FUNDE'), 'Voraussetzung: Leiste per Tastatur geoeffnet');
    await f.focus('#FUNDELIST li[data-key] button.fund-jump');
    assert.ok(await f.evaluate(() => !!document.activeElement.closest('#FUNDE')), 'Voraussetzung: Fokus in der Leiste');
    await a.win.keyboard.press('Escape');
    await sleep(300);
    assert.ok(!(await f.isVisible('#FUNDE')), 'Escape schliesst die Leiste nicht');
    assert.equal(await f.getAttribute('#FUNDEBTN', 'aria-expanded'), 'false', 'aria-expanded am Knopf nach Escape');
    assert.equal(await f.evaluate(() => document.activeElement && document.activeElement.id), 'FUNDEBTN', 'Fokus kehrt nicht zum oeffnenden Knopf zurueck');
  });
});

const groesse = (a, w, h) => a.app.evaluate(({ BrowserWindow }, [bw, bh]) => { BrowserWindow.getAllWindows()[0].setContentSize(bw, bh); }, [w, h]);
const weite = async (f, a, w) => {
  await groesse(a, w, 800);
  await f.waitForFunction((x) => Math.abs(window.innerWidth - x) <= 2, w, { timeout: 4000 });
};

test('D45 Unter 1100 px ueberlagert die Leiste den Inhalt (320 px), ohne ihn zu verschieben und ohne Layoutbruch', KURZ, async () => {
  await mitApp(async (f, a) => {
    await f.evaluate(() => startApp());
    await lade(f, TEXT_GRUPPE);
    await weite(f, a, 1000);
    const messe = () => f.evaluate(() => {
      const r = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), t: Math.round(b.top), b: Math.round(b.bottom) }; };
      const y = Math.min(300, window.innerHeight - 20);
      const hit = document.elementFromPoint(document.documentElement.clientWidth - 30, y);
      return { iw: window.innerWidth, ih: window.innerHeight, it: r('IT'), funde: r('FUNDE'), btn: r('FUNDEBTN'), cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, pad: getComputedStyle(document.body).paddingRight, imLeiste: !!(hit && hit.closest('#FUNDE')) };
    });
    const vorher = await messe();
    assert.ok(vorher.iw < 1100, 'Voraussetzung: Fensterbreite unter 1100 px, ist ' + vorher.iw);
    assert.ok(vorher.it.w > 0, 'Voraussetzung: Eingabefeld #IT sichtbar');
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
    const nachher = await messe();
    assert.ok(Math.abs(nachher.funde.w - 320) <= 1, 'Leiste unter 1100 px muss 320 px breit sein: ' + JSON.stringify(nachher.funde));
    assert.equal(nachher.funde.r, nachher.cw, 'Leiste muss am rechten Rand des Sichtbereichs liegen: ' + JSON.stringify(nachher));
    assert.equal(nachher.it.l, vorher.it.l, 'Inhalt wurde verschoben (links): ' + JSON.stringify({ vorher: vorher.it, nachher: nachher.it }));
    assert.equal(nachher.it.w, vorher.it.w, 'Inhalt wurde gestaucht oder verschoben (Breite): ' + JSON.stringify({ vorher: vorher.it, nachher: nachher.it }));
    assert.ok(nachher.imLeiste, 'die Leiste liegt nicht ueber dem Inhalt (Treffer am rechten Rand ausserhalb der Leiste)');
    assert.ok(nachher.sw <= nachher.cw + 1, 'waagerechter Bildlauf durch die Leiste: scrollWidth ' + nachher.sw + ' > ' + nachher.cw);
    assert.ok(nachher.btn.l >= 0 && nachher.btn.r <= nachher.cw, 'Knopf #FUNDEBTN ragt aus dem Fenster: ' + JSON.stringify(nachher.btn));
    assert.ok(nachher.btn.r <= nachher.funde.l + 1, 'Knopf #FUNDEBTN liegt in der Leiste statt davor: ' + JSON.stringify({ btn: nachher.btn, funde: nachher.funde }));
    assert.equal(nachher.pad, '0px', 'Inhalt darf unter 1100 px keinen Platz fuer die Leiste reservieren: padding-right ' + nachher.pad);
  });
});

test('D45 Ab 1100 px reserviert die Leiste Platz (360 px), der Inhalt rueckt nach links', KURZ, async () => {
  await mitApp(async (f, a) => {
    await f.evaluate(() => startApp());
    await lade(f, TEXT_GRUPPE);
    await weite(f, a, 1400);
    await f.evaluate(() => toggleFunde(true));
    await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
    const r = await f.evaluate(() => ({ pad: getComputedStyle(document.body).paddingRight, w: Math.round(document.getElementById('FUNDE').getBoundingClientRect().width), sw: document.documentElement.scrollWidth, iw: document.documentElement.clientWidth }));
    assert.equal(r.pad, '360px', 'ab 1100 px muss der Inhalt Platz lassen: ' + JSON.stringify(r));
    assert.ok(Math.abs(r.w - 360) <= 1, 'Leiste 360 px breit: ' + JSON.stringify(r));
    assert.ok(r.sw <= r.iw + 1, 'waagerechter Bildlauf: ' + JSON.stringify(r));
  });
});

// ---------------------------------------------------------------------------------------------
// Reparaturzyklus D1.w2: Faelle zu den Pruefermaengeln
// ---------------------------------------------------------------------------------------------

// Kontrastverhaeltnis nach WCAG aus zwei rgb()/rgba()-Zeichenketten (berechnete Farben)
const kontrast = (fg, bg) => {
  const lum = (c) => {
    const m = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
  };
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

test('D1.w2-a Schalter #FUNDEDOUBT gedrueckt behaelt bei Mausberuehrung lesbaren Kontrast (mindestens 4.5)', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_FILTER);
    await oeffneFunde(f);
    await braucht(f, '#FUNDEDOUBT');
    await f.click('#FUNDEDOUBT');
    assert.equal(await f.getAttribute('#FUNDEDOUBT', 'aria-pressed'), 'true', 'Voraussetzung: Schalter gedrueckt');
    await f.hover('#FUNDEDOUBT');
    await sleep(400);
    const c = await f.evaluate(() => { const s = getComputedStyle(document.getElementById('FUNDEDOUBT')); return { fg: s.color, bg: s.backgroundColor }; });
    const v = kontrast(c.fg, c.bg);
    assert.ok(v >= 4.5, 'Kontrast bei Mausberuehrung im gedrueckten Zustand ' + v.toFixed(2) + ' (Schrift ' + c.fg + ' auf ' + c.bg + ')');
  });
});

test('D1.w2-b Gruppenknopf bei aktiver Suche: "alle dieses Typs" wirkt auf alle Eintraege des Typs, sonst heisst er "angezeigten"', LANG, async () => {
  await mitApp(async (f) => {
    const text = Array.from({ length: 700 }, (_, i) => `Kontakt ${i}: person${i}@muster-${i}.de`).join('\n');
    await lade(f, text);
    await oeffneFunde(f);
    // Voraussetzung: alle angezeigten (person7*) und zwei nicht angezeigte (person1, person2) sind freigegeben
    const n = await f.evaluate(() => {
      const w = fundeAll.filter((e) => e.type === 'EMAIL' && (/^person7(\d)?@/.test(e.value) || /^person[12]@/.test(e.value)));
      fundeDecide(w, true);
      return w.length;
    });
    assert.equal(n, 13, 'Voraussetzung: 11 angezeigte plus 2 versteckte freigegeben');
    await f.fill('#FUNDESEARCH', 'person7');
    await warteKeys(f, (x) => x.length === 11, 'Suche "person7" muss genau 11 Eintraege zeigen');
    const r = await f.evaluate(() => {
      const b = Array.from(document.querySelectorAll('#FUNDELIST button')).find((x) => /^alle /i.test(x.textContent.trim()));
      if (!b) return { ok: false };
      const label = b.textContent.trim() + ' | ' + (b.getAttribute('aria-label') || '');
      b.click();
      return { ok: true, label };
    });
    assert.ok(r.ok, 'kein Gruppenknopf gefunden');
    assert.match(r.label, /maskieren/i, 'Voraussetzung: Gruppenknopf maskiert (alle angezeigten sind freigegeben): ' + r.label);
    await sleep(500);
    const rest = await relListe(f);
    const zeigte = (s) => /^EMAIL\|person7(\d)?@/.test(s);
    assert.ok(!rest.some(zeigte), 'angezeigte Werte muessen maskiert sein: ' + JSON.stringify(rest));
    if (/angezeigten/i.test(r.label)) {
      assert.deepEqual(rest.filter((s) => !zeigte(s)).length, 2, 'bei "angezeigten" duerfen versteckte Freigaben bleiben: ' + JSON.stringify(rest));
    } else {
      assert.deepEqual(rest, [], 'Beschriftung "' + r.label + '" verspricht alle Eintraege des Typs, aber es blieben Freigaben: ' + JSON.stringify(rest));
    }
  });
});

test('D1.w2-c Escape im Suchfeld leert zuerst das Feld, ein zweites Escape schliesst die Leiste und der Fokus kehrt zu #FUNDEBTN zurueck', KURZ, async () => {
  await mitApp(async (f, a) => {
    await lade(f, TEXT_GRUPPE);
    await f.focus('#FUNDEBTN');
    await a.win.keyboard.press('Enter');
    await f.waitForSelector('#FUNDELIST li[data-key]', { timeout: 8000 });
    await f.fill('#FUNDESEARCH', 'anton');
    await warteKeys(f, (x) => x.length === 2, 'Suche "anton" muss zwei Eintraege zeigen');
    await f.focus('#FUNDESEARCH');
    await a.win.keyboard.press('Escape');
    await sleep(400);
    assert.equal(await f.inputValue('#FUNDESEARCH'), '', 'erstes Escape muss das Suchfeld leeren');
    assert.ok(await f.isVisible('#FUNDE'), 'erstes Escape darf die Leiste nicht schliessen');
    assert.equal(await f.evaluate(() => document.activeElement && document.activeElement.id), 'FUNDESEARCH', 'Fokus bleibt im Suchfeld');
    await warteKeys(f, (x) => x.length === 3, 'nach dem Leeren muessen wieder alle Eintraege erscheinen');
    await a.win.keyboard.press('Escape');
    await sleep(300);
    assert.ok(!(await f.isVisible('#FUNDE')), 'zweites Escape schliesst die Leiste nicht');
    assert.equal(await f.evaluate(() => document.activeElement && document.activeElement.id), 'FUNDEBTN', 'Fokus kehrt nicht zu #FUNDEBTN zurueck');
  });
});

test('D1.w2-d1 Undo/Redo einer Whitelist-Aenderung stellt den Zustand her', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await f.evaluate(() => { document.getElementById('WLI').value = 'Sonderbegriff'; addWL(); });
    assert.deepEqual(await f.evaluate(() => whitelist.slice()), ['Sonderbegriff']);
    await f.click('#FUNDEUNDO');
    await sleep(300);
    assert.deepEqual(await f.evaluate(() => whitelist.slice()), [], 'Undo stellt die Whitelist nicht her');
    await f.click('#FUNDEREDO');
    await sleep(300);
    assert.deepEqual(await f.evaluate(() => whitelist.slice()), ['Sonderbegriff'], 'Redo stellt die Whitelist nicht her');
  });
});

test('D1.w2-d2 Undo/Redo einer manuellen Markierung stellt den Zustand her', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_KONFIG);
    await oeffneFunde(f);
    const zahl = () => f.evaluate(() => PSLib.marks.toCvars(manualMarks).length);
    assert.equal(await zahl(), 0);
    await f.evaluate(() => addManualMark('Rotkehlchen', 'NAME'));
    assert.equal(await zahl(), 1, 'Voraussetzung: Markierung gesetzt');
    await f.click('#FUNDEUNDO');
    await sleep(300);
    assert.equal(await zahl(), 0, 'Undo nimmt die Markierung nicht zurueck');
    await f.click('#FUNDEREDO');
    await sleep(300);
    assert.equal(await zahl(), 1, 'Redo stellt die Markierung nicht wieder her');
  });
});

test('D1.w2-d3 Verlaufslimit: nach 150 Entscheidungen hoechstens 100 Undo-Schritte', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    const schritte = await f.evaluate(() => {
      const e = fundeAll[0];
      for (let i = 0; i < 150; i++) fundeDecide([e], i % 2 === 0);
      let n = 0;
      while (fundeHist.canUndo() && n < 1000) { fundeStep(false); n++; }
      return n;
    });
    assert.ok(schritte <= 100, 'mehr als 100 Undo-Schritte: ' + schritte);
    assert.ok(schritte >= 50, 'Verlauf ist unerwartet kurz: ' + schritte);
  });
});

test('D1.w2-d4 clearAll setzt den Verlauf zurueck: #FUNDEUNDO und #FUNDEREDO sind danach inaktiv', KURZ, async () => {
  await mitApp(async (f) => {
    await lade(f, TEXT_GRUPPE);
    await oeffneFunde(f);
    await freigeben(f, 'NAME|' + ANTON, ANTON);
    assert.ok(!(await istDeaktiviert(f, '#FUNDEUNDO')), 'Voraussetzung: Undo aktiv');
    await f.evaluate(() => clearAll());
    await sleep(400);
    assert.ok(await istDeaktiviert(f, '#FUNDEUNDO'), '#FUNDEUNDO muss nach clearAll inaktiv sein');
    assert.ok(await istDeaktiviert(f, '#FUNDEREDO'), '#FUNDEREDO muss nach clearAll inaktiv sein');
  });
});
