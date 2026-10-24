// D3: Info-Dialog der Hülle (Version, Modell/Installation, Diagnose, Lizenzen, Updates, Impressum/Datenschutz).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchApp, toolFrame, setFiles, makeAppVariant, ROOT } from './helpers.mjs';

const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const MODEL_REL = 'models/Xenova/distilbert-base-multilingual-cased-ner-hrl/onnx/model_quantized.onnx';
const SECRET = 'Vertraulicher Text von Thomas Müller';
const TRUSTED = 'app://ps/index.html';
const EVIL = 'https://evil.example/';

const dialogOffen = (win) => win.evaluate(() => {
  const d = document.getElementById('info-dialog');
  if (!d) return false;
  const cs = getComputedStyle(d);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && d.getBoundingClientRect().width > 0 && (!('open' in d) || d.tagName !== 'DIALOG' || d.open);
});
const dialogText = (win) => win.evaluate(() => document.getElementById('info-dialog').textContent);
const fokusId = (win) => win.evaluate(() => document.activeElement && document.activeElement.id);

async function oeffnen(a) {
  await toolFrame(a.win);
  await a.win.click('#btn-info');
  await a.win.waitForFunction(() => { const d = document.getElementById('info-dialog'); return d && d.getBoundingClientRect().width > 0; }, null, { timeout: 10000 });
}

// Kanal im Hauptprozess über den Testhaken (F2.h) aufrufen
function invoke(a, channel, senderFrame) {
  return a.app.evaluate(async (_, { channel, senderFrame }) => {
    if (!globalThis.__psIpc) return { ok: false, err: 'kein Testhaken __psIpc' };
    try {
      const r = await globalThis.__psIpc.invoke(channel, { senderFrame });
      return { ok: true, result: r === undefined ? null : JSON.parse(JSON.stringify(r)) };
    } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
  }, { channel, senderFrame });
}

test('Info-Dialog öffnet per Mausklick auf #btn-info mit passenden ARIA-Merkmalen', async () => {
  const a = await launchApp({ offline: true });
  try {
    await toolFrame(a.win);
    assert.equal(await dialogOffen(a.win), false, 'Dialog darf anfangs nicht sichtbar sein');
    await a.win.click('#btn-info');
    await a.win.waitForTimeout(300);
    assert.equal(await dialogOffen(a.win), true);
    const aria = await a.win.evaluate(() => { const d = document.getElementById('info-dialog'); return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), lb: d.getAttribute('aria-labelledby') }; });
    assert.equal(aria.role, 'dialog');
    assert.equal(aria.modal, 'true');
    assert.ok(aria.lb && await a.win.evaluate((id) => !!document.getElementById(id), aria.lb), 'aria-labelledby muss auf ein vorhandenes Element zeigen');
  } finally { await a.close(); }
});

test('Info-Dialog öffnet per Tastatur (Fokus auf #btn-info, Enter)', async () => {
  const a = await launchApp({ offline: true });
  try {
    await toolFrame(a.win);
    await a.win.focus('#btn-info');
    await a.win.keyboard.press('Enter');
    await a.win.waitForTimeout(300);
    assert.equal(await dialogOffen(a.win), true);
  } finally { await a.close(); }
});

test('Esc schließt den Info-Dialog und der Fokus liegt wieder auf #btn-info', async () => {
  const a = await launchApp({ offline: true });
  try {
    await oeffnen(a);
    await a.win.keyboard.press('Escape');
    await a.win.waitForTimeout(300);
    assert.equal(await dialogOffen(a.win), false);
    assert.equal(await fokusId(a.win), 'btn-info');
  } finally { await a.close(); }
});

test('Info-Dialog zeigt die Version aus package.json', async () => {
  const a = await launchApp({ offline: true });
  try {
    await oeffnen(a);
    await a.win.waitForFunction((v) => document.getElementById('info-dialog').textContent.includes(v), VERSION, { timeout: 10000 });
    assert.ok((await dialogText(a.win)).includes(VERSION));
  } finally { await a.close(); }
});

test('Info-Dialog zeigt Modellname und Installation "vollständig" bei intakter Installation', async () => {
  const a = await launchApp({ offline: true });
  try {
    await oeffnen(a);
    await a.win.waitForFunction(() => /vollständig/.test(document.getElementById('info-dialog').textContent), null, { timeout: 10000 });
    const t = await dialogText(a.win);
    assert.match(t, /distilbert-base-multilingual-cased-ner-hrl/);
    assert.match(t, /\d+\.\d MB/);
    assert.doesNotMatch(t, /unvollständig/);
  } finally { await a.close(); }
});

test('Mit fehlender Modelldatei listet der Info-Dialog den relativen Pfad (nie den Programmordner)', async () => {
  const v = makeAppVariant({ dropModel: true });
  const a = await launchApp({ offline: true, appDir: v.dir });
  try {
    await oeffnen(a);
    await a.win.waitForFunction((p) => document.getElementById('info-dialog').textContent.includes(p), MODEL_REL, { timeout: 10000 });
    const t = await dialogText(a.win);
    assert.ok(t.includes(MODEL_REL));
    assert.ok(!t.includes(v.dir), 'absoluter Pfad des Programmordners darf nicht erscheinen');
    assert.ok(!t.includes(ROOT), 'absoluter Pfad des Quellbaums darf nicht erscheinen');
  } finally { await a.close(); v.cleanup(); }
});

