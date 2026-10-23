// C3.w: Eigene Regeln (Richtliniendatei policy.json) in Oberflaeche und Kern.
// Element-Kennungen sind in der Spezifikation NICHT genannt; hier festgelegt (siehe Bericht):
//   #policy-file (input type=file, Import), #policy-export (Knopf, Export), #policy-rules (Regelliste, je Regel ein Schalter input[type=checkbox]),
//   #policy-terms (Textfeld, ein Begriff je Zeile), #policy-add-terms (Knopf), #policy-pattern (Muster), #policy-sample (Beispieltext),
//   #policy-add-pattern (Knopf), #policy-error (Fehlermeldung), #policy-hint (Hinweis zur Speicherung), #policy-preview (markierter Beispieltext).
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, captureDownloads, getDownloads, runAnon } from './helpers.mjs';

const POLICY = JSON.stringify({
  version: 1, name: 'Kanzlei Beispiel',
  rules: [
    { id: 'kunde', label: 'Kundennummer', type: 'regex', pattern: 'K-\\d{6}', flags: '', category: 'EIGEN', profiles: ['*'] },
    { id: 'projekte', label: 'Projektnamen', type: 'list', terms: ['Projekt Falke', 'Alpha-Programm'], caseSensitive: false, category: 'EIGEN', profiles: ['standard', 'strict'] },
  ],
});
const TEXT = 'Kunde K-123456 betreut Projekt Falke';

async function importPolicy(f, json = POLICY) {
  await f.setInputFiles('#policy-file', [{ name: 'policy.json', mimeType: 'application/json', buffer: Buffer.from(json, 'utf8') }]);
  await f.waitForFunction(() => document.querySelectorAll('#policy-rules input[type=checkbox]').length >= 2, null, { timeout: 1500 });
}

test('Eigene Regeln: Import von policy.json zeigt beide Regeln mit Schalter', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await importPolicy(f);
    const txt = await f.textContent('#policy-rules');
    assert.ok(txt.includes('Kundennummer') && txt.includes('Projektnamen'), txt);
  } finally { await a.close(); }
});

test('Eigene Regeln: Anonymisieren maskiert Muster und Begriff als {{EIGEN_1}} und {{EIGEN_2}}', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await importPolicy(f);
    const { out } = await runAnon(f, TEXT);
    assert.ok(out.includes('{{EIGEN_1}}') && out.includes('{{EIGEN_2}}'), out);
    assert.equal(out.includes('K-123456'), false);
    assert.equal(out.includes('Falke'), false);
  } finally { await a.close(); }
});

test('Eigene Regeln: Rundlauf stellt den Originaltext exakt wieder her', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await importPolicy(f);
    const { out } = await runAnon(f, TEXT);
    const back = await f.evaluate((o) => {
      document.getElementById('AR').value = o; deanon();
      return (document.getElementById('RT') || {}).value;
    }, out);
    assert.equal(back, TEXT);
  } finally { await a.close(); }
});

test('Eigene Regeln: Bericht nennt "Eigene Regeln: 2" ohne Kundennummer, Projektname oder Muster', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await importPolicy(f);
    await runAnon(f, TEXT);
    await captureDownloads(f);
    await f.click('#btn-report', { timeout: 1500 });
    await f.waitForFunction(() => (window.__dls || []).length > 0, null, { timeout: 1500 });
    const d = (await getDownloads(f)).find((x) => x.name === 'bericht.txt');
    assert.ok(d, 'bericht.txt fehlt');
    const text = Buffer.from(d.base64, 'base64').toString('utf8');
    assert.ok(text.includes('Eigene Regeln: 2'), text);
    for (const s of ['K-123456', 'Falke', 'K-\\d{6}', 'Alpha-Programm']) assert.equal(text.includes(s), false, 'im Bericht: ' + s);
  } finally { await a.close(); }
});

