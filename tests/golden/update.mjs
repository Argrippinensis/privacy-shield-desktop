// Erzeugt tests/golden/baseline.json neu (Wortlisten- und KI-Ausgabe fuer tests/golden/sample.txt).
// Nur nach bewusster Aenderung der Erkennung ausfuehren und den Diff (git diff tests/golden) pruefen.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchApp, toolFrame, runAnon, SAMPLE } from '../helpers.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'baseline.json');
const a = await launchApp({ offline: true });
try {
  const f = await toolFrame(a.win);
  await f.evaluate(() => setAIMode('off'));
  const wordlist = await runAnon(f, SAMPLE);
  await f.evaluate(async () => { setAIMode('auto'); await loadAIModel(); });
  const model = await runAnon(f, SAMPLE);
  fs.writeFileSync(OUT, JSON.stringify({ wordlist, model }, null, 1) + '\n');
  console.log('baseline.json geschrieben:', Object.keys(wordlist.store).length, 'Eintraege (Wortlisten),', Object.keys(model.store).length, '(KI)');
} finally { await a.close(); }
