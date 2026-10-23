// F1.b, statischer Verdrahtungstest: Die HTML bindet den Erkennungskern (app/lib/detect.js, PSDetect) ein,
// statt ihn selbst zu enthalten. Liest app/privacy-shield.html als Text; keine Electron-Abhaengigkeit.
// Dazu Robustheitsfaelle des Moduls (Hinweise des F1.a-Pruefers), die F1.b voraussetzt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadLib, ROOT } from './_load.mjs';

const HTML_PATH = path.join(ROOT, 'app', 'privacy-shield.html');
// Zeilenenden vereinheitlichen: Windows checkt die Datei mit CRLF aus, die Muster unten erwarten LF.
const html = fs.readFileSync(HTML_PATH, 'utf8').replace(/\r\n/g, '\n');
const D = () => loadLib('detect');

// <script>-Bloecke in Dokumentreihenfolge: { index, src, body }
function scripts() {
  const out = [];
  const rx = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = rx.exec(html)) !== null) {
    const src = /\bsrc\s*=\s*"([^"]*)"/.exec(m[1]);
    out.push({ index: m.index, src: src ? src[1] : null, body: m[2] });
  }
  return out;
}
// Hauptskript: der inline-Block, der anonCore definiert
const mainScript = () => scripts().find((s) => !s.src && /\banonCore\b/.test(s.body));

test('HTML bindet lib/detect.js per <script src> ein', () => {
  assert.match(html, /<script src="lib\/detect\.js"><\/script>/);
});

test('lib/detect.js wird vor dem Hauptskript geladen', () => {
  const det = scripts().find((s) => s.src === 'lib/detect.js');
  assert.ok(det, 'Script-Tag fehlt');
  const main = mainScript();
  assert.ok(main, 'Hauptskript nicht gefunden');
  assert.ok(det.index < main.index, 'detect.js steht nach dem Hauptskript');
});

test('lib/detect.js steht nach dem Skript fuer JSZip', () => {
  const det = scripts().find((s) => s.src === 'lib/detect.js');
  const jz = scripts().find((s) => s.src && /jszip/.test(s.src));
  assert.ok(det && jz);
  assert.ok(jz.index < det.index);
});

test('lib/detect.js wird genau einmal eingebunden', () => {
  assert.equal(scripts().filter((s) => s.src === 'lib/detect.js').length, 1);
});

test('die eingebundene Datei app/lib/detect.js existiert und laedt', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'app', 'lib', 'detect.js')));
  assert.equal(typeof D().detect, 'function');
});