test('Eigene Regeln: unzulaessiges Muster (a+)+$ zeigt Fehlermeldung, App antwortet innerhalb 2 s', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.fill('#policy-pattern', '(a+)+$');
    await f.fill('#policy-sample', 'a'.repeat(40) + 'b');
    const t0 = Date.now();
    await f.waitForFunction(() => (document.getElementById('policy-error') || {}).textContent.trim().length > 0, null, { timeout: 1500 });
    const msg = await f.textContent('#policy-error');
    assert.ok(/Unbegrenzte Wiederholungen/.test(msg), msg);
    assert.equal(await f.evaluate(() => 1 + 1), 2);
    assert.ok(Date.now() - t0 < 2000, 'App reagierte zu langsam');
  } finally { await a.close(); }
});

test('Eigene Regeln: zulaessiges Muster markiert Treffer im Testfeld', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.fill('#policy-pattern', 'K-\\d{6}');
    await f.fill('#policy-sample', 'Nummer K-123456 hier');
    await f.waitForFunction(() => /K-123456/.test((document.querySelector('#policy-preview mark') || {}).textContent || ''), null, { timeout: 1500 });
    assert.equal((await f.textContent('#policy-error')).trim(), '');
  } finally { await a.close(); }
});

test('Eigene Variablen: unzulaessiges Muster wird mit derselben Meldung abgelehnt', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const before = await f.evaluate(() => cvars.length);
    await f.fill('#VN', 'Test', { timeout: 1500 });
    await f.fill('#VP', '(a+)+$', { timeout: 1500 });
    await f.evaluate(() => addCV());
    assert.equal(await f.evaluate(() => cvars.length), before, 'unzulaessiges Muster wurde aufgenommen');
    const seite = await f.evaluate(() => document.body.innerText);
    assert.ok(/Unbegrenzte Wiederholungen/.test(seite), 'Meldung von checkPattern fehlt');
  } finally { await a.close(); }
});

test('Eigene Regeln: Begriffe hinzufuegen (ein Begriff je Zeile) maskieren als EIGEN', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.fill('#policy-terms', 'Projekt Falke\nAlpha-Programm');
    await f.click('#policy-add-terms');
    const { out } = await runAnon(f, 'Das Alpha-Programm und Projekt Falke laufen.');
    assert.ok(out.includes('{{EIGEN_1}}') && out.includes('{{EIGEN_2}}'), out);
  } finally { await a.close(); }
});

test('Eigene Regeln: Schalter je Regel deaktiviert die Regel', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await importPolicy(f);
    await f.locator('#policy-rules input[type=checkbox]').first().uncheck();
    const { out } = await runAnon(f, TEXT);
    assert.ok(out.includes('K-123456'), 'deaktivierte Regel maskiert noch: ' + out);
    assert.equal(out.includes('Falke'), false);
  } finally { await a.close(); }
});

test('Eigene Regeln: Export liefert policy.json mit den Regeln', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await importPolicy(f);
    await captureDownloads(f);
    await f.click('#policy-export');
    await f.waitForFunction(() => (window.__dls || []).length > 0, null, { timeout: 1500 });
    const d = (await getDownloads(f)).find((x) => x.name === 'policy.json');
    assert.ok(d, 'policy.json fehlt');
    const p = JSON.parse(Buffer.from(d.base64, 'base64').toString('utf8'));
    assert.equal(p.version, 1);
    assert.deepEqual(p.rules.map((r) => r.id), ['kunde', 'projekte']);
  } finally { await a.close(); }
});

test('Eigene Regeln: Neustart der Seite laedt die gespeicherte Richtlinie (nur Regeln, mit Hinweis)', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await importPolicy(f);
    await runAnon(f, TEXT);
    const stored = await f.evaluate(() => localStorage.getItem('ps_policy_v1'));
    assert.ok(stored, 'ps_policy_v1 fehlt');
    assert.equal(stored.includes('K-123456'), false, 'Dokumenteninhalt im Speicher');
    assert.ok((await f.textContent('#policy-hint')).trim().length > 0, 'Hinweis zur Speicherung fehlt');
    await a.win.reload({ waitUntil: 'load' });
    const f2 = await toolFrame(a.win);
    await f2.waitForFunction(() => document.querySelectorAll('#policy-rules input[type=checkbox]').length >= 2, null, { timeout: 1500 });
    const { out } = await runAnon(f2, TEXT);
    assert.ok(out.includes('{{EIGEN_1}}') && out.includes('{{EIGEN_2}}'), out);
  } finally { await a.close(); }
});

