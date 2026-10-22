// B1.fix: Mehrfachauswahl und Drop-Zone (E2E). Mehrere Dateien: ein ZIP mit neutralen Namen, vorher ein Hinweis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, captureDownloads, getDownloads, setFiles } from './helpers.mjs';
import { loadVendor } from './unit/_load.mjs';

const JSZip = loadVendor('jszip');
const HINT = /Mehrere Dateien werden einzeln verarbeitet/;
const FILES = [
  { name: 'Müller_Hans.txt', text: 'Herr Hans Müller, max@firma.de' },
  { name: 'Weber_Anna.txt', text: 'Frau Anna Weber' },
];
const FORBIDDEN = ['Müller', 'Weber', 'Hans', 'Anna', 'max@firma.de'];

// Alle Aufrufe von toast() mitschreiben (die Meldung wird sonst von Folgemeldungen ueberschrieben)
function recordToasts(f) {
  return f.evaluate(() => {
    window.__toasts = [];
    const orig = window.toast;
    window.toast = function (msg, type) { window.__toasts.push({ msg: String(msg), type }); return orig.apply(this, arguments); };
  });
}
const getToasts = (f) => f.evaluate(() => window.__toasts);

async function prepare() {
  const a = await launchApp({ offline: true });
  const f = await toolFrame(a.win);
  await f.evaluate(() => startApp());
  await captureDownloads(f);
  await recordToasts(f);
  return { a, f };
}

async function waitDownload(f, timeout = 30000) {
  await f.waitForFunction(() => (window.__dls || []).length >= 1, null, { timeout });
}

async function checkZip(f) {
  const d = await getDownloads(f);
  assert.equal(d.length, 1, 'genau ein Download');
  assert.equal(d[0].name, 'anonymisiert.zip');
  const zip = await JSZip.loadAsync(Buffer.from(d[0].base64, 'base64'));
  const names = Object.keys(zip.files).sort();
  assert.deepEqual(names, ['anonymisiert_001.txt', 'anonymisiert_002.txt']);
  for (const n of names) {
    const content = await zip.file(n).async('string');
    for (const w of FORBIDDEN) {
      assert.ok(!n.includes(w), `Eintragsname ${n} enthaelt ${w}`);
      assert.ok(!content.includes(w), `Inhalt von ${n} enthaelt ${w}`);
    }
  }
}

test('Mehrfachauswahl ueber #FI: ein Download anonymisiert.zip mit neutralen Eintragsnamen ohne Klartext und Hinweis vorab', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, FILES.map((x) => ({ name: x.name, mimeType: 'text/plain', buffer: Buffer.from(x.text, 'utf8') })));
    await waitDownload(f);
    await checkZip(f);
    const t = await getToasts(f);
    const hint = t.find((x) => HINT.test(x.msg));
    assert.ok(hint, 'Hinweis fehlt');
    assert.equal(hint.type, 'e');
    assert.match(hint.msg, /Zuordnung zum Zurückübersetzen bleibt nur für die zuletzt verarbeitete Datei erhalten/);
    assert.ok(t.indexOf(hint) < t.findIndex((x) => /ZIP exportiert/.test(x.msg)), 'Hinweis muss vor dem Ergebnis erscheinen');
  } finally { await a.close(); }
});

test('Mehrfachauswahl ueber die Drop-Zone #DZ: derselbe Download, beide Dateien verarbeitet', async () => {
  const { a, f } = await prepare();
  try {
    await f.evaluate((files) => {
      const dt = new DataTransfer();
      for (const x of files) dt.items.add(new File([x.text], x.name, { type: 'text/plain' }));
      document.getElementById('DZ').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
    }, FILES);
    await waitDownload(f);
    await checkZip(f);
    assert.ok((await getToasts(f)).some((x) => HINT.test(x.msg)), 'Hinweis fehlt');
  } finally { await a.close(); }
});

test('Einzeldatei: kein Download, #IT enthaelt den Text, kein Hinweis', async () => {
  const { a, f } = await prepare();
  try {
    await setFiles(f, [{ name: 'eins.txt', mimeType: 'text/plain', buffer: Buffer.from('Einzelne Datei Inhalt', 'utf8') }]);
    await f.waitForFunction(() => document.getElementById('IT').value.includes('Einzelne Datei Inhalt'), null, { timeout: 15000 });
    await a.win.waitForTimeout(1500);
    assert.equal((await getDownloads(f)).length, 0);
    assert.ok(!(await getToasts(f)).some((x) => HINT.test(x.msg)), 'kein Hinweis bei einer Datei');
  } finally { await a.close(); }
});
