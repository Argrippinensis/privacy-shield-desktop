// Vergleicht den aktuellen Stand mit der Referenz von 1.8.0 (F2, Punkt 0).
//   node tests/eval/diff-reference.mjs           App (Electron), gleiche Laeufe wie dump-reference.mjs
//   node tests/eval/diff-reference.mjs --node    PSDetect (app/lib/detect.js) im selben Prozess, ohne Electron
// Erlaubte (erklaerte) Abweichungen: tests/golden/reference-allow.json, Liste von { mode, key, reason }.
// Exit 0 bei 0 nicht erlaubten Abweichungen, sonst 1.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ALLOW = path.join(HERE, '..', 'golden', 'reference-allow.json');

// referenceItems, currentItems: Listen wie in reference-v1.8.json; allow: Liste von { mode, key, reason }
// -> { deviations, allowed, unused }; Abweichung: { mode, key, what: ['fehlt'|'eingabe'|'text'|'zuordnung'], line }
export function compareItems(referenceItems, currentItems, allow = []) {
  const cur = new Map(currentItems.map((i) => [i.mode + '/' + i.key, i]));
  const used = new Set();
  const deviations = [], allowed = [];
  for (const r of referenceItems) {
    const c = cur.get(r.mode + '/' + r.key);
    let what;
    if (!c) what = ['fehlt'];
    else if (c.inputSha256 !== r.inputSha256) what = ['eingabe'];
    else {
      what = [];
      if (c.outSha256 !== r.outSha256) what.push('text');
      if (c.storeSha256 !== r.storeSha256 || c.entities !== r.entities) what.push('zuordnung');
    }
    if (!what.length) continue;
    const d = { mode: r.mode, key: r.key, what, line: `${r.mode}/${r.key}: ${what.map((w) => (w === 'fehlt' ? 'fehlt' : w + ' abweichend')).join(', ')}` };
    const hit = allow.find((a) => (a.mode === '*' || a.mode === r.mode) && (a.key === '*' || a.key === r.key));
    if (hit) { used.add(hit); allowed.push({ ...d, reason: hit.reason }); } else deviations.push(d);
  }
  return { deviations, allowed, unused: allow.filter((a) => !used.has(a)) };
}

// PSDetect (Node, ohne Electron): gleiche Eingaben und Modi wie dump-reference.mjs; im Modus ki spielt die Referenz die aiSpans ein
async function collectItemsNode(referenceItems) {
  const { createRequire } = await import('module');
  const { buildInputs, sha256 } = await import('./dump-reference.mjs');
  const PSDetect = createRequire(import.meta.url)(path.join(HERE, '..', '..', 'app', 'lib', 'detect.js'));
  const byKey = new Map((await buildInputs()).map((i) => [i.key, i]));
  const items = [];
  for (const r of referenceItems) {
    const inp = byKey.get(r.key);
    if (!inp) continue; // fehlt -> compareItems meldet "fehlt"
    const o = { mode: r.mode, key: r.key, profile: inp.profile, inputSha256: sha256(inp.text) };
    const res = PSDetect.anonymize(inp.text, { profile: inp.profile, wordlists: r.mode !== 'w0', aiSpans: r.mode === 'ki' ? r.aiSpans : null });
    o.outSha256 = sha256(res.text);
    o.storeSha256 = sha256(JSON.stringify(res.state.store));
    o.entities = Object.keys(res.state.store).length;
    items.push(o);
  }
  return items;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const node = process.argv.includes('--node');
  const { collectItems, REFERENCE } = await import('./dump-reference.mjs');
  const ref = JSON.parse(fs.readFileSync(REFERENCE, 'utf8'));
  const allow = fs.existsSync(ALLOW) ? JSON.parse(fs.readFileSync(ALLOW, 'utf8')) : [];
  const r = compareItems(ref.items, node ? await collectItemsNode(ref.items) : await collectItems(), allow);
  for (const d of r.deviations) console.log(d.line);
  for (const d of r.allowed) console.log(`${d.line} - erlaubt (${d.reason})`);
  for (const u of r.unused) console.log(`Warnung: ungenutzt: ${u.mode}/${u.key} (${u.reason})`);
  console.log(`Abweichungen: ${r.deviations.length} von ${ref.items.length}`);
  process.exit(r.deviations.length ? 1 : 0);
}
