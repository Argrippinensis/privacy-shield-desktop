// A3.w: Zuordnung speichern/laden als verschluesselte .psmap (Knoepfe btn-map-save, btn-map-load, Dateifeld inp-map-load)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launchApp, toolFrame, captureDownloads, getDownloads, runAnon, setFiles, sleep, stubSaves, setSaveMode, saveLog, waitSaveEnd } from './helpers.mjs';
import { createRequire } from 'node:module';
import { generateDocs } from './eval/generate.mjs';

const psmap = createRequire(import.meta.url)('../app/lib/psmap.js');
const PWFILE = 'korrektes Pferd Batterie';
// Wartebedingung statt fester Schlafzeit: Dialog offen und Eingabe verarbeitet (Hauptschleife ein paar Mal durchlaufen)
const settle = (f) => f.evaluate(() => new Promise((r) => { let n = 0; const t = () => (++n > 30 ? r() : setTimeout(t, 10)); t(); }));
const mkfile = (state) => psmap.encrypt({ v: 1, created: '2026-10-21T00:00:00Z', state, docs: [] }, PWFILE, { iterations: 100000 }).then((u) => Buffer.from(u));
const ent = (o = {}) => Object.assign({ v: 'Müller', t: 'NAME', c: '#f59e0b', m: 'KI' }, o);
const PW = 'korrektes Pferd Batterie';
const docs = generateDocs(2);
const TEXT = docs.map((d) => d.text).join('\n\n');
const frags = [];
for (const d of docs) for (const t of [].concat(d.truth)) for (const f of t.frags) if (f.length >= 5) frags.push(f);
const T = { timeout: 8000 };
const MSG_WRONG = 'Passwort falsch oder Datei beschädigt.';

const storeOf = (f) => f.evaluate(() => JSON.parse(JSON.stringify(store)));
const bodyText = (f) => f.evaluate(() => document.body.innerText);

async function save(f, p1, p2 = p1) {
  await captureDownloads(f);
  await f.click('#btn-map-save', T);
  await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
  await f.fill('#PWD1', p1);
  await f.fill('#PWD2', p2);
  await f.click('#PWOK', T);
}
async function savedFile(f) {
  await f.waitForFunction(() => (window.__dls || []).length > 0, null, { timeout: 15000 });
  const d = (await getDownloads(f)).find((x) => x.name === 'zuordnung.psmap');
  assert.ok(d, 'zuordnung.psmap fehlt');
  return d;
}
async function clear(f) {
  await f.evaluate(() => { window.confirm = () => true; clrMap(); });
  assert.deepEqual(await storeOf(f), {});
}
async function load(f, name, buffer, pw) {
  await f.setInputFiles('#inp-map-load', [{ name, mimeType: 'application/octet-stream', buffer }]);
  if (pw !== undefined) {
    await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
    await f.fill('#PWD1', pw);
    await f.click('#PWOK', T);
  }
}

test('A3.w: speichern, leeren, laden, deanon stellt Original exakt wieder her', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const { out, store: before } = await runAnon(f, TEXT);
    assert.ok(Object.keys(before).length > 0);
    await save(f, PW);
    const d = await savedFile(f);
    const bytes = Buffer.from(d.base64, 'base64');
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'PSM1');
    const latin = bytes.toString('latin1');
    const utf = bytes.toString('utf8');
    for (const fr of frags) assert.equal(utf.includes(fr) || latin.includes(fr), false, 'Klartextfragment in .psmap');
    await clear(f);
    await load(f, 'zuordnung.psmap', bytes, PW);
    await f.waitForFunction(() => Object.keys(store).length > 0, null, { timeout: 15000 });
    assert.deepEqual(await storeOf(f), before);
    const back = await f.evaluate(async (o) => {
      document.getElementById('AR').value = o;
      deanon();
      return document.getElementById('RT').value;
    }, out);
    assert.equal(back, TEXT);
  } finally { await a.close(); }
});

test('A3.w: falsches Passwort zeigt Fehlermeldung und laesst store unveraendert', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await save(f, PW);
    const bytes = Buffer.from((await savedFile(f)).base64, 'base64');
    await clear(f);
    await load(f, 'zuordnung.psmap', bytes, 'ganz anderes Passwort');
    await f.waitForFunction((m) => document.body.innerText.includes(m), MSG_WRONG, { timeout: 15000 });
    assert.deepEqual(await storeOf(f), {});
  } finally { await a.close(); }
});