test('Kern: PSDetect.detect nimmt extraSpans mit Vorrang prio 0 auf', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const r = await f.evaluate(() => {
      const t = 'Kunde K-123456 hier';
      const s = t.indexOf('K-');
      const spans = PSDetect.detect(t, { ents: ENTS.map((e) => e.id), cvars: [], whitelist: [], aiSpans: null,
        extraSpans: [{ start: s, end: s + 8, pfx: 'EIGEN', col: '#ff3b30', id: 'custom', prio: 0, meth: 'Eigene Regel', hard: true, val: 'K-123456' }] });
      return spans.filter((x) => x.start === s).map((x) => ({ pfx: x.pfx, prio: x.prio, meth: x.meth }));
    });
    assert.deepEqual(r, [{ pfx: 'EIGEN', prio: 0, meth: 'Eigene Regel' }]);
  } finally { await a.close(); }
});

test('Tastatur: sichtbarer Knopf #policy-import-btn ist fokussierbar und loest per Enter und Leertaste den Dateidialog aus', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const info = await f.evaluate(() => {
      const b = document.getElementById('policy-import-btn');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      b.focus();
      return { tag: b.tagName, sichtbar: r.width > 0 && r.height > 0, fokus: document.activeElement === b };
    });
    assert.ok(info, '#policy-import-btn fehlt');
    assert.equal(info.tag, 'BUTTON');
    assert.ok(info.sichtbar && info.fokus, JSON.stringify(info));
    for (const taste of ['Enter', ' ']) {
      await f.focus('#policy-import-btn', { timeout: 1500 });
      const [chooser] = await Promise.all([a.win.waitForEvent('filechooser', { timeout: 3000 }), a.win.keyboard.press(taste)]);
      assert.ok(chooser, 'kein Dateidialog nach Taste ' + JSON.stringify(taste));
    }
  } finally { await a.close(); }
});

const KAPUTT = JSON.stringify({ version: 1, name: 'x', rules: [{ id: 'boese', label: 'Boese', type: 'regex', pattern: '(a+)+$', flags: '', category: 'EIGEN', profiles: ['*'] }] });

test('Fail-closed: gespeicherte Regel mit unzulaessigem Muster bricht das Anonymisieren ab, #policy-error nennt die Regel ohne Muster', async () => {
  const a = await launchApp({ offline: true });
  try {
    let f = await toolFrame(a.win);
    await f.evaluate((v) => localStorage.setItem('ps_policy_v1', v), KAPUTT);
    await a.win.reload({ waitUntil: 'load' });
    f = await toolFrame(a.win);
    const r = await f.evaluate(async (t) => {
      document.getElementById('IT').value = t;
      aiCache = { key: null, spans: [] };
      try { await anon(); } catch (e) { /* Abbruch ist erlaubt */ }
      return { out: document.getElementById('AT').value, err: document.getElementById('policy-error').textContent, role: document.getElementById('policy-error').getAttribute('role') };
    }, 'Kunde a@b.de und aaaa');
    assert.equal(r.out, '', 'Ergebnisfeld muss leer bleiben: ' + r.out);
    assert.ok(r.err.trim().length > 0, '#policy-error leer');
    assert.equal(r.role, 'alert');
    assert.ok(r.err.includes('boese'), 'Regel-Id fehlt: ' + r.err);
    assert.equal(r.err.includes('(a+)+$'), false, 'Muster in der Meldung');
  } finally { await a.close(); }
});

test('Fail-closed: kaputtes JSON in ps_policy_v1 meldet sich beim Start in #policy-error', async () => {
  const a = await launchApp({ offline: true });
  try {
    let f = await toolFrame(a.win);
    await f.evaluate(() => localStorage.setItem('ps_policy_v1', '{kaputt'));
    await a.win.reload({ waitUntil: 'load' });
    f = await toolFrame(a.win);
    await f.waitForFunction(() => document.getElementById('policy-error').textContent.trim().length > 0, null, { timeout: 1500 });
  } finally { await a.close(); }
});
