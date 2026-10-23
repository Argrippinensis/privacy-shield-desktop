// Referenz des Stands 1.8.0 festhalten (F2, Punkt 0): die UNVERAENDERTE App verarbeitet alle Eingaben in drei Modi.
//   node tests/eval/dump-reference.mjs [--out <Datei>]    Standard: tests/golden/reference-v1.8.json
// Modi: w0 (nur Regeln), w1 (Regeln plus Wortlisten), ki (Modell). Kein Zeitstempel: der Lauf ist reproduzierbar.
// collectItems() wird auch von diff-reference.mjs benutzt (gleiche Eingaben, gleiche Reihenfolge).
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
export const REFERENCE = path.join(ROOT, 'tests', 'golden', 'reference-v1.8.json');
export const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// Abschnittstext aus tests/eval/stress.mjs kopiert (inputSha256 faengt Abweichungen ab)
const blk = (i) => `Vertrag Nr. ${100000 + i}: Herr Thomas Muster${i} (geb. ${(i % 28) + 1}.0${(i % 9) + 1}.19${60 + (i % 40)}), wohnhaft Musterstraße ${(i % 200) + 1}, ${10000 + (i % 80000)} Beispielstadt, erreichbar unter user${i}@beispiel-${i}.de oder +49 89 ${1000000 + i}. IBAN DE89 3704 0044 0532 ${String(i).padStart(4, '0')} 00. Die Firma Beispiel${i} GmbH zahlt ${i},50 EUR. Frau Anna Schmidt${i} unterschreibt am 12.03.20${10 + (i % 15)}.\n`;

export const MODES = ['w0', 'w1', 'ki'];

// Eingaben in fester Reihenfolge: [{ key, text, profile, stress }]
export async function buildInputs() {
  const { CASES } = await import('./cases.mjs');
  const { GDPR } = await import('./cases-gdpr.mjs');
  const { generateDocs } = await import('./generate.mjs');
  const inputs = [...CASES, ...GDPR].map(([id, , text, , profile]) => ({ key: id, text, profile: profile || 'standard' }));
  generateDocs(42).forEach((d, i) => inputs.push({ key: 'syn' + i, text: d.text, profile: 'standard' }));
  inputs.push({ key: 'golden-sample', text: fs.readFileSync(path.join(ROOT, 'tests', 'golden', 'sample.txt'), 'utf8'), profile: 'standard' });
  for (const n of [100, 400, 1000]) inputs.push({ key: 'stress-' + n, text: Array.from({ length: n }, (_, i) => blk(i)).join(''), profile: 'standard', stress: true });
  return inputs;
}

// Laeuft in der Oberflaeche: je Eingabe anonymisieren; liefert Ausgabe, Zuordnung (Einfuegereihenfolge) und KI-Spans
function runInFrame({ list, ai }) {
  return (async () => {
    const res = [];
    for (const it of list) {
      applyProfile(PROFILES.find((p) => p.id === it.profile) || PROFILES[0]);
      document.getElementById('IT').value = it.text;
      aiCache = { key: null, spans: [] };
      await anon();
      res.push({ key: it.key, out: document.getElementById('AT').value, store: JSON.stringify(store), entities: Object.keys(store).length, aiSpans: ai ? aiCache.spans.map((s) => ({ start: s.start, end: s.end, pfx: s.pfx, col: s.col })) : undefined });
    }
    return res;
  })();
}

export async function collectItems() {
  const { launchApp, toolFrame } = await import('../helpers.mjs');
  const inputs = await buildInputs();
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await a.win.waitForTimeout(800);
    const items = [];
    for (const mode of MODES) {
      await f.evaluate(async (m) => {
        if (m === 'ki') { setAIMode('auto'); await loadAIModel(); AI_IDLE_MS = 3600000; }
        else { setAIMode('off'); localAIMode = m === 'w1'; }
      }, mode);
      if (mode === 'ki' && !(await f.evaluate(() => !!nerPipeline))) throw new Error('KI-Modell nicht geladen');
      const list = inputs.filter((i) => mode !== 'ki' || !i.stress);
      const res = await f.evaluate(runInFrame, { list: list.map(({ key, text, profile }) => ({ key, text, profile })), ai: mode === 'ki' });
      list.forEach((it, i) => {
        const r = res[i];
        const o = { mode, key: it.key, profile: it.profile, inputSha256: sha256(it.text), outSha256: sha256(r.out), storeSha256: sha256(r.store), entities: r.entities };
        if (mode === 'ki') o.aiSpans = r.aiSpans;
        items.push(o);
      });
    }
    return items;
  } finally { await a.close(); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  const out = i > 0 ? path.resolve(process.argv[i + 1]) : REFERENCE;
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const items = await collectItems();
  fs.writeFileSync(out, JSON.stringify({ version: 1, app: pkg.version, items }, null, 1) + '\n');
  console.log(`${items.length} Elemente nach ${path.relative(process.cwd(), out) || out} geschrieben`);
}