test('Diagnose enthält PrivacyShield <Version>, die Zeile "Installation:", Electron/Chromium, aber weder Dokumentinhalt noch Dateinamen', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await setFiles(f, [{ name: 'geheime-akte-meier.txt', mimeType: 'text/plain', buffer: Buffer.from(SECRET) }]);
    await f.waitForFunction((s) => document.getElementById('IT').value.includes(s), SECRET, { timeout: 15000 });
    await a.win.click('#btn-info');
    await a.win.waitForTimeout(300);
    await a.win.click('#btn-diag');
    await a.win.waitForTimeout(800);
    const text = await a.app.evaluate(({ clipboard }) => clipboard.readText());
    assert.ok(text.startsWith('PrivacyShield ' + VERSION), 'Diagnose beginnt mit PrivacyShield <Version>: ' + text.slice(0, 40));
    assert.match(text, /Installation: (vollständig|unvollständig)/);
    assert.match(text, /Electron/);
    assert.match(text, /Chromium/);
    assert.doesNotMatch(text, /Vertraulicher Text|Thomas Müller/);
    assert.doesNotMatch(text, /geheime-akte|meier\.txt/);
  } finally { await a.close(); }
});

test('Lizenztext (normaler Start) enthält Transformers.js und pdf.js', async () => {
  const a = await launchApp({ offline: true });
  try {
    await oeffnen(a);
    await a.win.waitForFunction(() => { const p = document.querySelector('#info-dialog details pre'); return p && p.textContent.length > 100; }, null, { timeout: 10000 });
    const info = await a.win.evaluate(() => {
      const d = document.querySelector('#info-dialog details');
      return { summary: d.querySelector('summary').textContent.trim(), pre: d.querySelector('pre').textContent };
    });
    assert.equal(info.summary, 'Lizenzen');
    assert.match(info.pre, /Transformers\.js/);
    assert.match(info.pre, /pdf\.js/);
    assert.ok(info.pre.length <= 1024 * 1024, 'höchstens 1 MiB');
  } finally { await a.close(); }
});

test('Kanal get-app-info liefert Version, Electron, Chrome, Node, Plattform und Modell für vertrauenswürdigen Absender', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const r = await invoke(a, 'get-app-info', { url: TRUSTED });
    assert.equal(r.ok, true, r.err);
    const i = r.result;
    assert.equal(i.version, VERSION);
    for (const k of ['electron', 'chrome', 'node', 'platform', 'arch', 'osRelease']) assert.equal(typeof i[k], 'string', k);
    assert.ok(i.model && typeof i.model.id === 'string' && Number.isFinite(i.model.bytes) && i.model.bytes > 0, JSON.stringify(i.model));
  } finally { await a.close(); }
});

test('Kanal get-licenses liefert THIRD_PARTY_NOTICES.md für vertrauenswürdigen Absender', async () => {
  const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
  try {
    const r = await invoke(a, 'get-licenses', { url: TRUSTED });
    assert.equal(r.ok, true, r.err);
    assert.equal(typeof r.result, 'string');
    assert.match(r.result, /Transformers\.js/);
  } finally { await a.close(); }
});

for (const ch of ['get-app-info', 'get-licenses']) {
  test(`Kanal ${ch} lehnt fremden Absender (https://evil.example/) ab`, async () => {
    const a = await launchApp({ offline: true, env: { PS_TEST_HOOKS: '1' } });
    try {
      const r = await invoke(a, ch, { url: EVIL });
      assert.equal(r.ok, false, 'Aufruf hätte scheitern müssen');
      assert.match(r.err, /untrusted sender/);
    } finally { await a.close(); }
  });
}

test('Klick auf Impressum und Datenschutz öffnet die Adressen im Systembrowser (__psExternal)', async () => {
  const a = await launchApp({ offline: true });
  try {
    await oeffnen(a);
    await a.win.click('#info-dialog a[href="https://arcangeli.eu/impressum.html"]');
    await a.win.waitForTimeout(300);
    await a.win.click('#info-dialog a[href="https://arcangeli.eu/datenschutz.html"]');
    await a.win.waitForTimeout(500);
    const ext = await a.app.evaluate(() => globalThis.__psExternal);
    assert.ok(ext.includes('https://arcangeli.eu/impressum.html'), JSON.stringify(ext));
    assert.ok(ext.includes('https://arcangeli.eu/datenschutz.html'), JSON.stringify(ext));
  } finally { await a.close(); }
});

test('Info-Dialog enthält den Knopf "Auf Updates prüfen"', async () => {
  const a = await launchApp({ offline: true });
  try {
    await oeffnen(a);
    const n = await a.win.evaluate(() => [...document.querySelectorAll('#info-dialog button')].filter((b) => b.textContent.trim() === 'Auf Updates prüfen').length);
    assert.equal(n, 1);
  } finally { await a.close(); }
});