test('A3.w: Altformat .csv laedt weiterhin', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const csv = 'Variable,Originalwert,Typ,Methode\n"{{NAME_1}}","Müller","NAME","KI"\n';
    await load(f, 'privacyshield_mapping.csv', Buffer.from(csv, 'utf8'));
    await f.waitForFunction(() => Object.keys(store).length > 0, null, { timeout: 8000 });
    const s = await storeOf(f);
    assert.equal(s['{{NAME_1}}'].v, 'Müller');
  } finally { await a.close(); }
});

test('A3.w: zu kurzes Passwort speichert nicht', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await save(f, 'kurz9abcd');
    await settle(f);
    assert.equal((await getDownloads(f)).length, 0);
    assert.equal(await f.isVisible('#PWDLG'), true, 'Dialog bleibt offen');
  } finally { await a.close(); }
});

test('A3.w: ungleiche Wiederholung speichert nicht', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await save(f, PW, PW + 'x');
    await settle(f);
    assert.equal((await getDownloads(f)).length, 0);
    assert.equal(await f.isVisible('#PWDLG'), true, 'Dialog bleibt offen');
  } finally { await a.close(); }
});

test('A3.w: Abbrechen schliesst Dialog ohne Download', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await captureDownloads(f);
    await f.click('#btn-map-save', T);
    await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
    assert.equal(await f.getAttribute('#PWDLG', 'role'), 'dialog');
    assert.equal(await f.getAttribute('#PWDLG', 'aria-modal'), 'true');
    assert.ok((await bodyText(f)).includes('Ohne dieses Passwort kann die Zuordnung nicht wiederhergestellt werden.'));
    await f.click('#PWCANCEL', T);
    assert.equal(await f.isVisible('#PWDLG'), false);
    assert.equal((await getDownloads(f)).length, 0);
  } finally { await a.close(); }
});

test('A3.w: mapSaved und psMapUnsaved()', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    assert.equal(await f.evaluate(() => [mapSaved, psMapUnsaved()]).then((x) => x.join()), 'false,true');
    await save(f, PW);
    await savedFile(f);
    await f.waitForFunction(() => mapSaved === true, null, { timeout: 5000 });
    assert.equal(await f.evaluate(() => psMapUnsaved()), false);
    await runAnon(f, TEXT);
    assert.equal(await f.evaluate(() => mapSaved), false);
  } finally { await a.close(); }
});

async function loadInto(state, mutate) {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    const before = await storeOf(f);
    await f.evaluate(() => { window.__xss = 0; });
    await load(f, 'x.psmap', await mkfile(state), PWFILE);
    await settle(f); await settle(f); await settle(f);
    await new Promise((r) => setTimeout(r, 1500));
    return await mutate(f, before);
  } finally { await a.close(); }
}

test('A3.w Pruefer: Farbe mit HTML-Einschleusung fuehrt nichts aus', async () => {
  await loadInto({ store: { '{{NAME_1}}': ent({ c: 'x"><img src=x onerror="window.__xss=1">' }) }, cnt: { NAME: 1 } }, async (f) => {
    assert.equal(await f.evaluate(() => window.__xss), 0);
    assert.equal(await f.evaluate(() => document.getElementById('MT').innerHTML.includes('<img')), false);
  });
});

for (const [name, state] of [
  ['v: 5', { v: 5, store: { '{{NAME_1}}': ent() }, cnt: {} }],
  ['store als Array', { store: [ent()], cnt: {} }],
]) {
  test('A3.w Pruefer: ungueltige Struktur (' + name + ') laesst store unveraendert', async () => {
    await loadInto(state, async (f, before) => {
      assert.deepEqual(await storeOf(f), before);
      assert.ok((await bodyText(f)).length > 0);
    });
  });
}

for (const key of ['', 'Herr', '__proto__']) {
  test('A3.w Pruefer: Schluessel ' + JSON.stringify(key) + ' wird abgelehnt', async () => {
    const store = JSON.parse('{' + JSON.stringify(key) + ':' + JSON.stringify(ent()) + '}');
    await loadInto({ store, cnt: {} }, async (f, before) => {
      assert.deepEqual(await storeOf(f), before);
    });
  });
}

