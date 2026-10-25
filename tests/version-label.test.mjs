// X1footer (D63): Die Version wird nur in package.json gepflegt; Fusszeile und Berichte des Werkzeugs zeigen sie an.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchApp, toolFrame, captureDownloads, getDownloads, runAnon, ROOT } from './helpers.mjs';

const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const TOOL_HTML = fs.readFileSync(path.join(ROOT, 'app', 'privacy-shield.html'), 'utf8');

test('Fusszeile des Werkzeugs zeigt v<Version aus package.json>, ohne feste Altwerte', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const sel = 'button[title="Nach Updates suchen"]';
    await f.waitForSelector(sel, { state: 'attached', timeout: 10000 });
    // Die Hülle antwortet asynchron: warten, bis die Anzeige die erwartete Version erreicht (oder die Frist ablaeuft)
    await f.waitForFunction(([s, v]) => { const b = document.querySelector(s); return b && b.textContent.trim() === 'v' + v; }, [sel, VERSION], { timeout: 10000 }).catch(() => {});
    const r = await f.evaluate((s) => { const b = document.querySelector(s); return { knopf: b.textContent.trim(), zeile: b.parentElement.textContent.replace(/\s+/g, ' ').trim() }; }, sel);
    assert.equal(r.knopf, 'v' + VERSION, 'Knopftext der Fusszeile: ' + r.knopf);
    assert.equal(r.zeile.includes('1.6.1'), false, 'feste Altversion 1.6.1 in der Fusszeile: ' + r.zeile);
    assert.equal(r.zeile.includes('13.06.2026'), false, 'festes Datum in der Fusszeile: ' + r.zeile);
    assert.ok(r.zeile.includes('privacyshield'), 'Fusszeile muss "privacyshield" behalten: ' + r.zeile);
  } finally { await a.close(); }
});

test('Erzeugter Bericht traegt die Version aus package.json (appVersion)', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await runAnon(f, 'Thomas Müller wohnt in Berlin. Kontakt: thomas.mueller@example.com');
    await captureDownloads(f);
    await f.click('#btn-report', { timeout: 5000 });
    await f.waitForFunction(() => (window.__dls || []).length > 0, null, { timeout: 5000 });
    const d = (await getDownloads(f)).find((x) => x.name === 'bericht.txt');
    assert.ok(d, 'bericht.txt fehlt');
    const text = Buffer.from(d.base64, 'base64').toString('utf8');
    assert.ok(text.includes('Programm: PrivacyShield ' + VERSION + '\n') || text.includes('Programm: PrivacyShield ' + VERSION + '\r\n'), 'Programmzeile ohne Version ' + VERSION + ': ' + text.split('\n').find((l) => l.startsWith('Programm:')));
  } finally { await a.close(); }
});

test('privacy-shield.html enthaelt keine feste APP_VERSION-Zeichenkette mehr', () => {
  assert.equal(/APP_VERSION\s*=\s*["']\d+\.\d+\.\d+/.test(TOOL_HTML), false, 'feste Version APP_VERSION = "x.y.z" gefunden');
});