{
  // collectEntities bleibt als duenne Fassade (siehe eigener Test), nur der Kern-Koerper muss weg:
  // Die Fassade ist kurz und enthaelt keine Regelschleife ueber ENTS-Regexe.
  test('collectEntities ist nur noch eine duenne Fassade (unter 25 Zeilen, ruft PSDetect.detect)', () => {
    const m = /function collectEntities\s*\(text\)\s*\{/.exec(html);
    assert.ok(m, 'collectEntities fehlt (Kompatibilitaetsvertrag)');
    let depth = 0, i = m.index + m[0].length - 1, end = -1;
    for (; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}' && --depth === 0) { end = i; break; }
    }
    const body = html.slice(m.index, end + 1);
    assert.ok(body.split('\n').length < 25, 'Fassade zu lang: ' + body.split('\n').length + ' Zeilen');
    assert.match(body, /PSDetect\.detect\(/);
  });
}

for (const [label, rx] of [
  ['function computePass1Uncached', /function computePass1Uncached\b/],
  ['function postProcessSpans', /function postProcessSpans\b/],
  ['const ENTS = [ (Regelliste)', /const ENTS = \[/],
  ['LOCAL_NAMES (Namenliste)', /\bLOCAL_NAMES\b/],
  ['const PROFILES = [ (Profilliste)', /const PROFILES = \[/],
]) {
  test('HTML enthaelt nicht mehr: ' + label, () => {
    assert.doesNotMatch(html, rx);
  });
}

test('HTML hat hoechstens 5200 Zeilen', () => {
  const lines = html.split('\n').length;
  assert.ok(lines <= 5200, 'Zeilen: ' + lines);
});

test('ENTS und PROFILES stammen aus PSDetect', () => {
  assert.match(html, /const ENTS = PSDetect\.ENTS\s*;/);
  assert.match(html, /const PROFILES = PSDetect\.PROFILES\s*;/);
});

test('anonCore ruft PSDetect.anonymize auf', () => {
  const main = mainScript();
  const m = /async function anonCore\s*\(\)\s*\{[\s\S]*?\n      \}\n/.exec(main.body);
  assert.ok(m, 'anonCore nicht gefunden');
  assert.match(m[0], /PSDetect\.anonymize\(/);
});

test('anonCore uebergibt store und cnt als state und schreibt sie zurueck (store = r.state.store)', () => {
  const main = mainScript().body;
  assert.match(main, /state\s*:\s*\{\s*store\s*,\s*cnt\s*\}|state\s*:\s*\{\s*store\s*:\s*store\s*,\s*cnt\s*:\s*cnt\s*\}/);
  assert.match(main, /\bstore\s*=\s*\w+\.state\.store\b/);
  assert.match(main, /\bcnt\s*=\s*\w+\.state\.cnt\b/);
});

test('deanon ruft PSDetect.deanonymize auf', () => {
  const m = /function deanon\s*\(\)\s*\{[\s\S]*?\n      \}\n/.exec(mainScript().body);
  assert.ok(m, 'deanon nicht gefunden');
  assert.match(m[0], /PSDetect\.deanonymize\(/);
});

test('collectEntities-Fassade uebergibt ents (aktive Regeln), cvars, whitelist, wordlists und aiSpans', () => {
  const m = /function collectEntities\s*\(text\)\s*\{[\s\S]*?\n      \}\n/.exec(html);
  assert.ok(m, 'collectEntities fehlt');
  for (const k of ['ents', 'cvars', 'whitelist', 'wordlists', 'aiSpans']) assert.match(m[0], new RegExp('\\b' + k + '\\b'), k);
  assert.match(m[0], /localAIMode/);
  assert.match(m[0], /aiCache\.key\s*===\s*text/);
});

// Kompatibilitaetsvertrag: diese Namen bleiben in der HTML (Tests und Harness greifen darauf zu)
for (const [n, rx] of [
  ['store', /\blet\s+store\b/],
  ['cnt', /\blet\s+store\s*=\s*\{\}\s*,\s*cnt\b|\blet\s+cnt\b/],
  ['aiCache', /\blet\s+aiCache\b/],
  ['localAIMode', /\blet\s+localAIMode\b/],
  ['whitelist', /\blet\s+(?:\w+\s*=\s*[^;]*,\s*)*whitelist\b|\blet\s+whitelist\b/],
  ['cvars', /\b(?:let|var)\s+(?:[^;]*,\s*)?cvars\b/],
  ['curProf', /\b(?:let|var)\s+(?:[^;]*,\s*)?curProf\b/],
  ['applyProfile', /function applyProfile\b/],
  ['collectEntities', /function collectEntities\b/],
  ['anon', /async function anon\b/],
  ['anonCore', /async function anonCore\b/],
  ['deanon', /function deanon\b/],
  ['setAIMode', /function setAIMode\b/],
  ['aiMode', /function aiMode\b/],
  ['loadAIModel', /function loadAIModel\b/],
  ['nerPipeline', /\blet\s+nerPipeline\b/],
  ['lastAIError', /\blet\s+lastAIError\b/],
  ['loadF', /function loadF\b/],
]) {
  test('Kompatibilitaetsvertrag: ' + n + ' bleibt in der HTML erhalten', () => {
    assert.match(html, rx);
  });
}

// --- Robustheit des Moduls (F1.a-Pruefer): Zwischenspeicher und Globals duerfen nicht ueber Aufrufe hinweg leaken ---

const TXT = 'Max Mustermann wohnt in Berlin. Mail: max.mustermann@beispiel.de, Tel. 030 1234567.';

test('Modul: nach einem Fehler in detect (ungueltiger cvars-Eintrag) liefert der naechste Aufruf dasselbe wie ein frischer', () => {
  const D1 = D();
  const base = JSON.stringify(D1.detect(TXT, { profile: 'standard' }));
  assert.throws(() => D1.detect(TXT, { profile: 'standard', cvars: [null] }));
  assert.equal(JSON.stringify(D1.detect(TXT, { profile: 'standard' })), base);
});

test('Modul: gleicher Text mit anderer whitelist nutzt keinen veralteten Zwischenspeicher', () => {
  const D1 = D();
  const a = D1.detect(TXT, { profile: 'standard' });
  const b = D1.detect(TXT, { profile: 'standard', whitelist: ['beispiel.de'] });
  const c = D1.detect(TXT, { profile: 'standard' });
  assert.ok(b.length < a.length, 'whitelist ohne Wirkung');
  assert.equal(JSON.stringify(c), JSON.stringify(a));
});

test('Modul: cvars eines Aufrufs wirken nicht auf den naechsten Aufruf mit gleichem Text', () => {
  const D1 = D();
  const withC = D1.detect('Vorgang XQ-4711 ist offen.', { profile: 'standard', cvars: [{ n: 'AKTE', p: 'XQ-\\d+' }] });
  assert.ok(withC.some((s) => s.pfx === 'AKTE'));
  const without = D1.detect('Vorgang XQ-4711 ist offen.', { profile: 'standard' });
  assert.ok(!without.some((s) => s.pfx === 'AKTE'));
});

test('Modul: anonymize mit unbeschreibbarem state wirft, danach bleibt der naechste Aufruf unbeeinflusst', () => {
  const D1 = D();
  const base = JSON.stringify(D1.anonymize(TXT, {}).state);
  const bad = { store: Object.freeze({}), cnt: {} };
  assert.throws(() => D1.anonymize(TXT, { state: bad }));
  assert.equal(JSON.stringify(D1.anonymize(TXT, {}).state), base);
});

test('Modul: released wirkt nur im jeweiligen Aufruf (Freigabe leakt nicht in den naechsten)', () => {
  const D1 = D();
  const first = D1.detect(TXT, { profile: 'standard' });
  const email = first.find((s) => s.pfx === 'EMAIL' || /@/.test(s.val));
  assert.ok(email, 'Testdokument ohne E-Mail-Fund');
  const rel = D1.detect(TXT, { profile: 'standard', released: [{ pfx: email.pfx, value: email.val }] });
  assert.ok(!rel.some((s) => s.val === email.val));
  const again = D1.detect(TXT, { profile: 'standard' });
  assert.ok(again.some((s) => s.val === email.val));
});