test('A3.w Pruefer: falsches Passwort bei nicht leerem store laesst ihn unveraendert', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    const before = await storeOf(f);
    await load(f, 'x.psmap', await mkfile({ store: { '{{NAME_1}}': ent() }, cnt: {} }), 'ganz anderes Passwort');
    await f.waitForFunction((m) => document.body.innerText.includes(m), MSG_WRONG, { timeout: 15000 });
    assert.deepEqual(await storeOf(f), before);
  } finally { await a.close(); }
});

test('A3.w Pruefer: CSV mit 0 Zeilen laesst psMapUnsaved() wahr', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await load(f, 'leer.csv', Buffer.from('Variable,Originalwert,Typ,Methode\n', 'utf8'));
    await settle(f); await settle(f);
    assert.equal(await f.evaluate(() => psMapUnsaved()), true);
  } finally { await a.close(); }
});

test('A3.w Pruefer: CSV-Import bei ungespeichertem store: psMapUnsaved() bleibt wahr', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    await load(f, 'a.csv', Buffer.from('Variable,Originalwert,Typ,Methode\n"{{NAME_99}}","Zed","NAME","KI"\n', 'utf8'));
    await f.waitForFunction(() => '{{NAME_99}}' in store, null, { timeout: 8000 });
    assert.equal(await f.evaluate(() => psMapUnsaved()), true);
  } finally { await a.close(); }
});

test('A3.w Pruefer: Abbrechen direkt nach OK ersetzt store nicht', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, TEXT);
    const before = await storeOf(f);
    // Schluesselableitung kuenstlich verlangsamen: Abbrechen kommt sonst auf schnellen Rechnern nach dem Ende der
    // Ableitung (Wettlauf, in der CI schwankend). So liegt Abbrechen immer vor dem Ergebnis.
    await f.evaluate(() => {
      const orig = crypto.subtle.deriveKey.bind(crypto.subtle);
      crypto.subtle.deriveKey = async (...a) => { await new Promise((r) => setTimeout(r, 2500)); return orig(...a); };
    });
    await f.setInputFiles('#inp-map-load', [{ name: 'x.psmap', mimeType: 'application/octet-stream', buffer: await mkfile({ store: { '{{NAME_1}}': ent() }, cnt: {} }) }]);
    await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
    await f.fill('#PWD1', PWFILE);
    await f.click('#PWOK', T);
    await f.click('#PWCANCEL', { timeout: 2000, force: true }).catch(() => f.keyboard.press('Escape'));
    await new Promise((r) => setTimeout(r, 4000));
    assert.deepEqual(await storeOf(f), before);
  } finally { await a.close(); }
});

// ---------------------------------------------------------------------------
// K4.fix (rot bis zur Umsetzung): "Zuordnung gespeichert" erst nach BESTAETIGTEM Schreiben.
// Der Ausgang des Speicherns wird im Hauptprozess festgelegt (helpers.stubSaves: Abbruch, Schreibfehler, Erfolg), und
// zwar fuer beide denkbaren Wege (Blob-Download und Kanal save-file); die Seite wird dabei nicht veraendert und
// captureDownloads wird NICHT benutzt (sonst gaebe es nie ein echtes Schreiben). Nur synthetische Werte.
// ---------------------------------------------------------------------------
const K4_D1 = 'Kontakt: anna.beispiel@example.invalid.';
const K4_D2 = 'Kontakt: ben.beispiel@example.invalid.';
const K4_TEXT2 = 'Kontakt: carla.beispiel@example.invalid, Tel 030 7654321.';
const txtFile = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text, 'utf8') });
const toastOf = (f) => f.evaluate(() => document.getElementById('TT').textContent);
const unsavedOf = (f) => f.evaluate(() => [mapSaved, psMapUnsaved()]);

