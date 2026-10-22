// A4.w: Hygiene der Ausgaben (PDF-Metadaten, Download-URL, Zwischenablage-Inventar, Schliessen mit ungespeicherter Zuordnung)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchApp, toolFrame, captureDownloads, getDownloads, setFiles, runAnon, ROOT, sleep } from './helpers.mjs';

const HTML = fs.readFileSync(path.join(ROOT, 'app', 'privacy-shield.html'), 'utf8');

test('PDF-Export: keine Originalnamen, kein Autor, Titel gesetzt', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => startApp());
    const orig = 'Mueller_Zebrafink_Kuendigung';
    await setFiles(f, [{ name: orig + '.txt', mimeType: 'text/plain', buffer: Buffer.from('Hallo Welt aus Datei', 'utf8') }]);
    await f.waitForFunction(() => document.getElementById('IT').value.includes('Hallo Welt'), null, { timeout: 15000 });
    await captureDownloads(f);
    // jsPDF-save() abfangen (liefert die Bytes des PDFs, ohne Dateidialog); Anker-Downloads werden ebenfalls erfasst
    const got = await f.evaluate(async () => {
      const J = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      window.__pdfs = [];
      J.API.save = function (name) {
        const bytes = new Uint8Array(this.output('arraybuffer'));
        let bin = '';
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        window.__pdfs.push({ name, base64: btoa(bin) });
      };
      document.getElementById('RT').value = 'Anonymisierter Beispieltext [PERSON_1] wohnt in [ORT_1].';
      exportPDF();
      return true;
    });
    assert.ok(got);
    await f.waitForFunction(() => window.__pdfs.length > 0 || (window.__dls || []).length > 0, null, { timeout: 10000 });
    const viaSave = await f.evaluate(() => window.__pdfs);
    const dls = viaSave.length ? viaSave : await getDownloads(f);
    const raw = Buffer.from(dls[0].base64, 'base64').toString('latin1');
    assert.ok(raw.startsWith('%PDF'), 'kein PDF');
    assert.equal(raw.includes('Zebrafink'), false, 'Originalname im PDF');
    assert.equal(dls[0].name.includes('Zebrafink'), false, 'Originalname im Dateinamen');
    assert.equal(/\/Author\s*\(\s*[^)\s]/.test(raw), false, 'nichtleerer /Author');
    assert.ok(raw.includes('/Title (Anonymisiertes Dokument)'), '/Title fehlt');
  } finally { await a.close(); }
});

test('dl() gibt die Blob-URL nach __PS_REVOKE_MS frei', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => {
      window.__PS_REVOKE_MS = 200;
      window.__rev = [];
      window.__made = [];
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (b) => { const u = create(b); window.__made.push(u); return u; };
      URL.revokeObjectURL = (u) => { window.__rev.push(u); };
      HTMLAnchorElement.prototype.click = function () {};
      dl('x.txt', 'a', 'text/plain');
    });
    await sleep(600);
    const r = await f.evaluate(() => ({ rev: window.__rev, made: window.__made }));
    assert.equal(r.made.length, 1);
    assert.equal(r.rev.length, 1, 'revokeObjectURL-Aufrufe: ' + r.rev.length);
    assert.equal(r.rev[0], r.made[0]);
  } finally { await a.close(); }
});

test('Zwischenablage-Inventar: writeText nur in copyAIErrorDetails, cpAnon, copyAndOpenAI; copyText( nur in copyAIErrorDetails', () => {
  const funcs = [...HTML.matchAll(/function\s+(\w+)\s*\(/g)].map((m) => ({ name: m[1], at: m.index }));
  const enclosing = (idx) => { let n = null; for (const fn of funcs) if (fn.at < idx) n = fn.name; return n; };
  const where = (re) => [...HTML.matchAll(re)].map((m) => enclosing(m.index));
  assert.deepEqual(where(/\bwriteText\s*\(/g).sort(), ['copyAIErrorDetails', 'copyAndOpenAI', 'cpAnon']);
  assert.deepEqual(where(/\bcopyText\s*\(/g), ['copyAIErrorDetails']);
});

// Fenster per close() schliessen; liefert Zaehler der Dialog-Aufrufe
// Zaehler an globalThis im Hauptprozess (kein require). Die Antwort kommt verzoegert, damit der Test den Zaehler
// vor dem Ende der App lesen kann.
const stubDialog = (app, response) => app.evaluate(({ dialog }, r) => {
  globalThis.__psDlgCount = 0;
  dialog.showMessageBox = async () => { globalThis.__psDlgCount++; await new Promise((ok) => setTimeout(ok, 1500)); return { response: r }; };
}, response);
const dlgCount = (app) => app.evaluate(() => globalThis.__psDlgCount).catch(() => -1);
// wartet bis der Dialog aufgerufen wurde (max. ms); liefert den Zaehler
async function dlgSeen(app, ms = 4000) {
  const t0 = Date.now(); let n = await dlgCount(app);
  while (n < 1 && n !== -1 && Date.now() - t0 < ms) { await sleep(100); n = await dlgCount(app); }
  return n;
}
const closeWin = (app) => app.evaluate(({ BrowserWindow }) => { BrowserWindow.getAllWindows()[0].close(); });
const winCount = (app) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length).catch(() => 0);

async function mitUngespeicherterZuordnung() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => startApp());
  await runAnon(f, 'Herr Hans Mueller wohnt in Berlin, Tel 030 1234567, hans.mueller@example.org');
  assert.equal(await f.evaluate(() => psMapUnsaved()), true, 'psMapUnsaved sollte wahr sein');
  return { a, f };
}

test('Schliessen mit ungespeicherter Zuordnung: Abbrechen (response 0) laesst das Fenster offen', async () => {
  const { a } = await mitUngespeicherterZuordnung();
  try {
    await stubDialog(a.app, 0);
    await closeWin(a.app);
    assert.equal(await dlgSeen(a.app), 1, 'Dialog nicht genau einmal gezeigt');
    await sleep(2500);
    assert.equal(await dlgCount(a.app), 1);
    assert.equal(await winCount(a.app), 1, 'Fenster wurde geschlossen');
  } finally { await a.close(); }
});

test('Schliessen mit ungespeicherter Zuordnung: Trotzdem schliessen (response 1) schliesst', async () => {
  const { a } = await mitUngespeicherterZuordnung();
  try {
    await stubDialog(a.app, 1);
    const closed = a.app.waitForEvent('close', { timeout: 10000 }).then(() => true, () => false);
    await closeWin(a.app).catch(() => {});
    assert.equal(await dlgSeen(a.app), 1, 'Dialog nicht genau einmal gezeigt');
    assert.equal(await closed, true, 'App/Fenster nicht geschlossen');
  } finally { await a.close(); }
});

test('Schliessen nach Speichern der Zuordnung: ohne Dialog', async () => {
  const { a, f } = await mitUngespeicherterZuordnung();
  try {
    await f.evaluate(() => { mapSaved = true; });
    await stubDialog(a.app, 0);
    const closed = a.app.waitForEvent('close', { timeout: 10000 }).then(() => true, () => false);
    await closeWin(a.app).catch(() => {});
    assert.equal(await closed, true, 'App/Fenster nicht geschlossen');
  } finally { await a.close(); }
});
