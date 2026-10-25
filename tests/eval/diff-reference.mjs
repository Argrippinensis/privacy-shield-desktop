// Vergleicht den aktuellen Stand mit der Referenz von 1.8.0 (F2, Punkt 0).
//   node tests/eval/diff-reference.mjs           App (Electron), gleiche Laeufe wie dump-reference.mjs
//   node tests/eval/diff-reference.mjs --node    PSDetect (app/lib/detect.js) im selben Prozess, ohne Electron
//   --allow <Datei>  andere Allow-Datei (Tests); --propose  gibt Eintragskoepfe (mode, key, Hashes, Anzahl; ohne reason) fuer unerlaubte Abweichungen aus
// Exit 1 auch bei ungenutzten Ausnahmen. Ein Eintrag darf einen eigenen App-Stand ("app") tragen, der nur ohne --node gilt.
// Erlaubte (erklaerte) Abweichungen: tests/golden/reference-allow.json, Liste von { mode, key, reason, outSha256, storeSha256, entities } (an den genehmigten Stand gebunden).
// Exit 0 bei 0 nicht erlaubten Abweichungen und 0 ungenutzten Ausnahmen, sonst 1.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ALLOW = path.join(HERE, '..', 'golden', 'reference-allow.json');

const HEX = /^[0-9a-f]{64}$/;
// Ein Eintrag ist nur gueltig mit konkretem mode/key (kein '*'), nichtleerem reason und genehmigtem Stand (beide Hashes, Anzahl)
function validEntry(a) {
  return !!a && typeof a.mode === 'string' && typeof a.key === 'string' && a.mode !== '*' && a.key !== '*' && a.mode !== '' && a.key !== ''
    && typeof a.reason === 'string' && a.reason.trim().length > 0
    && typeof a.outSha256 === 'string' && HEX.test(a.outSha256) && typeof a.storeSha256 === 'string' && HEX.test(a.storeSha256)
    && Number.isInteger(a.entities) && a.entities >= 0;
}

function validApp(x) {
  return !!x && typeof x.outSha256 === 'string' && HEX.test(x.outSha256) && typeof x.storeSha256 === 'string' && HEX.test(x.storeSha256)
    && Number.isInteger(x.entities) && x.entities >= 0;
}

// referenceItems, currentItems: Listen wie in reference-v1.8.json;
// allow: Liste von { mode, key, reason, outSha256, storeSha256, entities } (genehmigter NEUER Stand des Falls)
// -> { deviations, allowed, unused }; Abweichung: { mode, key, what: ['fehlt'|'eingabe'|'text'|'zuordnung'], line }
// Eine Ausnahme gilt nur bei exakt passendem outSha256, storeSha256 und entities, unveraenderter Eingabe und vorhandenem Fall;
// "fehlt" und "eingabe" sind nie erlaubbar; Platzhalter und unvollstaendige Eintraege erlauben nichts.
// opts.app = true (App-Modus, Electron): ein Eintrag darf zusaetzlich den genehmigten Stand der App in "app": { outSha256, storeSha256, entities }
// tragen (D53: die App liefert mit dem echten Modell fuer ki/syn12 den Span "Berliner Allee" statt "Berliner Alle" der Referenz; die Platzhalterart
// wechselt von ADRESSE zu ORT, nichts wird lesbar). Im Node-Modus zaehlt nur der Stand ohne "app". Beide Staende gelten als genutzt.
export function compareItems(referenceItems, currentItems, allow = [], opts = {}) {
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
    const hit = what[0] === 'fehlt' || what[0] === 'eingabe' ? null
      : allow.find((a) => validEntry(a) && a.mode === r.mode && a.key === r.key
        && ((a.outSha256 === c.outSha256 && a.storeSha256 === c.storeSha256 && a.entities === c.entities)
          || (opts.app && validApp(a.app) && a.app.outSha256 === c.outSha256 && a.app.storeSha256 === c.storeSha256 && a.app.entities === c.entities)));
    if (hit) { used.add(hit); allowed.push({ ...d, reason: hit.reason }); } else deviations.push(d);
  }
  return { deviations, allowed, unused: allow.filter((a) => !used.has(a)) };
}

// PSDetect (Node, ohne Electron): gleiche Eingaben und Modi wie dump-reference.mjs; im Modus ki spielt die Referenz die aiSpans ein
export async function collectItemsNode(referenceItems) {
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

// Ungenutzte Ausnahmen sind Fehler (Exit 1), ebenso unerlaubte Abweichungen
export function exitCodeOf(r) { return r.deviations.length || r.unused.length ? 1 : 0; }

export function reportLines(r, total) {
  const lines = [];
  for (const d of r.deviations) lines.push(d.line);
  for (const d of r.allowed) lines.push(`${d.line} - erlaubt (${d.reason})`);
  for (const u of r.unused) lines.push(`Fehler: ungenutzt: ${u.mode}/${u.key} (${u.reason})`);
  lines.push(`Abweichungen: ${r.deviations.length} von ${total}`);
  return lines;
}

// Eintragskoepfe (ohne reason) fuer unerlaubte, vergleichbare Abweichungen; "fehlt" und "eingabe" werden nie vorgeschlagen.
// reason und Freigabe setzt der Mensch; ein Hash ist nur der Nachweis des gepruefen Stands.
export function proposeEntries(r, currentItems) {
  const cur = new Map(currentItems.map((i) => [i.mode + '/' + i.key, i]));
  return r.deviations.filter((d) => !d.what.includes('fehlt') && !d.what.includes('eingabe')).map((d) => {
    const c = cur.get(d.mode + '/' + d.key);
    return { mode: d.mode, key: d.key, outSha256: c.outSha256, storeSha256: c.storeSha256, entities: c.entities };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const node = args.includes('--node');
  const propose = args.includes('--propose');
  const ai = args.indexOf('--allow');
  const allowFile = ai >= 0 ? args[ai + 1] : ALLOW;
  const { collectItems, REFERENCE } = await import('./dump-reference.mjs');
  const ref = JSON.parse(fs.readFileSync(REFERENCE, 'utf8'));
  const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')) : [];
  const current = node ? await collectItemsNode(ref.items) : await collectItems();
  const r = compareItems(ref.items, current, allow, { app: !node });
  if (propose) {
    console.log(JSON.stringify(proposeEntries(r, current), null, 1));
    process.exit(0);
  }
  for (const l of reportLines(r, ref.items.length)) console.log(l);
  process.exit(exitCodeOf(r));
}
