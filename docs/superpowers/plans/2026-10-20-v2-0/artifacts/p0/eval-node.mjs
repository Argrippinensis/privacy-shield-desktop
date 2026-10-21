// P0: Harness-Faelle und 42 synthetische Dokumente durch den Node-Prototyp (core-vm.mjs): Zahlen fuer W0 (nur Regeln) und W1 (Regeln plus Wortlisten).
// Gemessen auf 1.8.0: W0 21/150 Handfaelle, 18/276 synthetisch (= baseline.json "wortlisten"); W1 12/150, 11/276; Fehlalarme 0.
// Aufruf:  PS_REPO=~/projects/ps-v2 node eval-node.mjs
import { pathToFileURL } from 'node:url';
import { anonymize } from './core-vm.mjs';
const REPO = process.env.PS_REPO || (process.env.HOME + '/projects/ps-v2');
const imp = (f) => import(pathToFileURL(`${REPO}/tests/eval/${f}`).href);
const { CASES } = await imp('cases.mjs');
const { GDPR } = await imp('cases-gdpr.mjs');
const { generateDocs } = await imp('generate.mjs');
const ALL = [...CASES, ...GDPR];
const docs = generateDocs(42);
for (const wl of [false, true]) {
  let leaked = 0, neg = 0;
  for (const [, cat, text, frags, profile] of ALL) {
    const r = anonymize(text, { profile: profile || 'standard', wordlists: wl });
    if (cat === 'NEG') { if ((r.text.match(/\{\{[A-Z_0-9]+\}\}/g) || []).length > 0) neg++; }
    else if (frags.some((f) => r.text.includes(f))) leaked++;
  }
  let sl = 0, st = 0;
  for (const d of docs) { const r = anonymize(d.text, { wordlists: wl }); for (const t of d.truth) { st++; if (t.frags.some((f) => r.text.includes(f))) sl++; } }
  console.log(`wordlists=${wl}: Lecks Handfaelle ${leaked}/150, Fehlalarme ${neg}/20, Synthetik ${sl}/${st}`);
}