async function k4Mit(mode, fn, opts = {}) {
  const a = await launchApp({ offline: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-k4-'));
  fs.writeFileSync(dir + '.blocker', 'x'); // Zielpfade unterhalb einer Datei: Schreibfehler (Modus 'error')
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => startApp());
    await stubSaves(a.app, { mode, dir, ...opts });
    await fn({ a, f, dir });
  } finally {
    await a.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
// wartet auf den naechsten beendeten Speichervorgang (zaehlt bereits beendete mit)
const k4Ended = async (a) => (await saveLog(a.app)).filter((x) => x.state !== 'waiting').length;
const filesIn = (dir) => fs.readdirSync(dir).sort();

// .psmap ueber den echten Speicherweg (kein captureDownloads)
async function k4SavePsmap(f, a, { pw = PW, wait = true } = {}) {
  await f.evaluate(() => psMapSave());
  await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 5000 });
  await f.fill('#PWD1', pw);
  await f.fill('#PWD2', pw);
  const had = await k4Ended(a);
  await f.click('#PWOK', T);
  if (wait) { await waitSaveEnd(a.app, had + 1); await sleep(1200); }
}
// Projekt mit zwei Dokumenten laden und anonymisieren
async function k4Projekt(f) {
  await setFiles(f, [txtFile('a.txt', K4_D1), txtFile('b.txt', K4_D2)]);
  await f.waitForFunction(() => document.querySelectorAll('#PRJPANEL button.prj-item').length === 2, null, { timeout: 20000 });
  await f.click('#PRJRUN');
  await f.waitForFunction(() => [...document.querySelectorAll('#PRJPANEL button.prj-item')].every((e) => /fertig/i.test(e.textContent)) && !prjBusy, null, { timeout: 60000 });
}
async function k4SaveZip(f, a, { mitZuordnung = true, pw = PW } = {}) {
  if (!mitZuordnung) {
    await f.evaluate(() => { document.getElementById('PRJMAP').checked = false; prjZip(); });
  } else {
    await f.evaluate(() => { document.getElementById('PRJMAP').checked = true; prjZip(); });
    await f.waitForSelector('#PWDLG', { state: 'visible', timeout: 10000 });
    await f.fill('#PWD1', pw);
    await f.fill('#PWD2', pw);
    await f.click('#PWOK', T);
  }
  await waitSaveEnd(a.app, 1, 30000);
  await sleep(1200);
}
async function k4Csv(f, a) {
  const had = await k4Ended(a);
  await f.evaluate(() => { window.confirm = () => true; expMap(); });
  await waitSaveEnd(a.app, had + 1);
  await sleep(1200);
}
function k4NichtGespeichert(t, unsaved) {
  assert.match(t, /nicht gespeichert/i, 'Toast muss "nicht gespeichert" melden, war: ' + JSON.stringify(t));
  assert.doesNotMatch(t, /verschlüsselt gespeichert|als ZIP gespeichert|exportiert/i, 'Erfolgsmeldung trotz Fehlschlag: ' + JSON.stringify(t));
  assert.deepEqual(unsaved, [false, true], 'mapSaved/psMapUnsaved() muessen false/true bleiben');
}

test('K4.fix: .psmap, Download abgebrochen: Toast "nicht gespeichert", mapSaved bleibt falsch', async () => {
  await k4Mit('cancel', async ({ a, f, dir }) => {
    await runAnon(f, K4_D1);
    assert.deepEqual(await unsavedOf(f), [false, true]);
    await k4SavePsmap(f, a);
    assert.equal((await saveLog(a.app))[0].state, 'cancelled', 'Testaufbau: Speichern muss abgebrochen sein');
    assert.deepEqual(filesIn(dir), []);
    k4NichtGespeichert(await toastOf(f), await unsavedOf(f));
  });
});

test('K4.fix: .psmap, Schreibfehler (Ziel nicht beschreibbar): Toast "nicht gespeichert", mapSaved bleibt falsch', async () => {
  await k4Mit('error', async ({ a, f, dir }) => {
    await runAnon(f, K4_D1);
    await k4SavePsmap(f, a);
    assert.equal((await saveLog(a.app))[0].state, 'failed', 'Testaufbau: Schreiben muss scheitern');
    assert.deepEqual(filesIn(dir), []);
    k4NichtGespeichert(await toastOf(f), await unsavedOf(f));
  });
});

test('K4.fix: .psmap, bestaetigtes Schreiben (Kontrolle): Datei liegt vor, Passwort oeffnet sie, gespeichert', async () => {
  await k4Mit('ok', async ({ a, f, dir }) => {
    const { store: before } = await runAnon(f, K4_D1);
    await k4SavePsmap(f, a);
    assert.deepEqual(filesIn(dir), ['zuordnung.psmap']);
    const bytes = fs.readFileSync(path.join(dir, 'zuordnung.psmap'));
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'PSM1');
    const p = await psmap.decrypt(new Uint8Array(bytes), PW);
    assert.deepEqual(p.state.store, before);
    const t = await toastOf(f);
    assert.match(t, /gespeichert/i);
    assert.doesNotMatch(t, /nicht gespeichert/i);
    assert.deepEqual(await unsavedOf(f), [true, false]);
  });
});

