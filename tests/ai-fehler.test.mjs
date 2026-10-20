// KI-Start schlaegt fehl: Der Nutzer muss die Ursache sehen, die Standard-Erkennung laeuft weiter, "Erneut versuchen" geht.
// Hintergrund: Ein Nutzer sah nur "Modell konnte nicht geladen werden" ohne Grund (Modelldatei fehlte oder war blockiert).
import test from 'node:test';
import assert from 'node:assert/strict';
import { launchApp, toolFrame, runAnon, makeAppVariant } from './helpers.mjs';

const panel = (f) => f.evaluate(() => ({ visible: getComputedStyle(document.getElementById('aiStatusError')).display !== 'none', reason: document.getElementById('aiErrorReason').textContent, code: lastAIError && lastAIError.code }));

for (const [name, opts, code, texts] of [
  ['Modelldatei fehlt', { dropModel: true }, 'ASSETS', [/Modelldatei|model_quantized/i, /fehlt/, /neu installieren/, /Virenschutz/]],
  ['Modelldatei unvollstaendig (abgeschnitten)', { truncateModelTo: 10_485_760 }, 'ASSETS', [/10,0 MB statt 129,1 MB/, /neu installieren/]],
  ['Modelldatei fehlt und kein Manifest (nur Fehlermeldung des Laders)', { dropModel: true, dropManifest: true }, 'MODEL_FILE', [/nicht gefunden/, /neu installieren/]],
]) {
  test(`KI-Start schlaegt fehl: ${name} -> Ursache sichtbar, Standard-Erkennung laeuft`, async () => {
    const v = makeAppVariant(opts);
    const a = await launchApp({ offline: true, appDir: v.dir });
    try {
      const f = await toolFrame(a.win);
      await f.evaluate(async () => { await loadAIModel(); });
      const p = await panel(f);
      assert.ok(p.visible, 'Fehlerbereich nicht sichtbar');
      assert.equal(p.code, code);
      for (const t of texts) assert.match(p.reason, t);
      assert.doesNotMatch(await f.evaluate(() => document.getElementById('aiStatusError').innerText), /ohne Einschränkung/, 'Text darf keine falsche Zusicherung machen');
      // Standard-Erkennung funktioniert weiterhin
      const r = await runAnon(f, 'IBAN DE89 3704 0044 0532 0130 00, E-Mail max@firma.de');
      assert.match(r.out, /\{\{IBAN_1\}\}/);
      // Diagnose in der Shell enthaelt den Fehler, ohne Dokumentinhalt
      await a.win.click('#btn-diag'); await a.win.waitForTimeout(600);
      const diag = await a.app.evaluate(({ clipboard }) => clipboard.readText());
      assert.match(diag, new RegExp('KI-Fehler: ' + code));
      assert.doesNotMatch(diag, /max@firma/);
    } finally { await a.close(); v.cleanup(); }
  });
}

test('Fehlerklassen: Speicher, Netzwerk, Laufzeit werden erkannt; Details enthalten Code und Meldung', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const res = await f.evaluate(async () => {
      const out = {};
      for (const [k, m] of Object.entries({ MEMORY: 'RangeError: WebAssembly.Memory(): could not allocate memory', NETWORK: 'TypeError: Failed to fetch', WASM: 'CompileError: WebAssembly.instantiate(): invalid', MODEL_CORRUPT: "Can't create a session. ERROR_CODE: 7, Failed to load model because protobuf parsing failed.", UNKNOWN: 'irgendwas' })) out[k] = (await diagnoseAIError(new Error(m))).code;
      lastAIError = await diagnoseAIError(new Error('RangeError: could not allocate memory'));
      return { out, details: aiErrorDetailsText() };
    });
    for (const [k, v] of Object.entries(res.out)) assert.equal(v, k);
    assert.match(res.details, /Code: MEMORY/);
    assert.match(res.details, /could not allocate memory/);
  } finally { await a.close(); }
});

test('"Erneut versuchen" startet das Modell nach einem Fehlschlag; kein Dauer-Neuversuch bei jeder Analyse', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const r = await f.evaluate(async () => {
      const orig = window.createNerPipeline; let calls = 0;
      window.createNerPipeline = () => { calls++; return Promise.reject(new Error('RangeError: could not allocate memory')); };
      await loadAIModel();
      const failed = !nerPipeline && lastAIError && lastAIError.code === 'MEMORY';
      // automatisches Laden pausiert nach dem Fehlschlag (60 s): weitere Analysen warten nicht jedes Mal erneut
      document.getElementById('IT').value = 'Herr Thomas Müller'; await anon(); await anon();
      const callsAfterAnalyses = calls;
      window.createNerPipeline = orig;
      await retryAIModel();
      return { failed, callsAfterAnalyses, loadedAfterRetry: !!nerPipeline };
    });
    assert.ok(r.failed);
    assert.equal(r.callsAfterAnalyses, 1, 'Analysen haben das Laden erneut versucht');
    assert.ok(r.loadedAfterRetry, 'Erneut versuchen hat das Modell nicht gestartet');
  } finally { await a.close(); }
});

test('Leere Datei (0 Bytes, z. B. nur online in OneDrive) wird erklaert statt stumm angezeigt', async () => {
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    const r = await f.evaluate(async () => {
      const calls = []; const orig = window.toast; window.toast = (m, t) => calls.push([m, t]);
      await loadF(new File([], 'leer.pdf', { type: 'application/pdf' }));
      window.toast = orig;
      return { calls, listed: getComputedStyle(document.getElementById('FT')).display !== 'none' && document.getElementById('FT').classList.contains('on') };
    });
    assert.ok(r.calls.some(([m, t]) => t === 'e' && /leer/.test(m) && /OneDrive/.test(m)), JSON.stringify(r.calls));
    assert.equal(r.listed, false, 'leere Datei darf nicht als geladen angezeigt werden');
  } finally { await a.close(); }
});
