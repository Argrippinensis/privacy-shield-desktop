import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const D = require('/tmp/triage/v2/app/lib/detect.js');
const { generateDocs, generateDocs2 } = await import('/tmp/triage/v2/tests/eval/generate.mjs');
for (const [name, docs] of [['v1-Korpus 42', generateDocs(42)], ['v2-Korpus 98', generateDocs2(98)]]) {
  for (const wl of [false, true]) {
    const stat = {};
    for (const d of docs) {
      const out = D.anonymize(d.text, { profile: 'standard', wordlists: wl }).text;
      for (const t of d.truth) {
        if (!['IBAN', 'CARD', 'TAXID', 'TEL'].includes(t.type)) continue;
        const s = (stat[t.type] ||= { n: 0, fullFragLeak: 0, headRest: 0 });
        s.n++;
        const f = t.frags[0], p = d.text.indexOf(f);
        if (out.includes(f)) s.fullFragLeak++;
        if (p > 0) { const head = d.text.slice(Math.max(0, p - 12), p).replace(/\s+$/, ''); const digits = head.replace(/[^0-9A-Za-z]/g, ''); const tail4 = head.slice(-6); if (digits.length >= 4 && /[0-9]{4}/.test(head) && out.includes(head.slice(-5))) s.headRest++; }
      }
    }
    console.log(name, 'wordlists=' + wl, JSON.stringify(stat));
  }
}
