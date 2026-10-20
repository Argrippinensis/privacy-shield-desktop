#!/usr/bin/env node
// Maschinelle Abnahme eines Pakets (ersetzt Urteil durch Pruefung, wo moeglich).
//   node gate.mjs <paket-id> --repo <Pfad> --base <Ref> [--test-commit <Ref>] [--skip-accept] [--queue <Datei>]
// Pruefungen: Geltungsbereich (nur erlaubte Dateien), Tests seit dem Test-Commit unveraendert, keine Emojis, keine Geheimnisse,
// Reinheit von app/lib (kein DOM), Abnahmebefehle des Pakets. Ausgabe JSON, Exit 0 = alles in Ordnung.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const id = args[0];
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const repo = path.resolve(opt('--repo', '.'));
const base = opt('--base', 'origin/main');
const testCommit = opt('--test-commit', '');
const queuePath = opt('--queue', process.env.PS_QUEUE || path.join(HERE, 'V2-QUEUE.json'));
if (!id || id.startsWith('--')) { console.error('Aufruf: gate.mjs <paket-id> --repo <Pfad> --base <Ref>'); process.exit(2); }
const pkg = JSON.parse(fs.readFileSync(queuePath, 'utf8')).packages.find((p) => p.id === id);
if (!pkg) { console.error('Unbekanntes Paket ' + id); process.exit(2); }

const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 64 << 20 });
const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok, detail: String(detail).slice(0, 1500) });

// Glob: ** = beliebig tief, * = ohne Schraegstrich
const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
const allowed = [...pkg.allowed, ...pkg.tests].map(globRe);

let changed = [];
try { changed = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean); } catch (e) { add('diff', false, e.message); }

// 1) Geltungsbereich
const outside = changed.filter((f) => !allowed.some((r) => r.test(f)));
add('geltungsbereich', outside.length === 0, outside.length ? 'Ausserhalb der erlaubten Dateien: ' + outside.join(', ') : `${changed.length} Dateien geaendert, alle erlaubt`);

// 2) Tests seit dem Test-Commit unveraendert
if (testCommit) {
  const testRes = pkg.tests.map(globRe);
  let touched = [];
  try { touched = git('diff', '--name-only', testCommit, 'HEAD').split('\n').filter((f) => f && testRes.some((r) => r.test(f))); } catch (e) { add('tests-unveraendert', false, e.message); }
  add('tests-unveraendert', touched.length === 0, touched.length ? 'Tests nach dem Test-Commit geaendert: ' + touched.join(', ') : 'unveraendert');
}

// 3) keine Emojis in geaenderten Textdateien
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{25B6}\u{2705}\u{274C}\u{23F3}]/u;
const TEXT = /\.(md|mjs|js|json|html|css|yml|yaml|txt|py|sh)$/;
const emojiHits = [];
for (const f of changed.filter((x) => TEXT.test(x))) {
  let t = ''; try { t = git('show', `HEAD:${f}`); } catch { continue; }
  // vorhandene Emojis der Basis nicht anlasten: nur neue Zeilen pruefen
  let added = [];
  try { added = git('diff', '-U0', `${base}...HEAD`, '--', f).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')); } catch { added = t.split('\n'); }
  if (added.some((l) => EMOJI.test(l))) emojiHits.push(f);
}
add('keine-emojis', emojiHits.length === 0, emojiHits.length ? 'Emojis in neuen Zeilen: ' + emojiHits.join(', ') : 'keine');

// 4) keine Geheimnisse, keine .env
const SECRET = [/ghp_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bnpm_[A-Za-z0-9]{30,}\b/, /\bsk-[A-Za-z0-9]{32,}\b/];
const secretHits = changed.filter((f) => /(^|\/)\.env(\.|$)/.test(f));
for (const f of changed.filter((x) => TEXT.test(x))) {
  let added = []; try { added = git('diff', '-U0', `${base}...HEAD`, '--', f).split('\n').filter((l) => l.startsWith('+')); } catch { /* ignorieren */ }
  if (added.some((l) => SECRET.some((r) => r.test(l)))) secretHits.push(f);
}
add('keine-geheimnisse', secretHits.length === 0, secretHits.length ? 'Verdacht: ' + secretHits.join(', ') : 'keine');

// 5) Reinheit der Module (kein DOM, kein Speicher des Browsers)
const libHits = [];
for (const f of changed.filter((x) => /^app\/lib\/[^/]+\.js$/.test(x))) {
  let t = ''; try { t = git('show', `HEAD:${f}`); } catch { continue; }
  const code = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (/\bdocument\s*\./.test(code) || /\blocalStorage\b/.test(code) || /\bgetElementById\b/.test(code) || /\bsessionStorage\b/.test(code)) libHits.push(f);
}
add('module-rein', libHits.length === 0, libHits.length ? 'DOM-Zugriff in: ' + libHits.join(', ') : 'rein');

// 6) Abnahmebefehle
if (!args.includes('--skip-accept')) {
  for (const c of pkg.accept) {
    const r = spawnSync('sh', ['-c', c], { cwd: repo, encoding: 'utf8', timeout: 25 * 60 * 1000, maxBuffer: 64 << 20, env: process.env });
    const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-12).join('\n');
    add('befehl: ' + c, r.status === 0, `Exit ${r.status}\n${tail}`);
  }
}

const ok = checks.every((c) => c.ok);
console.log(JSON.stringify({ package: id, ok, checks }, null, 1));
process.exit(ok ? 0 : 1);