test('K4.fix: .psmap, erst abgebrochen, dann erfolgreich erneut gespeichert: danach gespeichert', async () => {
  await k4Mit('cancel', async ({ a, f, dir }) => {
    await runAnon(f, K4_D1);
    await k4SavePsmap(f, a);
    assert.deepEqual(await unsavedOf(f), [false, true]);
    await setSaveMode(a.app, 'ok');
    await f.evaluate(() => { if (document.getElementById('PWDLG').style.display === 'flex') psPwClose(); });
    await k4SavePsmap(f, a);
    assert.deepEqual(filesIn(dir), ['zuordnung.psmap']);
    assert.deepEqual(await unsavedOf(f), [true, false]);
  });
});

test('K4.fix: ZIP mit Zuordnung, Download abgebrochen: Toast "nicht gespeichert", Zuordnung bleibt ungespeichert', async () => {
  await k4Mit('cancel', async ({ a, f, dir }) => {
    await k4Projekt(f);
    await k4SaveZip(f, a);
    assert.equal((await saveLog(a.app))[0].state, 'cancelled', 'Testaufbau: Speichern muss abgebrochen sein');
    assert.deepEqual(filesIn(dir), []);
    k4NichtGespeichert(await toastOf(f), await unsavedOf(f));
  });
});

test('K4.fix: ZIP mit Zuordnung, Schreibfehler: Toast "nicht gespeichert", Zuordnung bleibt ungespeichert', async () => {
  await k4Mit('error', async ({ a, f }) => {
    await k4Projekt(f);
    await k4SaveZip(f, a);
    assert.equal((await saveLog(a.app))[0].state, 'failed', 'Testaufbau: Schreiben muss scheitern');
    k4NichtGespeichert(await toastOf(f), await unsavedOf(f));
  });
});

test('K4.fix: ZIP ohne Zuordnung, Download abgebrochen: Toast "nicht gespeichert" statt "als ZIP gespeichert"', async () => {
  await k4Mit('cancel', async ({ a, f }) => {
    await k4Projekt(f);
    await k4SaveZip(f, a, { mitZuordnung: false });
    const t = await toastOf(f);
    assert.match(t, /nicht gespeichert/i, 'war: ' + JSON.stringify(t));
    assert.doesNotMatch(t, /als ZIP gespeichert/i);
    assert.equal(await f.evaluate(() => psMapUnsaved()), true);
  });
});

test('K4.fix: ZIP mit Zuordnung, bestaetigtes Schreiben (Kontrolle): ZIP liegt vor, Zuordnung gilt als gespeichert', async () => {
  await k4Mit('ok', async ({ a, f, dir }) => {
    await k4Projekt(f);
    await k4SaveZip(f, a);
    assert.deepEqual(filesIn(dir), ['anonymisiert.zip']);
    assert.equal(fs.readFileSync(path.join(dir, 'anonymisiert.zip')).subarray(0, 2).toString('latin1'), 'PK');
    const t = await toastOf(f);
    assert.match(t, /ZIP gespeichert/i);
    assert.doesNotMatch(t, /nicht gespeichert/i);
    assert.deepEqual(await unsavedOf(f), [true, false]);
  });
});

test('K4.fix: CSV, Download abgebrochen: Toast "nicht gespeichert", mapSaved bleibt falsch', async () => {
  await k4Mit('cancel', async ({ a, f, dir }) => {
    await runAnon(f, K4_D1);
    await k4Csv(f, a);
    assert.equal((await saveLog(a.app))[0].state, 'cancelled', 'Testaufbau: Speichern muss abgebrochen sein');
    assert.deepEqual(filesIn(dir), []);
    k4NichtGespeichert(await toastOf(f), await unsavedOf(f));
  });
});

test('K4.fix: CSV, Schreibfehler: Toast "nicht gespeichert", mapSaved bleibt falsch', async () => {
  await k4Mit('error', async ({ a, f }) => {
    await runAnon(f, K4_D1);
    await k4Csv(f, a);
    assert.equal((await saveLog(a.app))[0].state, 'failed', 'Testaufbau: Schreiben muss scheitern');
    k4NichtGespeichert(await toastOf(f), await unsavedOf(f));
  });
});

