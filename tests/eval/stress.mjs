// Stresstest fuer grosse Dokumente mit vielen verschiedenen Entitaeten.
// Ausgabe je Groesse: Zeit, Hash der anonymisierten Ausgabe + des Mappings, Rundreise deanon(anon(x)) == x.
// Zwei Programmstaende vergleichen: gleiche Hashes = identisches Verhalten.
import crypto from 'crypto';
import { launchApp, toolFrame } from '../helpers.mjs';

const SIZES = (process.argv[2] || '100,400,1000').split(',').map(Number);
const a = await launchApp({ offline: true });
try {
  const f = await toolFrame(a.win); await a.win.waitForTimeout(800);
  for (const n of SIZES) {
    const r = await f.evaluate(async (n) => {
      const blk = (i) => `Vertrag Nr. ${100000 + i}: Herr Thomas Muster${i} (geb. ${(i % 28) + 1}.0${(i % 9) + 1}.19${60 + (i % 40)}), wohnhaft Musterstraße ${(i % 200) + 1}, ${10000 + (i % 80000)} Beispielstadt, erreichbar unter user${i}@beispiel-${i}.de oder +49 89 ${1000000 + i}. IBAN DE89 3704 0044 0532 ${String(i).padStart(4, '0')} 00. Die Firma Beispiel${i} GmbH zahlt ${i},50 EUR. Frau Anna Schmidt${i} unterschreibt am 12.03.20${10 + (i % 15)}.\n`;
      const text = Array.from({ length: n }, (_, i) => blk(i)).join('');
      document.getElementById('IT').value = text;
      const t0 = performance.now();
      await anon();
      const ms = Math.round(performance.now() - t0);
      const out = document.getElementById('AT').value;
      const mapping = JSON.stringify(store);
      document.getElementById('AR').value = out;
      deanon();
      const roundtrip = document.getElementById('RT').value === text;
      // erneutes Anonymisieren desselben Textes muss dasselbe Ergebnis liefern (keine Zustandsreste)
      await anon();
      const again = document.getElementById('AT').value === out;
      return { chars: text.length, entities: Object.keys(store).length, ms, out, mapping, roundtrip, again };
    }, n);
    const h = (x) => crypto.createHash('sha256').update(x).digest('hex').slice(0, 12);
    console.log(JSON.stringify({ n, chars: r.chars, entities: r.entities, ms: r.ms, outHash: h(r.out), mapHash: h(r.mapping), roundtrip: r.roundtrip, stableOnRerun: r.again }));
  }
} finally { await a.close(); }
