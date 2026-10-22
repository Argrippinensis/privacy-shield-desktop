// Misst die Erkennungsqualitaet in der echten App (Electron, ohne Netz).
//   node tests/eval/run-eval.mjs             Tabelle ausgeben
//   node tests/eval/run-eval.mjs --baseline  tests/eval/baseline.json neu schreiben (nur nach bewusster Verbesserung)
//   node tests/eval/run-eval.mjs --set v2    zweite Menge (CASES_V2, generateDocs2(98)); mit --baseline: baseline-v2.json
// Modi: wortlisten (nur Regeln), fallback (Regeln plus Wortlisten, Modell nicht verfuegbar = W1), ki (mit Modell)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchApp, toolFrame } from '../helpers.mjs';
import { CASES as CURATED } from './cases.mjs';
import { GDPR } from './cases-gdpr.mjs';
import { CASES_V2 } from './cases-v2.mjs';
import { generateDocs, generateDocs2, SYNTH_DOCS2 } from './generate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BASELINE = path.join(HERE, 'baseline.json');
export const BASELINE_V2 = path.join(HERE, 'baseline-v2.json');
const CASES = [...CURATED, ...GDPR];
export const SYNTH_DOCS = 42; // 7 Vorlagen x 6, fest, damit Messungen vergleichbar bleiben
export { SYNTH_DOCS2 };

async function runIn(frame, items) {
  // items: [{ key, text, profile }] -> [{ key, out, tokens }]
  return frame.evaluate(async (list) => {
    const res = []; let lastProfile = null;
    for (const it of list) {
      const prof = it.profile || 'standard';
      if (prof !== lastProfile) { applyProfile(PROFILES.find((p) => p.id === prof) || PROFILES[0]); lastProfile = prof; }
      document.getElementById('IT').value = it.text; aiCache = { key: null, spans: [] };
      await anon();
      const out = document.getElementById('AT').value;
      res.push({ key: it.key, out, tokens: (out.match(/\{\{[A-Z_0-9]+\}\}/g) || []).length });
    }
    return res;
  }, items);
}

export function summarize(mode, caseRes, synthRes, docs, cases = CASES) {
  const byCat = {};
  for (const [id, cat, , frags] of cases) {
    const r = caseRes.find((x) => x.key === id);
    const c = (byCat[cat] ||= { total: 0, leaked: 0, ids: [] });
    if (cat === 'NEG') { c.total++; if (r.tokens > 0) { c.leaked++; c.ids.push(id); } }
    else { c.total++; if (frags.some((f) => r.out.includes(f))) { c.leaked++; c.ids.push(id); } }
  }
  const syn = {}; let total = 0, leaked = 0;
  docs.forEach((d, i) => {
    const out = synthRes[i].out;
    for (const t of d.truth) {
      const k = (syn[t.type] ||= { total: 0, leaked: 0 });
      k.total++; total++;
      if (t.frags.some((f) => out.includes(f))) { k.leaked++; leaked++; }
    }
  });
  return { mode, cases: byCat, synth: syn, synthTotal: total, synthLeaked: leaked };
}

export async function runEval({ withAI, set = 'v1' }) {
  const v2 = set === 'v2';
  const cases = v2 ? CASES_V2 : CASES;
  const a = await launchApp({ offline: true });
  try {
    const f = await toolFrame(a.win);
    await a.win.waitForTimeout(800);
    const docs = v2 ? generateDocs2(SYNTH_DOCS2) : generateDocs(SYNTH_DOCS);
    const items = cases.map(([id, , text, , profile]) => ({ key: id, text, profile }));
    const synth = docs.map((d, i) => ({ key: 'syn' + i, text: d.text }));
    const out = [];
    const modes = withAI ? ['wortlisten', 'fallback', 'ki'] : ['wortlisten', 'fallback'];
    for (const mode of modes) {
      const ai = mode === 'ki';
      // tolerant gegenueber aelteren Staenden (ohne KI-Modus): dort genuegt das explizite Laden des Modells
      await f.evaluate(async ({ useAI, mode }) => {
        if (typeof setAIMode === 'function') setAIMode(useAI ? 'auto' : 'off');
        if (useAI) { await loadAIModel(); if (typeof AI_IDLE_MS !== 'undefined') AI_IDLE_MS = 3600000; }
        // W1: Modell startet nicht, Regeln plus Wortlisten (die App setzt localAIMode nach Modellstart oder -fehler).
        // Im Modus ki bleibt der Wert, den loadAIModel gesetzt hat (App: true); nur wortlisten (nur Regeln) schaltet ihn ab.
        if (mode !== 'ki') localAIMode = mode === 'fallback';
      }, { useAI: ai, mode });
      if (ai && !(await f.evaluate(() => !!nerPipeline))) throw new Error('KI-Modell nicht geladen');
      const cr = await runIn(f, items);
      const sr = await runIn(f, synth);
      out.push({ ...summarize(mode, cr, sr, docs, cases), raw: { cases: cr, synth: sr } });
    }
    return out;
  } finally { await a.close(); }
}

function table(sum) {
  const cats = Object.keys(sum.cases).sort();
  const lines = [`Modus ${sum.mode}: Handfaelle ${cats.filter((c) => c !== 'NEG').reduce((a, c) => a + sum.cases[c].leaked, 0)} undicht | Negativfaelle falsch maskiert ${sum.cases.NEG ? sum.cases.NEG.leaked : 0} | Synthetik ${sum.synthLeaked}/${sum.synthTotal} undicht`];
  for (const c of cats) lines.push(`   ${c.padEnd(8)} ${String(sum.cases[c].leaked).padStart(2)}/${String(sum.cases[c].total).padEnd(3)} ${sum.cases[c].ids.join(' ')}`);
  lines.push('   Synthetik je Typ: ' + Object.entries(sum.synth).map(([k, v]) => `${k} ${v.leaked}/${v.total}`).join(', '));
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const si = process.argv.indexOf('--set');
  const set = si > 0 ? process.argv[si + 1] : 'v1';
  const res = await runEval({ withAI: true, set });
  for (const s of res) console.log(table(s));
  fs.mkdirSync(path.join(HERE, 'out'), { recursive: true });
  fs.writeFileSync(path.join(HERE, 'out', set === 'v2' ? 'result-v2.json' : 'result.json'), JSON.stringify(res, null, 1));
  if (process.argv.includes('--baseline')) {
    const base = Object.fromEntries(res.map((s) => [s.mode, { cases: Object.fromEntries(Object.entries(s.cases).map(([c, v]) => [c, v.leaked])), synthLeaked: s.synthLeaked, synthTotal: s.synthTotal }]));
    const target = set === 'v2' ? BASELINE_V2 : BASELINE;
    fs.writeFileSync(target, JSON.stringify(base, null, 2) + '\n');
    console.log(path.basename(target) + ' geschrieben');
  }
}