test('K4.fix: CSV, bestaetigtes Schreiben (Kontrolle): Datei liegt vor, gespeichert', async () => {
  await k4Mit('ok', async ({ a, f, dir }) => {
    await runAnon(f, K4_D1);
    await k4Csv(f, a);
    assert.deepEqual(filesIn(dir), ['privacyshield_mapping.csv']);
    assert.match(fs.readFileSync(path.join(dir, 'privacyshield_mapping.csv'), 'utf8'), /^Variable,Originalwert,Typ,Methode\n/);
    const t = await toastOf(f);
    assert.match(t, /exportiert/i);
    assert.doesNotMatch(t, /nicht gespeichert/i);
    assert.deepEqual(await unsavedOf(f), [true, false]);
  });
});

// --- Merker an die Zustandsrevision binden (aus K1.fix: Ergebnisse/Zuordnung aendern sich -> wieder ungespeichert) ---

test('K4.fix: Aenderung der Ergebnisse waehrend der Verschluesselung: bestaetigtes Schreiben markiert die neue Zuordnung nicht als gespeichert', async () => {
  await k4Mit('ok', async ({ a, f }) => {
    await runAnon(f, K4_D1);
    // Schluesselableitung verlangsamen, damit der neue Lauf sicher VOR dem Schreiben liegt
    await f.evaluate(() => {
      const orig = crypto.subtle.deriveKey.bind(crypto.subtle);
      crypto.subtle.deriveKey = async (...x) => { await new Promise((r) => setTimeout(r, 2500)); return orig(...x); };
    });
    await k4SavePsmap(f, a, { wait: false });
    await sleep(300);
    await runAnon(f, K4_TEXT2); // Zuordnung aendert sich, die Datei enthaelt noch den alten Stand
    await waitSaveEnd(a.app, 1, 12000).catch(() => {}); // eine Umsetzung darf das Schreiben auch ganz abbrechen
    await sleep(1500);
    assert.equal(await f.evaluate(() => psMapUnsaved()), true, 'neuer Stand der Zuordnung gilt als gespeichert');
  });
});

test('K4.fix: Aenderung der Ergebnisse waehrend das Schreiben noch aussteht: Merker bleibt falsch', async () => {
  await k4Mit('ok', async ({ a, f }) => {
    await runAnon(f, K4_D1);
    await k4SavePsmap(f, a, { wait: false });
    // wartet, bis der Speichervorgang begonnen hat (Dialog-Weg: Zustand 'waiting'; Download-Weg: sofort fertig)
    const t0 = Date.now();
    while ((await saveLog(a.app)).length < 1 && Date.now() - t0 < 20000) await sleep(100);
    await runAnon(f, K4_TEXT2);
    await waitSaveEnd(a.app, 1, 12000).catch(() => {});
    await sleep(2500);
    assert.equal(await f.evaluate(() => psMapUnsaved()), true, 'neuer Stand der Zuordnung gilt als gespeichert');
  }, { delayMs: 2000 });
});

test('K4.fix: nach bestaetigtem Speichern ein Dokument aus dem Projekt entfernen: Zuordnung gilt wieder als ungespeichert', async () => {
  await k4Mit('ok', async ({ a, f }) => {
    await k4Projekt(f);
    await k4SavePsmap(f, a);
    assert.deepEqual(await unsavedOf(f), [true, false], 'Testaufbau: erst gespeichert');
    await f.evaluate(() => prjDel(prj.docs[1].id));
    await sleep(500);
    assert.equal(await f.evaluate(() => psMapUnsaved()), true, 'Zuordnung hat sich geaendert, gilt aber als gespeichert');
  });
});

test('K4.fix: nach bestaetigtem Speichern neuer Projektlauf: Zuordnung gilt wieder als ungespeichert', async () => {
  await k4Mit('ok', async ({ a, f }) => {
    await k4Projekt(f);
    await k4SavePsmap(f, a);
    assert.deepEqual(await unsavedOf(f), [true, false], 'Testaufbau: erst gespeichert');
    await f.click('#PRJRUN');
    await f.waitForFunction(() => !prjBusy && [...document.querySelectorAll('#PRJPANEL button.prj-item')].every((e) => /fertig/i.test(e.textContent)), null, { timeout: 60000 });
    assert.equal(await f.evaluate(() => psMapUnsaved()), true);
  });
});
