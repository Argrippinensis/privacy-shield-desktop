// Pakete B/C/D: alles lokal, KI im Hintergrund, echte RAM-Anzeige.
// Die App laeuft hier mit totem Proxy: jeder Netzzugriff wuerde sofort auffallen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, runAnon, makePdf, waitFor, GOLDEN, SAMPLE } from './helpers.mjs';

async function loadModel(frame) {
  const r = await frame.evaluate(async () => { await loadAIModel(); return { active: !!nerPipeline, info: nerPipeline && nerPipeline.info }; });
  assert.equal(r.active, true, 'KI-Modell wurde nicht geladen');
  return r;
}

test('Wortlisten-Erkennung entspricht dem Golden-Stand', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await a.win.waitForTimeout(1500);
    await f.evaluate(() => setAIMode('off'));
    const r = await runAnon(f, SAMPLE);
    assert.equal(r.out, GOLDEN.wordlist.out);
    assert.deepEqual(r.store, GOLDEN.wordlist.store);
  } finally { await a.close(); }
});

test('KI-Modell laedt offline aus der Installation, Ergebnis entspricht dem Golden-Stand', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const m = await loadModel(f);
    assert.equal(m.active, true, 'Modell nicht geladen');
    const r = await runAnon(f, SAMPLE);
    assert.equal(r.out, GOLDEN.model.out);
    assert.deepEqual(r.store, GOLDEN.model.store);
    const blocked = await a.app.evaluate(() => globalThis.__psBlocked);
    assert.deepEqual(blocked, [], 'Die Seite hat versucht, das Netz zu nutzen');
    const ext = a.requests.filter((u) => !u.startsWith('app://') && !u.startsWith('data:') && !u.startsWith('blob:'));
    assert.deepEqual(ext, []);
  } finally { await a.close(); }
});

test('Cross-Origin-Isolation aktiv, KI nutzt mehrere Rechenthreads', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    assert.equal(await f.evaluate(() => crossOriginIsolated), true);
    const m = await loadModel(f);
    assert.equal(m.info.isolated, true);
    const cores = await f.evaluate(() => navigator.hardwareConcurrency);
    if (cores >= 3) assert.ok(m.info.threads >= 2, 'nur ' + m.info.threads + ' Thread(s) bei ' + cores + ' Kernen');
  } finally { await a.close(); }
});

test('Oberflaeche bleibt waehrend der KI-Analyse bedienbar (kein Einfrieren)', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await loadModel(f);
    const big = Array.from({ length: 12 }, (_, i) => SAMPLE.replace(/Mueller/g, 'Mueller' + i)).join('\n');
    const r = await f.evaluate(async (text) => {
      const gaps = []; let last = performance.now();
      const iv = setInterval(() => { const n = performance.now(); gaps.push(n - last - 25); last = n; }, 25);
      document.getElementById('IT').value = text;
      const t0 = performance.now();
      await anon();
      clearInterval(iv);
      return { ms: Math.round(performance.now() - t0), maxGap: Math.round(Math.max(0, ...gaps)), len: text.length };
    }, big);
    console.log('  Analyse', r.len, 'Zeichen:', r.ms, 'ms, laengster Stillstand der Oberflaeche:', r.maxGap, 'ms');
    assert.ok(r.maxGap < 300, 'Oberflaeche stand ' + r.maxGap + ' ms still');
  } finally { await a.close(); }
});

test('PDF-Import, OCR und Word-Import funktionieren offline mit gebuendelten Bibliotheken', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    // 1) Text-PDF
    const textPdf = await makePdf(a.app, '<body style="font:16px Arial"><h2>Vertrag</h2><p>Herr Thomas Mueller wohnt in Berlin und zahlt 99,00 EUR.</p>');
    const t1 = await f.evaluate(async (b64) => {
      const file = new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 't.pdf', { type: 'application/pdf' });
      return await exPDF(file);
    }, textPdf);
    assert.match(t1, /Thomas Mueller/);
    // 2) Bild-PDF (nur Pixel, kein Text) -> OCR
    const png = await f.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 794; c.height = 400;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 794, 400); g.fillStyle = '#000'; g.font = '28px Arial';
      g.fillText('Rechnung 4711', 40, 70);
      g.fillText('Herr Thomas Mueller, Musterstrasse 12', 40, 130);
      g.fillText('Telefon 089 1234567 und 99,00 EUR', 40, 190);
      return c.toDataURL('image/png');
    });
    const imgPdf = await makePdf(a.app, `<body style="margin:0"><img src="${png}" style="width:210mm">`);
    const t2 = await f.evaluate(async (b64) => {
      const file = new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 's.pdf', { type: 'application/pdf' });
      return await exPDF(file);
    }, imgPdf);
    assert.match(t2, /Rechnung/);
    assert.match(t2, /Mueller/);
    // 3) Word-Datei (minimales DOCX, mit dem gebuendelten JSZip gebaut)
    const t3 = await f.evaluate(async () => {
      const z = new JSZip();
      z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
      z.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
      z.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Frau Anna Weber aus Hamburg</w:t></w:r></w:p></w:body></w:document>');
      const buf = await z.generateAsync({ type: 'uint8array' });
      return await exDOCX(new File([buf], 'd.docx'));
    });
    assert.match(t3, /Anna Weber/);
    assert.equal(await f.evaluate(() => typeof window.jspdf), 'object', 'jsPDF nicht geladen');
    const blocked = await a.app.evaluate(() => globalThis.__psBlocked);
    assert.deepEqual(blocked, []);
    const real = a.errors.filter((e) => !/ERR_/.test(e));
    assert.deepEqual(real, [], 'Konsolenfehler / CSP-Verstoesse');
  } finally { await a.close(); }
});

test('RAM-Anzeige zeigt den echten Verbrauch aller Prozesse und sinkt nach dem Entladen', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await a.win.waitForTimeout(1500);
    const stats = () => a.win.evaluate(() => window.electronAPI.getSystemStats());
    const before = (await stats()).app.memory;
    assert.ok(before > 100, 'App-Speicher vor dem Modell implausibel klein: ' + before + ' MB (Hauptprozess allein ~7 MB)');
    await loadModel(f);
    const loaded = (await stats()).app.memory;
    assert.ok(loaded - before > 300, 'Modell muss sich im Speicher zeigen: ' + before + ' -> ' + loaded + ' MB');
    await f.evaluate(() => unloadAIModel());
    const after = await waitFor(async () => (await stats()).app.memory, (m) => loaded - m > 200);
    console.log('  App-Speicher MB: Start', before, '| mit Modell', loaded, '| nach Entladen', after);
    assert.ok(loaded - after > 200, 'Entladen muss Speicher freigeben: ' + loaded + ' -> ' + after + ' MB');
    const shown = await a.win.evaluate(() => document.getElementById('sysstats').textContent);
    assert.match(shown, /App \d+([.,]\d)? (MB|GB)/);
    assert.equal(await f.evaluate(() => !!nerPipeline), false);
  } finally { await a.close(); }
});

test('Hinweis bei wenig Arbeitsspeicher, kein automatisches Laden des Modells', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await f.evaluate(() => { window.getTotalRamGB = async () => 4; });
    assert.equal(await f.evaluate(() => checkMemoryHint()), true);
    assert.match(await f.evaluate(() => document.getElementById('aiMemHint').textContent), /4 GB/);
    await runAnon(f, 'Herr Thomas Müller wohnt in München.');
    assert.equal(await f.evaluate(() => !!nerPipeline), false, 'Modell darf bei wenig RAM nicht automatisch starten');
  } finally { await a.close(); }
});
